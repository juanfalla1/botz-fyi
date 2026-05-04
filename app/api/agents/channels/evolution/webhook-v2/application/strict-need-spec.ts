export function applyRememberedAlternativesNeedSpec(args: {
  strictReply: string;
  textNorm: string;
  previousMemory?: Record<string, any>;
  strictMemory: Record<string, any>;
  baseScopedRows: any[];
  prioritizeTechnicalRows: (rows: any[], spec: { capacityG: number; readabilityG: number }) => { orderedRows: any[] };
  filterReasonableTechnicalRows: (rows: any[], spec: { capacityG: number; readabilityG: number }) => any[];
  filterNearbyTechnicalRows: (rows: any[], spec: { capacityG: number; readabilityG: number }) => any[];
  buildNumberedProductOptions: (rows: any[], maxItems?: number) => Array<{ code: string; name: string }>;
  formatSpecNumber: (value: number) => string;
}): string {
  if (String(args.strictReply || "").trim()) return args.strictReply;

  const asksAlternativesNow =
    /\b(alternativas?|opciones?)\b/.test(args.textNorm) ||
    /(dame|muestrame|mu[eé]strame|quiero)\s+.*(alternativas?|opciones?)/.test(args.textNorm);
  const rememberedCap = Number(args.previousMemory?.strict_filter_capacity_g || args.previousMemory?.strict_partial_capacity_g || 0);
  const rememberedRead = Number(args.previousMemory?.strict_filter_readability_g || args.previousMemory?.strict_partial_readability_g || 0);
  if (!(asksAlternativesNow && rememberedCap > 0 && rememberedRead > 0)) return args.strictReply;

  const prioritized = args.prioritizeTechnicalRows(args.baseScopedRows, {
    capacityG: rememberedCap,
    readabilityG: rememberedRead,
  });
  const baseRows = (prioritized.orderedRows.length ? prioritized.orderedRows : args.baseScopedRows) as any[];
  const compatibleRows = args.filterReasonableTechnicalRows(baseRows, {
    capacityG: rememberedCap,
    readabilityG: rememberedRead,
  });
  const options = args.buildNumberedProductOptions((compatibleRows || []) as any[], 8);
  if (options.length) {
    args.strictMemory.pending_product_options = options;
    args.strictMemory.pending_family_options = [];
    args.strictMemory.awaiting_action = "strict_choose_model";
    args.strictMemory.strict_model_offset = 0;
    args.strictMemory.strict_filter_capacity_g = rememberedCap;
    args.strictMemory.strict_filter_readability_g = rememberedRead;
    return [
      `Perfecto. Para ${args.formatSpecNumber(rememberedCap)} g x ${args.formatSpecNumber(rememberedRead)} g, estas son alternativas reales del catálogo:`,
      ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
      "",
      "Elige con letra o número (A/1), o escribe 'más'.",
    ].join("\n");
  }

  const nearbyRows = args.filterNearbyTechnicalRows(baseRows, {
    capacityG: rememberedCap,
    readabilityG: rememberedRead,
  });
  const nearbyOptions = args.buildNumberedProductOptions((nearbyRows || []).slice(0, 8) as any[], 8);
  if (nearbyOptions.length) {
    args.strictMemory.pending_product_options = nearbyOptions;
    args.strictMemory.pending_family_options = [];
    args.strictMemory.awaiting_action = "strict_choose_model";
    args.strictMemory.strict_model_offset = 0;
    args.strictMemory.strict_filter_capacity_g = rememberedCap;
    args.strictMemory.strict_filter_readability_g = rememberedRead;
    return [
      `Para ${args.formatSpecNumber(rememberedCap)} g x ${args.formatSpecNumber(rememberedRead)} g no tengo coincidencia realmente compatible.`,
      "Te comparto las más cercanas disponibles para que compares:",
      ...nearbyOptions.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
      "",
      "Elige una opción (A/1), o ajustamos capacidad/resolución.",
    ].join("\n");
  }

  args.strictMemory.pending_product_options = [];
  args.strictMemory.awaiting_action = "strict_need_spec";
  args.strictMemory.strict_filter_capacity_g = rememberedCap;
  args.strictMemory.strict_filter_readability_g = rememberedRead;
  return `Para ${args.formatSpecNumber(rememberedCap)} g x ${args.formatSpecNumber(rememberedRead)} g no tengo alternativas realmente compatibles en el catálogo activo. Si quieres, ajustamos capacidad/resolución o te propongo otra categoría.`;
}

export function applyCapacityRangeNeedSpec(args: {
  strictReply: string;
  capacityRange: { minG: number; maxG: number } | null;
  strictMemory: Record<string, any>;
  baseScopedRows: any[];
  filterRowsByCapacityRange: (rows: any[], range: { minG: number; maxG: number }) => any[];
  buildNumberedProductOptions: (rows: any[], maxItems?: number) => Array<{ code: string; name: string }>;
  formatSpecNumber: (value: number) => string;
}): string {
  if (String(args.strictReply || "").trim()) return args.strictReply;
  if (!args.capacityRange) return args.strictReply;

  const rangedRows = args.filterRowsByCapacityRange(args.baseScopedRows, args.capacityRange);
  const options = args.buildNumberedProductOptions(rangedRows.slice(0, 8) as any[], 8);
  if (options.length) {
    args.strictMemory.pending_product_options = options;
    args.strictMemory.pending_family_options = [];
    args.strictMemory.awaiting_action = "strict_choose_model";
    args.strictMemory.strict_model_offset = 0;
    return [
      `Perfecto, te entendí un rango de capacidad (${args.formatSpecNumber(args.capacityRange.minG)} g a ${Number.isFinite(args.capacityRange.maxG) ? `${args.formatSpecNumber(args.capacityRange.maxG)} g` : "en adelante"}).`,
      ...options.slice(0, 4).map((o) => `${o.code}) ${o.name}`),
      "",
      "Responde con letra o número (A/1), o envíame también la resolución objetivo para afinar más.",
    ].join("\n");
  }

  args.strictMemory.awaiting_action = "strict_need_spec";
  return "No encontré referencias activas para ese rango de capacidad en el catálogo actual. Si quieres, te muestro alternativas cercanas.";
}

export function applyBasculaAvailabilityNeedSpec(args: {
  strictReply: string;
  text: string;
  strictMemory: Record<string, any>;
  ownerRows: any[];
  isBasculaAvailabilityAsk: (text: string) => boolean;
  scopeStrictBasculaRows: (rows: any[]) => any[];
  buildNumberedProductOptions: (rows: any[], maxItems?: number) => Array<{ code: string; name: string }>;
}): string {
  if (String(args.strictReply || "").trim()) return args.strictReply;
  if (!args.isBasculaAvailabilityAsk(args.text)) return args.strictReply;

  const basculaRows = args.scopeStrictBasculaRows(args.ownerRows);
  const options = args.buildNumberedProductOptions(basculaRows as any[], 8);
  if (options.length) {
    args.strictMemory.pending_product_options = options;
    args.strictMemory.pending_family_options = [];
    args.strictMemory.awaiting_action = "strict_choose_model";
    args.strictMemory.strict_model_offset = 0;
    args.strictMemory.last_category_intent = "basculas";
    return [
      `Perfecto. En catálogo activo tengo ${options.length} báscula(s).`,
      ...options.slice(0, 4).map((o) => `${o.code}) ${o.name}`),
      "",
      "Elige con letra/número (A/1), o escribe 'más'.",
    ].join("\n");
  }

  args.strictMemory.awaiting_action = "strict_need_spec";
  return "Ahora mismo no veo básculas activas en base de datos. Si quieres, dime capacidad y resolución y te confirmo alternativas de otras líneas.";
}

