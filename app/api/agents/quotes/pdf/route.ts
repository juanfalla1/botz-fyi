import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { buildQuotePdfFromDraft } from "../_utils/pdf";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getAnonSupabaseWithToken(guard.token);
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });

  try {
    const body = await req.json().catch(() => ({}));
    const draftId = String(body?.draftId || "").trim();
    if (!draftId) return NextResponse.json({ ok: false, error: "Missing draftId" }, { status: 400 });

    const { data: draft, error } = await supabase
      .from("agent_quote_drafts")
      .select("*")
      .eq("id", draftId)
      .eq("created_by", guard.user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    if (!draft) return NextResponse.json({ ok: false, error: "Draft no encontrado" }, { status: 404 });

    const { pdfBase64, fileName } = buildQuotePdfFromDraft(draftId, draft);
    return NextResponse.json({ ok: true, data: { draftId, fileName, pdfBase64 } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
