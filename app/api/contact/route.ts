import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getClientIp, rateLimit } from "../_utils/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit({ key: `contact:${ip}`, limit: 10, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

  const { nombre, empresa, telefono, interes } = await req.json().catch(() => ({}));

  if (!nombre || String(nombre).trim().length < 2) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.ZOHO_HOST,
    port: Number(process.env.ZOHO_PORT),
    secure: true,
    auth: {
      user: process.env.ZOHO_USER,
      pass: process.env.ZOHO_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"Solicitud de Demo botz" <${process.env.MAIL_USER}>`,
    to: process.env.MAIL_TO || process.env.MAIL_USER,
    subject: "Nueva solicitud de demo personalizada",
    html: `
      <h2>Nueva solicitud de demo</h2>
      <p><strong>Nombre:</strong> ${nombre}</p>
      <p><strong>Empresa:</strong> ${empresa}</p>
      <p><strong>Teléfono:</strong> ${telefono}</p>
      <p><strong>Interés:</strong> ${interes}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
