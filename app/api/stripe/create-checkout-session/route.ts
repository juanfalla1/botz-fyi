// ============================================================================
// Create Checkout Session (App Router) - FIX metadata tenantId + tenant_id + planName
// Archivo objetivo: app/api/stripe/create-checkout-session/route.ts
// ============================================================================

import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-11-20.acacia",
});

function baseUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}

function normalizePlanKey(plan: unknown): "basic" | "growth" {
  const s = String(plan ?? "").trim().toLowerCase();
  if (["basic", "basico", "básico"].includes(s)) return "basic";
  return "growth";
}

function planDisplay(planKey: "basic" | "growth") {
  return planKey === "basic" ? "Basico" : "Growth";
}

function normalizePriceId(id?: string) {
  const s = String(id || "").trim();
  // Evita errores tipo "price_price_xxx"
  return s.replace(/^price_price_/, "price_");
}

function pickPriceId(planKey: "basic" | "growth", billing: "month" | "year") {
  const monthly: Record<string, string | undefined> = {
    basic: process.env.STRIPE_PRICE_BASIC_MONTHLY,
    growth: process.env.STRIPE_PRICE_GROWTH_MONTHLY,
  };

  const yearly: Record<string, string | undefined> = {
    basic: process.env.STRIPE_PRICE_BASIC_YEARLY,
    growth: process.env.STRIPE_PRICE_GROWTH_YEARLY,
  };

  return billing === "year" ? yearly[planKey] : monthly[planKey];
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const planKey = normalizePlanKey(body.planKey ?? body.plan ?? body.planName);
    const billing: "month" | "year" = body.billing === "year" ? "year" : "month";

    const userId = String(body.userId || "");
    const tenantId = String(body.tenantId || body.tenant_id || "");

    if (!userId) {
      return NextResponse.json({ ok: false, error: "NO_USER_ID" }, { status: 400 });
    }
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "NO_TENANT_ID" }, { status: 400 });
    }

    let priceId = pickPriceId(planKey, billing);
    if (!priceId) {
      return NextResponse.json(
        { ok: false, error: "NO_PRICE_ID", details: { planKey, billing } },
        { status: 400 }
      );
    }
    priceId = normalizePriceId(priceId);

    const planName = planDisplay(planKey);

    // ✅ metadata doble (camel + snake) para que el webhook SIEMPRE lo lea
    const metadata: Record<string, string> = {
      userId,
      tenantId,
      tenant_id: tenantId,
      plan: planKey,        // clave estable: basic/growth
      planName,             // display: Basico/Growth (como tu UI)
      billing,
      priceId,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: body.email ? String(body.email) : undefined,
      client_reference_id: userId,

      line_items: [{ price: priceId, quantity: 1 }],

      success_url: `${baseUrl()}/start?paid=1`,
      cancel_url: `${baseUrl()}/pricing?canceled=1`,

      // ✅ CRÍTICO: tu captura muestra que esto llega a checkout.session.completed
      metadata,

      // ✅ y también en la suscripción por consistencia
      subscription_data: {
        metadata,
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ERROR_CREATE_SESSION" },
      { status: 500 }
    );
  }
}
