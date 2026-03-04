import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const otpSessionId = String(body?.otpSessionId || "").trim();
    const newPassword = String(body?.newPassword || "");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Email invalido" }, { status: 400 });
    }
    if (!otpSessionId) {
      return NextResponse.json({ ok: false, error: "Falta session OTP" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ ok: false, error: "La contrasena debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const { data: otp, error: otpError } = await supabase
      .from("otp_sessions")
      .select("id, email, is_verified, expires_at")
      .eq("id", otpSessionId)
      .maybeSingle();

    if (otpError || !otp) {
      return NextResponse.json({ ok: false, error: "Sesion OTP no encontrada" }, { status: 401 });
    }

    if (String(otp.email || "").trim().toLowerCase() !== email) {
      return NextResponse.json({ ok: false, error: "Sesion OTP invalida para este correo" }, { status: 401 });
    }

    if (!Boolean((otp as any)?.is_verified)) {
      return NextResponse.json({ ok: false, error: "OTP no verificado" }, { status: 401 });
    }

    if (new Date(String((otp as any)?.expires_at || "")).getTime() < Date.now()) {
      return NextResponse.json({ ok: false, error: "OTP expirado" }, { status: 401 });
    }

    let authUserId = "";
    const { data: appUser } = await supabase
      .from("app_users")
      .select("auth_user_id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    authUserId = String(appUser?.auth_user_id || "").trim();

    if (!authUserId) {
      const { data: usersData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = (usersData?.users || []).find((u: any) => String(u?.email || "").toLowerCase() === email);
      authUserId = String(match?.id || "").trim();
    }

    if (!authUserId) {
      return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, {
      password: newPassword,
      email_confirm: true,
    });

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message || "No se pudo actualizar la contrasena" }, { status: 500 });
    }

    await supabase.from("otp_sessions").delete().eq("email", email);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}
