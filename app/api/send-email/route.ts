// Fuerza a que se ejecute en Node.js, no en Edge
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { nombre, empresa, telefono, interes, email, user_id } = await req.json();

    if (!nombre || !empresa || !telefono || !interes || !email || !user_id) {
      return NextResponse.json(
        { success: false, error: "Todos los campos son obligatorios (incluido user_id)" },
        { status: 400 }
      );
    }

    // Configuración SMTP Zoho
    const transporter = nodemailer.createTransport({
      host: process.env.ZOHO_HOST, // smtp.zoho.com
      port: Number(process.env.ZOHO_PORT), // 465
      secure: true,
      auth: {
        user: process.env.ZOHO_USER,
        pass: process.env.ZOHO_APP_PASSWORD,
      },
    });

    // 1️⃣ Correo interno para ti
    await transporter.sendMail({
      from: `"Web Botz" <${process.env.ZOHO_USER}>`,
      to: process.env.ZOHO_USER,
      subject: "Nueva solicitud de demo personalizada",
      html: `
        <h3>Nueva solicitud recibida</h3>
        <p><b>Nombre:</b> ${nombre}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Empresa:</b> ${empresa}</p>
        <p><b>Teléfono:</b> ${telefono}</p>
        <p><b>Interés:</b> ${interes}</p>
        <p><b>User ID:</b> ${user_id}</p>
      `,
    });

    // 🔑 Link a la página de demo en frontend (mejor que llamar directo al webhook)
    const demoLink = `https://www.botz.fyi/demo?lead=${user_id}`;

    // 2️⃣ Correo automático para el cliente
    await transporter.sendMail({
      from: `"Equipo Botz" <${process.env.ZOHO_USER}>`,
      to: email,
      subject: "🚀 Gracias por solicitar tu demo personalizada",
      html: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0f1c; padding:30px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0f1c; border-radius:8px; padding:20px; font-family:Arial,sans-serif;">
              
              <!-- Logo -->
              <tr>
                <td align="center" style="padding-bottom:20px;">
                  <img src="https://www.botz.fyi/botz-logo.png" alt="Botz Logo" style="max-width:150px;">
                </td>
              </tr>

              <!-- Encabezado -->
              <tr>
                <td align="center">
                  <h2 style="color:#00B4D8; margin:0;">¡Hola ${nombre}!</h2>
                </td>
              </tr>

              <!-- Texto -->
              <tr>
                <td align="center" style="padding:20px 0;">
                  <p style="color:#ffffff; font-size:16px; line-height:1.6; margin:0;">
                    Hemos recibido tu solicitud de <b style="color:#00B4D8;">demo personalizada</b> 🎉<br/>
                    Nuestro equipo se pondrá en contacto contigo muy pronto.
                  </p>
                </td>
              </tr>

              <!-- Botón con link único -->
              <tr>
                <td align="center" style="padding:20px 0;">
                  <a href="${demoLink}" target="_blank" 
                    style="background:#00B4D8; color:#ffffff; padding:14px 24px; text-decoration:none; border-radius:6px; font-size:16px; font-weight:bold; display:inline-block;">
                    Accede a tu Demo
                  </a>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="padding-top:20px;">
                  <p style="color:#9ca3af; font-size:14px; margin:0;">
                    Si tienes alguna duda, responde directamente a este correo.<br/>
                    Gracias por confiar en <b style="color:#00B4D8;">Botz</b>.
                  </p>
                  <p style="color:#6b7280; font-size:12px; margin-top:20px;">
                    © ${new Date().getFullYear()} Botz. Todos los derechos reservados.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
      `,
    });

    return NextResponse.json({ success: true, message: "Correos enviados 🚀" });
  } catch (error: any) {
    console.error("❌ Error enviando correo:", error);
    return NextResponse.json(
      { success: false, error: error.message || JSON.stringify(error) },
      { status: 500 }
    );
  }
}
