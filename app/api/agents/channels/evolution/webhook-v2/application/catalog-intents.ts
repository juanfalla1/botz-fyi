function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isExplicitFamilyMenuAsk(text: string): boolean {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  if (/^(balanza|balanzas|bascula|basculas|opciones|alternativas|familias|categorias|categorias\s+activas)$/.test(t)) return true;
  return /(que\s+opciones\s+tienes|que\s+familias\s+tienes|que\s+categorias\s+tienes|muestrame\s+familias|muestrame\s+categorias|dame\s+el\s+menu)/.test(t);
}

export function isBasculaAvailabilityAsk(text: string): boolean {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  const mentionsBascula = /(bascula|basculas|bacula|baculas|bscula|bsculas|b[aá]scu)/.test(t);
  if (!mentionsBascula) return false;
  return /(tiene|tienen|hay|manejan|ofrecen|muestran|que\s+modelos|dame\s+opciones|muestrame\s+opciones|opciones|modelos|catalogo|cat[aá]logo)/.test(t);
}

export function isAmbiguousNeedInput(text: string): boolean {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return true;
  if (!/(balanza|balanzas|bascula|basculas)/.test(t)) return false;
  if (/\bpara\s+pesar\s+or$/.test(t)) return true;
  if (/\bpara\s+pesar$/.test(t)) return true;
  if (/\bpara\s+pesar\s+[a-z]{1,2}$/.test(t)) return true;
  if (/\bor$/.test(t) || /\bpara$/.test(t)) return true;
  return false;
}

export function isDifferenceQuestionIntent(text: string): boolean {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  const asksDifference = /(diferenc|compar|cual\s+conviene|cual\s+es\s+mejor|ventajas?\s+de\s+una\s+y\s+otra|que\s+cambia\s+entre)/.test(t);
  const mentionsScale = /(balanza|balanzas|bascula|basculas)/.test(t);
  return asksDifference && mentionsScale;
}

export function hasPriorityProductGuidanceIntent(args: {
  text: string;
  isScaleUseExplanationIntent: (text: string) => boolean;
  isAlternativeRejectionIntent: (text: string) => boolean;
  isGuidedNeedDiscoveryText: (text: string) => boolean;
  hasTechnicalSpec: boolean;
  hasCategoryOrApplication: boolean;
}): boolean {
  const t = normalizeText(String(args.text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  if (isDifferenceQuestionIntent(args.text)) return true;
  if (args.isScaleUseExplanationIntent(args.text)) return true;
  if (args.isAlternativeRejectionIntent(args.text)) return true;
  if (args.isGuidedNeedDiscoveryText(args.text)) return true;
  if (args.hasTechnicalSpec) return true;
  if (args.hasCategoryOrApplication) return true;
  const hasScaleWords = /(balanza|balanzas|bascula|basculas|humedad|analizador)/.test(t);
  const hasCommercialAsk = /(dame|muestrame|muestrame|tienes|que\s+modelos|que\s+diferencias|recomiend|busco|necesito|quiero)/.test(t);
  return hasScaleWords && hasCommercialAsk;
}

export function detectCatalogCategoryIntent(text: string): string | null {
  const t = normalizeText(text || "");
  if (!t) return null;
  const asksLabEquipment = /(plancha|planchas|calentamiento|agitacion|agitación|agitador|mezclador|homogeneizador|centrifuga)/.test(t);
  const negatesBasculas = /\bno\s+quiero\s+(una\s+)?bascula|\bno\s+quiero\s+(una\s+)?bscula|\bno\s+basculas?\b|\bno\s+bsculas?\b/.test(t);
  if (/(electroquim|ph|orp|conductividad|tds|salinidad|aquasearcher|electrodo|medidor)/.test(t)) {
    if (/(mesa|sobremesa)/.test(t)) return "electroquimica_medidores_mesa";
    if (/(portatil|portatiles)/.test(t)) return "electroquimica_medidores_portatiles";
    if (/(bolsillo)/.test(t)) return "electroquimica_medidores_bolsillo";
    if (/(electrodo)/.test(t)) return "electroquimica_electrodos";
    return "electroquimica";
  }
  if (/(anali[sz]ador(?:es)?(?:\s+de)?\s+humedad|anali[sz]ador(?:es)?|humedad|mb120|mb90|mb27|mb23)/.test(t)) return "analizador_humedad";
  if (asksLabEquipment) return "equipos_laboratorio";
  if (/(balanza|balanzas|analitica|semi analitica|semi-micro|precision|resolucion|lectura minima)/.test(t) && /(precision|resolucion|lectura minima)/.test(t)) {
    return "balanzas_precision";
  }
  if (/(bascula|basculas|bscula|bsculas|ranger|defender|valor|control de peso|ckw|td52p|plataforma\s+de\s+pesaje|plataforma\s+de\s+peso)/.test(t) && !negatesBasculas) return "basculas";
  if (/(impresora)/.test(t)) return "impresoras";
  if (/(balanza|balanzas|blanza|blanzas|explorer|adventurer|pioneer|pr\b|scout|analitica|semi analitica|precision)/.test(t)) return "balanzas";
  if (/(documento|brochure|manual|guia|catalogo pdf)/.test(t)) return "documentos";
  return null;
}

export function isTechnicalSheetIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(ficha|ficha tecnica|fichas tecnicas|datasheet|especificaciones|specs|hoja tecnica|brochure|catalogo tecnico)/.test(t);
}

export function isTechSheetCatalogListIntent(text: string): boolean {
  const t = normalizeText(text);
  return (
    /(de que productos|que productos|cuales productos|cuales referencias|que referencias).*(ficha|ficha tecnica|datasheet|especificaciones)/.test(t) ||
    /(productos|referencias|modelos).*(con|que tengan).*(ficha|ficha tecnica|datasheet)/.test(t) ||
    /(listado|lista|catalogo).*(ficha|ficha tecnica|datasheet)/.test(t)
  );
}

export function isProductImageIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(imagen|imagenes|foto|fotos|fotografia|ver producto|no veo imagen|no cargo imagen|reenvia imagen|reenvia imagen)/.test(t);
}
