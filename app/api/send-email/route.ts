// Fuerza a que se ejecute en Node.js, no en Edge 
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    // Crear cliente de Supabase dentro del handler
    const supabaseUrl =
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error(
        "Supabase env vars missing in /api/send-email (SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)"
      );
      return NextResponse.json(
        { success: false, error: "Supabase configuration is missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { nombre, empresa, telefono, interes, email, user_id } = await req.json();

    if (!nombre || !empresa || !telefono || !interes || !email) {
      return NextResponse.json(
        { success: false, error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    // Si no viene user_id desde el frontend, generamos uno nuevo
    const leadId = user_id || randomUUID();

    // 1️⃣ Configurar el transporter de Nodemailer con Zoho
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_USER,
        pass: process.env.ZOHO_PASS,
      },
    });

    // 1️⃣ Correo para el equipo de Botz (notificación interna)
    await transporter.sendMail({
      from: `"Notificaciones Botz" <${process.env.ZOHO_USER}>`,
      to: "juanfalla1@gmail.com",
      subject: `🚀 Nuevo lead demo HotLead: ${nombre} - ${empresa}`,
      html: `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1120;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#020617;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">
              <tr>
                <td style="padding:24px 32px 16px 32px;background:linear-gradient(135deg,#0ea5e9,#22c55e);">
                  <h1 style="margin:0;color:#0b1120;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:24px;">
                    🚀 Nuevo lead para demo de HotLead
                  </h1>
                  <p style="margin:4px 0 0 0;color:#0b1120;font-size:14px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    Alguien acaba de solicitar la demo desde la web botz.fyi
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:24px 32px;color:#e5e7eb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;">
                  <h2 style="margin-top:0;font-size:18px;color:#f9fafb;">📌 Datos del lead</h2>
                  <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
                    <tr>
                      <td style="padding:8px 0;width:120px;color:#9ca3af;">Nombre:</td>
                      <td style="padding:8px 0;color:#e5e7eb;font-weight:500;">${nombre}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;color:#9ca3af;">Empresa:</td>
                      <td style="padding:8px 0;color:#e5e7eb;font-weight:500;">${empresa}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;color:#9ca3af;">Teléfono:</td>
                      <td style="padding:8px 0;color:#e5e7eb;font-weight:500;">${telefono}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;color:#9ca3af;">Email:</td>
                      <td style="padding:8px 0;color:#e5e7eb;font-weight:500;">${email}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;color:#9ca3af;">Interés:</td>
                      <td style="padding:8px 0;color:#e5e7eb;font-weight:500;">${interes}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;color:#9ca3af;">Lead ID:</td>
                      <td style="padding:8px 0;color:#e5e7eb;font-weight:500;">${leadId}</td>
                    </tr>
                  </table>

                  <div style="margin-top:24px;padding:16px;border-radius:12px;background:rgba(15,23,42,0.9);border:1px solid #1e293b;">
                    <p style="margin:0 0 8px 0;color:#e5e7eb;font-size:14px;">
                      ✔ Este lead ya quedó guardado en Supabase en la tabla <b>"Demo Tracker Botz"</b>.
                    </p>
                    <p style="margin:0;color:#9ca3af;font-size:12px;">
                      Puedes ver el detalle en el dashboard de HotLead y en el n8n de la campaña.
                    </p>
                  </div>

                  <p style="margin-top:24px;color:#6b7280;font-size:12px;">
                    Recuerda actualizar el estado del lead después de la llamada o demo agendada.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:16px 32px;border-top:1px solid #1e293b;background:#020617;color:#6b7280;font-size:12px;text-align:center;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  Botz · Automatización y Flujos Cognitivos · www.botz.fyi
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      `,
    });

    // 🔑 Link a la página de demo (frontend) con token único
    const demoLink = `https://www.botz.fyi/demo?lead=${leadId}`;

    // 2️⃣ Correo automático para el cliente
    await transporter.sendMail({
      from: `"Equipo Botz" <${process.env.ZOHO_USER}>`,
      to: email,
      subject: "🚀 Gracias por solicitar la demo de HotLead",
      html: `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#020617;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#020617;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">
              <!-- Header -->
              <tr>
                <td style="padding:24px 32px;background:linear-gradient(135deg,#0ea5e9,#22c55e);">
                  <h1 style="margin:0;color:#0b1120;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:24px;">
                    ¡Hola, ${nombre}! 👋
                  </h1>
                  <p style="margin:4px 0 0 0;color:#0b1120;font-size:14px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    Gracias por confiar en Botz para automatizar tus procesos de captación de leads.
                  </p>
                </td>
              </tr>

              <!-- Contenido principal -->
              <tr>
                <td style="padding:24px 32px;color:#e5e7eb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;">
                  <p style="margin-top:0;">
                    Hemos recibido tu solicitud para la demo de <b>HotLead</b>, nuestra solución para
                    automatizar la captación, clasificación y seguimiento de leads en tiempo real.
                  </p>

                  <div style="margin:16px 0;padding:16px;border-radius:12px;background:rgba(15,23,42,0.9);border:1px solid #1e293b;">
                    <p style="margin:0 0 8px 0;color:#e5e7eb;">
                      En las próximas horas uno de los consultores de Botz se pondrá en contacto contigo para:
                    </p>
                    <ul style="margin:8px 0 0 16px;padding:0;color:#e5e7eb;">
                      <li>Entender mejor el proceso comercial de <b>${empresa}</b>.</li>
                      <li>Mostrarte en vivo cómo HotLead gestiona los leads automáticamente.</li>
                      <li>Definir los siguientes pasos si deseas implementar la solución.</li>
                    </ul>
                  </div>

                  <p style="margin-top:16px;">
                    Mientras tanto, puedes ir revisando un resumen de cómo funciona nuestra demo:
                  </p>

                  <div style="text-align:center;margin:24px 0;">
                    <a href="${demoLink}" 
                      style="display:inline-block;padding:12px 24px;border-radius:999px;background:linear-gradient(135deg,#0ea5e9,#22c55e);color:#0b1120;font-weight:600;text-decoration:none;font-size:14px;">
                      Ver demo de HotLead
                    </a>
                  </div>

                  <p style="margin-top:16px;color:#9ca3af;font-size:13px;">
                    Si este correo no fue solicitado por ti, puedes ignorarlo o responder indicando que quieres
                    que eliminemos tus datos de nuestra base.
                  </p>

                  <p style="margin-top:24px;">
                    Un saludo,<br/>
                    <b>Equipo Botz</b><br/>
                    <span style="color:#9ca3af;">Automatización y flujos cognitivos para tu negocio.</span>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:16px 32px;border-top:1px solid #1e293b;background:#020617;color:#6b7280;font-size:12px;text-align:center;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  Botz · Automatización y Flujos Cognitivos · www.botz.fyi
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      `,
    });

    // 3️⃣ Guardar lead en Supabase
    const { error: dbError } = await supabase.from("Demo Tracker Botz").insert([
      {
        id: leadId,
        nombre,
        empresa,
        telefono,
        email,
        interes,
        created_at: new Date().toISOString(),
        origen: "Formulario Web Botz",
      },
    ]);

    if (dbError) {
      console.error("❌ Error guardando lead en Supabase:", dbError);
      return NextResponse.json(
        { success: false, error: "Error guardando el lead en la base de datos" },
        { status: 500 }
      );
    }

    // 4️⃣ Notificación interna por correo con resumen
    await transporter.sendMail({
      from: `"HotLead Notifier" <${process.env.ZOHO_USER}>`,
      to: "juanfalla1@gmail.com",
      subject: `Nuevo lead registrado en Demo Tracker Botz (${nombre})`,
      html: `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1120;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#020617;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">
              <tr>
                <td style="padding:24px 32px;background:#020617;">
                  <h1 style="margin:0;color:#f9fafb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:20px;">
                    ✅ Lead guardado correctamente en Supabase
                  </h1>
                  <p style="margin:8px 0 0 0;color:#9ca3af;font-size:13px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    Este lead ya está disponible en la tabla <b>"Demo Tracker Botz"</b> para seguimiento.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:16px 32px;color:#e5e7eb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;">
                  <h2 style="margin-top:0;font-size:16px;color:#f9fafb;">📌 Resumen</h2>
                  <ul style="margin:0 0 0 16px;padding:0;">
                    <li><b>Nombre:</b> ${nombre}</li>
                    <li><b>Empresa:</b> ${empresa}</li>
                    <li><b>Email:</b> ${email}</li>
                    <li><b>Teléfono:</b> ${telefono}</li>
                    <li><b>Interés:</b> ${interes}</li>
                    <li><b>Lead ID:</b> ${leadId}</li>
                  </ul>

                  <p style="margin-top:16px;color:#9ca3af;font-size:13px;">
                    Recuerda actualizar el estado del lead después de la llamada, reunión o demo.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:16px 32px;border-top:1px solid #1e293b;background:#020617;color:#6b7280;font-size:12px;text-align:center;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  Botz · Demo Tracker · Integración Supabase + n8n + WhatsApp
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Correos enviados, lead guardado y notificación enviada 🚀",
    });
  } catch (error: any) {
    console.error("❌ Error en el endpoint:", error);
    return NextResponse.json(
      { success: false, error: error.message || JSON.stringify(error) },
      { status: 500 }
    );
  }
}
