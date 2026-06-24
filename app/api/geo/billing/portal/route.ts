import { NextResponse } from "next/server"
import Stripe from "stripe"
import { getGeoApiClient } from "@/lib/geo/api-auth"

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
    const { supabase, user } = await getGeoApiClient(req)
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle()
    if (error) throw error
    if (!subscription?.stripe_customer_id) return NextResponse.json({ error: "No Stripe customer for GEO subscription" }, { status: 400 })

    const session = await getStripe().billingPortal.sessions.create({
      customer: String(subscription.stripe_customer_id),
      return_url: `${baseUrl()}/geo/app/billing`,
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create GEO billing portal" }, { status: 500 })
  }
}
