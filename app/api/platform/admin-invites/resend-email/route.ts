import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendInviteEmail } from "@/app/api/_utils/mailer";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verificar que es Platform Admin
async function isPlatformAdmin(authUserId: string) {
  const { data, error } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  return !error && !!data;
}

// POST - Reenviar email de invitación
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "No authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const isAdmin = await isPlatformAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only platform admins can resend invites" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { inviteId } = body;

    if (!inviteId) {
      return NextResponse.json(
        { error: "Invite ID is required" },
        { status: 400 }
      );
    }

    // Get invite details
    const { data: invite, error: inviteError } = await supabase
      .from("admin_invites")
      .select("*")
      .eq("id", inviteId)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    // Send email with inviteId directly
    const emailSent = await sendInviteEmail(
      invite.email,
      inviteId,
      invite.role,
      invite.access_level
    );

    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      inviteId,
    });
  } catch (error) {
    console.error("Error resending email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
