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
  inviteToken: string,
  role: string,
  accessLevel: string
): Promise<boolean> {
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/accept-invite/${inviteToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #0c1929 0%, #0f2444 50%, #001a33 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: #00d4ff; margin: 0; font-size: 24px; }
          .header p { color: #b0d4ff; margin: 8px 0 0 0; font-size: 14px; }
          .content { padding: 40px 20px; }
          .content h2 { color: #0c1929; margin-top: 0; }
          .content p { color: #666; line-height: 1.6; }
          .details { background: rgba(0, 150, 255, 0.05); border-left: 4px solid #0096ff; padding: 16px; margin: 20px 0; border-radius: 4px; }
          .details p { margin: 8px 0; color: #333; font-size: 14px; }
          .details strong { color: #0c1929; }
          .button { display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #0096ff 0%, #0077cc 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .button:hover { opacity: 0.9; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }
          .footer a { color: #0096ff; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Invitación a Botz Platform</h1>
            <p>Control de Acceso - Administración</p>
          </div>
          
          <div class="content">
            <h2>¡Hola!</h2>
            <p>Has sido invitado a acceder a la plataforma Botz como <strong>${role}</strong>.</p>
            
            <div class="details">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Rol:</strong> ${role}</p>
              <p><strong>Nivel de Acceso:</strong> ${accessLevel}</p>
              <p><strong>Válido por:</strong> 7 días</p>
            </div>

            <p>Haz clic en el botón de abajo para aceptar la invitación y crear tu contraseña:</p>
            
            <div style="text-align: center;">
              <a href="${inviteLink}" class="button">Aceptar Invitación</a>
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
              <code style="background: #f5f5f5; padding: 8px 12px; border-radius: 4px; word-break: break-all;">${inviteLink}</code>
            </p>

            <p style="color: #999; font-size: 12px;">
              Este enlace expirará en 7 días. Si no aceptas la invitación en ese tiempo, deberás solicitar una nueva.
            </p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Botz · Automatización Inteligente + Hipotecario</p>
            <p><a href="https://botz.fyi">Visita nuestra web</a></p>
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
