import { NextResponse } from "next/server";

const stripHtml = (html: string) => {
  // remove scripts/styles first
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  // remove tags
  s = s.replace(/<[^>]+>/g, " ");
  // collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
};

const pick = (s: string, re: RegExp) => {
  const m = s.match(re);
  if (!m) return "";
  return String(m[1] ?? "").replace(/\s+/g, " ").trim();
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const urlRaw = String(body?.url || "").trim();
    if (!urlRaw) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    let url: URL;
    try {
      url = new URL(urlRaw);
    } catch {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "BotzAgentStudio/1.0 (+https://botz.example)",
        "Accept": "text/html,application/xhtml+xml",
      },
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      return NextResponse.json({ error: `Fetch failed (${res.status})` }, { status: 400 });
    }

    const html = await res.text();
    const title = pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDesc = pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    const h1 = pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const text = stripHtml(html);
    const excerpt = text.slice(0, 1600);

    const parts = [
      title && `Nombre/Marca: ${title}`,
      metaDesc && `Descripcion: ${metaDesc}`,
      h1 && `Titular: ${stripHtml(h1)}`,
      excerpt && `Extracto: ${excerpt}`,
    ].filter(Boolean);

    const suggested_company_desc = parts.join("\n");

    return NextResponse.json({
      url: url.toString(),
      title,
      meta_description: metaDesc,
      h1: stripHtml(h1),
      text_excerpt: excerpt,
      suggested_company_desc,
    });
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "Timeout fetching url" : (e?.message || "Unknown error");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
