import { NextResponse } from "next/server";
import { getServiceSupabase, SUPABASE_URL } from "@/app/api/_utils/supabase";

function safeProjectRef(url?: string) {
  const raw = String(url || "");
  const m = raw.match(/https:\/\/([^.]+)\./i);
  return m?.[1] || "unknown";
}

export async function GET() {
  const svc = getServiceSupabase();
  if (!svc) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing SUPABASE env (URL or SERVICE_ROLE)",
        project_ref: safeProjectRef(SUPABASE_URL),
      },
      { status: 500 },
    );
  }

  const { error } = await svc.from("metrocas_datasets").select("id").limit(1);
  return NextResponse.json({
    ok: !error,
    project_ref: safeProjectRef(SUPABASE_URL),
    table_visible: !error,
    error: error?.message || null,
  });
}
