import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getTrackingId } from "@/lib/smartdeals";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") || "amazon.ca deals";
  const source = request.nextUrl.searchParams.get("source") || "search";
  const query = rawQuery.replace(/[^a-zA-Z0-9\s+.'-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "amazon.ca deals";
  const destination = `https://www.amazon.ca/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(getTrackingId())}`;
  const supabase = getSupabaseAdmin();

  if (supabase) {
    await supabase.from("amazon_affiliate_performance_events").insert({
      product_id: null,
      event_type: "amazon_search_click",
      event_value: 1,
      metadata: {
        query,
        source,
        referrer: request.headers.get("referer") || "",
        user_agent: request.headers.get("user-agent") || "",
      },
    });
  }

  return NextResponse.redirect(destination, 302);
}
