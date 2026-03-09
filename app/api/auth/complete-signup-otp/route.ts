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
    const password = String(body?.password || "");
    const fullName = String(body?.fullName || "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Email invalido" }, { status: 400 });
    }
    if (!otpSessionId) {
      return NextResponse.json({ ok: false, error: "Falta session OTP" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ ok: false, error: "La contrasena debe tener al menos 6 caracteres" }, { status: 400 });
    }
    if (!fullName) {
      return NextResponse.json({ ok: false, error: "Nombre completo requerido" }, { status: 400 });
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

    const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersErr) {
      return NextResponse.json({ ok: false, error: usersErr.message || "No se pudo consultar usuarios" }, { status: 500 });
    }
    const existing = (usersData?.users || []).find((u: any) => String(u?.email || "").toLowerCase() === email);
    if (existing) {
      return NextResponse.json({ ok: false, error: "Este correo ya existe. Usa Iniciar sesion." }, { status: 409 });
    }

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { product_key: "agents", full_name: fullName, name: fullName },
    });

    if (createErr) {
      return NextResponse.json({ ok: false, error: createErr.message || "No se pudo crear la cuenta" }, { status: 500 });
    }

    await supabase.from("otp_sessions").delete().eq("email", email);

    return NextResponse.json({ ok: true, userId: created?.user?.id || null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}