export function applyReadOnlyNeedSpec(args: {
  strictReply: string;
  read: number;
  cap: number;
  strictMemory: Record<string, any>;
  formatSpecNumber: (value: number) => string;
}): string {
  if (String(args.strictReply || "").trim()) return args.strictReply;
  if (!(args.read > 0) || args.cap > 0) return args.strictReply;
  args.strictMemory.awaiting_action = "strict_need_spec";
  return [
    `Perfecto, ya tengo la precisión (${args.formatSpecNumber(args.read)} g).`,
    "Para recomendarte bien, ¿qué capacidad aproximada necesitas?",
    "Opciones rápidas: 500 g, 2 kg, 4.2 kg.",
  ].join("\n");
}

export function applyCapacityOnlyNeedSpec(args: {
  strictReply: string;
  cap: number;
  read: number;
  text: string;
  currentCategory: string;
  strictMemory: Record<string, any>;
  scopedForFastRows: any[];
  isLargestCapacityAsk: (text: string) => boolean;
  buildLargestCapacitySuggestion: (rows: any[]) => { options: Array<{ code: string; name: string }>; reply: string };
  rankCatalogByCapacityOnly: (rows: any[], cap: number) => any[];
  buildNumberedProductOptions: (rows: any[], maxItems?: number) => Array<{ code: string; name: string }>;
  buildPriceRangeLine: (rows: any[]) => string;
  formatSpecNumber: (value: number) => string;
}): string {
  if (String(args.strictReply || "").trim()) return args.strictReply;
  if (!(args.cap > 0) || args.read > 0) return args.strictReply;

  if (args.isLargestCapacityAsk(args.text)) {
    const largest = args.buildLargestCapacitySuggestion(args.scopedForFastRows);
    if (largest.options.length) {
      args.strictMemory.pending_product_options = largest.options;
      args.strictMemory.pending_family_options = [];
      args.strictMemory.awaiting_action = "strict_choose_model";
      args.strictMemory.strict_model_offset = 0;
      return largest.reply;
    }
  }

  if (
    args.currentCategory === "basculas" &&
    Array.isArray(args.scopedForFastRows) &&
    args.scopedForFastRows.length > 0 &&
    args.scopedForFastRows.length <= 4
  ) {
    const rankedCap = args.rankCatalogByCapacityOnly(args.scopedForFastRows, args.cap);
    const rankedRows = rankedCap.length ? rankedCap.map((x: any) => x.row) : args.scopedForFastRows;
    const options = args.buildNumberedProductOptions((rankedRows || []).slice(0, 8) as any[], 8);
    args.strictMemory.pending_product_options = options;
    args.strictMemory.pending_family_options = [];
    args.strictMemory.awaiting_action = "strict_choose_model";
    args.strictMemory.strict_model_offset = 0;
    args.strictMemory.strict_partial_capacity_g = args.cap;
    args.strictMemory.strict_filter_capacity_g = args.cap;
    return [
      `Perfecto. Para básculas activas, en este momento manejo ${options.length} modelo(s).`,
      ...options.map((o) => `${o.code}) ${o.name}`),
      "",
      "Elige una con letra/número (A/1) y te envío ficha o cotización.",
    ].join("\n");
  }

  const priceLine = args.buildPriceRangeLine(args.scopedForFastRows);
  args.strictMemory.awaiting_action = "strict_need_spec";
  return [
    `Perfecto, ya tengo la capacidad (${args.formatSpecNumber(args.cap)} g).`,
    ...(priceLine ? [priceLine] : []),
    "Ahora dime la resolución/precisión objetivo.",
    "Opciones comunes: 1 g, 0.1 g, 0.01 g, 0.001 g.",
  ].join("\n");
}

export function applyExactOrCompatibleNeedSpec(args: {
  strictReply: string;
  cap: number;
  read: number;
  strictMemory: Record<string, any>;
  baseScopedRows: any[];
  formatSpecNumber: (value: number) => string;
  getExactTechnicalMatches: (rows: any[], spec: { capacityG: number; readabilityG: number }) => any[];
  prioritizeTechnicalRows: (rows: any[], spec: { capacityG: number; readabilityG: number }) => { orderedRows: any[] };
  filterReasonableTechnicalRows: (rows: any[], spec: { capacityG: number; readabilityG: number }) => any[];
  buildNumberedProductOptions: (rows: any[], maxItems?: number) => Array<{ code: string; name: string }>;
}): string {
  if (String(args.strictReply || "").trim()) return args.strictReply;
  if (!(args.cap > 0) || !(args.read > 0)) return args.strictReply;

  args.strictMemory.strict_spec_query = `${args.formatSpecNumber(args.cap)} g x ${args.formatSpecNumber(args.read)} g`;
  args.strictMemory.strict_filter_capacity_g = Number(args.cap || 0);
  args.strictMemory.strict_filter_readability_g = Number(args.read || 0);
  args.strictMemory.strict_partial_capacity_g = "";
  args.strictMemory.strict_partial_readability_g = "";

  const exactRows = args.getExactTechnicalMatches(args.baseScopedRows, { capacityG: args.cap, readabilityG: args.read });
  if (exactRows.length) {
    const options = args.buildNumberedProductOptions(exactRows.slice(0, 8) as any[], 8);
    args.strictMemory.pending_product_options = options;
    args.strictMemory.pending_family_options = [];
    args.strictMemory.awaiting_action = "strict_choose_model";
    args.strictMemory.strict_model_offset = 0;
    return [
      `Sí, tengo coincidencias exactas para ${args.strictMemory.strict_spec_query}.`,
      ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
      "",
      "Responde con letra o número y te envío ficha técnica o cotización.",
    ].join("\n");
  }

  const prioritized = args.prioritizeTechnicalRows(args.baseScopedRows, { capacityG: args.cap, readabilityG: args.read });
  const compatibleRows = args.filterReasonableTechnicalRows((prioritized.orderedRows || []) as any[], { capacityG: args.cap, readabilityG: args.read });
  const options = args.buildNumberedProductOptions((compatibleRows || []).slice(0, 8) as any[], 8);
  args.strictMemory.pending_product_options = options;
  args.strictMemory.pending_family_options = [];
  args.strictMemory.awaiting_action = "strict_choose_model";
  args.strictMemory.strict_model_offset = 0;
  if (!options.length) {
    args.strictMemory.pending_product_options = [];
    args.strictMemory.awaiting_action = "strict_need_spec";
    return `Para ${args.strictMemory.strict_spec_query} no tengo opciones realmente compatibles en el catálogo activo. Si quieres, ajustamos capacidad/resolución o te propongo otra categoría.`;
  }

  return [
    `No encontré coincidencia exacta para ${args.strictMemory.strict_spec_query}.`,
    "Sí tengo estas opciones cercanas:",
    ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
    "",
    "Si quieres, elige una opción o te ayudo a ajustar la especificación.",
  ].join("\n");
}

