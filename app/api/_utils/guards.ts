import { getAnonSupabase, getServiceSupabase } from "./supabase";

export type RequestUser = {
  id: string;
  email?: string | null;
};

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;
}

export async function getRequestUser(req: Request): Promise<{ user: RequestUser | null; error: string | null }> {
  const token = getBearerToken(req);
  if (!token) return { user: null, error: "Missing Authorization Bearer token" };

  const anon = getAnonSupabase();
  if (!anon) return { user: null, error: "Missing SUPABASE env (URL or ANON)" };

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return { user: null, error: "Invalid session" };
  return { user: { id: data.user.id, email: data.user.email }, error: null };
}

export async function isPlatformAdmin(authUserId: string) {
  const svc = getServiceSupabase();
  if (!svc) return { ok: false, error: "Missing SUPABASE env (URL or SERVICE_ROLE)" as string, isAdmin: false };

  const { data, error } = await svc
    .from("platform_admins")
    .select("auth_user_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message as string, isAdmin: false };
  return { ok: true, error: null as string | null, isAdmin: Boolean(data?.auth_user_id) };
}

export async function getTeamMemberByAuthUserId(authUserId: string) {
  const svc = getServiceSupabase();
  if (!svc) return { ok: false, error: "Missing SUPABASE env (URL or SERVICE_ROLE)" as string, row: null as any };

  const { data, error } = await svc
    .from("team_members")
    .select("id,tenant_id,rol,activo,permissions")
    .eq("auth_user_id", authUserId)
    .eq("activo", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, error: error.message as string, row: null };
  return { ok: true, error: null as string | null, row: data };
}

export async function validateDemoTrialAccess(req: Request): Promise<{ ok: boolean; expired: boolean; error: string | null }> {
  const { user, error } = await getRequestUser(req);
  if (!user) return { ok: false, expired: false, error: error || "Unauthorized" };

  const anon = getAnonSupabase();
  if (!anon) return { ok: false, expired: false, error: "Missing SUPABASE env" };

  // Get user metadata to check trial status
  const { data, error: getUserError } = await anon.auth.getUser();
  if (getUserError || !data?.user?.user_metadata) {
    return { ok: false, expired: false, error: getUserError?.message || "Could not get user metadata" };
  }

  const metadata = data.user.user_metadata as any;
  const isTrial = metadata?.is_trial === true;
  const trialEnd = metadata?.trial_end;

  // If not a trial user, allow access
  if (!isTrial || !trialEnd) {
    return { ok: true, expired: false, error: null };
  }

  // Check if trial has expired
  const now = new Date();
  const expirationDate = new Date(trialEnd);
  const hasExpired = now > expirationDate;

  if (hasExpired) {
    return { ok: false, expired: true, error: "Trial period has expired" };
  }

  return { ok: true, expired: false, error: null };
}

export async function assertTenantAccess(params: {
  req: Request;
  requestedTenantId?: string | null;
  allowPlatformAdminCrossTenant?: boolean;
}) {
  const { req, requestedTenantId = null, allowPlatformAdminCrossTenant = true } = params;

  const { user, error } = await getRequestUser(req);
  if (!user) return { ok: false, status: 401 as const, error: error || "Unauthorized", user: null as any, tenantId: null as any, isPlatformAdmin: false as const };

  const pa = await isPlatformAdmin(user.id);
  if (!pa.ok) return { ok: false, status: 500 as const, error: pa.error || "Platform admin check failed", user, tenantId: null as any, isPlatformAdmin: false as const };

  if (pa.isAdmin) {
    if (!allowPlatformAdminCrossTenant) {
      return { ok: true, status: 200 as const, error: null as any, user, tenantId: requestedTenantId || null, isPlatformAdmin: true as const };
    }
    if (!requestedTenantId) {
      return { ok: false, status: 400 as const, error: "Missing tenantId", user, tenantId: null as any, isPlatformAdmin: true as const };
    }
    return { ok: true, status: 200 as const, error: null as any, user, tenantId: requestedTenantId, isPlatformAdmin: true as const };
  }

  const tm = await getTeamMemberByAuthUserId(user.id);
  if (!tm.ok) return { ok: false, status: 500 as const, error: tm.error || "Team member lookup failed", user, tenantId: null as any, isPlatformAdmin: false as const };
  if (!tm.row?.tenant_id) return { ok: false, status: 403 as const, error: "Forbidden", user, tenantId: null as any, isPlatformAdmin: false as const };

  const tenantId = String(tm.row.tenant_id);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    return { ok: false, status: 403 as const, error: "Forbidden", user, tenantId: null as any, isPlatformAdmin: false as const };
  }

  return { ok: true, status: 200 as const, error: null as any, user, tenantId, isPlatformAdmin: false as const };
}
