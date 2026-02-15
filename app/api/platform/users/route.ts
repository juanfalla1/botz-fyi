import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAnonSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function getServiceSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function getRequestUser(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) return { user: null, error: "Missing Authorization Bearer token" };

  const anon = getAnonSupabase();
  if (!anon) return { user: null, error: "Missing SUPABASE env (URL or ANON)" };

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return { user: null, error: "Invalid session" };
  return { user: data.user, error: null };
}

async function assertPlatformAdmin(req: Request) {
  const svc = getServiceSupabase();
  if (!svc) return { ok: false, error: "Missing SUPABASE env (URL or SERVICE_ROLE)" as string, svc: null as any };

  const { user, error } = await getRequestUser(req);
  if (!user) return { ok: false, error: error || "Unauthorized", svc };

  const { data: row, error: selErr } = await svc
    .from("platform_admins")
    .select("auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (selErr || !row?.auth_user_id) return { ok: false, error: "Forbidden", svc };
  return { ok: true, error: null as string | null, svc };
}

export async function GET(req: Request) {
  try {
    const guard = await assertPlatformAdmin(req);
    if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 403 });

    const svc = guard.svc;
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();

    const pageRaw = Number(url.searchParams.get("page") || "1");
    const perPageRaw = Number(url.searchParams.get("perPage") || "200");
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(1000, Math.floor(pageRaw)) : 1;
    const perPage = Number.isFinite(perPageRaw) && perPageRaw > 0 ? Math.min(1000, Math.floor(perPageRaw)) : 200;

    const { data, error } = await svc.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = (data?.users || []).map((u: any) => ({
      id: u.id,
      email: u.email || null,
      created_at: u.created_at || null,
      last_sign_in_at: u.last_sign_in_at || null,
      user_metadata: u.user_metadata || {},
    }));

    const filtered = q
      ? users.filter((u: any) => String(u.email || "").toLowerCase().includes(q))
      : users;

    return NextResponse.json({ ok: true, page, perPage, users: filtered });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
