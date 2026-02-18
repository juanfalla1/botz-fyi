import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if already accepted
    if (invite.status === "accepted") {
      return NextResponse.json(
        { error: "Invitation already accepted" },
        { status: 400 }
      );
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invitation expired" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, invite });
  } catch (error) {
    console.error("Error validating invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
