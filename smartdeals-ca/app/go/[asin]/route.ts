import { NextRequest, NextResponse } from "next/server";
import { buildAmazonAffiliateUrl, getProductByAsin, getSupabaseAdmin } from "@/lib/smartdeals";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ asin: string }> | { asin: string } }) {
  const params = await context.params;
  const asin = String(params.asin || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);

  if (asin.length !== 10) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const source = request.nextUrl.searchParams.get("source") || "unknown";
  const product = await getProductByAsin(asin);
  const destination = buildAmazonAffiliateUrl(asin);
  const supabase = getSupabaseAdmin();

  if (supabase) {
    await supabase.from("amazon_affiliate_performance_events").insert({
      product_id: product?.id || null,
      event_type: "amazon_click",
      event_value: 1,
      metadata: {
        asin,
        source,
        referrer: request.headers.get("referer") || "",
        user_agent: request.headers.get("user-agent") || "",
      },
    });
  }

  return NextResponse.redirect(destination, 302);
}
