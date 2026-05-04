export type ConversationIntent =
  | "guided_need_discovery"
  | "menu_selection"
  | "technical_spec_input"
  | "use_explanation_question"
  | "compatibility_question"
  | "application_update"
  | "alternative_request"
  | "pricing_request"
  | "quote_confirmation"
  | "billing_data_input"
  | "category_switch"
  | "fallback_unclear";

export type ConversationSlots = {
  product_type: string;
  target_capacity_g: number;
  target_readability_g: number;
  target_application: string;
  target_industry: string;
  current_model: string;
  current_stage: string;
  active_menu_type: string;
  active_menu_options: Record<string, string>;
  active_menu_context: Record<string, string>;
  last_recommended_models: string[];
};

function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function buildActiveMenuState(args: {
  awaiting: string;
  pendingOptions: any[];
  selectedModel: string;
}): { type: string; options: Record<string, string>; context: Record<string, string> } {
  const awaiting = String(args.awaiting || "");
  if (awaiting === "strict_choose_action") {
    return {
      type: "model_action_menu",
      options: { "1": "quote", "2": "datasheet" },
      context: args.selectedModel ? { model: args.selectedModel } : {},
    };
  }
  if (awaiting === "strict_choose_model" && Array.isArray(args.pendingOptions) && args.pendingOptions.length > 0) {
    const options: Record<string, string> = {};
    for (const o of args.pendingOptions.slice(0, 40)) {
      const key = String(o?.code || "").trim();
      const val = String(o?.name || o?.raw_name || "").trim();
      if (key && val) options[key] = val;
    }
    return {
      type: "model_selection_menu",
      options,
      context: {},
    };
  }
  return { type: "", options: {}, context: {} };
}

export function isMenuSelectionInput(text: string): boolean {
  const t = normalizeText(String(text || "")).trim();
  return /^([a-z]|\d{1,2})$/.test(t);
}

export function isGuidedNeedDiscoveryText(text: string): boolean {
  const t = normalizeText(String(text || ""));
  if (!t) return false;
  const asksNeed = /\b(quiero|necesito|busco|requiero|recomiend|orienta)\b/.test(t) || /para\s+pesar/.test(t);
  const inDomain = /(balanza|balanzas|bascula|basculas|humedad|analizador|alimentos|laboratorio|oro|joyeria|joyeria|repuesto|repuestos|cajas|papa|papas|tornillo|tornillos)/.test(t);
  return asksNeed && inDomain;
}

export function classifyMessageIntent(args: {
  text: string;
  awaiting: string;
  rememberedCategory: string;
  activeMenuType: string;
  parseLooseTechnicalHint: (text: string) => any;
  parseTechnicalSpecQuery: (text: string) => any;
  detectCatalogCategoryIntent: (text: string) => string | null;
  asksQuoteIntent: (text: string) => boolean;
  isPriceIntent: (text: string) => boolean;
  looksLikeBillingData: (text: string) => boolean;
}): ConversationIntent {
  const text = String(args.text || "");
  const t = normalizeText(text);
  const technical = args.parseLooseTechnicalHint(text);
  const hasTechnical = Number((technical as any)?.capacityG || 0) > 0 || Number((technical as any)?.readabilityG || 0) > 0 || Boolean(args.parseTechnicalSpecQuery(text));
  const categoryIntent = args.detectCatalogCategoryIntent(text);
  const guidedNeed = isGuidedNeedDiscoveryText(text);
  const compatibilityQ = /(sirve|sirven|me sirve|funciona|funcionan|aplica|aplican|para\s+oro|para\s+joyeria|para\s+joyeria|para\s+laboratorio|para\s+alimentos|si\s+o\s+no)/.test(t) && /\?/.test(text);
  const useExplanationQ = /(para\s+que\s+sirven?|que\s+uso\s+tienen|para\s+que\s+se\s+usan)/.test(t) && /(balanza|balanzas|bascula|basculas)/.test(t);
  const appUpdate = /(para\s+oro|para\s+joyeria|para\s+joyeria|para\s+laboratorio|para\s+alimentos|es\s+para\s+|de\s+laboratorio|de\s+joyeria|de\s+joyeria|cuales?\s+de\s+laboratorio|cu[aá]les?\s+de\s+laboratorio|laboratorio\s+tienes|de\s+oro)/.test(t);
  const alternativeReq = /(otra\s+opcion|otra\s+opcion|otro\s+modelo|mas\s+econom|mas\s+econ|mas\s+resol|mas\s+resol|mas\s+capacidad|mas\s+capacidad|alternativ|mas\s+opcion|mas\s+opcion|mas\s+opciones|mas\s+opciones)/.test(t);

  if (args.activeMenuType && isMenuSelectionInput(text)) return "menu_selection";
  if (guidedNeed) return "guided_need_discovery";
  if (useExplanationQ) return "use_explanation_question";
  if (compatibilityQ) return "compatibility_question";
  if (hasTechnical) return "technical_spec_input";
  if (alternativeReq) return "alternative_request";
  if (args.asksQuoteIntent(text) || args.isPriceIntent(text)) return "pricing_request";
  if (/^(si|sí|dale|ok|de\s+una|cotizar|cotizacion|cotizacion|1)$/.test(t)) return "quote_confirmation";
  if (args.looksLikeBillingData(text)) return "billing_data_input";
  if (categoryIntent && normalizeText(String(categoryIntent || "")) !== normalizeText(String(args.rememberedCategory || ""))) return "category_switch";
  if (appUpdate) return "application_update";
  return "fallback_unclear";
}

