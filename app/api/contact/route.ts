import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { nombre, empresa, telefono, interes } = await req.json();

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
