// app/api/send-welcome-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend"; // npm install resend

// ✅ Configura tu API key de Resend (https://resend.com)
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { to, userName, plan, calendlyUrl } = await req.json();

    if (!to || !userName || !plan) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: "Botz <hola@tudominio.com>", // ⚠️ Cambiar por tu dominio verificado en Resend
      to: [to],
      subject: `🎉 ¡Bienvenido a Botz, ${userName}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 40px;">
              <div style="display: inline-flex; align-items: center; gap: 8px;">
                <div style="width: 12px; height: 12px; background: #22d3ee; border-radius: 50%;"></div>
                <span style="font-size: 24px; font-weight: bold; color: #fff;">Botz</span>
              </div>
            </div>

            <!-- Main Card -->
            <div style="background: linear-gradient(145deg, #1e293b, #0f172a); border: 1px solid rgba(34, 211, 238, 0.2); border-radius: 24px; padding: 40px; text-align: center;">
              
              <!-- Emoji celebration -->
              <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
              
              <!-- Title -->
              <h1 style="color: #fff; font-size: 28px; font-weight: 800; margin: 0 0 16px 0;">
                ¡Bienvenido a Botz, ${userName}!
              </h1>
              
              <!-- Subtitle -->
              <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Tu suscripción al <strong style="color: #22d3ee;">Plan ${plan}</strong> está activa.
                <br>Estás a un paso de automatizar tu negocio inmobiliario.
              </p>

              <!-- Plan Badge -->
              <div style="display: inline-block; background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.3); padding: 12px 24px; border-radius: 100px; margin-bottom: 30px;">
                <span style="color: #22d3ee; font-weight: 700; font-size: 14px;">✅ Plan ${plan} Activo</span>
              </div>

              <!-- Divider -->
              <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 30px 0;"></div>

              <!-- Next Steps -->
              <h2 style="color: #fff; font-size: 18px; font-weight: 700; margin: 0 0 20px 0;">
                📋 Próximos pasos
              </h2>

              <div style="text-align: left; background: rgba(255,255,255,0.03); border-radius: 16px; padding: 24px; margin-bottom: 30px;">
                <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
                  <span style="background: #22d3ee; color: #000; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; flex-shrink: 0;">1</span>
                  <div>
                    <strong style="color: #fff;">Agenda tu llamada de onboarding</strong>
                    <p style="color: #94a3b8; font-size: 14px; margin: 4px 0 0 0;">Te guiaremos paso a paso en la configuración de tu bot.</p>
                  </div>
                </div>
                <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
                  <span style="background: rgba(34, 211, 238, 0.2); color: #22d3ee; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; flex-shrink: 0;">2</span>
                  <div>
                    <strong style="color: #fff;">Conectamos tu WhatsApp Business</strong>
                    <p style="color: #94a3b8; font-size: 14px; margin: 4px 0 0 0;">Integración en menos de 24 horas.</p>
                  </div>
                </div>
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <span style="background: rgba(34, 211, 238, 0.2); color: #22d3ee; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; flex-shrink: 0;">3</span>
                  <div>
                    <strong style="color: #fff;">¡Empiezas a recibir leads!</strong>
                    <p style="color: #94a3b8; font-size: 14px; margin: 4px 0 0 0;">Tu bot trabajará 24/7 por ti.</p>
                  </div>
                </div>
              </div>

              <!-- CTA Button -->
              <a href="${calendlyUrl}" 
                 style="display: inline-block; background: #22d3ee; color: #000; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 16px; text-decoration: none; box-shadow: 0 4px 14px rgba(34, 211, 238, 0.4);">
                📅 Agendar Llamada de Onboarding
              </a>

              <p style="color: #64748b; font-size: 13px; margin-top: 20px;">
                La llamada dura 30 minutos y es 100% gratuita.
              </p>

            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05);">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 8px 0;">
                ¿Tienes preguntas? Responde a este email o escríbenos por WhatsApp.
              </p>
              <p style="color: #475569; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Botz. Todos los derechos reservados.
              </p>
            </div>

          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error Resend:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("Error en send-welcome-email:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}