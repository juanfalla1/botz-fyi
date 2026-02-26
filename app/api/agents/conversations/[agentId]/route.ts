import { NextResponse } from "next/server";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { getRequestUser } from "@/app/api/_utils/auth";

export async function DELETE(
  req: Request,
  { params }: { params: { agentId: string; conversationId: string } }
) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const supabase = getAnonSupabaseWithToken(guard.token);
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE env" }, { status: 500 });
  }

  try {
    const { agentId, conversationId } = params;

    // Verificar que el agente pertenece al usuario
    const { data: agent } = await supabase
      .from("ai_agents")
      .select("id")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ ok: false, error: "Agent not found" }, { status: 404 });
    }

    // Eliminar la conversación
    const { error } = await supabase
      .from("agent_conversations")
      .delete()
      .eq("id", conversationId)
      .eq("agent_id", agentId);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Conversation deleted" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { agentId: string } }
) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const supabase = getAnonSupabaseWithToken(guard.token);
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE env" }, { status: 500 });
  }

  try {
    const { agentId } = params;

    // Verificar que el agente pertenece al usuario
    const { data: agent } = await supabase
      .from("ai_agents")
      .select("id")
      .eq("id", agentId)
      .eq("created_by", guard.user.id)
      .single();

    if (!agent) {
      return NextResponse.json({ ok: false, error: "Agent not found" }, { status: 404 });
    }

    // Obtener conversaciones
    const { data: conversations, error } = await supabase
      .from("agent_conversations")
      .select("*")
      .eq("agent_id", agentId)
      .order("started_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: conversations || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
