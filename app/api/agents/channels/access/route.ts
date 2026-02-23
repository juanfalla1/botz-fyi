import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdvancedAllowed(email: string) {
  const e = String(email || "").toLowerCase().trim();
  if (!e) return false;
  if (e.endsWith("@botz.fyi")) return true;

  const allow = String(process.env.AGENTS_ADVANCED_ALLOWLIST || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(e);
}

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const email = String(guard.user?.email || "");
  return NextResponse.json({ ok: true, data: { advanced_channels: isAdvancedAllowed(email) } });
}
