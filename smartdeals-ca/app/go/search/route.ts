import { NextRequest, NextResponse } from "next/server";
import { getTrackingId } from "@/lib/smartdeals";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") || "amazon.ca deals";
  const query = rawQuery.replace(/[^a-zA-Z0-9\s+.'-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "amazon.ca deals";
  const destination = `https://www.amazon.ca/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(getTrackingId())}`;

  return NextResponse.redirect(destination, 302);
}
