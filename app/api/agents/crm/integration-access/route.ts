import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ownerEmailsSet() {
  const configured = String(process.env.CRM_OWNER_EMAILS || "").trim();
  return new Set(
    (configured || "juangfalla@gmail.com")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
  );
}

function ownerDomainsSet() {
  const configured = String(process.env.CRM_OWNER_DOMAINS || "").trim();
  return new Set(
    (configured || "botz.fyi")
      .split(",")
      .map((x) => x.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean)
  );
}

function isOwnerUser(emailRaw: string) {
  const email = String(emailRaw || "").trim().toLowerCase();
  if (!email) return false;
  const owners = ownerEmailsSet();
  if (owners.has(email)) return true;
  const domains = ownerDomainsSet();
  const domain = email.split("@")[1] || "";
  return Boolean(domain && domains.has(domain));
}

async function requireOwner(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return { ok: false as const, status: 401, error: guard.error || "Unauthorized" };
  const requesterEmail = String((guard.user as any)?.email || "").trim().toLowerCase();
  if (!isOwnerUser(requesterEmail)) {
    return { ok: false as const, status: 403, error: "Solo el owner puede autorizar CRM." };
  }
  return { ok: true as const, user: guard.user };
}

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error || "Unauthorized" }, { status: 401 });

  const requesterEmail = String((guard.user as any)?.email || "").trim().toLowerCase();
  const isOwner = isOwnerUser(requesterEmail);

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const { data: accessRow, error: accessErr } = await supabase
    .from("agent_crm_access")
    .select("enabled,updated_at")
    .eq("user_id", guard.user.id)
    .maybeSingle();

  if (accessErr && !String(accessErr?.message || "").toLowerCase().includes("does not exist")) {
    return NextResponse.json({ ok: false, error: accessErr.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      requester_user_id: guard.user.id,
      requester_email: requesterEmail,
      is_owner: isOwner,
      self_enabled: Boolean((accessRow as any)?.enabled),
      self_enabled_updated_at: (accessRow as any)?.updated_at || null,
    },
  });
}

export async function POST(req: Request) {
  const owner = await requireOwner(req);
  if (!owner.ok) return NextResponse.json({ ok: false, error: owner.error }, { status: owner.status });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const targetUserIdRaw = String(body?.target_user_id || "").trim();
  const targetEmail = String(body?.target_email || "").trim().toLowerCase();
  const enabled = Boolean(body?.enabled);
  const source = String(body?.source || "integration").slice(0, 120);
  const notes = String(body?.notes || "").slice(0, 500);

  let targetUserId = targetUserIdRaw;
  if (!targetUserId && targetEmail) {
    const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersErr) return NextResponse.json({ ok: false, error: usersErr.message }, { status: 500 });
    const match = (usersData?.users || []).find((u: any) => String(u?.email || "").toLowerCase() === targetEmail);
    targetUserId = String(match?.id || "").trim();
  }

  if (!targetUserId) {
    return NextResponse.json({ ok: false, error: "Falta target_user_id o target_email válido." }, { status: 400 });
  }

  const payload = {
    user_id: targetUserId,
    enabled,
    granted_by: owner.user.id,
    source,
    notes: notes || null,
  };

  const { data, error } = await supabase
    .from("agent_crm_access")
    .upsert(payload, { onConflict: "user_id" })
    .select("user_id,enabled,granted_by,source,notes,updated_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data });
}
