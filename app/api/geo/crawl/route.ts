import { NextResponse } from "next/server";
import { runCrawler } from "@geo/geo/crawler";

export async function POST(req: Request) {
  const body = await req.json();
  const data = await runCrawler(body.base_url, body.max_pages ?? 20);
  return NextResponse.json({ data, mode: data.demo ? "demo" : "live" });
}
