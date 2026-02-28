import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const AGENTS_PRODUCT_KEY = "agents";

const AGENTS_PLAN_CREDITS: Record<string, number> = {
  pro: 10000,
  scale: 100000,
  prime: 500000,
};

function normalizePlanKey(meta: any): string {
  const planKey = String(meta?.plan ?? "").trim().toLowerCase();
  const planName = String(meta?.planName ?? "").trim().toLowerCase();

  if (["pro", "scale", "prime", "basic", "growth"].includes(planKey)) return planKey;
  if (planName.includes("pro")) return "pro";
  if (planName.includes("scale")) return "scale";
  if (planName.includes("prime")) return "prime";
  if (planName.includes("basi")) return "basic";
  return "growth";
}

function normalizePlanForDb(meta: any) {
  const key = normalizePlanKey(meta);
  if (key === "pro") return "Pro";
  if (key === "scale") return "Scale";
  if (key === "prime") return "Prime";
  if (key === "basic") return "Basico";
  return "Growth";
}

function normalizeBilling(meta: any): "month" | "year" {
  const b = String(meta?.billing ?? meta?.billing_cycle ?? "").toLowerCase();
  return b === "year" || b === "annual" ? "year" : "month";
}

async function sendWelcomeEmailPricing(params: { to: string; userName?: string; plan?: string }) {
  try {
    const host = process.env.ZOHO_HOST;
    const port = Number(process.env.ZOHO_PORT || 465);
    const user = process.env.ZOHO_USER;
    const pass = process.env.ZOHO_APP_PASSWORD;
    const from = process.env.MAIL_FROM || (user ? `Botz <${user}>` : undefined);

    const onboardingUrl = process.env.ONBOARDING_URL_PRICING;
    const bccTo = process.env.MAIL_TO || "info@botz.fyi";

    if (!host || !user || !pass || !from) {
      console.error(
        "❌ Faltan variables SMTP:",
        "ZOHO_HOST/ZOHO_PORT/ZOHO_USER/ZOHO_APP_PASSWORD/MAIL_FROM"
      );
      return { ok: false };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const subject = `🎉 ¡Bienvenido a Botz${params.userName ? `, ${params.userName}` : ""}!`;

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;background:#f4f4f4;padding:24px">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:28px;text-align:center">
            <h2 style="color:#fff;margin:0">🎉 ¡Bienvenido a Botz!</h2>
          </div>
          <div style="padding:24px">
            <p style="margin:0 0 12px 0">Hola <b>${params.userName || ""}</b>,</p>
            <p style="margin:0 0 12px 0">
              Tu suscripción al <b>Plan ${params.plan || "Básico"}</b> está activa.
            </p>
            <p style="margin:0 0 16px 0"><b>Siguiente paso:</b> agenda tu sesión virtual para empezar las integraciones.</p>

            ${
              onboardingUrl
                ? `<p style="text-align:center;margin:22px 0">
                    <a href="${onboardingUrl}"
                       style="display:inline-block;padding:12px 18px;background:#111827;color:#fff;text-decoration:none;border-radius:10px">
                      📅 Agendar sesión virtual
                    </a>
                   </p>`
                : `<p style="color:#b91c1c"><b>⚠️ Falta ONBOARDING_URL_PRICING</b> en .env.local</p>`
            }

            <hr style="border:none;border-top:1px solid #eee;margin:18px 0" />
            <p style="font-size:12px;color:#6b7280;margin:0">Si no solicitaste esto, puedes ignorar este mensaje.</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from,
      to: params.to,
      subject,
      html,
      bcc: bccTo || undefined,
    });

    console.log("✅ Email enviado a:", params.to, "| BCC:", bccTo);
    return { ok: true };
  } catch (e: any) {
    console.error("❌ Error enviando email (webhook):", e?.message || e);
    return { ok: false };
  }
}

