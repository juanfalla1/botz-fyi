function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isFlowChangeWithoutModelDetailsIntent(args: {
  text: string;
  extractModelLikeTokens: (text: string) => string[];
}): boolean {
  const t = normalizeText(args.text || "");
  if (!t) return false;
  const hasModelTokens = args.extractModelLikeTokens(args.text).length >= 1;
  const hasQtyHint = /(\d{1,4})\s*(x|por|unidad|unidades)/.test(t);
  if (hasModelTokens || hasQtyHint) return false;
  return /(mas\s+de\s+un\s+modelo|m[aá]s\s+de\s+un\s+modelo|varios\s+modelos|multiples\s+modelos|m[uú]ltiples\s+modelos|otro\s+modelo|otra\s+referencia|otra\s+opcion|otro\s+equipo|cambiar\s+modelo|cambiar\s+referencia|quiero\s+otro|quiero\s+otras|agregar\s+otro|agregar\s+mas|incluir\s+otro|incluir\s+mas)/.test(t);
}

export function isCatalogBreadthQuestion(text: string, normalizeCatalogQueryText: (text: string) => string): boolean {
  const t = normalizeCatalogQueryText(String(text || ""));
  if (!t) return false;
  return (
    /(que\s+mas|que\s+otros?|otras\s+referencias|mas\s+referencias|catalogo\s+completo)/.test(t) ||
    /(?:producto|productos|prodcutos|productod|referencia|referencias).*(tien|manej|ofrec|hay)/.test(t)
  );
}

export function isGlobalCatalogAsk(text: string, normalizeCatalogQueryText: (text: string) => string): boolean {
  const t = normalizeCatalogQueryText(String(text || ""));
  if (!t) return false;
  return (
    /(dame|muestrame|mu[eé]strame|quiero|ver).*(todo\s+el\s+catalogo|catalogo\s+completo|dame\s+el\s+catalogo|catalogo)/.test(t) ||
    /(dame|muestrame|mu[eé]strame|quiero|ver).*(todos\s+los\s+productos|todos\s+los\s+prodcutos|todas\s+las\s+referencias|todos\s+los\s+equipos)/.test(t) ||
    /^catalogo$/.test(t)
  );
}

export function listActiveCatalogCategories(rows: any[]): string {
  const list = Array.isArray(rows) ? rows : [];
  const counts = new Map<string, number>();
  for (const row of list) {
    const cat = normalizeText(String(row?.category || ""));
    if (!cat) continue;
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }
  const labels: Array<{ key: string; label: string; count: number }> = [
    { key: "balanzas", label: "balanzas", count: counts.get("balanzas") || 0 },
    { key: "basculas", label: "basculas", count: counts.get("basculas") || 0 },
    { key: "analizador_humedad", label: "analizador de humedad", count: counts.get("analizador_humedad") || 0 },
    { key: "electroquimica", label: "electroquimica", count: counts.get("electroquimica") || 0 },
    { key: "equipos_laboratorio", label: "equipos de laboratorio", count: counts.get("equipos_laboratorio") || 0 },
  ].filter((x) => x.count > 0);
  if (!labels.length) return "catalogo activo limitado";
  return labels.map((x) => `${x.label} (${x.count})`).join(", ");
}

export function buildCommercialWelcomeMessage(): string {
  return [
    "¡Hola! Bienvenido a Avanza International Group. Representantes de la marca OHAUS en Colombia, con 120 años de trayectoria mundial en equipos de pesaje y laboratorio. Contamos con 25 años brindando respaldo y soporte especializado.",
    "",
    "¿Ya nos conoces? 👇",
    "1) Soy cliente nuevo",
    "2) Ya soy cliente de Avanza",
  ].join("\n");
}

export function isLikelyRutValue(rawRut: string): boolean {
  const cleaned = String(rawRut || "").replace(/\s+/g, "").replace(/\./g, "");
  if (!cleaned) return false;
  const digits = cleaned.replace(/\D/g, "");
  return digits.length >= 7;
}
