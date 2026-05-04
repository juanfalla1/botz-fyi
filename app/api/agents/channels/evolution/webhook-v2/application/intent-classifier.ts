export type ClassifiedIntent = {
  intent:
    | "greeting"
    | "consultar_historial"
    | "solicitar_cotizacion"
    | "solicitar_ficha"
    | "consultar_trm"
    | "guided_need_discovery"
    | "consultar_categoria"
    | "consultar_producto"
    | "despedida"
    | "aclaracion";
  category: string | null;
  product: string | null;
  request_datasheet: boolean;
  request_quote: boolean;
  request_trm: boolean;
  needs_clarification: boolean;
};

export function classifyIntent(args: {
  text: string;
  memory?: Record<string, any>;
  normalizeText: (v: string) => string;
  detectCatalogCategoryIntent: (v: string) => string;
  isTechnicalSheetIntent: (v: string) => boolean;
  isProductImageIntent: (v: string) => boolean;
  shouldAutoQuote: (v: string) => boolean;
  isQuoteStarterIntent: (v: string) => boolean;
  isQuoteProceedIntent: (v: string) => boolean;
  isGreetingIntent: (v: string) => boolean;
  isHistoryIntent: (v: string) => boolean;
  isQuoteRecallIntent: (v: string) => boolean;
  isGuidedNeedDiscoveryText: (v: string) => boolean;
  isProductLookupIntent: (v: string) => boolean;
  isPriceIntent: (v: string) => boolean;
  isRecommendationIntent: (v: string) => boolean;
}): ClassifiedIntent {
  const t = args.normalizeText(args.text || "");
  const category = args.detectCatalogCategoryIntent(t) || String(args.memory?.last_category_intent || "").trim() || null;
  const requestDatasheet = args.isTechnicalSheetIntent(t) || args.isProductImageIntent(t);
  const requestQuote = args.shouldAutoQuote(t) || args.isQuoteStarterIntent(t) || args.isQuoteProceedIntent(t);
  const requestTrm = /(trm|tasa representativa|dolar hoy|usd cop|tasa de cambio)/.test(t);

  let intent: ClassifiedIntent["intent"] = "aclaracion";
  if (args.isGreetingIntent(t)) intent = "greeting";
  else if (args.isHistoryIntent(t) || args.isQuoteRecallIntent(t)) intent = "consultar_historial";
  else if (requestQuote) intent = "solicitar_cotizacion";
  else if (requestDatasheet) intent = "solicitar_ficha";
  else if (requestTrm) intent = "consultar_trm";
  else if (args.isGuidedNeedDiscoveryText(t)) intent = "guided_need_discovery";
  else if (category) intent = "consultar_categoria";
  else if (args.isProductLookupIntent(t) || args.isPriceIntent(t) || args.isRecommendationIntent(t)) intent = "consultar_producto";
  else if (/(gracias|ok gracias|listo gracias|chao|adios|hasta luego)/.test(t)) intent = "despedida";

  return {
    intent,
    category,
    product: null,
    request_datasheet: requestDatasheet,
    request_quote: requestQuote,
    request_trm: requestTrm,
    needs_clarification: intent === "aclaracion",
  };
}

export function findCatalogProductByName(rows: any[], rememberedName: string, normalizeText: (v: string) => string): any | null {
  const target = normalizeText(rememberedName || "");
  if (!target) return null;
  const exact = (rows || []).find((r: any) => normalizeText(String(r?.name || "")) === target);
  if (exact) return exact;
  const partial = (rows || []).find((r: any) => target.includes(normalizeText(String(r?.name || ""))) || normalizeText(String(r?.name || "")).includes(target));
  return partial || null;
}
