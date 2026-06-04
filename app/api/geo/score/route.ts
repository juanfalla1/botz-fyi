import { NextResponse } from "next/server";
import { computeGeoScore } from "@geo/geo/geo-score";

export async function POST() {
  return NextResponse.json({ data: computeGeoScore() });
}
