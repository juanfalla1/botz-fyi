import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// Para no romper tu UI (tu tabla venía con "Basico"/"Growth")
function normalizePlanForUI(planKeyOrName: string) {
  const s = String(planKeyOrName || "").trim().toLowerCase();

  if (s.includes("bas") || s.includes("bás")) return "Basico";
  if (s.includes("grow")) return "Growth";

  if (!s) return "unknown";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function POST(req: NextRequest) {
  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature") || "";
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error("❌ Stripe signature error:", err?.message || err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const md = (session.metadata || {}) as Record<string, string>;

      // Stripe en tu evento trae: tenantId, userId, plan, planName, priceId, billing
      const userId = md.userId || session.client_reference_id || "";
      const tenantId = md.tenantId || md.tenant_id || "";
      const planKey = md.plan || md.planKey || "";
      const planName = md.planName || md.plan_name || "";
      const billing = md.billing === "year" ? "year" : "month";
      const priceId = (md.priceId || md.price_id || "").replace(/^price_price_/, "price_");

      const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
      const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;

      if (!userId) {
        console.error("❌ NO_USER_ID en metadata/client_reference_id");
        return NextResponse.json({ received: true });
      }

      const planToSave = normalizePlanForUI(planName || planKey || "unknown");

      // ✅ CLAVE: NO insertes con id=session.subscription (tu id es UUID).
      // Hacemos update/insert por user_id.
      const { data: existing, error: selErr } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (selErr) console.error("❌ Error buscando suscripción:", selErr.message);

      if (existing?.id) {
        const { error: updErr } = await supabaseAdmin
          .from("subscriptions")
          .update({
            tenant_id: tenantId || null,     // ✅ ya no queda NULL
            plan: planToSave,                // ✅ "Basico"/"Growth" para tu UI
            billing_cycle: billing,
            price: priceId || null,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            stripe_price_id: priceId || null,
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updErr) console.error("❌ Error UPDATE subscriptions:", updErr.message);
        else console.log("✅ subscriptions UPDATE OK:", { userId, tenantId, planToSave, billing });
      } else {
        const { error: insErr } = await supabaseAdmin.from("subscriptions").insert({
          user_id: userId,
          tenant_id: tenantId || null,
          plan: planToSave,
          billing_cycle: billing,
          price: priceId || null,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_price_id: priceId || null,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (insErr) console.error("❌ Error INSERT subscriptions:", insErr.message);
        else console.log("✅ subscriptions INSERT OK:", { userId, tenantId, planToSave, billing });
      }

      // ✅ Intento de correo (si tu endpoint existe)
      // No rompe el webhook si falla
      try {
        const origin = req.headers.get("origin") || "";
        if (origin) {
          await fetch(`${origin}/api/send-welcome-email-pricing`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: session.customer_details?.email || session.customer_email,
              userName: session.customer_details?.name || "Cliente",
              plan: planToSave,
              billing,
            }),
          });
        }
      } catch (e) {
        console.warn("⚠️ Email call failed (no bloquea):", e);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("❌ Webhook handler error:", err?.message || err);
    return NextResponse.json({ received: true });
  }
}
