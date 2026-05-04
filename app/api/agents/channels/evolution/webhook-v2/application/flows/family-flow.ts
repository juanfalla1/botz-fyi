export function handleStrictChooseFamilyPrimary(args: {
  strictReply: string;
  awaiting: string;
  text: string;
  textNorm: string;
  previousMemory: Record<string, any>;
  strictMemory: Record<string, any>;
  ownerRows: any[];
  rememberedCategory: string;
  normalizeText: (v: string) => string;
  isExplicitFamilyMenuAsk: (t: string) => boolean;
  extractFeatureTerms: (t: string) => string[];
  detectCatalogCategoryIntent: (t: string) => string;
  scopeCatalogRows: (rows: any[], category: string) => any[];
  buildNumberedProductOptions: (rows: any[], maxItems: number) => any[];
  buildNumberedFamilyOptions: (rows: any[], maxItems: number) => any[];
  rankCatalogByFeature: (rows: any[], terms: string[]) => any[];
  familyLabelFromRow: (row: any) => string;
  formatMoney: (value: number) => string;
  buildNoActiveCatalogEscalationMessage: (topic?: string) => string;
  isOptionOnlyReply: (t: string) => boolean;
}): { handled: boolean; strictReply: string } {
  let strictReply = String(args.strictReply || "");
  if (String(strictReply || "").trim()) return { handled: false, strictReply };
  if (args.awaiting !== "strict_choose_family") return { handled: false, strictReply };

  const pendingFamilies = Array.isArray(args.previousMemory?.pending_family_options) ? args.previousMemory.pending_family_options : [];
  const asksCategoryMenuInFamilyStep = args.isExplicitFamilyMenuAsk(args.text);
  const asksCheapestInFamilyStep = /\b(economic|economica|economicas|economico|economicos|mas\s+barat|m[aá]s\s+barat|menor\s+precio|precio\s+bajo)\b/.test(args.textNorm);
  const featureTermsInFamilyStep = args.extractFeatureTerms(args.text);
  const categoryIntentInFamilyStep = args.detectCatalogCategoryIntent(args.text);
  const currentCategoryInFamilyStep = args.normalizeText(String(args.previousMemory?.last_category_intent || args.rememberedCategory || ""));
  const isCategorySwitchInFamilyStep = Boolean(categoryIntentInFamilyStep && args.normalizeText(String(categoryIntentInFamilyStep || "")) !== currentCategoryInFamilyStep);

  if (!pendingFamilies.length) {
    args.strictMemory.awaiting_action = "none";
    strictReply = "En este momento no tengo familias disponibles en esa categoría. Si quieres, dime el modelo exacto (ej.: MB120) y te ayudo.";
    return { handled: true, strictReply };
  }

  if (asksCategoryMenuInFamilyStep) {
    const families = pendingFamilies.length ? pendingFamilies : args.buildNumberedFamilyOptions(args.ownerRows as any[], 8);
    args.strictMemory.pending_family_options = families;
    args.strictMemory.pending_product_options = [];
    args.strictMemory.awaiting_action = "strict_choose_family";
    strictReply = families.length
      ? [
          "Claro. Estas son las familias/categorías activas:",
          ...families.map((f: any) => `${f.code}) ${f.label} (${f.count})`),
          "",
          "Elige una con letra o número (A/1).",
        ].join("\n")
      : "En este momento no tengo familias activas para mostrar en catálogo.";
    return { handled: true, strictReply };
  }

  if (asksCheapestInFamilyStep) {
    const scopedForPrice = currentCategoryInFamilyStep ? args.scopeCatalogRows(args.ownerRows as any[], currentCategoryInFamilyStep) : (args.ownerRows as any[]);
    const pricedRows = (scopedForPrice as any[])
      .filter((r: any) => Number(r?.base_price_usd || 0) > 0)
      .sort((a: any, b: any) => Number(a?.base_price_usd || 0) - Number(b?.base_price_usd || 0));
    const options = args.buildNumberedProductOptions(pricedRows as any[], 8);
    if (options.length) {
      args.strictMemory.pending_product_options = options;
      args.strictMemory.pending_family_options = [];
      args.strictMemory.awaiting_action = "strict_choose_model";
      args.strictMemory.strict_model_offset = 0;
      const topFamily = String(args.familyLabelFromRow(pricedRows[0]) || "N/A").trim();
      strictReply = [
        `Perfecto. Según base de datos, la familia más económica aquí es: ${topFamily}.`,
        "Estas son 4 opciones de menor precio:",
        ...options.slice(0, 4).map((o: any) => `${o.code}) ${o.name}${Number(o.base_price_usd || 0) > 0 ? ` (USD ${args.formatMoney(Number(o.base_price_usd || 0))})` : ""}`),
        "",
        "Responde con letra o número (A/1).",
      ].join("\n");
    } else {
      strictReply = "Ahora mismo no veo productos con precio cargado para calcular las opciones más económicas.";
    }
    return { handled: true, strictReply };
  }

  if (featureTermsInFamilyStep.length > 0 && !args.isOptionOnlyReply(args.text)) {
    const scopedForFeature = currentCategoryInFamilyStep ? args.scopeCatalogRows(args.ownerRows as any[], currentCategoryInFamilyStep) : (args.ownerRows as any[]);
    const rankedByFeature = args.rankCatalogByFeature(scopedForFeature as any[], featureTermsInFamilyStep).slice(0, 8);
    if (rankedByFeature.length) {
      const options = args.buildNumberedProductOptions(rankedByFeature.map((x: any) => x.row).filter(Boolean), 8);
      args.strictMemory.pending_product_options = options;
      args.strictMemory.pending_family_options = [];
      args.strictMemory.awaiting_action = "strict_choose_model";
      args.strictMemory.strict_model_offset = 0;
      strictReply = [
        `Sí, encontré ${rankedByFeature.length} referencia(s) que coinciden con esa descripción (${featureTermsInFamilyStep.join(", ")}).`,
        ...options.slice(0, 4).map((o) => `${o.code}) ${o.name}`),
        "",
        "Elige con letra o número (A/1) y te envío la información técnica.",
      ].join("\n");
    } else {
      const fallback = args.buildNumberedProductOptions(scopedForFeature as any[], 8);
      args.strictMemory.pending_product_options = fallback;
      args.strictMemory.pending_family_options = [];
      args.strictMemory.awaiting_action = fallback.length ? "strict_choose_model" : "strict_need_spec";
      args.strictMemory.strict_model_offset = 0;
      strictReply = fallback.length
        ? [
            `No encontré coincidencia exacta para (${featureTermsInFamilyStep.join(", ")}) en esta categoría.`,
            "Estas son las opciones activas más cercanas:",
            ...fallback.slice(0, 4).map((o) => `${o.code}) ${o.name}`),
            "",
            "Elige con letra o número (A/1), o dime otra característica exacta.",
          ].join("\n")
        : "No encontré coincidencias por esa descripción y no veo opciones activas en esta categoría en este momento.";
    }
    return { handled: true, strictReply };
  }

  if (isCategorySwitchInFamilyStep) {
    const scoped = args.scopeCatalogRows(args.ownerRows as any, String(categoryIntentInFamilyStep || ""));
    const families = args.buildNumberedFamilyOptions(scoped as any[], 8);
    args.strictMemory.last_category_intent = String(categoryIntentInFamilyStep || "");
    args.strictMemory.pending_product_options = [];
    args.strictMemory.pending_family_options = families;
    args.strictMemory.awaiting_action = "strict_choose_family";
    strictReply = families.length
      ? [
          `Perfecto, cambio la búsqueda a ${String(categoryIntentInFamilyStep || "catálogo").replace(/_/g, " ")}.`,
          "Elige familia:",
          ...families.map((o) => `${o.code}) ${o.label} (${o.count})`),
          "",
          "Responde con letra o número (A/1).",
        ].join("\n")
      : [args.buildNoActiveCatalogEscalationMessage(String(categoryIntentInFamilyStep || "esa categoria").replace(/_/g, " "))].join("\n");
    if (!families.length) args.strictMemory.awaiting_action = "conversation_followup";
    return { handled: true, strictReply };
  }

  return { handled: false, strictReply };
}

