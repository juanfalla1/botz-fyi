import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string // ✅ SOLO BACKEND
);

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "NO_SIGNATURE" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // ✅ userId puede venir por metadata o por client_reference_id
      const userId =
        session.metadata?.userId || (session.client_reference_id ?? "");

      const plan = session.metadata?.plan || "unknown";
      const billing_cycle = session.metadata?.billing || "month";

      if (!userId) {
        console.log("❌ NO_USER_ID in session:", session.id);
        return NextResponse.json({ received: true });
      }

      const customerId =
        typeof session.customer === "string" ? session.customer : null;

      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : null;

      // Tu tabla tiene price TEXT (dejamos string)
      const price = String(session.amount_total ?? "");

      const { error } = await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          plan,
          price,
          billing_cycle,
          status: "active",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" } // ✅ REQUIERE user_id UNIQUE
      );

      if (error) {
        console.log("❌ Supabase upsert error:", error);
      } else {
        console.log("✅ Subscription saved for user_id:", userId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "WEBHOOK_ERROR" },
      { status: 500 }
    );
  }
}
