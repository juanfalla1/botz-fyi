// app/api/send-welcome-email-pricing/route.ts
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

    const onboardingUrl = process.env.ONBOARDING_URL_PRICING; // ✅ la nueva que ya pusiste

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
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>¡Bienvenido${userName ? ` ${userName}` : ""} a Botz! 🚀</h2>
        <p>Tu suscripción${plan ? ` al <b>Plan ${plan}</b>` : ""} está activa.</p>

        <p><b>Siguiente paso:</b> agenda tu sesión virtual para empezar las integraciones.</p>

        ${
          onboardingUrl
            ? `<p>
                <a href="${onboardingUrl}"
                   style="display:inline-block;padding:12px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:10px">
                  📅 Agendar sesión virtual
                </a>
              </p>`
            : `<p style="color:#b91c1c"><b>Falta ONBOARDING_URL_PRICING</b> en .env.local</p>`
        }

        <hr/>
        <p style="color:#6b7280;font-size:12px">Botz · info@botz.fyi</p>
      </div>
    `;

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      bcc: process.env.MAIL_TO || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Error interno", detail: e?.message }, { status: 500 });
  }
}
