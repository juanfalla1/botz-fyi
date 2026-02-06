import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

function baseUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}

function pickMeta(obj: any) {
  const md = (obj && typeof obj === "object" ? obj : {}) as Record<string, any>;
  return {
    userId: md.userId || md.user_id || "",
    tenantId: md.tenantId || md.tenant_id || "",
    plan: md.plan || "",
    planName: md.planName || md.plan_name || "",
    billing: md.billing || md.billing_cycle || "",
    priceId: md.priceId || "",
  };
}

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
    console.error("❌ Error verificando firma:", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      console.log("💳 Procesando checkout.session.completed");
      
      const session = event.data.object as Stripe.Checkout.Session;

      const customerId = typeof session.customer === "string" ? session.customer : null;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;

      const sMeta = pickMeta(session.metadata);
      console.log("📦 Metadata:", sMeta);

      let subMeta = { userId: "", tenantId: "", plan: "", planName: "", billing: "", priceId: "" };
      if (subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          subMeta = pickMeta(sub.metadata);
        } catch (e) {
          console.log("⚠️ No se pudo recuperar metadata de suscripción");
        }
      }

      const userId = sMeta.userId || session.client_reference_id || subMeta.userId || "";
      const tenantId = sMeta.tenantId || subMeta.tenantId || "";
      
      // ✅ USAR PLANNAME ORIGINAL
      const planOriginal = sMeta.planName || subMeta.planName || sMeta.plan || subMeta.plan || "Básico";
      console.log("📋 Plan original:", planOriginal);
      
      const billing_cycle = (sMeta.billing || subMeta.billing || "month").toLowerCase();
      const price = sMeta.priceId || subMeta.priceId || String(session.amount_total ?? "");

      if (!userId) {
        console.log("❌ NO_USER_ID");
        return NextResponse.json({ received: true });
      }

      if (!tenantId) {
        console.log("❌ NO_TENANT_ID - user:", userId);
        return NextResponse.json({ error: "NO_TENANT_ID" }, { status: 400 });
      }

      const payload = {
        user_id: userId,
        tenant_id: tenantId,
        plan: planOriginal, // ✅ PLAN ORIGINAL "Básico"
        price,
        billing_cycle,
        status: "active",
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      };

      console.log("💾 Guardando:", payload);

      let upsertError: any = null;
      const r1 = await supabase.from("subscriptions").upsert(payload as any, {
        onConflict: "user_id,tenant_id",
      });

      upsertError = r1.error;

      if (upsertError && String(upsertError.message || "").includes("no unique")) {
        const r2 = await supabase.from("subscriptions").upsert(payload as any, {
          onConflict: "user_id",
        });
        upsertError = r2.error;
      }

      if (upsertError) {
        console.log("❌ Supabase error:", upsertError);
      } else {
        console.log("✅ Subscription saved");
      }

      // Enviar email
      const to = session.customer_details?.email || session.customer_email || undefined;
      const userName = session.customer_details?.name || undefined;

      if (to) {
        try {
          const res = await fetch(`${baseUrl()}/api/send-welcome-email-pricing`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ to, userName, plan: planOriginal }),
          });

          if (res.ok) {
            console.log("✅ Email sent to:", to);
          } else {
            console.log("❌ Email failed:", res.status);
          }
        } catch (e: any) {
          console.log("❌ Email exception:", e?.message);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("❌ ERROR:", e?.message);
    return NextResponse.json(
      { error: e?.message || "WEBHOOK_ERROR" },
      { status: 500 }
    );
  }
}