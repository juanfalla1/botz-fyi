import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function buildTransport() {
  const host = process.env.SMTP_HOST || process.env.ZOHO_HOST || "smtp.zoho.com";
  const port = Number(process.env.SMTP_PORT || process.env.ZOHO_PORT || 465);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;
  const user = process.env.SMTP_USER || process.env.ZOHO_USER || "";
  const pass = process.env.SMTP_PASSWORD || process.env.ZOHO_PASS || process.env.ZOHO_APP_PASSWORD || "";

  if (!user || !pass) {
    throw new Error("SMTP credentials missing (SMTP_USER/SMTP_PASSWORD or ZOHO_USER/ZOHO_PASS)");
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    }),
    from: process.env.SMTP_FROM || process.env.MAIL_FROM || process.env.ZOHO_USER || user,
  };
}

// ✅ Función para generar código OTP de 6 dígitos
function generateOTP(): string {
  return crypto.randomInt(0, 999999).toString().padStart(6, "0");
}

// ✅ Función para enviar email con OTP
async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  try {
    const { transporter, from } = buildTransport();
    const mailOptions = {
      from,
      to: email,
      subject: "Tu código de verificación Botz - 2FA",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; text-align: center;">
            <h1 style="color: white; margin: 0;">🔐 Código de Verificación</h1>
          </div>
          
          <div style="padding: 30px; background: #f5f5f5; border-radius: 12px; margin-top: 20px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
              Ingresa este código para verificar tu identidad:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #667eea;">
              <span style="font-size: 48px; font-weight: bold; color: #667eea; letter-spacing: 10px;">
                ${otp}
              </span>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px; text-align: center;">
              ⏱️ Este código expira en <strong>5 minutos</strong>
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 10px; text-align: center;">
              ⚠️ Tienes <strong>3 intentos</strong> para ingresar el código correcto
            </p>
          </div>
          
          <div style="padding: 20px; background: #fff3cd; border-radius: 8px; margin-top: 20px; border-left: 4px solid #ffc107;">
            <p style="color: #856404; margin: 0; font-size: 13px;">
              <strong>⚠️ Seguridad:</strong> Nunca compartas este código con nadie. El equipo de Botz nunca te lo pedirá.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Botz · Automatización Inteligente</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ OTP email enviado a:", email);
    return true;
  } catch (error) {
    console.error("❌ Error enviando OTP email:", error);
    return false;
  }
}

// ✅ Handler principal
export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { ok: false, error: "Email requerido" },
        { status: 400 }
      );
    }

    // ✅ Limpiar sesiones OTP expiradas (best effort)
    try {
      await supabase
        .from("otp_sessions")
        .delete()
        .lt("expires_at", new Date().toISOString());
    } catch (e) {
      console.warn("[OTP] cleanup warning:", e);
    }

    // ✅ Verificar si ya existe una sesión OTP activa para este email
    const { data: existingOTP, error: existingError } = await supabase
      .from("otp_sessions")
      .select("id, created_at")
      .eq("email", email)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.warn("[OTP] query existing warning (continuing):", existingError);
    }

    // ✅ Si existe sesión reciente, esperar antes de generar nueva (rate limiting)
    if (existingOTP) {
      const createdAt = new Date(existingOTP.created_at).getTime();
      const now = Date.now();
      const timeSinceCreation = (now - createdAt) / 1000; // segundos

      if (timeSinceCreation < 30) {
        // Esperar 30 segundos entre intentos
        return NextResponse.json(
          {
            ok: false,
            error: `Espera ${Math.ceil(30 - timeSinceCreation)} segundos antes de solicitar otro código`,
          },
          { status: 429 }
        );
      }

      // Eliminar la sesión anterior
      await supabase.from("otp_sessions").delete().eq("id", existingOTP.id);
    }

    // ✅ Generar nuevo código OTP
    const otp = generateOTP();

    // ✅ Guardar OTP en base de datos
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const variants = [
      { email, otp_code: otp, attempts_remaining: 3, is_verified: false, expires_at: expiresAt },
      { email, otp_code: otp, attempts_remaining: 3, expires_at: expiresAt },
      { email, otp_code: otp, expires_at: expiresAt },
    ];

    let created: any = null;
    let lastInsertError: any = null;
    for (const payload of variants) {
      const { data: createdData, error: createdError } = await supabase
        .from("otp_sessions")
        .insert(payload as any)
        .select("id")
        .single();
      if (!createdError) {
        created = createdData;
        lastInsertError = null;
        break;
      }
      lastInsertError = createdError;
    }

    if (!created) {
      console.error("Error creando sesión OTP:", lastInsertError);
      return NextResponse.json(
        { ok: false, error: "Error al crear sesión OTP", details: String(lastInsertError?.message || "") },
        { status: 500 }
      );
    }

    // ✅ Enviar email con OTP
    const emailSent = await sendOTPEmail(email, otp);

    if (!emailSent) {
      // Eliminar la sesión OTP si no se pudo enviar el email
      await supabase.from("otp_sessions").delete().eq("id", created.id);

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo enviar el email. Intenta más tarde.",
        },
        { status: 500 }
      );
    }

    console.log(
      "✅ [OTP] Sesión OTP creada para:",
      email,
      "| OTP:",
      otp
    );

    return NextResponse.json(
      {
        ok: true,
        message: "Código OTP enviado al email",
        sessionId: created.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ [OTP] Error en request-otp:", error);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor", details: String(error?.message || error) },
      { status: 500 }
    );
  }
}
