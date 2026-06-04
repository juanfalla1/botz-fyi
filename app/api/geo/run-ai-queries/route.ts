import { NextResponse } from "next/server";
import { runAiQueries } from "@geo/geo/ai-query-runner";

export async function POST(req: Request) {
  const body = await req.json();
  const data = await runAiQueries(body.prompts ?? [], body.engines ?? ["openai", "gemini", "perplexity"]);
  return NextResponse.json({ data, mode: "demo_or_live" });
}
