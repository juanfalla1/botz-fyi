export async function handleStrictChooseModelFlow(args: any): Promise<{
  handled: boolean;
  strictReply: string;
  strictBypassAutoQuote: boolean;
}> {
  let strictReply = String(args.strictReply || "");
  let strictBypassAutoQuote = Boolean(args.strictBypassAutoQuote);
  let handled = false;
  if (String(strictReply || "").trim()) return { handled: false, strictReply, strictBypassAutoQuote };
  if (args.awaiting !== "strict_choose_model") return { handled: false, strictReply, strictBypassAutoQuote };

  const {
    previousMemory,
    strictMemory,
    text,
    textNorm,
    ownerRows,
    rememberedCategory,
    resolvePendingProductOptionStrict,
    detectGuidedBalanzaProfile,
    scopeCatalogRows,
    normalizeText,
    buildGuidedPendingOptions,
    detectIndustrialGuidedMode,
    buildGuidedBalanzaReplyWithMode,
    scopeStrictBasculaRows,
    buildNumberedProductOptions,
    detectCatalogCategoryIntent,
    extractFeatureTerms,
    isFeatureQuestionIntent,
    isUseCaseApplicabilityIntent,
    rankCatalogByFeature,
    detectTargetApplication,
    applyApplicationProfile,
    buildGuidedNeedReframePrompt,
    buildScaleDifferenceGuidanceReply,
    isDifferenceQuestionIntent,
    parseTechnicalSpecQuery,
    parseCapacityRangeHint,
    parseLooseTechnicalHint,
    isUseCaseFamilyHint,
    isRecommendationIntent,
    isGlobalCatalogAsk,
    isInventoryInfoIntent,
    isCatalogBreadthQuestion,
    buildStrictConversationalReply,
    apiKey,
    buildNumberedFamilyOptions,
    resolvePendingFamilyOption,
    familyLabelFromRow,
    getRowCapacityG,
    getRowReadabilityG,
    formatSpecNumber,
    dedupeOptionSpecSegments: dedupeLine,
    buildNoActiveCatalogEscalationMessage,
    hasActiveTechnicalRequirement,
    asksQuoteIntent,
    extractBundleOptionIndexes,
    extractBundleSelectionFromCountCommand,
    pickBundleOptionSourceByIndexes,
    inbound,
    isCorrectionIntent,
    prioritizeTechnicalRows,
    formatMoney,
    filterRowsByCapacityRange,
  } = args;

  const familyLabel = String(previousMemory?.strict_family_label || "").trim();
  const pendingStrictOptions = (Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [])
    .map((o: any) => ({ ...o, name: dedupeLine(String(o?.name || "")) }));
  const strictSelection = resolvePendingProductOptionStrict(text, pendingStrictOptions);
  const strictCommand = String(text || "").trim();
  const askMore = /^(mas|más|mas\s+modelos?|más\s+modelos?|ver\s+mas|ver\s+más|mu[eé]strame\s+mas|mu[eé]strame\s+más)$/i.test(strictCommand);
  const askBack = /^volver$/i.test(strictCommand);
  const askCancel = /^cancelar$/i.test(strictCommand);
  const rememberedGuidedProfile = String(previousMemory?.guided_balanza_profile || strictMemory.guided_balanza_profile || "").trim();
  const guidedProfileInModelStep = (detectGuidedBalanzaProfile(text) || rememberedGuidedProfile || "");
  const categoryScoped = rememberedCategory ? scopeCatalogRows(ownerRows as any, rememberedCategory) : ownerRows;
  const asksMoreOptionsDirect = /\b(tienes?\s+mas\s+opciones?|hay\s+mas\s+opciones?|mas\s+opciones?|tienes?\s+mas\s+modelos?|hay\s+mas\s+modelos?|mas\s+modelos?)\b/.test(textNorm);
  const freeCatalogAskInModelStep =
    asksMoreOptionsDirect ||
    isGlobalCatalogAsk(text) ||
    isInventoryInfoIntent(text) ||
    isCatalogBreadthQuestion(text) ||
    /(que\s+mas|que\s+otros?|que\s+tienes|que\s+manejas|que\s+ofrec|catalogo|otro\s+tipo|otra\s+categoria|otra\s+categoría|opciones)/.test(normalizeText(text));
  const requestedCategoryIntentInModelStep = detectCatalogCategoryIntent(text);
  const appHintInModelStep = detectTargetApplication(text);
  const currentCategoryIntentInModelStep = normalizeText(String(previousMemory?.last_category_intent || rememberedCategory || ""));
  const featureTermsInModelStep = extractFeatureTerms(text);
  const asksFeatureValidationInModelStep = Boolean(
    !strictSelection &&
    !askMore &&
    !askBack &&
    !askCancel &&
    !freeCatalogAskInModelStep &&
    featureTermsInModelStep.length > 0 &&
    (isFeatureQuestionIntent(text) || isUseCaseApplicabilityIntent(text))
  );
  const isCategorySwitchInModelStep = Boolean(
    requestedCategoryIntentInModelStep &&
    normalizeText(String(requestedCategoryIntentInModelStep || "")) !== currentCategoryIntentInModelStep
  );
  const technicalBypassInSelection = Boolean(
    parseTechnicalSpecQuery(text) ||
    parseCapacityRangeHint(text) ||
    parseLooseTechnicalHint(text) ||
    isUseCaseApplicabilityIntent(text) ||
    isUseCaseFamilyHint(text) ||
    isRecommendationIntent(text)
  );
  const asksGlobalCatalogInModelStep =
    isGlobalCatalogAsk(text) ||
    /\b(dame|muestrame|mu[eé]strame|quiero|ver)\b.*\b(todo|todos|todas)\b.*\b(prod|producto|productos|prodcutos|catalogo)\b/.test(textNorm);
  const hasScopedContextInModelStep = Boolean(currentCategoryIntentInModelStep || familyLabel || pendingStrictOptions.length);
  const asksHotplate = /\b(plancha|calentamiento|agitaci[oó]n|agitacion)\b/.test(textNorm);
  const rangeHint = parseCapacityRangeHint(text);
  const familyRows = familyLabel
    ? categoryScoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(familyLabel))
    : categoryScoped;

  if (!String(strictReply || "").trim() && !strictSelection && !askMore && !askBack && !askCancel && /\b(tienes?\s+balanzas?|que\s+modelos\s+tienes?\s+de\s+balanzas?|que\s+balanzas?\s+tienes?|dame\s+(las\s+)?(opciones|modelos).*(balanza|balanzas)|muestrame\s+(las\s+)?(opciones|modelos).*(balanza|balanzas)|dame\s+todas\s+las\s+opciones\s+de\s+balanzas?)\b/i.test(String(text || ""))) {
    const profileForList = (guidedProfileInModelStep || rememberedGuidedProfile || "balanza_precision_001");
    const industrialModeForList = profileForList === "balanza_industrial_portatil_conteo"
      ? (detectIndustrialGuidedMode(text) || String(previousMemory?.guided_industrial_mode || strictMemory.guided_industrial_mode || ""))
      : "";
    const options = buildGuidedPendingOptions(ownerRows as any[], profileForList, industrialModeForList as any);
    strictMemory.last_category_intent = "balanzas";
    strictMemory.strict_family_label = "balanzas";
    strictMemory.strict_model_offset = 0;
    strictMemory.pending_family_options = [];
    if (options.length) {
      strictMemory.pending_product_options = options;
      strictMemory.awaiting_action = "strict_choose_model";
      strictMemory.guided_balanza_profile = profileForList;
      strictMemory.guided_industrial_mode = industrialModeForList;
      strictReply = buildGuidedBalanzaReplyWithMode(profileForList, industrialModeForList as any);
      handled = true;
    } else {
      strictMemory.pending_product_options = [];
      strictMemory.awaiting_action = "strict_need_spec";
      strictReply = "Ahora mismo no veo balanzas activas en base de datos. Si quieres, dime capacidad y resolución y te confirmo alternativas.";
      handled = true;
    }
  }

  if (!String(strictReply || "").trim() && !strictSelection && !askMore && !askBack && !askCancel && /\b(tienes?\s+basculas?|que\s+modelos\s+tienes?\s+de\s+basculas?|que\s+basculas?\s+tienes?|dame\s+(las\s+)?(opciones|modelos)|muestrame\s+(las\s+)?(opciones|modelos))\b/i.test(String(text || ""))) {
    const basculaRows = scopeStrictBasculaRows(ownerRows as any[]);
    const options = buildNumberedProductOptions(basculaRows as any[], 8);
    strictMemory.last_category_intent = "basculas";
    strictMemory.strict_family_label = "basculas";
    strictMemory.strict_model_offset = 0;
    strictMemory.pending_family_options = [];
    if (options.length) {
      strictMemory.pending_product_options = options;
      strictMemory.awaiting_action = "strict_choose_model";
      strictReply = [
        `Perfecto. En catálogo activo tengo ${options.length} báscula(s).`,
        ...options.slice(0, 4).map((o: any) => `${o.code}) ${o.name}`),
        "",
        "Elige con letra/número (A/1), o escribe 'más'.",
      ].join("\n");
    } else {
      strictMemory.pending_product_options = [];
      strictMemory.awaiting_action = "strict_need_spec";
      strictReply = "Ahora mismo no veo básculas activas en base de datos. Si quieres, dime capacidad y resolución y te confirmo alternativas.";
    }
    handled = true;
  }

  if (!String(strictReply || "").trim() && asksFeatureValidationInModelStep) {
    const scopedByIntent = requestedCategoryIntentInModelStep
      ? scopeCatalogRows(ownerRows as any, requestedCategoryIntentInModelStep)
      : (categoryScoped as any[]);
    const basePool = Array.isArray(scopedByIntent) && scopedByIntent.length ? scopedByIntent : (ownerRows as any[]);
    const rankedScoped = rankCatalogByFeature(basePool as any[], featureTermsInModelStep).slice(0, 10);
    const rankedGlobal = rankedScoped.length ? rankedScoped : rankCatalogByFeature(ownerRows as any[], featureTermsInModelStep).slice(0, 10);
    const rankedRows = rankedGlobal.map((x: any) => x.row);
    const appProfile = String(appHintInModelStep || strictMemory.target_application || previousMemory?.target_application || "").trim();
    const profiledRows = applyApplicationProfile(rankedRows as any[], {
      application: appProfile,
      targetCapacityG: Number(previousMemory?.strict_filter_capacity_g || 0),
      targetReadabilityG: Number(previousMemory?.strict_filter_readability_g || 0),
      allowFallback: false,
    });
    const options = buildNumberedProductOptions((profiledRows || rankedRows).slice(0, 8) as any[], 8);
    if (options.length) {
      strictMemory.pending_product_options = options;
      strictMemory.pending_family_options = [];
      strictMemory.awaiting_action = "strict_choose_model";
      strictMemory.strict_model_offset = 0;
      strictReply = [
        `Sí, en catálogo activo tengo referencias que coinciden con esa descripción (${featureTermsInModelStep.join(", ")}).`,
        ...options.slice(0, 3).map((o: any) => `${o.code}) ${o.name}`),
        "",
        "Elige con letra/número (A/1), o escribe 'más'.",
      ].join("\n");
    } else {
      strictMemory.awaiting_action = "strict_need_spec";
      strictReply = buildGuidedNeedReframePrompt();
    }
    handled = true;
  }

  if (!String(strictReply || "").trim() && !strictSelection && !askMore && !askBack && !askCancel && isDifferenceQuestionIntent(text)) {
    strictMemory.pending_product_options = [];
    strictMemory.pending_family_options = [];
    strictMemory.awaiting_action = "strict_need_spec";
    strictReply = buildScaleDifferenceGuidanceReply();
    handled = true;
  }

  if (!String(strictReply || "").trim() && asksGlobalCatalogInModelStep && hasScopedContextInModelStep) {
    strictMemory.awaiting_action = "strict_catalog_scope_disambiguation";
    strictReply = [
      "Perfecto. Para no mezclar, ¿te refieres a:",
      "1) Catálogo completo (todas las categorías)",
      `2) Solo ${familyLabel || String(currentCategoryIntentInModelStep || "esta categoría").replace(/_/g, " ")}`,
    ].join("\n");
    handled = true;
  }

  const inventoryOverrideInSelection =
    (!asksGlobalCatalogInModelStep && isGlobalCatalogAsk(text)) ||
    isInventoryInfoIntent(text) ||
    isCatalogBreadthQuestion(text);
  if (inventoryOverrideInSelection) {
    strictMemory.awaiting_action = "none";
    strictMemory.pending_product_options = [];
    strictMemory.pending_family_options = [];
    strictMemory.strict_model_offset = 0;
    strictMemory.strict_family_label = "";
    if (isGlobalCatalogAsk(text)) strictMemory.last_category_intent = "";
    handled = true;
  }

  const familySwitchMentionInModelStep = (() => {
    const families = buildNumberedFamilyOptions(categoryScoped as any[], 12);
    if (!families.length) return null;
    const chosen = resolvePendingFamilyOption(text, families);
    if (!chosen) return null;
    const currentKey = normalizeText(String(familyLabel || ""));
    if (currentKey && normalizeText(String(chosen.key || "")) === currentKey) return null;
    return { families, chosen };
  })();
  if (!String(strictReply || "").trim() && familySwitchMentionInModelStep) {
    const chosen = familySwitchMentionInModelStep.chosen;
    const familyRowsSwitch = (categoryScoped as any[]).filter(
      (r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(String(chosen.key || ""))
    );
    const optionsSwitch = buildNumberedProductOptions(familyRowsSwitch as any[], 8);
    strictMemory.pending_family_options = familySwitchMentionInModelStep.families;
    strictMemory.strict_family_label = String(chosen.label || "");
    strictMemory.strict_model_offset = 0;
    strictMemory.awaiting_action = "strict_choose_model";
    strictMemory.pending_product_options = optionsSwitch;
    strictReply = optionsSwitch.length
      ? [
          `Perfecto, cambio la búsqueda a ${String(chosen.label || "esa familia")}.`,
          ...optionsSwitch.slice(0, 8).map((o: any) => {
            const row = familyRowsSwitch.find((r: any) => String(r?.id || "") === String(o.id || ""));
            const cap = Number(getRowCapacityG(row) || 0);
            const read = Number(getRowReadabilityG(row) || 0);
            return dedupeLine(`${o.code}) ${o.name} | Cap: ${formatSpecNumber(cap)} g | Res: ${formatSpecNumber(read)} g`);
          }),
          "",
          "Responde con letra o número (A/1), o escribe 'más' para ver siguientes.",
        ].join("\n")
      : `Perfecto, cambio la búsqueda a ${String(chosen.label || "esa familia")}, pero ahora no veo modelos activos en esa familia.`;
    handled = true;
  }

  if (pendingStrictOptions.length > 0 && !strictSelection && !askMore && !askBack && !askCancel && !technicalBypassInSelection && !inventoryOverrideInSelection && !isCategorySwitchInModelStep && !freeCatalogAskInModelStep) {
    const softReply = await buildStrictConversationalReply({
      apiKey,
      inboundText: text,
      awaiting: args.awaiting,
      selectedProduct: String(previousMemory?.last_selected_product_name || previousMemory?.last_product_name || ""),
      categoryHint: rememberedCategory,
      pendingOptions: pendingStrictOptions,
    });
    strictMemory.awaiting_action = "strict_choose_model";
    strictMemory.pending_product_options = pendingStrictOptions;
    strictMemory.strict_model_offset = Math.max(0, Number(previousMemory?.strict_model_offset || 0));
    strictReply = String(softReply || "").trim() || "Por favor elige una opción válida del listado actual. Responde solo con la letra o número disponible (por ejemplo: A, B, 1 o 2), o escribe \"más\" para ver más opciones.";
    handled = true;
  }

  if (!String(strictReply || "").trim() && isCategorySwitchInModelStep) {
    const scoped = scopeCatalogRows(ownerRows as any, String(requestedCategoryIntentInModelStep || ""));
    const families = buildNumberedFamilyOptions(scoped as any[], 8);
    strictMemory.last_category_intent = String(requestedCategoryIntentInModelStep || "");
    strictMemory.pending_product_options = [];
    strictMemory.pending_family_options = families;
    strictMemory.strict_filter_capacity_g = "";
    strictMemory.strict_filter_readability_g = "";
    strictMemory.strict_partial_capacity_g = "";
    strictMemory.strict_partial_readability_g = "";
    if (!families.length) {
      strictMemory.awaiting_action = "conversation_followup";
      strictReply = buildNoActiveCatalogEscalationMessage(String(requestedCategoryIntentInModelStep || "esa categoria").replace(/_/g, " "));
    } else {
      strictMemory.awaiting_action = "strict_choose_family";
      strictReply = [
        `Perfecto, cambio la búsqueda a ${String(requestedCategoryIntentInModelStep || "catalogo").replace(/_/g, " ")}.`,
        "Primero elige familia:",
        ...families.map((o: any) => `${o.code}) ${o.label} (${o.count})`),
        "",
        "Si quieres, también dime qué vas a pesar y su funcionalidad para identificar cuál se adecúa a tu empresa.",
        "Responde con letra o número (A/1).",
      ].join("\n");
    }
    handled = true;
  }

  if (!String(strictReply || "").trim() && asksHotplate && !isCategorySwitchInModelStep) {
    const labRows = scopeCatalogRows(ownerRows as any, "equipos_laboratorio");
    if (!labRows.length) {
      strictReply = buildNoActiveCatalogEscalationMessage("planchas de calentamiento y agitacion");
      strictMemory.awaiting_action = "conversation_followup";
      handled = true;
    }
  }

  if (!String(strictReply || "").trim() && freeCatalogAskInModelStep && !isCategorySwitchInModelStep) {
    const asksAllProductsGlobal = isGlobalCatalogAsk(text);
    if (asksAllProductsGlobal) {
      const globalFamilies = buildNumberedFamilyOptions(ownerRows as any[], 10);
      const globalTotal = globalFamilies.reduce((acc: number, o: any) => acc + Number(o?.count || 0), 0);
      strictMemory.last_category_intent = "";
      strictMemory.strict_family_label = "";
      strictMemory.pending_product_options = [];
      strictMemory.pending_family_options = globalFamilies;
      strictMemory.awaiting_action = "strict_choose_family";
      strictReply = globalFamilies.length
        ? [
            `Perfecto. En total tengo ${globalTotal} referencias activas en base de datos.`,
            "Elige una familia para mostrarte opciones:",
            ...globalFamilies.map((o: any) => `${o.code}) ${o.label} (${o.count})`),
            "",
            "Si quieres, también dime qué vas a pesar y su funcionalidad para identificar cuál se adecúa a tu empresa.",
            "Responde con letra o número (A/1).",
          ].join("\n")
        : "Ahora mismo no veo familias activas en catálogo para mostrarte.";
      handled = true;
    }
  }

  const bundleQuoteAsk =
    (
      asksQuoteIntent(text) &&
      (
        /\b(las|los|todas|todos|opciones|referencias)\b/.test(textNorm) ||
        /\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/.test(textNorm)
      )
    ) ||
    (!asksQuoteIntent(text) && !strictSelection && extractBundleOptionIndexes(text).length >= 2);
  if (!String(strictReply || "").trim() && bundleQuoteAsk) {
    const pendingOptions =
      (Array.isArray(previousMemory?.quote_bundle_options) ? previousMemory.quote_bundle_options : [])
        .concat(Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [])
        .concat(Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : [])
        .filter((o: any, idx: number, arr: any[]) => {
          const key = String(o?.raw_name || o?.name || "").trim();
          if (!key) return false;
          return arr.findIndex((x: any) => String(x?.raw_name || x?.name || "").trim() === key) === idx;
        });
    const pendingOnly = Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [];
    const currentBundleOnly = Array.isArray(previousMemory?.quote_bundle_options_current) ? previousMemory.quote_bundle_options_current : [];
    const recommendedOnly = Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : [];
    const quoteBundleOnly = Array.isArray(previousMemory?.quote_bundle_options) ? previousMemory.quote_bundle_options : [];
    const bundleSelection = extractBundleSelectionFromCountCommand(text);
    const explicitIdx = (bundleSelection?.picks?.length ? bundleSelection.picks : extractBundleOptionIndexes(text))
      .filter((n: number) => n >= 1);
    const optionsForIndexSelection = pickBundleOptionSourceByIndexes(
      explicitIdx,
      [pendingOnly, currentBundleOnly, recommendedOnly, quoteBundleOnly, pendingOptions],
    );
    const selectedCount = /\b(todas|todos)\b/.test(textNorm)
      ? pendingOptions.length
      : Math.max(2, Math.min(3, Number(bundleSelection?.count || 0) || 3));
    const chosen = explicitIdx.length >= 2
      ? explicitIdx.filter((n: number) => n <= optionsForIndexSelection.length).map((n: number) => optionsForIndexSelection[n - 1]).filter(Boolean).slice(0, 3)
      : [];
    if (!chosen.length && explicitIdx.length === 1) {
      const pick = explicitIdx[0] <= optionsForIndexSelection.length ? optionsForIndexSelection[explicitIdx[0] - 1] : null;
      const pickedName = String(pick?.raw_name || pick?.name || "").trim();
      if (pickedName) {
        strictBypassAutoQuote = true;
        inbound.text = `cotizar ${pickedName}`;
        strictMemory.pending_product_options = pendingOptions;
        strictMemory.last_recommended_options = pendingOptions;
        strictMemory.awaiting_action = "none";
      }
    }
    if (chosen.length >= 2) {
      const modelNames = chosen.map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
      strictBypassAutoQuote = true;
      inbound.text = `cotizar ${modelNames.join(" ; ")} cantidad 1 para todos`;
      strictMemory.pending_product_options = chosen;
      strictMemory.last_recommended_options = chosen;
      strictMemory.quote_bundle_options_current = chosen;
      strictMemory.quote_bundle_options = chosen;
      strictMemory.quote_bundle_selected_ids = chosen.map((o: any) => String(o?.id || o?.product_id || "").trim()).filter(Boolean);
      strictMemory.quote_quantity = 1;
      strictMemory.awaiting_action = "none";
      strictMemory.last_intent = "quote_bundle_request";
      strictMemory.bundle_quote_mode = true;
      strictMemory.bundle_quote_count = chosen.length;
      strictMemory.last_selected_product_name = "";
      strictMemory.last_selected_product_id = "";
      strictMemory.last_selection_at = "";
    } else if (selectedCount >= 2 && pendingOptions.length >= 2) {
      const shortlist = pendingOptions.slice(0, Math.min(8, pendingOptions.length));
      strictMemory.quote_bundle_options_current = shortlist;
      strictMemory.quote_bundle_options = shortlist;
      strictMemory.pending_product_options = shortlist;
      strictMemory.last_recommended_options = shortlist;
      strictMemory.bundle_quote_mode = true;
      strictMemory.bundle_quote_requested_count = selectedCount;
      strictMemory.awaiting_action = "strict_choose_model";
      strictReply = [
        `Perfecto. Para cotizar ${selectedCount} referencia(s), indícame cuáles opciones quieres del listado (máximo 3 por solicitud).`,
        ...shortlist.slice(0, 6).map((o: any, idx: number) => `${idx + 1}) ${String(o?.raw_name || o?.name || "").trim()}`),
        "",
        "Escribe: cotizar 1,2,4 (ejemplo).",
      ].join("\n");
    }
    handled = true;
  }

  const correctionAsk = isCorrectionIntent(text);
  if (!String(strictReply || "").trim() && correctionAsk) {
    const rememberedCap = Number(previousMemory?.strict_filter_capacity_g || previousMemory?.strict_partial_capacity_g || 0);
    const rememberedRead = Number(previousMemory?.strict_filter_readability_g || previousMemory?.strict_partial_readability_g || 0);
    if (rememberedCap > 0 && rememberedRead > 0) {
      const prioritized = prioritizeTechnicalRows(categoryScoped as any[], {
        capacityG: rememberedCap,
        readabilityG: rememberedRead,
      });
      const options = buildNumberedProductOptions((prioritized.orderedRows.length ? prioritized.orderedRows : familyRows) as any[], 60);
      const top = options.slice(0, 3);
      strictMemory.pending_product_options = options.slice(0, 8);
      strictMemory.awaiting_action = "strict_choose_model";
      strictMemory.strict_model_offset = 0;
      strictMemory.strict_filter_capacity_g = rememberedCap;
      strictMemory.strict_filter_readability_g = rememberedRead;
      strictReply = top.length
        ? [
            `Gracias por corregirme. Reenfoqué la búsqueda a ${formatSpecNumber(rememberedCap)} g x ${formatSpecNumber(rememberedRead)} g y estas son las opciones más compatibles:`,
            ...top.map((o: any) => `${o.code}) ${o.name}`),
            "",
            "Si quieres más, escribe 'más'. También puedes elegir A/1 para continuar.",
          ].join("\n")
        : "Gracias por corregirme. No veo coincidencias con ese criterio en el catálogo activo. Si quieres, te muestro alternativas por capacidad cercana.";
      handled = true;
    }
  }

  const asksPrecisionInventory =
    /(balanzas?\s+de\s+precision|balanzas?\s+de\s+precisi[oó]n|tienes?\s+de\s+precision|tienen\s+de\s+precision|hay\s+de\s+precision|manejan\s+de\s+precision)/.test(textNorm) &&
    !parseLooseTechnicalHint(text) &&
    !parseTechnicalSpecQuery(text);
  if (!String(strictReply || "").trim() && asksPrecisionInventory) {
    const guidedProfile = "balanza_precision_001";
    const options = buildGuidedPendingOptions(ownerRows as any[], guidedProfile, "");
    if (options.length) {
      strictMemory.pending_product_options = options;
      strictMemory.pending_family_options = [];
      strictMemory.awaiting_action = "strict_choose_model";
      strictMemory.strict_model_offset = 0;
      strictMemory.last_category_intent = "balanzas";
      strictMemory.guided_balanza_profile = guidedProfile;
      strictMemory.guided_industrial_mode = "";
      strictReply = buildGuidedBalanzaReplyWithMode(guidedProfile, "");
    } else {
      strictReply = "Ahora mismo no tengo balanzas de precisión activas en base de datos. Si quieres, reviso alternativas cercanas por resolución.";
    }
    handled = true;
  }

  const asksCheapest = /\b(economic|economica|economicas|economico|economicos|mas\s+barat|m[aá]s\s+barat|menor\s+precio|precio\s+bajo)\b/.test(normalizeText(text));
  if (!String(strictReply || "").trim() && asksCheapest) {
    const priced = (familyRows as any[])
      .filter((r: any) => Number(r?.base_price_usd || 0) > 0)
      .sort((a: any, b: any) => Number(a?.base_price_usd || 0) - Number(b?.base_price_usd || 0));
    const pricedSource = priced.length ? priced : (categoryScoped as any[])
      .filter((r: any) => Number(r?.base_price_usd || 0) > 0)
      .sort((a: any, b: any) => Number(a?.base_price_usd || 0) - Number(b?.base_price_usd || 0));
    const options = buildNumberedProductOptions(pricedSource as any[], 8);
    if (options.length) {
      strictMemory.pending_product_options = options;
      strictMemory.strict_model_offset = 0;
      strictMemory.strict_family_label = familyLabel || String(previousMemory?.strict_family_label || "");
      const topRow = pricedSource[0];
      const topFamily = normalizeText(familyLabelFromRow(topRow)) || normalizeText(String(topRow?.source_payload?.family || ""));
      const familyLabelHuman = topFamily ? String(familyLabelFromRow(topRow) || topFamily) : "N/A";
      strictReply = [
        `Perfecto. Según base de datos, la familia más económica aquí es: ${familyLabelHuman}.`,
        "Estas son 4 opciones más económicas:",
        ...options.slice(0, 4).map((o: any) => {
          const p = Number(o.base_price_usd || 0);
          return `${o.code}) ${o.name}${p > 0 ? ` (USD ${formatMoney(p)})` : ""}`;
        }),
        "",
        "Elige con letra o número (A/1), o escribe 'más'.",
      ].join("\n");
      handled = true;
    }
  }

  const recommendationAsk = isRecommendationIntent(text) || /\b(no\s+se|no\s+sé)\b.*\b(modelo|cual|cu[aá]l|ofrecer|ofrecerme|elegir)\b/.test(normalizeText(text));
  if (!String(strictReply || "").trim() && recommendationAsk) {
    const allOptions = buildNumberedProductOptions(familyRows as any[], 60);
    const recommended = allOptions.slice(0, 3);
    const page = allOptions.slice(0, 8);
    strictMemory.pending_product_options = page;
    strictMemory.strict_model_offset = 0;
    strictMemory.strict_family_label = familyLabel || String(previousMemory?.strict_family_label || "");

    if (!recommended.length) {
      strictReply = "Claro, te ayudo a elegir. En este grupo no veo modelos disponibles ahora. Si quieres, te recomiendo otra familia según tu uso (laboratorio, joyería o industrial).";
    } else {
      const lines = recommended.map((o: any, idx: number) => {
        const pos = idx + 1;
        const hint = pos === 1
          ? "opción equilibrada para iniciar"
          : (pos === 2 ? "alternativa para comparar costo/beneficio" : "alternativa para mayor capacidad/robustez");
        return `${o.code}) ${o.name} - ${hint}`;
      });
      const rememberedUseCase = String(previousMemory?.strict_use_case || strictMemory?.strict_use_case || "").trim();
      const hasUseCaseContext = /(para\s+pesar|tornillo|tornillos|tuerca|tuercas|perno|pernos|muestra|muestras|laboratorio|joyeria|joyería|industrial)/.test(normalizeText(`${rememberedUseCase} ${text}`));
      strictReply = [
        "¡Claro! Te recomiendo estas opciones para empezar, sin complicarte:",
        ...lines,
        "",
        hasUseCaseContext
          ? "Con ese uso, para afinarte una recomendación final dime el rango de peso por unidad o capacidad aproximada."
          : "Si me dices el uso (ej.: laboratorio, joyería o industrial), te digo cuál elegir primero.",
        "También puedes responder con letra o número (A/1) y te envío ficha o cotización.",
      ].join("\n");
    }
    handled = true;
  }

  const asksGlobalCatalogInModelStepTail = isGlobalCatalogAsk(text);
  const asksInventoryInModelStep = isInventoryInfoIntent(text) || isCatalogBreadthQuestion(text);
  if (!String(strictReply || "").trim() && (asksGlobalCatalogInModelStepTail || asksInventoryInModelStep)) {
    const families = buildNumberedFamilyOptions(ownerRows as any[], 10);
    const total = families.reduce((acc: number, f: any) => acc + Number(f?.count || 0), 0);
    strictMemory.last_category_intent = asksGlobalCatalogInModelStepTail ? "" : String(previousMemory?.last_category_intent || "");
    strictMemory.strict_family_label = "";
    strictMemory.pending_product_options = [];
    strictMemory.pending_family_options = families;
    strictMemory.strict_model_offset = 0;
    strictMemory.awaiting_action = "strict_choose_family";
    strictReply = families.length
      ? [
          `Perfecto. En total tengo ${total} referencias activas en base de datos.`,
          "Elige una familia para mostrarte modelos:",
          ...families.map((f: any) => `${f.code}) ${f.label} (${f.count})`),
          "",
          "Si quieres, también dime qué vas a pesar y su funcionalidad para identificar cuál se adecúa a tu empresa.",
          "Responde con letra o número (A/1).",
        ].join("\n")
      : "Ahora mismo no tengo familias activas para mostrarte en catálogo.";
    handled = true;
  }

  if (!String(strictReply || "").trim() && rangeHint) {
    const rangedOptionsAll = buildNumberedProductOptions(filterRowsByCapacityRange(familyRows as any[], rangeHint), 60);
    const rangedPage = rangedOptionsAll.slice(0, 8);
    if (rangedPage.length) {
      strictMemory.pending_product_options = rangedPage;
      strictMemory.strict_model_offset = 0;
      strictMemory.strict_family_label = familyLabel || String(previousMemory?.strict_family_label || "");
      strictReply = [
        `Perfecto. Te filtro por capacidad entre ${formatSpecNumber(rangeHint.minG)} g y ${Number.isFinite(rangeHint.maxG) ? `${formatSpecNumber(rangeHint.maxG)} g` : "más"}.`,
        ...rangedPage.slice(0, 4).map((o: any) => `${o.code}) ${o.name}`),
        "",
        (rangedOptionsAll.length > rangedPage.length)
          ? "Responde con letra o número (A/1), o escribe 'más' para ver siguientes."
          : "Responde con letra o número (A/1), o dime la resolución objetivo para afinar más.",
      ].join("\n");
    } else {
      strictReply = "No encontré modelos activos para ese rango de capacidad en esta familia. Si quieres, te muestro alternativas de otra familia.";
    }
    handled = true;
  }

  if (!String(strictReply || "").trim() && freeCatalogAskInModelStep && !isCategorySwitchInModelStep) {
    const asksMoreCapacityInModelStep = /(mas\s+capacidad|m[aá]s\s+capacidad|mayor\s+capacidad|de\s+mas\s+capacidad|de\s+m[aá]s\s+capacidad|mas\s+peso|m[aá]s\s+peso)/.test(textNorm);
    if (!categoryScoped.length) {
      strictMemory.awaiting_action = "strict_need_spec";
      strictReply = "En base de datos no tengo más referencias activas en este grupo por ahora. Si quieres, dime capacidad y resolución y te busco alternativas exactas.";
      handled = true;
    } else if (asksMoreCapacityInModelStep) {
      const byCapacity = [...categoryScoped]
        .filter((r: any) => Number(getRowCapacityG(r) || 0) > 0)
        .sort((a: any, b: any) => Number(getRowCapacityG(b) || 0) - Number(getRowCapacityG(a) || 0));
      const options = buildNumberedProductOptions((byCapacity.length ? byCapacity : categoryScoped) as any[], 8);
      strictMemory.awaiting_action = "strict_choose_model";
      strictMemory.pending_product_options = options;
      strictMemory.pending_family_options = [];
      strictMemory.strict_model_offset = 0;
      strictReply = options.length
        ? [
            "Sí, claro. Te comparto opciones de mayor capacidad que tengo activas en base de datos:",
            ...options.slice(0, 6).map((o: any) => `${o.code}) ${o.name}`),
            "",
            "Si quieres, después de elegir una te ayudo a validar la resolución ideal para tu uso.",
            "Puedes responder con letra o número (A/1).",
          ].join("\n")
        : "Ahora mismo no veo opciones de mayor capacidad activas en esta categoría. Si quieres, te propongo alternativas por disponibilidad.";
      handled = true;
    }
  }

  if (!String(strictReply || "").trim()) {
    const askCount = /\b(cuantas|cuantos|total|tienen\s+\d+|\d+)\b/.test(textNorm);
    const familyRows = familyLabel
      ? categoryScoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(familyLabel))
      : categoryScoped;
    const hasTechLock = hasActiveTechnicalRequirement(previousMemory);
    const lockedIds = Array.isArray(previousMemory?.strict_filtered_catalog_ids)
      ? previousMemory.strict_filtered_catalog_ids.map((v: any) => String(v || "").trim()).filter(Boolean)
      : [];
    const lockedRows = hasTechLock && lockedIds.length
      ? familyRows.filter((r: any) => lockedIds.includes(String(r?.id || "").trim()))
      : familyRows;
    const allOptions = buildNumberedProductOptions((lockedRows.length ? lockedRows : familyRows) as any[], 60);
    const total = allOptions.length;
    const prevOffset = Math.max(0, Number(previousMemory?.strict_model_offset || 0));
    const nextOffset = askMore ? Math.min(prevOffset + 8, Math.max(0, total - 1)) : prevOffset;
    const page = allOptions.slice(nextOffset, nextOffset + 8);
    strictMemory.pending_product_options = page;
    strictMemory.strict_model_offset = nextOffset;
    strictMemory.strict_family_label = familyLabel || String(previousMemory?.strict_family_label || "");

    if (!page.length) {
      strictReply = "No tengo más modelos en ese grupo. Si quieres, te muestro otra familia.";
    } else if (askMore || askCount) {
      strictReply = [
        familyLabel
          ? `Sí, en ${familyLabel} tengo ${total} referencia(s).`
          : `Sí, tengo ${total} referencia(s) en este grupo.`,
        ...page.map((o: any) => `${o.code}) ${o.name}`),
        "",
        (nextOffset + 8 < total)
          ? "Escribe 'más' para ver siguientes, o elige con letra/número (A/1)."
          : "Elige con letra/número (A/1), o pide otra familia.",
      ].join("\n");
    } else {
      strictReply = [
        "Elige un modelo del listado con letra o número (A/1), o escribe 'más' para ver siguientes.",
        ...page.map((o: any) => `${o.code}) ${o.name}`),
      ].join("\n");
    }
    handled = true;
  }

  return { handled, strictReply, strictBypassAutoQuote };
}
