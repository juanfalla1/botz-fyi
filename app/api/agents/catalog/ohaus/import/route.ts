import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getAnonSupabaseWithToken, getServiceSupabase } from "@/app/api/_utils/supabase";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";

type ParsedTable = {
  headers: string[];
  rows: string[][];
};

type CategorySource = { url: string; category: string };

const DEFAULT_CATEGORY_SOURCES: CategorySource[] = [
  { url: "https://balanzasybasculas.com.co/categoria-producto/balanzas-ohaus/", category: "balanzas" },
  { url: "https://balanzasybasculas.com.co/categoria-producto/basculas-ohaus/", category: "basculas" },
  { url: "https://balanzasybasculas.com.co/categoria-producto/equipos-de-laboratorio-ohaus/", category: "equipos_laboratorio" },
  { url: "https://balanzasybasculas.com.co/categoria-producto/analizadores-de-humedad-ohaus/", category: "analizador_humedad" },
  { url: "https://balanzasybasculas.com.co/categoria-producto/equipos-de-laboratorio-ohaus/electroquimica-ohaus/", category: "electroquimica" },
  { url: "https://balanzasybasculas.com.co/categoria-producto/impresoras-ohaus/", category: "impresoras" },
];
const DOCUMENTS_SOURCE_URL = "https://balanzasybasculas.com.co/";

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

function normalizeCategory(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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
  const re = /href=["']([^"']*\/(?:producto|product)\/[^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const full = toAbsoluteUrl(baseUrl, m[1]);
    if (!full) continue;
    links.push(full.split("#")[0]);
  }
  return uniqueStrings(links);
}

function extractPdfLinks(html: string, baseUrl: string) {
  const links: string[] = [];
  const re = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = String(m[1] || "").trim();
    if (!href) continue;
    const abs = toAbsoluteUrl(baseUrl, href);
    if (!abs) continue;
    const clean = abs.split("#")[0];
    if (/\.pdf(\?|$)/i.test(clean)) links.push(clean);
  }
  return uniqueStrings(links);
}

function extractVideoLinks(html: string, baseUrl: string) {
  const links: string[] = [];

  const hrefRe = /href=["']([^"']+)["']/gi;
  let h: RegExpExecArray | null;
  while ((h = hrefRe.exec(html)) !== null) {
    const href = String(h[1] || "").trim();
    if (!href) continue;
    const abs = toAbsoluteUrl(baseUrl, href);
    if (!abs) continue;
    const clean = abs.split("#")[0];
    if (/youtube\.com|youtu\.be|vimeo\.com|\.mp4(\?|$)/i.test(clean)) links.push(clean);
  }

  const iframeRe = /<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let i: RegExpExecArray | null;
  while ((i = iframeRe.exec(html)) !== null) {
    const src = String(i[1] || "").trim();
    if (!src) continue;
    const abs = toAbsoluteUrl(baseUrl, src);
    if (!abs) continue;
    const clean = abs.split("#")[0];
    if (/youtube\.com|youtu\.be|vimeo\.com|\.mp4(\?|$)/i.test(clean)) links.push(clean);
  }

  return uniqueStrings(links);
}

function inferCategoryFromProductUrl(productUrl: string): string {
  const u = String(productUrl || "").toLowerCase();
  if (u.includes("analizador-de-humedad") || u.includes("mb120") || u.includes("mb90") || u.includes("mb27") || u.includes("mb23")) return "analizador_humedad";
  if (u.includes("electroquim") || u.includes("ph") || u.includes("multiparametro") || u.includes("electrodo")) return "electroquimica";
  if (u.includes("impresora")) return "impresoras";
  if (u.includes("bascula") || u.includes("ranger") || u.includes("defender") || u.includes("valor")) return "basculas";
  if (u.includes("centrifuga") || u.includes("agitador") || u.includes("mezclador") || u.includes("homogeneizador") || u.includes("planch")) return "equipos_laboratorio";
  return "balanzas";
}

function fileNameFromUrl(url: string) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const last = decodeURIComponent(parts[parts.length - 1] || "");
    return last || "documento.pdf";
  } catch {
    return "documento.pdf";
  }
}

