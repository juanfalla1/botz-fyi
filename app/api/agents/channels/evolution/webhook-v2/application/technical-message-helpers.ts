export function normalizeNumber(value: any): number {
  const n = Number(String(value ?? "").replace(/,/g, ".").trim());
  return Number.isFinite(n) ? n : 0;
}

export function getRowCapacityG(args: {
  row: any;
  extractRowTechnicalSpec: (row: any) => any;
}): number {
  const s = args.extractRowTechnicalSpec(args.row);
  return normalizeNumber(s?.capacityG || args.row?.capacity_g || args.row?.capacity || args.row?.capacidad_g || args.row?.capacidad || args.row?.max_g || args.row?.max);
}

export function getRowReadabilityG(args: {
  row: any;
  extractRowTechnicalSpec: (row: any) => any;
}): number {
  const s = args.extractRowTechnicalSpec(args.row);
  return normalizeNumber(s?.readabilityG || args.row?.readability_g || args.row?.readability || args.row?.resolution_g || args.row?.resolution || args.row?.resolucion_g || args.row?.resolucion || args.row?.precision_g || args.row?.precision);
}

export function isExactTechnicalMatch(args: {
  row: any;
  requirement: { capacityG: number; readabilityG: number };
  getRowCapacityG: (row: any) => number;
  getRowReadabilityG: (row: any) => number;
}): boolean {
  const cap = args.getRowCapacityG(args.row);
  const read = args.getRowReadabilityG(args.row);
  return cap > 0 && read > 0 && cap === Number(args.requirement.capacityG || 0) && read === Number(args.requirement.readabilityG || 0);
}

export function getExactTechnicalMatches(args: {
  rows: any[];
  requirement: { capacityG: number; readabilityG: number };
  isExactTechnicalMatch: (row: any, requirement: { capacityG: number; readabilityG: number }) => boolean;
}): any[] {
  return (Array.isArray(args.rows) ? args.rows : []).filter((row) => args.isExactTechnicalMatch(row, args.requirement));
}

export function hasActiveTechnicalRequirement(memory: any): boolean {
  const cap = Number(memory?.strict_filter_capacity_g || 0);
  const read = Number(memory?.strict_filter_readability_g || 0);
  return cap > 0 && read > 0;
}

export function resetStrictRecommendationState(memory: any) {
  memory.pending_product_options = [];
  memory.pending_family_options = [];
  memory.awaiting_action = "none";
  memory.strict_family_label = "";
  memory.strict_model_offset = 0;
}

export function isAmbiguousTechnicalMessage(text: string, normalizeText: (text: string) => string, parseTechnicalSpecQuery: (text: string) => any): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  if (parseTechnicalSpecQuery(t)) return false;
  return /\brango\s*\d+\b/.test(t) || /^\d{2,5}$/.test(t.trim()) || /\bla de\s+\d+\b/.test(t) || /\bla normal\b/.test(t) || /\bla industrial\b/.test(t) || /\bla de laboratorio\b/.test(t);
}

export function buildAmbiguityQuestion(text: string, normalizeText: (text: string) => string): string {
  const t = normalizeText(text || "");
  if (/rango\s*\d+/.test(t)) return "Para no equivocarme: cuando dices ese rango, ¿te refieres a capacidad, presupuesto o referencia específica?";
  if (/^\d{2,5}$/.test(t.trim())) return "Para no equivocarme, ese número corresponde a capacidad, modelo o presupuesto?";
  return "Para no equivocarme, ¿puedes confirmarme exactamente capacidad y resolución, por ejemplo 200 g x 0.001 g?";
}

export function withAvaSignature(text: string, normalizeText: (text: string) => string): string {
  const body = String(text || "").trim();
  if (!body) return "Soy Ava de Avanza Balanzas. ¿En qué puedo ayudarte hoy?";
  const normalized = normalizeText(body);
  if (normalized.includes("soy ava") || normalized.startsWith("ava:") || normalized.startsWith("hola soy ava")) return body;
  return `Ava: ${body}`;
}