export function applyChooseActionTechnicalHint(args: {
  strictReply: string;
  awaiting: string;
  wantsQuote: boolean;
  wantsSheet: boolean;
  text: string;
  strictMemory: Record<string, any>;
  previousMemory?: Record<string, any>;
  baseScopedRows: any[];
  actionScopedRows: any[];
  technicalHintInAction: { capacityG?: number; readabilityG?: number } | null;
  isLargestCapacityAsk: (text: string) => boolean;
  buildLargestCapacitySuggestion: (rows: any[]) => { options: Array<{ code: string; name: string }>; reply: string };
  buildPriceRangeLine: (rows: any[]) => string;
  formatSpecNumber: (value: number) => string;
  mergeLooseSpecWithMemory: (base: { capacityG: number; readabilityG: number }, incoming: any) => { capacityG: number; readabilityG: number };
  getExactTechnicalMatches: (rows: any[], spec: { capacityG: number; readabilityG: number }) => any[];
  prioritizeTechnicalRows: (rows: any[], spec: { capacityG: number; readabilityG: number }) => { orderedRows: any[] };
  buildNumberedProductOptions: (rows: any[], maxItems?: number) => Array<{ code: string; name: string }>;
}): string {
  if (String(args.strictReply || "").trim()) return args.strictReply;
  if (args.awaiting !== "strict_choose_action" || args.wantsQuote || args.wantsSheet) return args.strictReply;

  const technicalCapInAction = Number((args.technicalHintInAction as any)?.capacityG || 0);
  const technicalReadInAction = Number((args.technicalHintInAction as any)?.readabilityG || 0);
  if (!(technicalCapInAction > 0 || technicalReadInAction > 0)) return args.strictReply;

  const mergedTechnical = args.mergeLooseSpecWithMemory(
    {
      capacityG: Number(args.previousMemory?.strict_filter_capacity_g || args.previousMemory?.strict_partial_capacity_g || 0),
      readabilityG: Number(args.previousMemory?.strict_filter_readability_g || args.previousMemory?.strict_partial_readability_g || 0),
    },
    args.technicalHintInAction
  );
  const mergedCap = Number(mergedTechnical.capacityG || 0);
  const mergedRead = Number(mergedTechnical.readabilityG || 0);
  args.strictMemory.strict_partial_capacity_g = mergedCap > 0 ? mergedCap : "";
  args.strictMemory.strict_partial_readability_g = mergedRead > 0 ? mergedRead : "";

  if (mergedCap > 0 && !(mergedRead > 0)) {
    if (args.isLargestCapacityAsk(args.text)) {
      const largest = args.buildLargestCapacitySuggestion(args.baseScopedRows);
      if (largest.options.length) {
        args.strictMemory.pending_product_options = largest.options;
        args.strictMemory.pending_family_options = [];
        args.strictMemory.awaiting_action = "strict_choose_model";
        args.strictMemory.strict_model_offset = 0;
        return largest.reply;
      }
    }
    const priceLine = args.buildPriceRangeLine(args.actionScopedRows);
    args.strictMemory.awaiting_action = "strict_need_spec";
    return [
      `Perfecto, ya tengo la capacidad (${args.formatSpecNumber(mergedCap)} g).`,
      ...(priceLine ? [priceLine] : []),
      "Ahora dime la resolución/precisión objetivo.",
      "Opciones comunes: 1 g, 0.1 g, 0.01 g, 0.001 g.",
    ].join("\n");
  }

  if (mergedRead > 0 && !(mergedCap > 0)) {
    args.strictMemory.awaiting_action = "strict_need_spec";
    return [
      `Perfecto, ya tengo la precisión (${args.formatSpecNumber(mergedRead)} g).`,
      "Para recomendarte bien, ¿qué capacidad aproximada necesitas?",
      "Opciones rápidas: 500 g, 2 kg, 4.2 kg.",
    ].join("\n");
  }

  if (mergedCap > 0 && mergedRead > 0) {
    args.strictMemory.strict_spec_query = `${args.formatSpecNumber(mergedCap)} g x ${args.formatSpecNumber(mergedRead)} g`;
    args.strictMemory.strict_filter_capacity_g = mergedCap;
    args.strictMemory.strict_filter_readability_g = mergedRead;
    args.strictMemory.strict_partial_capacity_g = "";
    args.strictMemory.strict_partial_readability_g = "";
    const exactRows = args.getExactTechnicalMatches(args.actionScopedRows, { capacityG: mergedCap, readabilityG: mergedRead });
    const prioritized = args.prioritizeTechnicalRows(args.actionScopedRows, { capacityG: mergedCap, readabilityG: mergedRead });
    const options = args.buildNumberedProductOptions((exactRows.length ? exactRows : (prioritized.orderedRows || [])).slice(0, 8) as any[], 8);
    args.strictMemory.pending_product_options = options;
    args.strictMemory.pending_family_options = [];
    args.strictMemory.awaiting_action = "strict_choose_model";
    args.strictMemory.strict_model_offset = 0;
    return [
      exactRows.length
        ? `Sí, tengo coincidencias exactas para ${args.strictMemory.strict_spec_query}.`
        : `No encontré coincidencia exacta para ${args.strictMemory.strict_spec_query}.`,
      exactRows.length ? "Te comparto las opciones exactas:" : "Sí tengo estas opciones cercanas:",
      ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
      "",
      "Elige con letra o número (A/1), o escribe 'más'.",
    ].join("\n");
  }

  return args.strictReply;
}

