import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Handler principal
export async function POST(req: Request) {
  try {
    const { email, otp, auth_user_id } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { ok: false, error: "Email requerido" },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== "string" || otp.length !== 6) {
      return NextResponse.json(
        { ok: false, error: "Código OTP inválido" },
        { status: 400 }
      );
    }

    // ✅ Buscar sesión OTP activa para este email
    let otpSession: any = null;
    let queryError: any = null;

    const queries = [
      () => supabase
        .from("otp_sessions")
        .select("id, otp_code, attempts_remaining, expires_at, is_verified")
        .eq("email", email)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      () => supabase
        .from("otp_sessions")
        .select("id, otp_code, attempts_remaining, expires_at")
        .eq("email", email)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ];

    for (const run of queries) {
      const result = await run();
      if (!result.error) {
        otpSession = result.data as any;
        queryError = null;
        break;
      }
      queryError = result.error;
    }

    if (queryError) {
      console.error("Error consultando sesión OTP:", queryError);
      return NextResponse.json(
        { ok: false, error: "Error al procesar solicitud" },
        { status: 500 }
      );
    }

    // ✅ Caso 1: No existe sesión OTP para este email
    if (!otpSession) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Sesión OTP expirada o no encontrada. Solicita un nuevo código.",
        },
        { status: 401 }
      );
    }

    // ✅ Caso 2: OTP ya fue verificado anteriormente
    if ((otpSession as any)?.is_verified) {
      return NextResponse.json(
        {
          ok: false,
          error: "Este OTP ya fue verificado. Solicita un nuevo código.",
        },
        { status: 401 }
      );
    }

    // ✅ Caso 3: Código OTP incorrecto
    if (otpSession.otp_code !== otp) {
      const attemptsRemaining = Number((otpSession as any)?.attempts_remaining ?? 3) - 1;

      // ✅ Actualizar intentos restantes
      const { error: updateError } = await supabase
        .from("otp_sessions")
        .update({ attempts_remaining: attemptsRemaining } as any)
        .eq("id", otpSession.id);

      if (updateError) {
        console.error("Error actualizando intentos:", updateError);
      }

      // ✅ Si no quedan intentos, eliminar sesión
      if (attemptsRemaining <= 0) {
        await supabase.from("otp_sessions").delete().eq("id", otpSession.id);

        console.warn(
          "🚫 [OTP] Demasiados intentos fallidos para:",
          email
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "Demasiados intentos fallidos. Solicita un nuevo código OTP.",
            blocked: true,
          },
          { status: 401 }
        );
      }

      console.warn(
        "⚠️ [OTP] Código incorrecto para:",
        email,
        "| Intentos restantes:",
        attemptsRemaining
      );

      return NextResponse.json(
        {
          ok: false,
          error: `Código incorrecto. ${attemptsRemaining} ${attemptsRemaining === 1 ? "intento" : "intentos"} restante${attemptsRemaining === 1 ? "" : "s"}.`,
          attemptsRemaining,
        },
        { status: 401 }
      );
    }

    // ✅ Caso 4: Código OTP es correcto
    console.log("✅ [OTP] Verificación exitosa para:", email);

    // ✅ Marcar como verificado
    let verifyError: any = null;
    const verifyVariants = [
      { is_verified: true, verified_at: new Date().toISOString() },
      { verified_at: new Date().toISOString() },
    ];
    for (const payload of verifyVariants) {
      const { error } = await supabase
        .from("otp_sessions")
        .update(payload as any)
        .eq("id", otpSession.id);
      if (!error) {
        verifyError = null;
        break;
      }
      verifyError = error;
    }

    if (verifyError) {
      console.error("Error marcando OTP como verificado:", verifyError);
      return NextResponse.json(
        { ok: false, error: "Error al procesar verificación" },
        { status: 500 }
      );
    }

    // ✅ Retornar éxito
    try {
      let authUserId = String(auth_user_id || "").trim();

      if (!authUserId) {
        const { data: appUser } = await supabase
          .from("app_users")
          .select("auth_user_id")
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        authUserId = String(appUser?.auth_user_id || "").trim();
      }

      if (!authUserId) {
        const { data: usersData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const match = (usersData?.users || []).find((u: any) => String(u?.email || "").toLowerCase() === String(email).toLowerCase());
        authUserId = String(match?.id || "").trim();
      }

      if (authUserId) {
        await supabase.auth.admin.updateUserById(authUserId, { email_confirm: true });
      }
    } catch (e) {
      console.warn("[OTP] No se pudo confirmar usuario auth por OTP:", e);
    }

    return NextResponse.json(
      {
        ok: true,
        message: "OTP verificado correctamente",
        email,
        otpSessionId: otpSession.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ [OTP] Error en verify-otp:", error);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
