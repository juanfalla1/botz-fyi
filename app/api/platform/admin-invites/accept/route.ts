import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRequestUser } from "@/app/api/_utils/guards";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function makeUuidV4() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;
  const hex = Array.from(arr)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getRequestUser(req);

    const body = await req.json();
    const inviteId = String(body?.inviteId || "").trim();
    const providedEmail = String(body?.email || "").trim().toLowerCase();
    const providedAuthUserId = String(body?.authUserId || "").trim();
    if (!inviteId) {
      return NextResponse.json({ ok: false, error: "inviteId is required" }, { status: 400 });
    }

    const { data: invite, error: inviteError } = await supabase
      .from("admin_invites")
      .select("id,email,role,access_level,status,expires_at")
      .eq("id", inviteId)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ ok: false, error: "Invitation not found" }, { status: 404 });
    }

    if (String(invite.status || "").toLowerCase() === "accepted") {
      return NextResponse.json({ ok: false, error: "Invitation already accepted" }, { status: 400 });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ ok: false, error: "Invitation expired" }, { status: 400 });
    }

    let resolvedAuthUserId = auth.user?.id || null;
    let authEmail = String(auth.user?.email || "").toLowerCase();

    if (!resolvedAuthUserId && providedAuthUserId) {
      const { data: lookedUp, error: lookErr } = await supabase.auth.admin.getUserById(providedAuthUserId);
      if (lookErr || !lookedUp?.user) {
        return NextResponse.json({ ok: false, error: "Invalid auth user" }, { status: 400 });
      }
      resolvedAuthUserId = lookedUp.user.id;
      authEmail = String(lookedUp.user.email || "").toLowerCase();
    }

    const inviteEmail = String(invite.email || "").toLowerCase();

    // Permitir dos vías:
    // 1) autenticado: email de sesión debe coincidir
    // 2) sin sesión (signup sin token): email enviado debe coincidir
    const emailMatches = (authEmail && authEmail === inviteEmail) || (providedEmail && providedEmail === inviteEmail);
    if (!emailMatches) {
      return NextResponse.json({ ok: false, error: "Invite email mismatch" }, { status: 403 });
    }

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 2);
    const trialEndIso = trialEndDate.toISOString();

    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id, tenant_id")
      .eq("email", invite.email)
      .maybeSingle();

    const tenantId = existingMember?.tenant_id || makeUuidV4();

    if (existingMember?.id) {
      const { error } = await supabase
        .from("team_members")
        .update({
          tenant_id: tenantId,
          rol: "admin",
          activo: true,
          ...(resolvedAuthUserId ? { auth_user_id: resolvedAuthUserId } : {}),
        })
        .eq("id", existingMember.id);
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
    } else {
      const { error } = await supabase
        .from("team_members")
        .insert({
          tenant_id: tenantId,
          email: invite.email,
          nombre: invite.email.split("@")[0],
          rol: "admin",
          activo: true,
          ...(resolvedAuthUserId ? { auth_user_id: resolvedAuthUserId } : {}),
          permissions: { all: true },
        });
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
    }

    if (resolvedAuthUserId) {
      const { error: metadataError } = await supabase.auth.admin.updateUserById(resolvedAuthUserId, {
        email_confirm: true,
        user_metadata: {
          tenant_id: tenantId,
          role: invite.role,
          is_trial: true,
          trial_start: new Date().toISOString(),
          trial_end: trialEndIso,
        },
      });

      if (metadataError) {
        return NextResponse.json({ ok: false, error: metadataError.message }, { status: 400 });
      }
    }

    const { error: inviteUpdateError } = await supabase
      .from("admin_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    if (inviteUpdateError) {
      return NextResponse.json({ ok: false, error: inviteUpdateError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, tenant_id: tenantId, needs_login: !resolvedAuthUserId });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Internal server error" }, { status: 500 });
  }
}
