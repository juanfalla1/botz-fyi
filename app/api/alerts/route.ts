import { NextResponse } from "next/server";
import { readDb } from "@/app/lib/intelligence/store";

export async function GET() {
  const db = await readDb();
  return NextResponse.json({ rules: Object.values(db.alertRules) });
}
