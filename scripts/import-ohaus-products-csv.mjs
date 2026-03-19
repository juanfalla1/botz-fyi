import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_TENANT_ID = "0811c118-5a2f-40cb-907e-8979e0984096";
const SYSTEM_USER_ID = "841263c6-196d-49cd-b5ba-aae0b097014f";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = String(line || "").trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function loadEnvFiles() {
  const root = process.cwd();
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));
}

function normalizeText(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function slugify(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

function normalizeCategory(modelo, instrumento, familia, descripcion) {
  const inst = normalizeText(instrumento);
  const hay = `${normalizeText(modelo)} ${inst} ${normalizeText(familia)} ${normalizeText(descripcion)}`;

  // Strict first pass from Excel Instrumento column (source of truth)
  if (/humed/.test(inst)) return "analizador_humedad";
  if (/impresora/.test(inst)) return "impresoras";
  if (/electrodo|medidor/.test(inst)) return "electroquimica";
  if (/indicador de peso|bascula/.test(inst)) return "basculas";
  if (/balanza industrial/.test(inst)) return "basculas";
  if (/balanza/.test(inst)) return "balanzas";
  if (/agitador|plancha|centrifuga|mezclador|incubadora|homogeneizador/.test(inst)) return "equipos_laboratorio";

  // Fallback for malformed/incomplete Instrumento values
  if (/mb120|mb90|mb27|mb23|analizador(a)? de humedad|humedad/.test(hay)) return "analizador_humedad";
  if (/impresora|sf40a|sf50|impact/.test(hay)) return "impresoras";
  if (/electrodo|ph|orp|conductividad|resistividad|salinidad|aquasearcher|ab23|ab33|st10|st20|st30|st40|starter/.test(hay)) return "electroquimica";
  if (/defender|ranger|valor|bascula|indicador de peso|dt33|dt61|t24|t32|t51|t72|td52/.test(hay)) return "basculas";
  if (/explorer|adventurer|pioneer|pr series|scout|analitica|semi micro|microbalanza/.test(hay)) return "balanzas";
  if (/guardian|achiever|frontier|agitador|plancha|centrifuga|mezclador|incubadora|homogeneizador|placa calefactora/.test(hay)) return "equipos_laboratorio";

  if (/balanza/.test(hay)) return "balanzas";
  if (/bascula/.test(hay)) return "basculas";
  return "equipos_laboratorio";
}

function parsePrice(raw) {
  const v = String(raw || "").trim().replace(/[^0-9,.-]/g, "");
  if (!v) return null;
  const hasDot = v.includes(".");
  const hasComma = v.includes(",");
  let norm = v;
  if (hasDot && hasComma) {
    norm = v.lastIndexOf(",") > v.lastIndexOf(".") ? v.replace(/\./g, "").replace(/,/g, ".") : v.replace(/,/g, "");
  } else if (hasComma) {
    norm = v.replace(/,/g, ".");
  }
  const n = Number(norm);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Number(n.toFixed(2));
}

function parseArgs(argv) {
  const out = {
    file: "app/api/agents/channels/evolution/webhook/Productos.csv",
    tenantId: SYSTEM_TENANT_ID,
    createdBy: SYSTEM_USER_ID,
    provider: "ohaus_colombia",
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = String(argv[i] || "").trim();
    if (!arg) continue;
    if (arg === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (arg.startsWith("--file=")) out.file = arg.slice(7).trim() || out.file;
    if (arg.startsWith("--tenant-id=")) out.tenantId = arg.slice(12).trim() || out.tenantId;
    if (arg.startsWith("--created-by=")) out.createdBy = arg.slice(13).trim() || out.createdBy;
    if (arg.startsWith("--provider=")) out.provider = arg.slice(11).trim() || out.provider;
  }
  return out;
}

function splitCsvLine(line) {
  return String(line || "").split(";").map((x) => String(x || "").trim());
}

function alignCoreColumns(cells) {
  const CORE_LEN = 18;
  if (cells.length < CORE_LEN) return null;
  const maybePrAt1 = /^PR\d+$/i.test(cells[1] || "");
  if (maybePrAt1) return cells.slice(0, CORE_LEN);

  let prIndex = -1;
  for (let i = 1; i < Math.min(cells.length, 10); i += 1) {
    if (/^PR\d+$/i.test(cells[i] || "")) {
      prIndex = i;
      break;
    }
  }
  if (prIndex <= 1) return cells.slice(0, CORE_LEN);

  const model = cells.slice(0, prIndex).join(" ").replace(/\s+/g, " ").trim();
  const rebuilt = [model, ...cells.slice(prIndex)];
  if (rebuilt.length < CORE_LEN) return null;
  return rebuilt.slice(0, CORE_LEN);
}

function buildPayload(core, scope) {
  const [
    modelo,
    numeroModelo,
    modeloActivo,
    familia,
    sap,
    instrumento,
    precioUnitario,
    garantia,
    fechaModificacion,
    descripcion,
    claseImpuesto,
    responsable,
    fechaCreacion,
    ultimaModificacionPor,
    fabricante,
    referencia,
    imagenModelo,
    enlace,
  ] = core;

  const name = String(modelo || "").trim();
  const productCode = String(numeroModelo || "").trim();
  const sapCode = String(sap || "").trim();
  const instrument = String(instrumento || "").trim();
  const family = String(familia || "").trim();
  const description = String(descripcion || "").trim();
  const isActive = String(modeloActivo || "").trim() === "1";
  if (!name) return null;

  const category = normalizeCategory(name, instrument, family, description);
  const summary = description ? description.slice(0, 500) : `${instrument || "Producto"} marca OHAUS`;
  const basePriceUsd = parsePrice(precioUnitario);
  const link = String(enlace || "").trim();
  const productUrl = /^https?:\/\//i.test(link)
    ? link
    : `https://catalogo.ohaus.local/modelo/${encodeURIComponent(productCode || sapCode || name)}`;

  return {
    tenant_id: scope.tenantId,
    created_by: scope.createdBy,
    provider: scope.provider,
    brand: String(fabricante || "OHAUS").trim() || "OHAUS",
    category,
    name,
    slug: slugify(`${name}-${productCode || sapCode}`) || slugify(name),
    product_url: productUrl,
    image_url: /^https?:\/\//i.test(String(imagenModelo || "").trim()) ? String(imagenModelo || "").trim() : null,
    summary,
    description,
    standards: [],
    methods: [],
    specs_text: description,
    specs_json: {
      modelo: name,
      numero_modelo: productCode || null,
      sap: sapCode || null,
      familia: family || null,
      instrumento: instrument || null,
      garantia: String(garantia || "").trim() || null,
      clase_impuesto: String(claseImpuesto || "").trim() || null,
      fecha_modificacion: String(fechaModificacion || "").trim() || null,
      fecha_creacion: String(fechaCreacion || "").trim() || null,
      referencia: String(referencia || "").trim() || null,
    },
    source_payload: {
      import_source: "Productos.csv",
      product_code: productCode || null,
      sap: sapCode || null,
      family,
      instrument,
      warranty: String(garantia || "").trim() || null,
      image_model: String(imagenModelo || "").trim() || null,
      responsible: String(responsable || "").trim() || null,
      updated_by: String(ultimaModificacionPor || "").trim() || null,
      imported_at: new Date().toISOString(),
    },
    is_active: isActive,
    base_price_usd: basePriceUsd,
    price_currency: "USD",
    last_price_update: basePriceUsd ? new Date().toISOString() : null,
    datasheet_url: /^https?:\/\//i.test(link) && /\.pdf(\?|$)/i.test(link) ? link : null,
  };
}

async function main() {
  loadEnvFiles();
  const args = parseArgs(process.argv);
  const csvPath = path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found: ${csvPath}`);

  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceRole = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!supabaseUrl || !serviceRole) {
    throw new Error("Missing Supabase credentials. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  }

  try {
    const ping = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
    });
    console.log(`Supabase connectivity: HTTP ${ping.status} -> ${supabaseUrl}`);
  } catch (e) {
    console.error("Supabase connectivity failed:", e?.message || e, e?.cause?.code || "", e?.cause?.message || "");
    throw e;
  }

  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const raw = fs.readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => String(l || "").trim());
  if (lines.length <= 1) throw new Error("CSV has no data rows");

  const payloads = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    const core = alignCoreColumns(cells);
    if (!core) {
      skipped += 1;
      continue;
    }
    const payload = buildPayload(core, args);
    if (!payload) {
      skipped += 1;
      continue;
    }
    payloads.push(payload);
  }

  const dedupedByUrl = new Map();
  let duplicateUrls = 0;
  for (const row of payloads) {
    const key = String(row?.product_url || "").trim().toLowerCase();
    if (!key) continue;
    if (dedupedByUrl.has(key)) {
      duplicateUrls += 1;
      const prev = dedupedByUrl.get(key);
      const prevDesc = String(prev?.description || "");
      const nextDesc = String(row?.description || "");
      if (nextDesc.length > prevDesc.length) dedupedByUrl.set(key, row);
      continue;
    }
    dedupedByUrl.set(key, row);
  }

  const uniquePayloads = Array.from(dedupedByUrl.values());

  if (!uniquePayloads.length) throw new Error("No valid products parsed from CSV");

  if (args.dryRun) {
    console.log(`[DRY RUN] Parsed rows: ${payloads.length}; unique urls: ${uniquePayloads.length}; duplicates: ${duplicateUrls}; skipped: ${skipped}`);
    const sample = uniquePayloads.slice(0, 5).map((p) => ({ name: p.name, category: p.category, product_url: p.product_url }));
    console.log(JSON.stringify(sample, null, 2));
    return;
  }

  const { error: delVariantsErr } = await supabase.rpc("exec_sql", {
    sql: `
      delete from agent_product_variants
      where catalog_id in (
        select id from agent_product_catalog
        where tenant_id = '${args.tenantId}'
          and created_by = '${args.createdBy}'
          and provider = '${args.provider}'
      );
    `,
  }).single();

  if (delVariantsErr) {
    const { data: existingRows, error: rowsErr } = await supabase
      .from("agent_product_catalog")
      .select("id")
      .eq("tenant_id", args.tenantId)
      .eq("created_by", args.createdBy)
      .eq("provider", args.provider)
      .limit(20000);
    if (rowsErr) throw new Error(`Failed reading existing catalog rows: ${rowsErr.message}`);
    const ids = (Array.isArray(existingRows) ? existingRows : []).map((r) => String(r.id || "")).filter(Boolean);
    if (ids.length) {
      const STEP = 400;
      for (let i = 0; i < ids.length; i += STEP) {
        const batch = ids.slice(i, i + STEP);
        const { error: vErr } = await supabase.from("agent_product_variants").delete().in("catalog_id", batch);
        if (vErr) throw new Error(`Failed deleting variants: ${vErr.message}`);
      }
    }
  }

  const { error: deleteError } = await supabase
    .from("agent_product_catalog")
    .delete()
    .eq("tenant_id", args.tenantId)
    .eq("created_by", args.createdBy)
    .eq("provider", args.provider);

  if (deleteError) throw new Error(`Failed clearing old catalog: ${deleteError.message}`);

  const CHUNK = 250;
  let inserted = 0;
  for (let i = 0; i < uniquePayloads.length; i += CHUNK) {
    const chunk = uniquePayloads.slice(i, i + CHUNK);
    const { error } = await supabase.from("agent_product_catalog").upsert(chunk, { onConflict: "tenant_id,product_url" });
    if (error) throw new Error(`Insert failed at chunk ${i / CHUNK + 1}: ${error.message}`);
    inserted += chunk.length;
    console.log(`Inserted ${inserted}/${uniquePayloads.length}`);
  }

  console.log("Import completed.");
  console.log(`Inserted: ${inserted}`);
  console.log(`Duplicate URLs ignored: ${duplicateUrls}`);
  console.log(`Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error("Fatal error:", err?.message || err);
  process.exit(1);
});