export function applyChooseActionFollowupIntent(args: {
  strictReply: string;
  awaiting: string;
  wantsSheet: boolean;
  followupIntent: string | null;
  text: string;
  selectedName: string;
  selectedProduct: any;
  hasSheetCandidate: boolean;
  strictMemory: Record<string, any>;
  previousMemory?: Record<string, any>;
  rememberedCategory?: string;
  ownerRows: any[];
  normalizeText: (value: string) => string;
  extractQuoteRequestedQuantity: (text: string) => number;
  buildQuoteDataIntakePrompt: (intro: string, memory: Record<string, any>) => string;
  familyLabelFromRow: (row: any) => string;
  scopeCatalogRows: (rows: any[], category: string) => any[];
  extractRowTechnicalSpec: (row: any) => { capacityG: number; readabilityG: number };
  prioritizeTechnicalRows: (rows: any[], spec: { capacityG: number; readabilityG: number }) => { orderedRows: any[] };
  buildNumberedProductOptions: (rows: any[], maxItems?: number) => Array<{ code: string; name: string }>;
}): string {
  if (String(args.strictReply || "").trim()) return args.strictReply;
  if (args.awaiting !== "strict_choose_action" || !args.followupIntent || args.wantsSheet) return args.strictReply;

  if (args.followupIntent === "requote_same_model") {
    const qtyRequested = Math.max(1, args.extractQuoteRequestedQuantity(args.text) || Number(args.previousMemory?.quote_quantity || 1) || 1);
    args.strictMemory.quote_quantity = qtyRequested;
    args.strictMemory.awaiting_action = "strict_quote_data";
    return args.buildQuoteDataIntakePrompt(
      `Perfecto. Preparo una nueva cotización para ${args.selectedName} (${qtyRequested} unidad(es)).`,
      args.strictMemory
    );
  }

  const selectedId = String(args.selectedProduct?.id || "").trim();
  const selectedNorm = args.normalizeText(args.selectedName);
  const selectedSpec = args.extractRowTechnicalSpec(args.selectedProduct);
  const selectedBrand = args.normalizeText(String(args.selectedProduct?.brand || ""));
  const familyLabel = String(args.previousMemory?.strict_family_label || args.familyLabelFromRow(args.selectedProduct) || "").trim();
  const categoryScoped = args.rememberedCategory ? args.scopeCatalogRows(args.ownerRows as any, args.rememberedCategory) : args.ownerRows;
  const familyScoped = familyLabel
    ? categoryScoped.filter((r: any) => args.normalizeText(args.familyLabelFromRow(r)) === args.normalizeText(familyLabel))
    : categoryScoped;
  const basePoolRaw = (familyScoped.length >= 3 ? familyScoped : categoryScoped) as any[];
  const basePool = basePoolRaw.filter((r: any) => {
    const rid = String(r?.id || "").trim();
    const rname = args.normalizeText(String(r?.name || ""));
    if (selectedId && rid && selectedId === rid) return false;
    if (!selectedId && selectedNorm && rname && selectedNorm === rname) return false;
    return true;
  });

  const byPriceAsc = (rows: any[]) => {
    return [...rows].sort((a: any, b: any) => {
      const aPrice = Number(a?.base_price_usd || 0);
      const bPrice = Number(b?.base_price_usd || 0);
      if (!(aPrice > 0) && !(bPrice > 0)) return 0;
      if (!(aPrice > 0)) return 1;
      if (!(bPrice > 0)) return -1;
      return aPrice - bPrice;
    });
  };

  let rankedRows = [...basePool];
  let intro = "Claro, aquí tienes alternativas para el mismo uso:";
  const textFollow = args.normalizeText(String(args.text || ""));
  const wantsBetterResolution = /(mayor\s+resolucion|mejor\s+resolucion|mas\s+resolucion|más\s+resolucion|mas\s+precision|más\s+precision|mejor\s+precision)/.test(textFollow);
  const wantsLowerResolution = /(menor\s+resolucion|menos\s+precision|menor\s+precision)/.test(textFollow);

  if (args.followupIntent === "alternative_same_need" && (wantsBetterResolution || wantsLowerResolution)) {
    const readTarget = Number(selectedSpec?.readabilityG || 0);
    if (readTarget > 0) {
      const readRows = basePool
        .map((r: any) => ({ row: r, read: Number(args.extractRowTechnicalSpec(r)?.readabilityG || 0) }))
        .filter((x: any) => x.read > 0)
        .filter((x: any) => wantsBetterResolution ? x.read < readTarget : x.read > readTarget)
        .sort((a: any, b: any) => Math.abs(a.read - readTarget) - Math.abs(b.read - readTarget));
      rankedRows = readRows.map((x: any) => x.row);
    }
    intro = wantsBetterResolution
      ? "Perfecto, aquí tienes opciones con mejor resolución (más precisión):"
      : "Perfecto, aquí tienes opciones con menor resolución:";
  } else if (args.followupIntent === "alternative_lower_price") {
    intro = "Perfecto, aquí tienes opciones más económicas:";
    const selectedPrice = Number(args.selectedProduct?.base_price_usd || 0);
    const priced = byPriceAsc(basePool).filter((r: any) => Number(r?.base_price_usd || 0) > 0);
    const cheaper = selectedPrice > 0 ? priced.filter((r: any) => Number(r?.base_price_usd || 0) < selectedPrice) : [];
    rankedRows = cheaper.length ? cheaper : priced;
  } else if (args.followupIntent === "alternative_higher_capacity" || args.followupIntent === "alternative_lower_capacity") {
    const capTarget = Number(selectedSpec?.capacityG || 0);
    intro = args.followupIntent === "alternative_higher_capacity"
      ? "Perfecto, aquí tienes opciones de mayor capacidad:"
      : "Perfecto, aquí tienes opciones de menor capacidad:";
    if (capTarget > 0) {
      const capRows = basePool
        .map((r: any) => ({ row: r, cap: Number(args.extractRowTechnicalSpec(r)?.capacityG || 0) }))
        .filter((x: any) => x.cap > 0)
        .filter((x: any) => args.followupIntent === "alternative_higher_capacity" ? x.cap > capTarget : x.cap < capTarget)
        .sort((a: any, b: any) => Math.abs(a.cap - capTarget) - Math.abs(b.cap - capTarget));
      rankedRows = capRows.map((x: any) => x.row);
    }
  } else if (args.followupIntent === "alternative_other_brand") {
    const otherBrands = basePool.filter((r: any) => {
      const brand = args.normalizeText(String(r?.brand || ""));
      return brand && selectedBrand && brand !== selectedBrand;
    });
    if (otherBrands.length) {
      rankedRows = otherBrands;
      intro = "Perfecto, aquí tienes alternativas de otra marca:";
    } else {
      intro = "En este canal solo cotizo catálogo OHAUS. Igual te comparto alternativas similares dentro de OHAUS:";
      if (selectedSpec.capacityG > 0 && selectedSpec.readabilityG > 0) {
        rankedRows = args.prioritizeTechnicalRows(basePool, {
          capacityG: selectedSpec.capacityG,
          readabilityG: selectedSpec.readabilityG,
        }).orderedRows;
      }
    }
  } else if (selectedSpec.capacityG > 0 && selectedSpec.readabilityG > 0) {
    rankedRows = args.prioritizeTechnicalRows(basePool, {
      capacityG: selectedSpec.capacityG,
      readabilityG: selectedSpec.readabilityG,
    }).orderedRows;
  }

  const mergedRows: any[] = [];
  const seen = new Set<string>();
  for (const row of [...rankedRows, ...basePool]) {
    const key = String(row?.id || "").trim() || args.normalizeText(String(row?.name || ""));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    mergedRows.push(row);
    if (mergedRows.length >= 5) break;
  }

  const options = args.buildNumberedProductOptions(mergedRows as any[], 5);
  if (options.length) {
    args.strictMemory.pending_product_options = options;
    args.strictMemory.last_recommended_options = options;
    args.strictMemory.awaiting_action = "strict_choose_model";
    args.strictMemory.strict_model_offset = 0;
    args.strictMemory.strict_family_label = familyLabel;
    return [
      intro,
      ...options.map((o) => `${o.code}) ${o.name}`),
      "",
      "Elige con letra o número (A/1), o escribe 'más'.",
    ].join("\n");
  }

  return "No encontré alternativas con precio activo en este momento para ese criterio. Si quieres, te muestro el listado completo del grupo.";
}

