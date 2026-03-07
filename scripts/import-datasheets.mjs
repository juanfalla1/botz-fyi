import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";

function normalizeText(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getEnv(name) {
  return String(process.env[name] || "").trim();
}

function requireEnv(name, fallbackName = "") {
  const v = getEnv(name) || (fallbackName ? getEnv(fallbackName) : "");
  if (!v) throw new Error(`Missing env: ${name}${fallbackName ? ` or ${fallbackName}` : ""}`);
  return v;
}

function parseArgs(argv) {
  const out = {
    file: "scripts/catalog-datasheets.csv",
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = String(argv[i] || "").trim();
    if (!arg) continue;
    if (arg === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (arg.startsWith("--file=")) {
      out.file = arg.slice("--file=".length).trim() || out.file;
      continue;
    }
    if (arg === "--file") {
      const next = String(argv[i + 1] || "").trim();
      if (!next) throw new Error("Missing value for --file");
      out.file = next;
      i += 1;
      continue;
    }
  }
  return out;
}

function parseCsvRows(rawCsv) {
  const parsed = Papa.parse(rawCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => String(h || "").trim(),
  });
  if (parsed.errors?.length) {
    const first = parsed.errors[0];
    throw new Error(`CSV parse error at row ${first.row}: ${first.message}`);
  }
  return Array.isArray(parsed.data) ? parsed.data : [];
}

function cleanUrl(raw) {
  const v = String(raw || "").trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) return "";
  return v;
}

async function pickCatalogRow(supabase, row) {
  const catalogId = String(row.catalog_id || "").trim();
  const productUrl = String(row.product_url || "").trim();
  const productName = String(row.product_name || "").trim();
  const createdBy = String(row.created_by || "").trim();
  const tenantId = String(row.tenant_id || "").trim();

  const applyScope = (q) => {
    let scoped = q;
    if (createdBy) scoped = scoped.eq("created_by", createdBy);
    if (tenantId) scoped = scoped.eq("tenant_id", tenantId);
    return scoped;
  };

  if (catalogId) {
    const { data } = await applyScope(
      supabase
        .from("agent_product_catalog")
        .select("id,name,product_url,created_by,tenant_id")
        .eq("id", catalogId)
        .limit(1)
    ).maybeSingle();
    if (data?.id) return data;
  }

  if (productUrl) {
    const { data } = await applyScope(
      supabase
        .from("agent_product_catalog")
        .select("id,name,product_url,created_by,tenant_id")
        .eq("product_url", productUrl)
        .order("updated_at", { ascending: false })
        .limit(1)
    ).maybeSingle();
    if (data?.id) return data;
  }

  if (productName) {
    const { data } = await applyScope(
      supabase
        .from("agent_product_catalog")
        .select("id,name,product_url,created_by,tenant_id")
        .ilike("name", productName)
        .order("updated_at", { ascending: false })
        .limit(1)
    ).maybeSingle();
    if (data?.id) return data;

    const like = `%${productName}%`;
    const { data: candidates } = await applyScope(
      supabase
        .from("agent_product_catalog")
        .select("id,name,product_url,created_by,tenant_id")
        .ilike("name", like)
        .order("updated_at", { ascending: false })
        .limit(25)
    );
    const list = Array.isArray(candidates) ? candidates : [];
    if (list.length === 1) return list[0];
    if (list.length > 1) {
      const wanted = normalizeText(productName);
      const exact = list.find((x) => normalizeText(x?.name) === wanted);
      if (exact) return exact;
    }
  }

  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const csvPath = path.resolve(process.cwd(), args.file);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const supabaseUrl = requireEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  const { error: schemaErr } = await supabase
    .from("agent_product_catalog")
    .select("id,datasheet_url")
    .limit(1);
  if (schemaErr) {
    throw new Error(
      `Schema check failed (${schemaErr.message}). Run migration 025_add_catalog_datasheet_url.sql first.`
    );
  }

  const raw = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsvRows(raw);

  if (!rows.length) {
    console.log("No rows found in CSV. Nothing to do.");
    return;
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] || {};
    const datasheetUrl = cleanUrl(row.datasheet_url);
    const rowLabel = `row ${i + 2}`;

    if (!datasheetUrl) {
      skipped += 1;
      console.log(`[SKIP] ${rowLabel}: datasheet_url missing or invalid`);
      continue;
    }

    const target = await pickCatalogRow(supabase, row);
    if (!target?.id) {
      failed += 1;
      console.log(`[MISS] ${rowLabel}: product not found for product_name="${String(row.product_name || "").trim()}"`);
      continue;
    }

    if (args.dryRun) {
      updated += 1;
      console.log(`[DRY] ${rowLabel}: would set datasheet_url for ${target.name} (${target.id})`);
      continue;
    }

    const { error } = await supabase
      .from("agent_product_catalog")
      .update({ datasheet_url: datasheetUrl, updated_at: new Date().toISOString() })
      .eq("id", target.id);

    if (error) {
      failed += 1;
      console.log(`[FAIL] ${rowLabel}: ${error.message}`);
      continue;
    }

    updated += 1;
    console.log(`[OK] ${rowLabel}: ${target.name} -> ${datasheetUrl}`);
  }

  console.log("\nDone.");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch((err) => {
  console.error("Fatal error:", err?.message || err);
  process.exit(1);
});
