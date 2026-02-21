import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asStringArray(input: any, fallback: string[]) {
  if (!Array.isArray(input)) return fallback;
  const clean = input.map((v) => String(v || "").trim()).filter(Boolean);
  return clean.length ? clean.slice(0, 6) : fallback;
}

export async function GET(req: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const agentId = String(searchParams.get("agentId") || "").trim();
  if (!agentId) {
    return NextResponse.json({ ok: false, error: "Missing agentId" }, { status: 400 });
  }

  const { data: agent, error } = await supabase
    .from("ai_agents")
    .select("id,name,type,status,description,configuration")
    .eq("id", agentId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  if (!agent || String(agent.status) !== "active") {
    return NextResponse.json({ ok: false, error: "Agente no disponible" }, { status: 404 });
  }

  const cfg = (agent.configuration || {}) as any;
  const publish = (cfg.publish || {}) as any;
  const widget = (publish.widget || {}) as any;

  return NextResponse.json({
    ok: true,
    data: {
      id: agent.id,
      name: String(agent.name || "Agente"),
      role: String(agent.description || "Asistente virtual"),
      welcome_message: String(publish.welcome_message || `¡Bienvenido a ${agent.name || "nuestro asistente"}! ¿En qué te puedo ayudar?`),
      examples: asStringArray(publish.examples, ["¿Qué servicios ofrecen?", "¿Cómo puedo contactarlos?"]),
      widget: {
        bg_color: String(widget.bg_color || "#0b1220"),
        primary_color: String(widget.primary_color || "#a3e635"),
        auto_open: Boolean(widget.auto_open),
      },
    },
  });
}
