import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Missing STRIPE_SECRET_KEY");
  const Stripe = (await import("stripe")).default;
  return new Stripe(secret);
}

const PRICE_BY_PLAN: Record<string, string | undefined> = {
  Basico: process.env.STRIPE_PRICE_BASIC_MONTHLY,
  Growth: process.env.STRIPE_PRICE_GROWTH_MONTHLY,
};

export async function POST(req: Request) {
  try {
    const stripe = await getStripe();

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const body = await req.json();

    const planName = String(body.planName || "");
    const userId = String(body.userId || "");
    const tenantId = body.tenantId ? String(body.tenantId) : "";

    const priceId = PRICE_BY_PLAN[planName];
    if (!planName || !priceId) return NextResponse.json({ error: "PLAN_INVALIDO_O_SIN_PRICE_ID" }, { status: 400 });
    if (!userId) return NextResponse.json({ error: "NO_USER_ID" }, { status: 400 });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/start?stripe=success`,
      cancel_url: `${origin}/pricing?stripe=cancel`,
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        plan: planName,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