function titleFromPdfUrl(url: string) {
  const f = fileNameFromUrl(url).replace(/\.pdf$/i, "");
  return f.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
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
  const tables = extractTables(descHtml || html);
  const pdfLinks = extractPdfLinks(html, url);
  const videoLinks = extractVideoLinks(html, url);
  const datasheetUrl = String(pdfLinks[0] || "").trim();

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
    specs_text: fullText,
    specs_json: { tables },
    datasheet_url: datasheetUrl || null,
    source_payload: { fetched_at: new Date().toISOString(), pdf_links: pdfLinks, video_links: videoLinks, source: "ohaus_colombia" },
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
  try {
    const body = await req.json().catch(() => ({}));
    const guard = await getRequestUser(req);
    const importSecretHeader = String(req.headers.get("x-import-secret") || "").trim();
    const importSecretBody = String(body?.importSecret || "").trim();
    const expectedImportSecret = String(process.env.CATALOG_IMPORT_SECRET || "botz-import-2026").trim();

    const secretModeEnabled = Boolean(expectedImportSecret);
    const secretModeAuthorized =
      secretModeEnabled &&
      (importSecretHeader === expectedImportSecret || importSecretBody === expectedImportSecret);

    if (!guard.ok && !secretModeAuthorized) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const createdBy = guard.ok
      ? guard.user.id
      : String(body?.createdBy || process.env.CATALOG_IMPORT_USER_ID || "").trim();

    if (!createdBy) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing createdBy for secret import mode. Set CATALOG_IMPORT_USER_ID env or send body.createdBy.",
        },
        { status: 400 }
      );
    }

    const supabase = guard.ok ? getAnonSupabaseWithToken(guard.token) : getServiceSupabase();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
    }

    const categorySources: CategorySource[] = Array.isArray(body?.categorySources) && body.categorySources.length
      ? body.categorySources
          .map((x: any) => ({ url: String(x?.url || "").trim(), category: normalizeCategory(String(x?.category || "otros")) }))
          .filter((x: any) => x.url)
      : DEFAULT_CATEGORY_SOURCES;
    const maxProducts = Math.max(1, Math.min(300, Number(body?.maxProducts || 180)));
    const importDocuments = String(body?.importDocuments ?? "true").toLowerCase() !== "false";
    const replaceExisting = String(body?.replaceExisting || "false").toLowerCase() === "true";

    if (replaceExisting) {
      await supabase
        .from("agent_product_catalog")
        .delete()
        .eq("tenant_id", SYSTEM_TENANT_ID)
        .eq("created_by", createdBy)
        .eq("provider", "ohaus_colombia");
    }

    const linkCategoryMap = new Map<string, string>();
    const allPdfLinks: string[] = [];
    for (const src of categorySources) {
      const categoryHtml = await fetchHtml(src.url);
      const links = extractProductLinks(categoryHtml, src.url);
      for (const l of links) {
        if (!linkCategoryMap.has(l)) linkCategoryMap.set(l, src.category);
      }
      allPdfLinks.push(...extractPdfLinks(categoryHtml, src.url));
    }

    if (importDocuments) {
      const homeHtml = await fetchHtml(DOCUMENTS_SOURCE_URL);
      allPdfLinks.push(...extractPdfLinks(homeHtml, DOCUMENTS_SOURCE_URL));
    }

    const links = Array.from(linkCategoryMap.keys()).slice(0, maxProducts);
    if (!links.length) {
      return NextResponse.json({ ok: false, error: "No product links found" }, { status: 400 });
    }

    const imported: any[] = [];
    const failed: any[] = [];
    const categoryCounts: Record<string, number> = {};

    for (const link of links) {
      try {
        const parsed = await parseProduct(link);
        const explicitCategory = linkCategoryMap.get(link) || inferCategoryFromProductUrl(link);
        const payload = {
          tenant_id: SYSTEM_TENANT_ID,
          created_by: createdBy,
          provider: "ohaus_colombia",
          brand: "OHAUS",
          category: explicitCategory,
          name: parsed.name,
          slug: parsed.slug,
          product_url: parsed.product_url,
          image_url: parsed.image_url,
          summary: parsed.summary,
          description: parsed.description,
          standards: [],
          methods: [],
          specs_text: parsed.specs_text,
          specs_json: parsed.specs_json,
          datasheet_url: parsed.datasheet_url,
          source_payload: { ...(parsed.source_payload || {}), category_source: explicitCategory },
          is_active: true,
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
          category: explicitCategory,
          variants: parsed.variants.length,
        });
        categoryCounts[explicitCategory] = Number(categoryCounts[explicitCategory] || 0) + 1;
      } catch (e: any) {
        failed.push({ url: link, error: e?.message || "parse_failed" });
      }
    }

    const importedDocs: any[] = [];
    if (importDocuments) {
      const docs = uniqueStrings(allPdfLinks);
      for (const pdfUrl of docs) {
        try {
          const payload = {
            tenant_id: SYSTEM_TENANT_ID,
            created_by: createdBy,
            provider: "ohaus_colombia",
            brand: "OHAUS",
            category: "documentos",
            name: titleFromPdfUrl(pdfUrl),
            slug: fileNameFromUrl(pdfUrl).replace(/\.pdf$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
            product_url: pdfUrl,
            image_url: null,
            summary: "Documento técnico del catálogo OHAUS Colombia",
            description: `Documento disponible en: ${pdfUrl}`,
            standards: [],
            methods: [],
            specs_text: "",
            specs_json: {},
            datasheet_url: pdfUrl,
            source_payload: { source: "ohaus_colombia_docs", fetched_at: new Date().toISOString() },
            is_active: true,
          };

          const { data: docRow, error: docErr } = await supabase
            .from("agent_product_catalog")
            .upsert(payload, { onConflict: "tenant_id,product_url" })
            .select("id,name,product_url")
            .single();

          if (docErr) throw docErr;
          importedDocs.push({ id: docRow.id, name: docRow.name, product_url: docRow.product_url, category: "documentos" });
          categoryCounts.documentos = Number(categoryCounts.documentos || 0) + 1;
        } catch (e: any) {
          failed.push({ url: pdfUrl, error: e?.message || "pdf_upsert_failed" });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      source: "https://balanzasybasculas.com.co/",
      total_links: links.length,
      imported_count: imported.length,
      imported_docs_count: importedDocs.length,
      failed_count: failed.length,
      category_counts: categoryCounts,
      imported,
      imported_docs: importedDocs,
      failed,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
