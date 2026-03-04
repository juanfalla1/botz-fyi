import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";

type ParsedTable = {
  headers: string[];
  rows: string[][];
};

function stripHtml(raw: string) {
  let s = String(raw || "");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/&nbsp;/gi, " ");
  s = s.replace(/&amp;/gi, "&");
  s = s.replace(/&quot;/gi, '"');
  s = s.replace(/&#39;/gi, "'");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function uniqueStrings(values: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const clean = String(v || "").trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

function toAbsoluteUrl(baseUrl: string, href: string) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return "";
  }
}

function extractProductLinks(html: string, baseUrl: string) {
  const links: string[] = [];
  const re = /href=["']([^"']*\/product\/[^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const full = toAbsoluteUrl(baseUrl, m[1]);
    if (!full) continue;
    links.push(full.split("#")[0]);
  }
  return uniqueStrings(links);
}

function extractMetaContent(html: string, property: string) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const m = html.match(re);
  return String(m?.[1] || "").trim();
}

function extractFirst(html: string, re: RegExp) {
  const m = html.match(re);
  return String(m?.[1] || "").trim();
}

function extractTables(html: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const tableRe = /<table[\s\S]*?<\/table>/gi;
  const rowRe = /<tr[\s\S]*?<\/tr>/gi;
  const cellRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;

  const tableMatches = html.match(tableRe) || [];
  for (const t of tableMatches) {
    const rows: string[][] = [];
    const rowMatches = t.match(rowRe) || [];
    for (const r of rowMatches) {
      const cells: string[] = [];
      let c: RegExpExecArray | null;
      while ((c = cellRe.exec(r)) !== null) {
        cells.push(stripHtml(c[1]));
      }
      if (cells.length) rows.push(cells);
    }
    if (!rows.length) continue;
    const headers = rows[0].map((h) => String(h || "").trim());
    const body = rows.slice(1);
    tables.push({ headers, rows: body });
  }

  return tables;
}

function extractStandards(text: string) {
  const tokens = text.match(/(?:ASTM\s?[A-Z]?\d+|API\s?MPMS|ISO\s?\d+|DIN\s?\d+|IP\s?\d+)/gi) || [];
  return uniqueStrings(tokens);
}

function guessMethods(text: string) {
  const out: string[] = [];
  const lineRe = /([^\n\.]*?(?:ASTM|API|ISO|DIN|IP)[^\n\.]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(text)) !== null) {
    out.push(stripHtml(m[1]));
  }
  return uniqueStrings(out);
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "BotzCatalogBot/1.0 (+https://botz.fyi)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function parseProduct(url: string) {
  const html = await fetchHtml(url);

  const title = stripHtml(
    extractFirst(html, /<h1[^>]*class=["'][^"']*product_title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
      extractFirst(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
      extractFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
  );

  const image =
    extractMetaContent(html, "og:image") ||
    extractFirst(html, /<img[^>]+class=["'][^"']*wp-post-image[^"']*["'][^>]+src=["']([^"']+)["']/i);

  const descHtml =
    extractFirst(html, /<div[^>]*id=["']tab-description["'][^>]*>([\s\S]*?)<\/div>/i) ||
    extractFirst(html, /<div[^>]*class=["'][^"']*woocommerce-product-details__short-description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
    "";

  const fullText = stripHtml(descHtml || html);
  const summary = fullText.slice(0, 700);
  const standards = extractStandards(fullText);
  const methods = guessMethods(fullText);
  const tables = extractTables(descHtml || html);

  const slug = (() => {
    try {
      const u = new URL(url);
      const parts = u.pathname.split("/").filter(Boolean);
      return parts[parts.length - 1] || "";
    } catch {
      return "";
    }
  })();

  return {
    name: title,
    slug,
    product_url: url,
    image_url: image,
    summary,
    description: fullText,
    standards,
    methods,
    specs_text: fullText,
    specs_json: { tables },
    source_payload: { fetched_at: new Date().toISOString() },
    variants: tables.flatMap((t) =>
      t.rows
        .filter((row) => row.some((v) => String(v || "").trim()))
        .map((row) => ({
          sku: String(row[0] || "").trim() || null,
          variant_name: String(row[1] || "").trim() || null,
          range_text: String(row[row.length - 1] || "").trim() || null,
          attributes: Object.fromEntries(
            t.headers.map((h, i) => [String(h || `col_${i + 1}`).trim() || `col_${i + 1}`, String(row[i] || "").trim()])
          ),
          raw_row: { headers: t.headers, row },
        }))
    ),
  };
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const supabase = getAnonSupabaseWithToken(guard.token);
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const categoryUrl = String(body?.categoryUrl || body?.url || "").trim();
    const maxProducts = Math.max(1, Math.min(50, Number(body?.maxProducts || 20)));
    const brand = String(body?.brand || "Koehler").trim();
    const category = String(body?.category || "petroleo_crudo").trim();

    if (!categoryUrl) {
      return NextResponse.json({ ok: false, error: "Missing categoryUrl" }, { status: 400 });
    }

    const categoryHtml = await fetchHtml(categoryUrl);
    const links = extractProductLinks(categoryHtml, categoryUrl).slice(0, maxProducts);
    if (!links.length) {
      return NextResponse.json({ ok: false, error: "No product links found" }, { status: 400 });
    }

    const imported: any[] = [];
    const failed: any[] = [];

    for (const link of links) {
      try {
        const parsed = await parseProduct(link);
        const payload = {
          tenant_id: SYSTEM_TENANT_ID,
          created_by: guard.user.id,
          provider: "avanza",
          brand,
          category,
          name: parsed.name,
          slug: parsed.slug,
          product_url: parsed.product_url,
          image_url: parsed.image_url,
          summary: parsed.summary,
          description: parsed.description,
          standards: parsed.standards,
          methods: parsed.methods,
          specs_text: parsed.specs_text,
          specs_json: parsed.specs_json,
          source_payload: parsed.source_payload,
        };

        const { data: catalogRow, error: upsertError } = await supabase
          .from("agent_product_catalog")
          .upsert(payload, { onConflict: "tenant_id,product_url" })
          .select("id,name,product_url")
          .single();

        if (upsertError) throw upsertError;

        await supabase.from("agent_product_variants").delete().eq("catalog_id", catalogRow.id);
        if (parsed.variants.length) {
          const variants = parsed.variants.map((v: any) => ({ ...v, catalog_id: catalogRow.id }));
          const { error: varErr } = await supabase.from("agent_product_variants").insert(variants);
          if (varErr) throw varErr;
        }

        imported.push({
          id: catalogRow.id,
          name: catalogRow.name,
          product_url: catalogRow.product_url,
          variants: parsed.variants.length,
        });
      } catch (e: any) {
        failed.push({ url: link, error: e?.message || "parse_failed" });
      }
    }

    return NextResponse.json({
      ok: true,
      total_links: links.length,
      imported_count: imported.length,
      failed_count: failed.length,
      imported,
      failed,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const supabase = getAnonSupabaseWithToken(guard.token);
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
  }

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || 50)));

  const { data, error } = await supabase
    .from("agent_product_catalog")
    .select("id,name,brand,category,product_url,image_url,summary,standards,methods,updated_at")
    .eq("tenant_id", SYSTEM_TENANT_ID)
    .eq("created_by", guard.user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data: data || [] });
}