export function updateConversationSlots(args: {
  previousMemory: Record<string, any>;
  text: string;
  awaiting: string;
  pendingOptions: any[];
  selectedModel: string;
  parseLooseTechnicalHint: (text: string) => any;
  mergeLooseSpecWithMemory: (base: { capacityG: number; readabilityG: number }, parsed: any) => { capacityG: number; readabilityG: number };
  detectTargetApplication: (text: string) => string;
}): { slots: ConversationSlots; patch: Record<string, any> } {
  const prev = args.previousMemory || {};
  const parsed = args.parseLooseTechnicalHint(args.text);
  const merged = args.mergeLooseSpecWithMemory(
    {
      capacityG: Number(prev.strict_filter_capacity_g || prev.strict_partial_capacity_g || prev.target_capacity_g || 0),
      readabilityG: Number(prev.strict_filter_readability_g || prev.strict_partial_readability_g || prev.target_readability_g || 0),
    },
    parsed
  );
  const application = args.detectTargetApplication(args.text) || String(prev.target_application || "");
  const industry = application === "joyeria_oro" ? "joyeria" : application;
  const activeMenu = buildActiveMenuState({ awaiting: args.awaiting, pendingOptions: args.pendingOptions, selectedModel: args.selectedModel });
  const lastRecommended = (Array.isArray(args.pendingOptions) ? args.pendingOptions : [])
    .map((o: any) => String(o?.name || o?.raw_name || "").trim())
    .filter(Boolean)
    .slice(0, 20);

  const slots: ConversationSlots = {
    product_type: String(prev.product_type || prev.last_category_intent || "balanza").trim(),
    target_capacity_g: Number(merged.capacityG || 0),
    target_readability_g: Number(merged.readabilityG || 0),
    target_application: application,
    target_industry: String(industry || prev.target_industry || "").trim(),
    current_model: String(args.selectedModel || prev.current_model || prev.last_selected_product_name || "").trim(),
    current_stage: String(args.awaiting || prev.current_stage || "").trim(),
    active_menu_type: activeMenu.type,
    active_menu_options: activeMenu.options,
    active_menu_context: activeMenu.context,
    last_recommended_models: lastRecommended.length ? lastRecommended : (Array.isArray(prev.last_recommended_models) ? prev.last_recommended_models : []),
  };

  const patch: Record<string, any> = {
    product_type: slots.product_type,
    target_capacity_g: slots.target_capacity_g > 0 ? slots.target_capacity_g : (Number(prev.target_capacity_g || 0) || ""),
    target_readability_g: slots.target_readability_g > 0 ? slots.target_readability_g : (Number(prev.target_readability_g || 0) || ""),
    target_application: slots.target_application || prev.target_application || "",
    target_industry: slots.target_industry || prev.target_industry || "",
    current_model: slots.current_model || "",
    current_stage: slots.current_stage || "",
    active_menu_type: slots.active_menu_type || "",
    active_menu_options: slots.active_menu_options,
    active_menu_context: slots.active_menu_context,
    last_recommended_models: slots.last_recommended_models,
  };

  return { slots, patch };
}

export function buildCompatibilityAnswer(args: {
  text: string;
  slots: ConversationSlots;
  pendingOptions: any[];
  detectTargetApplication: (text: string) => string;
}): string {
  const app = args.detectTargetApplication(args.text) || args.slots.target_application || "uso indicado";
  const options = Array.isArray(args.pendingOptions) ? args.pendingOptions : [];
  const readable = options.map((o: any) => {
    const name = String(o?.name || o?.raw_name || "");
    const m = name.match(/res\s*:?\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg)/i);
    const value = m ? Number(String(m[1] || "").replace(",", ".")) : 0;
    const unit = String(m?.[2] || "g").toLowerCase();
    const g = unit === "kg" ? value * 1000 : unit === "mg" ? value / 1000 : value;
    return { option: o, readabilityG: g > 0 ? g : 999 };
  });
  const suitable = readable.filter((x) => {
    if (app === "joyeria_oro") return x.readabilityG <= 0.01;
    if (app === "laboratorio") return x.readabilityG <= 0.1;
    if (app === "alimentos") return x.readabilityG <= 1;
    return x.readabilityG <= 0.1;
  });

  if (!options.length) {
    return "Si, depende del modelo y de la precision que necesites para ese uso. Si me confirmas capacidad y resolucion objetivo, te digo exactamente cual te sirve.";
  }

  if (suitable.length) {
    return [
      `Si, para ${app.replace(/_/g, " ")} si hay opciones que pueden servir en el listado actual.`,
      `Las mas adecuadas por precision son: ${suitable.slice(0, 3).map((x) => String(x.option?.code || "")).filter(Boolean).join(", ") || "las de mayor precision"}.`,
      "Si quieres, te indico la mejor y luego seguimos con ficha tecnica o cotizacion.",
    ].join("\n");
  }

  return [
    `No del todo: para ${app.replace(/_/g, " ")} las opciones actuales no son las ideales por precision.`,
    "Te puedo proponer alternativas mas finas sin perder tu contexto tecnico.",
    "Si quieres, te muestro 3 recomendadas ahora.",
  ].join("\n");
}
