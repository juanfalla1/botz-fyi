import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit } from "../_utils/rateLimit";
import { sendEmail } from "../_utils/mailer";

const industryLabels: Record<string, string> = {
  finanzas: "Finanzas, hipotecas y seguros",
  "servicios-b2b": "Servicios profesionales y B2B",
  restaurantes: "Restaurantes y hospitalidad",
  salud: "Salud y bienestar",
  ecommerce: "E-commerce y atención al cliente",
  "inmobiliaria-construccion": "Inmobiliaria y construcción",
};

function clean(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .replace(/[\r\n]/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isSafeContext(value: unknown): boolean {
  const str = String(value ?? "");
  return /^[a-z0-9_-]+$/i.test(str) && str.length <= 80;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit({
    key: `industries-contact:${ip}`,
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));

  const nombre = clean(body.nombre, 120);
  const email = clean(body.email, 200);
  const empresa = clean(body.empresa, 160);
  const telefono = clean(body.telefono, 60);
  const mensaje = clean(body.mensaje, 2000);

  const industry = isSafeContext(body.industry) ? String(body.industry) : "";
  const use_case = isSafeContext(body.use_case) ? String(body.use_case) : "";
  const source_page = String(body.source_page ?? "").slice(0, 240);
  const source_cta = String(body.source_cta ?? "").slice(0, 120);

  // Validación mínima
  if (nombre.length < 2) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT", field: "nombre" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT", field: "email" }, { status: 400 });
  }
  if (empresa.length < 2) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT", field: "empresa" }, { status: 400 });
  }
  if (telefono.length < 5) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT", field: "telefono" }, { status: 400 });
  }
  if (mensaje.length < 5) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT", field: "mensaje" }, { status: 400 });
  }

  const mailTo = process.env.MAIL_TO || process.env.MAIL_USER || process.env.ZOHO_USER;

  if (!process.env.ZOHO_HOST || !process.env.ZOHO_USER || !process.env.ZOHO_APP_PASSWORD || !mailTo) {
    console.error("Missing email configuration for industries-contact", {
      hasZohoHost: Boolean(process.env.ZOHO_HOST),
      hasZohoUser: Boolean(process.env.ZOHO_USER),
      hasZohoPassword: Boolean(process.env.ZOHO_APP_PASSWORD),
      hasMailTo: Boolean(mailTo),
    });
    return NextResponse.json({ ok: false, error: "EMAIL_NOT_CONFIGURED" }, { status: 500 });
  }

  const industryLabel = industryLabels[industry] || industry || "Industrias";

  const subject = `Nuevo contacto Industries — ${industryLabel} — ${empresa}`;

  const html = `
    <h2>Nuevo contacto Industries</h2>
    <p><strong>Nombre:</strong> ${nombre}</p>
    <p><strong>Correo:</strong> ${email}</p>
    <p><strong>Empresa:</strong> ${empresa}</p>
    <p><strong>WhatsApp/Teléfono:</strong> ${telefono}</p>
    <p><strong>Industria:</strong> ${industryLabel}</p>
    <p><strong>Caso de uso:</strong> ${use_case || "No informado"}</p>
    <p><strong>Página origen:</strong> ${source_page || "No informado"}</p>
    <p><strong>CTA origen:</strong> ${source_cta || "No informado"}</p>
    <p><strong>Mensaje:</strong> ${mensaje}</p>
  `;

  const sent = await sendEmail({
    to: mailTo,
    subject,
    html,
  });

  if (!sent) {
    return NextResponse.json({ ok: false, error: "EMAIL_SEND_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}