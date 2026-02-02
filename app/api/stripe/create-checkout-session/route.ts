import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

// ✅ stripe@20.3.0: no uses apiVersion en el constructor
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ✅ usa keys simples para plan (evita "Básico" con tilde)
const PRICE_BY_PLAN: Record<string, string> = {
  basic: process.env.STRIPE_PRICE_BASIC_MONTHLY!,   // price_xxx
  growth: process.env.STRIPE_PRICE_GROWTH_MONTHLY!, // price_xxx
};

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const body = await req.json();

    const planKey = String(body.planKey || "").trim(); // basic | growth
    const userId = String(body.userId || "").trim();

    if (!planKey || !PRICE_BY_PLAN[planKey]) {
      return NextResponse.json(
        { error: "PLAN_INVALIDO_O_SIN_PRICE_ID", planKey, allowed: Object.keys(PRICE_BY_PLAN) },
        { status: 400 }
      );
    }
    if (!userId) {
      return NextResponse.json({ error: "NO_USER_ID" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: PRICE_BY_PLAN[planKey], quantity: 1 }],
      success_url: `${origin}/start?stripe=success`,
      cancel_url: `${origin}/pricing?stripe=cancel`,

      // ✅ CLAVE para amarrar pago ↔ usuario (esto te estaba llegando null)
      client_reference_id: userId,

      // ✅ Útil para backups y debugging
      metadata: { user_id: userId, plan: planKey },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
