import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUTOMATION_WEBHOOK_URL =
  process.env.AUTOMATION_WEBHOOK_URL ||
  // Backward-compatible default
  "https://n8nio-n8n-latest.onrender.com/webhook/botz-wh-001";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function readRequestBody(req: Request): Promise<any> {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/json")) {
    return await req.json().catch(() => ({}));
  }

  // Elementor webhooks often send x-www-form-urlencoded.
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text().catch(() => "");
    const params = new URLSearchParams(text);
    const obj: Record<string, string> = {};
    for (const [k, v] of params.entries()) obj[k] = v;
    return obj;
  }

  // Fallback: attempt JSON first, then text.
  try {
    return await req.json();
  } catch {
    const text = await req.text().catch(() => "");
    return text ? { raw: text } : {};
  }
}

function normalizePhone(input: any): string {
  const raw = String(input || "").trim();
  if (!raw) return "";

  // Keep existing +<digits>
  if (raw.startsWith("+")) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    return `+${digits}`;
  }

  // Convert 00<cc>... to +<cc>...
  if (raw.startsWith("00")) {
    const digits = raw.replace(/\D/g, "");
    const rest = digits.replace(/^00/, "");
    return rest ? `+${rest}` : "";
  }

  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  // If it looks like Colombia mobile (10 digits starting with 3), prefix +57.
  if (digits.length === 10 && digits.startsWith("3")) return `+57${digits}`;

  // Default: Spain +34
  return `+34${digits}`;
}

function stableLeadId(tenantId: string, phone?: string | null, email?: string | null): string {
  const base = phone ? `phone:${phone}` : email ? `email:${email}` : "unknown";
  const h = crypto.createHash("sha256").update(`tenant:${tenantId}|${base}`).digest("hex");
  return `ld_${h}`;
}

