import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { to, userName, plan } = await req.json();

    if (!to) {
      return NextResponse.json({ error: "Falta 'to' (email del cliente)" }, { status: 400 });
    }

    const host = process.env.ZOHO_HOST;
    const port = Number(process.env.ZOHO_PORT || 465);
    const user = process.env.ZOHO_USER;
    const pass = process.env.ZOHO_APP_PASSWORD;
    const from = process.env.MAIL_FROM || (user ? `Botz <${user}>` : undefined);

    const onboardingUrl = process.env.ONBOARDING_URL_PRICING;

    if (!host || !user || !pass || !from) {
      return NextResponse.json(
        { error: "Faltan variables SMTP (ZOHO_HOST/ZOHO_PORT/ZOHO_USER/ZOHO_APP_PASSWORD/MAIL_FROM)" },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const subject = `🎉 ¡Bienvenido a Botz${userName ? `, ${userName}` : ""}!`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 ¡Bienvenido a Botz!</h1>
          </div>

          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Hola <strong>${userName || ""}</strong>
            </p>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Tu suscripción al <strong style="color: #667eea;">Plan ${plan || "Básico"}</strong> está activa.
            </p>

            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              <b>Siguiente paso:</b> agenda tu sesión virtual para empezar las integraciones.
            </p>

            ${
              onboardingUrl
                ? `<div style="text-align: center; margin: 30px 0;">
                    <a href="${onboardingUrl}" 
                       style="display: inline-block; background: #667eea; color: white; padding: 15px 40px; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 16px;">
                      📅 Agendar sesión virtual
                    </a>
                  </div>`
                : `<p style="color:#b91c1c; font-weight: bold;">⚠️ Falta ONBOARDING_URL_PRICING en .env.local</p>`
            }

            <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 30px;">
              Si no solicitaste esto, puedes ignorar este mensaje.
            </p>
          </div>

          <div style="background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Botz · info@botz.fyi
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
              © ${new Date().getFullYear()} Botz. Todos los derechos reservados.
            </p>
          </div>

        </div>
      </body>
      </html>
    `;

    const bccTo = process.env.MAIL_TO || "info@botz.fyi";

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      bcc: bccTo,
    });

    console.log("✅ Email enviado a:", to, "| BCC:", bccTo);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("❌ Error enviando email:", e?.message);
    return NextResponse.json(
      { error: "Error interno", detail: e?.message },
      { status: 500 }
    );
  }
}