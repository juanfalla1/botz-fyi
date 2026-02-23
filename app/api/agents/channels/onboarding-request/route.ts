import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const channelType = String(body?.channel_type || "").toLowerCase();
  const provider = String(body?.provider || "").toLowerCase();

  const legalName = String(body?.legal_name || "").trim();
  const taxId = String(body?.tax_id || "").trim();
  const hasMetaBusiness = body?.has_meta_business;
  const numberLinked = body?.number_linked;
  const contactName = String(body?.contact_name || guard.user.email || "").trim();
  const contactEmail = String(body?.contact_email || guard.user.email || "").trim();
  const details = body?.details && typeof body.details === "object" ? body.details : {};

  const isMetaWhatsapp = (channelType || "whatsapp") === "whatsapp" && (provider || "meta") === "meta";

  if (!contactEmail) {
    return NextResponse.json({ ok: false, error: "Falta email de contacto" }, { status: 400 });
  }

  if (isMetaWhatsapp && (!legalName || !taxId || typeof hasMetaBusiness !== "boolean" || typeof numberLinked !== "boolean")) {
    return NextResponse.json({ ok: false, error: "Faltan datos requeridos para onboarding de WhatsApp Meta" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const payload = {
    legal_name: legalName,
    tax_id: taxId,
    has_meta_business: hasMetaBusiness,
    number_linked: numberLinked,
    contact_name: contactName,
    contact_email: contactEmail,
    details,
  };

  const { data: inserted, error } = await supabase
    .from("agent_channel_onboarding_requests")
    .insert({
      tenant_id: SYSTEM_TENANT_ID,
      created_by: guard.user.id,
      channel_type: channelType || "whatsapp",
      provider: provider || "meta",
      payload,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const zohoUser = process.env.ZOHO_USER;
  const zohoPass = process.env.ZOHO_PASS || process.env.ZOHO_APP_PASSWORD;
  const host = process.env.ZOHO_HOST || "smtp.zoho.com";
  const port = Number(process.env.ZOHO_PORT || 465);
  const mailFrom = process.env.MAIL_FROM || zohoUser;
  const meetingUrl = process.env.ONBOARDING_URL_PRICING || "https://botz.zohobookings.ca/#/botz";

  if (zohoUser && zohoPass && mailFrom) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: true,
      auth: { user: zohoUser, pass: zohoPass },
    });

    await transporter.sendMail({
      from: `Botz <${mailFrom}>`,
      to: "botz.info@botz.fyi",
      subject: `📲 Nueva solicitud onboarding ${channelType || "whatsapp"}/${provider || "meta"} (${legalName || contactName || "cliente"})`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>Nueva solicitud de onboarding de canal</h2>
          <p><strong>Request ID:</strong> ${inserted?.id}</p>
          <p><strong>Canal:</strong> ${channelType || "whatsapp"}</p>
          <p><strong>Proveedor:</strong> ${provider || "meta"}</p>
          ${legalName ? `<p><strong>Empresa:</strong> ${legalName}</p>` : ""}
          ${taxId ? `<p><strong>NIT:</strong> ${taxId}</p>` : ""}
          ${typeof hasMetaBusiness === "boolean" ? `<p><strong>Tiene Meta Business:</strong> ${hasMetaBusiness ? "Si" : "No"}</p>` : ""}
          ${typeof numberLinked === "boolean" ? `<p><strong>Numero vinculado previamente:</strong> ${numberLinked ? "Si" : "No"}</p>` : ""}
          <p><strong>Contacto:</strong> ${contactName} (${contactEmail})</p>
          ${Object.keys(details || {}).length ? `<p><strong>Detalles:</strong></p><pre style="background:#f3f4f6;padding:10px;border-radius:8px;">${JSON.stringify(details, null, 2)}</pre>` : ""}
          <p><a href="${meetingUrl}">Programar reunion</a></p>
        </div>
      `,
    });
  }

  return NextResponse.json({ ok: true, request_id: inserted?.id || null, meeting_url: meetingUrl });
}
