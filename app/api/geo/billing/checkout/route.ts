import { NextResponse } from "next/server"
import Stripe from "stripe"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { GEO_PLAN_PRICE_ENV, paidGeoPlan } from "@/lib/geo/plans"

function getStripe() {
  const key = String(process.env.GEO_STRIPE_SECRET_KEY || "").trim()
  if (!key) throw new Error("GEO_STRIPE_SECRET_KEY is missing")
  return new Stripe(key)
}

function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_GEO_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ).replace(/\/$/, "")
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const plan = paidGeoPlan(body.plan)
    if (!plan) return NextResponse.json({ error: "Invalid GEO checkout plan" }, { status: 400 })

    const priceEnv = GEO_PLAN_PRICE_ENV[plan]
    const priceId = String(process.env[priceEnv] || "").trim()
    if (!priceId) return NextResponse.json({ error: `${priceEnv} is missing` }, { status: 400 })

    const { supabase, user } = await getGeoApiClient(req)
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle()

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: subscription?.stripe_customer_id ? String(subscription.stripe_customer_id) : undefined,
      customer_email: subscription?.stripe_customer_id ? undefined : user.email ? String(user.email) : undefined,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl()}/geo/app/billing?checkout=success&plan=${plan}`,
      cancel_url: `${baseUrl()}/geo/app/billing?checkout=cancelled&plan=${plan}`,
      metadata: {
        product: "geo",
        user_id: user.id,
        plan,
        price_id: priceId,
      },
      subscription_data: {
        metadata: {
          product: "geo",
          user_id: user.id,
          plan,
          price_id: priceId,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create GEO checkout" }, { status: 500 })
  }
}