export function applyChooseActionCategoryAndQuoteChoices(args: {
  strictReply: string;
  awaiting: string;
  wantsQuote: boolean;
  wantsSheet: boolean;
  text: string;
  textNorm: string;
  selectedName: string;
  selectedProduct: any;
  strictMemory: Record<string, any>;
  previousMemory?: Record<string, any>;
  rememberedCategory?: string;
  ownerRows: any[];
  followupIntent: string | null;
  asksAnotherQuote: boolean;
  anotherQuoteChoice: string | null;
  categoryIntentInAction: string | null;
  isCategorySwitchInAction: boolean;
  appHintInAction: string;
  asksApplicationRecommendationsNow: boolean;
  technicalCapInAction: number;
  technicalReadInAction: number;
  normalizeText: (value: string) => string;
  buildAnotherQuotePrompt: () => string;
  buildAdvisorMiniAgendaPrompt: () => string;
  buildQuoteDataIntakePrompt: (intro: string, memory: Record<string, any>) => string;
  buildNoActiveCatalogEscalationMessage: (label: string) => string;
  extractQuoteRequestedQuantity: (text: string) => number;
  maxReadabilityForApplication: (app: string) => number;
  formatSpecNumber: (value: number) => string;
  extractRowTechnicalSpec: (row: any) => { capacityG: number; readabilityG: number };
  scopeCatalogRows: (rows: any[], category: string) => any[];
  buildNumberedProductOptions: (rows: any[], maxItems?: number) => Array<{ code: string; name: string }>;
  buildNumberedFamilyOptions: (rows: any[], maxItems?: number) => Array<{ code: string; label: string; count: number }>;
}): { strictReply: string; followupIntent: string | null } {
  let strictReply = String(args.strictReply || "");
  let followupIntent = args.followupIntent;

  if (
    !String(strictReply).trim() &&
    args.awaiting === "strict_choose_action" &&
    (args.appHintInAction || (args.asksApplicationRecommendationsNow && String(args.previousMemory?.target_application || "").trim())) &&
    !args.wantsQuote &&
    !args.wantsSheet &&
    !(args.technicalCapInAction > 0 || args.technicalReadInAction > 0)
  ) {
    const effectiveApp = args.appHintInAction || String(args.previousMemory?.target_application || "").trim();
    args.strictMemory.target_application = effectiveApp;
    args.strictMemory.target_industry = effectiveApp === "joyeria_oro" ? "joyeria" : effectiveApp;
    const selectedSpec = args.extractRowTechnicalSpec(args.selectedProduct);
    const selectedRead = Number(selectedSpec?.readabilityG || 0);
    const maxRead = args.maxReadabilityForApplication(effectiveApp);
    const selectedIsCompatible = selectedRead > 0 && selectedRead <= maxRead;

    if (selectedIsCompatible) {
      strictReply = [
        `Sí, ${args.selectedName} puede servir para ${effectiveApp.replace(/_/g, " ")} por precisión (${args.formatSpecNumber(selectedRead)} g).`,
        "Si quieres, seguimos con 1) cotización o 2) ficha técnica.",
      ].join("\n");
    } else {
      const categoryScoped = args.rememberedCategory ? args.scopeCatalogRows(args.ownerRows as any, args.rememberedCategory) : args.ownerRows;
      const capTarget = Number(args.previousMemory?.strict_filter_capacity_g || selectedSpec?.capacityG || 0);
      const rowsByRead = categoryScoped
        .filter((r: any) => {
          const rs = args.extractRowTechnicalSpec(r);
          const rr = Number(rs?.readabilityG || 0);
          return rr > 0 && rr <= maxRead;
        })
        .sort((a: any, b: any) => {
          const ar = Number(args.extractRowTechnicalSpec(a)?.readabilityG || 999);
          const br = Number(args.extractRowTechnicalSpec(b)?.readabilityG || 999);
          const ac = Number(args.extractRowTechnicalSpec(a)?.capacityG || 0);
          const bc = Number(args.extractRowTechnicalSpec(b)?.capacityG || 0);
          const ad = capTarget > 0 ? Math.abs(ac - capTarget) : 0;
          const bd = capTarget > 0 ? Math.abs(bc - capTarget) : 0;
          return ad - bd || ar - br;
        });
      const options = args.buildNumberedProductOptions(rowsByRead.slice(0, 8) as any[], 8);
      if (options.length) {
        args.strictMemory.pending_product_options = options;
        args.strictMemory.pending_family_options = [];
        args.strictMemory.awaiting_action = "strict_choose_model";
        args.strictMemory.strict_model_offset = 0;
        strictReply = [
          `No del todo: ${args.selectedName} no es ideal para ${effectiveApp.replace(/_/g, " ")} por su precisión (${args.formatSpecNumber(selectedRead || 0)} g).`,
          "Estas opciones sí son más adecuadas para ese uso:",
          ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
          "",
          "Elige una con letra/número (A/1), o escribe 'más'.",
        ].join("\n");
      } else {
        strictReply = `No del todo: ${args.selectedName} no es ideal para ${effectiveApp.replace(/_/g, " ")} y no veo opciones activas con esa precisión en este grupo. Si quieres, ajustamos capacidad/resolución.`;
      }
    }
  }

  if (args.awaiting === "strict_choose_action" && !followupIntent && !args.wantsQuote && !args.wantsSheet) {
    if (/(no\s+me\s+sirve|no\s+quiero\s+este|otra\s+opcion|otra\s+opción|que\s+otra|qué\s+otra|recomiendame\s+otra|recomiéndame\s+otra|me\s+ofreces\s+otra|me\s+puedes\s+ofrecer\s+otra)/.test(args.textNorm)) {
      followupIntent = "alternative_same_need";
    }
  }
  if (args.awaiting === "strict_choose_action" && !followupIntent && !args.wantsSheet) {
    if (/\b(menor\s+precio|m[aá]s\s+barat|mas\s+barat|econ[oó]mic|economica|economicas)\b/.test(args.textNorm)) {
      followupIntent = "alternative_lower_price";
    }
  }

  if (!String(strictReply).trim() && args.awaiting === "strict_choose_action" && args.isCategorySwitchInAction) {
    const scoped = args.scopeCatalogRows(args.ownerRows as any, String(args.categoryIntentInAction || ""));
    const families = args.buildNumberedFamilyOptions(scoped as any[], 8);
    args.strictMemory.last_category_intent = String(args.categoryIntentInAction || "");
    args.strictMemory.pending_product_options = [];
    args.strictMemory.pending_family_options = families;
    args.strictMemory.awaiting_action = "strict_choose_family";
    strictReply = families.length
      ? [
          `Perfecto, cambiamos la búsqueda a ${String(args.categoryIntentInAction || "catálogo").replace(/_/g, " ")}.`,
          "Elige familia:",
          ...families.map((o) => `${o.code}) ${o.label} (${o.count})`),
          "",
          "Responde con letra o número (A/1).",
        ].join("\n")
      : [args.buildNoActiveCatalogEscalationMessage(String(args.categoryIntentInAction || "esa categoria").replace(/_/g, " "))].join("\n");
    if (!families.length) args.strictMemory.awaiting_action = "conversation_followup";
  } else if (!String(strictReply).trim() && args.awaiting === "strict_choose_action" && args.asksAnotherQuote && !args.anotherQuoteChoice && !followupIntent && !args.wantsSheet) {
    strictReply = args.buildAnotherQuotePrompt();
  } else if (!String(strictReply).trim() && args.awaiting === "strict_choose_action" && args.anotherQuoteChoice === "advisor") {
    strictReply = args.buildAdvisorMiniAgendaPrompt();
    args.strictMemory.awaiting_action = "advisor_meeting_slot";
  } else if (!String(strictReply).trim() && args.awaiting === "strict_choose_action" && args.anotherQuoteChoice === "same_model") {
    const qtyRequested = Math.max(1, args.extractQuoteRequestedQuantity(args.text) || Number(args.previousMemory?.quote_quantity || 1) || 1);
    args.strictMemory.quote_quantity = qtyRequested;
    args.strictMemory.awaiting_action = "strict_quote_data";
    strictReply = args.buildQuoteDataIntakePrompt(
      `Perfecto. Preparo una nueva cotización para ${args.selectedName} (${qtyRequested} unidad(es)).`,
      args.strictMemory
    );
  } else if (!String(strictReply).trim() && args.awaiting === "strict_choose_action" && args.anotherQuoteChoice === "other_model") {
    followupIntent = "alternative_same_need";
  } else if (!String(strictReply).trim() && args.awaiting === "strict_choose_action" && args.anotherQuoteChoice === "cheaper") {
    followupIntent = "alternative_lower_price";
  }

  return { strictReply, followupIntent };
}

