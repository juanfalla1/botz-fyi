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
  if (!svc) return { ok: false, error: "Missing SUPABASE env (URL or SERVICE_ROLE)" as string, userId: null as string | null, svc: null as any };

  const { user, error } = await getRequestUser(req);
  if (!user) return { ok: false, error: error || "Unauthorized", userId: null, svc };

  const { data: row, error: selErr } = await svc
    .from("platform_admins")
    .select("auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (selErr || !row?.auth_user_id) return { ok: false, error: "Forbidden", userId: null, svc };
  return { ok: true, error: null as string | null, userId: user.id, svc };
}

async function findAuthUserByEmail(svc: any, email: string) {
  // supabase-js versions differ; avoid getUserByEmail.
  const target = String(email || "").trim().toLowerCase();
  if (!target) return null;

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users || [];
    const match = users.find((u: any) => String(u?.email || "").toLowerCase() === target);
    if (match) return match;
    if (users.length < 200) break;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const guard = await assertPlatformAdmin(req);
    if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 403 });

    const svc = guard.svc;
    const body = await req.json().catch(() => ({}));
    const tenantId = String(body?.tenantId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!tenantId) return NextResponse.json({ ok: false, error: "Missing tenantId" }, { status: 400 });
    if (!email) return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });

    const targetUser = await findAuthUserByEmail(svc, email);
    if (!targetUser?.id) {
      return NextResponse.json({ ok: false, error: "User not found in Auth" }, { status: 404 });
    }

    // Update tenant owner
    const { error: updTenantErr } = await svc
      .from("tenants")
      .update({ auth_user_id: targetUser.id, email })
      .eq("id", tenantId);
    if (updTenantErr) throw updTenantErr;

    // Upsert team member as admin
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
        .update({ rol: "admin", activo: true, email, nombre })
        .eq("id", existingTm.id);
      if (tmUpdErr) throw tmUpdErr;
    } else {
      const { error: tmInsErr } = await svc.from("team_members").insert([
        {
          tenant_id: tenantId,
          auth_user_id: targetUser.id,
          email,
          nombre,
          rol: "admin",
          activo: true,
        },
      ]);
      if (tmInsErr) throw tmInsErr;
    }

    // Make user metadata consistent for the app
    try {
      await svc.auth.admin.updateUserById(targetUser.id, {
        user_metadata: {
          ...(targetUser.user_metadata as any),
          tenant_id: tenantId,
          rol: "admin",
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
