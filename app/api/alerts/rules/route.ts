import { NextResponse } from "next/server";
import { newId, readDb, writeDb } from "@/app/lib/intelligence/store";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rule = {
    id: newId(),
    name: String(body.name || "rule"),
    condition: body.condition || {},
    createdAt: new Date().toISOString(),
  };
  const db = await readDb();
  db.alertRules[rule.id] = rule;
  await writeDb(db);
  return NextResponse.json({ ok: true, rule });
}
