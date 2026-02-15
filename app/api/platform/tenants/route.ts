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
  if (!svc) return { ok: false, error: "Missing SUPABASE env (URL or SERVICE_ROLE)" as string, userId: null as string | null };

  const { user, error } = await getRequestUser(req);
  if (!user) return { ok: false, error: error || "Unauthorized", userId: null };

  // Check platform_admins table (service role bypasses RLS)
  const { data: row, error: selErr } = await svc
    .from("platform_admins")
    .select("auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (selErr || !row?.auth_user_id) return { ok: false, error: "Forbidden", userId: null };
  return { ok: true, error: null as string | null, userId: user.id };
}

export async function GET(req: Request) {
  try {
    const svc = getServiceSupabase();
    if (!svc) {
      return NextResponse.json({ ok: false, error: "Missing SUPABASE env (URL or SERVICE_ROLE)" }, { status: 500 });
    }

    const guard = await assertPlatformAdmin(req);
    if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 403 });

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const tenantId = (url.searchParams.get("tenantId") || "").trim();

    if (tenantId) {
      const [{ data: tenant, error: tenantErr }, { data: team, error: teamErr }] = await Promise.all([
        svc.from("tenants").select("*").eq("id", tenantId).maybeSingle(),
        svc
          .from("team_members")
          .select("id,nombre,email,rol,activo,auth_user_id,created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: true }),
      ]);

      if (tenantErr) throw tenantErr;
      if (teamErr) throw teamErr;
      return NextResponse.json({ ok: true, tenant, team: team || [] });
    }

    let query = svc
      .from("tenants")
      .select("id,tenant_id,empresa,email,telefono,status,trial_start,trial_end,source,created_at,auth_user_id")
      .order("created_at", { ascending: false })
      .limit(500);

    if (q) {
      // match empresa OR email
      const like = `%${q.replace(/%/g, "").replace(/_/g, "").slice(0, 120)}%`;
      query = query.or(`empresa.ilike.${like},email.ilike.${like}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const tenants = (data || []) as any[];

    // Add lightweight counts to help disambiguate duplicated tenants.
    const tenantIds = tenants.map((t) => t.id).filter(Boolean);

    const mapLimit = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
      const results: R[] = [];
      let i = 0;
      const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }).map(async () => {
        while (i < items.length) {
          const idx = i++;
          results[idx] = await fn(items[idx]);
        }
      });
      await Promise.all(workers);
      return results;
    };

    const counts = await mapLimit(
      tenantIds,
      10,
      async (tenantId: string) => {
        const [leadsRes, teamRes] = await Promise.all([
          svc
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId),
          svc
            .from("team_members")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .or("activo.is.null,activo.eq.true"),
        ]);

        return {
          tenantId,
          leads_count: leadsRes.count || 0,
          members_count: teamRes.count || 0,
        };
      }
    );

    const countMap = new Map(counts.map((c) => [c.tenantId, c]));
    const enriched = tenants.map((t) => {
      const c = countMap.get(t.id);
      return {
        ...t,
        leads_count: c?.leads_count ?? 0,
        members_count: c?.members_count ?? 0,
      };
    });

    return NextResponse.json({ ok: true, tenants: enriched });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
