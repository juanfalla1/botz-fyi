import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const body = await req.json().catch(() => ({}));

    const payload = {
      ...body,
      token,
      tenant_id: (tokenRow as any).tenant_id,
      agent_id: (tokenRow as any).agent_id,
      agent: {
        id: agent.id,
        tenant_id: agent.tenant_id,
        name: agent.name,
        channel: agent.channel,
        language: agent.language,
        system_prompt: agent.system_prompt,
      },
    };

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