export function applyChooseActionUseCaseAndBudgetFollowup(args: {
  strictReply: string;
  awaiting: string;
  wantsQuote: boolean;
  wantsSheet: boolean;
  text: string;
  selectedName: string;
  selectedProduct: any;
  strictMemory: Record<string, any>;
  previousMemory?: Record<string, any>;
  rememberedCategory?: string;
  ownerRows: any[];
  lastRecommendedOptions: any[];
  isUseCaseApplicabilityIntent: (text: string) => boolean;
  isBudgetVisibilityFollowup: (text: string) => boolean;
  buildTechnicalSummary: (row: any, maxLines?: number) => string;
  buildPriceRangeLine: (rows: any[]) => string;
  scopeCatalogRows: (rows: any[], category: string) => any[];
}): string {
  let strictReply = String(args.strictReply || "");
  if (String(strictReply).trim()) return strictReply;

  if (args.isUseCaseApplicabilityIntent(args.text) && !args.wantsQuote && !args.wantsSheet) {
    const technicalSummary = args.buildTechnicalSummary(args.selectedProduct, 6);
    return technicalSummary
      ? [
          `Con base en el catálogo/ficha de ${args.selectedName}, esto es lo que sí tengo confirmado:`,
          technicalSummary,
          "",
          "Para confirmarte si te sirve para ese uso exacto, dime el peso aproximado (mínimo y máximo) y te valido el modelo sin inventar.",
          hasSheetCandidate ? "¿Quieres que te envíe la ficha técnica ahora por este WhatsApp?" : "¿Quieres que te comparta la ficha técnica/disponibilidad por este WhatsApp?",
        ].join("\n")
      : [
          `Puedo ayudarte con ${args.selectedName}, pero para no inventar necesito validar el uso con el peso aproximado (mínimo y máximo).`,
          hasSheetCandidate ? "¿Quieres que te envíe la ficha técnica ahora por este WhatsApp?" : "¿Quieres que te comparta la información técnica disponible por este WhatsApp?",
        ].join("\n");
  }

  if (args.awaiting === "strict_choose_action" && args.isBudgetVisibilityFollowup(args.text) && !args.wantsSheet) {
    const effectiveRecommendedPool =
      (Array.isArray(args.strictMemory?.last_recommended_options) && args.strictMemory.last_recommended_options.length)
        ? args.strictMemory.last_recommended_options
        : (args.lastRecommendedOptions.length
          ? args.lastRecommendedOptions
          : (Array.isArray(args.previousMemory?.last_recommended_options) ? args.previousMemory.last_recommended_options : []));
    const idSet = new Set(
      (effectiveRecommendedPool || [])
        .map((o: any) => String(o?.id || "").trim())
        .filter(Boolean)
    );
    const scopedRows = idSet.size
      ? (args.ownerRows as any[]).filter((r: any) => idSet.has(String(r?.id || "").trim()))
      : (args.rememberedCategory ? args.scopeCatalogRows(args.ownerRows as any, args.rememberedCategory) : args.ownerRows);
    const priceLine = args.buildPriceRangeLine(scopedRows as any[]);
    return priceLine
      ? [
          `Claro. ${priceLine}`,
          "Si quieres continuar, responde: 1) Cotización o 2) Ficha técnica.",
        ].join("\n")
      : "Claro, en este grupo no tengo precio visible en BD para estimar presupuesto ahora mismo. Si quieres, te genero cotización directa con la referencia seleccionada.";
  }

  return strictReply;
}

export function applyCategoryInventoryIntentFlow(args: any): string {
  let strictReply = String(args.strictReply || "");
  if (String(strictReply).trim()) return strictReply;
  if (!(args.categoryIntent || args.isInventoryInfoIntent(args.text))) return strictReply;

  const scoped = args.categoryIntent ? args.scopeCatalogRows(args.ownerRows as any, args.categoryIntent) : args.ownerRows;
  const familyOptions = args.buildNumberedFamilyOptions(scoped as any[], 8);
  args.strictMemory.pending_family_options = familyOptions;
  args.strictMemory.pending_product_options = [];
  args.strictMemory.last_category_intent = String(args.categoryIntent || "");

  const useCaseDrivenRequest =
    args.isRecommendationIntent(args.text) ||
    args.isUseCaseApplicabilityIntent(args.text) ||
    /joyeria|joyería|oro/.test(args.normalizeText(args.text));

  const buildFamilyPickerReply = () => {
    args.strictMemory.awaiting_action = "strict_choose_family";
    const familyScopedTotal = familyOptions.reduce((acc: number, o: any) => acc + Number(o?.count || 0), 0);
    const priceRangeLine = args.normalizeText(String(args.categoryIntent || "")) === "balanzas" ? args.buildPriceRangeLine(scoped as any[]) : "";
    return [
      `Sí, tenemos ${familyScopedTotal || scoped.length} referencias en la categoría ${String((args.categoryIntent || "catalogo").replace(/_/g, " "))}.`,
      "Primero elige la familia:",
      ...familyOptions.map((o: any) => `${o.code}) ${o.label} (${o.count})`),
      "",
      ...(priceRangeLine ? [priceRangeLine] : []),
      "Si quieres, también dime qué vas a pesar y su funcionalidad para identificar cuál se adecúa a tu empresa.",
      "Responde con letra o número (ej.: A o 1).",
    ].join("\n");
  };

  const buildGuidedNeedReply = () => {
    const options = args.buildNumberedProductOptions(scoped as any[], 8).slice(0, 4);
    args.strictMemory.pending_product_options = options;
    args.strictMemory.pending_family_options = [];
    args.strictMemory.awaiting_action = options.length ? "strict_choose_model" : "strict_need_spec";
    return [
      "Sí, para esa necesidad sí tenemos opciones y te guío para recomendarte bien.",
      "Para afinar, dime qué peso aproximado manejas y si buscas alta precisión o uso general.",
      ...(options.length
        ? ["", "Opciones para empezar:", ...options.map((o: any) => `${o.code}) ${o.name}`), "", "Si quieres, elige A/1 y te envío ficha o cotización."]
        : []),
    ].join("\n");
  };

  if (!familyOptions.length) {
    args.strictMemory.awaiting_action = "conversation_followup";
    return args.buildNoActiveCatalogEscalationMessage(String((args.categoryIntent || "esa categoria").replace(/_/g, " ")));
  }

  if (useCaseDrivenRequest) {
    const inferred = args.inferFamilyFromUseCase(args.text, familyOptions);
    if (inferred) {
      const familyRows = scoped.filter((r: any) => args.normalizeText(args.familyLabelFromRow(r)) === args.normalizeText(String((inferred as any)?.key || "")));
      const hinted = args.parseLooseTechnicalHint(args.text);
      const rangeHint = args.parseCapacityRangeHint(args.text);
      const hintedCap = Number(hinted?.capacityG || 0);
      const hintedRead = Number(hinted?.readabilityG || 0);
      const familyMaxCap = familyRows.reduce((mx: number, r: any) => Math.max(mx, Number(args.getRowCapacityG(r) || 0)), 0);
      const capacityOutOfFamilyRange = hintedCap > 0 && familyMaxCap > 0 && familyMaxCap < hintedCap * 0.7;
      const baseRowsForRanking = capacityOutOfFamilyRange ? (scoped as any[]) : (familyRows as any[]);

      let recommendedRows = baseRowsForRanking as any[];
      if (hintedCap > 0 && hintedRead > 0) {
        const prioritized = args.prioritizeTechnicalRows(baseRowsForRanking as any[], { capacityG: hintedCap, readabilityG: hintedRead });
        if (prioritized.orderedRows.length) recommendedRows = prioritized.orderedRows as any[];
      } else if (hintedCap > 0) {
        const rankedCap = args.rankCatalogByCapacityOnly(baseRowsForRanking as any[], hintedCap);
        if (rankedCap.length) recommendedRows = rankedCap.map((x: any) => x.row);
      } else if (hintedRead > 0) {
        const rankedRead = args.rankCatalogByReadabilityOnly(baseRowsForRanking as any[], hintedRead);
        if (rankedRead.length) recommendedRows = rankedRead.map((x: any) => x.row);
      }
      if (rangeHint) {
        const ranged = args.filterRowsByCapacityRange(recommendedRows as any[], rangeHint);
        if (ranged.length) recommendedRows = ranged;
      }

      const appProfile = String(args.strictMemory.target_application || args.previousMemory?.target_application || args.detectTargetApplication(args.text) || "").trim();
      const profiledRows = args.applyApplicationProfile(recommendedRows as any[], {
        application: appProfile,
        targetCapacityG: hintedCap || Number(args.previousMemory?.strict_filter_capacity_g || 0),
        targetReadabilityG: hintedRead || Number(args.previousMemory?.strict_filter_readability_g || 0),
        allowFallback: false,
      });
      const allOptions = args.buildNumberedProductOptions(profiledRows as any[], 60);
      const options = allOptions.slice(0, 8);
      args.strictMemory.pending_product_options = options;
      args.strictMemory.pending_family_options = [];
      args.strictMemory.awaiting_action = "strict_choose_model";
      args.strictMemory.strict_family_label = capacityOutOfFamilyRange ? "" : String((inferred as any)?.label || "");
      args.strictMemory.strict_model_offset = 0;
      if (hintedCap > 0) args.strictMemory.strict_filter_capacity_g = hintedCap;
      if (hintedRead > 0) args.strictMemory.strict_filter_readability_g = hintedRead;
      return [
        `Para ese uso te recomiendo empezar con ${String((inferred as any)?.label || "esa familia")}. Modelos sugeridos (${options.length} mostrados${allOptions.length > options.length ? ` de ${allOptions.length}` : ""}):`,
        ...options.map((o: any) => `${o.code}) ${o.name}`),
        "",
        ...(options.length >= 3
          ? [
              "Si quieres cotizar varias referencias (máx. 3), escribe: cotizar opciones 1,2,4.",
              "También puedes responder solo con números: 1,2,4.",
              "También puedes escribir: cotizar modelos PX6202/E, AX2202/E, EXP6202.",
              "",
            ]
          : []),
        allOptions.length > options.length
          ? "Responde con letra o número (ej.: A o 1), o escribe 'más' para ver siguientes."
          : "Responde con letra o número (ej.: A o 1).",
      ].join("\n");
    }

    if (args.isGuidedNeedDiscoveryText(args.text)) {
      return buildGuidedNeedReply();
    }
    return buildFamilyPickerReply();
  }

  if (args.isGuidedNeedDiscoveryText(args.text)) {
    return buildGuidedNeedReply();
  }
  return buildFamilyPickerReply();
}

