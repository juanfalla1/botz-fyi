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

function normalizeRole(input: any): "admin" | "asesor" {
  const v = String(input || "").trim().toLowerCase();
  return v === "admin" ? "admin" : "asesor";
}

export async function POST(req: Request) {
  try {
    const guard = await assertPlatformAdmin(req);
    if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 403 });

    const svc = guard.svc;
    const body = await req.json().catch(() => ({}));
    const tenantId = String(body?.tenantId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const role = normalizeRole(body?.role);

    if (!tenantId) return NextResponse.json({ ok: false, error: "Missing tenantId" }, { status: 400 });
    if (!email) return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });

    const { data: userRes, error: userErr } = await svc.auth.admin.getUserByEmail(email);
    if (userErr) throw userErr;
    const targetUser = userRes?.user || null;
    if (!targetUser?.id) {
      return NextResponse.json({ ok: false, error: "User not found in Auth" }, { status: 404 });
    }

    const { data: existingTm, error: tmSelErr } = await svc
      .from("team_members")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("auth_user_id", targetUser.id)
      .maybeSingle();
    if (tmSelErr) throw tmSelErr;

    const nombre = (targetUser.user_metadata as any)?.nombre || email.split("@")[0];

    if (existingTm?.id) {
      const { error: tmUpdErr } = await svc
        .from("team_members")
        .update({ rol: role, activo: true, email, nombre })
        .eq("id", existingTm.id);
      if (tmUpdErr) throw tmUpdErr;
    } else {
      const { error: tmInsErr } = await svc.from("team_members").insert([
        {
          tenant_id: tenantId,
          auth_user_id: targetUser.id,
          email,
          nombre,
          rol: role,
          activo: true,
        },
      ]);
      if (tmInsErr) throw tmInsErr;
    }

    // Metadata: ayuda a resolver tenant/rol en UI sin depender solo de RLS
    try {
      await svc.auth.admin.updateUserById(targetUser.id, {
        user_metadata: {
          ...(targetUser.user_metadata as any),
          tenant_id: tenantId,
          rol: role,
          is_team_member: true,
        },
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
