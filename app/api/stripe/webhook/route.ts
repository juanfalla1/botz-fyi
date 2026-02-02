import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

// Supabase service role (para saltar RLS y poder hacer upsert)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !whsec) {
    return NextResponse.json({ error: "Missing signature/secret" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whsec);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature error: ${err.message}` }, { status: 400 });
  }

  try {
    // 1) Checkout finalizado
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const user_id =
        (session.client_reference_id as string) ||
        (session.metadata?.user_id as string) ||
        null;

      const plan =
        (session.metadata?.plan as string) ||
        (session.metadata?.plan_name as string) ||
        "Básico";

      if (!user_id) {
        return NextResponse.json({ ok: true, warning: "NO_USER_ID_IN_SESSION" });
      }

      // Esto es lo que tu AuthProvider espera:
      // status: "active" | "trialing"
      await supabaseAdmin.from("subscriptions").upsert(
        {
          user_id,
          plan,
          status: "active",
          billing_cycle: "monthly",
          price: String(session.amount_total ?? ""),
        },
        { onConflict: "user_id" }
      );
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
