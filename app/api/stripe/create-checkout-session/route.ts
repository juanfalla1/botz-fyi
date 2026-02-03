import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

function baseUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}

function normalizePlanKey(plan: string) {
  const s = String(plan || "").trim().toLowerCase();
  if (
    s === "basic" ||
    s === "básico" ||
    s === "basico" ||
    s.includes("básico") ||
    s.includes("basico")
  )
    return "basic";
  if (s === "growth" || s.includes("growth")) return "growth";
  return "";
}

function pickPriceId(planKey: string, billing: "month" | "year") {
  const monthly: Record<string, string | undefined> = {
    basic: process.env.STRIPE_PRICE_BASIC_MONTHLY,
    growth: process.env.STRIPE_PRICE_GROWTH_MONTHLY,
  };

  const yearly: Record<string, string | undefined> = {
    basic: process.env.STRIPE_PRICE_BASIC_YEARLY,
    growth: process.env.STRIPE_PRICE_GROWTH_YEARLY,
  };

  const byBilling = billing === "year" ? yearly : monthly;

  // Si pidieron year pero no existe, cae a monthly
  return byBilling[planKey] || monthly[planKey];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const planRaw = body.plan || body.planName;
    const planKey = normalizePlanKey(planRaw);
    const billing: "month" | "year" = body.billing === "year" ? "year" : "month";
    const userId = String(body.userId || "");
    const email = body.email ? String(body.email) : undefined;

    // ✅ sin userId NO creamos checkout (si no, el webhook no puede guardar)
    if (!userId) {
      return NextResponse.json({ ok: false, error: "NO_USER_ID" }, { status: 400 });
    }

    if (!planKey) {
      return NextResponse.json(
        { ok: false, error: "PLAN_INVALIDO_O_SIN_PRICE_ID", plan: planRaw },
        { status: 400 }
      );
    }

    const priceId = pickPriceId(planKey, billing);
    if (!priceId) {
      return NextResponse.json(
        { ok: false, error: "PLAN_INVALIDO_O_SIN_PRICE_ID", plan: planRaw },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,

      // ✅ SIEMPRE tendrás el userId aquí en el webhook:
      client_reference_id: userId,

      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl()}/start?paid=1`,
      cancel_url: `${baseUrl()}/pricing?canceled=1`,

      // ✅ Para suscripciones: metadata aquí es lo más estable
      subscription_data: {
        metadata: {
          userId,
          plan: planKey,
          billing,
        },
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