export async function handleStrictChooseFamilyTechnical(args: {
  strictReply: string;
  awaiting: string;
  text: string;
  textNorm: string;
  previousMemory: Record<string, any>;
  strictMemory: Record<string, any>;
  ownerRows: any[];
  baseScoped: any[];
  pendingFamilies: any[];
  rememberedCategory: string;
  preParsedSpec: any;
  formatSpecNumber: (v: number) => string;
  getExactTechnicalMatches: (rows: any[], q: { capacityG: number; readabilityG: number }) => any[];
  prioritizeTechnicalRows: (rows: any[], q: { capacityG: number; readabilityG: number }) => { exactCount: number; orderedRows: any[] };
  parseLooseTechnicalHint: (t: string) => { capacityG?: number; readabilityG?: number } | null;
  mergeLooseSpecWithMemory: (current: { capacityG?: number; readabilityG?: number }, incoming: { capacityG?: number; readabilityG?: number }) => { capacityG?: number; readabilityG?: number };
  isLargestCapacityAsk: (t: string) => boolean;
  buildLargestCapacitySuggestion: (rows: any[]) => { options: any[]; reply: string };
  buildPriceRangeLine: (rows: any[]) => string;
  buildNumberedProductOptions: (rows: any[], maxItems: number) => any[];
  resolvePendingFamilyOption: (t: string, options: any[]) => any;
  isRecommendationIntent: (t: string) => boolean;
  isUseCaseApplicabilityIntent: (t: string) => boolean;
  isUseCaseFamilyHint: (t: string) => boolean;
  inferFamilyFromUseCase: (t: string, options: any[]) => any;
  detectAlternativeFollowupIntent: (t: string) => string;
  familyLabelFromRow: (row: any) => string;
  rankCatalogByCapacityOnly: (rows: any[], cap: number) => Array<{ row: any }>;
  rankCatalogByReadabilityOnly: (rows: any[], read: number) => Array<{ row: any }>;
  buildStrictConversationalReply: (a: {
    apiKey: string;
    inboundText: string;
    awaiting: string;
    selectedProduct: string;
    categoryHint: string;
    pendingOptions: Array<{ code: string; name: string }>;
  }) => Promise<string>;
  apiKey: string;
  buildGuidedRecoveryMessage: (a: { awaiting: string; rememberedProduct: string; hasPendingFamilies: boolean; inboundText: string }) => string;
  normalizeText: (v: string) => string;
  parseCapacityRangeHint: (t: string) => any;
  getRowCapacityG: (row: any) => number;
  filterRowsByCapacityRange: (rows: any[], rangeHint: any) => any[];
  detectTargetApplication: (t: string) => string;
  applyApplicationProfile: (rows: any[], cfg: { application: string; targetCapacityG: number; targetReadabilityG: number; allowFallback: boolean }) => any[];
  buildNumberedFamilyOptions: (rows: any[], maxItems: number) => any[];
}): Promise<{ handled: boolean; strictReply: string }> {
  let strictReply = String(args.strictReply || "");
  if (String(strictReply || "").trim()) return { handled: false, strictReply };
  if (args.awaiting !== "strict_choose_family") return { handled: false, strictReply };

  if (!String(strictReply || "").trim() && args.preParsedSpec) {
    const cap = Number((args.preParsedSpec as any)?.capacityG || 0);
    const read = Number((args.preParsedSpec as any)?.readabilityG || 0);
    if (cap > 0 && read > 0) {
      args.strictMemory.strict_spec_query = `${args.formatSpecNumber(cap)} g x ${args.formatSpecNumber(read)} g`;
      args.strictMemory.strict_filter_capacity_g = cap;
      args.strictMemory.strict_filter_readability_g = read;
      const exactRows = args.getExactTechnicalMatches(args.ownerRows as any[], { capacityG: cap, readabilityG: read });
      const prioritized = args.prioritizeTechnicalRows(args.ownerRows as any[], { capacityG: cap, readabilityG: read });
      const sourceRows = exactRows.length ? exactRows : (prioritized.orderedRows.length ? prioritized.orderedRows : args.ownerRows);
      const allOptions = args.buildNumberedProductOptions(sourceRows as any[], 60);
      const options = allOptions.slice(0, 8);
      if (options.length) {
        args.strictMemory.pending_product_options = options;
        args.strictMemory.pending_family_options = [];
        args.strictMemory.awaiting_action = "strict_choose_model";
        args.strictMemory.strict_model_offset = 0;
        args.strictMemory.strict_family_label = "";
        strictReply = [
          exactRows.length
            ? `Sí, para ${args.strictMemory.strict_spec_query} tengo coincidencias exactas.`
            : `Para ${args.strictMemory.strict_spec_query} no veo coincidencia exacta, pero sí opciones cercanas:`,
          ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
          "",
          (allOptions.length > options.length)
            ? "Responde con letra o número (A/1), o escribe 'más' para ver siguientes."
            : "Responde con letra o número (A/1).",
        ].join("\n");
      } else {
        args.strictMemory.awaiting_action = "strict_need_spec";
        strictReply = "No encontré coincidencias para esa capacidad/resolución en el catálogo activo. Si quieres, te muestro alternativas cercanas.";
      }
    }
  }

  const looseSpecHintInFamilyStep = args.parseLooseTechnicalHint(args.text);
  if (!String(strictReply || "").trim() && looseSpecHintInFamilyStep && (looseSpecHintInFamilyStep.capacityG || looseSpecHintInFamilyStep.readabilityG)) {
    const merged = args.mergeLooseSpecWithMemory(
      {
        capacityG: Number(args.previousMemory?.strict_partial_capacity_g || 0),
        readabilityG: Number(args.previousMemory?.strict_partial_readability_g || 0),
      },
      looseSpecHintInFamilyStep
    );
    const effectiveCap = Number(merged.capacityG || 0);
    const effectiveRead = Number(merged.readabilityG || 0);
    args.strictMemory.strict_partial_capacity_g = effectiveCap > 0 ? effectiveCap : "";
    args.strictMemory.strict_partial_readability_g = effectiveRead > 0 ? effectiveRead : "";

    if (effectiveRead > 0 && !(effectiveCap > 0)) {
      strictReply = [
        `Perfecto, ya tengo la precisión (${args.formatSpecNumber(effectiveRead)} g).`,
        "Para recomendarte mejor, dime la capacidad aproximada.",
        "Opciones rápidas: 500 g, 2 kg, 4.2 kg.",
      ].join("\n");
    } else if (effectiveCap > 0 && !(effectiveRead > 0)) {
      if (args.isLargestCapacityAsk(args.text)) {
        const largest = args.buildLargestCapacitySuggestion(args.baseScoped as any[]);
        if (largest.options.length) {
          args.strictMemory.pending_product_options = largest.options;
          args.strictMemory.pending_family_options = [];
          args.strictMemory.awaiting_action = "strict_choose_model";
          args.strictMemory.strict_model_offset = 0;
          strictReply = largest.reply;
        }
      }
      if (!String(strictReply || "").trim()) {
        const priceLine = args.buildPriceRangeLine(args.baseScoped as any[]);
        strictReply = [
          `Perfecto, ya tengo la capacidad (${args.formatSpecNumber(effectiveCap)} g).`,
          ...(priceLine ? [priceLine] : []),
          "Ahora dime la resolución/precisión objetivo.",
          "Opciones comunes: 1 g, 0.1 g, 0.01 g, 0.001 g.",
        ].join("\n");
      }
    } else {
      const prioritized = args.prioritizeTechnicalRows(args.baseScoped as any[], {
        capacityG: effectiveCap,
        readabilityG: effectiveRead,
      });

      const sourceRows = prioritized.orderedRows.length ? prioritized.orderedRows : (args.baseScoped as any[]);
      const allOptions = args.buildNumberedProductOptions(sourceRows, 60);
      const options = allOptions.slice(0, 8);
      args.strictMemory.strict_filter_capacity_g = Number(effectiveCap || 0);
      args.strictMemory.strict_filter_readability_g = Number(effectiveRead || 0);
      args.strictMemory.pending_product_options = options;
      args.strictMemory.pending_family_options = [];
      args.strictMemory.awaiting_action = "strict_choose_model";
      args.strictMemory.strict_model_offset = 0;
      args.strictMemory.strict_family_label = "";
      args.strictMemory.strict_partial_capacity_g = "";
      args.strictMemory.strict_partial_readability_g = "";

      if (!options.length) {
        strictReply = "Gracias por el dato. No encontré coincidencias claras con esa característica en el catálogo activo. Si quieres, envíame capacidad y resolución exacta (ej.: 4200 g x 0.01 g) y lo ajusto mejor.";
      } else {
        const criterionLabel = `${args.formatSpecNumber(effectiveCap)} g x ${args.formatSpecNumber(effectiveRead)} g`;
        const top = options.slice(0, 3);
        const exactIntro = prioritized.exactCount > 0
          ? `¡Excelente! Con base en ${criterionLabel}, sí tenemos coincidencia en el catálogo.`
          : `Con base en ${criterionLabel}, no veo coincidencia exacta en este grupo, pero sí opciones cercanas.`;
        strictReply = [
          exactIntro,
          "Para facilitarte la elección, te recomiendo estas 3 primero:",
          ...top.map((o, idx) => `${o.code}) ${o.name}${idx === 0 ? " (recomendada para iniciar)" : ""}`),
          "",
          (allOptions.length > options.length)
            ? "Si quieres más alternativas, escribe 'más'. También puedes elegir A/1 para continuar."
            : "También puedo recomendarte la mejor según tu uso. Si prefieres, elige A/1 para continuar.",
        ].join("\n");
      }
    }
  }

  const selectedFamily =
    args.resolvePendingFamilyOption(args.text, args.pendingFamilies) ||
    ((args.isRecommendationIntent(args.text) || args.isUseCaseApplicabilityIntent(args.text) || args.isUseCaseFamilyHint(args.text))
      ? args.inferFamilyFromUseCase(args.text, args.pendingFamilies)
      : null);
  const followupIntentInFamilyStep = args.detectAlternativeFollowupIntent(args.text);
  const conversationalReformulationInFamilyStep = Boolean(
    /(no\s+me\s+sirve|otra\s+opcion|otra\s+opción|me\s+puedes\s+ofrecer|que\s+me\s+recomiendas|qué\s+me\s+recomiendas)/.test(args.textNorm) ||
    followupIntentInFamilyStep
  );
  let handledTechnicalGuidedInFamilyStep = false;
  if (!String(strictReply || "").trim() && !selectedFamily && conversationalReformulationInFamilyStep) {
    const quick = args.buildNumberedProductOptions(args.baseScoped as any[], 60).slice(0, 3);
    if (quick.length) {
      args.strictMemory.pending_product_options = quick;
      args.strictMemory.pending_family_options = [];
      args.strictMemory.awaiting_action = "strict_choose_model";
      args.strictMemory.strict_model_offset = 0;
      args.strictMemory.strict_family_label = String(args.familyLabelFromRow((args.baseScoped as any[])[0] || "") || "");
      strictReply = [
        "Claro. Para no perder el hilo, te propongo estas opciones reales del catálogo y luego afinamos según capacidad/resolución:",
        ...quick.map((o) => `${o.code}) ${o.name}`),
        "",
        "Si prefieres, dime capacidad y resolución objetivo (ej.: 200 g x 0.001 g).",
      ].join("\n");
    }
  }
  if (!String(strictReply || "").trim() && !selectedFamily) {
    const looseHintWithoutFamily = args.parseLooseTechnicalHint(args.text);
    const hintedCap = Number(looseHintWithoutFamily?.capacityG || 0);
    const hintedRead = Number(looseHintWithoutFamily?.readabilityG || 0);
    if (hintedCap > 0 || hintedRead > 0) {
      handledTechnicalGuidedInFamilyStep = true;
      let recommendedRows = args.baseScoped as any[];
      if (hintedCap > 0 && hintedRead > 0) {
        const prioritized = args.prioritizeTechnicalRows(args.baseScoped as any[], { capacityG: hintedCap, readabilityG: hintedRead });
        if (prioritized.orderedRows.length) recommendedRows = prioritized.orderedRows as any[];
      } else if (hintedCap > 0) {
        const rankedCap = args.rankCatalogByCapacityOnly(args.baseScoped as any[], hintedCap);
        if (rankedCap.length) recommendedRows = rankedCap.map((x: any) => x.row);
      } else if (hintedRead > 0) {
        const rankedRead = args.rankCatalogByReadabilityOnly(args.baseScoped as any[], hintedRead);
        if (rankedRead.length) recommendedRows = rankedRead.map((x: any) => x.row);
      }

      const sourceRows = (Array.isArray(recommendedRows) && recommendedRows.length)
        ? recommendedRows
        : (args.ownerRows as any[]);
      const allOptions = args.buildNumberedProductOptions(sourceRows as any[], 60);
      const options = allOptions.slice(0, 8);
      if (options.length) {
        args.strictMemory.pending_product_options = options;
        args.strictMemory.pending_family_options = [];
        args.strictMemory.awaiting_action = "strict_choose_model";
        args.strictMemory.strict_family_label = "";
        args.strictMemory.strict_model_offset = 0;
        if (hintedCap > 0) args.strictMemory.strict_filter_capacity_g = hintedCap;
        if (hintedRead > 0) args.strictMemory.strict_filter_readability_g = hintedRead;
        const criterionLabel = (hintedCap > 0 && hintedRead > 0)
          ? `${args.formatSpecNumber(hintedCap)} g x ${args.formatSpecNumber(hintedRead)} g`
          : (hintedCap > 0 ? `${args.formatSpecNumber(hintedCap)} g` : `${args.formatSpecNumber(hintedRead)} g`);
        strictReply = [
          `Perfecto. Para ${criterionLabel}, te muestro opciones cercanas en catálogo:`,
          ...options.map((o) => `${o.code}) ${o.name}`),
          "",
          (allOptions.length > options.length)
            ? "Responde con letra o número (A/1), o escribe 'más' para ver siguientes."
            : "Responde con letra o número (A/1).",
        ].join("\n");
      } else {
        strictReply = "Entendí tu necesidad técnica, pero no encontré coincidencias activas en este momento. Si quieres, escribe 'volver' para elegir familia o ajusta capacidad/resolución.";
      }
    }
  }
  if (!String(strictReply || "").trim() && !selectedFamily && !handledTechnicalGuidedInFamilyStep) {
    const familyHints = args.pendingFamilies
      .slice(0, 6)
      .map((f: any) => ({ code: String(f?.code || ""), name: String(f?.label || "") }))
      .filter((f: any) => f.code && f.name);
    const softReply = await args.buildStrictConversationalReply({
      apiKey: args.apiKey,
      inboundText: args.text,
      awaiting: args.awaiting,
      selectedProduct: String(args.previousMemory?.last_selected_product_name || args.previousMemory?.last_product_name || ""),
      categoryHint: args.rememberedCategory,
      pendingOptions: familyHints,
    });
    strictReply = String(softReply || "").trim() || args.buildGuidedRecoveryMessage({
      awaiting: args.awaiting,
      rememberedProduct: String(args.previousMemory?.last_selected_product_name || args.previousMemory?.last_product_name || ""),
      hasPendingFamilies: args.pendingFamilies.length > 0,
      inboundText: args.text,
    });
  } else if (!String(strictReply || "").trim() && selectedFamily) {
    const selectedFamilyResolved = selectedFamily as { key?: string; label?: string };
    const familyRowsInScope = args.baseScoped.filter((r: any) => args.normalizeText(args.familyLabelFromRow(r)) === args.normalizeText(String(selectedFamilyResolved.key || "")));
    const familyRowsGlobal = args.ownerRows.filter((r: any) => args.normalizeText(args.familyLabelFromRow(r)) === args.normalizeText(String(selectedFamilyResolved.key || "")));
    const familyRows = familyRowsInScope.length ? familyRowsInScope : familyRowsGlobal;
    const hinted = args.parseLooseTechnicalHint(args.text);
    const rangeHint = args.parseCapacityRangeHint(args.text);
    const hintedCap = Number(hinted?.capacityG || 0);
    const hintedRead = Number(hinted?.readabilityG || 0);
    const familyMaxCap = familyRows.reduce((mx: number, r: any) => Math.max(mx, Number(args.getRowCapacityG(r) || 0)), 0);
    const capacityOutOfFamilyRange = hintedCap > 0 && familyMaxCap > 0 && familyMaxCap < (hintedCap * 0.7);
    const fallbackScopeRows = (Array.isArray(args.baseScoped) && args.baseScoped.length) ? (args.baseScoped as any[]) : (args.ownerRows as any[]);
    const baseRowsForRanking = capacityOutOfFamilyRange ? fallbackScopeRows : (familyRows as any[]);
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
    const appNow = args.detectTargetApplication(args.text);
    const appProfile = String(appNow || args.strictMemory.target_application || args.previousMemory?.target_application || "").trim();
    if (appNow) {
      args.strictMemory.target_application = appNow;
      args.strictMemory.target_industry = appNow === "joyeria_oro" ? "joyeria" : appNow;
    }
    const profiledRows = args.applyApplicationProfile(recommendedRows as any[], {
      application: appProfile,
      targetCapacityG: hintedCap || Number(args.previousMemory?.strict_filter_capacity_g || 0),
      targetReadabilityG: hintedRead || Number(args.previousMemory?.strict_filter_readability_g || 0),
      allowFallback: false,
    });
    const allOptions = args.buildNumberedProductOptions(profiledRows as any[], 60);
    const options = allOptions.slice(0, 8);
    if (!allOptions.length) {
      const fallbackFamilies = args.pendingFamilies.length ? args.pendingFamilies : args.buildNumberedFamilyOptions(args.ownerRows as any[], 8);
      args.strictMemory.pending_product_options = [];
      args.strictMemory.pending_family_options = fallbackFamilies;
      args.strictMemory.awaiting_action = "strict_choose_family";
      args.strictMemory.strict_family_label = "";
      args.strictMemory.strict_model_offset = 0;
      strictReply = fallbackFamilies.length
        ? [
            `No veo modelos activos para ${String(selectedFamilyResolved.label || "esa familia")} con el filtro actual.`,
            "Elige otra familia para continuar:",
            ...fallbackFamilies.map((f: any) => `${f.code}) ${f.label} (${f.count})`),
            "",
            "Responde con letra o número (A/1).",
          ].join("\n")
        : "No veo familias activas para continuar en este momento.";
    } else {
      args.strictMemory.pending_product_options = options;
      args.strictMemory.pending_family_options = [];
      args.strictMemory.awaiting_action = "strict_choose_model";
      args.strictMemory.strict_family_label = capacityOutOfFamilyRange ? "" : String(selectedFamilyResolved.label || "");
      args.strictMemory.strict_model_offset = 0;
      if (hintedCap > 0) args.strictMemory.strict_filter_capacity_g = hintedCap;
      if (hintedRead > 0) args.strictMemory.strict_filter_readability_g = hintedRead;
      const needsReadabilityForQuote = hintedCap > 0 && !(hintedRead > 0);
      const recommendationIntro = (args.isRecommendationIntent(args.text) || args.isUseCaseApplicabilityIntent(args.text))
          ? (capacityOutOfFamilyRange
            ? `Para ese uso y capacidad (${args.formatSpecNumber(hintedCap)} g), te muestro ${options.length} opción(es)${allOptions.length > options.length ? ` de ${allOptions.length}` : ""} más cercanas en catálogo:`
            : `Para ese uso te recomiendo empezar con ${String(selectedFamilyResolved.label || "esa familia")}. Modelos sugeridos (${options.length} mostrados${allOptions.length > options.length ? ` de ${allOptions.length}` : ""}):`)
        : `Perfecto. Modelos de ${String(selectedFamilyResolved.label || "familia")} (${allOptions.length}):`;
      strictReply = [
        recommendationIntro,
        ...options.map((o) => `${o.code}) ${o.name}`),
        "",
        ...(options.length >= 3
          ? [
              "Si quieres cotizar varias referencias (máx. 3), escribe: cotizar opciones 1,2,4.",
              "También puedes responder solo con números: 1,2,4.",
              "También puedes escribir: cotizar modelos PX6202/E, AX2202/E, EXP6202.",
              "",
            ]
          : []),
        ...(needsReadabilityForQuote
          ? ["Si quieres cotización exacta, compárteme también la resolución (ej.: 4000 g x 0.01 g).", ""]
          : []),
        (allOptions.length > options.length)
          ? "Responde con letra o número (ej.: A o 1), o escribe 'más' para ver siguientes."
          : "Responde con letra o número (ej.: A o 1).",
      ].join("\n");
    }
  }

  return { handled: true, strictReply };
}
