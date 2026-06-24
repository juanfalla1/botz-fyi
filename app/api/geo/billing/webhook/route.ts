import { NextResponse } from "next/server"
import Stripe from "stripe"
import { getGeoServiceSupabase } from "@/lib/geo/api-auth"
import { limitsForGeoPlan, normalizeGeoPlan } from "@/lib/geo/plans"

export const maxDuration = 60

function getStripe() {
  const key = String(process.env.GEO_STRIPE_SECRET_KEY || "").trim()
  if (!key) throw new Error("GEO_STRIPE_SECRET_KEY is missing")
  return new Stripe(key)
}

function mapStripeStatus(status: string) {
  if (status === "active" || status === "trialing") return "active"
  if (status === "past_due" || status === "unpaid" || status === "incomplete") return "past_due"
  if (status === "canceled") return "canceled"
  return "inactive"
}

function periodDate(value: unknown) {
  const seconds = typeof value === "number" ? value : Number(value)
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : new Date().toISOString()
}

async function syncGeoSubscription(input: {
  stripe: Stripe
  stripeSubscriptionId: string
  userId?: string | null
  plan?: string | null
  stripeCustomerId?: string | null
  stripePriceId?: string | null
}) {
  const supabase = getGeoServiceSupabase()
  if (!supabase) throw new Error("GEO service Supabase unavailable")

  const stripeSubscription = await input.stripe.subscriptions.retrieve(input.stripeSubscriptionId)
  const metadata = stripeSubscription.metadata ?? {}
  const userId = input.userId || metadata.user_id || metadata.userId
  const plan = normalizeGeoPlan(input.plan || metadata.plan) ?? "trial"
  if (!userId) throw new Error("Missing GEO user_id in Stripe metadata")

  const priceId = input.stripePriceId || stripeSubscription.items.data[0]?.price?.id || null
  const limits = limitsForGeoPlan(plan)
  const periodStart = periodDate((stripeSubscription as any).current_period_start)
  const periodEnd = periodDate((stripeSubscription as any).current_period_end)

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, current_period_start")
    .eq("user_id", userId)
    .maybeSingle()

  const shouldResetUsage = !existing?.current_period_start || new Date(String(existing.current_period_start)).getTime() !== new Date(periodStart).getTime()

  const payload: Record<string, unknown> = {
    user_id: userId,
    plan,
    status: mapStripeStatus(stripeSubscription.status),
    projects_limit: limits.projects_limit,
    audits_limit: limits.audits_limit,
    prompts_limit: limits.prompts_limit,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    stripe_customer_id: input.stripeCustomerId || String(stripeSubscription.customer || "") || null,
    stripe_subscription_id: stripeSubscription.id,
    stripe_price_id: priceId,
    metadata: {
      product: "geo",
      stripe_status: stripeSubscription.status,
      synced_at: new Date().toISOString(),
    },
  }
  if (shouldResetUsage) {
    payload.audits_used = 0
    payload.prompts_used = 0
  }

  const { error } = await supabase.from("subscriptions").upsert(payload, { onConflict: "user_id" })
  if (error) throw error
}

export async function POST(req: Request) {
  const stripe = getStripe()
  const signature = req.headers.get("stripe-signature")
  const secret = String(process.env.GEO_STRIPE_WEBHOOK_SECRET || "").trim()
  if (!signature || !secret) return NextResponse.json({ error: "Missing GEO Stripe webhook configuration" }, { status: 400 })

  let event: Stripe.Event
  try {
    const rawBody = await req.text()
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid Stripe signature" }, { status: 400 })
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.metadata?.product !== "geo") return NextResponse.json({ received: true })
      const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id
      if (stripeSubscriptionId) {
        await syncGeoSubscription({
          stripe,
          stripeSubscriptionId,
          userId: session.metadata.user_id,
          plan: session.metadata.plan,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripePriceId: session.metadata.price_id,
        })
      }
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription
      if (subscription.metadata?.product === "geo") {
        await syncGeoSubscription({ stripe, stripeSubscriptionId: subscription.id, userId: subscription.metadata.user_id, plan: subscription.metadata.plan })
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice
      const stripeSubscriptionId = typeof (invoice as any).subscription === "string" ? (invoice as any).subscription : (invoice as any).subscription?.id
      if (stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
        if (subscription.metadata?.product === "geo") await syncGeoSubscription({ stripe, stripeSubscriptionId })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "GEO webhook failed" }, { status: 500 })
  }
}
