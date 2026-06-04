import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getClientIp, rateLimit } from "../_utils/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit({ key: `contact:${ip}`, limit: 10, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

  const { nombre, empresa, telefono, email, website, interes, source } = await req.json().catch(() => ({}));

  if (!nombre || String(nombre).trim().length < 2) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const mailUser = process.env.MAIL_USER || process.env.ZOHO_USER;
  const mailTo = process.env.MAIL_TO || mailUser;
  const zohoHost = process.env.ZOHO_HOST;
  const zohoPort = Number(process.env.ZOHO_PORT || 465);
  const zohoUser = process.env.ZOHO_USER || mailUser;
  const zohoPassword = process.env.ZOHO_APP_PASSWORD;

  if (!zohoHost || !zohoUser || !zohoPassword || !mailUser || !mailTo) {
    console.error("Missing email configuration for contact form", {
      hasZohoHost: Boolean(zohoHost),
      hasZohoUser: Boolean(zohoUser),
      hasZohoPassword: Boolean(zohoPassword),
      hasMailUser: Boolean(mailUser),
      hasMailTo: Boolean(mailTo),
    });
    return NextResponse.json({ ok: false, error: "EMAIL_NOT_CONFIGURED" }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    host: zohoHost,
    port: zohoPort,
    secure: zohoPort === 465,
    auth: {
      user: zohoUser,
      pass: zohoPassword,
    },
  });

  const mailOptions = {
    from: `"Solicitud de Demo Botz" <${mailUser}>`,
    to: mailTo,
    replyTo: email ? String(email) : undefined,
    subject: source === "geo-demo" ? "Nueva solicitud de demo Botz GEO" : "Nueva solicitud de demo personalizada",
    html: `
      <h2>Nueva solicitud de demo</h2>
      <p><strong>Nombre:</strong> ${nombre}</p>
      <p><strong>Empresa:</strong> ${empresa}</p>
      <p><strong>Email:</strong> ${email || "No informado"}</p>
      <p><strong>Teléfono:</strong> ${telefono}</p>
      <p><strong>Website:</strong> ${website || "No informado"}</p>
      <p><strong>Origen:</strong> ${source || "Formulario general"}</p>
      <p><strong>Interés:</strong> ${interes}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    return NextResponse.json({ ok: false, error: "EMAIL_SEND_FAILED" }, { status: 500 });
  }
}