export async function POST(req: NextRequest) {
  console.log(">>> WEBHOOK RECIBIDO");

  const sig = req.headers.get("stripe-signature");
  console.log(">>> Signature:", sig ? "presente" : "NO presente");

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    console.log(">>> Body recibido, longitud:", rawBody.length);

    event = stripe.webhooks.constructEvent(rawBody, sig as string, webhookSecret);
    console.log(">>> Evento construido:", event.type);
  } catch (err: any) {
    console.error("❌ Error construyendo evento:", err.message);
    return NextResponse.json({ error: err?.message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      console.log(">>> Procesando checkout.session.completed");

      const session = event.data.object as Stripe.Checkout.Session;
      const meta = (session.metadata || {}) as Record<string, string>;

      const tenantId = String(meta.tenantId || meta.tenant_id || "");
      const userId = String(meta.userId || "");

      console.log(">>> tenantId:", tenantId);
      console.log(">>> userId:", userId);

      if (!tenantId || !userId) {
        console.error("❌ NO_TENANT_OR_USER");
        return NextResponse.json({ received: true, warning: "MISSING_META" }, { status: 200 });
      }

      const billing_cycle = normalizeBilling(meta);
      const plan = normalizePlanForDb(meta);
      const rawPlanKey = normalizePlanKey(meta);
      const priceId = String(meta.priceId || "");

      const stripe_customer_id = session.customer
        ? typeof session.customer === "string"
          ? session.customer
          : (session.customer as any).id
        : null;

      const stripe_subscription_id = session.subscription
        ? typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription as any).id
        : null;

      console.log(">>> stripe_customer_id:", stripe_customer_id);
      console.log(">>> stripe_subscription_id:", stripe_subscription_id);

      const payload = {
        user_id: userId,
        tenant_id: tenantId,
        plan,
        billing_cycle,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_price_id: priceId || null,
        status: "active",
        updated_at: new Date().toISOString(),
      } as any;

      // 1) Upsert principal por stripe_subscription_id
      const { error: upsertError } = await supabaseAdmin
        .from("subscriptions")
        .upsert(payload, { onConflict: "stripe_subscription_id" });

      if (upsertError) {
        console.error("❌ Error upsert:", upsertError);

        // 2) Fallback por user_id,tenant_id
        const { error: fallbackErr } = await supabaseAdmin
          .from("subscriptions")
          .upsert(payload, { onConflict: "user_id,tenant_id" });

        if (fallbackErr) {
          console.error("❌ Fallback error:", fallbackErr);
          throw fallbackErr;
        } else {
          console.log("✅ Guardado con fallback");
        }
      } else {
        console.log("✅ Guardado correctamente");
      }

      // Sync Agents entitlement when checkout is for Agents plans.
      if (["pro", "scale", "prime"].includes(rawPlanKey)) {
        const nextCreditsLimit = AGENTS_PLAN_CREDITS[rawPlanKey] || AGENTS_PLAN_CREDITS.pro;

        const { data: entExisting } = await supabaseAdmin
          .from("agent_entitlements")
          .select("credits_used")
          .eq("user_id", userId)
          .eq("product_key", AGENTS_PRODUCT_KEY)
          .maybeSingle();

        const entPayload = {
          user_id: userId,
          product_key: AGENTS_PRODUCT_KEY,
          plan_key: rawPlanKey,
          status: "active",
          credits_limit: nextCreditsLimit,
          credits_used: Number((entExisting as any)?.credits_used || 0) || 0,
          trial_start: null,
          trial_end: null,
        } as any;

        const { error: entUpsertErr } = await supabaseAdmin
          .from("agent_entitlements")
          .upsert(entPayload, { onConflict: "user_id,product_key" });

        if (entUpsertErr) {
          console.error("❌ Error actualizando entitlement de agentes:", entUpsertErr.message);
        } else {
          console.log("✅ Entitlement de agentes actualizado:", { userId, plan_key: rawPlanKey, credits_limit: nextCreditsLimit });
        }
      }

      // ✅ EMAIL DEL CLIENTE (con fallback real)
      let to =
        session.customer_details?.email ||
        session.customer_email ||
        meta.email ||
        "";

      if (!to && stripe_customer_id) {
        try {
          const customer = await stripe.customers.retrieve(stripe_customer_id);
          if ((customer as any)?.email) to = String((customer as any).email);
        } catch (e: any) {
          console.error("⚠️ No pude obtener email desde customer:", e?.message || e);
        }
      }

      const userName =
        session.customer_details?.name ||
        meta.userName ||
        undefined;

      if (to) {
        // ✅ No rompe webhook si falla
        await sendWelcomeEmailPricing({
          to,
          userName,
          plan,
        });
      } else {
        console.error("⚠️ No hay email del cliente en Stripe (customer_details.email / customer_email / customer.email)");
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Error general:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
