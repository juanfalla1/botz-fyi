function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function detectTargetApplication(text: string): string {
  const t = normalizeText(text || "");

  const hasJewelry = /(oro|joyeria|joyeria|quilat|kilat)/.test(t);
  const hasLab = /(laboratorio|lab\b|analitica|analitica|farmacia)/.test(t);
  const jewelryNegated = /(no\s+es\s+ni\s+para\s+(oro|joyeria|joyeria|quilat|kilat)|no\s+es\s+para\s+(oro|joyeria|joyeria|quilat|kilat)|ni\s+para\s+(oro|joyeria|joyeria|quilat|kilat))/.test(t);
  const labNegated = /(no\s+es\s+ni\s+para\s+(laboratorio|lab|analitica|analitica|farmacia)|no\s+es\s+para\s+(laboratorio|lab|analitica|analitica|farmacia)|ni\s+para\s+(laboratorio|lab|analitica|analitica|farmacia))/.test(t);

  const jewelryPositive = hasJewelry && !jewelryNegated;
  const labPositive = hasLab && !labNegated;

  if (jewelryPositive && !labPositive) return "joyeria_oro";
  if (labPositive && !jewelryPositive) return "laboratorio";
  if (jewelryPositive && labPositive) return "";

  if (/(alimento|alimentos|comida|restaurante|cocina|leche)/.test(t)) return "alimentos";
  if (/(industrial|produccion|produccion|bodega|planta)/.test(t)) return "industrial";
  return "";
}

export function maxReadabilityForApplication(app: string): number {
  const a = normalizeText(String(app || ""));
  if (a === "joyeria_oro") return 0.01;
  if (a === "laboratorio") return 0.1;
  if (a === "alimentos") return 1;
  return 1;
}
