function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export type GuidedBalanzaProfile =
  | "balanza_oro_001"
  | "balanza_precision_001"
  | "balanza_laboratorio_0001"
  | "balanza_semimicro_00001"
  | "balanza_industrial_portatil_conteo";

export function detectGuidedBalanzaProfile(text: string): GuidedBalanzaProfile | null {
  const t = normalizeText(String(text || ""));
  const hasGrameraWord = /\bgramera\b/.test(t);
  const hasOro = /(oro|joyeria|joyería|minero|calidad\s+del\s+oro|vender\s+oro|dos\s+cifras|densidad\s+para\s+oro)/.test(t);
  const hasThree = /(tres\s+cifras|0\s*[,.]\s*001|1\s*mg|cabina|con\s+cabina|cosmetic|cosmetico|cosmeticos|menos\s+de\s+200|menos\s+de\s+300|buena\s+resolucion)/.test(t);
  const hasFour = /(cuatro\s+cifras|0\s*[,.]\s*0001|0\s*[,.]\s*1\s*mg|0\s*[,.]\s*1\s*mg|laboratorio|laboratorio\s+de\s+alimentos|capacidad\s*200\s*g)/.test(t);
  const hasFive = /(cinco\s+cifras|0\s*[,.]\s*00001|0\s*[,.]\s*01\s*mg|semi\s*micro|semimicro|semi\w*micro|seminicro|usp|pesada\s+minima\s+usp|microgram|migrogram|\b\d+(?:[.,]\d+)?\s*mg\b)/.test(t);
  const hasIndustrial = /(portatil|portátil|recargable|plato\s+grande|cuenta\s+piezas|tres\s+pantallas|tornillos|30\s*kg|15\s*kg|gramo\s+por\s+gramo|bulto|bultos|peso\s+fuerte|peso\s+pesado|carga\s+pesada|alto\s+peso|mucho\s+peso|pesos?\s+altos?)/.test(t);
  const hasAnimalWeighing = /(caballo|caballos|perro|perros|gato|gatos|vaca|vacas|ganado|animal|animales|mascota|mascotas|veterinari|zootecnia)/.test(t) && /(pesar|peso|balanza|bascula|b[aá]scula)/.test(t);
  const hasExplicitReadability001 = /0\s*[,.]\s*001|1\s*mg/.test(t);
  const hasExplicitReadability0001 = /0\s*[,.]\s*0001|0\s*[,.]\s*1\s*mg/.test(t);
  const hasExplicitReadability00001 = /0\s*[,.]\s*00001|0\s*[,.]\s*01\s*mg/.test(t);
  const hasGrameraOnly = hasGrameraWord && !hasOro && !hasThree && !hasFour && !hasFive && !hasIndustrial;

  if (hasGrameraOnly) return null;
  if (hasExplicitReadability00001) return "balanza_semimicro_00001";
  if (hasExplicitReadability0001) return "balanza_laboratorio_0001";
  if (hasExplicitReadability001 && !hasOro) return "balanza_precision_001";
  if (hasFive) return "balanza_semimicro_00001";
  if (hasFour) return "balanza_laboratorio_0001";
  if (hasAnimalWeighing) return "balanza_industrial_portatil_conteo";
  if (hasIndustrial) return "balanza_industrial_portatil_conteo";
  if (hasOro) return "balanza_oro_001";
  if (hasThree || hasGrameraWord) return "balanza_precision_001";
  return null;
}

export function guidedProfileFromUsageContext(args: {
  text: string;
  capacityG: number;
  readabilityG: number;
  detectTargetApplication: (text: string) => string;
}): GuidedBalanzaProfile | null {
  const app = String(args.detectTargetApplication(args.text) || "");
  const read = Number(args.readabilityG || 0);
  const cap = Number(args.capacityG || 0);

  if (app === "industrial") return "balanza_industrial_portatil_conteo";

  if (app === "laboratorio") {
    if (read > 0 && read <= 0.00001) return "balanza_semimicro_00001";
    if (read > 0 && read <= 0.0001) return "balanza_laboratorio_0001";
    if (read > 0 && read <= 0.001) return "balanza_precision_001";
    if (read > 0 && read <= 0.01) return cap >= 1000 ? "balanza_oro_001" : "balanza_precision_001";
    return "balanza_precision_001";
  }

  if (app === "joyeria_oro") {
    if (read > 0 && read <= 0.001) return "balanza_precision_001";
    return "balanza_oro_001";
  }

  return null;
}

export function detectIndustrialGuidedMode(text: string): "conteo" | "estandar" | "" {
  const t = normalizeText(String(text || ""));
  if (!t) return "";
  if (/(contar|conteo|cuenta\s*piez|piezas|tornillos|inventario)/.test(t)) return "conteo";
  if (/(estandar|estándar|sin\s+conteo|solo\s+peso|pesaje\s+normal)/.test(t)) return "estandar";
  return "";
}

export function isHeavyDutyWeightIntent(text: string): boolean {
  const t = normalizeText(String(text || ""));
  if (!t) return false;
  return /(peso\s+fuerte|peso\s+pesado|carga\s+pesada|cargas?\s+altas?|alto\s+peso|mucho\s+peso|peso\s+grande|pesos?\s+altos?|peso\s+industrial)/.test(t);
}
