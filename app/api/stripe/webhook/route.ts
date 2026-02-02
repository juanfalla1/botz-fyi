import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ Stripe client (evita crashear build si falta env)
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key); // ✅ sin apiVersion (se acaba el error TS)
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function planFromPriceId(priceId?: string | null) {
  if (!priceId) return null;
  const map: Record<string, string> = {
    "price_1SvQCC2a7HFRxbhS1TZEjL2C": "basic",
  };
  return map[priceId] ?? null;
}

// ✅ GET solo para que no veas 404 en navegador
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/stripe/webhook" });
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();

    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
    }

    const rawBody = Buffer.from(await req.arrayBuffer());

    const whsec = process.env.STRIPE_WEBHOOK_SECRET;
    if (!whsec) {
      return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
    }

    const event = stripe.webhooks.constructEvent(rawBody, sig, whsec);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.client_reference_id || session.metadata?.user_id || null;
      if (!userId) return NextResponse.json({ received: true, warning: "NO_USER_ID" });

      const subId = typeof session.subscription === "string" ? session.subscription : null;
      if (!subId) return NextResponse.json({ received: true, warning: "NO_SUBSCRIPTION" });

      const sub = await stripe.subscriptions.retrieve(subId, {
        expand: ["items.data.price"],
      });

      const item = sub.items.data[0];
      const priceId = (item?.price?.id as string) ?? null;
      const amount = item?.price?.unit_amount != null ? String(item.price.unit_amount) : null;

      const plan = planFromPriceId(priceId) || session.metadata?.plan || "unknown";
      const billing_cycle = item?.price?.recurring?.interval ?? "month";

      // ⚠️ stripe@20 a veces tipa raro current_period_end, así que lo forzamos seguro:
      const current_period_end =
        (sub as any).current_period_end != null ? Number((sub as any).current_period_end) : null;

      const { error } = await supabaseAdmin
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            plan,
            price: priceId,
            billing_cycle,
            status: sub.status,
            // si tu tabla tiene tenant_id, agrégalo aquí (más abajo te digo)
            // tenant_id: ...
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
