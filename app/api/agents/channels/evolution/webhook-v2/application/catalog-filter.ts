function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const ALLOWED_BRAND_KEYS = ["ohaus"];
const ALLOWED_NAME_KEYS = ["explorer", "adventurer", "pioneer", "ranger", "defender", "valor", "scout", "mb120", "mb90", "mb27", "mb23", "aquasearcher", "frontier"];
const ALLOWED_CATEGORY_KEYS = ["balanzas", "basculas", "analizador_humedad", "electroquimica", "equipos_laboratorio", "documentos"];

export function isAllowedCatalogRow(row: any): boolean {
  const brand = normalizeText(String(row?.brand || ""));
  const name = normalizeText(String(row?.name || ""));
  const category = normalizeText(String(row?.category || ""));
  if (!name) return false;
  if (ALLOWED_BRAND_KEYS.some((k) => brand.includes(k))) return true;
  if (ALLOWED_CATEGORY_KEYS.some((k) => category === k || category.startsWith(`${k}_`))) return true;
  return ALLOWED_NAME_KEYS.some((k) => name.includes(k));
}

export function catalogSubcategory(row: any): string {
  const payload = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  return normalizeText(String((payload as any)?.subcategory || ""));
}

export function isDocumentCatalogRow(row: any): boolean {
  const category = normalizeText(String(row?.category || ""));
  const subcategory = catalogSubcategory(row);
  const name = normalizeText(String(row?.name || ""));
  const productUrl = normalizeText(String(row?.product_url || ""));
  if (category === "documentos") return true;
  if (subcategory.startsWith("documentos")) return true;
  if (name.includes("datasheet") || name.includes("data sheet") || name.includes("ficha")) return true;
  if (productUrl.includes(".pdf")) return true;
  return false;
}

export function isCommercialCatalogRow(row: any): boolean {
  return isAllowedCatalogRow(row) && !isDocumentCatalogRow(row);
}