function pickFirst(obj: any, keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function extractLandingLead(raw: any) {
  const body = raw?.body && typeof raw.body === "object" ? raw.body : raw;

  // Elementor-style keys: fields[nombre][value]
  const nombre = pickFirst(body, ["nombre", "name", "first_name", "fields[nombre][value]", "fields[name][value]"]);
  const apellidos = pickFirst(body, ["apellidos", "last_name", "surname", "fields[apellidos][value]", "fields[last_name][value]"]);
  const email = pickFirst(body, ["email", "mail", "fields[email][value]"]).toLowerCase();
  const telefonoRaw = pickFirst(body, ["phone", "telefono", "tel", "fields[telefono][value]", "fields[phone][value]"]);
  const city = pickFirst(body, ["city", "ciudad", "fields[ciudad][value]"]);

  const phone = normalizePhone(telefonoRaw);
  const name = `${nombre} ${apellidos}`.trim() || "Cliente";

  const origen = pickFirst(body, ["origen", "origin", "source_name"]) || "Landing";
  let source = pickFirst(body, ["source", "utm_source"]) || "landing";
  let campaign = pickFirst(body, ["campaign", "utm_campaign"]) || null;

  const pageUrl = pickFirst(body, [
    "meta[page_url][value]",
    "page_url",
    "pageUrl",
    "url",
  ]);

  let notes: string | null = null;
  let utm_medium: string | null = null;
  let utm_term: string | null = null;
  let gclid: string | null = null;
  if (pageUrl) {
    try {
      const u = new URL(pageUrl);
      const usp = u.searchParams;
      source = source || usp.get("utm_source") || "landing";
      campaign = campaign || usp.get("utm_campaign") || null;
      utm_medium = usp.get("utm_medium") || null;
      utm_term = usp.get("utm_term") || null;
      gclid = usp.get("gclid") || usp.get("gclsrc") || null;

      // Keep a compact trace in notes for attribution/debugging.
      const parts: string[] = [];
      parts.push(`page_url=${u.origin}${u.pathname}`);
      if (usp.get("utm_source")) parts.push(`utm_source=${usp.get("utm_source")}`);
      if (usp.get("utm_medium")) parts.push(`utm_medium=${usp.get("utm_medium")}`);
      if (usp.get("utm_campaign")) parts.push(`utm_campaign=${usp.get("utm_campaign")}`);
      if (usp.get("utm_term")) parts.push(`utm_term=${usp.get("utm_term")}`);
      if (usp.get("gclid")) parts.push(`gclid=${usp.get("gclid")}`);
      notes = parts.join(" | ");
    } catch {
      // ignore invalid URL
    }
  }

  return {
    name,
    email: email || null,
    phone: phone || null,
    city: city || null,
    origen,
    source,
    campaign,
    utm_medium,
    utm_term,
    gclid,
    notes,
  };
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || "";

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "Missing SUPABASE env (URL or SERVICE_ROLE)" },
        { status: 500 }
      );
    }

    const { data: tokenRow, error: tokenErr } = await supabase
      .from("bot_webhook_tokens")
      .select(
        "id, tenant_id, agent_id, token, label, is_active, bot_agents (id, tenant_id, name, channel, language, system_prompt, is_active)"
      )
      .eq("token", token)
      .maybeSingle();

    if (tokenErr) {
      return NextResponse.json(
        { error: "Token lookup failed", details: tokenErr.message },
        { status: 500 }
      );
    }

    if (!tokenRow || !(tokenRow as any).is_active) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const agent = (tokenRow as any).bot_agents;
    if (!agent || !agent.is_active) {
      return NextResponse.json({ error: "Agent inactive" }, { status: 403 });
    }

    const body = await readRequestBody(req);

    // Backward/forward compatible fields for automation engines.
    // Some engines (n8n) are easier to configure with flat keys.
    const system_prompt = agent.system_prompt;

    const payload = {
      ...body,
      token,
      tenant_id: (tokenRow as any).tenant_id,
      agent_id: (tokenRow as any).agent_id,
      // Flat copies for easier consumption in workflows
      system_prompt,
      agent_system_prompt: system_prompt,
      agent_language: agent.language,
      agent_name: agent.name,
      agent: {
        id: agent.id,
        tenant_id: agent.tenant_id,
        name: agent.name,
        channel: agent.channel,
        language: agent.language,
        system_prompt: agent.system_prompt,
      },
    };

    // Channel "form": treat inbound as lead ingestion (Landing -> CRM)
    if (String(agent.channel).toLowerCase() === "form") {
      const supabase = getServiceSupabase();
      if (!supabase) {
        return NextResponse.json(
          { error: "Missing SUPABASE env (URL or SERVICE_ROLE)" },
          { status: 500 }
        );
      }

      const lead = extractLandingLead(body);
      const tenant_id = (tokenRow as any).tenant_id;

      // Prefer token label as origin if present (per-connection source)
      const originFromToken = String((tokenRow as any)?.label || "").trim();
      const origen = originFromToken || lead.origen;

      if (!lead.phone && !lead.email) {
        return NextResponse.json(
          { error: "Missing lead identifier (phone or email)" },
          { status: 400 }
        );
      }

      // Use a stable lead_id so we can upsert safely (phone is not unique in DB).
      const lead_id = stableLeadId(String(tenant_id), lead.phone, lead.email);

      const leadRow: any = {
        lead_id,
        tenant_id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        city: lead.city,
        origen,
        source: lead.source,
        campaign: lead.campaign,
        notes: lead.notes,
        demo_opened: false,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("leads")
        .upsert([leadRow], { onConflict: "lead_id" })
        .select("id")
        .limit(1);
      if (error) {
        return NextResponse.json(
          { error: "Lead upsert failed", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, lead_id: data?.[0]?.id || null });
    }

    const response = await fetch(AUTOMATION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const textData = await response.text();
    if (!response.ok) {
      throw new Error(`Automation engine error (${response.status}): ${textData}`);
    }

    try {
      return NextResponse.json(JSON.parse(textData));
    } catch {
      return NextResponse.json({ message: textData });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno del servidor", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
