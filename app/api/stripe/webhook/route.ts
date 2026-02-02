import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ Stripe client
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ CORREGIDO: Agregar AMBOS precios con nombres correctos
function planFromPriceId(priceId?: string | null) {
  if (!priceId) return null;
  const map: Record<string, string> = {
    "price_1SvQCC2a7HFRxbhS1TZEjL2C": "Basico",  // ✅ Con mayúscula
    "price_1SvQFf2a7HFRxbhSCH1sla5T": "Growth",  // ✅ Agregado
  };
  return map[priceId] ?? null;
}

// ✅ GET para testing
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/stripe/webhook" });
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();

    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      console.error("❌ Missing stripe-signature header");
      return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
    }

    const rawBody = Buffer.from(await req.arrayBuffer());

    const whsec = process.env.STRIPE_WEBHOOK_SECRET;
    if (!whsec) {
      console.error("❌ Missing STRIPE_WEBHOOK_SECRET env var");
      return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
    }

    const event = stripe.webhooks.constructEvent(rawBody, sig, whsec);
    
    console.log("✅ Webhook received:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.client_reference_id || session.metadata?.user_id || null;
      if (!userId) {
        console.error("❌ NO_USER_ID in session:", session.id);
        return NextResponse.json({ received: true, warning: "NO_USER_ID" });
      }

      const subId = typeof session.subscription === "string" ? session.subscription : null;
      if (!subId) {
        console.error("❌ NO_SUBSCRIPTION in session:", session.id);
        return NextResponse.json({ received: true, warning: "NO_SUBSCRIPTION" });
      }

      const sub = await stripe.subscriptions.retrieve(subId, {
        expand: ["items.data.price"],
      });

      const item = sub.items.data[0];
      const priceId = (item?.price?.id as string) ?? null;
      
      console.log("📋 Price ID:", priceId);

      const plan = planFromPriceId(priceId) || session.metadata?.plan || "Basico";
      const billing_cycle = item?.price?.recurring?.interval ?? "month";

      console.log("💾 Saving subscription:", {
        user_id: userId,
        plan,
        price: priceId,
        billing_cycle,
        status: sub.status,
      });

      const { data, error } = await supabaseAdmin
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            plan,
            price: priceId,
            billing_cycle,
            status: sub.status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select();

      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }

      console.log("✅ Subscription saved:", data);

      return NextResponse.json({ received: true, subscription: data });
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("❌ Webhook error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}