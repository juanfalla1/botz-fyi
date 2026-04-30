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
