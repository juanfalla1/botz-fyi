import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/app/api/_utils/rateLimit";
import { logReq, makeReqContext } from "@/app/api/_utils/observability";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const ctx = makeReqContext(req, "/api/platform/admin-invites/validate");
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit({ key: `invite-validate:${ip}`, limit: 120, windowMs: 10 * 60 * 1000 });
    if (!rl.ok) {
      logReq(ctx, "warn", "rate_limited");
      return NextResponse.json({ error: "Too many requests", code: "RATE_LIMITED" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const inviteId = searchParams.get("inviteId");

    if (!inviteId) {
      return NextResponse.json(
        { error: "inviteId is required" },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const { data: invite, error } = await supabase
      .from("admin_invites")
      .select("*")
      .eq("id", inviteId)
      .single();

    if (error || !invite) {
      logReq(ctx, "warn", "invite_not_found", { invite_id: inviteId });
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if already accepted
    if (invite.status === "accepted") {
      logReq(ctx, "warn", "invite_already_accepted", { invite_id: inviteId });
      return NextResponse.json(
        { error: "Invitation already accepted" },
        { status: 400 }
      );
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      logReq(ctx, "warn", "invite_expired", { invite_id: inviteId });
      return NextResponse.json(
        { error: "Invitation expired" },
        { status: 400 }
      );
    }

    logReq(ctx, "info", "ok", { invite_id: inviteId });
    return NextResponse.json({ ok: true, invite });
  } catch (error) {
    logReq(ctx, "error", "exception", { error: (error as any)?.message || String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