export function applyTechnicalSpecOptionsFlow(args: {
  strictReply: string;
  text: string;
  selectedProduct: any;
  strictMemory: Record<string, any>;
  ownerRows: any[];
  preParsedSpec?: { capacityG?: number; readabilityG?: number } | null;
  formatSpecNumber: (value: number) => string;
  isTechnicalSpecQuery: (text: string) => boolean;
  parseTechnicalSpecQuery: (text: string) => { capacityG: number; readabilityG: number } | null;
  rankCatalogByTechnicalSpec: (rows: any[], spec: { capacityG: number; readabilityG: number }) => any[];
  getExactTechnicalMatches: (rows: any[], spec: { capacityG: number; readabilityG: number }) => any[];
  prioritizeTechnicalRows: (rows: any[], spec: { capacityG: number; readabilityG: number }) => { orderedRows: any[] };
  buildNumberedProductOptions: (rows: any[], maxItems?: number) => Array<{ code: string; name: string }>;
  noOptionsReply: string;
}): string {
  let strictReply = String(args.strictReply || "");
  if (String(strictReply).trim()) return strictReply;

  const parsedDirect = args.isTechnicalSpecQuery(args.text) && !args.selectedProduct
    ? args.parseTechnicalSpecQuery(args.text)
    : null;
  const spec = parsedDirect || args.preParsedSpec || null;
  if (!spec) return strictReply;

  const cap = Number((spec as any)?.capacityG || 0);
  const read = Number((spec as any)?.readabilityG || 0);
  if (!(cap > 0 && read > 0)) {
    if (parsedDirect) {
      args.strictMemory.awaiting_action = "strict_need_spec";
      return "Te entendí como consulta técnica. Para responder exacto, envíame capacidad y resolución en formato 220 g x 0.0001 g.";
    }
    return strictReply;
  }

  args.strictMemory.strict_spec_query = `${args.formatSpecNumber(cap)} g x ${args.formatSpecNumber(read)} g`;
  args.strictMemory.strict_filter_capacity_g = cap;
  args.strictMemory.strict_filter_readability_g = read;

  const exactRows = args.getExactTechnicalMatches(args.ownerRows as any[], { capacityG: cap, readabilityG: read });
  let sourceRows: any[] = [];
  if (parsedDirect) {
    const ranked = args.rankCatalogByTechnicalSpec(args.ownerRows as any[], { capacityG: cap, readabilityG: read });
    sourceRows = ranked.length ? ranked.map((r: any) => r.row) : (args.ownerRows as any[]);
  } else {
    const prioritized = args.prioritizeTechnicalRows(args.ownerRows as any[], { capacityG: cap, readabilityG: read });
    sourceRows = exactRows.length ? exactRows : (prioritized.orderedRows.length ? prioritized.orderedRows : (args.ownerRows as any[]));
  }

  const options = args.buildNumberedProductOptions(sourceRows as any[], 8);
  if (options.length) {
    args.strictMemory.pending_product_options = options;
    args.strictMemory.pending_family_options = [];
    args.strictMemory.awaiting_action = "strict_choose_model";
    args.strictMemory.strict_model_offset = 0;
    return [
      parsedDirect
        ? `Sí, tengo opciones para ${args.text.trim()}.`
        : (exactRows.length
            ? `Sí, para ${args.strictMemory.strict_spec_query} tengo coincidencias exactas.`
            : `Para ${args.strictMemory.strict_spec_query} no veo coincidencia exacta, pero sí opciones cercanas:`),
      ...options.slice(0, parsedDirect ? 6 : 3).map((o) => `${o.code}) ${o.name}`),
      "",
      parsedDirect
        ? "Responde con letra o número (A/1) y te envío ficha técnica o cotización."
        : "Responde con letra o número (A/1), o escribe 'más'.",
    ].join("\n");
  }

  args.strictMemory.awaiting_action = "strict_need_spec";
  return args.noOptionsReply;
}

