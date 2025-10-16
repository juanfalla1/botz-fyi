// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.ZOHO_HOST,                 // ej: "smtp.zoho.com"
  port: Number(process.env.ZOHO_PORT || 465),  // 465 normalmente
  secure: true,
  auth: {
    user: process.env.ZOHO_USER,               // tu cuenta Zoho
    pass: process.env.ZOHO_APP_PASSWORD,       // app password
  },
});

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      nombre = "",
      email = "",
      empresa = "",
      telefono = "",
      interes = "",
      lead_id = "",
      origen = "",
      user_id = "",
    } = data || {};

    // Validación mínima (no rompe nada)
    if (!nombre || !email) {
      return NextResponse.json(
        { ok: false, error: "Faltan campos obligatorios (nombre, email)." },
        { status: 400 }
      );
    }

    // Envío de correo
    await transporter.sendMail({
      // ✅ Ajuste: usar la MISMA cuenta autenticada en Zoho
      from: `"Solicitud de Demo botz" <${process.env.ZOHO_USER}>`,
      to: process.env.MAIL_TO || process.env.ZOHO_USER, // destino
      subject: "Nuevo lead desde la web",
      html: `
        <h2>Nuevo lead</h2>
        <p><b>Nombre:</b> ${nombre}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Empresa:</b> ${empresa || "-"}</p>
        <p><b>Teléfono:</b> ${telefono || "-"}</p>
        <p><b>Interés:</b> ${interes || "-"}</p>
        <hr/>
        <p><b>Lead ID:</b> ${lead_id || "-"}</p>
        <p><b>Origen:</b> ${origen || "-"}</p>
        <p><b>User ID:</b> ${user_id || "-"}</p>
      `,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unhandled error" },
      { status: 500 }
    );
  }
}

