import { executeQuotePdfFlow } from "./quote-pdf-flow";

export function handleStrictChooseActionQuoteEntry(args: {
  awaiting: string;
  text: string;
  previousMemory: Record<string, any>;
  strictMemory: Record<string, any>;
  inboundFrom: string;
  normalizePhone: (raw: string) => string;
  extractQuoteRequestedQuantity: (text: string) => number;
  getReusableBillingData: (memory: Record<string, any>) => {
    city: string;
    company: string;
    nit: string;
    contact: string;
    email: string;
    phone: string;
    complete: boolean;
  };
}): { handled: boolean } {
  if (args.awaiting !== "strict_choose_action") return { handled: false };
  const textNorm = String(args.text || "").trim().toLowerCase();
  if (!/^1\b/.test(textNorm)) return { handled: false };

  const qtyRequested = Math.max(1, args.extractQuoteRequestedQuantity(args.text) || Number(args.previousMemory?.quote_quantity || 1) || 1);
  args.strictMemory.quote_quantity = qtyRequested;
  args.strictMemory.awaiting_action = "strict_quote_data";

  const quoteMemoryMerged = {
    ...(args.previousMemory && typeof args.previousMemory === "object" ? args.previousMemory : {}),
    ...(args.strictMemory && typeof args.strictMemory === "object" ? args.strictMemory : {}),
    quote_data: {
      ...((args.previousMemory?.quote_data && typeof args.previousMemory.quote_data === "object") ? args.previousMemory.quote_data : {}),
      ...((args.strictMemory?.quote_data && typeof args.strictMemory.quote_data === "object") ? args.strictMemory.quote_data : {}),
    },
  };
  const reusableNow = args.getReusableBillingData(quoteMemoryMerged);
  args.strictMemory.quote_data = {
    city: reusableNow.city || String(args.previousMemory?.crm_billing_city || args.strictMemory.crm_billing_city || "") || "",
    company: reusableNow.company || String(args.previousMemory?.crm_company || args.strictMemory.crm_company || "") || String(args.previousMemory?.commercial_company_name || args.strictMemory.commercial_company_name || ""),
    nit: reusableNow.nit || String(args.previousMemory?.crm_nit || args.strictMemory.crm_nit || "") || String(args.previousMemory?.commercial_company_nit || args.strictMemory.commercial_company_nit || ""),
    contact: reusableNow.contact || String(args.previousMemory?.crm_contact_name || args.strictMemory.crm_contact_name || "") || String(args.previousMemory?.commercial_customer_name || args.strictMemory.commercial_customer_name || "") || String(args.previousMemory?.customer_name || args.strictMemory.customer_name || ""),
    email: reusableNow.email || String(args.previousMemory?.crm_contact_email || args.strictMemory.crm_contact_email || "") || String(args.previousMemory?.customer_email || args.strictMemory.customer_email || ""),
    phone: reusableNow.phone || String(args.previousMemory?.crm_contact_phone || args.strictMemory.crm_contact_phone || "") || args.normalizePhone(String(args.previousMemory?.customer_phone || args.strictMemory.customer_phone || args.inboundFrom || "")),
  };
  args.strictMemory.strict_autorun_quote_with_reuse = true;
  return { handled: true };
}

export function handleStrictConfirmQuoteAfterMissingSheet(args: any): { handled: boolean; strictReply: string } {
  if (String(args.strictReply || "").trim()) return { handled: false, strictReply: String(args.strictReply || "") };
  if (args.awaiting !== "strict_confirm_quote_after_missing_sheet") return { handled: false, strictReply: String(args.strictReply || "") };

  if (args.isAffirmativeShortIntent(args.text) || /^\s*1\b/.test(args.textNorm) || /\b(si|sí|dale|ok|de una|hagale|h[aá]gale)\b/.test(args.textNorm)) {
    const qtyRequested = Math.max(1, args.extractQuoteRequestedQuantity(args.text) || Number(args.previousMemory?.quote_quantity || 1) || 1);
    args.strictMemory.quote_quantity = qtyRequested;
    args.strictMemory.awaiting_action = "strict_quote_data";
    return {
      handled: true,
      strictReply: args.buildQuoteDataIntakePrompt(
        `Perfecto. Te genero la cotización ahora (${qtyRequested} unidad(es)).`,
        args.strictMemory
      ),
    };
  }
  if (args.isNegativeShortIntent(args.text) || /^\s*2\b/.test(args.textNorm) || /\b(no|despues|después|luego)\b/.test(args.textNorm)) {
    args.strictMemory.awaiting_action = "strict_choose_action";
    return { handled: true, strictReply: "Entendido. Responde 1 para cotización o 2 para ficha técnica." };
  }

  args.strictMemory.awaiting_action = "strict_confirm_quote_after_missing_sheet";
  return { handled: true, strictReply: "Para continuar, responde: sí para cotización o no para volver al menú." };
}

export function resolveSelectedProductForActionContext(args: any): any {
  let selectedProduct = args.selectedProduct || null;
  if (selectedProduct) return selectedProduct;

  const resolveRemembered = () => {
    const rememberedId = String(args.previousMemory?.last_selected_product_id || args.previousMemory?.last_product_id || "").trim();
    const rememberedName = String(args.previousMemory?.last_selected_product_name || args.previousMemory?.last_product_name || "").trim();
    if (rememberedId) {
      selectedProduct = args.ownerRows.find((r: any) => String(r?.id || "").trim() === rememberedId) || null;
    }
    if (!selectedProduct && rememberedName) {
      selectedProduct = args.findCatalogProductByName(args.ownerRows, rememberedName) || null;
    }
  };

  if (args.awaiting === "strict_choose_action") {
    resolveRemembered();
  }

  if (!selectedProduct && args.awaiting === "conversation_followup" && (/^1\b/.test(args.textNorm) || /^2\b/.test(args.textNorm))) {
    resolveRemembered();
  }

  if (!selectedProduct && args.awaiting === "strict_choose_model") {
    const pending = Array.isArray(args.previousMemory?.pending_product_options) ? args.previousMemory.pending_product_options : [];
    const selected = args.resolvePendingProductOptionStrict(args.text, pending);
    if (selected?.id) {
      selectedProduct = args.ownerRows.find((r: any) => String(r?.id || "") === String(selected.id || "")) || null;
    }
  }

  if (!selectedProduct && !args.isConversationFollowupAmbiguousQuote && (args.wantsSheet || args.wantsQuote || /\b(ficha|cotizacion|cotización|precio)\b/.test(args.textNorm))) {
    const rememberedId = String(args.previousMemory?.last_selected_product_id || args.previousMemory?.last_product_id || args.strictMemory?.last_selected_product_id || args.strictMemory?.last_product_id || "").trim();
    const rememberedName = String(args.previousMemory?.last_selected_product_name || args.previousMemory?.last_product_name || args.strictMemory?.last_selected_product_name || args.strictMemory?.last_product_name || "").trim();
    if (rememberedId) {
      selectedProduct = args.ownerRows.find((r: any) => String(r?.id || "").trim() === rememberedId) || null;
    }
    if (!selectedProduct && rememberedName) {
      selectedProduct = args.findCatalogProductByName(args.ownerRows, rememberedName) || null;
    }
  }

  return selectedProduct;
}

export function handleStrictAskMoreOptions(args: any): { handled: boolean; strictReply: string } {
  if (String(args.strictReply || "").trim()) return { handled: false, strictReply: String(args.strictReply || "") };
  const familyLabel = String(args.previousMemory?.strict_family_label || "").trim();
  const categoryScoped = args.rememberedCategory ? args.scopeCatalogRows(args.ownerRows, args.rememberedCategory) : args.ownerRows;
  const familyRows = familyLabel
    ? categoryScoped.filter((r: any) => args.normalizeText(args.familyLabelFromRow(r)) === args.normalizeText(familyLabel))
    : categoryScoped;

  let sourceRows: any[] = (familyRows.length ? familyRows : categoryScoped) as any[];
  if (args.includeTechnicalHint) {
    sourceRows = (familyRows.length >= 3 ? familyRows : categoryScoped) as any[];
    const specHint = args.parseLooseTechnicalHint(args.text);
    if (specHint?.capacityG && specHint?.readabilityG) {
      const prioritized = args.prioritizeTechnicalRows(categoryScoped as any[], {
        capacityG: Number(specHint.capacityG),
        readabilityG: Number(specHint.readabilityG),
      });
      if (prioritized.orderedRows.length) sourceRows = prioritized.orderedRows;
    }
  }

  const allOptions = args.buildNumberedProductOptions(sourceRows as any[], 60);
  const options = allOptions.slice(0, 8);
  args.strictMemory.pending_product_options = options;
  args.strictMemory.awaiting_action = "strict_choose_model";
  args.strictMemory.strict_model_offset = 0;
  args.strictMemory.strict_family_label = familyLabel;

  if (!options.length) {
    return {
      handled: true,
      strictReply: args.emptyReply || "No tengo más opciones en este grupo en este momento. Si quieres, dime otra capacidad/resolución y te filtro de nuevo.",
    };
  }

  return {
    handled: true,
    strictReply: [
      args.intro || "Claro, te muestro más opciones.",
      ...options.map((o: any) => `${o.code}) ${o.name}`),
      "",
      (allOptions.length > options.length)
        ? "Escribe 'más' para ver siguientes, o elige con letra/número (A/1)."
        : "Elige con letra/número (A/1), o dime otra capacidad para filtrar.",
    ].join("\n"),
  };
}

