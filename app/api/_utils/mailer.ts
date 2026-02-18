import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.ZOHO_HOST,
  port: parseInt(process.env.ZOHO_PORT || "465"),
  secure: process.env.ZOHO_PORT === "465", // true for 465, false for other ports
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_APP_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.ZOHO_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

export async function sendInviteEmail(
  email: string,
  inviteId: string,
  role: string,
  accessLevel: string
): Promise<boolean> {
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/accept-invite/${inviteId}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #0c1929 0%, #0f2444 50%, #001a33 100%); margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
          .header { background: linear-gradient(135deg, #0c1929 0%, #0f2444 50%, #001a33 100%); padding: 50px 20px 40px; text-align: center; position: relative; }
          .robot-icon { font-size: 60px; margin-bottom: 15px; animation: float 3s ease-in-out infinite; display: inline-block; }
          @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
          .header h1 { color: #00d4ff; margin: 0; font-size: 28px; font-weight: 700; }
          .header p { color: #b0d4ff; margin: 8px 0 0 0; font-size: 14px; }
          .content { padding: 40px; }
          .content h2 { color: #0c1929; margin: 0 0 16px 0; font-size: 20px; font-weight: 600; }
          .greeting { color: #444; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
          .details-box { background: linear-gradient(135deg, rgba(0, 150, 255, 0.05) 0%, rgba(0, 150, 255, 0.02) 100%); border-left: 4px solid #0096ff; padding: 20px; margin: 24px 0; border-radius: 8px; }
          .details-box p { margin: 10px 0; color: #333; font-size: 14px; }
          .details-box strong { color: #0c1929; font-weight: 600; }
          .cta-section { text-align: center; margin: 32px 0; }
          .button { display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #0096ff 0%, #0077cc 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; border: none; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 15px rgba(0, 150, 255, 0.3); }
          .button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 150, 255, 0.4); }
          .security-note { background: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.2); padding: 16px; border-radius: 8px; margin: 24px 0; }
          .security-note p { margin: 0; color: #666; font-size: 13px; line-height: 1.5; }
          .link-fallback { color: #999; font-size: 12px; margin-top: 20px; word-break: break-all; }
          .footer { background: #f5f7fa; padding: 24px 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }
          .footer p { margin: 4px 0; }
          .footer a { color: #0096ff; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="robot-icon">🤖</div>
            <h1>¡Bienvenido a Botz!</h1>
            <p>Tu acceso a la plataforma está listo</p>
          </div>
          
          <div class="content">
            <h2>¡Hola ${email.split('@')[0]}!</h2>
            <p class="greeting">
              Ha sido invitado a acceder a <strong>Botz Platform</strong> como <strong>${role}</strong>. 
              Estamos emocionados de tenerte en el equipo. 🚀
            </p>

            <div class="details-box">
              <p><strong>📧 Email:</strong> ${email}</p>
              <p><strong>👤 Rol:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
              <p><strong>🔓 Nivel de Acceso:</strong> ${accessLevel === "full" ? "Acceso Completo" : accessLevel === "readonly" ? "Solo Lectura" : "Acceso Limitado"}</p>
              <p><strong>⏰ Válido por:</strong> 7 días</p>
            </div>

            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${inviteLink}" style="height:50px;v-text-anchor:middle;width:300px;" arcsize="8%" stroke="f" fillcolor="#0096ff">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:bold;">✨ ACEPTAR INVITACIÓN AQUÍ ✨</center>
            </v:roundrect>
            <![endif]-->
            <div style="text-align: center; margin: 40px 0;">
              <!--[if !mso]><!-->
              <a href="${inviteLink}" style="background-color:#0096ff;color:#ffffff;display:inline-block;padding:15px 40px;text-align:center;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;font-family:Arial,sans-serif;">✨ ACEPTAR INVITACIÓN AQUÍ ✨</a>
              <!--<![endif]-->
            </div>

            <div class="security-note">
              <p>🔒 <strong>Nota de Seguridad:</strong> Este es un enlace personalizado y único para ti. No lo compartas con nadie. Expirará en 7 días por tu seguridad.</p>
            </div>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Botz - Automatización Inteligente + Hipotecario</p>
            <p><a href="https://botz.fyi">Visita nuestro sitio web</a> | <a href="https://botz.fyi">Centro de ayuda</a></p>
            <p style="margin-top: 12px; color: #bbb;">¿Preguntas? Contacta a nuestro equipo de soporte</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Invitación a Botz Platform - ${role}`,
    html,
  });
}
