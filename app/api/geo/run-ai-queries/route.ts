import { NextResponse } from "next/server";
import { getGeoApiClient } from "@/lib/geo/api-auth";

export async function POST(req: Request) {
  try {
    await getGeoApiClient(req)
    return NextResponse.json(
      { error: "Legacy endpoint disabled. Use /api/geo/prompts/run or /api/geo/audits instead." },
      { status: 410 }
    )
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