export function applyStrictNeedSpecFlow(args: any): string {
  let strictReply = String(args.strictReply || "");
  if (String(strictReply).trim()) return strictReply;
  if (String(args.awaiting || "") !== "strict_need_spec") return strictReply;

  const text = String(args.text || "");
  const textNorm = String(args.textNorm || "");
  const previousMemory = (args.previousMemory || {}) as Record<string, any>;
  const strictMemory = args.strictMemory as Record<string, any>;
  const baseScoped = (args.baseScoped || []) as any[];
  const ownerRows = (args.ownerRows || []) as any[];

  const parsed = args.parseLooseTechnicalHint(text);
  const capacityRange = args.parseCapacityRangeHint(text);
  const asksCategoryMenuNow = args.isExplicitFamilyMenuAsk(text);
  const merged = args.mergeLooseSpecWithMemory(
    {
      capacityG: Number(previousMemory?.strict_partial_capacity_g || previousMemory?.strict_filter_capacity_g || 0),
      readabilityG: Number(previousMemory?.strict_partial_readability_g || previousMemory?.strict_filter_readability_g || 0),
    },
    parsed
  );
  const cap = Number(merged.capacityG || 0);
  const read = Number(merged.readabilityG || 0);
  strictMemory.strict_partial_capacity_g = cap > 0 ? cap : "";
  strictMemory.strict_partial_readability_g = read > 0 ? read : "";

  const guidedProfileInNeedStep = args.detectGuidedBalanzaProfile(text);
  if (guidedProfileInNeedStep) {
    const industrialModeNeed = guidedProfileInNeedStep === "balanza_industrial_portatil_conteo"
      ? (args.detectIndustrialGuidedMode(text) || "estandar")
      : "";
    const options = args.buildGuidedPendingOptions(ownerRows as any[], guidedProfileInNeedStep, industrialModeNeed as any);
    if (options.length) {
      strictMemory.pending_product_options = options;
      strictMemory.pending_family_options = [];
      strictMemory.awaiting_action = options.length ? "strict_choose_model" : "strict_need_spec";
      strictMemory.last_category_intent = "balanzas";
      strictMemory.guided_balanza_profile = guidedProfileInNeedStep;
      strictMemory.guided_industrial_mode = industrialModeNeed;
      strictReply = args.buildGuidedBalanzaReplyWithMode(guidedProfileInNeedStep, industrialModeNeed as any);
    }
  }

  if (!String(strictReply || "").trim() && !(cap > 0) && !(read > 0)) {
    const dimensionHint = args.parseDimensionHint(text);
    if (dimensionHint) {
      const criterionLabel = args.formatDimensionTripletMm(dimensionHint.dimsMm);
      const rankedByDims = args.rankCatalogByDimensions(baseScoped as any[], dimensionHint.dimsMm);
      const exactByDims = rankedByDims
        .filter((x: any) => Number(x?.score || 0) < 2000)
        .map((x: any) => x.row);
      if (exactByDims.length) {
        const options = args.buildNumberedProductOptions(exactByDims.slice(0, 8) as any[], 8);
        strictMemory.pending_product_options = options;
        strictMemory.pending_family_options = [];
        strictMemory.awaiting_action = "strict_choose_model";
        strictMemory.strict_model_offset = 0;
        strictReply = [
          `Sí, tengo opciones activas con dimensiones cercanas a ${criterionLabel}.`,
          ...options.slice(0, 4).map((o: any) => `${o.code}) ${o.name}`),
          "",
          "Elige con letra o número (A/1), o escribe 'más'.",
        ].join("\n");
      } else if (rankedByDims.length) {
        const options = args.buildNumberedProductOptions(rankedByDims.map((x: any) => x.row).slice(0, 8) as any[], 8);
        strictMemory.pending_product_options = options;
        strictMemory.pending_family_options = [];
        strictMemory.awaiting_action = "strict_choose_model";
        strictMemory.strict_model_offset = 0;
        strictReply = [
          `No tengo coincidencia exacta por dimensiones (${criterionLabel}), pero sí estas alternativas cercanas:`,
          ...options.slice(0, 4).map((o: any) => `${o.code}) ${o.name}`),
          "",
          "Elige con letra o número (A/1), o ajustamos dimensión/capacidad.",
        ].join("\n");
      } else {
        strictReply = `No encontré modelos activos con dimensiones ${criterionLabel} en el catálogo actual. Si quieres, te propongo cercanas por capacidad/resolución.`;
        strictMemory.awaiting_action = "strict_need_spec";
      }
    }
  }

  if (!String(strictReply || "").trim()) {
    strictReply = applyRememberedAlternativesNeedSpec({
      strictReply,
      textNorm,
      previousMemory,
      strictMemory,
      baseScopedRows: baseScoped,
      prioritizeTechnicalRows: args.prioritizeTechnicalRows,
      filterReasonableTechnicalRows: args.filterReasonableTechnicalRows,
      filterNearbyTechnicalRows: args.filterNearbyTechnicalRows,
      buildNumberedProductOptions: args.buildNumberedProductOptions,
      formatSpecNumber: args.formatSpecNumber,
    });
  }
  if (!String(strictReply || "").trim()) {
    strictReply = applyCapacityRangeNeedSpec({
      strictReply,
      capacityRange,
      strictMemory,
      baseScopedRows: baseScoped,
      filterRowsByCapacityRange: args.filterRowsByCapacityRange,
      buildNumberedProductOptions: args.buildNumberedProductOptions,
      formatSpecNumber: args.formatSpecNumber,
    });
  }
  if (!String(strictReply || "").trim()) {
    strictReply = applyBasculaAvailabilityNeedSpec({
      strictReply,
      text,
      strictMemory,
      ownerRows,
      isBasculaAvailabilityAsk: args.isBasculaAvailabilityAsk,
      scopeStrictBasculaRows: args.scopeStrictBasculaRows,
      buildNumberedProductOptions: args.buildNumberedProductOptions,
    });
  }
  if (!String(strictReply || "").trim()) {
    strictReply = applyReadOnlyNeedSpec({
      strictReply,
      read,
      cap,
      strictMemory,
      formatSpecNumber: args.formatSpecNumber,
    });
  }
  if (!String(strictReply || "").trim() && cap > 0 && !(read > 0)) {
    const currentCategory = args.normalizeText(String(args.rememberedCategory || previousMemory?.last_category_intent || args.detectCatalogCategoryIntent(text) || ""));
    const scopedForFast = currentCategory ? args.scopeCatalogRows(ownerRows, currentCategory) : ownerRows;
    strictReply = applyCapacityOnlyNeedSpec({
      strictReply,
      cap,
      read,
      text,
      currentCategory,
      strictMemory,
      scopedForFastRows: scopedForFast,
      isLargestCapacityAsk: args.isLargestCapacityAsk,
      buildLargestCapacitySuggestion: args.buildLargestCapacitySuggestion,
      rankCatalogByCapacityOnly: args.rankCatalogByCapacityOnly,
      buildNumberedProductOptions: args.buildNumberedProductOptions,
      buildPriceRangeLine: args.buildPriceRangeLine,
      formatSpecNumber: args.formatSpecNumber,
    });
  }
  if (!String(strictReply || "").trim()) {
    if (!(cap > 0) || !(read > 0)) {
      strictMemory.awaiting_action = "strict_need_spec";
      strictReply = [
        "No entiendo tu solicitud técnica todavía.",
        "Por favor repite con formato válido: capacidad x resolución (ej.: 3000 g x 0.01 g) o modelo exacto.",
      ].join("\n");
    }
    if (!String(strictReply || "").trim()) {
      strictReply = applyExactOrCompatibleNeedSpec({
        strictReply,
        cap,
        read,
        strictMemory,
        baseScopedRows: baseScoped,
        formatSpecNumber: args.formatSpecNumber,
        getExactTechnicalMatches: args.getExactTechnicalMatches,
        prioritizeTechnicalRows: args.prioritizeTechnicalRows,
        filterReasonableTechnicalRows: args.filterReasonableTechnicalRows,
        buildNumberedProductOptions: args.buildNumberedProductOptions,
      });
    }
  }

  return strictReply;
}

export function applyStrictNeedIndustryFlow(args: any): string {
  let strictReply = String(args.strictReply || "");
  if (String(strictReply).trim()) return strictReply;
  if (args.awaiting !== "strict_need_industry") return strictReply;

  const industry = String(args.text || "").trim();
  if (industry.length < 3 || /^(si|ok|listo|dale|de una)$/i.test(industry)) {
    args.strictMemory.awaiting_action = "strict_need_industry";
    return "Para recomendarte el mejor modelo, dime el uso o industria (ej.: laboratorio alimentos, control de calidad, bodega).";
  }

  args.strictMemory.strict_industry = industry;
  const specParsed = args.parseTechnicalSpecQuery(args.prevSpecQuery || String(args.strictMemory.strict_spec_query || ""));
  const ranked = specParsed
    ? args.rankCatalogByTechnicalSpec(args.baseScoped, { capacityG: specParsed.capacityG, readabilityG: specParsed.readabilityG })
    : [];
  const recommendedRows = (ranked.length ? ranked.map((r: any) => r.row) : args.baseScoped).slice(0, 8);
  const options = args.buildNumberedProductOptions(recommendedRows, 8);
  args.strictMemory.pending_product_options = options;
  args.strictMemory.pending_family_options = [];
  args.strictMemory.awaiting_action = "strict_choose_model";
  args.strictMemory.strict_model_offset = 0;
  return [
    `Perfecto. Con ese uso te recomiendo estas opciones${args.strictMemory.strict_spec_query ? ` para ${String(args.strictMemory.strict_spec_query)}` : ""}:`,
    ...options.map((o: any) => `${o.code}) ${o.name}`),
    "",
    "Responde con letra o número (ej.: A o 1).",
  ].join("\n");
}
