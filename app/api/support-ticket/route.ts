// app/api/support-ticket/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      ticketId,
      ticketShort,
      fromEmail,
      fromName,
      messagePreview,
    } = body || {};

    if (!ticketId || !ticketShort) {
      return NextResponse.json({ ok: false, error: "Missing ticketId/ticketShort" }, { status: 400 });
    }

    const zohoUser = process.env.ZOHO_USER;
    const zohoPass = process.env.ZOHO_PASS || process.env.ZOHO_APP_PASSWORD;
    const host = process.env.ZOHO_HOST || "smtp.zoho.com";
    const port = Number(process.env.ZOHO_PORT || 465);
    const mailFrom = process.env.MAIL_FROM || zohoUser;
    const internalTo = process.env.MAIL_TO || "info@botz.fyi";

    if (!zohoUser || !zohoPass || !mailFrom) {
      return NextResponse.json(
        { ok: false, error: "SMTP not configured" },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: true,
      auth: {
        user: zohoUser,
        pass: zohoPass,
      },
    });

    const subjectInternal = `🛠️ Nuevo ticket de soporte #${ticketShort}`;
    const subjectUser = `✅ Recibimos tu solicitud #${ticketShort} - Botz`;

    const safePreview = String(messagePreview || "").slice(0, 400);
    const safeFrom = fromEmail ? String(fromEmail) : "(sin email)";
    const safeName = fromName ? String(fromName) : "";

    await transporter.sendMail({
      from: `Botz <${mailFrom}>`,
      to: internalTo,
      subject: subjectInternal,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>Nuevo ticket de soporte</h2>
          <p><strong>ID:</strong> ${ticketId}</p>
          <p><strong>Ticket:</strong> #${ticketShort}</p>
          <p><strong>Usuario:</strong> ${safeName} ${safeFrom}</p>
          <p><strong>Mensaje:</strong></p>
          <pre style="background:#f3f4f6;padding:12px;border-radius:8px;white-space:pre-wrap">${safePreview}</pre>
        </div>
      `,
    });

    if (fromEmail) {
      await transporter.sendMail({
        from: `Botz <${mailFrom}>`,
        to: String(fromEmail),
        subject: subjectUser,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6">
            <h2>Recibimos tu solicitud</h2>
            <p>Tu ticket fue creado con el numero <strong>#${ticketShort}</strong>.</p>
            <p>Te responderemos desde <strong>info@botz.fyi</strong> dentro de la plataforma.</p>
            <p style="color:#64748b;font-size:12px">Aunque muchos casos son parecidos, cada operación tiene particularidades. Esto es una orientación general y un gestor humano revisará tu caso concreto.</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
