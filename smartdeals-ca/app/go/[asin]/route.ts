import { NextRequest, NextResponse } from "next/server";
import { buildAmazonAffiliateUrl } from "@/lib/smartdeals";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ asin: string }> | { asin: string } }) {
  const params = await context.params;
  const asin = String(params.asin || "");

  if (!/^[A-Z0-9]{10}$/.test(asin)) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const destination = buildAmazonAffiliateUrl(asin);

  return NextResponse.redirect(destination, 302);
}