export function handleStrictQuoteDataPreGate(args: {
  strictReply: string;
  awaiting: string;
  text: string;
  strictMemory: Record<string, any>;
  previousMemory: Record<string, any>;
  ownerRows: any[];
  rememberedCategory: string;
  normalizeText: (raw: string) => string;
  scopeCatalogRows: (rows: any[], category: string) => any[];
  buildNumberedProductOptions: (rows: any[], maxItems: number) => any[];
  familyLabelFromRow: (row: any) => string;
  formatMoney: (value: number) => string;
  detectAlternativeFollowupIntent: (text: string) => string | null;
  isAnotherQuoteAmbiguousIntent: (text: string) => boolean;
  getReusableBillingData: (memory: Record<string, any>) => {
    city: string;
    company: string;
    nit: string;
    contact: string;
    email: string;
    phone: string;
    complete: boolean;
  };
  looksLikeBillingData: (text: string) => boolean;
  isAffirmativeShortIntent: (text: string) => boolean;
  isQuoteProceedIntent: (text: string) => boolean;
  isQuoteResumeIntent: (text: string) => boolean;
  isContinueQuoteWithoutPersonalDataIntent: (text: string) => boolean;
  asksQuoteIntent: (text: string) => boolean;
  billingDataAsSingleMessage: (data: { city: string; company: string; nit: string; contact: string; email: string; phone: string }) => string;
  buildAnotherQuotePrompt: () => string;
}): {
  handled: boolean;
  strictReply: string;
  quoteTurnText: string;
  shouldContinue: boolean;
  quoteDataInputText: string;
  reusableBilling: { city: string; company: string; nit: string; contact: string; email: string; phone: string; complete: boolean };
  shouldReuseBilling: boolean;
  isAdvance: boolean;
} {
  const emptyReusable = { city: "", company: "", nit: "", contact: "", email: "", phone: "", complete: false };
  if (String(args.strictReply || "").trim()) return { handled: false, strictReply: args.strictReply, quoteTurnText: args.text, shouldContinue: false, quoteDataInputText: args.text, reusableBilling: emptyReusable, shouldReuseBilling: false, isAdvance: false };
  if (!(args.awaiting === "strict_quote_data" || Boolean(args.strictMemory?.strict_autorun_quote_with_reuse))) {
    return { handled: false, strictReply: args.strictReply, quoteTurnText: args.text, shouldContinue: false, quoteDataInputText: args.text, reusableBilling: emptyReusable, shouldReuseBilling: false, isAdvance: false };
  }

  const quoteTurnText = Boolean(args.strictMemory?.strict_autorun_quote_with_reuse) ? "mismos datos" : args.text;
  args.strictMemory.strict_autorun_quote_with_reuse = false;

  const asksCheapest = /\b(economic|economica|economicas|economico|economicos|mas\s+barat|m[aá]s\s+barat|menor\s+precio|precio\s+bajo)\b/.test(args.normalizeText(quoteTurnText));
  if (asksCheapest) {
    const scoped = args.rememberedCategory ? args.scopeCatalogRows(args.ownerRows, args.rememberedCategory) : args.ownerRows;
    const pricedRows = scoped
      .filter((r: any) => Number(r?.base_price_usd || 0) > 0)
      .sort((a: any, b: any) => Number(a?.base_price_usd || 0) - Number(b?.base_price_usd || 0));
    const options = args.buildNumberedProductOptions(pricedRows, 8);
    if (options.length) {
      args.strictMemory.pending_product_options = options;
      args.strictMemory.pending_family_options = [];
      args.strictMemory.awaiting_action = "strict_choose_model";
      args.strictMemory.strict_model_offset = 0;
      args.strictMemory.quote_data = {};
      const topFamily = String(args.familyLabelFromRow(pricedRows[0]) || "N/A").trim();
      const strictReply = [
        `Perfecto. Según base de datos, la familia más económica aquí es: ${topFamily}.`,
        "Estas son 4 opciones de menor precio:",
        ...options.slice(0, 4).map((o: any) => {
          const p = Number(o.base_price_usd || 0);
          return `${o.code}) ${o.name}${p > 0 ? ` (USD ${args.formatMoney(p)})` : ""}`;
        }),
        "",
        "Responde con letra o número (A/1).",
      ].join("\n");
      return { handled: true, strictReply, quoteTurnText, shouldContinue: false, quoteDataInputText: quoteTurnText, reusableBilling: emptyReusable, shouldReuseBilling: false, isAdvance: false };
    }
  }

  const followupIntent = args.detectAlternativeFollowupIntent(quoteTurnText);
  const asksAnotherQuote = args.isAnotherQuoteAmbiguousIntent(quoteTurnText);
  const normalized = args.normalizeText(String(quoteTurnText || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  const isAdvance = normalized === "avanza";
  const explicitReuse = /\bmismos?\s+datos\b/.test(normalized) || /\busar\s+los?\s+mismos?\s+datos\b/.test(normalized) || /\bmisma\s+informacion\b/.test(normalized);
  const reusableBilling = args.getReusableBillingData({
    ...(args.previousMemory && typeof args.previousMemory === "object" ? args.previousMemory : {}),
    ...(args.strictMemory && typeof args.strictMemory === "object" ? args.strictMemory : {}),
    quote_data: {
      ...((args.previousMemory?.quote_data && typeof args.previousMemory.quote_data === "object") ? args.previousMemory.quote_data : {}),
      ...((args.strictMemory?.quote_data && typeof args.strictMemory.quote_data === "object") ? args.strictMemory.quote_data : {}),
    },
  });
  const canAutoResume = reusableBilling.complete && !isAdvance && !args.looksLikeBillingData(quoteTurnText) && (
    args.isAffirmativeShortIntent(quoteTurnText) ||
    args.isQuoteProceedIntent(quoteTurnText) ||
    args.isQuoteResumeIntent(quoteTurnText) ||
    args.isContinueQuoteWithoutPersonalDataIntent(quoteTurnText) ||
    args.asksQuoteIntent(quoteTurnText) ||
    /^\s*1\b/.test(String(quoteTurnText || ""))
  );
  const shouldReuse = (explicitReuse && reusableBilling.complete) || canAutoResume;
  const quoteDataInputText = shouldReuse ? args.billingDataAsSingleMessage(reusableBilling) : quoteTurnText;
  const hasBillingData = args.looksLikeBillingData(quoteDataInputText);
  const isCommercialAlternative = asksAnotherQuote || (followupIntent && followupIntent !== "requote_same_model");
  const crmKnown = Boolean(args.previousMemory?.crm_contact_found || args.strictMemory.crm_contact_found);

  if (!crmKnown && isCommercialAlternative) {
    args.strictMemory.awaiting_action = "strict_quote_data";
    return {
      handled: true,
      strictReply: "Para cliente nuevo primero debo registrar datos obligatorios de facturación: ciudad, empresa, NIT, contacto, correo y celular. Luego continúo con la cotización.",
      quoteTurnText,
      shouldContinue: false,
      quoteDataInputText,
      reusableBilling,
      shouldReuseBilling: shouldReuse,
      isAdvance,
    };
  }
  if (isCommercialAlternative) {
    args.strictMemory.awaiting_action = "conversation_followup";
    args.strictMemory.last_intent = String(followupIntent || "alternative_same_need");
    return {
      handled: true,
      strictReply: asksAnotherQuote
        ? args.buildAnotherQuotePrompt()
        : "Entendido. Para alternativas, dime si prefieres: otro modelo, más económico, mayor capacidad, menor capacidad u otra marca.",
      quoteTurnText,
      shouldContinue: false,
      quoteDataInputText,
      reusableBilling,
      shouldReuseBilling: shouldReuse,
      isAdvance,
    };
  }
  if (explicitReuse && !reusableBilling.complete) {
    const missing: string[] = [];
    if (!reusableBilling.city) missing.push("ciudad");
    if (!reusableBilling.company) missing.push("empresa");
    if (!reusableBilling.nit) missing.push("NIT");
    if (!reusableBilling.contact) missing.push("contacto");
    if (!reusableBilling.email) missing.push("correo");
    if (!reusableBilling.phone) missing.push("celular");
    args.strictMemory.awaiting_action = "strict_quote_data";
    return {
      handled: true,
      strictReply: missing.length
        ? `Puedo reutilizar los datos anteriores, pero me falta: ${missing.join(", ")}. Envíamelo en un solo mensaje para continuar.`
        : "No encontré datos previos completos para reutilizar. Envíame ciudad, empresa, NIT, contacto, correo y celular en un solo mensaje.",
      quoteTurnText,
      shouldContinue: false,
      quoteDataInputText,
      reusableBilling,
      shouldReuseBilling: shouldReuse,
      isAdvance,
    };
  }
  if (!isAdvance && !hasBillingData && !shouldReuse) {
    args.strictMemory.awaiting_action = "strict_quote_data";
    return {
      handled: true,
      strictReply: "Para continuar esta cotización, envíame los datos de facturación en un solo mensaje (ciudad, empresa, NIT, contacto, correo, celular).",
      quoteTurnText,
      shouldContinue: false,
      quoteDataInputText,
      reusableBilling,
      shouldReuseBilling: shouldReuse,
      isAdvance,
    };
  }

  return {
    handled: true,
    strictReply: "",
    quoteTurnText,
    shouldContinue: true,
    quoteDataInputText,
    reusableBilling,
    shouldReuseBilling: shouldReuse,
    isAdvance,
  };
}

export function handleStrictChooseActionQuoteIntent(args: {
  strictReply: string;
  strictBypassAutoQuote: boolean;
  awaiting: string;
  wantsQuote: boolean;
  text: string;
  textNorm: string;
  selectedName: string;
  selectedProduct: any;
  inbound: { text: string; from: string };
  nextMemory: Record<string, any>;
  strictMemory: Record<string, any>;
  previousMemory: Record<string, any>;
  lastRecommendedOptions: any[];
  extractQuoteRequestedQuantity: (text: string) => number;
  asksQuoteIntent: (text: string) => boolean;
  normalizeText: (value: string) => string;
  formatSpecNumber: (value: number) => string;
  extractRowTechnicalSpec: (row: any) => { capacityG: number; readabilityG: number };
  isSameQuoteContinuationIntent: (text: string) => boolean;
  extractModelLikeTokens: (text: string) => string[];
  isFlowChangeWithoutModelDetailsIntent: (text: string) => boolean;
  getReusableBillingData: (memory: Record<string, any>) => {
    city: string;
    company: string;
    nit: string;
    contact: string;
    email: string;
    phone: string;
    complete: boolean;
  };
  normalizePhone: (raw: string) => string;
}): { strictReply: string; strictBypassAutoQuote: boolean } {
  let strictReply = String(args.strictReply || "");
  let strictBypassAutoQuote = Boolean(args.strictBypassAutoQuote);
  if (String(strictReply).trim()) return { strictReply, strictBypassAutoQuote };
  if (!(args.wantsQuote || /^1\b/.test(args.textNorm))) return { strictReply, strictBypassAutoQuote };

  const effectiveRecommendedPool =
    (Array.isArray(args.strictMemory?.last_recommended_options) && args.strictMemory.last_recommended_options.length)
      ? args.strictMemory.last_recommended_options
      : (args.lastRecommendedOptions.length
        ? args.lastRecommendedOptions
        : (Array.isArray(args.previousMemory?.last_recommended_options) ? args.previousMemory.last_recommended_options : []));

  const bundleQuoteAskFromAction = args.asksQuoteIntent(args.text) && /\b(las|los|todas|todos|opciones|referencias|3|tres)\b/.test(args.textNorm);
  const bundlePool = effectiveRecommendedPool
    .filter((o: any) => String(o?.raw_name || o?.name || "").trim())
    .slice(0, 8);
  if (bundleQuoteAskFromAction && bundlePool.length >= 2) {
    const countMatch = args.textNorm.match(/\b(\d{1,2}|dos|tres|cuatro|cinco)\b/);
    const nWord = String(countMatch?.[1] || "").trim();
    const nMap: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, cinco: 5 };
    const requested = /\b(todas|todos)\b/.test(args.textNorm)
      ? bundlePool.length
      : Math.max(2, Number(nWord ? (Number(nWord) || nMap[nWord] || 3) : 3));
    const chosen = bundlePool.slice(0, Math.max(2, Math.min(requested, bundlePool.length)));
    const names = chosen.map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
    if (names.length >= 2) {
      strictBypassAutoQuote = true;
      args.inbound.text = `cotizar ${names.join(" ; ")}`;
      args.strictMemory.awaiting_action = "none";
      args.strictMemory.pending_product_options = chosen;
      args.strictMemory.quote_bundle_options_current = chosen;
      args.strictMemory.last_intent = "quote_bundle_request";
      args.strictMemory.bundle_quote_mode = true;
      args.strictMemory.bundle_quote_count = names.length;
      strictReply = `Perfecto. Voy a generar una cotización consolidada para esas ${names.length} opciones y te la envío en PDF por este WhatsApp.`;
      return { strictReply, strictBypassAutoQuote };
    }
  }

  const lockedCap = Number(args.previousMemory?.strict_filter_capacity_g || 0);
  const lockedRead = Number(args.previousMemory?.strict_filter_readability_g || 0);
  const selectedFromSuggestedList = effectiveRecommendedPool.some((o: any) => {
    const oid = String(o?.id || "").trim();
    const oraw = args.normalizeText(String(o?.raw_name || o?.name || ""));
    return (
      (oid && oid === String(args.selectedProduct?.id || "").trim()) ||
      (oraw && oraw === args.normalizeText(args.selectedName))
    );
  });
  if (lockedCap > 0 && lockedRead > 0 && !selectedFromSuggestedList && args.awaiting !== "strict_choose_action") {
    const rs = args.extractRowTechnicalSpec(args.selectedProduct);
    const capDeltaPct = rs.capacityG > 0 ? (Math.abs(rs.capacityG - lockedCap) / lockedCap) * 100 : 999;
    const readRatio = rs.readabilityG > 0 ? (rs.readabilityG / lockedRead) : 999;
    const compatible = capDeltaPct <= 12 && readRatio >= 0.8 && readRatio <= 1.35;
    if (!compatible) {
      strictReply = `Antes de cotizar, confirmo que ${args.selectedName} no coincide con tu filtro activo (${args.formatSpecNumber(lockedCap)} g x ${args.formatSpecNumber(lockedRead)} g). Elige una opción del listado filtrado (A/1) o escribe 'más'.`;
      args.strictMemory.awaiting_action = "strict_choose_model";
      return { strictReply, strictBypassAutoQuote };
    }
  }

  const continuationIntentStrict = args.isSameQuoteContinuationIntent(args.text) && args.extractModelLikeTokens(args.text).length >= 1;
  if (continuationIntentStrict) {
    strictBypassAutoQuote = true;
    args.inbound.text = `cotizar ${args.selectedName} ${args.text}`.trim();
    args.nextMemory.awaiting_action = "quote_product_selection";
    args.nextMemory.last_product_name = args.selectedName;
    args.nextMemory.last_product_id = String(args.selectedProduct?.id || "").trim();
    args.nextMemory.last_selected_product_name = args.selectedName;
    args.nextMemory.last_selected_product_id = String(args.selectedProduct?.id || "").trim();
    args.nextMemory.last_selection_at = new Date().toISOString();
    args.strictMemory.awaiting_action = "none";
    return { strictReply, strictBypassAutoQuote };
  }

  const asksFlowChangeNoDetails = args.isFlowChangeWithoutModelDetailsIntent(args.text);
  if (asksFlowChangeNoDetails) {
    args.strictMemory.awaiting_action = "strict_choose_action";
    strictReply = "Perfecto. Para evitar ambigüedad, indícame primero qué familia o referencias quieres cotizar y la cantidad por cada una (ej: PX85 x1, PX223 x2).";
    return { strictReply, strictBypassAutoQuote };
  }

  const qtyRequested = Math.max(1, args.extractQuoteRequestedQuantity(args.text) || Number(args.previousMemory?.quote_quantity || 1) || 1);
  args.strictMemory.quote_quantity = qtyRequested;
  args.strictMemory.awaiting_action = "strict_quote_data";
  const quoteMemoryMerged = {
    ...(args.previousMemory && typeof args.previousMemory === "object" ? args.previousMemory : {}),
    ...(args.strictMemory && typeof args.strictMemory === "object" ? args.strictMemory : {}),
    quote_data: {
      ...((args.previousMemory?.quote_data && typeof args.previousMemory.quote_data === "object") ? args.previousMemory.quote_data : {}),
      ...((args.strictMemory?.quote_data && typeof args.strictMemory.quote_data === "object") ? args.strictMemory.quote_data : {}),
    },
  };
  const reusableNow = args.getReusableBillingData(quoteMemoryMerged);
  args.strictMemory.quote_data = {
    city: reusableNow.city || String(args.previousMemory?.crm_billing_city || args.strictMemory.crm_billing_city || "") || "",
    company: reusableNow.company || String(args.previousMemory?.crm_company || args.strictMemory.crm_company || "") || String(args.previousMemory?.commercial_company_name || args.strictMemory.commercial_company_name || ""),
    nit: reusableNow.nit || String(args.previousMemory?.crm_nit || args.strictMemory.crm_nit || "") || String(args.previousMemory?.commercial_company_nit || args.strictMemory.commercial_company_nit || ""),
    contact: reusableNow.contact || String(args.previousMemory?.crm_contact_name || args.strictMemory.crm_contact_name || "") || String(args.previousMemory?.commercial_customer_name || args.strictMemory.commercial_customer_name || "") || String(args.previousMemory?.customer_name || args.strictMemory.customer_name || ""),
    email: reusableNow.email || String(args.previousMemory?.crm_contact_email || args.strictMemory.crm_contact_email || "") || String(args.previousMemory?.customer_email || args.strictMemory.customer_email || ""),
    phone: reusableNow.phone || String(args.previousMemory?.crm_contact_phone || args.strictMemory.crm_contact_phone || "") || args.normalizePhone(String(args.previousMemory?.customer_phone || args.strictMemory.customer_phone || args.inbound.from || "")),
  };
  args.strictMemory.strict_autorun_quote_with_reuse = true;
  return { strictReply, strictBypassAutoQuote };
}

export async function executeStrictQuoteDataExecutionBlock(args: any): Promise<{ strictReply: string; strictBypassAutoQuote: boolean }> {
  let strictReply = String(args.strictReply || "");
  let strictBypassAutoQuote = Boolean(args.strictBypassAutoQuote);

  const bundleOptions = Array.isArray(args.previousMemory?.quote_bundle_options)
    ? args.previousMemory.quote_bundle_options
    : (Array.isArray(args.previousMemory?.pending_product_options)
        ? args.previousMemory.pending_product_options
        : (Array.isArray(args.previousMemory?.last_recommended_options) ? args.previousMemory.last_recommended_options : []));

  if (bundleOptions.length >= 2 && args.isContinueQuoteWithoutPersonalDataIntent(args.text)) {
    const modelNames = bundleOptions
      .map((o: any) => String(o?.raw_name || o?.name || "").trim())
      .filter(Boolean);
    if (modelNames.length >= 2) {
      strictBypassAutoQuote = true;
      args.inbound.text = `cotizar ${modelNames.join(" ; ")} cantidad 1 para todos`;
      args.strictMemory.awaiting_action = "none";
      args.strictMemory.pending_product_options = bundleOptions;
      args.strictMemory.last_recommended_options = bundleOptions;
      args.strictMemory.last_intent = "quote_bundle_request";
      args.strictMemory.bundle_quote_mode = true;
      args.strictMemory.bundle_quote_count = modelNames.length;
      args.strictMemory.quote_data = {};
    }
  } else if (args.isContinueQuoteWithoutPersonalDataIntent(args.text)) {
    strictReply = "Perfecto. Para avanzar sin datos, primero confirma el lote a cotizar (ej.: cotizar 8 o cotizar A,B,C).";
    args.strictMemory.awaiting_action = "strict_choose_model";
  }

  if (strictBypassAutoQuote || String(strictReply || "").trim()) {
    return { strictReply, strictBypassAutoQuote };
  }

  const pickBounded = (label: string) => {
    const rx = new RegExp(`${label}\\s*[:=]?\\s*([^\\n,;]+?)(?=\\s+(ciudad|empresa|company|nit|contacto|correo|email|celular|telefono)\\b|$)`, "i");
    const m = String(args.quoteDataInputText || "").match(rx);
    return m?.[1] ? String(m[1]).trim() : "";
  };

  const looseLines = String(args.quoteDataInputText || "").split(/\n|;|,/).map((x) => String(x || "").trim()).filter(Boolean);
  const firstEmailLine = looseLines.find((ln) => /@/.test(ln)) || "";
  const firstPhoneLine = looseLines.find((ln) => /\b(?:\+?57\s*)?3\d{9}\b/.test(ln.replace(/\s+/g, ""))) || "";
  const firstNitLine = looseLines.find((ln) => /^\d{6,14}$/.test(ln.replace(/\D/g, ""))) || "";
  const firstCityLine = looseLines.find((ln) => /^[a-zA-Záéíóúüñ\s]{3,40}$/.test(ln) && !/@/.test(ln) && !/persona\s+natural|sas|s\.a\.s|ltda|nit/i.test(ln)) || "";
  const firstCompanyLine = looseLines.find((ln) => /persona\s+natural|sas|s\.a\.s|ltda|empresa|razon\s+social/i.test(ln)) || "";
  const firstContactLine = looseLines.find((ln) => /^[a-zA-Záéíóúüñ\s]{6,60}$/.test(ln) && ln !== firstCityLine && ln !== firstCompanyLine && !/@/.test(ln)) || "";

  const cityNow = args.normalizeCityLabel(pickBounded("ciudad|city") || args.extractLabeledValue(args.quoteDataInputText, ["ciudad", "city"]) || firstCityLine);
  const companyNow = pickBounded("empresa|company|razon social") || args.extractLabeledValue(args.quoteDataInputText, ["empresa", "company", "razon social"]) || firstCompanyLine;
  const nitNow = (String(args.quoteDataInputText || "").match(/\bnit\s*[:=]?\s*([0-9\.\-]{5,20})/i)?.[1] || args.extractLabeledValue(args.quoteDataInputText, ["nit"]).replace(/[^0-9.\-]/g, "") || firstNitLine.replace(/[^0-9.\-]/g, "")).trim();
  const contactNow = pickBounded("contacto") || args.extractLabeledValue(args.quoteDataInputText, ["contacto"]) || firstContactLine || args.extractCustomerName(args.quoteDataInputText, args.inbound.pushName || "");
  const emailNow = args.extractEmail(args.quoteDataInputText) || String(firstEmailLine || "").trim();
  const phoneNow = args.extractCustomerPhone(args.quoteDataInputText, args.inbound.from) || String(firstPhoneLine || "").replace(/\D/g, "");

  const prevQuoteData = args.previousMemory?.quote_data && typeof args.previousMemory.quote_data === "object" ? args.previousMemory.quote_data : {};
  let crmContactFoundForQuote = Boolean(args.previousMemory?.crm_contact_found || args.strictMemory.crm_contact_found);
  let crmNameForQuote = String(args.previousMemory?.crm_contact_name || args.strictMemory.crm_contact_name || "").trim();
  let crmEmailForQuote = String(args.previousMemory?.crm_contact_email || args.strictMemory.crm_contact_email || "").trim();
  let crmPhoneForQuote = String(args.previousMemory?.crm_contact_phone || args.strictMemory.crm_contact_phone || "").trim();
  let crmCompanyForQuote = String(args.previousMemory?.crm_company || args.strictMemory.crm_company || "").trim();
  let crmNitForQuote = String(args.previousMemory?.crm_nit || args.strictMemory.crm_nit || "").trim();
  let crmCityForQuote = args.normalizeCityLabel(String(args.previousMemory?.crm_billing_city || args.strictMemory.crm_billing_city || "").trim());
  let crmTierForQuote = args.normalizeText(String(args.previousMemory?.crm_price_tier || args.strictMemory.crm_price_tier || "").trim());
  let crmTypeForQuote = args.normalizeText(String(args.previousMemory?.crm_customer_type || args.strictMemory.crm_customer_type || "").trim());
  const rememberedExistingMatch =
    args.previousMemory?.commercial_existing_match && typeof args.previousMemory.commercial_existing_match === "object"
      ? args.previousMemory.commercial_existing_match
      : (args.strictMemory?.commercial_existing_match && typeof args.strictMemory.commercial_existing_match === "object"
          ? args.strictMemory.commercial_existing_match
          : {});
  const rememberedExistingType = args.normalizeText(String(args.previousMemory?.commercial_client_type || args.strictMemory?.commercial_client_type || "").trim()) === "existing";

  if (!crmContactFoundForQuote && rememberedExistingMatch && Object.keys(rememberedExistingMatch).length) {
    const fallbackName = args.sanitizeCustomerDisplayName(String((rememberedExistingMatch as any)?.contact || "").trim());
    const fallbackEmail = String((rememberedExistingMatch as any)?.email || "").trim().toLowerCase();
    const fallbackPhone = args.normalizePhone(String((rememberedExistingMatch as any)?.phone || "").trim());
    const fallbackCompany = String((rememberedExistingMatch as any)?.company || "").trim();
    const fallbackNit = String((rememberedExistingMatch as any)?.nit || "").replace(/\D/g, "").trim();
    const fallbackCity = args.normalizeCityLabel(String((rememberedExistingMatch as any)?.city || "").trim());
    if (fallbackName || fallbackEmail || fallbackPhone || fallbackCompany || fallbackNit) {
      crmContactFoundForQuote = true;
      if (fallbackName) crmNameForQuote = fallbackName;
      if (fallbackEmail) crmEmailForQuote = fallbackEmail;
      if (fallbackPhone) crmPhoneForQuote = fallbackPhone;
      if (fallbackCompany) crmCompanyForQuote = fallbackCompany;
      if (fallbackNit) crmNitForQuote = fallbackNit;
      if (fallbackCity) crmCityForQuote = fallbackCity;
      args.strictMemory.crm_contact_found = true;
      args.strictMemory.crm_contact_name = crmNameForQuote;
      args.strictMemory.crm_contact_email = crmEmailForQuote;
      args.strictMemory.crm_contact_phone = crmPhoneForQuote;
      args.strictMemory.crm_company = crmCompanyForQuote;
      args.strictMemory.crm_nit = crmNitForQuote;
      args.strictMemory.crm_billing_city = crmCityForQuote;
    }
  }

  if (!crmContactFoundForQuote) {
    try {
      const candidatePhone = args.normalizePhone(phoneNow || args.inbound.from || "");
      const candidatePhoneTail = args.phoneTail10(candidatePhone);
      const candidateNit = String(nitNow || "").replace(/[^0-9\-]/g, "").trim();
      const candidateEmail = String(emailNow || "").trim().toLowerCase();
      const keyVariants = [
        candidatePhone ? `cel:${candidatePhone}` : "",
        candidatePhoneTail ? `cel:${candidatePhoneTail}` : "",
        candidateNit ? `nit:${candidateNit}` : "",
        candidateEmail ? `email:${candidateEmail}` : "",
      ].filter(Boolean);
      if (keyVariants.length || candidatePhone) {
        const orParts = [
          ...keyVariants.map((k) => `contact_key.eq.${k}`),
          candidatePhone ? `phone.eq.${candidatePhone}` : "",
          candidatePhoneTail ? `phone.like.%${candidatePhoneTail}` : "",
        ].filter(Boolean);
        const { data: crmMatches } = await args.supabase
          .from("agent_crm_contacts")
          .select("id,name,email,phone,company,metadata")
          .eq("created_by", args.ownerId)
          .or(orParts.join(","))
          .order("updated_at", { ascending: false })
          .limit(5);
        const crmMatch = Array.isArray(crmMatches)
          ? (crmMatches.find((m: any) => {
              const p = args.normalizePhone(String(m?.phone || ""));
              const tail = args.phoneTail10(p);
              const ck = String(m?.contact_key || "").trim().toLowerCase();
              if (candidateNit && ck === `nit:${candidateNit}`) return true;
              if (candidateEmail && ck === `email:${candidateEmail}`) return true;
              if (candidatePhone && (p === candidatePhone || ck === `cel:${candidatePhone}`)) return true;
              if (candidatePhoneTail && (tail === candidatePhoneTail || ck === `cel:${candidatePhoneTail}`)) return true;
              return false;
            }) || crmMatches[0])
          : null;
        if (crmMatch && typeof crmMatch === "object") {
          const m = (crmMatch as any)?.metadata && typeof (crmMatch as any).metadata === "object" ? (crmMatch as any).metadata : {};
          crmContactFoundForQuote = true;
          crmNameForQuote = String((crmMatch as any)?.name || "").trim();
          crmEmailForQuote = String((crmMatch as any)?.email || "").trim();
          crmPhoneForQuote = String((crmMatch as any)?.phone || "").trim();
          crmCompanyForQuote = String((crmMatch as any)?.company || "").trim();
          crmNitForQuote = String(m?.nit || "").trim();
          crmCityForQuote = args.normalizeCityLabel(String(m?.billing_city || "").trim());
          crmTierForQuote = args.normalizeText(String(m?.price_tier || "").trim());
          crmTypeForQuote = args.normalizeText(String(m?.customer_type || "").trim());
          args.strictMemory.crm_contact_found = true;
          args.strictMemory.crm_contact_id = String((crmMatch as any)?.id || "").trim();
          args.strictMemory.crm_contact_name = crmNameForQuote;
          args.strictMemory.crm_contact_email = crmEmailForQuote;
          args.strictMemory.crm_contact_phone = crmPhoneForQuote;
          args.strictMemory.crm_company = crmCompanyForQuote;
          args.strictMemory.crm_nit = crmNitForQuote;
          args.strictMemory.crm_billing_city = crmCityForQuote;
          args.strictMemory.crm_price_tier = crmTierForQuote;
          args.strictMemory.crm_customer_type = crmTypeForQuote;
        }
      }
    } catch {}
  }

  const quoteData = args.shouldReuseBillingInQuoteData
    ? {
        city: args.reusableBillingInQuoteData.city,
        company: args.reusableBillingInQuoteData.company,
        nit: args.reusableBillingInQuoteData.nit,
        contact: args.reusableBillingInQuoteData.contact,
        email: args.reusableBillingInQuoteData.email,
        phone: args.reusableBillingInQuoteData.phone,
      }
    : {
        city: cityNow || String(prevQuoteData.city || "") || crmCityForQuote,
        company: companyNow || String(prevQuoteData.company || "") || crmCompanyForQuote || String(args.previousMemory?.commercial_company_name || args.strictMemory.commercial_company_name || ""),
        nit: nitNow || String(prevQuoteData.nit || "") || crmNitForQuote || String(args.previousMemory?.commercial_company_nit || args.strictMemory.commercial_company_nit || ""),
        contact: contactNow || String(prevQuoteData.contact || "") || crmNameForQuote || String(args.previousMemory?.commercial_customer_name || args.strictMemory.commercial_customer_name || "") || String(args.previousMemory?.customer_name || args.strictMemory.customer_name || ""),
        email: emailNow || String(prevQuoteData.email || "") || crmEmailForQuote || String(args.previousMemory?.customer_email || args.strictMemory.customer_email || ""),
        phone: phoneNow || String(prevQuoteData.phone || "") || crmPhoneForQuote || args.normalizePhone(String(args.previousMemory?.customer_phone || args.strictMemory.customer_phone || args.inbound.from || "")),
      };
  args.strictMemory.quote_data = quoteData;

  const customerCity = String(quoteData.city || "").trim() || ((Boolean(crmContactFoundForQuote) || Boolean(args.recognizedReturningCustomer) || rememberedExistingType) ? "Bogota" : "");
  const customerCompany = String(quoteData.company || "").trim();
  const customerNit = String(quoteData.nit || "").trim();
  const customerContact = String(quoteData.contact || "").trim();
  const customerEmail = String(quoteData.email || "").trim();
  const customerPhone = String(quoteData.phone || "").trim();
  const companyNorm = args.normalizeText(customerCompany);
  const applicantNorm = args.normalizeText(String(args.quoteDataInputText || ""));
  const isNaturalPerson = !customerCompany || /persona\s+natural/.test(companyNorm) || /persona\s+natural/.test(applicantNorm);
  const hasAnyQuoteData = Boolean(customerCity || customerCompany || customerNit || customerContact || customerEmail || customerPhone);
  const hasContactCore = customerContact.length >= 3;
  const hasCityCore = customerCity.length >= 3;
  const hasIdentityCore = customerNit.length >= 5;
  const hasReachability = customerEmail.includes("@") || customerPhone.replace(/\D/g, "").length >= 7;
  const hasBusinessCore = customerCompany.length >= 3;
  const isDistributorCustomer = crmTierForQuote === "distribuidor" || crmTypeForQuote === "distributor";
  const isExistingCustomer = !isDistributorCustomer && crmContactFoundForQuote && (Boolean(args.recognizedReturningCustomer) || rememberedExistingType);
  const customerSegment = isDistributorCustomer ? "distributor" : (isExistingCustomer ? "existing" : "new");
  args.strictMemory.customer_segment = customerSegment;
  const hasBusinessOrReachability = isNaturalPerson ? (hasIdentityCore && hasReachability) : (hasBusinessCore && hasIdentityCore && hasReachability);
  const hasBusinessOrReachabilityForKnownExisting = customerSegment === "existing" && crmContactFoundForQuote ? (hasBusinessCore && hasReachability) : hasBusinessOrReachability;
  const missingOnlyCityForKnownExisting = customerSegment === "existing" && crmContactFoundForQuote && hasContactCore && hasBusinessOrReachabilityForKnownExisting && !hasCityCore;
  const quoteTurnNorm = args.normalizeText(String(args.quoteTurnText || ""));
  const quoteActionOnlyInput = /^\s*1\s*$/.test(String(args.quoteTurnText || "")) || args.isAffirmativeShortIntent(args.quoteTurnText) || args.isQuoteProceedIntent(args.quoteTurnText) || args.isQuoteResumeIntent(args.quoteTurnText) || args.isContinueQuoteWithoutPersonalDataIntent(args.quoteTurnText);
  const hasFreshBillingPayloadInMessage = args.looksLikeBillingData(String(args.quoteTurnText || "")) || /\b(ciudad|empresa|nit|contacto|correo|celular|telefono|teléfono)\b/.test(quoteTurnNorm) || /@/.test(String(args.quoteTurnText || ""));
  const missingAttemptsPrev = Number(args.previousMemory?.strict_quote_data_missing_attempts || args.strictMemory.strict_quote_data_missing_attempts || 0);

  if (customerSegment === "existing" && crmContactFoundForQuote && hasCityCore) {
    const resolvedCity = args.normalizeCityLabel(customerCity);
    args.strictMemory.crm_billing_city = resolvedCity;
    args.strictMemory.quote_data = {
      ...(args.strictMemory.quote_data && typeof args.strictMemory.quote_data === "object" ? args.strictMemory.quote_data : {}),
      city: resolvedCity,
    };
    try {
      const existingContactId = String(args.strictMemory.crm_contact_id || "").trim();
      if (existingContactId) {
        const { data: existingRow } = await args.supabase
          .from("agent_crm_contacts")
          .select("metadata")
          .eq("id", existingContactId)
          .eq("created_by", args.ownerId)
          .maybeSingle();
        const mergedMetadata = {
          ...(existingRow?.metadata && typeof existingRow.metadata === "object" ? existingRow.metadata : {}),
          billing_city: resolvedCity,
          whatsapp_lifecycle_at: new Date().toISOString(),
        };
        await args.supabase
          .from("agent_crm_contacts")
          .update({ metadata: mergedMetadata })
          .eq("id", existingContactId)
          .eq("created_by", args.ownerId);
      }
    } catch {}
  }

  if (!crmContactFoundForQuote && args.isAdvanceInQuoteData) {
    const missingAttempts = missingAttemptsPrev + 1;
    args.strictMemory.strict_quote_data_missing_attempts = missingAttempts;
    args.strictMemory.awaiting_action = "strict_quote_data";
    if (missingAttempts >= 3) {
      args.strictMemory.awaiting_action = "none";
      args.strictMemory.conversation_status = "closed";
      args.strictMemory.last_intent = "quote_rejected_missing_data";
      strictReply = "No puedo generar cotización sin datos obligatorios. Cierro esta solicitud por seguridad. Si deseas retomarla, escribe: cotización y comparte ciudad, empresa, NIT, contacto, correo y celular.";
    } else {
      strictReply = "Para cliente nuevo sí necesito datos de facturación antes de cotizar: ciudad, empresa, NIT, contacto, correo y celular.";
    }
  } else if (!args.isAdvanceInQuoteData && quoteActionOnlyInput && hasAnyQuoteData && !(hasContactCore && hasCityCore && hasBusinessOrReachabilityForKnownExisting) && !hasFreshBillingPayloadInMessage) {
    args.strictMemory.strict_quote_data_missing_attempts = missingAttemptsPrev + 1;
    args.strictMemory.awaiting_action = "strict_quote_data";
    strictReply = missingOnlyCityForKnownExisting
      ? "Para continuar esta cotización solo me falta la ciudad. Envíamela en un solo mensaje (ej.: Bogotá)."
      : "Para continuar esta cotización, envíame los datos de facturación en un solo mensaje (ciudad, empresa, NIT, contacto, correo, celular).";
  } else if (!args.isAdvanceInQuoteData && hasAnyQuoteData && !(hasContactCore && hasCityCore && hasBusinessOrReachabilityForKnownExisting) && hasFreshBillingPayloadInMessage) {
    const missingAttempts = missingAttemptsPrev + 1;
    args.strictMemory.strict_quote_data_missing_attempts = missingAttempts;
    const missing: string[] = [];
    if (!hasContactCore) missing.push("contacto");
    if (!hasCityCore) missing.push("ciudad");
    if (isNaturalPerson) {
      if (!hasIdentityCore) missing.push("cédula o NIT");
      if (!hasReachability) missing.push("correo o celular");
    } else {
      if (!hasBusinessCore) missing.push("empresa");
      if (!hasIdentityCore) missing.push("NIT");
      if (!hasReachability) missing.push("correo o celular");
    }
    if (!crmContactFoundForQuote && missingAttempts >= 3) {
      args.strictMemory.awaiting_action = "none";
      args.strictMemory.conversation_status = "closed";
      args.strictMemory.last_intent = "quote_rejected_missing_data";
      strictReply = "No puedo generar cotización sin datos obligatorios. Cierro esta solicitud por seguridad. Si deseas retomarla, escribe: cotización y comparte ciudad, empresa, NIT, contacto, correo y celular.";
    } else {
      args.strictMemory.awaiting_action = "strict_quote_data";
      strictReply = missingOnlyCityForKnownExisting
        ? "Perfecto, para continuar solo me falta la ciudad. Envíamela en un solo mensaje (ej.: Bogotá)."
        : `Perfecto, ya registré parte de tus datos. Para continuar me falta: ${missing.join(", ")}. Puedes enviarlo en un solo mensaje o escribir exactamente: avanza.`;
    }
  }

  if (!String(strictReply || "").trim()) {
    strictReply = await executeQuotePdfFlow({
      ...args,
      strictReply,
      customerCity,
      customerCompany,
      customerNit,
      customerContact,
      customerEmail,
      customerPhone,
      customerSegment,
      crmTierForQuote,
      crmTypeForQuote,
    });
  }

  return { strictReply, strictBypassAutoQuote };
}

export async function handleStrictSelectedProductActionFlow(args: any): Promise<{ handled: boolean; strictReply: string; strictBypassAutoQuote: boolean }> {
  if (String(args.strictReply || "").trim()) return { handled: false, strictReply: String(args.strictReply || ""), strictBypassAutoQuote: Boolean(args.strictBypassAutoQuote) };
  if (!args.selectedProduct) return { handled: false, strictReply: String(args.strictReply || ""), strictBypassAutoQuote: Boolean(args.strictBypassAutoQuote) };

  let strictReply = String(args.strictReply || "");
  let strictBypassAutoQuote = Boolean(args.strictBypassAutoQuote);
  const selectedName = String(args.selectedProduct?.name || "").trim();
  const hasSheetCandidate = Boolean(args.pickBestProductPdfUrl(args.selectedProduct, args.text) || args.pickBestLocalPdfPath(args.selectedProduct, args.text));
  const lastRecommendedOptions = (Array.isArray(args.previousMemory?.pending_product_options) ? args.previousMemory.pending_product_options : [])
    .slice(0, 8)
    .map((o: any) => ({
      code: String(o?.code || "").trim(),
      rank: Number(o?.rank || 0),
      id: String(o?.id || "").trim(),
      name: String(o?.name || "").trim(),
      raw_name: String(o?.raw_name || o?.name || "").trim(),
      category: String(o?.category || "").trim(),
    }))
    .filter((o: any) => o.name);
  if (lastRecommendedOptions.length) args.strictMemory.last_recommended_options = lastRecommendedOptions;
  args.strictMemory.last_product_name = selectedName;
  args.strictMemory.last_product_id = String(args.selectedProduct?.id || "").trim();
  args.strictMemory.last_selected_product_name = selectedName;
  args.strictMemory.last_selected_product_id = String(args.selectedProduct?.id || "").trim();
  args.strictMemory.last_selection_at = new Date().toISOString();
  args.strictMemory.awaiting_action = "strict_choose_action";
  args.strictMemory.pending_family_options = [];
  args.strictMemory.pending_product_options = [];

  handleStrictChooseActionQuoteEntry({
    awaiting: args.awaiting,
    text: args.text,
    previousMemory: args.previousMemory,
    strictMemory: args.strictMemory,
    inboundFrom: args.inbound.from,
    normalizePhone: args.normalizePhone,
    extractQuoteRequestedQuantity: args.extractQuoteRequestedQuantity,
    getReusableBillingData: args.getReusableBillingData,
  });

  const rawAnotherQuoteChoice = args.awaiting === "strict_choose_action" ? args.parseAnotherQuoteChoice(args.text) : null;
  let followupIntent = args.awaiting === "strict_choose_action" ? args.detectAlternativeFollowupIntent(args.text) : null;
  const asksAnotherQuote = args.awaiting === "strict_choose_action" && args.isAnotherQuoteAmbiguousIntent(args.text);
  const anotherQuoteContext = asksAnotherQuote || /\b(otra\s+cotiz|nueva\s+cotiz|recotiz|re\s*cotiz|otra\s+propuesta)\b/.test(args.textNorm);
  const anotherQuoteChoice = anotherQuoteContext ? rawAnotherQuoteChoice : null;
  const technicalHintInAction = args.awaiting === "strict_choose_action" ? args.parseLooseTechnicalHint(args.text) : null;
  const technicalCapInAction = Number((technicalHintInAction as any)?.capacityG || 0);
  const technicalReadInAction = Number((technicalHintInAction as any)?.readabilityG || 0);
  const categoryIntentInAction = args.awaiting === "strict_choose_action" ? args.detectCatalogCategoryIntent(args.text) : null;
  const appHintInAction = args.awaiting === "strict_choose_action" ? args.detectTargetApplication(args.text) : "";
  const asksApplicationRecommendationsNow = args.awaiting === "strict_choose_action" && /^(si|sí|si\s+por\s+favor|sí\s+por\s+favor|por\s+favor|dale|ok|de\s+una)$/.test(args.textNorm);
  const currentCategoryInAction = args.normalizeText(String(args.rememberedCategory || args.previousMemory?.last_category_intent || ""));
  const isCategorySwitchInAction = Boolean(
    categoryIntentInAction && args.normalizeText(String(categoryIntentInAction || "")) !== currentCategoryInAction
  );

  const needsGuidedReframeInAction =
    !String(strictReply || "").trim() &&
    args.awaiting === "strict_choose_action" &&
    !args.wantsQuote &&
    !args.wantsSheet &&
    !followupIntent &&
    args.isAlternativeRejectionIntent(args.text) &&
    !(technicalCapInAction > 0 || technicalReadInAction > 0) &&
    !categoryIntentInAction;
  if (needsGuidedReframeInAction) {
    args.strictMemory.awaiting_action = "strict_need_spec";
    strictReply = args.buildGuidedNeedReframePrompt();
  }

  {
    const chooseActionFlow = args.applyChooseActionCategoryAndQuoteChoices({
      strictReply,
      awaiting: args.awaiting,
      wantsQuote: args.wantsQuote,
      wantsSheet: args.wantsSheet,
      text: args.text,
      textNorm: args.textNorm,
      selectedName,
      selectedProduct: args.selectedProduct,
      strictMemory: args.strictMemory,
      previousMemory: args.previousMemory,
      rememberedCategory: args.rememberedCategory,
      ownerRows: args.ownerRows,
      followupIntent,
      asksAnotherQuote,
      anotherQuoteChoice,
      categoryIntentInAction,
      isCategorySwitchInAction,
      appHintInAction,
      asksApplicationRecommendationsNow,
      technicalCapInAction,
      technicalReadInAction,
      normalizeText: args.normalizeText,
      buildAnotherQuotePrompt: args.buildAnotherQuotePrompt,
      buildAdvisorMiniAgendaPrompt: args.buildAdvisorMiniAgendaPrompt,
      buildQuoteDataIntakePrompt: args.buildQuoteDataIntakePrompt,
      buildNoActiveCatalogEscalationMessage: args.buildNoActiveCatalogEscalationMessage,
      extractQuoteRequestedQuantity: args.extractQuoteRequestedQuantity,
      maxReadabilityForApplication: args.maxReadabilityForApplication,
      formatSpecNumber: args.formatSpecNumber,
      extractRowTechnicalSpec: args.extractRowTechnicalSpec,
      scopeCatalogRows: args.scopeCatalogRows,
      buildNumberedProductOptions: args.buildNumberedProductOptions,
      buildNumberedFamilyOptions: args.buildNumberedFamilyOptions,
    });
    strictReply = chooseActionFlow.strictReply;
    followupIntent = chooseActionFlow.followupIntent;
  }

  const selectedCategoryNorm = args.normalizeText(`${String((args.selectedProduct as any)?.category || "")} ${String((args.selectedProduct as any)?.source_payload?.subcategory || "")}`);
  const shouldScopeBasculas = /(bascula|basculas|plataforma|indicador|defender|ranger|valor)/.test(args.textNorm) || /(bascula|basculas|plataforma|indicador)/.test(selectedCategoryNorm);
  const actionScopedRows = shouldScopeBasculas
    ? args.scopeCatalogRows(args.ownerRows, "basculas")
    : args.baseScoped;
  strictReply = args.applyChooseActionTechnicalHint({
    strictReply,
    awaiting: args.awaiting,
    wantsQuote: args.wantsQuote,
    wantsSheet: args.wantsSheet,
    text: args.text,
    strictMemory: args.strictMemory,
    previousMemory: args.previousMemory,
    baseScopedRows: args.baseScoped,
    actionScopedRows,
    technicalHintInAction,
    isLargestCapacityAsk: args.isLargestCapacityAsk,
    buildLargestCapacitySuggestion: (rows: any[]) => args.buildLargestCapacitySuggestion(rows as any[]),
    buildPriceRangeLine: (rows: any[]) => args.buildPriceRangeLine(rows as any[]),
    formatSpecNumber: args.formatSpecNumber,
    mergeLooseSpecWithMemory: args.mergeLooseSpecWithMemory,
    getExactTechnicalMatches: (rows: any[], spec: any) => args.getExactTechnicalMatches(rows as any[], spec),
    prioritizeTechnicalRows: (rows: any[], spec: any) => args.prioritizeTechnicalRows(rows as any[], spec),
    buildNumberedProductOptions: (rows: any[], maxItems: number) => args.buildNumberedProductOptions(rows as any[], maxItems),
  });
  strictReply = args.applyChooseActionFollowupIntent({
    strictReply,
    awaiting: args.awaiting,
    wantsSheet: args.wantsSheet,
    followupIntent,
    text: args.text,
    selectedName,
    selectedProduct: args.selectedProduct,
    strictMemory: args.strictMemory,
    previousMemory: args.previousMemory,
    rememberedCategory: args.rememberedCategory,
    ownerRows: args.ownerRows,
    normalizeText: args.normalizeText,
    extractQuoteRequestedQuantity: args.extractQuoteRequestedQuantity,
    buildQuoteDataIntakePrompt: args.buildQuoteDataIntakePrompt,
    familyLabelFromRow: args.familyLabelFromRow,
    scopeCatalogRows: args.scopeCatalogRows,
    extractRowTechnicalSpec: args.extractRowTechnicalSpec,
    prioritizeTechnicalRows: args.prioritizeTechnicalRows,
    buildNumberedProductOptions: args.buildNumberedProductOptions,
  });

  strictReply = args.applyChooseActionUseCaseAndBudgetFollowup({
    strictReply,
    awaiting: args.awaiting,
    wantsQuote: args.wantsQuote,
    wantsSheet: args.wantsSheet,
    text: args.text,
    selectedName,
    selectedProduct: args.selectedProduct,
    hasSheetCandidate,
    strictMemory: args.strictMemory,
    previousMemory: args.previousMemory,
    rememberedCategory: args.rememberedCategory,
    ownerRows: args.ownerRows,
    lastRecommendedOptions,
    isUseCaseApplicabilityIntent: args.isUseCaseApplicabilityIntent,
    isBudgetVisibilityFollowup: args.isBudgetVisibilityFollowup,
    buildTechnicalSummary: args.buildTechnicalSummary,
    buildPriceRangeLine: args.buildPriceRangeLine,
    scopeCatalogRows: args.scopeCatalogRows,
  });
  if (!String(strictReply || "").trim()) {
    const quoteIntentResult = handleStrictChooseActionQuoteIntent({
      strictReply,
      strictBypassAutoQuote,
      awaiting: args.awaiting,
      wantsQuote: args.wantsQuote,
      text: args.text,
      textNorm: args.textNorm,
      selectedName,
      selectedProduct: args.selectedProduct,
      inbound: args.inbound,
      nextMemory: args.nextMemory,
      strictMemory: args.strictMemory,
      previousMemory: args.previousMemory,
      lastRecommendedOptions,
      extractQuoteRequestedQuantity: args.extractQuoteRequestedQuantity,
      asksQuoteIntent: args.asksQuoteIntent,
      normalizeText: args.normalizeText,
      formatSpecNumber: args.formatSpecNumber,
      extractRowTechnicalSpec: args.extractRowTechnicalSpec,
      isSameQuoteContinuationIntent: args.isSameQuoteContinuationIntent,
      extractModelLikeTokens: args.extractModelLikeTokens,
      isFlowChangeWithoutModelDetailsIntent: args.isFlowChangeWithoutModelDetailsIntent,
      getReusableBillingData: args.getReusableBillingData,
      normalizePhone: args.normalizePhone,
    });
    strictReply = quoteIntentResult.strictReply;
    strictBypassAutoQuote = quoteIntentResult.strictBypassAutoQuote;
  }
  if (!String(strictReply || "").trim() && (args.wantsSheet || /^2\b/.test(args.textNorm))) {
    const datasheetResult = await args.handleStrictDatasheetRequest({
      strictReply,
      wantsSheet: args.wantsSheet,
      textNorm: args.textNorm,
      text: args.text,
      previousMemory: args.previousMemory,
      ownerRows: args.ownerRows,
      selectedProduct: args.selectedProduct,
      selectedName,
      strictDocs: args.strictDocs,
      strictMemory: args.strictMemory,
      maxWhatsappDocBytes: args.MAX_WHATSAPP_DOC_BYTES,
      extractBundleOptionIndexes: args.extractBundleOptionIndexes,
      findCatalogProductByName: args.findCatalogProductByName,
      pickBestProductPdfUrl: args.pickBestProductPdfUrl,
      pickBestLocalPdfPath: args.pickBestLocalPdfPath,
      fetchRemoteFileAsBase64: args.fetchRemoteFileAsBase64,
      fetchLocalFileAsBase64: args.fetchLocalFileAsBase64,
      safeFileName: args.safeFileName,
      buildTechnicalSummary: args.buildTechnicalSummary,
    });
    if (datasheetResult.handled) strictReply = datasheetResult.strictReply;
  } else if (!String(strictReply || "").trim()) {
    strictReply = await args.resolveStrictChooseActionFallbackReply({
      strictReply,
      awaiting: args.awaiting,
      wantsQuote: args.wantsQuote,
      wantsSheet: args.wantsSheet,
      textNorm: args.textNorm,
      text: args.text,
      apiKey: args.apiKey,
      selectedName,
      rememberedCategory: args.rememberedCategory,
      previousMemory: args.previousMemory,
      hasSheetCandidate,
      buildStrictConversationalReply: args.buildStrictConversationalReply,
      normalizeText: args.normalizeText,
      isOutOfCatalogDomainQuery: args.isOutOfCatalogDomainQuery,
    });
  }

  return { handled: true, strictReply, strictBypassAutoQuote };
}

export async function runStrictQuoteDataFlow(args: any): Promise<{ handled: boolean; strictReply: string; strictBypassAutoQuote: boolean }> {
  let strictReply = String(args.strictReply || "");
  let strictBypassAutoQuote = Boolean(args.strictBypassAutoQuote);

  if (String(strictReply).trim()) {
    return { handled: false, strictReply, strictBypassAutoQuote };
  }
  if (!(args.awaiting === "strict_quote_data" || Boolean(args.strictMemory?.strict_autorun_quote_with_reuse))) {
    return { handled: false, strictReply, strictBypassAutoQuote };
  }

  try {
    const quoteDataPreGate = handleStrictQuoteDataPreGate({
      strictReply,
      awaiting: args.awaiting,
      text: args.text,
      strictMemory: args.strictMemory,
      previousMemory: args.previousMemory,
      ownerRows: args.ownerRows,
      rememberedCategory: args.rememberedCategory,
      normalizeText: args.normalizeText,
      scopeCatalogRows: args.scopeCatalogRows,
      buildNumberedProductOptions: args.buildNumberedProductOptions,
      familyLabelFromRow: args.familyLabelFromRow,
      formatMoney: args.formatMoney,
      detectAlternativeFollowupIntent: args.detectAlternativeFollowupIntent,
      isAnotherQuoteAmbiguousIntent: args.isAnotherQuoteAmbiguousIntent,
      getReusableBillingData: args.getReusableBillingData,
      looksLikeBillingData: args.looksLikeBillingData,
      isAffirmativeShortIntent: args.isAffirmativeShortIntent,
      isQuoteProceedIntent: args.isQuoteProceedIntent,
      isQuoteResumeIntent: args.isQuoteResumeIntent,
      isContinueQuoteWithoutPersonalDataIntent: args.isContinueQuoteWithoutPersonalDataIntent,
      asksQuoteIntent: args.asksQuoteIntent,
      billingDataAsSingleMessage: args.billingDataAsSingleMessage,
      buildAnotherQuotePrompt: args.buildAnotherQuotePrompt,
    });
    if (quoteDataPreGate.handled) strictReply = quoteDataPreGate.strictReply;

    if (quoteDataPreGate.shouldContinue) {
      const quoteExecution = await executeStrictQuoteDataExecutionBlock({
        strictReply,
        strictBypassAutoQuote,
        text: args.text,
        inbound: args.inbound,
        strictMemory: args.strictMemory,
        previousMemory: args.previousMemory,
        recognizedReturningCustomer: args.recognizedReturningCustomer,
        knownCustomerName: args.knownCustomerName,
        ownerRows: args.ownerRows,
        strictDocs: args.strictDocs,
        quoteDataInputText: quoteDataPreGate.quoteDataInputText,
        reusableBillingInQuoteData: quoteDataPreGate.reusableBilling,
        shouldReuseBillingInQuoteData: quoteDataPreGate.shouldReuseBilling,
        isAdvanceInQuoteData: quoteDataPreGate.isAdvance,
        supabase: args.supabase,
        ownerId: args.ownerId,
        tenantId: args.tenantId,
        normalizeText: args.normalizeText,
        normalizePhone: args.normalizePhone,
        phoneTail10: args.phoneTail10,
        normalizeCityLabel: args.normalizeCityLabel,
        extractLabeledValue: args.extractLabeledValue,
        extractCustomerName: args.extractCustomerName,
        extractEmail: args.extractEmail,
        extractCustomerPhone: args.extractCustomerPhone,
        sanitizeCustomerDisplayName: args.sanitizeCustomerDisplayName,
        looksLikeBillingData: args.looksLikeBillingData,
        isAffirmativeShortIntent: args.isAffirmativeShortIntent,
        isQuoteProceedIntent: args.isQuoteProceedIntent,
        isQuoteResumeIntent: args.isQuoteResumeIntent,
        isContinueQuoteWithoutPersonalDataIntent: args.isContinueQuoteWithoutPersonalDataIntent,
        findCatalogProductByName: args.findCatalogProductByName,
        getOrFetchTrm: args.getOrFetchTrm,
        buildQuoteItemDescription: args.buildQuoteItemDescription,
        resolveProductImageDataUrl: args.resolveProductImageDataUrl,
        isQuoteDraftStatusConstraintError: args.isQuoteDraftStatusConstraintError,
        buildQuotePdf: args.buildQuotePdf,
        safeFileName: args.safeFileName,
        buildQuotePdfFromDraft: args.buildQuotePdfFromDraft,
        pickBestProductPdfUrl: args.pickBestProductPdfUrl,
        pickBestLocalPdfPath: args.pickBestLocalPdfPath,
        fetchRemoteFileAsBase64: args.fetchRemoteFileAsBase64,
        fetchLocalFileAsBase64: args.fetchLocalFileAsBase64,
        MAX_WHATSAPP_DOC_BYTES: args.MAX_WHATSAPP_DOC_BYTES,
        pickYoutubeVideoForModel: args.pickYoutubeVideoForModel,
        isoAfterHours: args.isoAfterHours,
      });
      strictReply = String(quoteExecution.strictReply || strictReply || "");
      strictBypassAutoQuote = Boolean(quoteExecution.strictBypassAutoQuote);
    }
    return { handled: true, strictReply, strictBypassAutoQuote };
  } catch (quoteFlowErr: any) {
    console.error("[evolution-webhook] strict_quote_data_error", {
      message: quoteFlowErr?.message || quoteFlowErr,
      stack: quoteFlowErr?.stack || "",
      text: args.text,
    });
    args.strictMemory.awaiting_action = "strict_quote_data";
    strictReply = "Tuve un error procesando esta solicitud. Para continuar, envíame en un solo mensaje: ciudad, empresa, NIT, contacto, correo y celular.";
    return { handled: true, strictReply, strictBypassAutoQuote };
  }
}
