import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { checkEntitlementAccess, consumeEntitlementCredits, logUsageEvent } from "@/app/api/_utils/entitlement";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(String(text || "").length / 4));
}

function normalizeHistory(input: any) {
  if (!Array.isArray(input)) return [] as { role: "user" | "assistant"; content: string }[];
  return input
    .map((m) => ({ role: String(m?.role || ""), content: String(m?.content || "").trim() }))
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content)
    .slice(-10) as { role: "user" | "assistant"; content: string }[];
}

function normalizeBrainFiles(raw: any): { name: string; content: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => ({
      name: String(f?.name || "Documento").trim() || "Documento",
      content: String(f?.content || "").trim(),
    }))
    .filter((f) => f.content.length > 0);
}

function buildDocumentContext(message: string, files: { name: string; content: string }[]) {
  if (!files.length) return "";

  const terms = Array.from(new Set(
    String(message || "")
      .toLowerCase()
      .split(/[^a-z0-9áéíóúñü]+/i)
      .map((t) => t.trim())
      .filter((t) => t.length >= 4)
  )).slice(0, 8);

  const ranked = files
    .map((f) => {
      const lc = f.content.toLowerCase();
      const score = terms.reduce((acc, t) => (lc.includes(t) ? acc + 1 : acc), 0);
      return { ...f, score };
    })
    .sort((a, b) => b.score - a.score);

  const selected = ranked.filter((f) => f.score > 0).slice(0, 3);
  const fallback = selected.length ? selected : ranked.slice(0, 2);

  const blocks = fallback.map((f) => {
    const lc = f.content.toLowerCase();
    const firstHit = terms.map((t) => lc.indexOf(t)).find((i) => i >= 0) ?? -1;
    const start = firstHit >= 0 ? Math.max(0, firstHit - 700) : 0;
    const end = Math.min(f.content.length, start + 1800);
    const excerpt = f.content.slice(start, end).trim();
    return `\n--- ${f.name} ---\n${excerpt}`;
  });

  return `\n\nDocumentos indexados (extractos):\n${blocks.join("\n")}`;
}

function buildSearchTerms(message: string) {
  return Array.from(
    new Set(
      String(message || "")
        .toLowerCase()
        .split(/[^a-z0-9áéíóúñü]+/i)
        .map((t) => t.trim())
        .filter((t) => t.length >= 4)
    )
  ).slice(0, 6);
}

function shouldUseCatalog(message: string) {
  const m = String(message || "").toLowerCase();
  return /(precio|cotiz|referencia|modelo|ficha|pdf|inventario|trm|equipo|producto)/.test(m);
}

async function buildCatalogContext(supabase: any, ownerId: string, message: string) {
  if (!shouldUseCatalog(message)) return "";

  const terms = buildSearchTerms(message);
  let query = supabase
    .from("agent_product_catalog")
    .select("id,name,brand,category,summary")
    .eq("tenant_id", SYSTEM_TENANT_ID)
    .eq("created_by", ownerId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(5);

  if (terms.length) {
    const or = terms
      .map((t) => `name.ilike.%${t}%,summary.ilike.%${t}%,description.ilike.%${t}%`)
      .join(",");
    query = query.or(or);
  }

  const [{ data: products }, { data: fx }] = await Promise.all([
    query,
    supabase
      .from("agent_fx_rates")
      .select("rate,rate_date,source")
      .eq("tenant_id", SYSTEM_TENANT_ID)
      .eq("created_by", ownerId)
      .eq("from_currency", "USD")
      .eq("to_currency", "COP")
      .order("rate_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const lines = (products || []).slice(0, 5).map((p: any) => {
    const desc = String(p?.summary || "").slice(0, 160);
    return `- ${p?.name || "Producto"} (${p?.brand || ""}/${p?.category || ""})${desc ? `: ${desc}` : ""}`;
  });

  const trmLine = fx?.rate
    ? `TRM USD->COP vigente: ${Number(fx.rate).toFixed(2)} (fecha ${fx.rate_date}, fuente ${fx.source || "N/A"}).`
    : "TRM no disponible en cache. Si el cliente pide precio final, indica que se validara TRM antes de enviar cotizacion.";

  if (!lines.length && !fx?.rate) return "";

  return `\n\nCatalogo conectado (datos reales):\n${lines.join("\n")}\n${trmLine}\nSi el cliente pide cotizacion, usa estos datos y no inventes modelos fuera del catalogo.`;
}

export async function POST(req: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const agentId = String(body?.agentId || "").trim();
  const message = String(body?.message || "").trim();
  const history = normalizeHistory(body?.history);

  if (!agentId || !message) {
    return NextResponse.json({ ok: false, error: "Missing agentId or message" }, { status: 400 });
  }

  const { data: agent, error } = await supabase
    .from("ai_agents")
    .select("id,name,status,description,created_by,configuration")
    .eq("id", agentId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  if (!agent || String(agent.status) !== "active") {
    return NextResponse.json({ ok: false, error: "Agente no disponible" }, { status: 404 });
  }

  const ownerId = String((agent as any).created_by || "").trim();
  if (!ownerId) {
    return NextResponse.json({ ok: false, error: "Agente sin propietario" }, { status: 400 });
  }

  const access = await checkEntitlementAccess(supabase as any, ownerId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, code: access.code, error: access.error }, { status: access.statusCode });
  }

  const cfg = (agent.configuration || {}) as any;
  const brainFiles = normalizeBrainFiles(cfg?.brain?.files);
  const docs = buildDocumentContext(message, brainFiles);
  const catalog = await buildCatalogContext(supabase as any, ownerId, message);
  const systemPrompt = [
    `Eres ${String(cfg?.identity_name || agent.name || "asistente")}.`,
    String(cfg?.purpose || agent.description || "Asistente virtual"),
    String(cfg?.company_desc || ""),
    String(cfg?.system_prompt || cfg?.important_instructions || ""),
    "Responde en el idioma del usuario con tono profesional y claro.",
    "Si no tienes la informacion, dilo sin inventar.",
    docs,
    catalog,
  ]
    .filter(Boolean)
    .join("\n\n");

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 320,
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ] as any,
  });

  const reply = String(completion.choices?.[0]?.message?.content || "").trim() || "No tengo una respuesta en este momento.";
  const tokens = Math.max(1, Number(completion.usage?.total_tokens || 0) || estimateTokens(message + reply));

  const burn = await consumeEntitlementCredits(supabase as any, ownerId, tokens);
  if (!burn.ok) {
    return NextResponse.json({ ok: false, code: burn.code, error: burn.error }, { status: burn.statusCode });
  }

  await logUsageEvent(supabase as any, ownerId, tokens, {
    endpoint: "/api/agents/public-chat",
    action: "widget_chat_turn",
    metadata: { agent_id: agentId, llm_tokens: tokens, channel: "embed_widget" },
  });

  return NextResponse.json({ ok: true, data: { reply, tokens } });
}
