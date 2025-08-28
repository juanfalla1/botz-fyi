import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { nombre, empresa, telefono, interes } = await req.json();

    if (!nombre || !empresa || !telefono || !interes) {
      return NextResponse.json(
        { success: false, error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    // Configuración del transporte SMTP con Zoho
    const transporter = nodemailer.createTransport({
      host: process.env.ZOHO_HOST,            // smtp.zoho.ca
      port: Number(process.env.ZOHO_PORT),    // 465
      secure: true,                           // true = TLS/SSL
      auth: {
        user: process.env.ZOHO_USER,          // info@botz.fyi
        pass: process.env.ZOHO_APP_PASSWORD,  // App Password generado en Zoho
      },
    });

    // Construir y enviar el correo
    const info = await transporter.sendMail({
      from: `"Web Botz" <${process.env.ZOHO_USER}>`,
      to: process.env.ZOHO_USER, // lo recibes en tu mismo correo
      subject: "Nueva solicitud de demo personalizada",
      text: `
        Nombre: ${nombre}
        Empresa: ${empresa}
        Teléfono: ${telefono}
        Interés: ${interes}
      `,
      html: `
        <h3>Nueva solicitud de demo personalizada</h3>
        <p><b>Nombre:</b> ${nombre}</p>
        <p><b>Empresa:</b> ${empresa}</p>
        <p><b>Teléfono:</b> ${telefono}</p>
        <p><b>Interés:</b> ${interes}</p>
      `,
    });

    console.log("✅ Correo enviado:", info.messageId);

    return NextResponse.json({ success: true, message: "Correo enviado 🚀" });
  } catch (error: any) {
    console.error("❌ Error enviando correo:", error);

    // devolvemos el error exacto para depuración
    return NextResponse.json(
      { success: false, error: error.message || JSON.stringify(error) },
      { status: 500 }
    );
  }
}
