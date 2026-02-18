import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendInviteEmail } from "@/app/api/_utils/mailer";
import crypto from "crypto";

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

// Generar token único para la invitación
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// GET - Listar todas las invitaciones
export async function GET(req: NextRequest) {
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
        { error: "Only platform admins can view invites" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("admin_invites")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Crear nueva invitación
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
        { error: "Only platform admins can create invites" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, role = "developer", access_level = "full", expires_at, notes } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Create invite record
    const { data: inviteData, error: insertError } = await supabase
      .from("admin_invites")
      .insert({
        email,
        role,
        access_level,
        created_by: user.id,
        expires_at,
        notes,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Este email ya tiene una invitación" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // Generate and store invitation token
    const inviteToken = generateInviteToken();
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { error: tokenError } = await supabase
      .from("invite_tokens")
      .insert({
        invite_id: inviteData.id,
        token: inviteToken,
        email,
        expires_at: tokenExpiresAt.toISOString(),
      });

    if (tokenError) {
      console.error("Error creating token:", tokenError);
      return NextResponse.json(
        { error: "Error creating invitation token" },
        { status: 500 }
      );
    }

    // Send invitation email
    const emailSent = await sendInviteEmail(email, inviteToken, role, access_level);

    if (!emailSent) {
      console.warn(`Email not sent to ${email}, but invitation was created`);
    }

    return NextResponse.json(
      {
        ...inviteData,
        emailSent,
        message: emailSent 
          ? "Invitación creada y email enviado correctamente"
          : "Invitación creada pero hubo problema enviando el email",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar invitación
export async function PATCH(req: NextRequest) {
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
        { error: "Only platform admins can update invites" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, status, access_level, role, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("admin_invites")
      .update({
        ...(status && { status }),
        ...(access_level && { access_level }),
        ...(role && { role }),
        ...(notes !== undefined && { notes }),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Revocar invitación
export async function DELETE(req: NextRequest) {
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
        { error: "Only platform admins can delete invites" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("admin_invites")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
