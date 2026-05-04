import { NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import { checkEntitlementAccess, consumeEntitlementCredits, logUsageEvent } from "@/app/api/_utils/entitlement";
import { buildQuotePdfFromDraft } from "../../../quotes/_utils/pdf";
import { buildPhase1InvariantSnapshot } from "./invariants";
import { ENABLE_PHASE1_PASSIVE_INVARIANT_LOGGING } from "./phase1-flags";
import { MAX_WHATSAPP_DOC_BYTES, ENABLE_STRICT_WHATSAPP_MODE, WEBHOOK_V2_DYNAMIC, WEBHOOK_V2_RUNTIME } from "./config/runtime";
import { webhookInfraServices } from "./infra/services";
import {
  buildNoActiveCatalogEscalationMessage,
  buildCommercialEscalationMessage,
  buildCommercialValidationOkMessage,
  buildMissingNewCustomerDataMessage,
  buildExistingClientMatchConfirmationPrompt,
  detectPersonaNatural,
  detectUnavailableLabTopic,
  ensureAnalysisOpportunitySeed as ensureAnalysisOpportunitySeedApp,
  equipmentChoiceLabel,
  extractCommercialCompanyName,
  extractCustomerName,
  extractCustomerPhone as extractCustomerPhoneApp,
  extractEmail,
  extractLabeledValue,
  extractRut,
  extractSimpleLabeledValue,
  getMissingNewCustomerFields,
  isAffirmativeShortIntent as isAffirmativeShortIntentApp,
  isNegativeShortIntent as isNegativeShortIntentApp,
  isPresent,
  looksLikeCommercialDataInput,
  looksLikeCustomerNameAnswer,
  normalizeCityLabel,
  parseExistingContactUpdateData as parseExistingContactUpdateDataApp,
  sanitizeCustomerDisplayName,
  shouldEscalateToAdvisorByCommercialRule,
  updateCommercialValidation as updateCommercialValidationApp,
  updateNewCustomerRegistration as updateNewCustomerRegistrationApp,
  upsertNewCommercialCustomerContact as upsertNewCommercialCustomerContactApp,
} from "./application/commercial";
import {
  appendQuoteClosureCta,
  buildCapacityResolutionExplanation,
  buildPriceObjectionReply,
  buildProductDefinitionReply as buildProductDefinitionReplyApp,
  deliveryLabelForRow as deliveryLabelForRowApp,
  buildGuidedNeedReframePrompt,
  pickDistinctGamaOptions as pickDistinctGamaOptionsApp,
  buildScaleUseExplanationReply,
  buildScaleDifferenceGuidanceReply,
} from "./application/guidance";
import {
  appendBundleQuoteClosurePrompt as appendBundleQuoteClosurePromptApp,
  appendQuoteClosurePrompt as appendQuoteClosurePromptApp,
  enforceWhatsAppDelivery as enforceWhatsAppDeliveryApp,
} from "./application/quote-delivery";
import {
  catalogFeatureSearchBlob as catalogFeatureSearchBlobApp,
  detectCalibrationPreference as detectCalibrationPreferenceApp,
  extractFeatureTerms as extractFeatureTermsApp,
  rankCatalogByFeature as rankCatalogByFeatureApp,
  rowMatchesCalibrationPreference as rowMatchesCalibrationPreferenceApp,
} from "./application/feature-filter";
import {
  applyStrictAffirmativeReentry,
  buildStrictConversationalReply as buildStrictConversationalReplyApp,
  resolveStrictChooseActionFallbackReply,
} from "./application/strict-conversation";
import {
  buildQuoteItemDescriptionAsync as buildQuoteItemDescriptionAsyncApp,
  localImageFileToDataUrl as localImageFileToDataUrlApp,
  resolveModelSpecificLocalImageDataUrl as resolveModelSpecificLocalImageDataUrlApp,
  resolveStaticQuoteProfile as resolveStaticQuoteProfileApp,
} from "./application/quote-media";
import {
  absoluteImageFileToDataUrl as absoluteImageFileToDataUrlApp,
  asDateYmd as asDateYmdApp,
  buildLargestCapacitySuggestion as buildLargestCapacitySuggestionApp,
  buildPriceRangeLine as buildPriceRangeLineApp,
  formatMoney as formatMoneyApp,
  isLargestCapacityAsk as isLargestCapacityAskApp,
  quoteCodeFromDraftId as quoteCodeFromDraftIdApp,
  resolveProductImageDataUrl as resolveProductImageDataUrlApp,
  resolveQuoteBannerImageDataUrl as resolveQuoteBannerImageDataUrlApp,
  resolveQuotePerksImageDataUrl as resolveQuotePerksImageDataUrlApp,
  resolveQuoteSocialImageDataUrl as resolveQuoteSocialImageDataUrlApp,
} from "./application/quote-helpers-large";
import {
  buildBundleQuotePdf as buildBundleQuotePdfApp,
  buildQuotePdf as buildQuotePdfApp,
  buildSimpleQuotePdf as buildSimpleQuotePdfApp,
} from "./application/quote-pdf";
import { getOrFetchTrm as getOrFetchTrmApp } from "./application/trm";
import {
  isCategoryFollowUpIntent as isCategoryFollowUpIntentApp,
  isConsistencyChallengeIntent as isConsistencyChallengeIntentApp,
  isProductLookupIntent as isProductLookupIntentApp,
  isStrictCatalogIntent as isStrictCatalogIntentApp,
  pickCatalogByVariantText as pickCatalogByVariantTextApp,
} from "./application/catalog-intelligence-large";
import {
  classifyIntent as classifyIntentApp,
  findCatalogProductByName as findCatalogProductByNameApp,
} from "./application/intent-classifier";
import {
  buildDocumentContext as buildDocumentContextApp,
  markIncomingMessageProcessed as markIncomingMessageProcessedApp,
  persistConversationTurn as persistConversationTurnApp,
  reserveIncomingMessage as reserveIncomingMessageApp,
} from "./application/conversation-persistence";
import {
  resolveChannelAndAgent,
  shouldIgnoreDuplicateRecentText,
} from "./application/webhook-bootstrap";
import {
  buildNextMemory,
  collectHistoryMessages,
  resolveKnownCustomerProfile,
} from "./application/conversation-bootstrap";
import {
  buildQuoteItemDescription as buildQuoteItemDescriptionApp,
  buildTechnicalSummary as buildTechnicalSummaryApp,
  detectTechResendIntent as detectTechResendIntentApp,
  extractSpecsFromJson as extractSpecsFromJsonApp,
  isContextResetIntent as isContextResetIntentApp,
} from "./application/quote-description";
import {
  handleCommercialExistingEntryStep,
  handleCommercialExistingEquipmentGate,
  handleCommercialExistingConfirmFlow,
  handleCommercialExistingEquipmentSelection,
  handleCommercialExistingContactUpdateFlow,
  handleCommercialExistingStep,
  handleCommercialExistingLookupFlow,
  handleCommercialStep,
  handleCommercialNewCustomerEquipmentSelection,
  handleCommercialNewCustomerPersistAndDetectExisting,
  handleCommercialNewCustomerRetryLookup,
  handleCommercialNewCustomerStep,
  resolveCommercialClientTypeStep,
} from "./application/flows/commercial-flow";
import {
  handleStrictConfirmQuoteAfterMissingSheet,
  handleStrictAskMoreOptions,
  resolveSelectedProductForActionContext,
  handleStrictSelectedProductActionFlow,
  runStrictQuoteDataFlow,
} from "./application/flows/quote-flow";
import { handleStrictDatasheetRequest } from "./application/flows/datasheet-flow";
import { handleStrictCatalogScopeDisambiguation } from "./application/flows/catalog-scope-flow";
import { handleStrictChooseFamilyPrimary, handleStrictChooseFamilyTechnical } from "./application/flows/family-flow";
import { handleStrictChooseModelFlow } from "./application/flows/choose-model-flow";
import { persistAdvisorMeetingSelection, resolveAdvisorMeetingReply } from "./application/flows/advisor-flow";
import {
  buildStrictQuoteFallbackReply,
  deriveQuoteAwaitingAction,
  isCommercialBlockingAwaitingStep,
  isStrictQuoteSelectionStep,
} from "./application/flows/quote-flow";
import {
  detectClientRecognitionChoice,
  detectEquipmentChoice,
  detectExistingClientConfirmationChoice,
  detectGuidedBalanzaProfile,
  detectIndustrialGuidedMode,
  guidedProfileFromUsageContext,
  hasPriorityProductGuidanceIntent as hasPriorityProductGuidanceIntentDomain,
  isAmbiguousNeedInput,
  isBasculaAvailabilityAsk,
  isCapacityResolutionHelpIntent,
  isDifferenceQuestionIntent,
  isExplicitFamilyMenuAsk,
  isHeavyDutyWeightIntent,
  isPriceObjectionIntent,
  isProductDefinitionIntent,
  isScaleUseExplanationIntent,
} from "./domain/intents";
import type { GuidedBalanzaProfile } from "./application/guided-profiles";
import {
  buildBalanzaQualificationPrompt,
  buildEquipmentMenuPrompt,
  buildExistingClientLookupPrompt,
  buildNewCustomerDataPrompt,
} from "./application/prompts";
import { extractInbound, resolveInboundCustomerPhone, summarizeInboundAttempt } from "./application/inbound";
import {
  extractCompanyNit,
  findCommercialContactByIdentifiers,
  isValidColombianNit,
} from "./application/commercial-lookup";
import {
  hasCarbonAnalyzerMatch,
  isInventoryInfoIntent,
  isMultiProductQuoteIntent,
  isOutOfCatalogDomainQuery,
  isPriceIntent,
  isQuantityUpdateIntent,
  isQuoteProceedIntent,
  isQuoteRecallIntent,
  isQuoteResumeIntent,
  isRecommendationIntent,
  isSameQuoteContinuationIntent,
  isUnsupportedSpecificAnalyzerRequest,
  isUseCaseApplicabilityIntent,
  isUseCaseFamilyHint,
  shouldResendPdf,
} from "./application/quote-intents";
import {
  buildGuidedBalanzaReplyWithMode,
  GUIDED_BALANZA_CATALOG,
  guidedGroupsByMode,
  MARIANA_ESCALATION_LINK,
} from "./application/guided-catalog";
import {
  buildCompatibilityAnswer,
  classifyMessageIntent,
  isGuidedNeedDiscoveryText,
  type ConversationSlots,
  updateConversationSlots,
} from "./application/conversation-intelligence";
import {
  billingDataAsSingleMessage as billingDataAsSingleMessageApp,
  buildAnotherQuotePrompt as buildAnotherQuotePromptApp,
  buildGreetingReply as buildGreetingReplyApp,
  buildQuoteDataIntakePrompt as buildQuoteDataIntakePromptApp,
  detectAlternativeFollowupIntent as detectAlternativeFollowupIntentApp,
  extractCatalogTerms as extractCatalogTermsApp,
  getReusableBillingData as getReusableBillingDataApp,
  isAffirmativeIntent as isAffirmativeIntentApp,
  isAlternativeRejectionIntent as isAlternativeRejectionIntentApp,
  isAnotherQuoteAmbiguousIntent as isAnotherQuoteAmbiguousIntentApp,
  isBudgetVisibilityFollowup as isBudgetVisibilityFollowupApp,
  isConversationCloseIntent as isConversationCloseIntentApp,
  isCorrectionIntent as isCorrectionIntentApp,
  isContactInfoBundle as isContactInfoBundleApp,
  isGreetingIntent as isGreetingIntentApp,
  isHistoryIntent as isHistoryIntentApp,
  looksLikeBillingData as looksLikeBillingDataApp,
  parseAnotherQuoteChoice as parseAnotherQuoteChoiceApp,
  shouldUseFullGreeting as shouldUseFullGreetingApp,
  type AnotherQuoteChoice,
  type AlternativeFollowupIntent,
} from "./application/conversation-helpers";
import {
  buildConversationCloseReply,
  hasQuoteContext,
} from "./application/conversation-close";
import {
  resetMemoryForGlobalCatalogAsk,
  resetStaleStrictSelectionState,
  resetStrictContextMemory,
} from "./application/strict-memory";
import {
  sendStrictQuickText as sendStrictQuickTextApp,
  buildStrictDeliveryCandidates,
  sendStrictTextAndDocs as sendStrictTextAndDocsApp,
  finalizeStrictTurnDelivery,
} from "./application/strict-delivery";
import { applyStrictOfftopicGuardrail } from "./application/strict-guardrails";
import { applyStrictGreetingGate } from "./application/strict-greeting";
import {
  applyBasculaAvailabilityNeedSpec,
  applyCapacityRangeNeedSpec,
  applyCapacityOnlyNeedSpec,
  applyChooseActionCategoryAndQuoteChoices,
  applyChooseActionTechnicalHint,
  applyChooseActionFollowupIntent,
  applyChooseActionUseCaseAndBudgetFollowup,
  applyCategoryInventoryIntentFlow,
  applyTechnicalSpecOptionsFlow,
  applyExactOrCompatibleNeedSpec,
  applyReadOnlyNeedSpec,
  applyRememberedAlternativesNeedSpec,
  applyStrictNeedIndustryFlow,
  applyStrictNeedSpecFlow,
} from "./application/strict-need-spec";
import {
  persistCurrentTurnWithContext,
  syncCrmLifecycleAndMeetingWithContext,
} from "./application/turn-sync";
import {
  asksQuoteIntent as asksQuoteIntentApp,
  extractBundleOptionIndexes as extractBundleOptionIndexesApp,
  extractBundleSelectionFromCountCommand as extractBundleSelectionFromCountCommandApp,
  extractQuantity as extractQuantityApp,
  extractQuoteRequestedQuantity as extractQuoteRequestedQuantityApp,
  hasBareQuantity as hasBareQuantityApp,
  hasReferencePronoun as hasReferencePronounApp,
  hasUniformQuantityHint as hasUniformQuantityHintApp,
  isConcreteQuoteIntent as isConcreteQuoteIntentApp,
  isQuoteStarterIntent as isQuoteStarterIntentApp,
  pickBundleOptionSourceByIndexes as pickBundleOptionSourceByIndexesApp,
  shouldAutoQuote as shouldAutoQuoteApp,
} from "./application/quote-selection-helpers";
import {
  detectCatalogCategoryIntent,
  isProductImageIntent,
  isTechnicalSheetIntent,
  isTechSheetCatalogListIntent,
} from "./application/catalog-intents";
import { catalogSubcategory, isAllowedCatalogRow, isCommercialCatalogRow, isDocumentCatalogRow } from "./application/catalog-filter";
import { normalizePhone, normalizeRealCustomerPhone } from "./application/phone";
import {
  extractDimensionTripletMm,
  formatDimensionTripletMm,
  formatSpecNumber,
  inferFamilyFromReadability,
  isTechnicalSpecQuery,
  mergeLooseSpecWithMemory,
  normalizeRequestedCapacityG,
  parseCapacityRangeHint,
  parseDimensionHint,
  parseExplicitCapacityHint,
  parseLocalePositiveNumber,
  parseLooseTechnicalHint,
  parseTechnicalSpecQuery,
  toGrams,
} from "./application/technical-spec";
import {
  buildAmbiguityQuestion as buildAmbiguityQuestionApp,
  getExactTechnicalMatches as getExactTechnicalMatchesApp,
  getRowCapacityG as getRowCapacityGApp,
  getRowReadabilityG as getRowReadabilityGApp,
  hasActiveTechnicalRequirement as hasActiveTechnicalRequirementApp,
  isAmbiguousTechnicalMessage as isAmbiguousTechnicalMessageApp,
  isExactTechnicalMatch as isExactTechnicalMatchApp,
  resetStrictRecommendationState as resetStrictRecommendationStateApp,
  withAvaSignature as withAvaSignatureApp,
} from "./application/technical-message-helpers";
import {
  applyApplicationProfile as applyApplicationProfileApp,
  extractRowDimensionsMm as extractRowDimensionsMmApp,
  extractRowTechnicalSpec as extractRowTechnicalSpecApp,
  filterNearbyTechnicalRows as filterNearbyTechnicalRowsApp,
  filterReasonableTechnicalRows as filterReasonableTechnicalRowsApp,
  filterRowsByCapacityRange as filterRowsByCapacityRangeApp,
  prioritizeTechnicalRows as prioritizeTechnicalRowsApp,
  rankCatalogByCapacityOnly as rankCatalogByCapacityOnlyApp,
  rankCatalogByDimensions as rankCatalogByDimensionsApp,
  rankCatalogByReadabilityOnly as rankCatalogByReadabilityOnlyApp,
  rankCatalogByTechnicalSpec as rankCatalogByTechnicalSpecApp,
} from "./application/technical-ranking";
import {
  buildCommercialWelcomeMessage,
  isCatalogBreadthQuestion as isCatalogBreadthQuestionApp,
  isFlowChangeWithoutModelDetailsIntent as isFlowChangeWithoutModelDetailsIntentApp,
  isGlobalCatalogAsk as isGlobalCatalogAskApp,
  isLikelyRutValue,
  listActiveCatalogCategories,
} from "./application/catalog-helpers";
import { pickYoutubeVideoForModel } from "./application/media";
import {
  createLocalPdfIndexResolver,
  expandModelAliasTokens as expandModelAliasTokensApp,
  fetchRemoteFileAsBase64 as fetchRemoteFileAsBase64App,
  fetchLocalFileAsBase64 as fetchLocalFileAsBase64App,
  pickBestLocalPdfPath as pickBestLocalPdfPathApp,
  safeFileName,
} from "./application/local-pdf-index";
import { buildGroupedSpecReplyNoContext as buildGroupedSpecReplyNoContextApp, inferSpecProcessLabel as inferSpecProcessLabelApp } from "./application/spec-grouping";
import { detectTargetApplication, maxReadabilityForApplication } from "./application/recommendation";
import {
  buildGuidedPendingOptions as buildGuidedPendingOptionsApp,
  getApplicationRecommendedOptions as getApplicationRecommendedOptionsApp,
} from "./application/recommendation-options";
import {
  isoAfterHours as isoAfterHoursApp,
  persistKnownNameInCrm as persistKnownNameInCrmApp,
  upsertCrmLifecycleState as upsertCrmLifecycleStateApp,
} from "./application/crm-lifecycle";
import {
  appendAdvisorAppointmentPrompt as appendAdvisorAppointmentPromptApp,
  buildAdvisorMiniAgendaPrompt as buildAdvisorMiniAgendaPromptApp,
  buildGuidedRecoveryMessage as buildGuidedRecoveryMessageApp,
  isAdvisorAppointmentIntent as isAdvisorAppointmentIntentApp,
  parseAdvisorMiniAgendaChoice as parseAdvisorMiniAgendaChoiceApp,
} from "./application/advisor-helpers";
import {
  buildNumberedFamilyOptions as buildNumberedFamilyOptionsApp,
  buildNumberedProductOptions as buildNumberedProductOptionsApp,
  dedupeOptionSpecSegments as dedupeOptionSpecSegmentsApp,
  extractPerProductQuantities as extractPerProductQuantitiesApp,
  familyLabelFromRow as familyLabelFromRowApp,
  gamaLabelForModelName as gamaLabelForModelNameApp,
  inferFamilyFromUseCase as inferFamilyFromUseCaseApp,
  isOptionOnlyReply as isOptionOnlyReplyApp,
  resolvePendingFamilyOption as resolvePendingFamilyOptionApp,
  resolvePendingProductOption as resolvePendingProductOptionApp,
  resolvePendingProductOptionStrict as resolvePendingProductOptionStrictApp,
} from "./application/options-helpers";
import {
  findExactModelProduct as findExactModelProductApp,
  findExplicitModelProducts as findExplicitModelProductsApp,
  hasConcreteProductHint as hasConcreteProductHintApp,
  isFeatureQuestionIntent as isFeatureQuestionIntentApp,
  pickBestCatalogProduct as pickBestCatalogProductApp,
  extractModelLikeTokens as extractModelLikeTokensApp,
  splitModelToken as splitModelTokenApp,
} from "./application/product-matching";

export const runtime = WEBHOOK_V2_RUNTIME;
export const dynamic = WEBHOOK_V2_DYNAMIC;

const getServiceSupabase = webhookInfraServices.getSupabase;
const evolutionService = webhookInfraServices.evolution;

const CATALOG_REFERENCE_URL = "https://balanzasybasculas.com.co/";
const CATALOG_REFERENCE_SHARE_URL = "https://share.google/cE6wPPEGCH3vytJMm";
const DATASHEET_REPOSITORY_URL = String(
  process.env.OHAUS_DATASHEET_DRIVE_URL ||
  "https://drive.google.com/drive/folders/15Ym8V02ds5iN24qoF855RULtQYcXmopc?usp=sharing"
).trim();
const LOCAL_DATASHEET_DIR = String(
  process.env.OHAUS_LOCAL_DATASHEET_DIR ||
  path.join(process.cwd(), "app", "api", "agents", "channels", "evolution", "webhook", "Ohaus", "Cotizaciones")
).trim();
const QUOTE_LOCAL_IMAGE_DIR = String(
  process.env.WHATSAPP_QUOTE_LOCAL_IMAGE_DIR ||
  path.join(process.cwd(), "app", "api", "agents", "channels", "evolution", "webhook-v2", "assets")
).trim();
const LEGACY_ENABLE_RUNTIME_PDF_PARSE_FOR_QUOTE = process.env.WHATSAPP_QUOTE_PARSE_PDF_RUNTIME;
const ENABLE_RUNTIME_PDF_IMAGE_PARSE_FOR_QUOTE = String(
  process.env.WHATSAPP_QUOTE_PARSE_PDF_IMAGE_RUNTIME ?? LEGACY_ENABLE_RUNTIME_PDF_PARSE_FOR_QUOTE ?? "false"
).toLowerCase() === "true";
const ENABLE_RUNTIME_PDF_TEXT_PARSE_FOR_QUOTE = false;
const ENABLE_QUOTE_PRODUCT_IMAGE = String(process.env.WHATSAPP_QUOTE_EMBED_PRODUCT_IMAGE || "true").toLowerCase() === "true";
const STRICT_WHATSAPP_MODE = ENABLE_STRICT_WHATSAPP_MODE;
const QUOTE_FLOW_VERSION = "quote-flow-2026-03-26-stability-hotfix-03";
const OFFICIAL_CATALOG_CATEGORIES = [
  "Balanzas (Explorer, Adventurer, Pioneer, PR, Scout)",
  "Basculas (Ranger, Defender, Valor)",
  "Equipos de laboratorio (centrifugas, agitadores, mezcladores, planchas)",
  "Analizadores de humedad (MB120, MB90, MB27, MB23)",
  "Electroquimica (medidores y electrodos)",
  "Impresoras, pesas patron y accesorios",
];

async function upsertBotEvent(_payload: any): Promise<void> {
  return;
}

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(String(text || "").length / 4));
}

async function mirrorAdvisorMeetingToAvanza(args: {
  ownerId: string;
  tenantId?: string | null;
  externalRef: string;
  phone: string;
  customerName: string;
  advisor?: string;
  meetingAt: string;
  meetingLabel?: string;
  source: string;
}) {
  const meetingAt = String(args.meetingAt || "").trim();
  if (!meetingAt) return;
  const phone = normalizePhone(args.phone || "");
  if (!phone) return;

  await upsertBotEvent({
    ownerId: String(args.ownerId || ""),
    tenantId: String(args.tenantId || ""),
    externalKey: `evo:${args.externalRef}:${phone}:${meetingAt}`,
    channel: "whatsapp",
    phone,
    customerName: String(args.customerName || ""),
    advisor: String(args.advisor || "Asesor comercial"),
    meetingAt,
    meetingLabel: String(args.meetingLabel || "Cita con asesor"),
    status: "programada",
    source: String(args.source || "evolution_webhook"),
    notes: "Agendada desde bot por flujo de cita con asesor.",
  });
}

function boolish(value: any): boolean {
  if (value === true || value === 1) return true;
  const v = String(value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

type ClassifiedIntent = {
  intent:
    | "greeting"
    | "guided_need_discovery"
    | "consultar_categoria"
    | "consultar_producto"
    | "solicitar_ficha"
    | "solicitar_cotizacion"
    | "consultar_trm"
    | "consultar_historial"
    | "despedida"
    | "aclaracion";
  category: string | null;
  product: string | null;
  request_datasheet: boolean;
  request_quote: boolean;
  request_trm: boolean;
  needs_clarification: boolean;
};

async function persistConversationTurn(
  supabase: any,
  params: {
    agentId: string;
    ownerId: string;
    tenantId?: string | null;
    from: string;
    pushName?: string;
    inboundText: string;
    outboundText: string;
    messageId?: string;
    memory?: Record<string, any>;
    contactName?: string;
  }
) {
  return persistConversationTurnApp({
    supabase,
    ...params,
    normalizePhone,
    phoneTail10,
  });
}

async function markIncomingMessageProcessed(supabase: any, providerMessageId: string): Promise<void> {
  return markIncomingMessageProcessedApp(supabase, { provider: "evolution", providerMessageId });
}

function normalizeText(v: string) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isQuoteDraftStatusConstraintError(err: any): boolean {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("agent_quote_drafts_status_check") || (msg.includes("check constraint") && msg.includes("agent_quote_drafts"));
}

function appendQuoteClosurePrompt(text: string): string {
  return appendQuoteClosurePromptApp(text, normalizeText);
}

function appendBundleQuoteClosurePrompt(text: string): string {
  return appendBundleQuoteClosurePromptApp(text, normalizeText);
}

function logStrictTransition(meta: { before: string; after: string; text: string; intent: string }) {
  try {
    console.log("[strict-state] transition", {
      before: String(meta.before || "none"),
      after: String(meta.after || "none"),
      intent: String(meta.intent || "unknown"),
      text: String(meta.text || "").slice(0, 120),
      at: new Date().toISOString(),
    });
  } catch {}
}

function extractCustomerPhone(text: string, fallbackInbound: string): string {
  return extractCustomerPhoneApp({ text, fallbackInbound, normalizePhone });
}

async function persistKnownNameInCrm(
  supabase: any,
  args: { ownerId: string; tenantId?: string | null; phone: string; name: string }
) {
  return persistKnownNameInCrmApp({
    supabase,
    ownerId: args.ownerId,
    tenantId: args.tenantId,
    phone: args.phone,
    name: args.name,
    normalizePhone,
    phoneTail10,
    sanitizeCustomerDisplayName,
  });
}

async function upsertCrmLifecycleState(
  supabase: any,
  args: {
    ownerId: string;
    tenantId?: string | null;
    phone: string;
    realPhone?: string;
    name?: string;
    status?: string;
    nextAction?: string;
    nextActionAt?: string;
    metadata?: Record<string, any>;
  }
) {
  return upsertCrmLifecycleStateApp({
    supabase,
    ...args,
    normalizePhone,
    normalizeRealCustomerPhone,
    phoneTail10,
    sanitizeCustomerDisplayName,
  });
}

function extractBundleSelectionFromCountCommand(text: string): { count: number; picks: number[] } | null {
  return extractBundleSelectionFromCountCommandApp(text, normalizeText);
}

function buildNumberedProductOptions(rows: any[], maxItems = 5): Array<{ code: string; rank: number; id: string; name: string; raw_name: string; category: string; base_price_usd: number }> {
  return buildNumberedProductOptionsApp({
    rows,
    maxItems,
    extractRowTechnicalSpec,
    formatSpecNumber,
    deliveryLabelForRow: ({ row, catalogReferenceCode }) => deliveryLabelForRowApp({ row, catalogReferenceCode, guidedCatalog: GUIDED_BALANZA_CATALOG }),
    humanCatalogName,
    normalizeText,
  });
}

function resolvePendingProductOption(text: string, optionsRaw: any): { code: string; rank: number; id: string; name: string; raw_name: string; category: string; base_price_usd: number } | null {
  return resolvePendingProductOptionApp({
    text,
    optionsRaw,
    normalizeText,
    extractModelLikeTokens,
    splitModelToken,
    extractCatalogTerms,
  });
}

function familyLabelFromRow(row: any): string {
  return familyLabelFromRowApp(row, normalizeText);
}

function inferFamilyFromUseCase(
  text: string,
  optionsRaw: any,
): { code: string; rank: number; key: string; label: string; count: number } | null {
  return inferFamilyFromUseCaseApp(text, optionsRaw, normalizeText);
}

function extractPerProductQuantities(text: string, products: Array<{ id: string; name: string }>): Record<string, number> {
  return extractPerProductQuantitiesApp({ text, products, normalizeText, extractQuantity: extractQuantityApp });
}

function shouldAutoQuote(text: string): boolean {
  return shouldAutoQuoteApp({ text, normalizeText, isMultiProductQuoteIntent });
}

function asksQuoteIntent(text: string): boolean {
  return asksQuoteIntentApp(text, normalizeText);
}

function detectAlternativeFollowupIntent(text: string): AlternativeFollowupIntent | null {
  return detectAlternativeFollowupIntentApp(text, normalizeText);
}

function isAlternativeRejectionIntent(text: string): boolean {
  return isAlternativeRejectionIntentApp(text, normalizeText);
}

function isQuoteStarterIntent(text: string): boolean {
  return isQuoteStarterIntentApp({ text, normalizeText, asksQuoteIntent, hasConcreteProductHint });
}

function hasReferencePronoun(text: string): boolean {
  return hasReferencePronounApp(text, normalizeText);
}

function isConcreteQuoteIntent(text: string, rememberedProductName?: string): boolean {
  return isConcreteQuoteIntentApp({
    text,
    rememberedProductName,
    normalizeText,
    asksQuoteIntent,
    hasConcreteProductHint,
    hasReferencePronoun,
  });
}

function hasBareQuantity(text: string): boolean {
  return hasBareQuantityApp(text, normalizeText);
}


function extractRowDimensionsMm(row: any): number[] | null {
  return extractRowDimensionsMmApp(row);
}

function rankCatalogByDimensions(rows: any[], dimsMm: number[]): Array<{ row: any; score: number }> {
  return rankCatalogByDimensionsApp(rows, dimsMm);
}

function extractRowTechnicalSpec(row: any): { capacityG: number; readabilityG: number } {
  return extractRowTechnicalSpecApp({ row, normalizeCatalogQueryText });
}

function filterRowsByCapacityRange(rows: any[], range: { minG: number; maxG: number } | null): any[] {
  return filterRowsByCapacityRangeApp({ rows, range, extractRowTechnicalSpec });
}

function rankCatalogByTechnicalSpec(rows: any[], spec: { capacityG: number; readabilityG: number }): Array<{ row: any; capacityDeltaPct: number; readabilityRatio: number; score: number }> {
  return rankCatalogByTechnicalSpecApp({ rows, spec, extractRowTechnicalSpec });
}

function rankCatalogByCapacityOnly(rows: any[], capacityG: number): Array<{ row: any; capacityDeltaPct: number; score: number }> {
  return rankCatalogByCapacityOnlyApp({ rows, capacityG, extractRowTechnicalSpec });
}

function rankCatalogByReadabilityOnly(rows: any[], readabilityG: number): Array<{ row: any; readabilityRatio: number; score: number }> {
  return rankCatalogByReadabilityOnlyApp({ rows, readabilityG, extractRowTechnicalSpec });
}

function prioritizeTechnicalRows(rows: any[], spec: { capacityG: number; readabilityG: number }): { orderedRows: any[]; exactCount: number } {
  return prioritizeTechnicalRowsApp({
    rows,
    spec,
    rankCatalogByTechnicalSpec: (innerRows, innerSpec) => rankCatalogByTechnicalSpec(innerRows, innerSpec),
  });
}

function filterReasonableTechnicalRows(rows: any[], spec: { capacityG: number; readabilityG: number }): any[] {
  return filterReasonableTechnicalRowsApp({ rows, spec, extractRowTechnicalSpec });
}

function filterNearbyTechnicalRows(rows: any[], spec: { capacityG: number; readabilityG: number }): any[] {
  return filterNearbyTechnicalRowsApp({ rows, spec, extractRowTechnicalSpec });
}

function applyApplicationProfile(rows: any[], args: { application?: string; targetCapacityG?: number; targetReadabilityG?: number; allowFallback?: boolean }): any[] {
  return applyApplicationProfileApp({ rows, profile: args, extractRowTechnicalSpec, familyLabelFromRow });
}


function isFlowChangeWithoutModelDetailsIntent(text: string): boolean {
  return isFlowChangeWithoutModelDetailsIntentApp({ text, extractModelLikeTokens });
}


function isCatalogBreadthQuestion(text: string): boolean {
  return isCatalogBreadthQuestionApp(text, normalizeCatalogQueryText);
}

function isGlobalCatalogAsk(text: string): boolean {
  return isGlobalCatalogAskApp(text, normalizeCatalogQueryText);
}


function isAffirmativeShortIntent(text: string): boolean {
  return isAffirmativeShortIntentApp(text, isQuoteProceedIntent);
}

function isNegativeShortIntent(text: string): boolean {
  return isNegativeShortIntentApp(text);
}


function hasPriorityProductGuidanceIntent(text: string): boolean {
  return hasPriorityProductGuidanceIntentDomain({
    text,
    isScaleUseExplanationIntent,
    isAlternativeRejectionIntent,
    isGuidedNeedDiscoveryText,
    hasTechnicalSpec: Boolean(parseTechnicalSpecQuery(text) || parseLooseTechnicalHint(text)),
    hasCategoryOrApplication: Boolean(detectCatalogCategoryIntent(text) || detectTargetApplication(text)),
  });
}

function buildGuidedPendingOptions(rows: any[], profile: GuidedBalanzaProfile, industrialMode: "conteo" | "estandar" | "" = ""): any[] {
  return buildGuidedPendingOptionsApp({
    rows,
    profile,
    industrialMode,
    guidedGroupsByMode,
    normalizeText,
    gamaLabelForModelName: (name: string) => gamaLabelForModelNameApp(name, normalizeText),
  });
}


function getApplicationRecommendedOptions(args: {
  rows: any[];
  application: string;
  capTargetG: number;
  targetReadabilityG?: number;
  strictPrecision?: boolean;
  excludeId?: string;
}): any[] {
  return getApplicationRecommendedOptionsApp({
    ...args,
    maxReadabilityForApplication,
    normalizeText,
    extractRowTechnicalSpec,
    familyLabelFromRow,
    buildNumberedProductOptions,
  });
}

const getLocalPdfIndex = createLocalPdfIndexResolver({
  directory: LOCAL_DATASHEET_DIR,
  normalizeCatalogQueryText,
});

function expandModelAliasTokens(tokens: string[]): string[] {
  return expandModelAliasTokensApp({ tokens, uniqueNormalizedStrings, normalizeCatalogQueryText });
}

function pickBestLocalPdfPath(row: any, queryText: string): string {
  return pickBestLocalPdfPathApp({
    row,
    queryText,
    getLocalPdfIndex,
    normalizeCatalogQueryText,
    uniqueNormalizedStrings,
    extractModelLikeTokens,
    extractCatalogTerms,
  });
}

async function fetchRemoteFileAsBase64(url: string): Promise<{ base64: string; mimetype: string; fileName: string; byteSize: number } | null> {
  return fetchRemoteFileAsBase64App(url);
}

function getReusableBillingData(memory: any): {
  city: string;
  company: string;
  nit: string;
  contact: string;
  email: string;
  phone: string;
  complete: boolean;
} {
  return getReusableBillingDataApp({ memory, normalizeCityLabel, normalizePhone });
}

function getRowCapacityG(row: any): number {
  return getRowCapacityGApp({ row, extractRowTechnicalSpec });
}

function getRowReadabilityG(row: any): number {
  return getRowReadabilityGApp({ row, extractRowTechnicalSpec });
}

function isExactTechnicalMatch(row: any, requirement: { capacityG: number; readabilityG: number }): boolean {
  return isExactTechnicalMatchApp({ row, requirement, getRowCapacityG, getRowReadabilityG });
}

function getExactTechnicalMatches(rows: any[], requirement: { capacityG: number; readabilityG: number }): any[] {
  return getExactTechnicalMatchesApp({ rows, requirement, isExactTechnicalMatch });
}

function withAvaSignature(text: string): string {
  return withAvaSignatureApp(text, normalizeText);
}

function enforceWhatsAppDelivery(text: string, inboundText: string): string {
  return enforceWhatsAppDeliveryApp(text, inboundText, normalizeText);
}

function phoneTail10(raw: string): string {
  const n = normalizePhone(raw || "");
  return n.length > 10 ? n.slice(-10) : n;
}

function pickBestCatalogProduct(text: string, rows: any[]): any | null {
  return pickBestCatalogProductApp({ text, rows, normalizeCatalogQueryText, normalizeText, extractModelLikeTokens });
}

function findExactModelProduct(text: string, rows: any[]): any | null {
  return findExactModelProductApp({ text, rows, normalizeCatalogQueryText, catalogSubcategory, extractModelLikeTokens, splitModelToken });
}

function findExplicitModelProducts(text: string, rows: any[]): any[] {
  return findExplicitModelProductsApp({
    text,
    rows,
    normalizeCatalogQueryText,
    extractModelLikeTokens,
    splitModelToken,
    findExactModelProduct,
    pickBestCatalogProduct,
  });
}

function extractCatalogTerms(text: string): string[] {
  return extractCatalogTermsApp(text, normalizeCatalogQueryText);
}

function isFeatureQuestionIntent(text: string): boolean {
  return isFeatureQuestionIntentApp(text, normalizeCatalogQueryText);
}

function detectCalibrationPreference(text: string): "external" | "internal" | null {
  return detectCalibrationPreferenceApp(text, normalizeText);
}

function rowMatchesCalibrationPreference(row: any, preference: "external" | "internal" | null): boolean {
  return rowMatchesCalibrationPreferenceApp({ row, preference, catalogFeatureSearchBlob });
}

function extractFeatureTerms(text: string): string[] {
  return extractFeatureTermsApp({ text, extractCatalogTerms, normalizeText, uniqueNormalizedStrings });
}

function catalogFeatureSearchBlob(row: any): string {
  return catalogFeatureSearchBlobApp({ row, normalizeCatalogQueryText, catalogSubcategory });
}

function rankCatalogByFeature(rows: any[], featureTerms: string[]): Array<{ row: any; matches: number; score: number }> {
  return rankCatalogByFeatureApp({ rows, featureTerms, catalogFeatureSearchBlob });
}

function isBalanceTypeQuestion(text: string): boolean {
  const t = normalizeCatalogQueryText(text || "");
  if (!t) return false;
  return /(que tipo de balanza|que tipos de balanza|tipos de balanzas|tipo de balanzas|clases de balanza|clase de balanza)/.test(t);
}

function uniqueNormalizedStrings(values: string[], max = 0): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values || []) {
    const value = String(raw || "").trim();
    if (!value) continue;
    const key = normalizeText(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (max > 0 && out.length >= max) break;
  }
  return out;
}

function humanCatalogName(raw: string): string {
  const base = String(raw || "").replace(/\s+/g, " ").trim();
  if (!base) return "";
  const cleaned = base
    .replace(/^(data\s*sheet|datasheet|ficha\s*tecnica|ficha\s*t[eé]cnica)\s*/i, "")
    .replace(/\b(data\s*sheet|datasheet|ficha\s*tecnica|ficha\s*t[eé]cnica)\b/gi, "")
    .replace(/\b(us|es)\s*\d{6,}\b[ a-z0-9-]*$/i, "")
    .replace(/\b(\d{7,})\b\s*[a-z]?$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || base;
}

function extractSpecsFromJson(specsJson: any, maxLines = 4): string[] {
  return extractSpecsFromJsonApp({ specsJson, maxLines, normalizeText, uniqueNormalizedStrings });
}

function buildTechnicalSummary(row: any, maxLines = 4): string {
  return buildTechnicalSummaryApp({ row, maxLines, normalizeText, uniqueNormalizedStrings });
}

function buildQuoteItemDescription(row: any, fallbackName: string): string {
  return buildQuoteItemDescriptionApp({ row, fallbackName, normalizeText, uniqueNormalizedStrings });
}

type StaticQuoteProfile = { description: string; imageFile: string };

function resolveStaticQuoteProfile(row: any, fallbackName: string): StaticQuoteProfile | null {
  return resolveStaticQuoteProfileApp({ row, fallbackName, normalizeText });
}

function localImageFileToDataUrl(fileName: string): string {
  return localImageFileToDataUrlApp(fileName, QUOTE_LOCAL_IMAGE_DIR);
}

function resolveModelSpecificLocalImageDataUrl(row: any): string {
  return resolveModelSpecificLocalImageDataUrlApp({ row, normalizeCatalogQueryText, uniqueNormalizedStrings, extractModelLikeTokens, quoteLocalImageDir: QUOTE_LOCAL_IMAGE_DIR });
}

const localQuotePdfImageCache = new Map<string, { at: number; dataUrl: string; mtimeMs: number; byteSize: number }>();

async function buildQuoteItemDescriptionAsync(row: any, fallbackName: string): Promise<string> {
  return buildQuoteItemDescriptionAsyncApp({
    row,
    fallbackName,
    buildQuoteItemDescription,
    normalizeText,
    resolveStaticQuoteProfile: (r, f) => resolveStaticQuoteProfile(r, f),
    enableRuntimePdfTextParseForQuote: ENABLE_RUNTIME_PDF_TEXT_PARSE_FOR_QUOTE,
    pickBestLocalPdfPath,
    uniqueNormalizedStrings,
  });
}

function detectTechResendIntent(text: string): "sheet" | "image" | "both" | null {
  return detectTechResendIntentApp(text, normalizeText);
}

function normalizeCatalogQueryText(text: string): string {
  return normalizeText(text || "")
    .replace(/\b([a-z]{1,4})\s*['’`´]\s*(\d{2,6})\b/g, "$11$2")
    .replace(/\b([a-z]{1,4})\s+(\d{2,6})\b/g, "$1$2")
    .replace(/\baventura\b/g, "adventurer")
    .replace(/\badventure\b/g, "adventurer")
    .replace(/\bpioner\b/g, "pioneer")
    .replace(/\bsemi\s+seco\b/g, "semi micro");
}

function isContextResetIntent(text: string): boolean {
  return isContextResetIntentApp(text, normalizeText);
}

function hasConcreteProductHint(text: string): boolean {
  return hasConcreteProductHintApp({ text, normalizeCatalogQueryText, extractModelLikeTokens, extractCatalogTerms });
}

function prefersWebTechPageOnly(category: string): boolean {
  void category;
  return false;
}

function extractModelLikeTokens(text: string): string[] {
  return extractModelLikeTokensApp(text, normalizeCatalogQueryText);
}

function splitModelToken(token: string): { letters: string; digits: string } {
  return splitModelTokenApp(token, normalizeCatalogQueryText);
}

function isLikelyModelCodeToken(token: string): boolean {
  const t = normalizeCatalogQueryText(String(token || "")).replace(/[^a-z0-9]/g, "");
  if (!t || t.length < 4) return false;
  if (/^(\d+)(g|kg|mg)$/.test(t)) return false;
  const letters = (t.match(/[a-z]/g) || []).length;
  const digits = (t.match(/\d/g) || []).length;
  return letters >= 2 && digits >= 2;
}

function categoryMatchesIntent(row: any, categoryIntent: string): boolean {
  const wanted = normalizeText(String(categoryIntent || ""));
  if (!wanted) return true;
  const rowCategory = normalizeText(String(row?.category || ""));
  const rowSubcategory = catalogSubcategory(row);
  return (
    rowCategory === wanted ||
    rowCategory.startsWith(`${wanted}_`) ||
    rowSubcategory === wanted ||
    rowSubcategory.startsWith(`${wanted}_`)
  );
}

function passesStrictCategoryGuard(row: any, categoryIntent: string): boolean {
  return true;
}

function scopeCatalogRows(rows: any[], categoryIntent: string): any[] {
  const wanted = normalizeText(String(categoryIntent || ""));
  if (!wanted) return rows || [];
  if (wanted === "balanzas_precision") {
    const precisionRows = (rows || []).filter((row: any) => {
      const rowCat = normalizeText(String(row?.category || ""));
      if (!(rowCat === "balanzas" || rowCat.startsWith("balanzas_"))) return false;
      const sub = catalogSubcategory(row);
      const fam = normalizeText(familyLabelFromRow(row));
      const name = normalizeText(String(row?.name || ""));
      if (/(basculas|ranger|defender|valor|industrial|plataforma)/.test(`${sub} ${fam} ${name}`)) return false;
      const read = Number(getRowReadabilityG(row) || 0);
      if (read > 0 && read <= 0.01) return true;
      return /(precision|analitica|semi micro|semimicro|semi analitica|explorer|adventurer|pioneer|scout|exr|exp|ax|px)/.test(`${sub} ${fam} ${name}`);
    });
    return precisionRows;
  }
  const strict = (rows || []).filter((row: any) => {
    if (!categoryMatchesIntent(row, wanted)) return false;
    return passesStrictCategoryGuard(row, wanted);
  });
  if (wanted !== "basculas" || strict.length >= 3) return strict;

  const relaxed = (rows || []).filter((row: any) => {
    const rowCat = normalizeText(String(row?.category || ""));
    const rowSub = catalogSubcategory(row);
    const payload = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
    const rowFamily = normalizeText(String((payload as any)?.family || ""));
    const rowName = normalizeText(String(row?.name || ""));
    if (rowCat === "basculas" || rowCat.startsWith("basculas_") || rowSub.startsWith("basculas") || rowSub.startsWith("plataformas") || rowSub.startsWith("indicadores")) {
      return true;
    }
    if (/(plataforma|indicador|bascula|basculas|control de peso)/.test(rowName)) {
      return true;
    }
    if (/(bascula|basculas|plataforma|indicador)/.test(rowFamily)) {
      return true;
    }
    return false;
  });

  const out: any[] = [];
  const seen = new Set<string>();
  for (const row of [...strict, ...relaxed]) {
    const key = String(row?.id || "").trim() || normalizeText(String(row?.name || ""));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function scopeStrictBasculaRows(rows: any[]): any[] {
  return (rows || []).filter((row: any) => {
    if (!categoryMatchesIntent(row, "basculas")) return false;
    return passesStrictCategoryGuard(row, "basculas");
  });
}

function isCatalogMatchConsistent(text: string, row: any, forcedCategory?: string): boolean {
  if (!row) return false;
  const requestedCategory = normalizeText(String(forcedCategory || detectCatalogCategoryIntent(text) || ""));
  if (requestedCategory && !categoryMatchesIntent(row, requestedCategory)) {
    return false;
  }

  const terms = extractCatalogTerms(text);
  if (!terms.length) return true;
  const hay = normalizeText(`${row?.name || ""} ${row?.brand || ""} ${row?.category || ""} ${catalogSubcategory(row)}`);

  const modelTokens = extractModelLikeTokens(text);
  if (modelTokens.length && modelTokens.some((t) => !hay.includes(t))) return false;

  const matchedTerms = terms.filter((t) => hay.includes(t));
  const minMatches = terms.length <= 2 ? terms.length : Math.min(3, terms.length);
  return matchedTerms.length >= minMatches;
}

function filterCatalogByTerms(text: string, rows: any[], forcedCategory?: string): any[] {
  const requestedCategory = normalizeText(String(forcedCategory || detectCatalogCategoryIntent(text) || ""));
  const terms = extractCatalogTerms(text);
  const modelTokens = extractModelLikeTokens(text);
  return (rows || []).filter((row: any) => {
    if (requestedCategory && !categoryMatchesIntent(row, requestedCategory)) return false;
    if (!terms.length) return true;
    const hay = normalizeText(`${row?.name || ""} ${row?.brand || ""} ${row?.category || ""} ${catalogSubcategory(row)}`);
    if (modelTokens.length && modelTokens.some((t) => !hay.includes(t))) return false;
    const matchedTerms = terms.filter((t) => hay.includes(t));
    const minMatches = terms.length <= 2 ? terms.length : Math.min(3, terms.length);
    return matchedTerms.length >= minMatches;
  });
}

function pickBestProductPdfUrl(row: any, queryText: string): string {
  const directDatasheetUrl = String(row?.datasheet_url || "").trim();
  if (/^https?:\/\//i.test(directDatasheetUrl)) return directDatasheetUrl;

  const payload = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const payloadPdfLinks = Array.isArray((payload as any)?.pdf_links) ? (payload as any).pdf_links : [];
  const productUrlAsPdf = /\.pdf(\?|$)/i.test(String(row?.product_url || "")) ? String(row?.product_url || "") : "";

  const candidates = uniqueNormalizedStrings(
    [...payloadPdfLinks.map((u: any) => String(u || "").trim()), productUrlAsPdf]
      .filter(Boolean)
  ).filter((u) => /^https?:\/\//i.test(u) && /\.pdf(\?|$)/i.test(u));

  if (!candidates.length) return "";

  const baseText = `${String(row?.name || "")} ${String(row?.slug || "")} ${String(queryText || "")}`;
  const modelTokens = expandModelAliasTokens(extractModelLikeTokens(baseText));
  const terms = extractCatalogTerms(baseText);
  const slugCompact = normalizeCatalogQueryText(String(row?.slug || "")).replace(/[^a-z0-9]+/g, "");

  let best: { url: string; score: number; modelHits: number } | null = null;
  for (const url of candidates) {
    const hay = normalizeCatalogQueryText(url);
    const hayCompact = hay.replace(/[^a-z0-9]+/g, "");
    let score = 0;
    let modelHits = 0;

    for (const token of modelTokens) {
      if (hay.includes(token)) {
        modelHits += 1;
        score += 10;
      }
    }

    for (const term of terms) {
      if (hay.includes(term)) score += 2;
    }

    if (slugCompact && hayCompact.includes(slugCompact)) score += 5;
    if (/datasheet|ficha/i.test(hay)) score += 2;
    if (/brochure|catalog|catalogo|guia|manual|folleto|conceptos|fundamentos|comparativa/i.test(hay)) score -= 4;

    if (!best || score > best.score) {
      best = { url, score, modelHits };
    }
  }

  if (!best) return "";
  if (modelTokens.length && best.modelHits === 0) return "";
  return best.url;
}

function pickCatalogByVariantText(
  text: string,
  catalogRows: any[],
  variantRows: any[],
  forcedCategory?: string
): any | null {
  return pickCatalogByVariantTextApp({
    text,
    catalogRows,
    variantRows,
    forcedCategory,
    normalizeText,
    detectCatalogCategoryIntent,
    scopeCatalogRows,
    extractCatalogTerms,
    extractModelLikeTokens,
    normalizeCatalogQueryText,
  });
}

function isProductLookupIntent(text: string): boolean {
  return isProductLookupIntentApp(text, normalizeText);
}

function isStrictCatalogIntent(text: string): boolean {
  return isStrictCatalogIntentApp({
    text,
    normalizeText,
    isProductLookupIntent,
    isPriceIntent,
    isRecommendationIntent,
    isTechnicalSheetIntent,
    isProductImageIntent,
    detectCatalogCategoryIntent,
  });
}

function isCategoryFollowUpIntent(text: string): boolean {
  return isCategoryFollowUpIntentApp(text, normalizeText);
}

function isConsistencyChallengeIntent(text: string): boolean {
  return isConsistencyChallengeIntentApp(text, normalizeText);
}

function classifyIntent(text: string, memory?: Record<string, any>): ClassifiedIntent {
  return classifyIntentApp({
    text,
    memory,
    normalizeText,
    detectCatalogCategoryIntent,
    isTechnicalSheetIntent,
    isProductImageIntent,
    shouldAutoQuote,
    isQuoteStarterIntent,
    isQuoteProceedIntent,
    isGreetingIntent,
    isHistoryIntent,
    isQuoteRecallIntent,
    isGuidedNeedDiscoveryText,
    isProductLookupIntent,
    isPriceIntent,
    isRecommendationIntent,
  });
}

function findCatalogProductByName(rows: any[], rememberedName: string): any | null {
  return findCatalogProductByNameApp(rows, rememberedName, normalizeText);
}

async function getOrFetchTrm(supabase: any, ownerId: string, tenantId: string | null) {
  return getOrFetchTrmApp(supabase, ownerId, tenantId);
}

function buildPriceRangeLine(rows: any[]): string {
  return buildPriceRangeLineApp({ rows, normalizeText, getRowCapacityG, familyLabelFromRow });
}

function buildLargestCapacitySuggestion(rows: any[]): { options: any[]; reply: string } {
  return buildLargestCapacitySuggestionApp({ rows, buildNumberedProductOptions, getRowCapacityG, normalizeText, familyLabelFromRow });
}

const LOCAL_QUOTE_SOCIAL_FB_PATH = String(
  process.env.WHATSAPP_QUOTE_SOCIAL_FB_LOCAL_PATH ||
  path.join(process.cwd(), "app", "api", "agents", "channels", "evolution", "webhook-v2", "social_fb.png")
).trim();
const LOCAL_QUOTE_SOCIAL_IG_PATH = String(
  process.env.WHATSAPP_QUOTE_SOCIAL_IG_LOCAL_PATH ||
  path.join(process.cwd(), "app", "api", "agents", "channels", "evolution", "webhook-v2", "social_ig.png")
).trim();
const LOCAL_QUOTE_SOCIAL_IN_PATH = String(
  process.env.WHATSAPP_QUOTE_SOCIAL_IN_LOCAL_PATH ||
  path.join(process.cwd(), "app", "api", "agents", "channels", "evolution", "webhook-v2", "social_in.png")
).trim();
async function resolveQuoteBannerImageDataUrl(): Promise<string> {
  return resolveQuoteBannerImageDataUrlApp(fetchRemoteFileAsBase64);
}

async function resolveQuotePerksImageDataUrl(): Promise<string> {
  return resolveQuotePerksImageDataUrlApp(fetchRemoteFileAsBase64);
}

async function resolveQuoteSocialImageDataUrl(): Promise<string> {
  return resolveQuoteSocialImageDataUrlApp(fetchRemoteFileAsBase64);
}

async function resolveProductImageDataUrl(row: any): Promise<string> {
  return resolveProductImageDataUrlApp({
    row,
    resolveModelSpecificLocalImageDataUrl,
    uniqueNormalizedStrings,
    fetchRemoteFileAsBase64,
    resolveStaticQuoteProfile,
    localImageFileToDataUrl,
  });
}

async function buildQuotePdf(args: {
  draftId: string;
  companyName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productName: string;
  quantity: number;
  basePriceUsd: number;
  trmRate: number;
  totalCop: number;
  city?: string;
  nit?: string;
  createdAt?: string;
  updatedAt?: string;
  itemDescription?: string;
  imageDataUrl?: string;
  notes?: string;
}) {
  return buildQuotePdfApp({
    ...args,
    enableProductImage: ENABLE_QUOTE_PRODUCT_IMAGE,
    normalizePhone,
    formatMoney: formatMoneyApp,
    asDateYmd: asDateYmdApp,
    resolveQuoteBannerImageDataUrl,
    resolveQuotePerksImageDataUrl,
    resolveQuoteSocialImageDataUrl,
    absoluteImageFileToDataUrl: absoluteImageFileToDataUrlApp,
    localQuoteSocialFbPath: LOCAL_QUOTE_SOCIAL_FB_PATH,
    localQuoteSocialIgPath: LOCAL_QUOTE_SOCIAL_IG_PATH,
    localQuoteSocialInPath: LOCAL_QUOTE_SOCIAL_IN_PATH,
  });
}

async function buildSimpleQuotePdf(args: {
  draftId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName: string;
  productName: string;
  quantity: number;
  trmRate: number;
  totalCop: number;
  city: string;
  nit: string;
}) {
  return buildSimpleQuotePdfApp({ ...args, asDateYmd: asDateYmdApp, formatMoney: formatMoneyApp });
}

async function buildBundleQuotePdf(args: {
  bundleId: string;
  companyName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{ productName: string; quantity: number; basePriceUsd: number; trmRate: number; totalCop: number }>;
}) {
  return buildBundleQuotePdfApp({
    ...args,
    enableProductImage: ENABLE_QUOTE_PRODUCT_IMAGE,
    normalizePhone,
    formatMoney: formatMoneyApp,
    asDateYmd: asDateYmdApp,
    resolveQuoteBannerImageDataUrl,
    resolveQuotePerksImageDataUrl,
    resolveQuoteSocialImageDataUrl,
    absoluteImageFileToDataUrl: absoluteImageFileToDataUrlApp,
    localQuoteSocialFbPath: LOCAL_QUOTE_SOCIAL_FB_PATH,
    localQuoteSocialIgPath: LOCAL_QUOTE_SOCIAL_IG_PATH,
    localQuoteSocialInPath: LOCAL_QUOTE_SOCIAL_IN_PATH,
  });
}

function safeLogPhase1Invariants(args: {
  inboundText: string;
  outboundText: string;
  strict: boolean;
  route?: string;
  intent?: string;
  awaitingAction?: string;
}) {
  try {
    if (!ENABLE_PHASE1_PASSIVE_INVARIANT_LOGGING) return;
    const snapshot = buildPhase1InvariantSnapshot({
      inboundText: args.inboundText,
      outboundText: args.outboundText,
      strict: args.strict,
      route: args.route,
      intent: args.intent,
      awaitingAction: args.awaitingAction,
    });
    console.log("[phase1-invariants]", JSON.stringify(snapshot));
  } catch {
    // silent by design (phase 1 passive observability)
  }
}

export async function POST(req: Request) {
  try {
    console.log("[evolution-webhook] --- WEBHOOK ENTRY ---", { time: new Date().toISOString(), version: QUOTE_FLOW_VERSION });

    const payload = await req.json().catch(() => ({}));
    const payloadFromMe = boolish(
      payload?.data?.key?.fromMe ?? payload?.key?.fromMe ?? payload?.data?.fromMe ?? payload?.fromMe
    );
    if (payloadFromMe) {
      console.log("[evolution-webhook] ignored: fromMe payload");
      return NextResponse.json({ ok: true, ignored: true, reason: "from_me" });
    }

    const inbound = extractInbound(payload);
    if (!inbound) {
      const topKeys = Object.keys(payload || {}).slice(0, 12);
      const dataKeys = payload?.data && typeof payload.data === "object" ? Object.keys(payload.data).slice(0, 12) : [];
      const summary = summarizeInboundAttempt(payload);
      console.warn("[evolution-webhook] ignored: no inbound payload match", {
        event: payload?.event || payload?.type || payload?.eventName || null,
        topKeys,
        dataKeys,
        summary,
      });
      return NextResponse.json({ ok: true, ignored: true });
    }
    const inboundTextAtEntry = String(inbound.text || "").trim();

    const supabase = getServiceSupabase();
    if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

    const { channel, channelError, agent, agentError, agentPhone: resolvedAgentPhone } = await resolveChannelAndAgent({
      supabase,
      inbound,
      normalizePhone,
    });
    if (channelError) return NextResponse.json({ ok: false, error: channelError }, { status: 500 });
    if (!channel) {
      console.warn("[evolution-webhook] ignored: channel_not_found", { instance: inbound.instance });
      return NextResponse.json({ ok: true, ignored: true, reason: "channel_not_found" });
    }

    // Extraer el numero del agente SOLO desde configuracion del canal.
    // No usar payload.sender porque suele ser el numero del cliente y bloquea el enrutamiento.
    let agentPhone = resolvedAgentPhone;

    console.log("[evolution-webhook] channel debug", {
      instance: inbound.instance,
      selfPhone: agentPhone,
      configKeys: channel?.config ? Object.keys(channel.config) : [],
    });

    if (agentError === "agent_not_assigned") {
      console.warn("[evolution-webhook] ignored: agent_not_assigned", { channelId: (channel as any)?.id });
      return NextResponse.json({ ok: true, ignored: true, reason: "agent_not_assigned" });
    }

    if (agentError) return NextResponse.json({ ok: false, error: agentError }, { status: 500 });
    if (!agent || String(agent.status) !== "active") {
      console.warn("[evolution-webhook] ignored: agent_inactive", { agentId: String(channel.assigned_agent_id) });
      return NextResponse.json({ ok: true, ignored: true, reason: "agent_inactive" });
    }

    const ownerId = String((agent as any).created_by || "").trim();
    if (!ownerId) return NextResponse.json({ ok: false, error: "Agente sin propietario" }, { status: 400 });

    const inboundCustomerPhone = resolveInboundCustomerPhone(inbound);

    const incomingDedupKey = String(inbound.messageId || `${inbound.instance || "default"}:${inbound.from}:${normalizeText(inbound.text)}`).trim();
    const reserveResult = await reserveIncomingMessageApp(supabase as any, {
      provider: "evolution",
      providerMessageId: incomingDedupKey,
      instance: inbound.instance,
      fromPhone: inboundCustomerPhone || inbound.from,
      payload: {
        message_id: inbound.messageId || null,
        text: String(inbound.text || "").slice(0, 1000),
      },
    });
    if (reserveResult.duplicate) {
      console.log("[evolution-webhook] ignored: duplicate_provider_message", { key: incomingDedupKey });
      return NextResponse.json({ ok: true, ignored: true, reason: "duplicate_provider_message" });
    }

    const access = await checkEntitlementAccess(supabase as any, ownerId);
    if (!access.ok) {
      console.warn("[evolution-webhook] ignored: entitlement_blocked", { code: access.code });
      return NextResponse.json({ ok: true, ignored: true, reason: access.code || "entitlement_blocked" });
    }

    const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) {
      console.error("[evolution-webhook] missing OPENAI_API_KEY");
      return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const cfg = (agent.configuration || {}) as any;
    const rawFiles = Array.isArray(cfg?.brain?.files) ? cfg.brain.files : [];
    const files = rawFiles
      .map((f: any) => ({ name: String(f?.name || "Documento").trim() || "Documento", content: String(f?.content || "").trim() }))
      .filter((f: any) => f.content);
    const docs = buildDocumentContextApp(inbound.text, files);

    // Obtener historial de conversación
    const inboundPhoneNorm = normalizePhone(inboundCustomerPhone || inbound.from || "");
    const inboundPhoneTail = phoneTail10(inboundCustomerPhone || inbound.from || "");
    const inboundFilter = inboundPhoneTail
      ? `contact_phone.eq.${inboundPhoneNorm},contact_phone.like.%${inboundPhoneTail}`
      : `contact_phone.eq.${inboundPhoneNorm}`;

    const { data: existingConv } = await supabase
      .from("agent_conversations")
      .select("transcript,metadata,contact_name")
      .eq("agent_id", agent.id)
      .eq("channel", "whatsapp")
      .or(inboundFilter)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const existingMeta = existingConv?.metadata && typeof existingConv.metadata === "object" ? existingConv.metadata : {};
    const lastInboundMessageId = String((existingMeta as any)?.last_inbound_message_id || "").trim();
    if (inbound.messageId && lastInboundMessageId && inbound.messageId === lastInboundMessageId) {
      console.log("[evolution-webhook] ignored: duplicate_message_id", {
        messageId: inbound.messageId,
        from: inbound.from,
        agentId: agent.id,
      });
      return NextResponse.json({ ok: true, ignored: true, reason: "duplicate_message_id" });
    }
    const previousMemory = existingMeta?.whatsapp_memory && typeof existingMeta.whatsapp_memory === "object"
      ? existingMeta.whatsapp_memory
      : {};
    const currTextNorm = normalizeText(String(inbound.text || ""));
    if (shouldIgnoreDuplicateRecentText({
      previousMemory,
      inboundText: inbound.text,
      normalizeText,
      isStrictQuoteSelectionStep,
      isOptionOnlyReply: (value: string) => isOptionOnlyReplyApp(value, normalizeText),
    })) {
      console.log("[evolution-webhook] ignored: duplicate_recent_text", {
        from: inbound.from,
        text: currTextNorm.slice(0, 80),
      });
      return NextResponse.json({ ok: true, ignored: true, reason: "duplicate_recent_text" });
    }
    const nextMemory = buildNextMemory({
      previousMemory,
      inboundText: inbound.text,
      inboundCustomerPhone,
    });
    const classifiedIntent = classifyIntent(inbound.text, previousMemory);

    const historyMessages = collectHistoryMessages(existingConv?.transcript);

    let reply = "";
    let usageTotal = 0;
    let usageCompletion = 0;
    let billedTokens = 0;
    let handledByGreeting = false;
    let handledByInventory = false;
    let handledByHistory = false;
    let handledByPricing = false;
    let handledByProductLookup = false;
    let handledByRecommendation = false;
    let handledByTechSheet = false;
    let handledByQuoteStarter = false;
    let handledByRecall = false;
    let handledByQuoteIntake = false;
    let sentQuotePdf = false;
    let sentTechSheet = false;
    let sentImage = false;
    const technicalDocs: Array<{ kind: "document" | "image"; base64: string; fileName: string; mimetype: string; caption?: string }> = [];
    const technicalFallbackLinks: string[] = [];
    const transcriptForContext = Array.isArray(existingConv?.transcript) ? existingConv.transcript : [];
    const recentUserContextForCatalog = transcriptForContext
      .filter((m: any) => m?.role === "user" && m?.content)
      .slice(-20)
      .map((m: any) => String(m.content || ""))
      .join("\n");

    const inferredName = extractCustomerName(`${recentUserContextForCatalog}\n${inbound.text}`, inbound.pushName || "");
    const inferredPhone = extractCustomerPhone(`${recentUserContextForCatalog}\n${inbound.text}`, inbound.from);
    const inferredEmail = extractEmail(`${recentUserContextForCatalog}\n${inbound.text}`);
    if (isPresent(inferredName)) nextMemory.customer_name = inferredName;
    if (isPresent(inferredPhone)) nextMemory.customer_phone = inferredPhone;
    if (isPresent(inferredEmail)) nextMemory.customer_email = inferredEmail;
    let resendPdf: null | {
      draftId: string;
      fileName: string;
      pdfBase64: string;
    } = null;
    const autoQuoteDocs: Array<{
      draftId: string;
      fileName: string;
      pdfBase64: string;
      quantity: number;
      productName: string;
      itemDescription: string;
      imageDataUrl: string;
      basePriceUsd: number;
      trmRate: number;
      totalCop: number;
    }> = [];
    let autoQuoteBundle: null | { fileName: string; pdfBase64: string; draftIds: string[] } = null;
    const tenantId = String((agent as any)?.tenant_id || "").trim();
    const catalogProvider = String((cfg as any)?.catalog_provider || "ohaus_colombia").trim().toLowerCase();

    const {
      knownCustomerName,
      recognizedReturningCustomer,
      crmContactProfile,
    } = await resolveKnownCustomerProfile({
      supabase,
      ownerId,
      agentId: String(agent.id),
      inboundFilter,
      inboundPhoneNorm,
      inboundPhoneTail,
      previousMemory,
      existingConvContactName: String((existingConv as any)?.contact_name || ""),
      inboundPushName: inbound.pushName || "",
      nextMemory,
      normalizePhone,
      phoneTail10,
      normalizeText,
      normalizeCityLabel,
      sanitizeCustomerDisplayName,
    });

    const persistCurrentTurn = async (outboundText: string, memory: Record<string, any>) => {
      await persistCurrentTurnWithContext({
        supabase: supabase as any,
        persistConversationTurn,
        agentId: String(agent.id),
        ownerId,
        tenantId: (agent as any)?.tenant_id || null,
        inbound,
        knownCustomerName,
        outboundText,
        memory,
      });
    };

    const syncCrmLifecycleAndMeeting = async (args: {
      memory: Record<string, any>;
      previous?: Record<string, any>;
      source: string;
      externalRefSuffix: string;
    }) => {
      await syncCrmLifecycleAndMeetingWithContext({
        supabase: supabase as any,
        ownerId,
        tenantId: (agent as any)?.tenant_id || null,
        inbound,
        knownCustomerName,
        incomingDedupKey,
        memory: args.memory,
        previous: args.previous,
        source: args.source,
        externalRefSuffix: args.externalRefSuffix,
        isoAfterHours: isoAfterHoursApp,
        upsertCrmLifecycleState,
        mirrorAdvisorMeetingToAvanza,
      });
    };

    // Strict deterministic mode: single flow, no ambiguous branches.
    const STRICT_REBUILD_MODE = String(
      process.env.WHATSAPP_USE_V2 ||
      process.env.WHATSAPP_STRICT_REBUILD ||
      "true"
    ).toLowerCase() !== "false";
    if (STRICT_REBUILD_MODE) {
      const outboundInstance = String((channel as any)?.config?.evolution_instance_name || inbound.instance || "");
      if (!outboundInstance) return NextResponse.json({ ok: true, ignored: true, reason: "instance_missing" });

      const strictMemory: Record<string, any> = {
        ...nextMemory,
        last_user_text: inbound.text,
        last_user_at: new Date().toISOString(),
      };
      const text = String(inbound.text || "").trim();
      updateCommercialValidationApp({
        memory: strictMemory,
        text,
        fallbackName: inbound.pushName || "",
        sanitizeCustomerDisplayName,
        extractCustomerName,
        extractCompanyNit,
        isValidColombianNit,
        isLikelyRutValue,
      });
      const strictPrevAwaiting = String(previousMemory?.awaiting_action || "");
      const preParsedSpec = parseTechnicalSpecQuery(text);
      console.log("[strict-inbound]", {
        version: QUOTE_FLOW_VERSION,
        text,
        awaiting: strictPrevAwaiting,
        hasSpec: Boolean(preParsedSpec),
        spec: preParsedSpec,
      });

      const sendStrictQuickText = async (replyText: string): Promise<boolean> => {
        return sendStrictQuickTextApp({
          replyText,
          inboundText: text,
          inboundFrom: inbound.from,
          inboundAlternates: inbound.alternates || [],
          inboundJidCandidates: inbound.jidCandidates || [],
          outboundInstance,
          normalizePhone,
          withAvaSignature,
          enforceWhatsAppDelivery,
          sendMessage: (instance, to, msg) => evolutionService.sendMessage(instance, to, msg),
          sendMessageToJid: (instance, jid, msg) => evolutionService.sendMessageToJid(instance, jid, msg),
        });
      };

      const finalizeStrictTurn = async (replyText: string, memory: Record<string, any>, extra: Record<string, any> = {}) => {
        const awaitingNow = String(memory?.awaiting_action || "").trim();
        const safeReply = String(replyText || "").trim() || (
          buildStrictQuoteFallbackReply(awaitingNow)
        );
        if (!String(replyText || "").trim()) {
          console.warn("[evolution-webhook] empty_strict_reply_fallback", { awaiting: awaitingNow, inboundText: text });
        }
        const sentOk = await sendStrictQuickText(safeReply);
        if (!sentOk) return NextResponse.json({ ok: true, ignored: true, reason: "invalid_destination" });
        try {
          await persistCurrentTurn(safeReply, memory);
        } catch {}
        await markIncomingMessageProcessed(supabase as any, incomingDedupKey);
        safeLogPhase1Invariants({
          inboundText: inbound.text,
          outboundText: safeReply,
          strict: true,
          route: String(extra?.route || (extra?.pipeline ? "strict_pipeline" : "strict")).trim() || "strict",
          intent: String((extra as any)?.intent || "strict_turn"),
          awaitingAction: String(memory?.awaiting_action || ""),
        });
        return NextResponse.json({ ok: true, sent: true, strict: true, ...extra });
      };

      if (isContextResetIntent(text)) {
        resetStrictContextMemory({ strictMemory, previousMemory, text });

        const strictReply = "Listo, reinicié el contexto de esta conversación. Ahora dime capacidad y resolución (ej.: 220 g x 0.00001 g) o el modelo exacto.";
        return finalizeStrictTurn(strictReply, strictMemory, {
          reset: true,
          route: "strict_reset",
          intent: "reset_context",
        });
      }

      if (strictPrevAwaiting === "advisor_meeting_slot") {
        if (isAdvisorAppointmentIntentApp(text, normalizeText)) {
          const strictReply = buildAdvisorMiniAgendaPromptApp(MARIANA_ESCALATION_LINK);
          strictMemory.awaiting_action = "advisor_meeting_slot";
          return finalizeStrictTurn(strictReply, strictMemory, {
            advisor: true,
            route: "strict_advisor",
            intent: "advisor_meeting_prompt",
          });
        }

        const slot = parseAdvisorMiniAgendaChoiceApp(text, normalizeText);
        const slotResult = resolveAdvisorMeetingReply({ slot, compactReprompt: true });
        const strictReply = slotResult.reply;
        strictMemory.awaiting_action = slotResult.awaitingAction;
        if (slotResult.conversationStatus) strictMemory.conversation_status = slotResult.conversationStatus;
        if (slotResult.advisorMeetingAt) strictMemory.advisor_meeting_at = slotResult.advisorMeetingAt;
        if (slotResult.advisorMeetingLabel) strictMemory.advisor_meeting_label = slotResult.advisorMeetingLabel;
        if (slotResult.scheduled) {
          console.log("[evolution-webhook] advisor_meeting_slot_saved", {
            at: slotResult.advisorMeetingAt,
            label: slotResult.advisorMeetingLabel,
          });
        }

        const sentOk = await sendStrictQuickText(strictReply);
        if (!sentOk) return NextResponse.json({ ok: true, ignored: true, reason: "invalid_destination" });

        try {
          await persistAdvisorMeetingSelection({
            supabase,
            upsertCrmLifecycleState,
            mirrorAdvisorMeetingToAvanza,
            persistConversationTurn,
            isoAfterHours: isoAfterHoursApp,
            ownerId,
            tenantId: (agent as any)?.tenant_id || null,
            inboundFrom: inbound.from,
            inboundPushName: inbound.pushName,
            inboundText: inbound.text,
            inboundMessageId: inbound.messageId,
            incomingDedupKey,
            knownCustomerName,
            previousCustomerPhone: String(previousMemory?.customer_phone || ""),
            strictMemory,
            strictReply,
            agentId: String(agent.id),
          });
        } catch {}

        await markIncomingMessageProcessed(supabase as any, incomingDedupKey);

        safeLogPhase1Invariants({
          inboundText: inbound.text,
          outboundText: strictReply,
          strict: true,
          route: "strict_advisor",
          intent: slotResult.scheduled ? "advisor_meeting_scheduled" : "advisor_meeting_reprompt",
          awaitingAction: String(strictMemory?.awaiting_action || ""),
        });

        return NextResponse.json({ ok: true, sent: true, strict: true, advisor: true });
      }

      if (isAdvisorAppointmentIntentApp(text, normalizeText)) {
        const strictReply = buildAdvisorMiniAgendaPromptApp(MARIANA_ESCALATION_LINK);
        strictMemory.awaiting_action = "advisor_meeting_slot";
        strictMemory.conversation_status = "open";
        console.log("[evolution-webhook] advisor_meeting_prompt", { text });
        return finalizeStrictTurn(strictReply, strictMemory, {
          advisor: true,
          route: "strict_advisor",
          intent: "advisor_meeting_prompt",
        });
      }

      const strictCloseIntentEarly = isConversationCloseIntentApp(text, normalizeCatalogQueryText) && normalizeText(text).length <= 48;
      if (strictCloseIntentEarly) {
        const hadQuoteContext = hasQuoteContext(previousMemory);
        const strictReply = buildConversationCloseReply(hadQuoteContext);
        strictMemory.awaiting_action = "none";
        strictMemory.conversation_status = "closed";
        strictMemory.last_intent = "conversation_closed";
        if (hadQuoteContext) strictMemory.quote_feedback_due_at = isoAfterHoursApp(24);

        return finalizeStrictTurn(strictReply, strictMemory, {
          route: "strict_close",
          intent: "conversation_closed",
        });
      }

      const textNorm = normalizeCatalogQueryText(text);
      const awaiting = deriveQuoteAwaitingAction(previousMemory, strictPrevAwaiting);
      const wantsSheet = isTechnicalSheetIntent(text);
      const wantsQuote = asksQuoteIntent(text) || isPriceIntent(text);
      const isConversationFollowupAmbiguousQuote = awaiting === "conversation_followup" && isAnotherQuoteAmbiguousIntentApp(text, normalizeText);
      const isGreeting = isGreetingIntentApp(text, normalizeText);
      const explicitModel = hasConcreteProductHint(text) && !isOptionOnlyReplyApp(text, normalizeText);
      const categoryIntent = detectCatalogCategoryIntent(text);
      const technicalSpecIntent =
        isTechnicalSpecQuery(text) ||
        Boolean(parseDimensionHint(text)) ||
        /\b\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)?\b\s*(?:x|×|✕|✖|\*|por)\s*\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)?\b/i.test(String(text || ""));

      const { data: ownerRowsRaw } = await supabase
        .from("agent_product_catalog")
        .select("id,name,category,brand,base_price_usd,price_currency,source_payload,product_url,image_url,datasheet_url,specs_text,summary,description,specs_json,is_active")
        .eq("created_by", ownerId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(360);
      const ownerRows = (Array.isArray(ownerRowsRaw) ? ownerRowsRaw : []).filter((r: any) => isCommercialCatalogRow(r));

      const rememberedCategory = String(previousMemory?.last_category_intent || strictMemory.last_category_intent || "").trim();
      const baseScoped = rememberedCategory ? scopeCatalogRows(ownerRows as any, rememberedCategory) : ownerRows;
      const prevSpecQuery = String(previousMemory?.strict_spec_query || "").trim();
      let strictReply = "";
      const strictDocs: Array<{ base64: string; fileName: string; mimetype: string; caption?: string }> = [];
      let strictBypassAutoQuote = false;
      const selectedModelForSlots = String(
        previousMemory?.last_selected_product_name ||
        previousMemory?.last_product_name ||
        ""
      ).trim();
      const pendingForSlots = Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [];
      const slotPack = updateConversationSlots({
        previousMemory,
        text,
        awaiting,
        pendingOptions: pendingForSlots,
        selectedModel: selectedModelForSlots,
        parseLooseTechnicalHint,
        mergeLooseSpecWithMemory,
        detectTargetApplication,
      });
      Object.assign(strictMemory, slotPack.patch);
      const pipelineIntent = classifyMessageIntent({
        text,
        awaiting,
        rememberedCategory,
        activeMenuType: slotPack.slots.active_menu_type,
        parseLooseTechnicalHint,
        parseTechnicalSpecQuery,
        detectCatalogCategoryIntent,
        asksQuoteIntent,
        isPriceIntent,
        looksLikeBillingData: (value: string) => looksLikeBillingDataApp({ text: value, isContactInfoBundle: (text: string) => isContactInfoBundleApp({ text, extractEmail, extractCustomerPhone }), extractEmail, extractCustomerPhone }),
      });

      const guidedProfileGlobal = detectGuidedBalanzaProfile(text);
      if (
        !String(strictReply || "").trim() &&
        guidedProfileGlobal &&
        Boolean(strictMemory.commercial_validation_complete) &&
        /^(balanza|)$/i.test(String(strictMemory.commercial_equipment_choice || "")) &&
        !isCommercialBlockingAwaitingStep(awaiting)
      ) {
        const industrialModeGlobal = guidedProfileGlobal === "balanza_industrial_portatil_conteo" ? detectIndustrialGuidedMode(text) : "";
        const guidedOptions = buildGuidedPendingOptions(ownerRows as any[], guidedProfileGlobal, industrialModeGlobal as any);
        strictMemory.pending_product_options = guidedOptions;
        strictMemory.pending_family_options = [];
        strictMemory.awaiting_action = guidedOptions.length ? "strict_choose_model" : "strict_need_spec";
        strictMemory.last_category_intent = "balanzas";
        strictMemory.guided_balanza_profile = guidedProfileGlobal;
        strictMemory.guided_industrial_mode = industrialModeGlobal;
        strictMemory.strict_family_label = "balanzas";
        strictMemory.strict_model_offset = 0;
        strictReply = buildGuidedBalanzaReplyWithMode(guidedProfileGlobal, industrialModeGlobal as any);
      }

      const pipelineGate = async (): Promise<Response | null> => {
        if (isUnsupportedSpecificAnalyzerRequest(text)) {
          const humidityRows = scopeCatalogRows(ownerRows as any[], "analizador_humedad");
          if (hasCarbonAnalyzerMatch(humidityRows as any[])) {
            const exactOptions = buildNumberedProductOptions(humidityRows as any[], 8);
            strictMemory.pending_product_options = exactOptions.slice(0, 8);
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = exactOptions.length ? "strict_choose_model" : "strict_need_spec";
            strictMemory.last_category_intent = "analizador_humedad";
            const reply = exactOptions.length
              ? [
                  "Sí, en base de datos tengo opción para analizador de humedad orientado a fibra de carbono.",
                  ...exactOptions.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Elige con letra o número (A/1).",
                ].join("\n")
              : "Sí, manejo analizador de humedad para esa aplicación, pero no veo opciones activas para listar en este momento.";
            return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: "guided_need_discovery" });
          }
          const options = buildNumberedProductOptions(humidityRows as any[], 8);
          strictMemory.pending_product_options = options.slice(0, 8);
          strictMemory.pending_family_options = [];
          strictMemory.awaiting_action = options.length ? "strict_choose_model" : "strict_need_spec";
          strictMemory.last_category_intent = "analizador_humedad";
          const reply = options.length
            ? [
                "En base de datos no tengo un analizador de humedad específico para fibra de carbono.",
                "Sí manejo analizadores de humedad OHAUS de uso general. Estas son opciones disponibles:",
                ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                "",
                "Elige con letra o número (A/1), o dime tu muestra y rango de peso para recomendarte mejor.",
              ].join("\n")
            : "En base de datos no tengo un analizador de humedad específico para fibra de carbono. Si quieres, te recomiendo alternativas generales del catálogo OHAUS.";
          return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: "out_of_catalog" });
        }

        if (isOutOfCatalogDomainQuery(text)) {
          const available = listActiveCatalogCategories(ownerRows as any[]);
          const reply = [
            buildNoActiveCatalogEscalationMessage("ese tipo de producto"),
            `Actualmente si manejo: ${available}.`,
          ].join("\n");
          strictMemory.awaiting_action = "conversation_followup";
          return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: "out_of_catalog" });
        }

        if (pipelineIntent === "guided_need_discovery") {
          const guidedProfile = detectGuidedBalanzaProfile(text);
          if (guidedProfile) {
            const industrialMode = guidedProfile === "balanza_industrial_portatil_conteo" ? detectIndustrialGuidedMode(text) : "";
            const options = buildGuidedPendingOptions(ownerRows as any[], guidedProfile, industrialMode as any);
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = options.length ? "strict_choose_model" : "strict_need_spec";
            strictMemory.last_category_intent = "balanzas";
            strictMemory.guided_balanza_profile = guidedProfile;
            strictMemory.guided_industrial_mode = industrialMode;
            strictMemory.commercial_welcome_sent = true;
            const reply = buildGuidedBalanzaReplyWithMode(guidedProfile, industrialMode as any);
            return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: "guided_need_discovery", guided_profile: guidedProfile });
          }
          const featureTerms = extractFeatureTerms(text);
          const featureRanked = featureTerms.length
            ? rankCatalogByFeature(ownerRows as any[], featureTerms).slice(0, 8)
            : [];
          if (featureRanked.length) {
            const featureRows = featureRanked.map((x: any) => x.row).filter(Boolean);
            const options = buildNumberedProductOptions(featureRows as any[], 8);
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = options.length ? "strict_choose_model" : "strict_need_spec";
            strictMemory.strict_use_case = String(text || "").trim();
            const reply = [
              `Sí, encontré ${featureRanked.length} referencia(s) que coinciden con esa descripción (${featureTerms.join(", ")}).`,
              ...options.slice(0, 4).map((o) => `${o.code}) ${o.name}`),
              "",
              "Elige con letra o número (A/1) y te envío detalle técnico o cotización.",
            ].join("\n");
            return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: "guided_need_discovery" });
          }
          const app = detectTargetApplication(text) || "";
          const categoryIntentNow = detectCatalogCategoryIntent(text) || "";
          const strictReadabilityHint = Number(slotPack?.slots?.target_readability_g || 0);
          if (isDifferenceQuestionIntent(text)) {
            strictMemory.awaiting_action = "strict_need_spec";
            strictReply = buildScaleDifferenceGuidanceReply();
            return finalizeStrictTurn(strictReply, strictMemory, { pipeline: true, intent: "guided_need_discovery_difference" });
          }
          const hasStrongNeedSignal = Boolean(app || categoryIntentNow || strictReadabilityHint > 0 || featureTerms.length > 0);
          if (!hasStrongNeedSignal) {
            strictMemory.awaiting_action = "strict_need_spec";
            const reply = [
              "No entiendo tu pregunta. Por favor repite tu solicitud con un formato válido de Avanza.",
              "Puedes escribir: modelo exacto (ej.: PX3202/E), categoría (balanzas, básculas o analizador de humedad), o capacidad y resolución (ej.: 2200 g x 0.01 g).",
            ].join("\n");
            return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: "guided_need_discovery_invalid" });
          }
          if (isAmbiguousNeedInput(text)) {
            strictMemory.awaiting_action = "strict_need_spec";
            const reply = [
              "Entendido. No alcancé a comprender completamente tu necesidad.",
              "Por favor escríbeme de nuevo indicando: qué vas a pesar, rango aproximado (mín-máx) y precisión deseada (ej. 0.01 g o 0.001 g).",
            ].join("\n");
            return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: "guided_need_discovery_clarify" });
          }
          const asksBascula = /(bascula|basculas)/.test(textNorm);
          const productKind = asksBascula ? "báscula" : "balanza";
          const guidanceRows = asksBascula
            ? scopeCatalogRows(ownerRows as any[], "basculas")
            : ownerRows as any[];
          const guidance = /(tornillo|tornillos|tuerca|tuercas|perno|pernos|repuesto|repuestos)/.test(textNorm)
            ? "Claro, para ese uso sí tenemos opciones. ¿La necesitas para conteo de piezas o para peso total, y qué rango de peso manejas?"
            : /(papa|papas|alimento|alimentos)/.test(textNorm)
              ? "Claro, para ese uso sí tenemos opciones. ¿Qué capacidad aproximada necesitas y si buscas uso general o más precisión?"
              : /(laboratorio)/.test(textNorm)
                ? "Perfecto, para laboratorio sí tenemos opciones. Para orientarte bien, dime peso aproximado y precisión objetivo."
                : /(oro|joyeria|joyería)/.test(textNorm)
                  ? "Claro, para oro/joyería sí hay opciones. Para recomendarte bien, dime rango de peso y precisión que necesitas."
                  : `Sí, para esa necesidad tenemos opciones de ${productKind}. Para orientarte bien, dime qué vas a pesar, rango de peso aproximado y nivel de precisión que necesitas.`;
          const appOptions = getApplicationRecommendedOptions({
            rows: guidanceRows,
            application: app,
            capTargetG: Number(slotPack.slots.target_capacity_g || 0),
            targetReadabilityG: Number(slotPack.slots.target_readability_g || 0),
            strictPrecision: /(alta\s+precision|m[aá]xima\s+precision|menos\s+de)/.test(textNorm),
          });
          const top = appOptions.slice(0, 3);
          strictMemory.pending_product_options = appOptions.slice(0, 8);
          strictMemory.pending_family_options = [];
          strictMemory.awaiting_action = appOptions.length ? "strict_choose_model" : "strict_need_spec";
          strictMemory.strict_use_case = String(text || "").trim();
          const onlyOneBascula = asksBascula && appOptions.length === 1;
          const reply = [
            guidance,
            ...(top.length
              ? [
                  "",
                  onlyOneBascula ? "Por ahora en catálogo activo tengo 1 báscula compatible:" : "Opciones sugeridas para empezar:",
                  ...top.map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Si quieres, elige A/1 y te envío ficha o cotización.",
                ]
              : []),
          ].join("\n");
          return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
        }

        if (pipelineIntent === "use_explanation_question") {
          strictMemory.awaiting_action = "strict_need_spec";
          const reply = [
            "Buena pregunta: las balanzas/básculas se usan para pesar con precisión en procesos como laboratorio, joyería, alimentos e industria.",
            "Para recomendarte bien según catálogo activo, dime: 1) uso/aplicación, 2) capacidad aproximada, 3) resolución objetivo.",
            "Ejemplo: laboratorio, 1000 g, 0.1 g.",
          ].join("\n");
          return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
        }

        const selectedId = String(previousMemory?.last_selected_product_id || previousMemory?.last_product_id || "").trim();
        const selectedName = String(previousMemory?.last_selected_product_name || previousMemory?.last_product_name || "").trim();
        const selected = selectedId
          ? (ownerRows as any[]).find((r: any) => String(r?.id || "").trim() === selectedId)
          : (selectedName ? findCatalogProductByName(ownerRows as any[], selectedName) : null);
        const categoryScoped = rememberedCategory ? scopeCatalogRows(ownerRows as any, rememberedCategory) : ownerRows;

        if (pipelineIntent === "compatibility_question" || pipelineIntent === "application_update") {
          const asksUseExplanationNow = /(para\s+que\s+sirven?|que\s+uso\s+tienen|para\s+que\s+se\s+usan)/.test(textNorm) && /(balanza|balanzas|bascula|basculas)/.test(textNorm);
          if (asksUseExplanationNow) {
            strictMemory.awaiting_action = "strict_need_spec";
            const reply = [
              "Las balanzas/básculas se usan para pesar con precisión en laboratorio, joyería, alimentos e industria.",
              "Para recomendarte una opción exacta de catálogo, dime uso, capacidad y resolución objetivo.",
              "Ejemplo: laboratorio, 1000 g, 0.1 g.",
            ].join("\n");
            return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: "use_explanation_question" });
          }
          const app = detectTargetApplication(text) || String(slotPack.slots.target_application || "");
          const asksLabCatalog = /(cuales?|cu[aá]les?|que|qué).*(de\s+laboratorio|laboratorio).*(tienes|hay|manejas|ofreces)/.test(textNorm) || /tienes.*laboratorio/.test(textNorm);
          const explicitLabEquipmentAsk = /(plancha|planchas|calentamiento|agitacion|agitación|agitador|mezclador|homogeneizador|centrifuga)/.test(textNorm);
          const labRows = app === "laboratorio" ? scopeCatalogRows(ownerRows as any, "equipos_laboratorio") : [];
          const hasActiveLabEquipment = Array.isArray(labRows) && labRows.length > 0;
          const targetRead = Number(slotPack.slots.target_readability_g || previousMemory?.strict_filter_readability_g || 0);
          const strictPrecisionAsk = /(menos\s+de|maxima\s+precision|maxima\s+precisi[oó]n|alta\s+precision|m[aá]xima\s+precision)/.test(textNorm);
          const capTarget = Number(slotPack.slots.target_capacity_g || previousMemory?.strict_filter_capacity_g || 0);
          const options = getApplicationRecommendedOptions({
            rows: categoryScoped as any[],
            application: app,
            capTargetG: capTarget,
            targetReadabilityG: targetRead,
            strictPrecision: strictPrecisionAsk,
            excludeId: String(selected?.id || ""),
          });
          strictMemory.target_application = app;
          strictMemory.target_industry = app === "joyeria_oro" ? "joyeria" : app;
          if (app === "laboratorio" && !hasActiveLabEquipment && (asksLabCatalog || explicitLabEquipmentAsk)) {
            const unavailableLabTopic = detectUnavailableLabTopic(text);
            if (options.length) {
              const reply = [
                buildNoActiveCatalogEscalationMessage(unavailableLabTopic),
              ].join("\n");
              strictMemory.awaiting_action = "conversation_followup";
              return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
            }
            strictMemory.awaiting_action = "conversation_followup";
            return finalizeStrictTurn(buildNoActiveCatalogEscalationMessage(unavailableLabTopic), strictMemory, { pipeline: true, intent: pipelineIntent });
          }
          if (options.length) {
            if (app === "joyeria_oro") {
              const guidedProfile = "balanza_oro_001" as GuidedBalanzaProfile;
              const guidedOptions = buildGuidedPendingOptions(ownerRows as any[], guidedProfile, "");
              if (guidedOptions.length) {
                strictMemory.pending_product_options = guidedOptions;
                strictMemory.pending_family_options = [];
                strictMemory.awaiting_action = "strict_choose_model";
                strictMemory.strict_model_offset = 0;
                strictMemory.last_category_intent = "balanzas";
                strictMemory.guided_balanza_profile = guidedProfile;
                strictMemory.guided_industrial_mode = "";
                return finalizeStrictTurn(buildGuidedBalanzaReplyWithMode(guidedProfile, ""), strictMemory, { pipeline: true, intent: pipelineIntent });
              }
            }
            if (app === "laboratorio") {
              const guidedProfile = "balanza_laboratorio_0001" as GuidedBalanzaProfile;
              const guidedOptions = buildGuidedPendingOptions(ownerRows as any[], guidedProfile, "");
              if (guidedOptions.length) {
                strictMemory.pending_product_options = guidedOptions;
                strictMemory.pending_family_options = [];
                strictMemory.awaiting_action = "strict_choose_model";
                strictMemory.strict_model_offset = 0;
                strictMemory.last_category_intent = "balanzas";
                strictMemory.guided_balanza_profile = guidedProfile;
                strictMemory.guided_industrial_mode = "";
                return finalizeStrictTurn(buildGuidedBalanzaReplyWithMode(guidedProfile, ""), strictMemory, { pipeline: true, intent: pipelineIntent });
              }
            }
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            const appLabel = app.replace(/_/g, " ");
            const intro = pipelineIntent === "application_update"
              ? `Perfecto. Para ${appLabel}, estas son opciones activas de catálogo:`
              : `Sí, contamos con balanzas de precisión que se ajustan a tu necesidad para ${appLabel}.`;
            const estimated = /laboratorio|joyeria|oro/.test(appLabel)
              ? "💰 Valores estimados: desde $4.000.000 (según gama y funcionalidad). Deseas continuar con la cotización"
              : "💰 Valores estimados: según modelo, gama y disponibilidad.";
            const reply = [
              intro,
              estimated,
              "Te comparto 3 recomendaciones de catálogo para seguir:",
              ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
              "",
              "Elige una con letra/número (A/1), o escribe 'más'.",
            ].join("\n");
            return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
          }
          const fallback = buildCompatibilityAnswer({
            text,
            slots: slotPack.slots,
            pendingOptions: pendingForSlots,
            detectTargetApplication,
          });
          strictMemory.awaiting_action = "compatibility_followup";
          strictMemory.compatibility_application = app;
          const reply = [
            String(fallback || "").trim(),
            "",
            "Para continuar, responde:",
            "1) Ver 3 opciones recomendadas",
            "2) Ajustar capacidad/resolución",
          ].join("\n");
          return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
        }

        if (pipelineIntent === "technical_spec_input") {
          const appNow = detectTargetApplication(text);
          const appProfile = String(appNow || strictMemory.target_application || previousMemory?.target_application || "").trim();
          if (appNow) {
            strictMemory.target_application = appNow;
            strictMemory.target_industry = appNow === "joyeria_oro" ? "joyeria" : appNow;
          }
          const merged = mergeLooseSpecWithMemory(
            {
              capacityG: Number(previousMemory?.strict_filter_capacity_g || previousMemory?.target_capacity_g || 0),
              readabilityG: Number(previousMemory?.strict_filter_readability_g || previousMemory?.target_readability_g || 0),
            },
            parseLooseTechnicalHint(text)
          );
          const cap = Number(merged.capacityG || 0);
          const read = Number(merged.readabilityG || 0);
          strictMemory.strict_partial_capacity_g = cap > 0 ? cap : "";
          strictMemory.strict_partial_readability_g = read > 0 ? read : "";
          const guidedProfileByNeed = detectGuidedBalanzaProfile(text);

          if (guidedProfileByNeed && !(cap > 0) && !(read > 0)) {
            const industrialMode = guidedProfileByNeed === "balanza_industrial_portatil_conteo" ? detectIndustrialGuidedMode(text) : "";
            const guidedOptions = buildGuidedPendingOptions(ownerRows as any[], guidedProfileByNeed, industrialMode as any);
            if (guidedOptions.length) {
              strictMemory.guided_balanza_profile = guidedProfileByNeed;
              strictMemory.guided_industrial_mode = industrialMode;
              strictMemory.last_category_intent = "balanzas";
              strictMemory.pending_product_options = guidedOptions;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              return finalizeStrictTurn(buildGuidedBalanzaReplyWithMode(guidedProfileByNeed, industrialMode as any), strictMemory, { pipeline: true, intent: "guided_need_discovery" });
            }
          }

          if (cap > 0 && read > 0) {
            strictMemory.strict_spec_query = `${formatSpecNumber(cap)} g x ${formatSpecNumber(read)} g`;
            strictMemory.strict_filter_capacity_g = cap;
            strictMemory.strict_filter_readability_g = read;
            const guidedByUsage = guidedProfileFromUsageContext({
              text,
              capacityG: cap,
              readabilityG: read,
              detectTargetApplication,
            });
            if (guidedByUsage) {
              const industrialMode = guidedByUsage === "balanza_industrial_portatil_conteo" ? detectIndustrialGuidedMode(text) : "";
              const guidedOptions = buildGuidedPendingOptions(ownerRows as any[], guidedByUsage, industrialMode as any);
              if (guidedOptions.length) {
                strictMemory.guided_balanza_profile = guidedByUsage;
                strictMemory.guided_industrial_mode = industrialMode;
                strictMemory.last_category_intent = "balanzas";
                strictMemory.pending_product_options = guidedOptions;
                strictMemory.pending_family_options = [];
                strictMemory.awaiting_action = "strict_choose_model";
                strictMemory.strict_model_offset = 0;
                return finalizeStrictTurn(buildGuidedBalanzaReplyWithMode(guidedByUsage, industrialMode as any), strictMemory, {
                  pipeline: true,
                  intent: "guided_need_discovery",
                });
              }
            }
            const explicitUsageContext = detectTargetApplication(text);
            const exactRows = getExactTechnicalMatches(baseScoped as any[], { capacityG: cap, readabilityG: read });
            const prioritized = prioritizeTechnicalRows(baseScoped as any[], { capacityG: cap, readabilityG: read });
            const hasUsageContext = Boolean(guidedByUsage || explicitUsageContext);
            const nearbyRows = filterNearbyTechnicalRows(prioritized.orderedRows as any[], { capacityG: cap, readabilityG: read });
            const sourceRowsRaw = hasUsageContext
              ? (exactRows.length ? exactRows : prioritized.orderedRows)
              : (nearbyRows.length > 1 ? nearbyRows : prioritized.orderedRows);
            const sourceRows = hasUsageContext
              ? applyApplicationProfile(sourceRowsRaw as any[], {
                  application: explicitUsageContext,
                  targetCapacityG: cap,
                  targetReadabilityG: read,
                  allowFallback: false,
                })
              : sourceRowsRaw;
            const optionLimit = hasUsageContext ? 8 : 40;
            const options = buildNumberedProductOptions((sourceRows || []).slice(0, optionLimit) as any[], optionLimit);
            if (options.length) {
              strictMemory.pending_product_options = options;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              strictMemory.strict_filtered_catalog_ids = (sourceRows || [])
                .map((r: any) => String(r?.id || "").trim())
                .filter(Boolean);
              const priceLine = buildPriceRangeLine(sourceRows as any[]);
              const headline = hasUsageContext
                ? (exactRows.length
                    ? `Sí, tengo coincidencias exactas para ${strictMemory.strict_spec_query}.`
                    : `Para ${strictMemory.strict_spec_query} no veo exacta, pero sí cercanas de BD:`)
                : `Para ${strictMemory.strict_spec_query} tengo estas opciones relacionadas por capacidad y resolución:`;
              const reply = hasUsageContext
                ? [
                    headline,
                    ...(priceLine ? [priceLine] : []),
                    ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                    "",
                    "Elige con letra/número (A/1), o escribe 'más'.",
                  ].join("\n")
                : buildGroupedSpecReplyNoContextApp({
                    specQuery: strictMemory.strict_spec_query,
                    options,
                    sourceRows: sourceRows as any[],
                    priceLine,
                    inferSpecProcessLabel: (row: any) => inferSpecProcessLabelApp({ row, familyLabelFromRow, extractRowTechnicalSpec }),
                  });
              return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
            }

            if (appProfile) {
              if (appProfile === "laboratorio") {
                const guidedProfile = "balanza_laboratorio_0001" as GuidedBalanzaProfile;
                const guidedOptions = buildGuidedPendingOptions(ownerRows as any[], guidedProfile, "");
                if (guidedOptions.length) {
                  strictMemory.guided_balanza_profile = guidedProfile;
                  strictMemory.guided_industrial_mode = "";
                  strictMemory.last_category_intent = "balanzas";
                  strictMemory.pending_product_options = guidedOptions;
                  strictMemory.pending_family_options = [];
                  strictMemory.awaiting_action = "strict_choose_model";
                  strictMemory.strict_model_offset = 0;
                  strictMemory.strict_filter_capacity_g = cap;
                  strictMemory.strict_filter_readability_g = read;
                  strictMemory.strict_spec_query = `${formatSpecNumber(cap)} g x ${formatSpecNumber(read)} g`;
                  return finalizeStrictTurn(buildGuidedBalanzaReplyWithMode(guidedProfile, ""), strictMemory, { pipeline: true, intent: "guided_need_discovery" });
                }
              }
              const appAlternatives = getApplicationRecommendedOptions({
                rows: baseScoped as any[],
                application: appProfile,
                capTargetG: cap,
                targetReadabilityG: read,
                strictPrecision: false,
              });
              const appOptions = buildNumberedProductOptions((appAlternatives || []).slice(0, 8) as any[], 8);
              if (appOptions.length) {
                strictMemory.pending_product_options = appOptions;
                strictMemory.pending_family_options = [];
                strictMemory.awaiting_action = "strict_choose_model";
                strictMemory.strict_model_offset = 0;
                strictMemory.strict_filtered_catalog_ids = (appAlternatives || [])
                  .map((r: any) => String(r?.id || "").trim())
                  .filter(Boolean);
                const priceLine = buildPriceRangeLine(appAlternatives as any[]);
                const reply = [
                  `Para ${strictMemory.strict_spec_query} no tengo coincidencia exacta en ${appProfile.replace(/_/g, " ")}, pero sí estas alternativas compatibles:`,
                  ...(priceLine ? [priceLine] : []),
                  ...appOptions.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Elige con letra/número (A/1), o escribe 'más'.",
                ].join("\n");
                return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
              }
            }

            strictMemory.awaiting_action = "strict_need_spec";
            return finalizeStrictTurn(`Para ${strictMemory.strict_spec_query} no tengo opciones activas en BD. Si quieres, ajustamos capacidad/resolución.`, strictMemory, { pipeline: true, intent: pipelineIntent });
          }

          if (cap > 0 && !(read > 0)) {
            if (guidedProfileByNeed) {
              const industrialMode = guidedProfileByNeed === "balanza_industrial_portatil_conteo" ? detectIndustrialGuidedMode(text) : "";
              const guidedOptions = buildGuidedPendingOptions(ownerRows as any[], guidedProfileByNeed, industrialMode as any);
              if (guidedOptions.length) {
                strictMemory.guided_balanza_profile = guidedProfileByNeed;
                strictMemory.guided_industrial_mode = industrialMode;
                strictMemory.last_category_intent = "balanzas";
                strictMemory.pending_product_options = guidedOptions;
                strictMemory.pending_family_options = [];
                strictMemory.awaiting_action = "strict_choose_model";
                strictMemory.strict_model_offset = 0;
                strictMemory.strict_partial_capacity_g = cap;
                strictMemory.strict_filter_capacity_g = cap;
                return finalizeStrictTurn(buildGuidedBalanzaReplyWithMode(guidedProfileByNeed, industrialMode as any), strictMemory, { pipeline: true, intent: "guided_need_discovery" });
              }
            }
            const currentCategory = normalizeText(String(rememberedCategory || previousMemory?.last_category_intent || detectCatalogCategoryIntent(text) || ""));
            const scopedForFast = currentCategory ? scopeCatalogRows(ownerRows as any[], currentCategory) : ownerRows;
            if (isLargestCapacityAskApp(text, normalizeText)) {
              const largest = buildLargestCapacitySuggestion(scopedForFast as any[]);
              if (largest.options.length) {
                strictMemory.pending_product_options = largest.options;
                strictMemory.pending_family_options = [];
                strictMemory.awaiting_action = "strict_choose_model";
                strictMemory.strict_model_offset = 0;
                return finalizeStrictTurn(largest.reply, strictMemory, { pipeline: true, intent: pipelineIntent });
              }
            }
            const rankedCapGeneric = rankCatalogByCapacityOnly(scopedForFast as any[], cap);
            const capRowsGeneric = rankedCapGeneric.length ? rankedCapGeneric.map((x: any) => x.row) : scopedForFast;
            const capOptionsGeneric = buildNumberedProductOptions((capRowsGeneric || []).slice(0, 8) as any[], 8);
            if (capOptionsGeneric.length) {
              const first = capOptionsGeneric[0];
              const alternatives = capOptionsGeneric.slice(1, 4);
              const appHint = /(industrial|repuesto|repuestos|cajas|bodega|planta)/.test(textNorm) ? "industrial" : "general";
              strictMemory.strict_partial_capacity_g = cap;
              strictMemory.strict_filter_capacity_g = cap;
              strictMemory.pending_product_options = capOptionsGeneric;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              const priceLine = buildPriceRangeLine(capRowsGeneric as any[]);
              const reply = [
                `Perfecto. Para ~${formatSpecNumber(cap)} g, te recomiendo empezar con ${String(first?.name || "esta opción")} (${appHint}).`,
                ...(priceLine ? [priceLine] : []),
                "También te dejo alternativas cercanas por capacidad:",
                ...alternatives.map((o) => `${o.code}) ${o.name}`),
                "",
                "Si quieres mayor precisión, te filtro por resolución objetivo (ej.: 1 g, 0.1 g, 0.01 g).",
              ].join("\n");
              return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
            }
            if (currentCategory === "basculas" && Array.isArray(scopedForFast) && scopedForFast.length > 0 && scopedForFast.length <= 4) {
              const rankedCap = rankCatalogByCapacityOnly(scopedForFast as any[], cap);
              const rankedRows = rankedCap.length ? rankedCap.map((x: any) => x.row) : scopedForFast;
              const options = buildNumberedProductOptions((rankedRows || []).slice(0, 8) as any[], 8);
              if (options.length) {
                strictMemory.strict_partial_capacity_g = cap;
                strictMemory.strict_filter_capacity_g = cap;
                strictMemory.pending_product_options = options;
                strictMemory.pending_family_options = [];
                strictMemory.awaiting_action = "strict_choose_model";
                strictMemory.strict_model_offset = 0;
                const total = options.length;
                const priceLine = buildPriceRangeLine(rankedRows as any[]);
                const reply = [
                  `Perfecto. Para básculas activas, en este momento manejo ${total} modelo(s).`,
                  ...(priceLine ? [priceLine] : []),
                  ...options.map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Elige una con letra/número (A/1) y te envío ficha o cotización.",
                ].join("\n");
                return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
              }
            }
            strictMemory.awaiting_action = "strict_need_spec";
            return finalizeStrictTurn(`Perfecto, ya tengo la capacidad (${formatSpecNumber(cap)} g). Ahora dime la resolución objetivo (ej.: 0.1 g, 0.01 g, 0.001 g).`, strictMemory, { pipeline: true, intent: pipelineIntent });
          }
          if (read > 0 && !(cap > 0)) {
            const guidedProfileByRead = detectGuidedBalanzaProfile(text);
            if (guidedProfileByRead) {
              const industrialMode = guidedProfileByRead === "balanza_industrial_portatil_conteo" ? detectIndustrialGuidedMode(text) : "";
              const options = buildGuidedPendingOptions(ownerRows as any[], guidedProfileByRead, industrialMode as any);
              strictMemory.pending_product_options = options;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = options.length ? "strict_choose_model" : "strict_need_spec";
              strictMemory.strict_model_offset = 0;
              strictMemory.last_category_intent = "balanzas";
              strictMemory.guided_balanza_profile = guidedProfileByRead;
              strictMemory.guided_industrial_mode = industrialMode;
              return finalizeStrictTurn(buildGuidedBalanzaReplyWithMode(guidedProfileByRead, industrialMode as any), strictMemory, { pipeline: true, intent: "guided_need_discovery" });
            }
            strictMemory.awaiting_action = "strict_need_spec";
            return finalizeStrictTurn(`Perfecto, ya tengo la precisión (${formatSpecNumber(read)} g). Ahora dime la capacidad aproximada (ej.: 200 g, 1000 g, 2 kg).`, strictMemory, { pipeline: true, intent: pipelineIntent });
          }
        }

        if (pipelineIntent === "alternative_request") {
          const asksMoreOnly = /\b(mas|más|siguientes|mas\s+opciones|más\s+opciones|otras\s+opciones)\b/.test(textNorm);
          const pendingNow = Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [];
          if (asksMoreOnly && awaiting === "strict_choose_model" && pendingNow.length > 0) {
            // Mantiene el flujo original de paginación del menú de modelos.
            return null;
          }
          const appProfile = String(strictMemory.target_application || previousMemory?.target_application || "").trim();
          const cap = Number(previousMemory?.strict_filter_capacity_g || slotPack.slots.target_capacity_g || 0);
          const read = Number(previousMemory?.strict_filter_readability_g || slotPack.slots.target_readability_g || 0);
          if (cap > 0 && read > 0) {
            const prioritized = prioritizeTechnicalRows(baseScoped as any[], { capacityG: cap, readabilityG: read });
            const nearRows = filterNearbyTechnicalRows((prioritized.orderedRows || baseScoped) as any[], { capacityG: cap, readabilityG: read });
            const profiledRows = applyApplicationProfile((nearRows || []) as any[], {
              application: appProfile,
              targetCapacityG: cap,
              targetReadabilityG: read,
              allowFallback: false,
            });
            const options = buildNumberedProductOptions((profiledRows || []).slice(0, 8) as any[], 8);
            if (options.length) {
              strictMemory.pending_product_options = options;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              const reply = [
                `Claro, aquí tienes alternativas cercanas a ${formatSpecNumber(cap)} g x ${formatSpecNumber(read)} g:`,
                ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                "",
                "Elige con letra/número (A/1), o escribe 'más'.",
              ].join("\n");
              return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
            }
          }
          strictMemory.awaiting_action = "strict_need_spec";
          return finalizeStrictTurn("Para darte alternativas coherentes de BD, confirma capacidad y resolución objetivo (ej.: 200 g x 0.001 g).", strictMemory, { pipeline: true, intent: pipelineIntent });
        }

        if (pipelineIntent === "menu_selection") {
          const menuType = String(slotPack.slots.active_menu_type || "");
          if (menuType === "model_action_menu") {
            if (/^\s*1\s*$/.test(textNorm)) {
              strictMemory.awaiting_action = "strict_quote_data";
              strictMemory.quote_quantity = Math.max(1, Number(previousMemory?.quote_quantity || 1));
              const quoteMemoryMerged = {
                ...(previousMemory && typeof previousMemory === "object" ? previousMemory : {}),
                ...(strictMemory && typeof strictMemory === "object" ? strictMemory : {}),
                quote_data: {
                  ...((previousMemory?.quote_data && typeof previousMemory.quote_data === "object") ? previousMemory.quote_data : {}),
                  ...((strictMemory?.quote_data && typeof strictMemory.quote_data === "object") ? strictMemory.quote_data : {}),
                },
              };
              const reusableNow = getReusableBillingData(quoteMemoryMerged);
              if (reusableNow.complete) {
                strictMemory.quote_data = {
                  city: reusableNow.city,
                  company: reusableNow.company,
                  nit: reusableNow.nit,
                  contact: reusableNow.contact,
                  email: reusableNow.email,
                  phone: reusableNow.phone,
                };
                strictMemory.strict_autorun_quote_with_reuse = true;
                return null;
              }
              const quotePrompt = buildQuoteDataIntakePromptApp("Perfecto. Para cotizar:", getReusableBillingData(quoteMemoryMerged));
              return finalizeStrictTurn(quotePrompt, strictMemory, { pipeline: true, intent: pipelineIntent });
            }
            if (/^\s*2\s*$/.test(textNorm)) {
              strictMemory.awaiting_action = "strict_choose_action";
              strictMemory.last_intent = "datasheet_request";
              // Deja que el flujo legacy maneje PDF de ficha (remoto/local) antes del resumen.
              return null;
            }
            return finalizeStrictTurn("Responde 1 para cotización o 2 para ficha técnica.", strictMemory, { pipeline: true, intent: pipelineIntent });
          }

          if (menuType === "model_selection_menu") {
            const selectedOption = resolvePendingProductOptionStrictApp(text, pendingForSlots);
            if (selectedOption) {
              strictMemory.last_selected_product_id = String(selectedOption.id || "");
              strictMemory.last_selected_product_name = String(selectedOption.raw_name || selectedOption.name || "");
              strictMemory.last_product_id = String(selectedOption.id || "");
              strictMemory.last_product_name = String(selectedOption.raw_name || selectedOption.name || "");
              strictMemory.awaiting_action = "strict_choose_action";
              strictMemory.pending_product_options = [];
              const modelName = String(selectedOption.raw_name || selectedOption.name || "modelo");
              const reply = [
                `Perfecto, tomé ${modelName}.`,
                "¿Qué deseas ahora?",
                "1) Cotización",
                "2) Ficha técnica",
              ].join("\n");
              return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
            }
            return finalizeStrictTurn("Elige una opción válida del menú con letra/número (A/1), o escribe 'más'.", strictMemory, { pipeline: true, intent: pipelineIntent });
          }
        }

        return null;
      };

      const commercialStep = await handleCommercialStep({
        strictReply,
        awaiting,
        strictPrevAwaiting,
        text,
        inboundFrom: inbound.from,
        inboundPushName: inbound.pushName || "",
        strictMemory,
        previousMemory,
        ownerRows: ownerRows as any[],
        supabase: supabase as any,
        ownerId,
        tenantId: (agent as any)?.tenant_id || null,
        agentId: String(agent.id || "").trim() || null,
        resolveCommercialClientTypeStep,
        detectClientRecognitionChoice,
        buildCommercialWelcomeMessage,
        handleCommercialNewCustomerStep,
        handleCommercialExistingStep,
        deps: {
          isInventoryInfoIntent,
          isCatalogBreadthQuestion,
          isGlobalCatalogAsk,
          normalizeText,
          looksLikeBillingData: (value: string) => looksLikeBillingDataApp({ text: value, isContactInfoBundle: (text: string) => isContactInfoBundleApp({ text, extractEmail, extractCustomerPhone }), extractEmail, extractCustomerPhone }),
          extractCompanyNit,
          normalizePhone,
          extractCustomerPhone,
          phoneTail10,
          findCommercialContactByIdentifiers,
          normalizeCityLabel,
          sanitizeCustomerDisplayName,
          buildExistingClientMatchConfirmationPrompt,
          shouldEscalateToAdvisorByCommercialRule,
          buildCommercialEscalationMessage,
          updateNewCustomerRegistration: updateNewCustomerRegistrationApp,
          extractSimpleLabeledValue,
          extractCustomerName,
          extractEmail,
          getMissingNewCustomerFields,
          buildNewCustomerDataPrompt,
          buildMissingNewCustomerDataMessage,
          handleCommercialNewCustomerRetryLookup,
          handleCommercialNewCustomerPersistAndDetectExisting,
          upsertNewCommercialCustomerContact: upsertNewCommercialCustomerContactApp,
          ensureAnalysisOpportunitySeed: ensureAnalysisOpportunitySeedApp,
          isQuoteDraftStatusConstraintError,
          handleCommercialNewCustomerEquipmentSelection,
          detectEquipmentChoice,
          detectGuidedBalanzaProfile,
          detectIndustrialGuidedMode,
          buildGuidedPendingOptions,
          buildGuidedBalanzaReplyWithMode,
          isDifferenceQuestionIntent,
          buildScaleDifferenceGuidanceReply,
          buildBalanzaQualificationPrompt,
          scopeStrictBasculaRows,
          buildNumberedProductOptions,
          buildNoActiveCatalogEscalationMessage,
          equipmentChoiceLabel,
          buildCommercialValidationOkMessage,
          hasPriorityProductGuidanceIntent,
          handleCommercialExistingEntryStep,
          isAffirmativeShortIntent,
          buildGuidedNeedReframePrompt,
          buildExistingClientLookupPrompt,
          handleCommercialExistingLookupFlow,
          handleCommercialExistingConfirmFlow,
          detectExistingClientConfirmationChoice,
          handleCommercialExistingContactUpdateFlow,
          parseExistingContactUpdateData: parseExistingContactUpdateDataApp,
          handleCommercialExistingEquipmentGate,
          buildEquipmentMenuPrompt,
          handleCommercialExistingEquipmentSelection,
        },
      });
      if (commercialStep) {
        if (commercialStep.recognizedReturningCustomer) recognizedReturningCustomer = true;
        strictReply = commercialStep.strictReply;
        return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: commercialStep.gate });
      }

      if (!String(strictReply || "").trim() && isAlternativeRejectionIntent(text)) {
        const inSelectionStep = /^(strict_choose_model|strict_choose_family|strict_choose_action|price_objection_followup|strict_need_spec|strict_need_industry)$/i.test(String(awaiting || ""));
        if (inSelectionStep) {
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = buildGuidedNeedReframePrompt();
          return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "alternative_reframe_guidance" });
        }
      }

      if (!String(strictReply || "").trim() && isScaleUseExplanationIntent(text)) {
        const categoryNow = String(rememberedCategory || previousMemory?.last_category_intent || "");
        const inSelectionStep = /^(strict_choose_model|strict_choose_family|strict_choose_action|strict_need_spec|strict_need_industry|price_objection_followup)$/i.test(String(awaiting || ""));
        strictMemory.awaiting_action = inSelectionStep
          ? String(awaiting || "strict_need_spec")
          : "strict_need_spec";
        strictMemory.strict_followup_after_use_explanation = true;
        strictReply = buildScaleUseExplanationReply(categoryNow);
        return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "scale_use_explanation" });
      }

      if (
        !String(strictReply || "").trim() &&
        Boolean(previousMemory?.strict_followup_after_use_explanation) &&
        isAffirmativeShortIntent(text)
      ) {
        const categoryNow = normalizeText(String(rememberedCategory || previousMemory?.last_category_intent || ""));
        strictMemory.strict_followup_after_use_explanation = false;
        if (categoryNow === "basculas") {
          const basculaRows = scopeStrictBasculaRows(ownerRows as any[]);
          const options = buildNumberedProductOptions(basculaRows as any[], 8);
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictMemory.last_category_intent = "basculas";
            strictReply = [
              `Perfecto. Para básculas, te recomiendo estas opciones activas para empezar:`,
              ...options.slice(0, 4).map((o) => `${o.code}) ${o.name}`),
              "",
              "Elige con letra/número (A/1) y te envío ficha o cotización.",
            ].join("\n");
            return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "use_explanation_affirmative_basculas" });
          }
        }
        strictMemory.awaiting_action = "strict_need_spec";
        strictReply = buildGuidedNeedReframePrompt();
        return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "use_explanation_affirmative_guidance" });
      }

      if (!String(strictReply || "").trim() && isCapacityResolutionHelpIntent(text)) {
        const pendingOpts = Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [];
        const inSelectionStep = /^(strict_choose_model|strict_choose_family|strict_choose_action)$/i.test(String(awaiting || ""));
        strictMemory.awaiting_action = inSelectionStep
          ? String(awaiting || "strict_choose_model")
          : "strict_need_spec";
        strictReply = [
          buildCapacityResolutionExplanation(),
          ...(inSelectionStep && pendingOpts.length
            ? ["", "Si quieres retomar el listado, elige una opción con número o letra (ej.: 1 o A)."]
            : []),
        ].join("\n");
        return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "capacity_resolution_help" });
      }

      if (!String(strictReply || "").trim() && isPriceObjectionIntent(text)) {
        strictMemory.awaiting_action = "price_objection_followup";
        strictMemory.price_objection_context_category = String(rememberedCategory || previousMemory?.last_category_intent || "balanzas");
        strictReply = buildPriceObjectionReply();
        return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "price_objection_guidance" });
      }

      if (!String(strictReply || "").trim() && isProductDefinitionIntent(
        text,
        Boolean(parseTechnicalSpecQuery(text)) || /\b\d+(?:[.,]\d+)?\s*(g|kg|mg)\b/.test(normalizeText(String(text || "")))
      )) {
        const inSelectionStep = /^(strict_choose_model|strict_choose_family|strict_choose_action|price_objection_followup)$/i.test(String(awaiting || ""));
        strictMemory.awaiting_action = inSelectionStep ? String(awaiting || "strict_choose_model") : "strict_need_spec";
        strictReply = buildProductDefinitionReplyApp(text, appendQuoteClosureCta);
        return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "product_definition_help" });
      }

      if (!String(strictReply || "").trim() && String(awaiting || "") === "price_objection_followup" && isAffirmativeShortIntent(text)) {
        const contextCategory = String(previousMemory?.price_objection_context_category || rememberedCategory || previousMemory?.last_category_intent || "balanzas").trim();
        const scopedRows = contextCategory ? scopeCatalogRows(ownerRows as any[], contextCategory) : ownerRows;
        const pendingOptions = Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [];
        const sourceOptions = pendingOptions.length
          ? pendingOptions
          : buildNumberedProductOptions(scopedRows as any[], 12);
        const picked = pickDistinctGamaOptionsApp(sourceOptions as any[], 3, (name: string) => gamaLabelForModelNameApp(name, normalizeText))
          .slice(0, 3)
          .map((o: any, idx: number) => ({ ...o, code: String(idx + 1), rank: idx + 1 }));

        if (picked.length) {
          strictMemory.pending_product_options = picked;
          strictMemory.pending_family_options = [];
          strictMemory.quote_bundle_options_current = picked;
          strictMemory.quote_bundle_options = picked;
          strictMemory.last_recommended_options = picked;
          strictMemory.awaiting_action = "strict_choose_model";
          strictMemory.strict_model_offset = 0;
          strictReply = [
            "Perfecto 👌 Te comparto 3 opciones por gama para comparar costo-beneficio:",
            ...picked.map((o: any) => `${o.code}) ${o.name}`),
            "",
            "Si quieres, te cotizo una o varias (máx. 3).",
            "Escribe: cotizar opciones 1,2,3 (ejemplo).",
          ].join("\n");
        } else {
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = isDifferenceQuestionIntent(text)
            ? buildScaleDifferenceGuidanceReply()
            : buildBalanzaQualificationPrompt();
        }
        return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "price_objection_followup_options" });
      }

      const pipelineResponse = await pipelineGate();
      if (pipelineResponse) return pipelineResponse;

      if (!String(strictReply || "").trim()) {
        const bundleSelection = extractBundleSelectionFromCountCommand(text);
        const requestedBundleCount = Number(bundleSelection?.count || 0);
        const selectedIndexesRaw = (bundleSelection?.picks?.length ? bundleSelection.picks : extractBundleOptionIndexesApp(text));
        const pendingOnly = Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [];
        const currentBundleOnly = Array.isArray(previousMemory?.quote_bundle_options_current) ? previousMemory.quote_bundle_options_current : [];
        const recommendedOnly = Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : [];
        const quoteBundleOnly = Array.isArray(previousMemory?.quote_bundle_options) ? previousMemory.quote_bundle_options : [];
        const pendingForBundle =
          currentBundleOnly
            .concat(quoteBundleOnly)
            .concat(pendingOnly)
            .concat(recommendedOnly)
            .filter((o: any, idx: number, arr: any[]) => {
              const key = String(o?.id || o?.product_id || o?.raw_name || o?.name || "").trim();
              if (!key) return false;
              return arr.findIndex((x: any) => String(x?.id || x?.product_id || x?.raw_name || x?.name || "").trim() === key) === idx;
            });
        const optionsForIndexSelection = pickBundleOptionSourceByIndexesApp(
          selectedIndexesRaw,
          [pendingOnly, currentBundleOnly, recommendedOnly, quoteBundleOnly, pendingForBundle],
        );
        if (!requestedBundleCount && selectedIndexesRaw.length === 1 && optionsForIndexSelection.length >= selectedIndexesRaw[0] && asksQuoteIntent(text)) {
          const pick = optionsForIndexSelection[selectedIndexesRaw[0] - 1];
          const pickedName = String(pick?.raw_name || pick?.name || "").trim();
          if (pickedName) {
            strictBypassAutoQuote = true;
            inbound.text = `cotizar ${pickedName}`;
            strictMemory.pending_product_options = pendingForBundle;
            strictMemory.last_recommended_options = pendingForBundle;
            strictMemory.awaiting_action = "none";
          }
        }
        const acceptsBareIndexSelection = String(awaiting || "") === "strict_choose_model" && selectedIndexesRaw.length >= 2;
        if ((requestedBundleCount >= 2 || selectedIndexesRaw.length >= 2) && pendingForBundle.length >= 2 && (asksQuoteIntent(text) || acceptsBareIndexSelection)) {
          const explicitIdx = selectedIndexesRaw.filter((n) => n >= 1 && n <= optionsForIndexSelection.length);
          const chosenByIndex = explicitIdx
            .map((n) => optionsForIndexSelection[n - 1])
            .filter(Boolean)
            .slice(0, 3);
          const chosen = chosenByIndex.length >= 2 ? chosenByIndex : [];
          const modelNames = chosen.map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
          if (modelNames.length >= 2) {
            strictBypassAutoQuote = true;
            inbound.text = `cotizar ${modelNames.join(" ; ")} cantidad 1 para todos`;
            strictMemory.pending_product_options = chosen;
            strictMemory.quote_bundle_options_current = chosen;
            strictMemory.quote_bundle_options = chosen;
            strictMemory.last_recommended_options = chosen;
            strictMemory.quote_bundle_selected_ids = chosen.map((o: any) => String(o?.id || o?.product_id || "").trim()).filter(Boolean);
            strictMemory.last_intent = "quote_bundle_request";
            strictMemory.bundle_quote_mode = true;
            strictMemory.bundle_quote_count = chosen.length;
            strictMemory.awaiting_action = "none";
            strictReply = `Perfecto. Voy a generar la cotización consolidada para las opciones ${explicitIdx.slice(0, chosen.length).join(", ")} y te la envío en PDF por este WhatsApp.`;
          } else {
            const shortlist = pendingForBundle.slice(0, Math.min(8, pendingForBundle.length));
            strictMemory.quote_bundle_options_current = shortlist;
            strictMemory.quote_bundle_options = shortlist;
            strictMemory.last_recommended_options = shortlist;
            strictMemory.bundle_quote_mode = true;
            strictMemory.bundle_quote_requested_count = requestedBundleCount >= 2 ? requestedBundleCount : Math.min(3, Math.max(2, explicitIdx.length || 3));
            strictMemory.awaiting_action = "strict_choose_model";
            strictReply = [
              `Perfecto. Para cotizar ${requestedBundleCount >= 2 ? requestedBundleCount : 3} referencia(s), indícame cuáles opciones quieres del listado (máximo 3 por solicitud).`,
              ...shortlist.slice(0, 6).map((o: any, idx: number) => `${idx + 1}) ${String(o?.raw_name || o?.name || "").trim()}`),
              "",
              "Escribe: cotizar 1,2,4 (ejemplo).",
            ].join("\n");
          }
        }
      }

      const strictCloseIntent = isConversationCloseIntentApp(text, normalizeCatalogQueryText) && normalizeText(text).length <= 48;
      if (strictCloseIntent) {
        const hadQuoteContext = hasQuoteContext(previousMemory);
        strictReply = buildConversationCloseReply(hadQuoteContext);
        strictMemory.awaiting_action = "none";
        strictMemory.conversation_status = "closed";
        strictMemory.last_intent = "conversation_closed";
        if (hadQuoteContext) strictMemory.quote_feedback_due_at = isoAfterHoursApp(24);
      }

      const strictAwaiting = String(previousMemory?.awaiting_action || "");
      if (!String(strictReply || "").trim() && strictAwaiting === "compatibility_followup") {
        const app = String(previousMemory?.target_application || previousMemory?.compatibility_application || "").trim();
        const capTarget = Number(previousMemory?.target_capacity_g || previousMemory?.strict_filter_capacity_g || 0);
        const rememberedCategoryCompat = String(previousMemory?.last_category_intent || rememberedCategory || "").trim();
        const scoped = rememberedCategoryCompat ? scopeCatalogRows(ownerRows as any, rememberedCategoryCompat) : ownerRows;
        const askOptions = isAffirmativeIntentApp(text, normalizeText) || /^\s*1\s*$/.test(textNorm) || /\b(opciones|recomendadas|muestrame|mu[eé]strame|dame)\b/.test(textNorm);
        const askAdjust = /^\s*2\s*$/.test(textNorm) || /\b(ajust|capacidad|resolucion|resolución|precision|precisión)\b/.test(textNorm);

        if (askOptions) {
          const options = getApplicationRecommendedOptions({
            rows: scoped as any[],
            application: app,
            capTargetG: capTarget,
            excludeId: String(previousMemory?.last_selected_product_id || previousMemory?.last_product_id || ""),
          });
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictReply = [
              `Perfecto. Estas son 3 opciones recomendadas para ${String(app || "tu uso").replace(/_/g, " ")}:`,
              ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
              "",
              "Elige con letra/número (A/1), o escribe 'más'.",
            ].join("\n");
          } else {
            const fallbackRows = buildNumberedProductOptions(scoped as any[], 8);
            if (fallbackRows.length) {
              strictMemory.pending_product_options = fallbackRows;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              strictReply = [
                "No veo 3 opciones exactas con ese uso, pero sí estas alternativas cercanas de catálogo:",
                ...fallbackRows.slice(0, 4).map((o) => `${o.code}) ${o.name}`),
                "",
                "Elige con letra/número (A/1), o escribe 'más'.",
              ].join("\n");
            } else {
              strictMemory.awaiting_action = "strict_need_spec";
              strictReply = "En este momento no veo 3 opciones adecuadas para ese uso con la info actual. Ajustemos capacidad y resolución para proponerte alternativas reales.";
            }
          }
        } else if (askAdjust) {
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = "Perfecto. Ajustemos el requerimiento: dime capacidad y resolución objetivo (ej.: 220 g x 0.001 g).";
        } else {
          strictMemory.awaiting_action = "compatibility_followup";
          strictReply = [
            "Para seguir sin perder el contexto, responde:",
            "1) Ver 3 opciones recomendadas",
            "2) Ajustar capacidad/resolución",
          ].join("\n");
        }
      }
      if (!String(strictReply || "").trim() && isAdvisorAppointmentIntentApp(text, normalizeText)) {
        strictReply = buildAdvisorMiniAgendaPromptApp(MARIANA_ESCALATION_LINK);
        strictMemory.awaiting_action = "advisor_meeting_slot";
        strictMemory.conversation_status = "open";
      } else if (!String(strictReply || "").trim() && strictAwaiting === "advisor_meeting_slot") {
        const slot = parseAdvisorMiniAgendaChoiceApp(text, normalizeText);
        if (!slot) {
          strictReply = "Para agendar con asesor, responde 1, 2 o 3 según el horario.";
          strictMemory.awaiting_action = "advisor_meeting_slot";
        } else {
          strictReply = `Perfecto. Agendé la gestión con asesor para ${slot.label}. Te contactaremos en ese horario por WhatsApp o llamada.`;
          strictMemory.awaiting_action = "conversation_followup";
          strictMemory.advisor_meeting_at = slot.iso;
          strictMemory.advisor_meeting_label = slot.label;
          strictReply = appendQuoteClosurePrompt(strictReply);
        }
      }

      if (!String(strictReply || "").trim() && awaiting === "followup_quote_disambiguation") {
        const choice = parseAnotherQuoteChoiceApp(text, normalizeText);
        const rememberedId = String(previousMemory?.last_selected_product_id || previousMemory?.last_product_id || "").trim();
        const rememberedName = String(previousMemory?.last_selected_product_name || previousMemory?.last_product_name || "").trim();
        const selectedFromMemory = rememberedId
          ? (ownerRows.find((r: any) => String(r?.id || "").trim() === rememberedId) || null)
          : (rememberedName ? (findCatalogProductByName(ownerRows as any[], rememberedName) || null) : null);

        if (!choice) {
          strictReply = buildAnotherQuotePromptApp();
          strictMemory.awaiting_action = "followup_quote_disambiguation";
          strictMemory.last_intent = "followup_quote_disambiguation";
        } else if (choice === "advisor") {
          strictReply = buildAdvisorMiniAgendaPromptApp(MARIANA_ESCALATION_LINK);
          strictMemory.awaiting_action = "advisor_meeting_slot";
        } else if (choice === "same_model") {
          if (!selectedFromMemory) {
            strictReply = "Perfecto. Indícame el modelo exacto que quieres recotizar y te ayudo enseguida.";
            strictMemory.awaiting_action = "strict_need_spec";
          } else {
            const selectedName = String((selectedFromMemory as any)?.name || rememberedName || "producto");
            const qtyRequested = Math.max(1, extractQuoteRequestedQuantityApp({ text, normalizeText, parseTechnicalSpecQuery }) || Number(previousMemory?.quote_quantity || 1) || 1);
            strictMemory.last_selected_product_id = String((selectedFromMemory as any)?.id || "").trim();
            strictMemory.last_selected_product_name = selectedName;
            strictMemory.quote_quantity = qtyRequested;
            strictMemory.awaiting_action = "strict_quote_data";
            strictReply = buildQuoteDataIntakePromptApp(
              `Perfecto. Preparo una nueva cotización para ${selectedName} (${qtyRequested} unidad(es)).`,
              getReusableBillingData(strictMemory)
            );
          }
        } else {
          const selectedId = String((selectedFromMemory as any)?.id || "").trim();
          const selectedNorm = normalizeText(String((selectedFromMemory as any)?.name || rememberedName || ""));
          const selectedPrice = Number((selectedFromMemory as any)?.base_price_usd || 0);
          const familyLabel = String(previousMemory?.strict_family_label || familyLabelFromRow(selectedFromMemory) || "").trim();
          const categoryScoped = rememberedCategory ? scopeCatalogRows(ownerRows as any, rememberedCategory) : ownerRows;
          const familyScoped = familyLabel
            ? categoryScoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(familyLabel))
            : categoryScoped;
          const basePoolRaw = (familyScoped.length >= 3 ? familyScoped : categoryScoped) as any[];
          const basePool = basePoolRaw.filter((r: any) => {
            const rid = String(r?.id || "").trim();
            const rname = normalizeText(String(r?.name || ""));
            if (selectedId && rid && selectedId === rid) return false;
            if (!selectedId && selectedNorm && rname && selectedNorm === rname) return false;
            return true;
          });

          const byPriceAsc = (rows: any[]) => [...rows]
            .filter((r: any) => Number(r?.base_price_usd || 0) > 0)
            .sort((a: any, b: any) => Number(a?.base_price_usd || 0) - Number(b?.base_price_usd || 0));

          let intro = "Perfecto. Aquí tienes alternativas de otro modelo:";
          let rankedRows = [...basePool];
          if (choice === "cheaper") {
            const priced = byPriceAsc(basePool);
            const cheaper = selectedPrice > 0 ? priced.filter((r: any) => Number(r?.base_price_usd || 0) < selectedPrice) : [];
            rankedRows = cheaper.length ? cheaper : priced;
            intro = cheaper.length
              ? "Perfecto. Sí, tengo opciones más económicas en base de datos:"
              : "No encontré opciones más económicas con precio activo frente al modelo actual; te comparto las de menor precio disponibles:";
          }

          const options = buildNumberedProductOptions(rankedRows as any[], 5);
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.last_recommended_options = options;
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictMemory.strict_family_label = familyLabel;
            strictReply = [
              intro,
              ...options.map((o) => `${o.code}) ${o.name}`),
              "",
              "Elige con letra o número (A/1), o escribe 'más'.",
            ].join("\n");
          } else {
            strictReply = "No encontré alternativas con precio activo para ese criterio en este momento. Si quieres, te muestro opciones por capacidad/resolución.";
            strictMemory.awaiting_action = "strict_need_spec";
          }
        }
      }

      if (!String(strictReply || "").trim() && isConversationFollowupAmbiguousQuote) {
        strictReply = buildAnotherQuotePromptApp();
        strictMemory.awaiting_action = "followup_quote_disambiguation";
        strictMemory.last_intent = "followup_quote_disambiguation";
      }

      if (!String(strictReply || "").trim() && isAmbiguousTechnicalMessageApp(text, normalizeText, parseTechnicalSpecQuery) && !wantsQuote && !wantsSheet) {
        strictMemory.awaiting_action = "strict_need_spec";
        strictReply = buildAmbiguityQuestionApp(text, normalizeText);
      }

      const shouldShortcutTechnicalSpec =
        !String(strictReply || "").trim() &&
        preParsedSpec &&
        /^(strict_need_spec|strict_choose_model|strict_choose_family)$/i.test(String(awaiting || ""));
      if (shouldShortcutTechnicalSpec) {
        const cap = Number((preParsedSpec as any)?.capacityG || 0);
        const read = Number((preParsedSpec as any)?.readabilityG || 0);
        if (cap > 0 && read > 0) {
          strictMemory.strict_spec_query = `${formatSpecNumber(cap)} g x ${formatSpecNumber(read)} g`;
          strictMemory.strict_filter_capacity_g = cap;
          strictMemory.strict_filter_readability_g = read;
          const exactRows = getExactTechnicalMatches(ownerRows as any[], { capacityG: cap, readabilityG: read });
          const prioritized = prioritizeTechnicalRows(ownerRows as any[], { capacityG: cap, readabilityG: read });
          const sourceRows = exactRows.length ? exactRows : (prioritized.orderedRows.length ? prioritized.orderedRows : ownerRows);
          const options = buildNumberedProductOptions(sourceRows as any[], 8);
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictReply = [
              exactRows.length
                ? `Sí, para ${strictMemory.strict_spec_query} tengo coincidencias exactas.`
                : `Para ${strictMemory.strict_spec_query} no veo coincidencia exacta, pero sí opciones cercanas:`,
              ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
              "",
              "Responde con letra o número (A/1), o escribe 'más'.",
            ].join("\n");
          } else {
            strictMemory.awaiting_action = "strict_need_spec";
            strictReply = "No encontré coincidencias para esa capacidad/resolución en el catálogo activo. Si quieres, te muestro alternativas cercanas.";
          }
        }
      }

      if (!String(strictReply || "").trim() && isCorrectionIntentApp(text, normalizeText) && awaiting !== "strict_choose_action") {
        resetStrictRecommendationStateApp(strictMemory);
        const cap = Number(previousMemory?.strict_filter_capacity_g || 0);
        const read = Number(previousMemory?.strict_filter_readability_g || 0);
        if (cap > 0 && read > 0) {
          strictMemory.strict_filter_capacity_g = cap;
          strictMemory.strict_filter_readability_g = read;
          strictMemory.strict_spec_query = `${formatSpecNumber(cap)} g x ${formatSpecNumber(read)} g`;
          const exactRows = getExactTechnicalMatches(ownerRows as any[], { capacityG: cap, readabilityG: read });
          const options = buildNumberedProductOptions((exactRows.length ? exactRows : ownerRows) as any[], 8);
          strictMemory.pending_product_options = options;
          strictMemory.awaiting_action = "strict_choose_model";
          strictReply = exactRows.length
            ? [
                `Entendí mal, corrijo. Buscas ${strictMemory.strict_spec_query}.`,
                "Te muestro solo coincidencias exactas:",
                ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                "",
                "Responde con letra o número (A/1).",
              ].join("\n")
            : `Entendí mal, corrijo. No tengo coincidencia exacta para ${strictMemory.strict_spec_query}. Si quieres, te muestro opciones cercanas.`;
        } else {
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = "Entendí mal, corrijo. Envíame capacidad y resolución exacta en formato 200 g x 0.001 g y te muestro solo opciones correctas.";
        }
      }

      const askMoreOptionsNow =
        !wantsQuote &&
        !wantsSheet &&
        /\b(mas|más|opciones|alternativas|otros|otras|rango|que\s+tienes|tienes\s+mas|tienes\s+m[aá]s|retomar|reanudar|continuar)\b/.test(textNorm);
      if (!String(strictReply || "").trim() && awaiting === "strict_choose_action" && askMoreOptionsNow) {
        const moreOptionsFlow = handleStrictAskMoreOptions({
          strictReply,
          text,
          previousMemory,
          strictMemory,
          rememberedCategory,
          ownerRows: ownerRows as any[],
          scopeCatalogRows,
          normalizeText,
          familyLabelFromRow,
          buildNumberedProductOptions,
          intro: "Claro, te muestro más opciones disponibles:",
        });
        if (moreOptionsFlow.handled) strictReply = moreOptionsFlow.strictReply;
      }

      let selectedProduct: any = null;
      const modelTokenHint = extractModelLikeTokens(text);
      const looksLikeModelCode = modelTokenHint.some((tk) => isLikelyModelCodeToken(tk));
      if (!String(strictReply || "").trim() && explicitModel && looksLikeModelCode && !technicalSpecIntent) {
        selectedProduct = findExactModelProduct(text, ownerRows as any[]) || pickBestCatalogProduct(text, ownerRows as any[]);
      }

      const directTechnicalSpec = preParsedSpec;
      if (!String(strictReply || "").trim() && directTechnicalSpec) {
        strictMemory.strict_spec_query = text;
        strictMemory.strict_filter_capacity_g = Number(directTechnicalSpec.capacityG || 0);
        strictMemory.strict_filter_readability_g = Number(directTechnicalSpec.readabilityG || 0);
        selectedProduct = null;
        const exactRows = getExactTechnicalMatches(ownerRows as any[], {
          capacityG: directTechnicalSpec.capacityG,
          readabilityG: directTechnicalSpec.readabilityG,
        });
        const prioritized = prioritizeTechnicalRows(ownerRows as any[], {
          capacityG: directTechnicalSpec.capacityG,
          readabilityG: directTechnicalSpec.readabilityG,
        });
        const sourceRows = exactRows.length ? exactRows : (prioritized.orderedRows.length ? prioritized.orderedRows : ownerRows);
        const options = buildNumberedProductOptions(sourceRows as any[], 8);
        if (options.length) {
          strictMemory.pending_product_options = options;
          strictMemory.pending_family_options = [];
          strictMemory.awaiting_action = "strict_choose_model";
          strictMemory.strict_model_offset = 0;
          const top = options.slice(0, 3);
          const exactLabel = exactRows.length > 0
            ? `Sí, para ${text.trim()} encontré ${exactRows.length} referencia(s) que coinciden exactamente con esa especificación.`
            : `Sí, para ${text.trim()} no veo coincidencia exacta, pero sí alternativas muy cercanas en catálogo.`;
          strictReply = [
            exactLabel,
            "Te comparto la coincidencia solicitada y alternativas cercanas:",
            ...top.map((o, idx) => `${o.code}) ${o.name}${idx === 0 ? " (recomendada para iniciar)" : ""}`),
            "",
            "Si quieres ver más referencias, escribe 'más'. También puedes responder con letra o número (A/1) y te envío ficha o cotización.",
          ].join("\n");
        } else {
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = "No encontré una coincidencia exacta para esa capacidad/resolución. ¿Quieres que busquemos con una resolución cercana?";
        }
      }

      if (!String(strictReply || "").trim() && technicalSpecIntent && !directTechnicalSpec) {
        const loose = parseLooseTechnicalHint(text);
        const cap = Number(loose?.capacityG || 0);
        const read = Number(loose?.readabilityG || 0);
        if (cap > 0 && read > 0) {
          strictMemory.strict_spec_query = `${formatSpecNumber(cap)} g x ${formatSpecNumber(read)} g`;
          strictMemory.strict_filter_capacity_g = cap;
          strictMemory.strict_filter_readability_g = read;
          selectedProduct = null;
          const exactRows = getExactTechnicalMatches(ownerRows as any[], { capacityG: cap, readabilityG: read });
          const prioritized = prioritizeTechnicalRows(ownerRows as any[], { capacityG: cap, readabilityG: read });
          const sourceRows = exactRows.length ? exactRows : (prioritized.orderedRows.length ? prioritized.orderedRows : ownerRows);
          const options = buildNumberedProductOptions(sourceRows as any[], 8);
          strictMemory.pending_product_options = options;
          strictMemory.pending_family_options = [];
          strictMemory.awaiting_action = "strict_choose_model";
          strictMemory.strict_model_offset = 0;
          strictReply = options.length
            ? [
                exactRows.length
                  ? `Sí, tengo coincidencias exactas para ${strictMemory.strict_spec_query}.`
                  : `No encontré coincidencia exacta para ${strictMemory.strict_spec_query}, pero sí opciones cercanas:`,
                ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                "",
                "Responde con letra o número (A/1), o escribe 'más'.",
              ].join("\n")
            : "No encontré productos compatibles con ese criterio técnico en este momento.";
        } else {
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = "Entendido. Para no equivocarme, confirma capacidad y resolución en formato 200 g x 0.001 g.";
        }
      }

      strictReply = applyStrictAffirmativeReentry({
        strictReply,
        awaiting,
        text,
        previousMemory,
        strictMemory,
        isAffirmativeShortIntent,
      });

      const askMoreFromAction =
        awaiting === "strict_choose_action" &&
        !wantsQuote &&
        !wantsSheet &&
        (/\b(mas|más|opciones|alternativas|otros|otras|rango|que\s+tienes|de\s+\d+)/.test(textNorm) || technicalSpecIntent);
      if (!String(strictReply || "").trim() && askMoreFromAction) {
        const moreActionOptionsFlow = handleStrictAskMoreOptions({
          strictReply,
          text,
          previousMemory,
          strictMemory,
          rememberedCategory,
          ownerRows: ownerRows as any[],
          scopeCatalogRows,
          normalizeText,
          familyLabelFromRow,
          buildNumberedProductOptions,
          includeTechnicalHint: true,
          parseLooseTechnicalHint,
          prioritizeTechnicalRows,
          emptyReply: "No tengo más modelos en ese grupo con ese criterio. Si quieres, dime capacidad y resolución (ej.: 4200 g x 0.01 g) y te busco la mejor alternativa.",
        });
        if (moreActionOptionsFlow.handled) strictReply = moreActionOptionsFlow.strictReply;
      }

      selectedProduct = resolveSelectedProductForActionContext({
        selectedProduct,
        awaiting,
        text,
        textNorm,
        wantsQuote,
        wantsSheet,
        previousMemory,
        strictMemory,
        ownerRows: ownerRows as any[],
        isConversationFollowupAmbiguousQuote,
        resolvePendingProductOptionStrict: resolvePendingProductOptionStrictApp,
        findCatalogProductByName,
      });

      const { toCandidates, jidCandidates } = buildStrictDeliveryCandidates({
        agentPhone,
        inboundFrom: inbound.from,
        inboundFromIsLid: inbound.fromIsLid,
        inboundAlternates: inbound.alternates || [],
        inboundJidCandidates: inbound.jidCandidates || [],
        payloadDestination: String(payload?.destination || ""),
        payloadDataDestination: String(payload?.data?.destination || ""),
        payloadSender: String(payload?.sender || ""),
        payloadDataSender: String(payload?.data?.sender || ""),
        normalizePhone,
      });

      void evolutionService.sendTypingPresenceBatch(outboundInstance, [
        ...toCandidates,
        ...jidCandidates,
        String(inbound.from || ""),
      ]);

      const sendTextAndDocs = async (replyText: string, docs: Array<{ base64: string; fileName: string; mimetype: string; caption?: string }>) => {
        return sendStrictTextAndDocsApp({
          replyText,
          inboundText: text,
          outboundInstance,
          toCandidates,
          jidCandidates,
          withAvaSignature,
          enforceWhatsAppDelivery,
          sendMessage: (instance, to, msg) => evolutionService.sendMessage(instance, to, msg),
          sendMessageToJid: (instance, jid, msg) => evolutionService.sendMessageToJid(instance, jid, msg),
          sendDocument: (instance, to, doc) => evolutionService.sendDocument(instance, to, doc),
          safeFileName,
          docs,
        });
      };

      const mutedUntilIso = String(previousMemory?.offtopic_muted_until || "").trim();
      const mutedUntilMs = Date.parse(mutedUntilIso);
      if (Number.isFinite(mutedUntilMs) && mutedUntilMs > Date.now()) {
        strictMemory.offtopic_muted_until = mutedUntilIso;
        strictMemory.offtopic_count = Math.max(3, Number(previousMemory?.offtopic_count || 3));
        try {
          await syncCrmLifecycleAndMeeting({
            memory: strictMemory,
            previous: previousMemory,
            source: "evolution_strict_webhook",
            externalRefSuffix: "muted",
          });

          await persistCurrentTurn("", strictMemory);
        } catch {}
        await markIncomingMessageProcessed(supabase as any, incomingDedupKey);
        return NextResponse.json({ ok: true, ignored: true, reason: "muted_offtopic" });
      }

      // Hard guardrail: never answer outside OHAUS scope.
      if (!String(strictReply || "").trim()) {
        strictReply = applyStrictOfftopicGuardrail({
          textNorm,
          awaiting,
          explicitModel,
          categoryIntent,
          technicalSpecIntent,
          wantsQuote,
          wantsSheet,
          isGreeting,
          isOptionOnlyReply: (value: string) => isOptionOnlyReplyApp(value, normalizeText),
          text,
          previousMemory,
          strictMemory,
        }).strictReply;
      }

      strictReply = applyStrictGreetingGate({
        strictReply,
        isGreeting,
        explicitModel,
        categoryIntent,
        wantsQuote,
        wantsSheet,
        previousMemory,
        strictMemory,
        recognizedReturningCustomer,
        existingTranscriptLength: Array.isArray(existingConv?.transcript) ? existingConv.transcript.length : 0,
        knownCustomerName,
        buildGreetingReply: (name: string, memory: any) => buildGreetingReplyApp({ knownCustomerName: name, memory, shouldUseFullGreeting: shouldUseFullGreetingApp }),
        buildCommercialWelcomeMessage,
      });

      if (!String(strictReply || "").trim() && awaiting === "strict_need_spec") {
        strictReply = applyStrictNeedSpecFlow({
          strictReply,
          awaiting,
          text,
          textNorm,
          previousMemory,
          strictMemory,
          ownerRows,
          baseScoped,
          rememberedCategory,
          parseLooseTechnicalHint,
          parseCapacityRangeHint,
          isExplicitFamilyMenuAsk,
          mergeLooseSpecWithMemory,
          detectGuidedBalanzaProfile,
          detectIndustrialGuidedMode,
          buildGuidedPendingOptions,
          buildGuidedBalanzaReplyWithMode,
          parseDimensionHint,
          formatDimensionTripletMm,
          rankCatalogByDimensions,
          buildNumberedProductOptions,
          prioritizeTechnicalRows,
          filterReasonableTechnicalRows,
          filterNearbyTechnicalRows,
          formatSpecNumber,
          filterRowsByCapacityRange,
          isBasculaAvailabilityAsk,
          scopeStrictBasculaRows,
          normalizeText,
          detectCatalogCategoryIntent,
          scopeCatalogRows,
          isLargestCapacityAsk: (value: string) => isLargestCapacityAskApp(value, normalizeText),
          buildLargestCapacitySuggestion,
          rankCatalogByCapacityOnly,
          buildPriceRangeLine,
          getExactTechnicalMatches,
        });
      } else if (!String(strictReply || "").trim() && awaiting === "strict_need_industry") {
        strictReply = applyStrictNeedIndustryFlow({
          strictReply,
          awaiting,
          text,
          strictMemory,
          prevSpecQuery,
          baseScoped: baseScoped as any[],
          parseTechnicalSpecQuery,
          rankCatalogByTechnicalSpec,
          buildNumberedProductOptions,
        });
      } else if (!String(strictReply || "").trim() && awaiting === "strict_confirm_quote_after_missing_sheet") {
        const confirmQuoteAfterMissingSheet = handleStrictConfirmQuoteAfterMissingSheet({
          strictReply,
          awaiting,
          text,
          textNorm,
          previousMemory,
          strictMemory,
          isAffirmativeShortIntent,
          isNegativeShortIntent,
          extractQuoteRequestedQuantity: (value: string) => extractQuoteRequestedQuantityApp({ text: value, normalizeText, parseTechnicalSpecQuery }),
          buildQuoteDataIntakePrompt: (prefix: string, memory: any) => buildQuoteDataIntakePromptApp(prefix, getReusableBillingData(memory)),
        });
        if (confirmQuoteAfterMissingSheet.handled) {
          strictReply = confirmQuoteAfterMissingSheet.strictReply;
        }
      } else if (!String(strictReply || "").trim() && selectedProduct) {
        const selectedProductFlow = await handleStrictSelectedProductActionFlow({
          strictReply,
          strictBypassAutoQuote,
          selectedProduct,
          awaiting,
          wantsQuote,
          wantsSheet,
          text,
          textNorm,
          inbound,
          nextMemory,
          strictMemory,
          previousMemory,
          rememberedCategory,
          ownerRows: ownerRows as any[],
          baseScoped: baseScoped as any[],
          strictDocs,
          apiKey,
          MAX_WHATSAPP_DOC_BYTES,
          normalizeText,
          normalizePhone,
          parseAnotherQuoteChoice: (value: string) => parseAnotherQuoteChoiceApp(value, normalizeText),
          detectAlternativeFollowupIntent,
          isAnotherQuoteAmbiguousIntent,
          parseLooseTechnicalHint,
          detectCatalogCategoryIntent,
          detectTargetApplication,
          isAlternativeRejectionIntent,
          buildGuidedNeedReframePrompt,
          applyChooseActionCategoryAndQuoteChoices,
          buildAnotherQuotePrompt: buildAnotherQuotePromptApp,
          buildAdvisorMiniAgendaPrompt: () => buildAdvisorMiniAgendaPromptApp(MARIANA_ESCALATION_LINK),
          buildQuoteDataIntakePrompt: (prefix: string, memory: any) => buildQuoteDataIntakePromptApp(prefix, getReusableBillingData(memory)),
          buildNoActiveCatalogEscalationMessage,
          extractQuoteRequestedQuantity: (value: string) => extractQuoteRequestedQuantityApp({ text: value, normalizeText, parseTechnicalSpecQuery }),
          maxReadabilityForApplication,
          formatSpecNumber,
          extractRowTechnicalSpec,
          scopeCatalogRows,
          buildNumberedProductOptions,
          buildNumberedFamilyOptions: (rows: any[], maxItems = 8) => buildNumberedFamilyOptionsApp(rows, normalizeText, maxItems),
          applyChooseActionTechnicalHint,
          isLargestCapacityAsk: (value: string) => isLargestCapacityAskApp(value, normalizeText),
          buildLargestCapacitySuggestion,
          buildPriceRangeLine,
          mergeLooseSpecWithMemory,
          getExactTechnicalMatches,
          prioritizeTechnicalRows,
          applyChooseActionFollowupIntent,
          familyLabelFromRow,
          applyChooseActionUseCaseAndBudgetFollowup,
          isUseCaseApplicabilityIntent,
          isBudgetVisibilityFollowup: (value: string) => isBudgetVisibilityFollowupApp(value, normalizeText),
          buildTechnicalSummary,
          asksQuoteIntent,
          isSameQuoteContinuationIntent,
          extractModelLikeTokens,
          isFlowChangeWithoutModelDetailsIntent,
          getReusableBillingData,
          handleStrictDatasheetRequest,
          extractBundleOptionIndexes: extractBundleOptionIndexesApp,
          findCatalogProductByName,
          pickBestProductPdfUrl,
          pickBestLocalPdfPath,
          fetchRemoteFileAsBase64,
          fetchLocalFileAsBase64: fetchLocalFileAsBase64App,
          safeFileName,
          resolveStrictChooseActionFallbackReply,
          buildStrictConversationalReply: (args: any) => buildStrictConversationalReplyApp({ ...args, normalizeText, isOutOfCatalogDomainQuery }),
          isOutOfCatalogDomainQuery,
        });
        if (selectedProductFlow.handled) {
          strictReply = selectedProductFlow.strictReply;
          strictBypassAutoQuote = selectedProductFlow.strictBypassAutoQuote;
        }
      }
      if (!String(strictReply || "").trim()) {
        const quoteFlowResult = await runStrictQuoteDataFlow({
          strictReply,
          strictBypassAutoQuote,
          awaiting,
          text,
          strictMemory,
          previousMemory,
          ownerRows: ownerRows as any[],
          rememberedCategory,
          normalizeText,
          scopeCatalogRows,
          buildNumberedProductOptions,
          familyLabelFromRow,
          formatMoney: formatMoneyApp,
          detectAlternativeFollowupIntent,
          isAnotherQuoteAmbiguousIntent,
          getReusableBillingData,
          looksLikeBillingData: (value: string) => looksLikeBillingDataApp({ text: value, isContactInfoBundle: (text: string) => isContactInfoBundleApp({ text, extractEmail, extractCustomerPhone }), extractEmail, extractCustomerPhone }),
          isAffirmativeShortIntent,
          isQuoteProceedIntent,
          isQuoteResumeIntent,
          isContinueQuoteWithoutPersonalDataIntent: () => false,
          asksQuoteIntent,
          billingDataAsSingleMessage: billingDataAsSingleMessageApp,
          buildAnotherQuotePrompt: buildAnotherQuotePromptApp,
          inbound,
          recognizedReturningCustomer,
          knownCustomerName,
          strictDocs,
          supabase,
          ownerId,
          tenantId: (agent as any)?.tenant_id || null,
          normalizePhone,
          phoneTail10,
          normalizeCityLabel,
          extractLabeledValue,
          extractCustomerName,
          extractEmail,
          extractCustomerPhone,
          sanitizeCustomerDisplayName,
          findCatalogProductByName,
          getOrFetchTrm,
          buildQuoteItemDescription,
          resolveProductImageDataUrl,
          isQuoteDraftStatusConstraintError,
          buildQuotePdf,
          safeFileName,
          buildQuotePdfFromDraft,
          pickBestProductPdfUrl,
          pickBestLocalPdfPath,
          fetchRemoteFileAsBase64,
          fetchLocalFileAsBase64: fetchLocalFileAsBase64App,
          MAX_WHATSAPP_DOC_BYTES,
          pickYoutubeVideoForModel,
          isoAfterHours: isoAfterHoursApp,
        });
        if (quoteFlowResult.handled) {
          strictReply = String(quoteFlowResult.strictReply || strictReply || "");
          strictBypassAutoQuote = Boolean(quoteFlowResult.strictBypassAutoQuote);
        }
      } else if (!String(strictReply || "").trim() && awaiting === "strict_catalog_scope_disambiguation") {
        const scopeResult = handleStrictCatalogScopeDisambiguation({
          strictReply,
          awaiting,
          text,
          ownerRows: ownerRows as any[],
          previousMemory,
          strictMemory,
          normalizeText,
          buildNumberedFamilyOptions: (rows: any[], maxItems = 8) => buildNumberedFamilyOptionsApp(rows, normalizeText, maxItems),
          dedupeOptionSpecSegments: (value: string) => dedupeOptionSpecSegmentsApp(value, normalizeText),
        });
        if (scopeResult.handled) strictReply = scopeResult.strictReply;
      } else if (!String(strictReply || "").trim() && awaiting === "strict_choose_model") {
        const chooseModelFlow = await handleStrictChooseModelFlow({
          strictReply,
          strictBypassAutoQuote,
          awaiting,
          previousMemory,
          strictMemory,
          text,
          textNorm,
          ownerRows: ownerRows as any[],
          rememberedCategory,
          dedupeOptionSpecSegments: (value: string) => dedupeOptionSpecSegmentsApp(value, normalizeText),
          resolvePendingProductOptionStrict: resolvePendingProductOptionStrictApp,
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
          buildStrictConversationalReply: (args: any) => buildStrictConversationalReplyApp({ ...args, normalizeText, isOutOfCatalogDomainQuery }),
          apiKey,
          buildNumberedFamilyOptions: (rows: any[], maxItems = 8) => buildNumberedFamilyOptionsApp(rows, normalizeText, maxItems),
          resolvePendingFamilyOption: (value: string, optionsRaw: any) => resolvePendingFamilyOptionApp(value, optionsRaw, normalizeText),
          familyLabelFromRow,
          getRowCapacityG,
          getRowReadabilityG,
          formatSpecNumber,
          formatMoney: formatMoneyApp,
          buildNoActiveCatalogEscalationMessage,
          hasActiveTechnicalRequirement: hasActiveTechnicalRequirementApp,
          asksQuoteIntent,
          extractBundleOptionIndexes: extractBundleOptionIndexesApp,
          extractBundleSelectionFromCountCommand,
          pickBundleOptionSourceByIndexes: pickBundleOptionSourceByIndexesApp,
          inbound,
          isCorrectionIntent,
          prioritizeTechnicalRows,
          filterRowsByCapacityRange,
        });
        if (chooseModelFlow.handled) {
          strictReply = chooseModelFlow.strictReply;
          strictBypassAutoQuote = Boolean(chooseModelFlow.strictBypassAutoQuote);
        } else {
          strictMemory.awaiting_action = "strict_choose_model";
          strictReply = "Elige una opción del listado con letra o número (A/1), o escribe 'más'.";
        }
      } else if (!String(strictReply || "").trim() && awaiting === "strict_choose_family") {
        const familyPrimaryResult = handleStrictChooseFamilyPrimary({
          strictReply,
          awaiting,
          text,
          textNorm,
          previousMemory,
          strictMemory,
          ownerRows: ownerRows as any[],
          rememberedCategory,
          normalizeText,
          isExplicitFamilyMenuAsk,
          extractFeatureTerms,
          detectCatalogCategoryIntent,
          scopeCatalogRows,
          buildNumberedProductOptions,
          buildNumberedFamilyOptions: (rows: any[], maxItems = 8) => buildNumberedFamilyOptionsApp(rows, normalizeText, maxItems),
          rankCatalogByFeature,
          familyLabelFromRow,
          formatMoney: formatMoneyApp,
          buildNoActiveCatalogEscalationMessage,
          isOptionOnlyReply: (value: string) => isOptionOnlyReplyApp(value, normalizeText),
        });
        if (familyPrimaryResult.handled) strictReply = familyPrimaryResult.strictReply;

        if (!String(strictReply || "").trim()) {
          const familyTechnicalResult = await handleStrictChooseFamilyTechnical({
            strictReply,
            awaiting,
            text,
            textNorm,
            previousMemory,
            strictMemory,
            ownerRows: ownerRows as any[],
            baseScoped: baseScoped as any[],
            pendingFamilies: pendingFamilies as any[],
            rememberedCategory,
            preParsedSpec,
            formatSpecNumber,
            getExactTechnicalMatches,
            prioritizeTechnicalRows,
            parseLooseTechnicalHint,
            mergeLooseSpecWithMemory,
            isLargestCapacityAsk: (value: string) => isLargestCapacityAskApp(value, normalizeText),
            buildLargestCapacitySuggestion,
            buildPriceRangeLine,
            buildNumberedProductOptions,
            resolvePendingFamilyOption: (value: string, optionsRaw: any) => resolvePendingFamilyOptionApp(value, optionsRaw, normalizeText),
            isRecommendationIntent,
            isUseCaseApplicabilityIntent,
            isUseCaseFamilyHint,
            inferFamilyFromUseCase,
            detectAlternativeFollowupIntent,
            familyLabelFromRow,
            rankCatalogByCapacityOnly,
            rankCatalogByReadabilityOnly,
            buildStrictConversationalReply: (args: any) => buildStrictConversationalReplyApp({ ...args, normalizeText, isOutOfCatalogDomainQuery }),
            apiKey,
            buildGuidedRecoveryMessage: (args) => buildGuidedRecoveryMessageApp({ ...args, normalizeText }),
            normalizeText,
            parseCapacityRangeHint,
            getRowCapacityG,
            filterRowsByCapacityRange,
            detectTargetApplication,
            applyApplicationProfile,
            buildNumberedFamilyOptions: (rows: any[], maxItems = 8) => buildNumberedFamilyOptionsApp(rows, normalizeText, maxItems),
          });
          if (familyTechnicalResult.handled) strictReply = familyTechnicalResult.strictReply;
        }
      } else if (!String(strictReply || "").trim() && wantsQuote && !selectedProduct && !explicitModel) {
        strictMemory.awaiting_action = "strict_need_spec";
        strictMemory.pending_product_options = [];
        strictMemory.pending_family_options = [];
        strictReply = "Claro. Para cotizarte bien, dime capacidad y resolución (ej.: 2 kg x 0.01 g).";
      } else if (!String(strictReply || "").trim() && !selectedProduct && technicalSpecIntent) {
        const parsed = parseTechnicalSpecQuery(text);
        if (!parsed) {
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = "Te entendí como consulta técnica. Para responder exacto, envíame capacidad y resolución en formato 220 g x 0.0001 g.";
        } else {
          strictMemory.strict_spec_query = text;
          const ranked = rankCatalogByTechnicalSpec(ownerRows as any[], {
            capacityG: parsed.capacityG,
            readabilityG: parsed.readabilityG,
          });
          const rankedRowsRaw = ranked.length ? ranked.map((r: any) => r.row) : ownerRows;
          const appNow = detectTargetApplication(text);
          const appProfile = String(appNow || strictMemory.target_application || previousMemory?.target_application || "").trim();
          if (appNow) {
            strictMemory.target_application = appNow;
            strictMemory.target_industry = appNow === "joyeria_oro" ? "joyeria" : appNow;
          }
          const rankedRows = applyApplicationProfile(rankedRowsRaw as any[], {
            application: appProfile,
            targetCapacityG: Number(parsed.capacityG || 0),
            targetReadabilityG: Number(parsed.readabilityG || 0),
            allowFallback: false,
          });
          const options = buildNumberedProductOptions(rankedRows as any[], 8);
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictReply = [
              `Sí, tengo opciones para ${text.trim()}.`,
              ...options.slice(0, 6).map((o) => `${o.code}) ${o.name}`),
              "",
              "Responde con letra o número (A/1) y te envío ficha técnica o cotización.",
            ].join("\n");
          } else {
            strictMemory.awaiting_action = "strict_need_spec";
            strictReply = "No encontré coincidencia exacta para esa capacidad/resolución. ¿Quieres que busquemos una resolución cercana?";
          }
        }
      } else if (!String(strictReply || "").trim()) {
        strictReply = applyCategoryInventoryIntentFlow({
          strictReply,
          text,
          categoryIntent,
          strictMemory,
          previousMemory,
          ownerRows: ownerRows as any[],
          isInventoryInfoIntent,
          scopeCatalogRows,
          buildNumberedFamilyOptions: (rows: any[], maxItems = 8) => buildNumberedFamilyOptionsApp(rows, normalizeText, maxItems),
          isRecommendationIntent,
          isUseCaseApplicabilityIntent,
          normalizeText,
          buildNoActiveCatalogEscalationMessage,
          inferFamilyFromUseCase,
          familyLabelFromRow,
          parseLooseTechnicalHint,
          parseCapacityRangeHint,
          getRowCapacityG,
          prioritizeTechnicalRows,
          rankCatalogByCapacityOnly,
          rankCatalogByReadabilityOnly,
          filterRowsByCapacityRange,
          detectTargetApplication,
          applyApplicationProfile,
          buildNumberedProductOptions,
          isGuidedNeedDiscoveryText,
          buildPriceRangeLine,
        });
      }
      if (!String(strictReply || "").trim()) {
        strictReply = applyTechnicalSpecOptionsFlow({
          strictReply,
          text,
          selectedProduct,
          strictMemory,
          ownerRows: ownerRows as any[],
          preParsedSpec,
          formatSpecNumber,
          isTechnicalSpecQuery,
          parseTechnicalSpecQuery,
          rankCatalogByTechnicalSpec,
          getExactTechnicalMatches,
          prioritizeTechnicalRows,
          buildNumberedProductOptions,
          noOptionsReply: "No encontré una coincidencia clara para esa capacidad/resolución. Si quieres, te ayudo a ajustar el criterio.",
        });
      }
      if (!String(strictReply || "").trim()) {
        const asksOptionsNow = /\b(dame|muestrame|mu[eé]strame|quiero|opciones?|alternativas?)\b/.test(textNorm);
        const appNow = detectTargetApplication(text);
        if (asksOptionsNow && appNow) {
          const capTarget = Number(previousMemory?.strict_filter_capacity_g || previousMemory?.target_capacity_g || 0);
          const readTarget = Number(previousMemory?.strict_filter_readability_g || previousMemory?.target_readability_g || 0);
          const categoryScoped = rememberedCategory ? scopeCatalogRows(ownerRows as any, rememberedCategory) : ownerRows;
          const options = getApplicationRecommendedOptions({
            rows: categoryScoped as any[],
            application: appNow,
            capTargetG: capTarget,
            targetReadabilityG: readTarget,
            strictPrecision: /(menos\s+de|maxima\s+precision|maxima\s+precisi[oó]n|alta\s+precision)/.test(textNorm),
            excludeId: String(previousMemory?.last_selected_product_id || previousMemory?.last_product_id || ""),
          });
          if (options.length) {
            strictMemory.target_application = appNow;
            strictMemory.target_industry = appNow === "joyeria_oro" ? "joyeria" : appNow;
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictReply = [
              `Perfecto. Para ${appNow.replace(/_/g, " ")}, estas son opciones activas:`,
              ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
              "",
              "Elige una con letra/número (A/1), o escribe 'más'.",
            ].join("\n");
          }
        }
        if (!String(strictReply || "").trim()) {
        strictReply = buildGuidedRecoveryMessageApp({
          awaiting,
          rememberedProduct: String(previousMemory?.last_selected_product_name || previousMemory?.last_product_name || ""),
          hasPendingFamilies: Array.isArray(previousMemory?.pending_family_options) && previousMemory.pending_family_options.length > 0,
          hasPendingModels: Array.isArray(previousMemory?.pending_product_options) && previousMemory.pending_product_options.length > 0,
          inboundText: text,
          normalizeText,
        });
        }
      }

      if (
        preParsedSpec &&
        /(no te entendi del todo|no pasa nada si hubo un typo|no te preocupes si hubo un error de escritura)/i.test(normalizeText(String(strictReply || "")))
      ) {
        strictReply = applyTechnicalSpecOptionsFlow({
          strictReply: "",
          text,
          selectedProduct,
          strictMemory,
          ownerRows: ownerRows as any[],
          preParsedSpec,
          formatSpecNumber,
          isTechnicalSpecQuery,
          parseTechnicalSpecQuery,
          rankCatalogByTechnicalSpec,
          getExactTechnicalMatches,
          prioritizeTechnicalRows,
          buildNumberedProductOptions,
          noOptionsReply: "No encontré coincidencias para esa capacidad/resolución en el catálogo activo. Si quieres, te muestro alternativas cercanas.",
        });
      }
      const strictFinalizeResult = await finalizeStrictTurnDelivery({ strictReply, strictDocs, strictBypassAutoQuote, strictMemory, previousMemory, awaiting, text, inbound, classifiedIntent, outboundInstance, incomingDedupKey, supabase, appendAdvisorAppointmentPrompt: (value: string) => appendAdvisorAppointmentPromptApp(value, normalizeText), appendQuoteClosurePrompt, isoAfterHours: isoAfterHoursApp, logStrictTransition, buildStrictQuoteFallbackReply, sendTextAndDocs, evolutionService, withAvaSignature, syncCrmLifecycleAndMeeting, persistCurrentTurn, markIncomingMessageProcessed, safeLogPhase1Invariants });
      strictReply = String(strictFinalizeResult.strictReply || strictReply || "");
      if (strictFinalizeResult.handled) {
        if (!String(strictReply || "").trim()) return NextResponse.json({ ok: true, ignored: true, reason: "invalid_destination" });
        return NextResponse.json({ ok: true, sent: true, strict: true });
      }

      // If strict flow rewrote inbound/intents for auto-quote, propagate updated strict memory
      // so downstream router does not read stale previousMemory state.
      Object.assign(nextMemory, strictMemory);
    }

    let awaitingAction = String(nextMemory?.awaiting_action || previousMemory?.awaiting_action || "");
    const originalInboundText = String(inboundTextAtEntry || inbound.text || "").trim();
    const lastUserAtMs = Date.parse(String(previousMemory?.last_user_at || ""));
    const staleStrictState = Number.isFinite(lastUserAtMs)
      && (Date.now() - lastUserAtMs) > 25 * 60 * 1000
      && /^(strict_choose_family|strict_choose_model|strict_quote_data)$/i.test(String(awaitingAction || ""));
    if (staleStrictState && !isOptionOnlyReplyApp(originalInboundText, normalizeText) && !isGlobalCatalogAsk(originalInboundText)) {
      resetStaleStrictSelectionState(nextMemory);
      awaitingAction = "none";
    }
    if (isGlobalCatalogAsk(originalInboundText)) {
      resetMemoryForGlobalCatalogAsk(nextMemory);
      inbound.text = "catalogo completo";
      awaitingAction = "none";
    }
    const explicitModelGlobal = hasConcreteProductHint(originalInboundText) && !isOptionOnlyReplyApp(originalInboundText, normalizeText);
    if (explicitModelGlobal) {
      nextMemory.awaiting_action = "none";
      nextMemory.pending_product_options = [];
      nextMemory.pending_family_options = [];
      nextMemory.last_category_intent = "";

      try {
        const { data: ownerDirectRows } = await supabase
          .from("agent_product_catalog")
          .select("id,name,category,brand,base_price_usd,price_currency,source_payload,product_url,is_active")
          .eq("created_by", ownerId)
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(320);
        const directCommercialRows = (Array.isArray(ownerDirectRows) ? ownerDirectRows : []).filter((r: any) => isCommercialCatalogRow(r));
        const directModel = findExactModelProduct(originalInboundText, directCommercialRows as any[]) || pickBestCatalogProduct(originalInboundText, directCommercialRows as any[]);
        if (directModel?.id) {
          const directName = String((directModel as any)?.name || "").trim();
          nextMemory.last_product_name = directName;
          nextMemory.last_product_id = String((directModel as any)?.id || "").trim();
          nextMemory.last_product_category = String((directModel as any)?.category || "").trim();
          nextMemory.last_selected_product_name = directName;
          nextMemory.last_selected_product_id = String((directModel as any)?.id || "").trim();
          nextMemory.last_selection_at = new Date().toISOString();

          if (isTechnicalSheetIntent(originalInboundText)) {
            inbound.text = `ficha tecnica de ${directName}`;
          } else if (asksQuoteIntent(originalInboundText) || isPriceIntent(originalInboundText)) {
            inbound.text = `cotizar ${directName} ${originalInboundText}`.trim();
            nextMemory.awaiting_action = "quote_product_selection";
          } else {
            reply = [
              `Perfecto, encontré el modelo ${directName}.`,
              "Ahora dime qué deseas con ese modelo:",
              "1) Cotización con TRM y PDF",
              "2) Ficha técnica",
            ].join("\n");
            nextMemory.awaiting_action = "product_action";
            handledByRecommendation = true;
            handledByProductLookup = true;
            billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
          }
        }
      } catch {
        // ignore strict model bootstrap errors and continue with regular flow
      }
    }
    const inboundCategoryIntent = normalizeText(String(detectCatalogCategoryIntent(originalInboundText) || ""));
    const inboundInventoryIntent = Boolean(
      isGlobalCatalogAsk(originalInboundText) ||
      isInventoryInfoIntent(originalInboundText) ||
      isCatalogBreadthQuestion(originalInboundText) ||
      isBalanceTypeQuestion(originalInboundText)
    );
    if (isGlobalCatalogAsk(originalInboundText)) {
      nextMemory.last_category_intent = "";
      nextMemory.strict_family_label = "";
      nextMemory.pending_family_options = [];
      nextMemory.pending_product_options = [];
    }
    const inboundCategoryOrInventoryIntent = Boolean(inboundCategoryIntent) || inboundInventoryIntent;
    const inboundTechnicalSpec = isTechnicalSpecQuery(originalInboundText);
    const interruptsRefineFlow = Boolean(
      inboundCategoryOrInventoryIntent ||
      asksQuoteIntent(originalInboundText) ||
      isPriceIntent(originalInboundText) ||
      isTechnicalSheetIntent(originalInboundText) ||
      isProductImageIntent(originalInboundText) ||
      isGreetingIntentApp(originalInboundText, normalizeText)
    );
    if (inboundTechnicalSpec) {
      nextMemory.awaiting_action = "none";
      nextMemory.pending_product_options = [];
    }
    if ((awaitingAction === "technical_refine_prompt" || awaitingAction === "technical_refine_choice") && interruptsRefineFlow) {
      nextMemory.awaiting_action = "none";
    }

    if (!handledByGreeting && awaitingAction === "technical_refine_prompt") {
      const tRefine = normalizeText(originalInboundText);
      const directRefineChoice = /^(1|2|3|4|a|b|c|d)\b/.test(tRefine) || /mayor capacidad|menor capacidad|mejor resolucion|resolucion mas flexible|mas flexible/.test(tRefine);
      if (directRefineChoice) {
        nextMemory.awaiting_action = "technical_refine_choice";
      }
      if (isAffirmativeIntentApp(tRefine, normalizeText) || directRefineChoice) {
        const lastSpec = String(previousMemory?.last_technical_spec_query || nextMemory?.last_technical_spec_query || "").trim();
        if (!directRefineChoice) {
          reply = lastSpec
            ? `Perfecto. Para afinar, partiendo de "${lastSpec}", dime cuál variable ajustamos: 1) mayor capacidad, 2) menor capacidad, 3) mejor resolución, 4) resolución más flexible.`
            : "Perfecto. Para afinar, dime capacidad y resolución objetivo (ej.: 220g x 0.001g o 320g x 0.0001g).";
          nextMemory.awaiting_action = "technical_refine_choice";
          handledByRecommendation = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
      } else if (!isConversationCloseIntentApp(originalInboundText, normalizeCatalogQueryText)) {
        reply = "Para continuar, responde 'sí' y te doy opciones de ajuste, o escribe una nueva referencia (ej.: 320g x 0.0001).";
        nextMemory.awaiting_action = "technical_refine_prompt";
        handledByRecommendation = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }

    if (!handledByGreeting && String(previousMemory?.awaiting_action || "") === "technical_refine_choice") {
      const tChoice = normalizeText(originalInboundText);
      const lastSpec = String(previousMemory?.last_technical_spec_query || nextMemory?.last_technical_spec_query || "").trim();
      const parsed = parseTechnicalSpecQuery(lastSpec);
      const pickHighCap = /^(1|a)\b/.test(tChoice) || /mayor capacidad|mas capacidad/.test(tChoice);
      const pickLowCap = /^(2|b)\b/.test(tChoice) || /menor capacidad/.test(tChoice);
      const pickBetterRead = /^(3|c)\b/.test(tChoice) || /mejor resolucion/.test(tChoice);
      const pickFlexibleRead = /^(4|d)\b/.test(tChoice) || /resolucion mas flexible|mas flexible/.test(tChoice);

      if (parsed && (pickHighCap || pickLowCap || pickBetterRead || pickFlexibleRead)) {
        let nextCap = parsed.capacityG;
        let nextRead = parsed.readabilityG;
        if (pickHighCap) nextCap = parsed.capacityG * 1.5;
        if (pickLowCap) nextCap = parsed.capacityG * 0.7;
        if (pickBetterRead) nextRead = parsed.readabilityG / 10;
        if (pickFlexibleRead) nextRead = parsed.readabilityG * 10;
        const capText = formatSpecNumber(nextCap);
        const readText = formatSpecNumber(nextRead);
        inbound.text = `Necesitamos ${capText}g x ${readText}`;
        nextMemory.awaiting_action = "none";
      } else if (!isTechnicalSpecQuery(originalInboundText)) {
        reply = "Para afinar la búsqueda, responde 1, 2, 3 o 4 (o escribe capacidad y resolución, ej.: 320g x 0.0001).";
        nextMemory.awaiting_action = "technical_refine_choice";
        handledByRecommendation = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }
    const selectedNameStrict = String(
      nextMemory.last_selected_product_name ||
      previousMemory?.last_selected_product_name ||
      nextMemory.last_product_name ||
      previousMemory?.last_product_name ||
      ""
    ).trim();
    const selectedIdStrict = String(nextMemory.last_selected_product_id || previousMemory?.last_selected_product_id || "").trim();
    const selectedAtStrictMs = Date.parse(String(nextMemory.last_selection_at || previousMemory?.last_selection_at || ""));
    const selectedStrictActive =
      Boolean(selectedNameStrict || selectedIdStrict) &&
      Number.isFinite(selectedAtStrictMs) &&
      (Date.now() - selectedAtStrictMs) <= 30 * 60 * 1000;

    if (!handledByGreeting && selectedStrictActive && !inboundTechnicalSpec && !isConversationCloseIntentApp(originalInboundText, normalizeCatalogQueryText)) {
      const tStrict = normalizeText(originalInboundText);
      const looksLikeTechnicalNumericSpec = /\b\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)?\b\s*[x×]\s*\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)?\b/.test(normalizeCatalogQueryText(originalInboundText));
      const looksLikeCategoryOrInventoryByTypos = /(balanza|balanzas|blanza|blanzas|bascula|basculas|bscula|bsculas|catalogo|inventario|referencias|que\s+tienen|tienen\s+bal)/.test(tStrict);
      const asksCatalogListStrict =
        isCatalogBreadthQuestion(originalInboundText) ||
        isInventoryInfoIntent(originalInboundText) ||
        isBalanceTypeQuestion(originalInboundText) ||
        looksLikeTechnicalNumericSpec ||
        looksLikeCategoryOrInventoryByTypos ||
        /(catalogo|que tipos|que tipo|que manejan|que tienen)/.test(tStrict);
      const explicitOtherModel = hasConcreteProductHint(originalInboundText) && !normalizeText(selectedNameStrict || "").includes(normalizeText(extractModelLikeTokens(originalInboundText).join(" ")));

      if (!asksCatalogListStrict && !explicitOtherModel) {
        const quoteByQtyOnly = hasBareQuantity(tStrict) && /^(quote_|product_action|quote_product_selection)$/.test(String(awaitingAction || ""));
        const wantsQuoteStrict = asksQuoteIntent(tStrict) || isPriceIntent(tStrict) || isQuoteProceedIntent(tStrict) || quoteByQtyOnly;
        const wantsSheetStrict = isTechnicalSheetIntent(tStrict);
        const wantsImageStrict = isProductImageIntent(tStrict);

        if (wantsQuoteStrict) {
          inbound.text = `cotizar ${selectedNameStrict} ${originalInboundText}`.trim();
          nextMemory.awaiting_action = "quote_product_selection";
        } else if (wantsSheetStrict && wantsImageStrict) {
          inbound.text = `ficha tecnica e imagen de ${selectedNameStrict}`;
          nextMemory.awaiting_action = "none";
        } else if (wantsSheetStrict) {
          inbound.text = `ficha tecnica de ${selectedNameStrict}`;
          nextMemory.awaiting_action = "none";
        } else if (wantsImageStrict) {
          inbound.text = `imagen de ${selectedNameStrict}`;
          nextMemory.awaiting_action = "none";
        } else if ((awaitingAction === "product_action" || awaitingAction === "conversation_followup") && isAffirmativeIntentApp(tStrict, normalizeText)) {
          reply = `Perfecto. Para ${selectedNameStrict}, responde 1 para cotización o 2 para ficha técnica.`;
          nextMemory.awaiting_action = "product_action";
          handledByQuoteStarter = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
      }
    }
    if (awaitingAction === "conversation_followup" && isConversationCloseIntentApp(inbound.text, normalizeCatalogQueryText)) {
      const hadQuoteContext = hasQuoteContext(previousMemory);
      reply = buildConversationCloseReply(hadQuoteContext);
      nextMemory.awaiting_action = "none";
      nextMemory.conversation_status = "closed";
      nextMemory.last_intent = "conversation_closed";
      if (hadQuoteContext) nextMemory.quote_feedback_due_at = isoAfterHoursApp(24);
      handledByGreeting = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }
    if (!handledByGreeting && awaitingAction === "conversation_followup" && isAdvisorAppointmentIntentApp(inbound.text, normalizeText)) {
      reply = buildAdvisorMiniAgendaPromptApp(MARIANA_ESCALATION_LINK);
      nextMemory.awaiting_action = "advisor_meeting_slot";
      nextMemory.conversation_status = "open";
      handledByGreeting = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }
      if (!handledByGreeting && awaitingAction === "advisor_meeting_slot") {
        const slot = parseAdvisorMiniAgendaChoiceApp(inbound.text, normalizeText);
        const slotResult = resolveAdvisorMeetingReply({ slot });
        reply = slotResult.reply;
        nextMemory.awaiting_action = slotResult.awaitingAction;
        if (slotResult.advisorMeetingAt) nextMemory.advisor_meeting_at = slotResult.advisorMeetingAt;
        if (slotResult.advisorMeetingLabel) nextMemory.advisor_meeting_label = slotResult.advisorMeetingLabel;
        handledByGreeting = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    if (!handledByGreeting && awaitingAction === "followup_quote_disambiguation") {
      const choice = parseAnotherQuoteChoiceApp(originalInboundText, normalizeText);
      const rememberedProduct = String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || nextMemory.last_product_name || previousMemory?.last_product_name || "").trim();
      if (!choice) {
        reply = buildAnotherQuotePromptApp();
        nextMemory.awaiting_action = "followup_quote_disambiguation";
        nextMemory.last_intent = "followup_quote_disambiguation";
      } else if (choice === "advisor") {
        reply = buildAdvisorMiniAgendaPromptApp(MARIANA_ESCALATION_LINK);
        nextMemory.awaiting_action = "advisor_meeting_slot";
      } else if (choice === "same_model" && rememberedProduct) {
        inbound.text = `cotizar ${rememberedProduct}`.trim();
        nextMemory.awaiting_action = "quote_product_selection";
      } else if (choice === "same_model") {
        reply = "Perfecto. Dime el modelo exacto que quieres recotizar y te ayudo enseguida.";
        nextMemory.awaiting_action = "strict_need_spec";
      } else if (choice === "other_model") {
        reply = "Perfecto. Para cotizar otro modelo, dime capacidad y resolución objetivo (ej.: 200 g x 0.001 g).";
        nextMemory.awaiting_action = "strict_need_spec";
      } else {
        reply = "Perfecto. Para opciones más económicas, dime capacidad/resolución objetivo o el uso y te propongo alternativas.";
        nextMemory.awaiting_action = "strict_need_spec";
      }
      handledByGreeting = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }
    if (!handledByGreeting && awaitingAction === "conversation_followup" && !isConversationCloseIntentApp(inbound.text, normalizeCatalogQueryText)) {
      if (isAnotherQuoteAmbiguousIntentApp(originalInboundText, normalizeText)) {
        reply = buildAnotherQuotePromptApp();
        nextMemory.awaiting_action = "followup_quote_disambiguation";
        nextMemory.last_intent = "followup_quote_disambiguation";
        handledByGreeting = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
      const rememberedProduct = String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || nextMemory.last_product_name || previousMemory?.last_product_name || "").trim();
      if (!handledByGreeting && rememberedProduct) {
        const t = normalizeText(originalInboundText);
        const anotherQuoteChoiceConversation = parseAnotherQuoteChoiceApp(originalInboundText, normalizeText);
        if (anotherQuoteChoiceConversation === "advisor") {
          reply = buildAdvisorMiniAgendaPromptApp(MARIANA_ESCALATION_LINK);
          nextMemory.awaiting_action = "advisor_meeting_slot";
          handledByGreeting = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else if (anotherQuoteChoiceConversation === "other_model") {
          reply = "Perfecto. Para otra cotización de otro modelo, dime capacidad y resolución objetivo (ej.: 200 g x 0.001 g) y te muestro opciones.";
          nextMemory.awaiting_action = "strict_need_spec";
          handledByGreeting = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else if (anotherQuoteChoiceConversation === "cheaper") {
          reply = "Perfecto. Te ayudo con opciones más económicas. Dime capacidad/resolución objetivo o el uso y te propongo alternativas.";
          nextMemory.awaiting_action = "strict_need_spec";
          handledByGreeting = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
        const asksQuoteNow =
          anotherQuoteChoiceConversation === "same_model" ||
          asksQuoteIntent(t) || isPriceIntent(t) || isQuoteProceedIntent(t) || /\b(cotiza|cotizacion|precio)\b/.test(t);
        const asksSheetNow = isTechnicalSheetIntent(t);
        const asksImageNow = isProductImageIntent(t);
        if (!handledByGreeting && asksQuoteNow) {
          inbound.text = `cotizar ${rememberedProduct} ${originalInboundText}`.trim();
          nextMemory.awaiting_action = "quote_product_selection";
        } else if (!handledByGreeting && asksSheetNow && asksImageNow) {
          inbound.text = `ficha tecnica e imagen de ${rememberedProduct}`;
          nextMemory.awaiting_action = "none";
        } else if (!handledByGreeting && asksSheetNow) {
          inbound.text = `ficha tecnica de ${rememberedProduct}`;
          nextMemory.awaiting_action = "none";
        } else if (!handledByGreeting && asksImageNow) {
          inbound.text = `imagen de ${rememberedProduct}`;
          nextMemory.awaiting_action = "none";
        }
      }

      if (!String(reply || "").trim()) {
        reply = appendQuoteClosurePrompt("Con gusto.");
        handledByGreeting = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }
    if (!handledByGreeting && isConversationCloseIntentApp(inbound.text, normalizeCatalogQueryText) && normalizeText(inbound.text).length <= 32) {
      const hadQuoteContext = hasQuoteContext(previousMemory);
      reply = buildConversationCloseReply(hadQuoteContext);
      nextMemory.awaiting_action = "none";
      nextMemory.conversation_status = "closed";
      nextMemory.last_intent = "conversation_closed";
      if (hadQuoteContext) nextMemory.quote_feedback_due_at = isoAfterHoursApp(24);
      handledByGreeting = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }
    if (!knownCustomerName && awaitingAction === "capture_name") {
      const nameFromReply = looksLikeCustomerNameAnswer(inbound.text);
      if (nameFromReply) {
        knownCustomerName = nameFromReply;
        nextMemory.customer_name = nameFromReply;
        nextMemory.awaiting_action = "none";
      }
    }

    if (awaitingAction === "quote_contact_bundle" && (isContactInfoBundleApp({ text: inbound.text, extractEmail, extractCustomerPhone }) || false)) {
      const rememberedForQuote = String(
        nextMemory.last_selected_product_name ||
        previousMemory?.last_selected_product_name ||
        nextMemory.last_product_name ||
        previousMemory?.last_product_name ||
        ""
      ).trim();
      if (rememberedForQuote) {
        inbound.text = `cotizar ${rememberedForQuote} ${originalInboundText}`.trim();
      }
      nextMemory.awaiting_action = "quote_product_selection";
    }

    const quoteBundleOptionsRaw = Array.isArray((previousMemory as any)?.quote_bundle_options)
      ? (previousMemory as any).quote_bundle_options
      : [];
    const pendingProductOptionsRaw = Array.isArray((previousMemory as any)?.pending_product_options)
      ? (previousMemory as any).pending_product_options
      : [];
    const recommendedOptionsRaw = Array.isArray((previousMemory as any)?.last_recommended_options)
      ? (previousMemory as any).last_recommended_options
      : [];
    const pendingProductOptions =
      quoteBundleOptionsRaw.length
        ? quoteBundleOptionsRaw
        : (pendingProductOptionsRaw.length ? pendingProductOptionsRaw : recommendedOptionsRaw);
    const pendingFamilyOptions = Array.isArray((previousMemory as any)?.pending_family_options)
      ? (previousMemory as any).pending_family_options
      : [];
    const selectedPendingFamily = String(previousMemory?.awaiting_action || "") === "family_option_selection"
      ? resolvePendingFamilyOptionApp(originalInboundText, pendingFamilyOptions, normalizeText)
      : null;

    let bundleOverrideApplied = false;
    let ignoredAwaitingActionForBundle = "";
    {
      const inboundTextNorm = normalizeText(originalInboundText);
      const inboundBundleByCount = /\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/.test(inboundTextNorm);
      const inboundBundleAll = asksQuoteIntent(inboundTextNorm) && /\b(todas|todos|todas\s+las|todos\s+los)\b/.test(inboundTextNorm);
      const inboundIntent = String(nextMemory.last_intent || previousMemory?.last_intent || "");
      const continueWithoutData = false;
      const shouldBundleOverride =
        inboundIntent === "quote_bundle_request" ||
        inboundBundleByCount ||
        inboundBundleAll ||
        (continueWithoutData && String(awaitingAction || "") === "strict_quote_data");

      if (shouldBundleOverride) {
        const bundlePool =
          (Array.isArray(previousMemory?.quote_bundle_options) ? previousMemory.quote_bundle_options : [])
            .concat(Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [])
            .concat(Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : []);
        const bundleDedupeMap = new Map<string, any>();
        for (const o of bundlePool) {
          const key = String(o?.raw_name || o?.name || "").trim();
          if (key && !bundleDedupeMap.has(key)) bundleDedupeMap.set(key, o);
        }
        const options = Array.from(bundleDedupeMap.values());
        if (options.length >= 2) {
          const numMap: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 };
          const m = inboundTextNorm.match(/\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/);
          const raw = String(m?.[1] || "").trim();
          const requested = inboundBundleAll
            ? options.length
            : Math.max(2, Number(raw ? (Number(raw) || numMap[raw] || options.length) : options.length));
          const chosen = options.slice(0, Math.max(2, Math.min(requested, options.length)));
          const names = chosen.map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
          if (names.length >= 2) {
            ignoredAwaitingActionForBundle = String(awaitingAction || "");
            inbound.text = `cotizar ${names.join(" ; ")} cantidad 1 para todos`;
            nextMemory.awaiting_action = "quote_bundle_request";
            nextMemory.last_intent = "quote_bundle_request";
            nextMemory.pending_product_options = chosen;
            nextMemory.quote_bundle_options = chosen;
            nextMemory.last_recommended_options = chosen;
            nextMemory.bundle_quote_mode = true;
            nextMemory.bundle_quote_count = names.length;
            nextMemory.last_selected_product_name = "";
            nextMemory.last_selected_product_id = "";
            nextMemory.last_selection_at = "";
            delete (nextMemory as any).tech_product_selection;
            delete (nextMemory as any).pending_technical_selection;
            delete (nextMemory as any).technical_guidance_mode;
            awaitingAction = String(nextMemory.awaiting_action || "");
            bundleOverrideApplied = true;
          }
        }
      }
    }

    if (!handledByGreeting && pendingProductOptions.length >= 2) {
      const bulkText = normalizeText(originalInboundText);
      const continueBundleWithoutData =
        false &&
        String(previousMemory?.last_intent || nextMemory.last_intent || "") === "quote_bundle_request";
      const asksBulkByCount = /\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/.test(bulkText);
      const asksBulkAll = asksQuoteIntent(bulkText) && /\b(todas|todos|todas\s+las|todos\s+los)\b/.test(bulkText);
      if (continueBundleWithoutData || asksBulkByCount || asksBulkAll) {
        const numberWordMap: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 };
        const m = bulkText.match(/\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/);
        const raw = String(m?.[1] || "").trim();
        const requested = continueBundleWithoutData
          ? pendingProductOptions.length
          : asksBulkAll
          ? pendingProductOptions.length
          : Math.max(2, Number(raw ? (Number(raw) || numberWordMap[raw] || 3) : 3));
        const chosen = pendingProductOptions.slice(0, Math.max(2, Math.min(requested, pendingProductOptions.length)));
        const modelNames = chosen.map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
        if (modelNames.length >= 2) {
          inbound.text = continueBundleWithoutData
            ? `cotizar ${modelNames.join(" ; ")} cantidad 1 para todos`
            : `cotizar ${modelNames.join(" ; ")}`;
          nextMemory.awaiting_action = "none";
          nextMemory.pending_product_options = chosen;
          nextMemory.last_intent = "quote_bundle_request";
          nextMemory.bundle_quote_mode = true;
          nextMemory.bundle_quote_count = chosen.length;
          nextMemory.last_selected_product_name = "";
          nextMemory.last_selected_product_id = "";
          nextMemory.last_selection_at = "";
        }
      }
    }

    if (!handledByGreeting && selectedPendingFamily) {
      const rememberedCategory = String(previousMemory?.last_category_intent || nextMemory?.last_category_intent || "").trim();
      const { data: ownerFamilyRows } = await supabase
        .from("agent_product_catalog")
        .select("id,name,category,brand,base_price_usd,source_payload,product_url,is_active")
        .eq("created_by", ownerId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(320);
      const familyRowsCommercial = (Array.isArray(ownerFamilyRows) ? ownerFamilyRows : []).filter((r: any) => isCommercialCatalogRow(r));
      const categoryScoped = rememberedCategory ? scopeCatalogRows(familyRowsCommercial as any, rememberedCategory) : familyRowsCommercial;
      const familyScoped = categoryScoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(String(selectedPendingFamily.key || "")));
      const options = buildNumberedProductOptions(familyScoped as any[], 10);
      const shown = options.slice(0, 8);
      if (options.length) {
        reply = [
          `Perfecto, para la familia ${String(selectedPendingFamily.label || "")} tengo ${options.length} referencia(s).`,
          ...shown.map((o) => `${o.code}) ${o.name}`),
          ...(options.length > shown.length ? ["- y mas referencias disponibles"] : []),
          "",
          "Responde con letra o numero (ej.: A o 1).",
        ].join("\n");
        nextMemory.pending_product_options = options;
        nextMemory.pending_family_options = [];
        nextMemory.last_family_intent = String(selectedPendingFamily.key || "");
        nextMemory.awaiting_action = "product_option_selection";
      } else {
        reply = `No encuentro referencias activas en la familia ${String(selectedPendingFamily.label || "")} dentro de esta base.`;
        nextMemory.pending_family_options = [];
        nextMemory.awaiting_action = "none";
      }
      handledByInventory = true;
      handledByRecommendation = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }
    const menuActionChoiceOnly = /^(1|2|3|4|a|b|c|d)\b/.test(normalizeText(originalInboundText));
    const canResolvePendingOption =
      String(previousMemory?.awaiting_action || "") !== "product_action" ||
      !menuActionChoiceOnly;
    const selectedPendingOption = canResolvePendingOption
      ? resolvePendingProductOption(originalInboundText, pendingProductOptions)
      : null;
    if (selectedPendingOption) {
      const selectedCanonicalName = String((selectedPendingOption as any)?.raw_name || selectedPendingOption.name || "").trim();
      nextMemory.last_product_name = selectedCanonicalName;
      nextMemory.last_product_id = String(selectedPendingOption.id || "");
      nextMemory.last_product_category = String(selectedPendingOption.category || "");
      nextMemory.last_selected_product_name = selectedCanonicalName;
      nextMemory.last_selected_product_id = String(selectedPendingOption.id || "");
      nextMemory.last_selection_at = new Date().toISOString();
      nextMemory.pending_product_selection_code = String(selectedPendingOption.code || "");
      if (!normalizeText(originalInboundText).includes(normalizeText(selectedCanonicalName))) {
        inbound.text = `${originalInboundText} ${selectedCanonicalName}`.trim();
      }
      if (isOptionOnlyReplyApp(originalInboundText, normalizeText)) {
        reply = [
          `Perfecto, seleccionaste ${String(selectedPendingOption.code || "")} - ${String(selectedPendingOption.name || "")}.`,
          "Ahora dime qué deseas con ese modelo:",
          "1) Cotización con TRM y PDF",
          "2) Ficha técnica",
        ].join("\n");
        nextMemory.awaiting_action = "product_action";
        nextMemory.pending_product_options = [];
        handledByQuoteStarter = true;
        handledByProductLookup = true;
        handledByPricing = true;
        handledByRecommendation = true;
        handledByInventory = true;
        handledByTechSheet = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }

    if (!handledByGreeting && String(previousMemory?.awaiting_action || "") === "product_option_selection" && !selectedPendingOption) {
      const optionInterruptIntent = Boolean(
        isConversationCloseIntentApp(originalInboundText, normalizeCatalogQueryText) ||
        inboundTechnicalSpec ||
        inboundCategoryOrInventoryIntent ||
        asksQuoteIntent(originalInboundText) ||
        isPriceIntent(originalInboundText) ||
        isTechnicalSheetIntent(originalInboundText) ||
        isProductImageIntent(originalInboundText) ||
        isContextResetIntent(originalInboundText)
      );
      if (!optionInterruptIntent) {
        const listed = pendingProductOptions
          .slice(0, 6)
          .map((o: any) => `${String(o?.code || "").toUpperCase()}) ${String(o?.name || "").trim()}`)
          .filter(Boolean);
        reply = listed.length
          ? [
              "Para continuar, elige una opcion del listado.",
              ...listed,
              "",
              "Responde con letra o numero (ej.: A o 1).",
            ].join("\n")
          : "Para continuar, responde con la opcion (ej.: A o 1) del modelo que deseas.";
        handledByRecommendation = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }

    if (!handledByGreeting && String(previousMemory?.awaiting_action || "") === "family_option_selection" && !selectedPendingFamily) {
      const looksLikeDirectModel = hasConcreteProductHint(originalInboundText);
      if (looksLikeDirectModel) {
        const rememberedCategory = String(previousMemory?.last_category_intent || nextMemory?.last_category_intent || "").trim();
        const { data: ownerRows } = await supabase
          .from("agent_product_catalog")
          .select("id,name,category,brand,base_price_usd,source_payload,product_url,is_active")
          .eq("created_by", ownerId)
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(320);
        const commercial = (Array.isArray(ownerRows) ? ownerRows : []).filter((r: any) => isCommercialCatalogRow(r));
        const scoped = rememberedCategory ? scopeCatalogRows(commercial as any, rememberedCategory) : commercial;
        const direct = pickBestCatalogProduct(originalInboundText, scoped as any[]) || pickBestCatalogProduct(originalInboundText, commercial as any[]);
        if (direct?.id) {
          const directName = String((direct as any)?.name || "").trim();
          nextMemory.last_product_name = directName;
          nextMemory.last_product_id = String((direct as any)?.id || "").trim();
          nextMemory.last_product_category = String((direct as any)?.category || "").trim();
          nextMemory.last_selected_product_name = directName;
          nextMemory.last_selected_product_id = String((direct as any)?.id || "").trim();
          nextMemory.last_selection_at = new Date().toISOString();
          nextMemory.pending_family_options = [];
          nextMemory.pending_product_options = [];
          nextMemory.awaiting_action = "product_action";
          reply = [
            `Perfecto, encontré el modelo ${directName}.`,
            "Ahora dime qué deseas con ese modelo:",
            "1) Cotización con TRM y PDF",
            "2) Ficha técnica",
          ].join("\n");
          handledByRecommendation = true;
          handledByProductLookup = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
      }
      if (!String(reply || "").trim()) {
        const listed = pendingFamilyOptions
          .slice(0, 8)
          .map((o: any) => `${String(o?.code || "").toUpperCase()}) ${String(o?.label || "").trim()} (${Number(o?.count || 0)})`)
          .filter(Boolean);
        reply = listed.length
          ? [
              "Para continuar, elige una familia del listado.",
              ...listed,
              "",
              "Responde con letra o numero (ej.: A o 1).",
            ].join("\n")
          : "Para continuar, responde con una opcion de familia (ej.: A o 1).";
        handledByRecommendation = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }

    const selectionAtRaw = String(nextMemory.last_selection_at || previousMemory?.last_selection_at || "");
    const selectionAtMs = Date.parse(selectionAtRaw);
    const activeSelectionWindowMs = 30 * 60 * 1000;
    const hasActiveSelectedProduct =
      Boolean(String(nextMemory.last_selected_product_id || previousMemory?.last_selected_product_id || "").trim() || String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || "").trim()) &&
      Number.isFinite(selectionAtMs) &&
      (Date.now() - selectionAtMs) <= activeSelectionWindowMs;

    const bundlePoolForContinue =
      (Array.isArray(previousMemory?.quote_bundle_options) ? previousMemory.quote_bundle_options : [])
        .concat(Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [])
        .concat(Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : []);
    const bundleContinueDedup = new Map<string, any>();
    for (const o of bundlePoolForContinue) {
      const key = String(o?.raw_name || o?.name || "").trim();
      if (key && !bundleContinueDedup.has(key)) bundleContinueDedup.set(key, o);
    }
    const bundleContinueOptions = Array.from(bundleContinueDedup.values());
    const continueWithoutDataGlobal = false && bundleContinueOptions.length >= 2;
    if (continueWithoutDataGlobal) {
      const names = bundleContinueOptions.slice(0, 8).map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
      if (names.length >= 2) {
        inbound.text = `cotizar ${names.join(" ; ")} cantidad 1 para todos`;
        nextMemory.awaiting_action = "none";
        nextMemory.pending_product_options = bundleContinueOptions.slice(0, 8);
        nextMemory.quote_bundle_options = bundleContinueOptions.slice(0, 8);
        nextMemory.last_recommended_options = bundleContinueOptions.slice(0, 8);
        nextMemory.last_intent = "quote_bundle_request";
        nextMemory.bundle_quote_mode = true;
        nextMemory.bundle_quote_count = names.length;
        nextMemory.last_selected_product_name = "";
        nextMemory.last_selected_product_id = "";
        nextMemory.last_selection_at = "";
      }
    }

    if (String(previousMemory?.awaiting_action || "") === "product_action" && hasActiveSelectedProduct && !continueWithoutDataGlobal) {
      const rememberedOptionProduct = String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || nextMemory.last_product_name || previousMemory?.last_product_name || "").trim();
      const optText = normalizeText(originalInboundText);
      if (rememberedOptionProduct) {
        if (inboundTechnicalSpec || inboundCategoryOrInventoryIntent) {
          nextMemory.awaiting_action = "none";
          nextMemory.pending_product_options = [];
        } else {
        const continueWithoutDataOnBundle =
          String(previousMemory?.last_intent || nextMemory.last_intent || "") === "quote_bundle_request" &&
          false;
        if (continueWithoutDataOnBundle) {
          const bundlePool =
            (Array.isArray(previousMemory?.quote_bundle_options) ? previousMemory.quote_bundle_options : [])
              .concat(Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [])
              .concat(Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : []);
          const bundleDedupeMap2 = new Map<string, any>();
          for (const o of bundlePool) {
            const key = String(o?.raw_name || o?.name || "").trim();
            if (key && !bundleDedupeMap2.has(key)) bundleDedupeMap2.set(key, o);
          }
          const chosen = Array.from(bundleDedupeMap2.values()).slice(0, 8);
          const modelNames = chosen.map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
          if (modelNames.length >= 2) {
            inbound.text = `cotizar ${modelNames.join(" ; ")} cantidad 1 para todos`;
            nextMemory.awaiting_action = "none";
            nextMemory.pending_product_options = chosen;
            nextMemory.quote_bundle_options = chosen;
            nextMemory.last_recommended_options = chosen;
            nextMemory.last_intent = "quote_bundle_request";
            nextMemory.bundle_quote_mode = true;
            nextMemory.bundle_quote_count = modelNames.length;
            nextMemory.last_selected_product_name = "";
            nextMemory.last_selected_product_id = "";
            nextMemory.last_selection_at = "";
          }
        } else {
        const numberWordMapBulk: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 };
        const bulkCountMatch = optText.match(/\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/);
        const rawBulkCount = String(bulkCountMatch?.[1] || "").trim();
        const parsedBulkCount = Number(rawBulkCount ? (Number(rawBulkCount) || numberWordMapBulk[rawBulkCount] || 0) : 0);
        const asksBulkQuoteByCount = parsedBulkCount >= 2;
        if (asksBulkQuoteByCount) {
          let bulkPool = Array.isArray(pendingProductOptions) ? pendingProductOptions : [];
          if (bulkPool.length < 2) {
            const { data: ownerRowsRaw } = await supabase
              .from("agent_product_catalog")
              .select("id,name,category,brand,base_price_usd,source_payload,is_active")
              .eq("created_by", ownerId)
              .eq("is_active", true)
              .order("updated_at", { ascending: false })
              .limit(240);
            const ownerRows = (Array.isArray(ownerRowsRaw) ? ownerRowsRaw : []).filter((r: any) => isCommercialCatalogRow(r));
            const rememberedCategory = String(previousMemory?.last_category_intent || "").trim();
            const scoped = rememberedCategory ? scopeCatalogRows(ownerRows as any[], rememberedCategory) : ownerRows;
            const familyLabel = String(previousMemory?.strict_family_label || "").trim();
            const familyScoped = familyLabel
              ? scoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(familyLabel))
              : scoped;
            const rememberedCap = Number(previousMemory?.strict_filter_capacity_g || 0);
            const rememberedRead = Number(previousMemory?.strict_filter_readability_g || 0);
            let rankedRows = familyScoped as any[];
            if (rememberedCap > 0 && rememberedRead > 0) {
              const prioritized = prioritizeTechnicalRows(familyScoped as any[], { capacityG: rememberedCap, readabilityG: rememberedRead });
              if (prioritized.orderedRows.length) rankedRows = prioritized.orderedRows as any[];
            } else if (rememberedCap > 0) {
              const rankedCap = rankCatalogByCapacityOnly(familyScoped as any[], rememberedCap);
              if (rankedCap.length) rankedRows = rankedCap.map((x: any) => x.row);
            }
            bulkPool = buildNumberedProductOptions(rankedRows as any[], 60);
          }
          const chosen = bulkPool.slice(0, Math.max(2, Math.min(parsedBulkCount, bulkPool.length)));
          const modelNames = chosen.map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
          if (modelNames.length >= 2) {
            inbound.text = `cotizar ${modelNames.join(" ; ")}`;
            nextMemory.awaiting_action = "none";
            nextMemory.pending_product_options = chosen;
            nextMemory.last_intent = "quote_bundle_request";
            nextMemory.bundle_quote_mode = true;
            nextMemory.bundle_quote_count = modelNames.length;
            nextMemory.last_selected_product_name = "";
            nextMemory.last_selected_product_id = "";
            nextMemory.last_selection_at = "";
          }
        } else {
        const confirmsDefaultFromOption = isAffirmativeIntentApp(optText, normalizeText) || /^(ok|vale|listo|de una)$/i.test(String(originalInboundText || "").trim());
        const asksQuoteByOption = /^(1|a)\b/.test(optText) || /\b(cotiz|cotizacion|precio|la cotizacion)\b/.test(optText);
        const asksSheetByOption = /^(2|b)\b/.test(optText) || isTechnicalSheetIntent(optText);
        const asksImageByOption = /^(3|c|4|d)\b/.test(optText) || isProductImageIntent(optText) || (isTechnicalSheetIntent(optText) && isProductImageIntent(optText));
        if (asksQuoteByOption || confirmsDefaultFromOption) {
          inbound.text = `cotizar ${rememberedOptionProduct} ${originalInboundText}`.trim();
          nextMemory.awaiting_action = "quote_product_selection";
        } else if (asksSheetByOption) {
          inbound.text = `ficha tecnica de ${rememberedOptionProduct}`;
          nextMemory.awaiting_action = "none";
        } else if (asksImageByOption) {
          inbound.text = `ficha tecnica de ${rememberedOptionProduct}`;
          nextMemory.awaiting_action = "none";
        } else if (hasBareQuantity(optText) || /\b\d{1,5}\b/.test(optText)) {
          inbound.text = `cotizar ${rememberedOptionProduct} ${originalInboundText}`.trim();
          nextMemory.awaiting_action = "quote_product_selection";
        } else if (isCatalogBreadthQuestion(originalInboundText) || isInventoryInfoIntent(originalInboundText)) {
          nextMemory.awaiting_action = "none";
          nextMemory.pending_product_options = [];
        } else {
          reply = `¿Quieres ficha técnica o cotización de ${rememberedOptionProduct}?`;
          nextMemory.awaiting_action = "product_action";
          handledByQuoteStarter = true;
          handledByProductLookup = true;
          handledByPricing = true;
          handledByRecommendation = true;
          handledByInventory = true;
          handledByTechSheet = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
        }
        }
        }
      }
    }

    const countCatalogRows = async (pricedOnly = false): Promise<number> => {
      let ownerQuery = supabase
        .from("agent_product_catalog")
        .select("id", { count: "exact", head: true })
        .eq("created_by", ownerId)
        .eq("is_active", true);
      if (pricedOnly) ownerQuery = ownerQuery.gt("base_price_usd", 0);
      const { count: ownerCount } = await ownerQuery;
      if (Number(ownerCount || 0) > 0 || !tenantId) return Number(ownerCount || 0);

      let tenantQuery = supabase
        .from("agent_product_catalog")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_active", true);
      if (pricedOnly) tenantQuery = tenantQuery.gt("base_price_usd", 0);
      const { count: tenantCount } = await tenantQuery;
      if (Number(tenantCount || 0) > 0) return Number(tenantCount || 0);

      let providerQuery = supabase
        .from("agent_product_catalog")
        .select("id", { count: "exact", head: true })
        .eq("provider", catalogProvider)
        .eq("is_active", true);
      if (pricedOnly) providerQuery = providerQuery.gt("base_price_usd", 0);
      const { count: providerCount } = await providerQuery;
      return Math.max(Number(ownerCount || 0), Number(tenantCount || 0), Number(providerCount || 0));
    };

    const fetchCatalogRows = async (selectCols: string, limitRows: number, pricedOnly = false) => {
      let ownerQuery = supabase
        .from("agent_product_catalog")
        .select(selectCols)
        .eq("created_by", ownerId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(limitRows);
      if (pricedOnly) ownerQuery = ownerQuery.gt("base_price_usd", 0);
      const { data: ownerRows } = await ownerQuery;

      let tenantRows: any[] = [];
      if (tenantId) {
        let tenantQuery = supabase
          .from("agent_product_catalog")
          .select(selectCols)
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(limitRows);
        if (pricedOnly) tenantQuery = tenantQuery.gt("base_price_usd", 0);
        const { data } = await tenantQuery;
        tenantRows = Array.isArray(data) ? data : [];
      }

      let providerQuery = supabase
        .from("agent_product_catalog")
        .select(selectCols)
        .eq("provider", catalogProvider)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(limitRows);
      if (pricedOnly) providerQuery = providerQuery.gt("base_price_usd", 0);
      const { data: providerRows } = await providerQuery;

      const mergedRaw = [
        ...(Array.isArray(ownerRows) ? ownerRows : []),
        ...tenantRows,
        ...(Array.isArray(providerRows) ? providerRows : []),
      ];

      const merged: any[] = [];
      const seen = new Set<string>();
      for (const row of mergedRaw) {
        const key = String((row as any)?.id || (row as any)?.product_url || `${(row as any)?.name || ""}::${(row as any)?.category || ""}`)
          .trim()
          .toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push(row);
        if (merged.length >= limitRows) break;
      }

      return merged.filter((r: any) => isAllowedCatalogRow(r));
    };

    const fetchVariantRowsByCatalog = async (catalogRows: any[]) => {
      const ids = Array.from(
        new Set((catalogRows || []).map((r: any) => String(r?.id || "").trim()).filter(Boolean))
      );
      if (!ids.length) return [] as any[];

      const out: any[] = [];
      const chunkSize = 150;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { data } = await supabase
          .from("agent_product_variants")
          .select("catalog_id,sku,variant_name,range_text,attributes")
          .in("catalog_id", chunk);
        if (Array.isArray(data)) out.push(...data);
      }
      return out;
    };

    const findCatalogByVariant = async (queryText: string, catalogRows: any[], forcedCategory?: string) => {
      const variantRows = await fetchVariantRowsByCatalog(catalogRows);
      return pickCatalogByVariantText(queryText, catalogRows, variantRows, forcedCategory);
    };

    if (isContextResetIntent(inbound.text)) {
      const keepCustomerName = String(nextMemory.customer_name || "").trim();
      const keepCustomerPhone = String(nextMemory.customer_phone || "").trim();
      const keepCustomerEmail = String(nextMemory.customer_email || "").trim();

      Object.keys(nextMemory).forEach((k) => delete nextMemory[k]);
      if (keepCustomerName) nextMemory.customer_name = keepCustomerName;
      if (keepCustomerPhone) nextMemory.customer_phone = keepCustomerPhone;
      if (keepCustomerEmail) nextMemory.customer_email = keepCustomerEmail;
      nextMemory.awaiting_action = "none";
      nextMemory.last_user_text = inbound.text;
      nextMemory.last_user_at = new Date().toISOString();
      nextMemory.last_intent = "reset_context";

      reply = "Listo, reinicié el contexto de esta conversación. Ahora dime el modelo exacto y te respondo solo con datos confirmados de la base de datos.";
      handledByGreeting = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }

    if (!handledByGreeting && isAffirmativeShortIntent(inbound.text)) {
      const awaitingNow = normalizeText(String(previousMemory?.awaiting_action || nextMemory?.awaiting_action || ""));
      const hasPending = Array.isArray(previousMemory?.pending_product_options) && previousMemory.pending_product_options.length > 0;
      const lastIntent = normalizeText(String(previousMemory?.last_intent || ""));
      if (awaitingNow === "none" && !hasPending && /(use_explanation|guided_need_discovery|compatibility_question|application_update)/.test(lastIntent)) {
        nextMemory.awaiting_action = "strict_need_spec";
        reply = buildGuidedNeedReframePrompt();
        handledByGreeting = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }

    if (!handledByGreeting && isGreetingIntentApp(inbound.text, normalizeText)) {
      nextMemory.awaiting_action = "none";
      nextMemory.pending_product_options = [];
      nextMemory.pending_family_options = [];
      nextMemory.strict_model_offset = 0;
      nextMemory.strict_family_label = "";
      reply = buildGreetingReplyApp({ knownCustomerName, memory: nextMemory, shouldUseFullGreeting: shouldUseFullGreetingApp });
      if (!knownCustomerName) nextMemory.awaiting_action = "capture_name";
      handledByGreeting = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }

    if (!handledByGreeting) {
      const entryNeedText = normalizeText(String(originalInboundText || ""));
      const isEntryNeedGuidance = /(quiero|necesito|busco|requiero).*(balanza|balanzas|bascula|basculas|humedad)|para\s+pesar/.test(entryNeedText);
      if (isEntryNeedGuidance) {
        const forcedCategory = detectCatalogCategoryIntent(originalInboundText) || (/humedad|analizador\s+de\s+humedad/.test(entryNeedText) ? "humedad" : "balanzas");
        const rawRows = await fetchCatalogRows("id,name,category,brand,base_price_usd,source_payload,product_url", 220, false);
        const commercialRows = (Array.isArray(rawRows) ? rawRows : []).filter((r: any) => isCommercialCatalogRow(r));
        const scoped = scopeCatalogRows(commercialRows as any, forcedCategory);
        const familyOptions = buildNumberedFamilyOptionsApp(scoped as any[], normalizeText, 8);
        const inferred = inferFamilyFromUseCase(originalInboundText, familyOptions);
        const inferredKey = String((inferred as any)?.key || "").trim();
        const familyRows = inferredKey
          ? scoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(inferredKey))
          : [];
        const options = buildNumberedProductOptions((familyRows.length ? familyRows : scoped) as any[], 8).slice(0, 5);
        reply = [
          inferred
            ? `Entiendo tu necesidad. Para ese uso te recomiendo iniciar con ${String((inferred as any)?.label || "esa familia")}.`
            : "Entiendo tu necesidad y te guío con opciones recomendadas según uso.",
          "Para afinar sin inventar, dime peso mínimo y máximo de la pieza (y peso por unidad si lo tienes).",
          ...(options.length ? ["", "Modelos sugeridos para empezar:", ...options.map((o) => `${o.code}) ${o.name}`)] : []),
          "",
          options.length
            ? "Elige con letra/número (A/1) y te envío ficha o cotización."
            : "Si quieres, te muestro familias disponibles para orientarte mejor.",
        ].join("\n");
        nextMemory.pending_product_options = options;
        nextMemory.pending_family_options = options.length ? [] : familyOptions;
        nextMemory.awaiting_action = options.length ? "product_option_selection" : "family_option_selection";
        nextMemory.last_category_intent = String(forcedCategory || "");
        nextMemory.strict_use_case = String(originalInboundText || "").trim();
        handledByInventory = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }

    if (!handledByGreeting && !handledByInventory && (inboundInventoryIntent || Boolean(inboundCategoryIntent))) {
      try {
        if (inboundCategoryIntent) {
          const categoryRowsRaw = await fetchCatalogRows("id,name,category,brand,base_price_usd,source_payload,product_url", 220, false);
          const categoryRowsCommercial = (Array.isArray(categoryRowsRaw) ? categoryRowsRaw : []).filter((r: any) => isCommercialCatalogRow(r));
          const scoped = scopeCatalogRows(categoryRowsCommercial as any, inboundCategoryIntent);
          const familyOptions = buildNumberedFamilyOptionsApp(scoped as any[], normalizeText, 8);
          const categoryLabel = inboundCategoryIntent.replace(/_/g, " ");
          const needText = normalizeText(`${String(originalInboundText || "")} ${String(inbound.text || "")}`);
          const rawNeedText = String(inbound.text || originalInboundText || "");
          const isGuidedCategory = /balanza|balanzas|bascula|basculas|humedad|analizador de humedad/.test(categoryLabel);
          const hasModelHintNow = hasConcreteProductHint(originalInboundText) || extractModelLikeTokens(originalInboundText).length > 0;
          const asksNeedGuidanceDirect = /(quiero|necesito|busco|requiero|me\s+sirve|cual\s+me\s+sirve|cu[aá]l\s+me\s+sirve|recomiend|orienta).*(balanza|balanzas|bascula|basculas|humedad|analizador\s+de\s+humedad)|para\s+pesar|para\s+usar|para\s+medir/.test(needText);
          const asksNeedGuidanceRaw = /\b(quiero|necesito|busco|requiero|recomiend|orienta)\b/i.test(rawNeedText) || /para\s+pesar/i.test(rawNeedText);
          const useCaseDrivenIntent =
            isRecommendationIntent(originalInboundText) ||
            isUseCaseApplicabilityIntent(originalInboundText) ||
            isUseCaseFamilyHint(originalInboundText) ||
            /(quiero|necesito|busco).*(balanza|balanzas|bascula|basculas|humedad)|para\s+pesar|peso\s+aproximado|tornillo|tornillos|tuerca|tuercas|perno|pernos|pieza|piezas|muestra|muestras/.test(needText);
          const shouldForceNeedGuidance = isGuidedCategory && !hasModelHintNow && (asksNeedGuidanceDirect || asksNeedGuidanceRaw || useCaseDrivenIntent);
          if (shouldForceNeedGuidance && familyOptions.length) {
            const inferred = inferFamilyFromUseCase(originalInboundText, familyOptions);
            const inferredKey = String((inferred as any)?.key || "").trim();
            const familyRows = inferredKey
              ? scoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(inferredKey))
              : [];
            const options = buildNumberedProductOptions((familyRows.length ? familyRows : scoped) as any[], 8).slice(0, 5);
            reply = [
              inferred
                ? `Entiendo tu necesidad. Para ese uso te recomiendo iniciar con ${String((inferred as any)?.label || "esa familia")}.`
                : "Entiendo tu necesidad. Te oriento con opciones recomendadas según uso.",
              "Para afinar sin inventar, dime peso mínimo y máximo de la pieza (y peso por unidad si lo tienes).",
              ...(options.length ? ["", "Modelos sugeridos para empezar:", ...options.map((o) => `${o.code}) ${o.name}`)] : []),
              "",
              options.length
                ? "Elige con letra/número (A/1) y te envío ficha o cotización."
                : "Si prefieres, elige una familia y te doy modelos exactos.",
            ].join("\n");
            nextMemory.pending_product_options = options;
            nextMemory.pending_family_options = options.length ? [] : familyOptions;
            nextMemory.awaiting_action = options.length ? "product_option_selection" : "family_option_selection";
            nextMemory.last_category_intent = inboundCategoryIntent;
            nextMemory.strict_use_case = String(originalInboundText || "").trim();
            handledByInventory = true;
            billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
          } else if (familyOptions.length > 1) {
            const entryNeed = normalizeText(String(originalInboundText || ""));
            const forceNeed = /(quiero|necesito|busco|requiero).*(balanza|balanzas|bascula|basculas|humedad)|para\s+pesar/.test(entryNeed);
            if (forceNeed) {
              const inferred = inferFamilyFromUseCase(originalInboundText, familyOptions);
              const inferredKey = String((inferred as any)?.key || "").trim();
              const familyRows = inferredKey
                ? scoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(inferredKey))
                : [];
              const options = buildNumberedProductOptions((familyRows.length ? familyRows : scoped) as any[], 8).slice(0, 5);
              reply = [
                inferred
                  ? `Entiendo tu necesidad. Para ese uso te recomiendo iniciar con ${String((inferred as any)?.label || "esa familia")}.`
                  : "Entiendo tu necesidad y te guío con opciones recomendadas según uso.",
                "Para afinar sin inventar, dime peso mínimo y máximo de la pieza (y peso por unidad si lo tienes).",
                ...(options.length ? ["", "Modelos sugeridos para empezar:", ...options.map((o) => `${o.code}) ${o.name}`)] : []),
                "",
                options.length
                  ? "Elige con letra/número (A/1) y te envío ficha o cotización."
                  : "Si prefieres, te muestro familias disponibles para orientarte mejor.",
              ].join("\n");
              nextMemory.pending_product_options = options;
              nextMemory.pending_family_options = options.length ? [] : familyOptions;
              nextMemory.awaiting_action = options.length ? "product_option_selection" : "family_option_selection";
              nextMemory.last_category_intent = inboundCategoryIntent;
              nextMemory.strict_use_case = String(originalInboundText || "").trim();
            } else {
              const familyScopedTotal = familyOptions.reduce((acc: number, o: any) => acc + Number(o?.count || 0), 0);
              const priceRangeLine = normalizeText(String(inboundCategoryIntent || "")) === "balanzas" ? buildPriceRangeLine(scoped as any[]) : "";
              reply = [
                `Si, tenemos ${familyScopedTotal || scoped.length} referencias en la categoria ${categoryLabel}.`,
                "Primero elige la familia:",
                ...familyOptions.map((o) => `${o.code}) ${o.label} (${o.count})`),
                "",
                ...(priceRangeLine ? [priceRangeLine] : []),
                "Si quieres, también dime qué vas a pesar y su funcionalidad para identificar cuál se adecúa a tu empresa.",
                "Responde con letra o numero (ej.: A o 1).",
              ].join("\n");
              nextMemory.pending_family_options = familyOptions;
              nextMemory.pending_product_options = [];
              nextMemory.awaiting_action = "family_option_selection";
              nextMemory.last_category_intent = inboundCategoryIntent;
            }
          } else {
            const options = buildNumberedProductOptions(scoped, 10);
            const shown = options.slice(0, 8);
            if (options.length) {
              reply = [
                `Si, tenemos ${options.length} referencias en la categoria ${categoryLabel}.`,
                ...shown.map((o) => `${o.code}) ${o.name}`),
                ...(options.length > shown.length ? ["- y mas referencias disponibles"] : []),
                "",
                "Responde con letra o numero (ej.: A o 1) y te envio ficha tecnica o cotizacion.",
              ].join("\n");
              nextMemory.pending_product_options = options;
              nextMemory.pending_family_options = [];
              nextMemory.awaiting_action = "product_option_selection";
              nextMemory.last_category_intent = inboundCategoryIntent;
            } else {
              reply = `No encuentro referencias activas en la categoria ${categoryLabel} dentro de esta base. Si quieres, te muestro otra categoria disponible.`;
              nextMemory.last_category_intent = inboundCategoryIntent;
            }
          }
        } else {
          const totalActive = await countCatalogRows(false);
          const totalPriced = await countCatalogRows(true);
          const sample = await fetchCatalogRows("name", 5, false);

          const examples = Array.isArray(sample)
            ? sample.map((x: any) => String(x?.name || "").trim()).filter(Boolean)
            : [];
          const top = examples.slice(0, 3);
          reply = [
            `Te comparto el catalogo oficial actualizado de OHAUS Colombia: ${CATALOG_REFERENCE_URL}`,
            "",
            "Categorias principales:",
            ...OFFICIAL_CATALOG_CATEGORIES.map((c) => `- ${c}`),
            "",
            `Catalogo interno para envio rapido por WhatsApp: ${Number(totalActive || 0)} productos activos, ${Number(totalPriced || 0)} con precio base para cotizacion automatica.`,
            ...(top.length ? ["", "Ejemplos disponibles en esta instancia:", ...top.map((x) => `- ${x}`)] : []),
            "",
            "Si quieres, dime categoria y modelo exacto y te envio ficha tecnica o cotizacion por este chat.",
          ].join("\n");
        }
        handledByInventory = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      } catch (invErr: any) {
        console.warn("[evolution-webhook] inventory_info_failed", invErr?.message || invErr);
      }
    }

    if (
      !handledByGreeting &&
      !handledByInventory &&
      !isTechnicalSheetIntent(inbound.text) &&
      !isProductImageIntent(inbound.text) &&
      !shouldAutoQuote(inbound.text) &&
      !isPriceIntent(inbound.text)
    ) {
      const rememberedCategoryIntent = String(previousMemory?.last_category_intent || "").trim();
      const categoryIntent = isGlobalCatalogAsk(inbound.text)
        ? ""
        : detectCatalogCategoryIntent(inbound.text)
        || (isCategoryFollowUpIntent(inbound.text) ? rememberedCategoryIntent : "");
      const featureTerms = extractFeatureTerms(inbound.text);
      const wantsFeatureAnswer = isFeatureQuestionIntent(inbound.text) && featureTerms.length > 0;
      const asksBalanceTypes = isBalanceTypeQuestion(inbound.text);
      if (categoryIntent) {
        const looksLikeConcreteModel = hasConcreteProductHint(inbound.text);
        const shouldSkipCategorySummary =
          looksLikeConcreteModel ||
          asksQuoteIntent(inbound.text) ||
          shouldAutoQuote(inbound.text) ||
          isQuoteProceedIntent(inbound.text) ||
          hasBareQuantity(inbound.text);
        if (shouldSkipCategorySummary) {
          // Do not hijack technical selection with category summary.
        } else {
        try {
          const categoryRows = await fetchCatalogRows("id,name,brand,category,summary,description,specs_text,specs_json,source_payload,product_url", 160, false);
          const allRows = Array.isArray(categoryRows) ? categoryRows : [];
          const filteredRows = categoryIntent === "documentos"
            ? allRows.filter((r: any) => isDocumentCatalogRow(r))
            : allRows.filter((r: any) => isCommercialCatalogRow(r));

          const sameCategory = filteredRows.filter((r: any) => normalizeText(String(r?.category || "")) === normalizeText(categoryIntent));
          const groupedSubcategories = filteredRows.filter((r: any) => catalogSubcategory(r).startsWith(`${normalizeText(categoryIntent)}_`));
          let pool = sameCategory.length ? sameCategory : groupedSubcategories;
          pool = pool.filter((r: any) => passesStrictCategoryGuard(r, categoryIntent));

          if (!pool.length) {
            let providerCategoryQuery = supabase
              .from("agent_product_catalog")
              .select("name,category,source_payload,product_url")
              .eq("provider", catalogProvider)
              .eq("is_active", true)
              .order("updated_at", { ascending: false })
              .limit(200);
            const { data: providerCategoryRows } = await providerCategoryQuery;
            const providerRowsAny: any[] = Array.isArray(providerCategoryRows) ? (providerCategoryRows as any[]) : [];
            const providerFiltered = categoryIntent === "documentos"
              ? providerRowsAny.filter((r: any) => isDocumentCatalogRow(r))
              : providerRowsAny.filter((r: any) => isCommercialCatalogRow(r));
            const providerSameCategory = providerFiltered.filter((r: any) => normalizeText(String(r?.category || "")) === normalizeText(categoryIntent));
            const providerGroupedSubcategories = providerFiltered.filter((r: any) => catalogSubcategory(r).startsWith(`${normalizeText(categoryIntent)}_`));
            pool = providerSameCategory.length ? providerSameCategory : providerGroupedSubcategories;
            pool = pool.filter((r: any) => passesStrictCategoryGuard(r, categoryIntent));
          }

          if (pool.length) {
            const uniqueNames = uniqueNormalizedStrings(
              pool.map((r: any) => humanCatalogName(String(r?.name || "").trim())).filter(Boolean)
            );
            const names = uniqueNames.slice(0, 10);
            const extra = Math.max(0, uniqueNames.length - names.length);
            const categoryLabel = categoryIntent.replace(/_/g, " ");
            nextMemory.last_category_intent = categoryIntent;
            if (asksBalanceTypes && categoryIntent === "balanzas") {
              const subMap = new Map<string, number>();
              for (const r of pool as any[]) {
                const sub = String(catalogSubcategory(r) || "").trim();
                if (!sub) continue;
                subMap.set(sub, Number(subMap.get(sub) || 0) + 1);
              }
              const preferredOrder = [
                "balanzas_analiticas",
                "balanzas_semianaliticas",
                "balanzas_precision",
                "balanzas_joyeria",
                "balanzas_portatiles",
              ];
              const available = preferredOrder
                .map((k) => ({ key: k, count: Number(subMap.get(k) || 0) }))
                .filter((x) => x.count > 0);
              if (available.length) {
                const labels: Record<string, string> = {
                  balanzas_analiticas: "Analíticas",
                  balanzas_semianaliticas: "Semianalíticas",
                  balanzas_precision: "Precisión",
                  balanzas_joyeria: "Joyería",
                  balanzas_portatiles: "Portátiles",
                };
                const lines = available.map((x) => `- ${labels[x.key] || x.key.replace(/^balanzas_/, "").replace(/_/g, " ")} (${x.count})`);
                reply = [
                  `Sí. En balanzas manejo ${available.length} tipo(s) en catálogo:`,
                  ...lines,
                  "",
                  "Si quieres, te filtro por uno y te doy modelos exactos para ficha o cotización.",
                ].join("\n");
              }
            } else if (wantsFeatureAnswer) {
              const rankedByFeature = rankCatalogByFeature(pool as any[], featureTerms).slice(0, 5);
              if (rankedByFeature.length) {
                const top = rankedByFeature.slice(0, 3);
                const topNames = top.map((x) => humanCatalogName(String(x?.row?.name || "").trim())).filter(Boolean);
                const more = Math.max(0, rankedByFeature.length - topNames.length);
                const first = top[0]?.row;
                if (first?.name) {
                  nextMemory.last_product_name = String(first.name || "");
                  nextMemory.last_product_id = String((first as any)?.id || "");
                  nextMemory.last_product_category = String((first as any)?.category || "");
                  nextMemory.last_selected_product_name = String(first.name || "");
                  nextMemory.last_selected_product_id = String((first as any)?.id || "");
                  nextMemory.last_selection_at = new Date().toISOString();
                }
                reply = [
                  `Sí, en ${categoryLabel} tengo ${rankedByFeature.length} referencia(s) que coinciden con esa característica (${featureTerms.join(", ")}). Te muestro ${topNames.length}:`,
                  ...topNames.map((n) => `- ${n}`),
                  ...(more > 0 ? [`- y ${more} más`] : []),
                  "",
                  "Si quieres, te envío ficha técnica o cotización del modelo que elijas por este WhatsApp.",
                ].join("\n");
              } else {
                const crossCategoryMatches = rankCatalogByFeature(filteredRows as any[], featureTerms)
                  .filter((x) => normalizeText(String(x?.row?.category || "")) !== normalizeText(categoryIntent))
                  .slice(0, 4);
                if (crossCategoryMatches.length) {
                  const crossTop = crossCategoryMatches.slice(0, 3);
                  const crossNames = crossTop.map((x) => humanCatalogName(String(x?.row?.name || "").trim())).filter(Boolean);
                  const crossCats = uniqueNormalizedStrings(
                    crossTop.map((x) => String(x?.row?.category || "").trim().replace(/_/g, " ")).filter(Boolean),
                    2
                  );
                  const crossLabel = crossCats.length ? crossCats.join(" / ") : "otra categoría";
                  reply = [
                    `En ${categoryLabel} no encontré coincidencia exacta para (${featureTerms.join(", ")}).`,
                    `Pero sí tengo opciones en ${crossLabel}:`,
                    ...crossNames.map((n) => `- ${n}`),
                    "",
                    "Si quieres, te envío ficha técnica o cotización del modelo que elijas.",
                  ].join("\n");
                } else {
                  reply = [
                    `En ${categoryLabel} no encontré una coincidencia exacta para esa característica (${featureTerms.join(", ")}) en este momento.`,
                    "Opciones cercanas disponibles:",
                    ...names.slice(0, 3).map((n) => `- ${n}`),
                    ...(extra > 0 ? [`- y ${extra} más`] : []),
                    "",
                    "Si me dices la característica exacta (por ejemplo: capacidad, resolución o calibración), te filtro mejor.",
                  ].join("\n");
                }
              }
            } else {
              reply = [
                `Perfecto. En ${categoryLabel} tengo ${pool.length} referencia(s) en catálogo.`,
                ...names.map((n) => `- ${n}`),
                ...(extra > 0 ? [`- y ${extra} más`] : []),
                "",
                `Si quieres ver todo el catálogo oficial: ${CATALOG_REFERENCE_URL}`,
                "Dime un modelo exacto y te envío ficha técnica o cotización por este WhatsApp.",
              ].join("\n");
            }
          } else {
            const { count: providerCategoryCount } = await supabase
              .from("agent_product_catalog")
              .select("id", { count: "exact", head: true })
              .eq("provider", catalogProvider)
              .eq("is_active", true)
              .eq("category", normalizeText(categoryIntent));

            const { data: providerCategoryRowsRaw } = await supabase
              .from("agent_product_catalog")
              .select("name")
              .eq("provider", catalogProvider)
              .eq("is_active", true)
              .eq("category", normalizeText(categoryIntent))
              .order("updated_at", { ascending: false })
              .limit(40);

            const categoryLabel = categoryIntent.replace(/_/g, " ");
            const countNum = Number(providerCategoryCount || 0);
            if (countNum > 0) {
              nextMemory.last_category_intent = categoryIntent;
              const backupNames = uniqueNormalizedStrings(
                (Array.isArray(providerCategoryRowsRaw) ? providerCategoryRowsRaw : [])
                  .map((r: any) => humanCatalogName(String(r?.name || "").trim()))
                  .filter(Boolean),
                8
              );
              if (backupNames.length) {
                const top = backupNames.slice(0, 6);
                const more = Math.max(0, countNum - top.length);
                reply = [
                  `Perfecto. En ${categoryLabel} tengo ${countNum} referencia(s) en catálogo.`,
                  ...top.map((n) => `- ${n}`),
                  ...(more > 0 ? [`- y ${more} más`] : []),
                  "",
                  `Si quieres ver todo el catálogo oficial: ${CATALOG_REFERENCE_URL}`,
                  "Si quieres una en específico, dime el modelo exacto y te envío ficha técnica o cotización por este WhatsApp.",
                ].join("\n");
              } else {
                reply = `Sí tengo ${countNum} referencia(s) en ${categoryLabel} en esta base de datos. Si quieres una en específico, dime el modelo exacto y te envío ficha técnica o cotización por este WhatsApp.`;
              }
            } else {
              reply = `En este momento no tengo referencias cargadas en esa categoría dentro de esta instancia. Puedes ver el catálogo oficial aquí: ${CATALOG_REFERENCE_URL}`;
            }
          }

          handledByInventory = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } catch (catErr: any) {
          console.warn("[evolution-webhook] category_inventory_failed", catErr?.message || catErr);
        }
        }
      }
    }

    if (!handledByGreeting && !handledByInventory && isHistoryIntentApp(inbound.text, normalizeText)) {
      try {
        const inboundPhone = normalizePhone(inbound.from || "");
        const inboundTail = phoneTail10(inbound.from || "");

        const { data: drafts } = await supabase
          .from("agent_quote_drafts")
          .select("id,product_name,total_cop,trm_rate,status,payload,customer_phone,created_at")
          .eq("created_by", ownerId)
          .eq("agent_id", String(agent.id))
          .order("created_at", { ascending: false })
          .limit(30);

        const list = Array.isArray(drafts) ? drafts : [];
        const mine = list.filter((d: any) => {
          const p = normalizePhone(String(d?.customer_phone || ""));
          return p === inboundPhone || phoneTail10(p) === inboundTail;
        });

        if (mine.length) {
          const last = mine[0] as any;
          const qty = Math.max(1, Number(last?.payload?.quantity || 1));
          reply = `Si, ya tengo tu historial. Veo ${mine.length} cotizacion(es) asociadas a este numero. La ultima fue de ${String(last?.product_name || "producto")}, cantidad ${qty}, total COP ${formatMoneyApp(Number(last?.total_cop || 0))}, estado ${String(last?.status || "draft")}. Si quieres, te la reenvio en PDF escribiendo: reenviar PDF.`;
        } else {
          reply = "Por ahora no encuentro cotizaciones previas asociadas a este numero. Si quieres, te genero una nueva en este momento.";
        }

        handledByHistory = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      } catch (histErr: any) {
        console.warn("[evolution-webhook] history_lookup_failed", histErr?.message || histErr);
      }
    }

    if (!handledByGreeting && !handledByInventory && isProductLookupIntent(inbound.text)) {
      try {
        if (isTechnicalSheetIntent(inbound.text) || isProductImageIntent(inbound.text) || Boolean(detectTechResendIntent(inbound.text))) {
          // Technical requests are handled by dedicated tech-sheet flow.
        } else {
        const catalog = await fetchCatalogRows("id,name,brand,category,base_price_usd,source_payload,product_url", 160, false);
        const commercialCatalog = (Array.isArray(catalog) ? catalog : []).filter((r: any) => isCommercialCatalogRow(r));
        const scopedCategory = normalizeText(String(detectCatalogCategoryIntent(inbound.text) || previousMemory?.last_category_intent || ""));
        const scopedCatalog = scopedCategory ? scopeCatalogRows(commercialCatalog as any, scopedCategory) : commercialCatalog;
        const hasConcreteHint = hasConcreteProductHint(inbound.text);
        let matched = pickBestCatalogProduct(inbound.text, scopedCatalog as any);
        if (!matched?.name && hasConcreteHint) {
          matched = await findCatalogByVariant(inbound.text, (scopedCatalog.length ? scopedCatalog : commercialCatalog) as any[], scopedCategory);
        }
        if (matched?.name && !isCatalogMatchConsistent(inbound.text, matched, scopedCategory)) matched = null;
        if (matched?.name) {
          nextMemory.last_product_name = String(matched.name || "");
          nextMemory.last_product_id = String((matched as any)?.id || "");
          nextMemory.last_product_category = String((matched as any)?.category || "");
          nextMemory.last_selected_product_name = String(matched.name || "");
          nextMemory.last_selected_product_id = String((matched as any)?.id || "");
          nextMemory.last_selection_at = new Date().toISOString();
          const hasPrice = Number((matched as any)?.base_price_usd || 0) > 0;
          reply = hasPrice
            ? `Sí, sí tenemos ${String(matched.name)}. Si quieres, te envío de una la cotización con TRM de hoy por este WhatsApp.`
            : `Sí, sí tenemos ${String(matched.name)}. Si quieres, te comparto ficha técnica y opciones disponibles por este WhatsApp.`;
          handledByProductLookup = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else if (hasConcreteHint) {
          const candidates = uniqueNormalizedStrings(
            (scopedCatalog.length ? scopedCatalog : commercialCatalog)
              .map((r: any) => humanCatalogName(String(r?.name || "").trim()))
              .filter(Boolean),
            3
          );
          reply = candidates.length
            ? `No encontré una coincidencia exacta para ese modelo en esta base. Prueba con uno de estos nombres exactos: ${candidates.join(" / ")}.`
            : "No encontré una coincidencia exacta para ese modelo en esta base. Escríbeme el nombre exacto del producto para validarlo.";
          handledByProductLookup = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
        }
      } catch (lookupErr: any) {
        console.warn("[evolution-webhook] product_lookup_failed", lookupErr?.message || lookupErr);
      }
    }

    if (!handledByGreeting && !handledByInventory && !handledByProductLookup && !handledByHistory && isPriceIntent(inbound.text)) {
      try {
        if (isTechnicalSheetIntent(inbound.text) || isProductImageIntent(inbound.text) || Boolean(detectTechResendIntent(inbound.text))) {
          // Technical requests are handled by dedicated tech-sheet flow.
        } else {
        const pricedProducts = await fetchCatalogRows("id,name,base_price_usd,category,source_payload,product_url", 40, true);

        const list = (Array.isArray(pricedProducts) ? pricedProducts : []).filter((r: any) => isCommercialCatalogRow(r));
        const scopedCategory = normalizeText(String(detectCatalogCategoryIntent(inbound.text) || previousMemory?.last_category_intent || ""));
        const scopedList = scopedCategory ? scopeCatalogRows(list as any, scopedCategory) : list;
        const hasConcreteHint = hasConcreteProductHint(inbound.text);
        let matched = pickBestCatalogProduct(inbound.text, scopedList as any);
        const rememberedProductNameForPrice = String(previousMemory?.last_product_name || nextMemory?.last_product_name || "").trim();
        const rememberedPriced = rememberedProductNameForPrice
          ? findCatalogProductByName((scopedList.length ? scopedList : list) as any[], rememberedProductNameForPrice)
          : null;
        if (!matched?.name && hasConcreteHint) {
          matched = await findCatalogByVariant(inbound.text, (scopedList.length ? scopedList : list) as any[], scopedCategory);
        }
        if (!matched?.name && !hasConcreteHint && rememberedPriced?.name) {
          matched = rememberedPriced;
        }
        if (matched?.name && !isCatalogMatchConsistent(inbound.text, matched, scopedCategory)) matched = null;

        if (matched?.name) {
          nextMemory.last_product_name = String(matched.name || "");
          nextMemory.last_product_id = String((matched as any)?.id || "");
          nextMemory.last_product_category = String((matched as any)?.category || "");
          nextMemory.last_selected_product_name = String(matched.name || "");
          nextMemory.last_selected_product_id = String((matched as any)?.id || "");
          nextMemory.last_selection_at = new Date().toISOString();
          nextMemory.pending_product_options = [];
          reply = `El producto ${String(matched.name)} tiene precio base USD ${formatMoneyApp(Number(matched.base_price_usd || 0))}. Si quieres, te genero la cotizacion con TRM de hoy y PDF.`;
        } else if (list.length) {
          const options = buildNumberedProductOptions(list, 5);
          const sample = options
            .map((p: any) => `${p.code}) ${String(p.name)} (USD ${formatMoneyApp(Number(p.base_price_usd || 0))})`);
          nextMemory.pending_product_options = options;
          nextMemory.awaiting_action = "product_option_selection";
          reply = [
            "Tengo precios base cargados en todo el catálogo.",
            "Aquí van 5 opciones rápidas:",
            ...sample,
            "",
            "Responde con letra o número (ej.: A o 1) y te genero cotización con TRM, o te envío ficha técnica.",
          ].join("\n");
        } else {
          reply = "Ahora mismo no tengo productos con precio cargado para cotizar. Si quieres, te confirmo el catalogo disponible primero.";
        }

        handledByPricing = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
      } catch (priceErr: any) {
        console.warn("[evolution-webhook] pricing_lookup_failed", priceErr?.message || priceErr);
      }
    }

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByProductLookup && isOutOfCatalogDomainQuery(inbound.text)) {
      reply = "Ahora mismo solo manejo productos OHAUS de pesaje y laboratorio del catálogo (balanzas, básculas, electroquímica, analizador de humedad y equipos de laboratorio). Si quieres, te recomiendo un modelo OHAUS según tu aplicación.";
      handledByRecommendation = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && isRecommendationIntent(inbound.text)) {
      try {
        if (isTechnicalSheetIntent(inbound.text) || isProductImageIntent(inbound.text) || Boolean(detectTechResendIntent(inbound.text))) {
          // Technical requests are handled by dedicated tech-sheet flow.
        } else {
        const products = await fetchCatalogRows("id,name,brand,category,summary,description,specs_text,specs_json,source_payload,product_url", 120, false);

        const list = (Array.isArray(products) ? products : []).filter((r: any) => isCommercialCatalogRow(r));
        const scopedCategory = normalizeText(String(detectCatalogCategoryIntent(inbound.text) || previousMemory?.last_category_intent || ""));
        const scopedList = scopedCategory ? scopeCatalogRows(list as any, scopedCategory) : list;
        const featureTerms = extractFeatureTerms(inbound.text);
        const wantsFeatureAnswer = isFeatureQuestionIntent(inbound.text) && featureTerms.length > 0;
        let matched = pickBestCatalogProduct(inbound.text, scopedList);
        if (matched?.name && !isCatalogMatchConsistent(inbound.text, matched, scopedCategory)) matched = null;
        const sourceList = scopedList.length ? scopedList : list;
        const calibrationPref = detectCalibrationPreference(inbound.text);
        const sourceListByCalibration = calibrationPref
          ? sourceList.filter((row: any) => rowMatchesCalibrationPreference(row, calibrationPref))
          : sourceList;
        const suggestions = [
          matched,
          ...sourceListByCalibration.filter((p: any) => !matched || String(p.id) !== String(matched.id)),
        ]
          .filter(Boolean)
          .slice(0, 3)
          .map((p: any) => String(p?.name || "").trim())
          .filter(Boolean);

        if (wantsFeatureAnswer) {
          const rankedByFeature = rankCatalogByFeature(sourceListByCalibration as any[], featureTerms).slice(0, 5);
          if (rankedByFeature.length) {
            const top = rankedByFeature.slice(0, 3);
            const options = buildNumberedProductOptions(top.map((x) => x.row), 3);
            const first = top[0]?.row;
            if (first?.name) {
              nextMemory.last_product_name = String(first.name || "");
              nextMemory.last_product_id = String((first as any)?.id || "");
              nextMemory.last_product_category = String((first as any)?.category || "");
              nextMemory.last_selected_product_name = String(first.name || "");
              nextMemory.last_selected_product_id = String((first as any)?.id || "");
              nextMemory.last_selection_at = new Date().toISOString();
            }
            nextMemory.pending_product_options = options;
            nextMemory.awaiting_action = "product_option_selection";
            reply = [
              `Sí, tengo opciones que cumplen esa característica (${featureTerms.join(", ")}):`,
              ...options.map((o) => `${o.code}) ${o.name}`),
              "",
              "Responde con letra o número (ej.: A o 1) y te envío ficha técnica o cotización.",
            ].join("\n");
          } else if (suggestions.length) {
            reply = `No encontré coincidencia exacta para esa característica (${featureTerms.join(", ")}). Te propongo alternativas cercanas: ${suggestions.join("; ")}.`;
          } else {
            reply = "No encontré coincidencias para esa característica en este momento. Si quieres, te filtro por capacidad, resolución o calibración externa/interna.";
          }
        } else if (suggestions.length) {
          if (matched?.name) {
            nextMemory.last_product_name = String(matched.name || "");
            nextMemory.last_product_id = String((matched as any)?.id || "");
            nextMemory.last_product_category = String((matched as any)?.category || "");
            nextMemory.last_selected_product_name = String(matched.name || "");
            nextMemory.last_selected_product_id = String((matched as any)?.id || "");
            nextMemory.last_selection_at = new Date().toISOString();
            nextMemory.pending_product_options = [];
          }
          const optionSource = [matched, ...sourceList].filter(Boolean).slice(0, 4);
          const options = buildNumberedProductOptions(optionSource as any[], 4);
          nextMemory.pending_product_options = options;
          nextMemory.awaiting_action = "product_option_selection";
          reply = [
            "Con base en tu caso, estas son opciones del catálogo:",
            ...options.map((o) => `${o.code}) ${o.name}`),
            "",
            "Responde con letra o número (ej.: A o 1) y te envío ficha técnica o cotización.",
          ].join("\n");
        } else {
          reply = "Ahora mismo no encuentro productos activos en el catalogo para recomendar. Si quieres, actualizo catalogo y te cotizo enseguida.";
        }

        handledByRecommendation = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
      } catch (recErr: any) {
        console.warn("[evolution-webhook] recommendation_failed", recErr?.message || recErr);
      }
    }

    const quoteIntentNow = asksQuoteIntent(inbound.text) || isQuoteStarterIntent(inbound.text) || isQuoteProceedIntent(inbound.text) || isPriceIntent(inbound.text);
    const hasExplicitTechNow = isTechnicalSheetIntent(inbound.text) || isProductImageIntent(inbound.text) || Boolean(detectTechResendIntent(inbound.text));
    const forceExitTechAwaiting = (quoteIntentNow && !hasExplicitTechNow) || inboundTechnicalSpec;
    const awaitingTechProductSelection = awaitingAction === "tech_product_selection" && !forceExitTechAwaiting;
    const awaitingTechAssetChoice = awaitingAction === "tech_asset_choice" && !forceExitTechAwaiting;
    if (forceExitTechAwaiting && String(nextMemory.awaiting_action || "").startsWith("tech_")) {
      nextMemory.awaiting_action = "none";
    }
    const rememberedTechProduct = String(previousMemory?.last_product_name || nextMemory?.last_product_name || "").trim();
    const techResendIntent = detectTechResendIntent(inbound.text);
    const techInboundText = techResendIntent && rememberedTechProduct
      ? `ficha tecnica de ${rememberedTechProduct}`
      : awaitingTechAssetChoice && isAffirmativeIntentApp(inbound.text, normalizeText) && rememberedTechProduct
        ? `ficha tecnica de ${rememberedTechProduct}`
        : inbound.text;

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && (isTechnicalSheetIntent(techInboundText) || isProductImageIntent(techInboundText) || Boolean(techResendIntent) || awaitingTechProductSelection || awaitingTechAssetChoice)) {
      try {
        if (techResendIntent && !rememberedTechProduct) {
          reply = "Para reenviar la ficha técnica necesito el modelo exacto del producto. Escríbeme solo el nombre del modelo.";
          nextMemory.awaiting_action = "tech_product_selection";
          handledByTechSheet = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else {
        const products = await fetchCatalogRows("id,name,category,product_url,image_url,datasheet_url,summary,description,specs_text,specs_json,source_payload", 180, false);

        const rawList = Array.isArray(products) ? products : [];
        const merged = [...rawList.filter((p: any) => isCommercialCatalogRow(p)), ...rawList.filter((p: any) => isDocumentCatalogRow(p))];
        const seen = new Set<string>();
        const list = merged.filter((p: any) => {
          const key = String(p?.id || `${String(p?.name || "").trim()}::${String(p?.product_url || "").trim()}`);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const modelTokensForTech = extractModelLikeTokens(techInboundText);
        const explicitTermsForTech = extractCatalogTerms(techInboundText);
        const hasExplicitProductHintForTech = modelTokensForTech.length > 0 || explicitTermsForTech.length >= 2;
        const detectedTechCategory = normalizeText(String(detectCatalogCategoryIntent(techInboundText) || ""));
        const rememberedTechCategory = normalizeText(String(previousMemory?.last_product_category || previousMemory?.last_category_intent || ""));
        const preferredTechCategory = detectedTechCategory || (hasExplicitProductHintForTech ? "" : rememberedTechCategory);
        const scopedList = preferredTechCategory ? scopeCatalogRows(list as any, preferredTechCategory) : list;
        const listForTech = scopedList.length ? scopedList : list;
        const rememberedTechProductId = String(previousMemory?.last_product_id || nextMemory?.last_product_id || previousMemory?.last_selected_product_id || nextMemory?.last_selected_product_id || "").trim();
        const rememberedById = rememberedTechProductId
          ? (list.find((x: any) => String(x?.id || "").trim() === rememberedTechProductId) || null)
          : null;
        const rememberedRow = rememberedById || (rememberedTechProduct
          ? findCatalogProductByName(list, rememberedTechProduct)
          : null);
        const askList = isTechSheetCatalogListIntent(inbound.text);

        if (askList) {
          const withSheet = listForTech.filter((p: any) => {
            const payload = p?.source_payload && typeof p.source_payload === "object" ? p.source_payload : {};
            const pdfLinks = Array.isArray((payload as any)?.pdf_links) ? (payload as any).pdf_links : [];
            const productUrlAsPdf = /\.pdf(\?|$)/i.test(String(p?.product_url || ""));
            return Boolean(String(p?.datasheet_url || "").trim()) || pdfLinks.length > 0 || productUrlAsPdf;
          });

          const withImageOrSpecs = listForTech.filter((p: any) => {
            const specs = String(p?.specs_text || "").trim();
            const image = String(p?.image_url || "").trim();
            return Boolean(specs) || Boolean(image);
          });

          if (withSheet.length) {
            const names = uniqueNormalizedStrings(
              withSheet.map((p: any) => humanCatalogName(String(p?.name || "").trim())).filter(Boolean),
              12
            );
            const rest = Math.max(0, withSheet.length - names.length);
            reply = [
              `Claro. En este momento tengo ${withSheet.length} producto(s) con ficha técnica (PDF) disponible:`,
              "",
              ...names.map((n: string) => `- ${n}`),
              ...(rest > 0 ? [`- y ${rest} más`] : []),
              "",
              "Dime cuál te interesa y te envío la ficha técnica por este WhatsApp.",
            ].join("\n");
            nextMemory.awaiting_action = "tech_product_selection";
          } else if (withImageOrSpecs.length) {
            const names = uniqueNormalizedStrings(
              withImageOrSpecs.map((p: any) => humanCatalogName(String(p?.name || "").trim())).filter(Boolean),
              10
            );
            const rest = Math.max(0, withImageOrSpecs.length - names.length);
            reply = [
              "No tengo fichas técnicas PDF cargadas ahora mismo.",
              "Sí tengo información técnica resumida en:",
              ...names.map((n: string) => `- ${n}`),
              ...(rest > 0 ? [`- y ${rest} más`] : []),
              "",
              "Si me dices un producto, te envío lo disponible por este WhatsApp.",
            ].join("\n");
            nextMemory.awaiting_action = "tech_product_selection";
          } else {
            reply = "En este momento no tengo fichas técnicas cargadas en catálogo para enviar por WhatsApp. Si quieres, te comparto los productos activos.";
            nextMemory.awaiting_action = "none";
          }

          handledByTechSheet = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else {
        if (techResendIntent && rememberedTechProduct && !rememberedRow?.name) {
          reply = `No pude recuperar el archivo técnico de ${rememberedTechProduct} en este momento. Escríbeme nuevamente el modelo exacto para reenviarlo.`;
          nextMemory.awaiting_action = "tech_product_selection";
          handledByTechSheet = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else {
        const modelTokens = modelTokensForTech;
        const explicitTerms = explicitTermsForTech;
        const hasExplicitProductHint = hasExplicitProductHintForTech;

        let matched: any = null;
        if (!hasExplicitProductHint && rememberedRow?.name) {
          matched = rememberedRow;
        } else {
          const techSourceText = String(techInboundText || "").trim();
          let candidatePool: any[] = scopedList as any[];
          if (hasExplicitProductHint) {
            const scopedNarrowed = filterCatalogByTerms(techInboundText, scopedList as any, preferredTechCategory);
            if (!scopedNarrowed.length) {
              const allNarrowed = filterCatalogByTerms(techInboundText, list as any);
              if (allNarrowed.length) candidatePool = list as any[];
            }
          }
          matched = pickBestCatalogProduct(techSourceText, candidatePool as any);
          if (!matched?.name && rememberedRow?.name && !hasExplicitProductHint) matched = rememberedRow;
        }

        if (!matched?.name && hasExplicitProductHint) {
          matched = await findCatalogByVariant(techInboundText, (scopedList.length ? scopedList : list) as any[], preferredTechCategory);
        }

        if (matched?.name && !isCatalogMatchConsistent(techInboundText, matched, preferredTechCategory)) {
          matched = null;
        }

        if (!matched?.name) {
          const narrowed = filterCatalogByTerms(techInboundText, scopedList as any, preferredTechCategory);
          const sourceOptions = narrowed.length ? narrowed : (scopedList.length ? scopedList : list);
          const options = buildNumberedProductOptions(sourceOptions as any[], 6);
          if (options.length) {
            const top = options.slice(0, 4);
            const more = Math.max(0, options.length - top.length);
            reply = [
              "Claro. Para enviarte la ficha técnica necesito el producto exacto.",
              "",
              "Opciones disponibles:",
              ...top.map((o) => `${o.code}) ${o.name}`),
              ...(more > 0 ? [`- y ${more} más`] : []),
              "",
              "Responde con letra o número (ej.: A o 1).",
            ].join("\n");
            nextMemory.awaiting_action = "product_option_selection";
            nextMemory.pending_product_options = options;
          } else {
            reply = `Ahora mismo no encuentro productos activos en catálogo para enviarte ficha técnica. Catálogo oficial: ${CATALOG_REFERENCE_URL}`;
            nextMemory.awaiting_action = "none";
          }
          handledByTechSheet = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else {
          nextMemory.last_product_name = String((matched as any)?.name || "");
          nextMemory.last_product_id = String((matched as any)?.id || "");
          nextMemory.last_product_category = String((matched as any)?.category || "");
          nextMemory.last_selected_product_name = String((matched as any)?.name || "");
          nextMemory.last_selected_product_id = String((matched as any)?.id || "");
          nextMemory.last_selection_at = new Date().toISOString();
          const wantsSheet = isTechnicalSheetIntent(techInboundText) || isProductImageIntent(techInboundText) || awaitingTechProductSelection || awaitingTechAssetChoice;
          const wantsImage = false;
          const matchedCategory = normalizeText(String((matched as any)?.category || ""));
          const webTechOnly = prefersWebTechPageOnly(matchedCategory);
          const matchedProductUrl = String((matched as any)?.product_url || "").trim();
          const imageUrl = String((matched as any)?.image_url || "").trim();
          let attachedSheet = false;
          let attachedImage = false;

          if (wantsSheet) {
            const datasheetUrl = webTechOnly ? "" : pickBestProductPdfUrl(matched, techInboundText);
            const localPdfPath = webTechOnly ? "" : pickBestLocalPdfPath(matched, techInboundText);
            if (datasheetUrl) technicalFallbackLinks.push(datasheetUrl);
            if (webTechOnly && matchedProductUrl) technicalFallbackLinks.push(matchedProductUrl);
            if (datasheetUrl) {
              const remote = await fetchRemoteFileAsBase64(datasheetUrl);
              if (remote) {
                const remoteLooksPdf =
                  /application\/pdf/i.test(String(remote.mimetype || "")) ||
                  /\.pdf$/i.test(String(remote.fileName || "")) ||
                  /\.pdf(\?|$)/i.test(String(datasheetUrl || ""));
                if (remoteLooksPdf && Number(remote.byteSize || 0) <= MAX_WHATSAPP_DOC_BYTES) {
                  technicalDocs.push({
                    kind: "document",
                    base64: remote.base64,
                    mimetype: "application/pdf",
                    fileName: safeFileName(remote.fileName, `ficha-${String((matched as any)?.name || "producto")}`, "pdf"),
                    caption: `Ficha técnica - ${String((matched as any)?.name || "producto")}`,
                  });
                  attachedSheet = true;
                }
              }
            }
            if (!attachedSheet && localPdfPath) {
              const local = fetchLocalFileAsBase64App(localPdfPath);
              if (local) {
                if (Number(local.byteSize || 0) <= MAX_WHATSAPP_DOC_BYTES) {
                  technicalDocs.push({
                    kind: "document",
                    base64: local.base64,
                    mimetype: local.mimetype || "application/pdf",
                    fileName: safeFileName(local.fileName, `ficha-${String((matched as any)?.name || "producto")}`, "pdf"),
                    caption: `Ficha técnica - ${String((matched as any)?.name || "producto")}`,
                  });
                  attachedSheet = true;
                }
              }
            }
          }

          if (wantsImage || wantsSheet) {
            if (imageUrl) {
              technicalFallbackLinks.push(imageUrl);
              const remote = await fetchRemoteFileAsBase64(imageUrl);
              if (remote) {
                if (Number(remote.byteSize || 0) <= MAX_WHATSAPP_DOC_BYTES) {
                  technicalDocs.push({
                    kind: "image",
                    base64: remote.base64,
                    mimetype: remote.mimetype || "image/jpeg",
                    fileName: safeFileName(remote.fileName, `imagen-${String((matched as any)?.name || "producto")}`, "jpg"),
                    caption: `Imagen - ${String((matched as any)?.name || "producto")}`,
                  });
                  attachedImage = true;
                }
              }
            }
          }

          const briefSpecs = buildTechnicalSummary(matched, 4);
          const includeSummary = wantsSheet && !wantsImage;
          const productUrl = String((matched as any)?.product_url || "").trim();
          const pdfLink = technicalFallbackLinks.find((u) => /\.pdf(\?|$)/i.test(String(u || ""))) || "";
          const pdfTooLargeForAttachment = wantsSheet && !attachedSheet && Boolean(pdfLink);
          const urlKey = (u: string) => String(u || "").trim().replace(/\/+$/, "").toLowerCase();
          const detailUrl = !webTechOnly && productUrl && (!pdfLink || urlKey(productUrl) !== urlKey(pdfLink)) ? productUrl : "";
          const primarySheetLink = webTechOnly
            ? String(matchedProductUrl || "").trim()
            : String(pdfLink || detailUrl || "").trim();
          const repositoryLinkFallbackSection = wantsSheet && !attachedSheet && !primarySheetLink && DATASHEET_REPOSITORY_URL
            ? ["", `Repositorio de fichas tecnicas: ${DATASHEET_REPOSITORY_URL}`]
            : [];
          const webTechLinkSection = webTechOnly && wantsSheet && matchedProductUrl
            ? ["", `FICHA WEB: ${matchedProductUrl}`]
            : [];
          const hasSamePrimaryWebLink = webTechOnly && matchedProductUrl && primarySheetLink && urlKey(primarySheetLink) === urlKey(matchedProductUrl);
          const summaryAlreadyContainsSheetLink = includeSummary && !briefSpecs && !webTechOnly && Boolean(primarySheetLink);
          const sheetLinkFallbackSection = wantsSheet && !attachedSheet && !webTechOnly && primarySheetLink && !summaryAlreadyContainsSheetLink
            ? [
                "",
                `Te envío el enlace directo de la ficha técnica: ${primarySheetLink}`,
                ...(pdfLink && !attachedSheet
                  ? [pdfTooLargeForAttachment
                      ? "Si prefieres, te intento reenviar el PDF cuando el archivo permita envio por WhatsApp."
                      : "Si prefieres, escribe 'reenviar ficha' y te intento enviar el PDF por este WhatsApp."]
                  : []),
              ]
            : [];

          if (technicalDocs.length) {
            const summarySection = includeSummary
              ? (
                  briefSpecs
                    ? ["", "Resumen técnico:", briefSpecs]
                    : (primarySheetLink
                        ? (hasSamePrimaryWebLink ? [] : ["", "Te comparto el enlace directo de la ficha técnica:", primarySheetLink])
                        : ["", "Te comparto la ficha técnica adjunta."])
                )
              : [];
            reply = [
              attachedSheet
                ? `Perfecto. Te envío por este WhatsApp la ficha técnica en PDF de ${String((matched as any)?.name || "ese producto")}.`
                : `Perfecto. Te comparto la información técnica de ${String((matched as any)?.name || "ese producto")}.`,
              ...summarySection,
              ...sheetLinkFallbackSection,
              ...repositoryLinkFallbackSection,
              ...webTechLinkSection,
            ].join("\n");
          } else if (briefSpecs) {
            reply = [
              `Te comparto la ficha técnica de ${String((matched as any)?.name || "ese producto")}:`,
              "",
              briefSpecs,
              ...webTechLinkSection,
              ...repositoryLinkFallbackSection,
              ...(pdfTooLargeForAttachment ? ["", `La ficha PDF es pesada para envío directo; aquí la puedes abrir: ${pdfLink}`] : []),
              ...(detailUrl ? ["", `Más detalle: ${detailUrl}`] : []),
            ].join("\n");
          } else {
            reply = webTechOnly && wantsSheet && matchedProductUrl
              ? `Este modelo no tiene ficha PDF oficial. Puedes revisar su ficha web aquí: ${matchedProductUrl}.`
              : pdfTooLargeForAttachment
                ? `La ficha PDF de ${String((matched as any)?.name || "ese producto")} es pesada para envío directo por WhatsApp. Puedes abrirla aquí: ${pdfLink}.`
                : `Te comparto el enlace directo de la ficha técnica de ${String((matched as any)?.name || "ese producto")}.${detailUrl ? ` ${detailUrl}` : ""}${!detailUrl && DATASHEET_REPOSITORY_URL ? ` Repositorio de fichas: ${DATASHEET_REPOSITORY_URL}.` : ""} Si quieres, te genero la cotización de una vez.`;
          }
          if (reply && !/\bquieres\b.*\b(cotizacion|ficha|producto)\b/i.test(normalizeText(reply))) {
            reply = `${reply}\n\n¿Quieres cotización de este modelo o prefieres revisar otro producto?`;
          }
          nextMemory.awaiting_action = "none";
          handledByTechSheet = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
        }
        }
        }
      } catch (techErr: any) {
        console.warn("[evolution-webhook] tech_sheet_failed", techErr?.message || techErr);
        reply = "Tuve un problema al preparar la ficha técnica en este intento. Escríbeme nuevamente el modelo exacto y te la envío por este WhatsApp.";
        nextMemory.awaiting_action = "tech_product_selection";
        handledByTechSheet = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }

    const rememberedQuoteProductName = String(nextMemory.last_product_name || previousMemory?.last_product_name || "").trim();
    const concreteQuoteIntent = isConcreteQuoteIntent(inbound.text, rememberedQuoteProductName);

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByTechSheet && !concreteQuoteIntent && isQuoteStarterIntent(inbound.text)) {
      try {
        const allCatalog = await fetchCatalogRows("id,name,category,source_payload,base_price_usd", 260, false);
        const priced = await fetchCatalogRows("id,name,category,source_payload,base_price_usd", 160, true);
        const allRows = (Array.isArray(allCatalog) ? allCatalog : []).filter((r: any) => isCommercialCatalogRow(r));
        const pricedRows = (Array.isArray(priced) ? priced : []).filter((r: any) => isCommercialCatalogRow(r));
        const options = buildNumberedProductOptions(pricedRows, 4);
        const quoteText = normalizeText(inbound.text || "");
        const rememberedCategory = normalizeText(String(previousMemory?.last_category_intent || nextMemory?.last_product_category || ""));
        const detectedCategory = normalizeText(String(detectCatalogCategoryIntent(inbound.text) || ""));
        const asksBasculas = /(bascula|basculas|plataforma|indicador)/.test(quoteText);
        const asksBalanzas = /(balanza|balanzas)/.test(quoteText);
        const targetCategoryForQuote = ["balanzas", "basculas", "electroquimica", "equipos_laboratorio", "analizador_humedad"].includes(detectedCategory)
          ? detectedCategory
          : asksBasculas
          ? "basculas"
          : asksBalanzas
            ? "balanzas"
            : (["balanzas", "basculas", "electroquimica", "equipos_laboratorio", "analizador_humedad"].includes(rememberedCategory) ? rememberedCategory : "balanzas");
        const isGenericBalanceQuote = /(balanza|balanzas|bascula|basculas)/.test(quoteText) && !hasConcreteProductHint(inbound.text);
        const categoryRows = scopeCatalogRows(allRows as any[], targetCategoryForQuote);
        const pricedCategoryRows = scopeCatalogRows(pricedRows as any[], targetCategoryForQuote);
        const subCount = new Map<string, number>();
        for (const row of categoryRows) {
          const rawSub = normalizeText(String(catalogSubcategory(row) || ""));
          const key = rawSub || normalizeText(String((row as any)?.category || ""));
          if (!key) continue;
          subCount.set(key, Number(subCount.get(key) || 0) + 1);
        }
        const typeOrder = targetCategoryForQuote === "basculas"
          ? [
              "basculas_mesa",
              "basculas_piso",
              "basculas_lavables",
              "plataformas",
              "plataformas_lavables",
              "indicadores",
              "indicadores_lavables",
              "basculas",
            ]
          : [
              "balanzas_semimicro",
              "balanzas_analiticas",
              "balanzas_semianaliticas",
              "balanzas_precision",
              "balanzas_mesa",
              "balanzas_portatiles",
              "balanzas_joyeria",
              "balanzas_alimentos",
              "balanzas_conteo",
              "balanzas",
            ];
        const typeLabel: Record<string, string> = {
          balanzas_semimicro: "Semi-Micro",
          balanzas_analiticas: "Analíticas",
          balanzas_semianaliticas: "Semianalíticas",
          balanzas_precision: "Precisión",
          balanzas_mesa: "De Mesa",
          balanzas_joyeria: "Joyería",
          balanzas_portatiles: "Portátiles",
          balanzas_alimentos: "De Alimentos",
          balanzas_conteo: "De Conteo",
          basculas_mesa: "Básculas de Mesa",
          basculas_piso: "Básculas de Piso",
          basculas_lavables: "Básculas Lavables",
          plataformas: "Plataformas",
          plataformas_lavables: "Plataformas Lavables",
          indicadores: "Indicadores",
          indicadores_lavables: "Indicadores Lavables",
          basculas: "Básculas",
          balanzas: "Balanzas",
        };
        const types = typeOrder
          .map((k) => ({ key: k, count: Number(subCount.get(k) || 0) }))
          .filter((x) => x.count > 0)
          .slice(0, 10);

        let quoteOptions = options;
        let categoryRestrictedWithoutMatches = false;
        if (!isGenericBalanceQuote && targetCategoryForQuote) {
          const sourceForCategory = pricedCategoryRows.length ? pricedCategoryRows : categoryRows;
          if (sourceForCategory.length) {
            quoteOptions = buildNumberedProductOptions(sourceForCategory as any[], 4);
          } else {
            quoteOptions = [];
            categoryRestrictedWithoutMatches = true;
          }
        }
        if (isGenericBalanceQuote && categoryRows.length) {
          const buckets = new Map<string, any[]>();
          const sourceForQuoteOptions = pricedCategoryRows.length ? pricedCategoryRows : categoryRows;
          for (const row of sourceForQuoteOptions) {
            const rawSub = normalizeText(String(catalogSubcategory(row) || ""));
            const categoryKey = normalizeText(String((row as any)?.category || ""));
            const key = rawSub || categoryKey || "otros";
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key)!.push(row);
          }

          const diversifiedTypeOrder = [
            "balanzas_analiticas",
            "balanzas_semianaliticas",
            "balanzas_precision",
            "balanzas_portatiles",
            "basculas",
            "balanzas_joyeria",
            "balanzas",
            "otros",
          ];

          const pickedRows: any[] = [];
          const pickedKeys = new Set<string>();
          const queues = diversifiedTypeOrder
            .map((k) => ({ key: k, rows: [...(buckets.get(k) || [])] }))
            .filter((q) => q.rows.length > 0);

          let guard = 0;
          while (pickedRows.length < 4 && guard < 50) {
            guard += 1;
            let added = false;
            for (const q of queues) {
              if (!q.rows.length) continue;
              const candidate = q.rows.shift();
              const cKey = normalizeText(String((candidate as any)?.name || ""));
              if (!candidate || !cKey || pickedKeys.has(cKey)) continue;
              pickedRows.push(candidate);
              pickedKeys.add(cKey);
              added = true;
              if (pickedRows.length >= 4) break;
            }
            if (!added) break;
          }

          if (pickedRows.length) {
            quoteOptions = buildNumberedProductOptions(pickedRows, 4);
          }
        }

        reply = quoteOptions.length
          ? (isGenericBalanceQuote
              ? [
                  `Claro. Para cotizar una ${targetCategoryForQuote === "basculas" ? "báscula" : "balanza"}, primero elige tipo o modelo:`,
                  `Tengo ${categoryRows.length} referencia(s) de ${targetCategoryForQuote === "basculas" ? "básculas" : "balanzas"} en catálogo (${pricedCategoryRows.length} con precio para cotización inmediata).`,
                  ...(types.length
                    ? [
                        "Tipos disponibles:",
                        ...types.map((t) => `- ${typeLabel[t.key] || t.key.replace(/_/g, " ")} (${t.count})`),
                        "",
                  ]
                    : []),
                  "Opciones rápidas de modelo:",
                  ...quoteOptions.map((o) => `${o.code}) ${o.name}`),
                  "",
                  `Catálogo oficial: ${CATALOG_REFERENCE_URL}`,
                  "",
                  `Responde con un tipo (ej: ${targetCategoryForQuote === "basculas" ? "plataformas" : "precisión"}) o con letra/número (ej: A o 1).`,
                ].join("\n")
              : [
                  "Claro. Para cotizar de una, elige primero un modelo:",
                  ...quoteOptions.map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Responde con letra o número (ej.: A o 1). Luego te pido cantidad.",
                ].join("\n"))
          : (categoryRestrictedWithoutMatches
              ? buildNoActiveCatalogEscalationMessage(`cotizar en la categoria ${targetCategoryForQuote.replace(/_/g, " ")}`)
              : "Claro. Para cotizar de una, dime modelo exacto y cantidad (ejemplo: Explorer 220, 2 unidades).");
        nextMemory.awaiting_action = categoryRestrictedWithoutMatches
          ? "conversation_followup"
          : (quoteOptions.length ? "product_option_selection" : "quote_product_selection");
        nextMemory.pending_product_options = quoteOptions;
        nextMemory.last_category_intent = targetCategoryForQuote;

        handledByQuoteStarter = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      } catch (starterErr: any) {
        console.warn("[evolution-webhook] quote_starter_failed", starterErr?.message || starterErr);
      }
    }

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByTechSheet && !handledByQuoteStarter && isQuantityUpdateIntent(inbound.text)) {
      try {
        const requestedQty = extractQuantityApp(inbound.text);
        const memoryDraftId = String(previousMemory?.last_quote_draft_id || "").trim();

        let baseDraft: any = null;
        if (memoryDraftId) {
          const { data } = await supabase
            .from("agent_quote_drafts")
            .select("id,tenant_id,product_catalog_id,product_name,base_price_usd,trm_rate,total_cop,status,payload,customer_phone,customer_name,customer_email,company_name,notes,created_at")
            .eq("id", memoryDraftId)
            .eq("created_by", ownerId)
            .eq("agent_id", String(agent.id))
            .maybeSingle();
          baseDraft = data || null;
        }

        if (!baseDraft) {
          const { data: recentDrafts } = await supabase
            .from("agent_quote_drafts")
            .select("id,tenant_id,product_catalog_id,product_name,base_price_usd,trm_rate,total_cop,status,payload,customer_phone,customer_name,customer_email,company_name,notes,created_at")
            .eq("created_by", ownerId)
            .eq("agent_id", String(agent.id))
            .order("created_at", { ascending: false })
            .limit(30);

          const inboundPhone = normalizePhone(inbound.from || "");
          const inboundTail = phoneTail10(inbound.from || "");
          const draftList = Array.isArray(recentDrafts) ? recentDrafts : [];
          baseDraft =
            draftList.find((d: any) => normalizePhone(String(d?.customer_phone || "")) === inboundPhone) ||
            draftList.find((d: any) => phoneTail10(String(d?.customer_phone || "")) === inboundTail) ||
            null;
        }

        if (!baseDraft?.id) {
          reply = "No encuentro una cotización previa para ajustar cantidad en este momento. Si me dices producto y cantidad, la genero de inmediato por este WhatsApp.";
          handledByRecall = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else {
          const basePriceUsd = Number((baseDraft as any)?.base_price_usd || 0);
          if (!(requestedQty > 0) || !(basePriceUsd > 0)) {
            reply = "Entendido. Confírmame la cantidad exacta para recalcular y enviarte el PDF actualizado.";
            handledByRecall = true;
            billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
          } else {
            const trm = await getOrFetchTrm(supabase, ownerId, (agent as any)?.tenant_id || null);
            const trmRate = Number(trm?.rate || 0);
            if (!(trmRate > 0)) {
              reply = "No pude consultar la TRM de hoy para actualizar la cotización. Intenta de nuevo en 1 minuto y te la envío por este WhatsApp.";
              handledByRecall = true;
              billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            } else {
              const totalCop = Number((basePriceUsd * trmRate * requestedQty).toFixed(2));
              const payload = {
                ...((baseDraft as any)?.payload || {}),
                quantity: requestedQty,
                trm_date: trm?.rate_date || null,
                trm_source: trm?.source || null,
                automation: "evolution_webhook_qty_adjust",
              };

              const { data: newDraft, error: newDraftErr } = await supabase
                .from("agent_quote_drafts")
                .insert({
                  tenant_id: (baseDraft as any)?.tenant_id || (agent as any)?.tenant_id || null,
                  created_by: ownerId,
                  agent_id: String(agent.id),
                  customer_name: String((baseDraft as any)?.customer_name || nextMemory.customer_name || inbound.pushName || "") || null,
                  customer_email: String((baseDraft as any)?.customer_email || nextMemory.customer_email || "") || null,
                  customer_phone: String((baseDraft as any)?.customer_phone || nextMemory.customer_phone || inbound.from || "") || null,
                  company_name: String((baseDraft as any)?.company_name || cfg?.company_name || "Avanza Balanzas") || "Avanza Balanzas",
                  location: null,
                  product_catalog_id: (baseDraft as any)?.product_catalog_id || null,
                  product_name: String((baseDraft as any)?.product_name || ""),
                  base_price_usd: basePriceUsd,
                  trm_rate: trmRate,
                  total_cop: totalCop,
                  notes: "Cotizacion ajustada por cantidad solicitada por cliente",
                  payload,
                  status: "analysis",
                })
                .select("id")
                .single();

              if (newDraftErr || !newDraft?.id) {
                reply = "Ocurrió un error al actualizar la cotización por cantidad. Inténtalo de nuevo y te la envío por este WhatsApp.";
              } else {
                const draftId = String(newDraft.id);
                const pdfBase64 = await buildQuotePdf({
                  draftId,
                  companyName: String((baseDraft as any)?.company_name || "Avanza Balanzas"),
                  customerName: String((baseDraft as any)?.customer_name || nextMemory.customer_name || inbound.pushName || ""),
                  customerEmail: String((baseDraft as any)?.customer_email || nextMemory.customer_email || ""),
                  customerPhone: String((baseDraft as any)?.customer_phone || nextMemory.customer_phone || inbound.from),
                  productName: String((baseDraft as any)?.product_name || ""),
                  quantity: requestedQty,
                  basePriceUsd,
                  trmRate,
                  totalCop,
                  notes: "Cotización ajustada por cantidad",
                });

                resendPdf = {
                  draftId,
                  fileName: `cotizacion-${draftId.slice(0, 8)}.pdf`,
                  pdfBase64,
                };
                nextMemory.last_quote_draft_id = draftId;
                nextMemory.last_quote_product_name = String((baseDraft as any)?.product_name || "");
                reply = `Perfecto. Ya actualicé la cotización a ${requestedQty} unidades con TRM de hoy y te envío el PDF ahora mismo por este chat.`;
              }

              handledByRecall = true;
              billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            }
          }
        }
      } catch (qtyErr: any) {
        console.warn("[evolution-webhook] quantity_adjust_failed", qtyErr?.message || qtyErr);
      }
    }

    if (!handledByGreeting && awaitingAction === "tech_asset_choice" && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByTechSheet && !handledByQuoteStarter && isAffirmativeIntentApp(inbound.text, normalizeText)) {
      const prevIntent = String(previousMemory?.last_intent || "");
      const lastProductName = String(previousMemory?.last_product_name || nextMemory?.last_product_name || "").trim();
      if ((/(tech_sheet_request|image_request)/.test(prevIntent)) && lastProductName) {
        reply = `Perfecto. Para ${lastProductName}, responde 1 para cotización o 2 para ficha técnica.`;
        nextMemory.awaiting_action = "tech_asset_choice";
        handledByTechSheet = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }

    const previousIntent = String(previousMemory?.last_intent || "");
    const recallByConfirmation =
      Boolean(previousMemory?.last_quote_draft_id) &&
      isAffirmativeIntentApp(inbound.text, normalizeText) &&
      /(quote_recall|quote_generated|price_request)/.test(previousIntent) &&
      awaitingAction === "quote_resend_confirmation";
    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByTechSheet && (isQuoteRecallIntent(inbound.text) || recallByConfirmation)) {
      try {
        const { data: recentDrafts } = await supabase
          .from("agent_quote_drafts")
          .select("id,tenant_id,product_catalog_id,product_name,base_price_usd,trm_rate,total_cop,status,payload,customer_phone,customer_name,customer_email,company_name,notes,created_at")
          .eq("created_by", ownerId)
          .eq("agent_id", String(agent.id))
          .order("created_at", { ascending: false })
          .limit(30);

        const inboundPhone = normalizePhone(inbound.from || "");
        const inboundTail = phoneTail10(inbound.from || "");
        const draftList = Array.isArray(recentDrafts) ? recentDrafts : [];

        const lastDraft =
          draftList.find((d: any) => normalizePhone(String(d?.customer_phone || "")) === inboundPhone) ||
          draftList.find((d: any) => phoneTail10(String(d?.customer_phone || "")) === inboundTail) ||
          null;

        if (lastDraft?.id) {
          nextMemory.last_quote_draft_id = String(lastDraft.id);
          nextMemory.last_quote_product_name = String(lastDraft.product_name || "");
          const qty = Math.max(1, Number((lastDraft as any)?.payload?.quantity || 1));
          const requestedQty = extractQuantityApp(inbound.text);
          const hasQtyUpdate = isQuantityUpdateIntent(inbound.text) && requestedQty > 0 && requestedQty !== qty;
          reply = `Si, claro. Tu ultima cotizacion fue del producto ${String(lastDraft.product_name || "")}, cantidad ${qty}, total COP ${formatMoneyApp(Number(lastDraft.total_cop || 0))} con TRM ${formatMoneyApp(Number(lastDraft.trm_rate || 0))}.`;

          const wantsResend = shouldResendPdf(inbound.text) || recallByConfirmation || hasQtyUpdate;
          if (wantsResend) {
            let draftIdForSend = String(lastDraft.id);
            let qtyForSend = qty;
            let trmForSend = Number((lastDraft as any).trm_rate || 0);
            let totalForSend = Number((lastDraft as any).total_cop || 0);
            const basePriceUsd = Number((lastDraft as any).base_price_usd || 0);
            if (hasQtyUpdate && basePriceUsd > 0) {
              qtyForSend = requestedQty;
              const trm = await getOrFetchTrm(supabase, ownerId, (agent as any)?.tenant_id || null);
              trmForSend = Number(trm?.rate || trmForSend || 0);
              if (trmForSend > 0) {
                totalForSend = Number((basePriceUsd * trmForSend * qtyForSend).toFixed(2));
                const payload = {
                  ...(lastDraft as any)?.payload,
                  quantity: qtyForSend,
                  trm_date: trm?.rate_date || (lastDraft as any)?.payload?.trm_date || null,
                  trm_source: trm?.source || (lastDraft as any)?.payload?.trm_source || null,
                  automation: "evolution_webhook_requote",
                };
                const { data: newDraft } = await supabase
                  .from("agent_quote_drafts")
                  .insert({
                    tenant_id: (lastDraft as any)?.tenant_id || (agent as any)?.tenant_id || null,
                    created_by: ownerId,
                    agent_id: String(agent.id),
                    customer_name: String((lastDraft as any).customer_name || nextMemory.customer_name || inbound.pushName || "") || null,
                    customer_email: String((lastDraft as any).customer_email || nextMemory.customer_email || "") || null,
                    customer_phone: String((lastDraft as any).customer_phone || nextMemory.customer_phone || inbound.from) || null,
                    company_name: String((lastDraft as any).company_name || cfg?.company_name || "Avanza Balanzas") || "Avanza Balanzas",
                    location: null,
                    product_catalog_id: (lastDraft as any)?.product_catalog_id || null,
                    product_name: String((lastDraft as any).product_name || ""),
                    base_price_usd: basePriceUsd,
                    trm_rate: trmForSend,
                    total_cop: totalForSend,
                    notes: "Ajuste de cantidad por solicitud del cliente",
                    payload,
                    status: "analysis",
                  })
                  .select("id")
                  .single();
                if (newDraft?.id) draftIdForSend = String(newDraft.id);
              }
            }

            const pdfBase64 = await buildQuotePdf({
              draftId: draftIdForSend,
              companyName: String((lastDraft as any).company_name || "Avanza Balanzas"),
              customerName: String((lastDraft as any).customer_name || nextMemory.customer_name || inbound.pushName || ""),
              customerEmail: String((lastDraft as any).customer_email || nextMemory.customer_email || ""),
              customerPhone: String((lastDraft as any).customer_phone || nextMemory.customer_phone || inbound.from),
              productName: String((lastDraft as any).product_name || ""),
              quantity: qtyForSend,
              basePriceUsd,
              trmRate: trmForSend,
              totalCop: totalForSend,
              notes: hasQtyUpdate ? "Cotizacion ajustada por cantidad" : String((lastDraft as any).notes || ""),
            });
            resendPdf = {
              draftId: draftIdForSend,
              fileName: `cotizacion-${String(draftIdForSend).slice(0, 8)}.pdf`,
              pdfBase64,
            };
            if (hasQtyUpdate) {
              nextMemory.last_quote_draft_id = draftIdForSend;
              reply = `Perfecto. Ya ajusté la cotización a ${qtyForSend} unidades y te reenvío el PDF ahora mismo por este chat.`;
            } else {
              reply += " Te reenvio el PDF ahora mismo por este chat.";
            }
            nextMemory.awaiting_action = "none";
          } else {
            reply += " Si quieres, escribe 'reenviar PDF' y te lo mando de nuevo ahora.";
            nextMemory.awaiting_action = "quote_resend_confirmation";
          }
        } else {
          reply = "Por ahora no encuentro una cotizacion previa asociada a este numero. Si quieres, te genero una nueva de inmediato.";
          nextMemory.awaiting_action = "none";
        }
        handledByRecall = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      } catch (recallErr: any) {
        console.warn("[evolution-webhook] recall_quote_failed", recallErr?.message || recallErr);
      }
    }

    const recentUserContext = historyMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .slice(-6)
      .join("\n");
    const inboundIsTechnicalSpec = isTechnicalSpecQuery(inbound.text) || inboundTechnicalSpec;
    const previousIntentForQuoteFlow = String(previousMemory?.last_intent || "");
    const asksQuoteWithNumber = asksQuoteIntent(inbound.text) && /\b\d{1,5}\b/.test(normalizeText(inbound.text || ""));
    const quoteContextActive =
      /^(quote_|product_action)/.test(String(awaitingAction || "")) ||
      /(quote_recall|quote_generated|price_request|quote_starter)/.test(previousIntentForQuoteFlow);
    const rememberedSelectedProductName = String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || "").trim();
    const rememberedSelectedProductId = String(nextMemory.last_selected_product_id || previousMemory?.last_selected_product_id || "").trim();
    const quoteProceedFromMemory =
      (isQuoteProceedIntent(inbound.text) ||
        (isQuoteResumeIntent(inbound.text) && quoteContextActive) ||
        isQuantityUpdateIntent(inbound.text) ||
        (hasBareQuantity(inbound.text) && quoteContextActive) ||
        asksQuoteWithNumber ||
        (isAffirmativeIntentApp(inbound.text, normalizeText) && /(price_request|quote_starter|recommendation_request)/.test(previousIntentForQuoteFlow))) &&
      !inboundIsTechnicalSpec &&
      Boolean(nextMemory.last_product_name || nextMemory.last_product_id || rememberedSelectedProductName || rememberedSelectedProductId);
    const resumeQuoteFromContext =
      isContactInfoBundleApp({ text: inbound.text, extractEmail, extractCustomerPhone }) &&
      shouldAutoQuote(`${recentUserContext}\n${inbound.text}`);
    const forceBundleQuoteIntake =
      bundleOverrideApplied ||
      String(nextMemory.last_intent || previousMemory?.last_intent || "") === "quote_bundle_request" ||
      (
        String(nextMemory.awaiting_action || previousMemory?.awaiting_action || "") === "strict_quote_data" &&
        false
      );

    if (
      forceBundleQuoteIntake ||
      (
        !handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByTechSheet && !handledByQuoteStarter && !handledByRecall &&
        (shouldAutoQuote(inbound.text) || resumeQuoteFromContext || quoteProceedFromMemory || concreteQuoteIntent)
      )
    ) {
      try {
        if (forceBundleQuoteIntake) {
          console.log("[quote-bundle] start", { inbound: String(originalInboundText || ""), intent: String(nextMemory.last_intent || "") });
        }
        const products = await fetchCatalogRows("id,name,brand,category,base_price_usd,price_currency,source_payload,product_url,image_url", 360, false);

        const quoteSourceText = resumeQuoteFromContext
          ? `${recentUserContext}\n${inbound.text}`
          : quoteProceedFromMemory
            ? `${String(nextMemory.last_product_name || "")}\n${inbound.text}`
            : inbound.text;
        const commercialProducts = (Array.isArray(products) ? products : []).filter((r: any) => isCommercialCatalogRow(r));
        const pricedProducts = commercialProducts.filter((r: any) => Number(r?.base_price_usd || 0) > 0);
        const quoteMatchPool = quoteProceedFromMemory ? commercialProducts : (pricedProducts.length ? pricedProducts : commercialProducts);
        const selectedById = String(nextMemory.last_selected_product_id || previousMemory?.last_selected_product_id || "").trim();
        const selectedByName = String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || "").trim();
        const selectedProduct = selectedById
          ? (commercialProducts.find((p: any) => String(p?.id || "").trim() === selectedById) || null)
          : (selectedByName ? findCatalogProductByName(commercialProducts || [], selectedByName) : null);
        const continuationIntent = isSameQuoteContinuationIntent(quoteSourceText);
        const explicitModelTokens = extractModelLikeTokens(quoteSourceText);
        const explicitModelProducts = findExplicitModelProducts(quoteSourceText, commercialProducts || []);
        const explicitModelProduct = findExactModelProduct(quoteSourceText, commercialProducts || []);
        const matchedProduct = explicitModelProduct || ((quoteProceedFromMemory && selectedProduct)
          ? selectedProduct
          : pickBestCatalogProduct(quoteSourceText, quoteMatchPool || []));
        const rememberedProduct = findCatalogProductByName(commercialProducts || [], String(nextMemory.last_product_name || ""));
        const wantsMulti = forceBundleQuoteIntake || isMultiProductQuoteIntent(quoteSourceText);
        const requestedBundleModels = String(quoteSourceText || "")
          .replace(/^\s*cotiz(?:ar|a|acion|ación)?\s*/i, "")
          .split(/[;,\n|]+/)
          .map((seg) => String(seg || "").trim())
          .map((seg) => String(seg.match(/[A-Z0-9][A-Z0-9\/-]{2,}/i)?.[0] || "").trim())
          .filter((tok) => /\d/.test(tok))
          .filter((tok, idx, arr) => {
            const key = normalizeCatalogQueryText(tok).replace(/[^a-z0-9]/g, "");
            return key && arr.findIndex((x) => normalizeCatalogQueryText(x).replace(/[^a-z0-9]/g, "") === key) === idx;
          });
        const requestedBundleModelKeys = new Set(
          requestedBundleModels.map((tok) => normalizeCatalogQueryText(tok).replace(/[^a-z0-9]/g, "")).filter(Boolean)
        );
        const bundleOptionsCurrent =
          (Array.isArray(nextMemory?.quote_bundle_options_current) ? nextMemory.quote_bundle_options_current : [])
            .concat(Array.isArray(previousMemory?.quote_bundle_options_current) ? previousMemory.quote_bundle_options_current : [])
            .filter((o: any, idx: number, arr: any[]) => {
              const key = String(o?.id || o?.product_id || o?.raw_name || o?.name || "").trim();
              if (!key) return false;
              return arr.findIndex((x: any) => String(x?.id || x?.product_id || x?.raw_name || x?.name || "").trim() === key) === idx;
            });
        const bundleSelectedIds =
          (Array.isArray(nextMemory?.quote_bundle_selected_ids) ? nextMemory.quote_bundle_selected_ids : [])
            .concat(Array.isArray(previousMemory?.quote_bundle_selected_ids) ? previousMemory.quote_bundle_selected_ids : [])
            .map((x: any) => String(x || "").trim())
            .filter(Boolean)
            .filter((id: string, idx: number, arr: string[]) => arr.indexOf(id) === idx);
        const pendingBundleOptions =
          bundleOptionsCurrent
            .concat(Array.isArray(nextMemory?.quote_bundle_options) ? nextMemory.quote_bundle_options : [])
            .concat(Array.isArray(nextMemory?.pending_product_options) ? nextMemory.pending_product_options : [])
            .concat(Array.isArray(nextMemory?.last_recommended_options) ? nextMemory.last_recommended_options : [])
            .concat(Array.isArray(previousMemory?.quote_bundle_options) ? previousMemory.quote_bundle_options : [])
            .concat(Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [])
            .concat(Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : [])
            .filter((o: any, idx: number, arr: any[]) => {
              const key = String(o?.id || o?.product_id || o?.raw_name || o?.name || "").trim();
              if (!key) return false;
              return arr.findIndex((x: any) => String(x?.id || x?.product_id || x?.raw_name || x?.name || "").trim() === key) === idx;
            });
        const resolvePendingOptionToProduct = (opt: any): any => {
          const byId = String(opt?.id || opt?.product_id || "").trim();
          if (byId) {
            const idHit = (commercialProducts || []).find((p: any) => String(p?.id || "").trim() === byId);
            if (idHit) return idHit;
          }
          const label = String(opt?.raw_name || opt?.name || "").trim();
          if (!label) return null;
          const direct = findCatalogProductByName(commercialProducts || [], label);
          if (direct) return direct;
          const modelCandidate = String(label.match(/[A-Z0-9][A-Z0-9\/-]{2,}/i)?.[0] || "").trim();
          if (modelCandidate) {
            const byExact = findExactModelProduct(modelCandidate, commercialProducts || []);
            if (byExact) return byExact;
            const byBest = pickBestCatalogProduct(modelCandidate, commercialProducts || []);
            if (byBest) return byBest;
          }
          return null;
        };
        const selectedProductsFromPending = forceBundleQuoteIntake
          ? (
              (requestedBundleModelKeys.size > 0)
                ? (bundleOptionsCurrent.length ? bundleOptionsCurrent : pendingBundleOptions)
                    .filter((o: any) => {
                      const raw = String(o?.raw_name || o?.name || "").trim();
                      const modelToken = String(raw.match(/[A-Z0-9][A-Z0-9\/-]{2,}/i)?.[0] || raw).trim();
                      const key = normalizeCatalogQueryText(modelToken).replace(/[^a-z0-9]/g, "");
                      return key && requestedBundleModelKeys.has(key);
                    })
                    .map((o: any) => resolvePendingOptionToProduct(o))
                    .filter(Boolean)
                : (bundleSelectedIds.length > 0)
                    ? bundleSelectedIds
                        .map((id: string) => (commercialProducts || []).find((p: any) => String(p?.id || "").trim() === id))
                        .filter(Boolean)
                : ((extractModelLikeTokens(quoteSourceText).length >= 2)
                    ? []
                    : (bundleOptionsCurrent.length
                        ? bundleOptionsCurrent
                        : pendingBundleOptions
                      ).map((o: any) => resolvePendingOptionToProduct(o)).filter(Boolean))
            )
          : [];
        const rememberedQuoteProductName = String(
          nextMemory.last_quote_product_name ||
          previousMemory?.last_quote_product_name ||
          nextMemory.last_selected_product_name ||
          previousMemory?.last_selected_product_name ||
          ""
        ).trim();
        const rememberedQuoteProduct = rememberedQuoteProductName
          ? findCatalogProductByName(commercialProducts || [], rememberedQuoteProductName)
          : null;
        let selectedProducts = selectedProductsFromPending.length
          ? selectedProductsFromPending
          : explicitModelProducts.length
          ? (
              continuationIntent && rememberedQuoteProduct
                ? [rememberedQuoteProduct, ...explicitModelProducts].filter((row: any, idx: number, arr: any[]) => {
                    const id = String(row?.id || "").trim();
                    if (!id) return false;
                    return arr.findIndex((x: any) => String(x?.id || "").trim() === id) === idx;
                  })
                : explicitModelProducts
            )
          : matchedProduct || rememberedProduct
            ? [matchedProduct || rememberedProduct]
            : [];

        if (forceBundleQuoteIntake) {
          const explicitIndexes = extractBundleOptionIndexesApp(quoteSourceText).slice(0, 3);
          if (explicitIndexes.length >= 2) {
            const selectionSource = pickBundleOptionSourceByIndexesApp(explicitIndexes, [bundleOptionsCurrent, pendingBundleOptions]);
            const byIndex = explicitIndexes
              .filter((n) => n >= 1 && n <= selectionSource.length)
              .map((n) => resolvePendingOptionToProduct(selectionSource[n - 1]))
              .filter(Boolean)
              .filter((row: any, idx: number, arr: any[]) => {
                const id = String(row?.id || "").trim();
                if (!id) return false;
                return arr.findIndex((x: any) => String(x?.id || "").trim() === id) === idx;
              })
              .slice(0, 3);
            if (byIndex.length >= 2) {
              selectedProducts = byIndex;
              nextMemory.bundle_quote_count = byIndex.length;
            }
          }
        }

        if (forceBundleQuoteIntake && !selectedProducts.length && pendingBundleOptions.length >= 2) {
          const pendingNames = pendingBundleOptions
            .map((o: any) => String(o?.raw_name || o?.name || "").trim())
            .filter(Boolean);
          if (pendingNames.length >= 2) {
            const rebuilt = findExplicitModelProducts(`cotizar ${pendingNames.join(" ; ")}`, commercialProducts || []);
            if (rebuilt.length) selectedProducts = rebuilt;
          }
        }
        if (forceBundleQuoteIntake) {
          const forcedBundleCount = Number(nextMemory?.bundle_quote_count || previousMemory?.bundle_quote_count || 0);
          if (forcedBundleCount >= 2 && Array.isArray(selectedProducts) && selectedProducts.length > forcedBundleCount) {
            selectedProducts = selectedProducts.slice(0, forcedBundleCount);
          }
          console.log("[quote-bundle] requested vs selected", {
            requested_models: requestedBundleModels,
            selected_models: (selectedProducts || []).map((p: any) => String(p?.name || "")).filter(Boolean),
            selected_count: Array.isArray(selectedProducts) ? selectedProducts.length : 0,
          });
          console.log("[quote-bundle] selected options", {
            pending_options: pendingBundleOptions.length,
            selected_products: selectedProducts.length,
            sample_pending: pendingBundleOptions.slice(0, 3).map((o: any) => String(o?.raw_name || o?.name || "")).filter(Boolean),
            sample_selected: selectedProducts.slice(0, 3).map((p: any) => String(p?.name || "")).filter(Boolean),
          });
        }

        if (!handledByQuoteIntake && continuationIntent && explicitModelTokens.length >= 2 && explicitModelProducts.length < explicitModelTokens.length) {
          const foundNames = explicitModelProducts.map((p: any) => String(p?.name || "").trim()).filter(Boolean);
          reply = foundNames.length
            ? `Entendí que quieres agregar más productos a la misma cotización, pero solo identifiqué: ${foundNames.join(", ")}. Reenvíame los modelos exactos separados por coma (ej: RC31P3, RC31P30).`
            : "Entendí que quieres agregar más productos a la misma cotización, pero no pude identificar esos modelos. Reenvíamelos exactos separados por coma (ej: RC31P3, RC31P30).";
          handledByQuoteIntake = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }

        if (selectedProducts.length) {
          if (forceBundleQuoteIntake) console.log("[quote-bundle] build quote start", { selected: selectedProducts.length });
          const bundleDiscarded: Array<{ product: string; reason: string }> = [];
          let bundleValidCount = 0;
          const transcript = Array.isArray(existingConv?.transcript) ? existingConv.transcript : [];
          const latestUserLines = transcript
            .filter((m: any) => m?.role === "user" && m?.content)
            .slice(-8)
            .map((m: any) => String(m.content || ""));
          const combinedUserContext = `${latestUserLines.join("\n")}\n${inbound.text}`;

          const qtyFromOriginalInbound = extractQuoteRequestedQuantityApp({ text: originalInboundText, normalizeText, parseTechnicalSpecQuery });
          const qtyFromInbound = extractQuoteRequestedQuantityApp({ text: inbound.text, normalizeText, parseTechnicalSpecQuery });
          const qtyFromSource = extractQuoteRequestedQuantityApp({ text: quoteSourceText, normalizeText, parseTechnicalSpecQuery });
          const defaultQuantity = Math.max(1, qtyFromOriginalInbound || qtyFromInbound || qtyFromSource || 1);
          const perProductQty = extractPerProductQuantities(
            quoteSourceText,
            selectedProducts.map((p: any) => ({ id: String(p.id), name: String(p.name || "") }))
          );
          const uniformHint = hasUniformQuantityHintApp(quoteSourceText, normalizeText);

          let previousDraftForCustomer: any = null;
          const shouldRecoverCustomerFromDraft =
            continuationIntent || explicitModelProducts.length > 0 || wantsMulti || quoteProceedFromMemory;
          if (shouldRecoverCustomerFromDraft) {
            const { data: recentDrafts } = await supabase
              .from("agent_quote_drafts")
              .select("id,customer_phone,customer_name,customer_email,company_name,location,payload,created_at")
              .eq("created_by", ownerId)
              .eq("agent_id", String(agent.id))
              .order("created_at", { ascending: false })
              .limit(40);
            const inboundPhone = normalizePhone(inbound.from || "");
            const inboundTail = phoneTail10(inbound.from || "");
            const draftList = Array.isArray(recentDrafts) ? recentDrafts : [];
            previousDraftForCustomer =
              draftList.find((d: any) => normalizePhone(String(d?.customer_phone || "")) === inboundPhone) ||
              draftList.find((d: any) => phoneTail10(String(d?.customer_phone || "")) === inboundTail) ||
              null;
          }
          const previousDraftPayload =
            previousDraftForCustomer?.payload && typeof previousDraftForCustomer.payload === "object"
              ? previousDraftForCustomer.payload
              : {};

          if (wantsMulti && Object.keys(perProductQty).length < selectedProducts.length && !uniformHint) {
            const listNames = selectedProducts.map((p: any) => String(p?.name || "")).filter(Boolean);
            reply = `Para cotizar los ${selectedProducts.length} productos, confirmame la cantidad de cada uno. Ejemplo: ${listNames[0] || "Producto 1"}: 2; ${listNames[1] || "Producto 2"}: 1; ${listNames[2] || "Producto 3"}: 3. Si es la misma cantidad para todos, escribe: cantidad ${defaultQuantity || 1} para todos.`;
            handledByQuoteIntake = true;
            billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
          }

          const customerEmail =
            extractEmail(combinedUserContext) ||
            String(nextMemory.customer_email || "") ||
            String(previousDraftForCustomer?.customer_email || "");
          const customerName =
            extractCustomerName(combinedUserContext, inbound.pushName || "") ||
            String(nextMemory.customer_name || "") ||
            String(previousDraftForCustomer?.customer_name || "");
          const inboundPhoneFallback = normalizePhone(String(inbound.from || ""));
          const customerPhone =
            extractCustomerPhone(combinedUserContext, inbound.from) ||
            String(nextMemory.customer_phone || "") ||
            String(previousDraftForCustomer?.customer_phone || "") ||
            inboundPhoneFallback;
          const customerCityRaw =
            extractLabeledValue(combinedUserContext, ["ciudad", "city"]) ||
            String(previousDraftForCustomer?.location || (previousDraftPayload as any)?.customer_city || "");
          const customerCity = normalizeCityLabel(customerCityRaw);
          const customerCompany =
            extractLabeledValue(combinedUserContext, ["empresa", "company", "razon social"]) ||
            String((previousDraftPayload as any)?.customer_company || previousDraftForCustomer?.company_name || "");
          const customerNit =
            extractLabeledValue(combinedUserContext, ["nit"]) ||
            String((previousDraftPayload as any)?.customer_nit || "");
          const customerContact =
            extractLabeledValue(combinedUserContext, ["contacto"]) ||
            String((previousDraftPayload as any)?.customer_contact || previousDraftForCustomer?.customer_name || "");

          const rememberedCrmCompany = String(
            nextMemory.crm_company ||
            previousMemory?.crm_company ||
            nextMemory.commercial_company_name ||
            previousMemory?.commercial_company_name ||
            ""
          ).trim();
          const rememberedCrmNit = String(
            nextMemory.crm_nit ||
            previousMemory?.crm_nit ||
            nextMemory.commercial_nit ||
            previousMemory?.commercial_nit ||
            ""
          ).replace(/\D/g, "").trim();
          const rememberedCrmContact = String(
            nextMemory.crm_contact_name ||
            previousMemory?.crm_contact_name ||
            nextMemory.commercial_customer_name ||
            previousMemory?.commercial_customer_name ||
            nextMemory.customer_name ||
            previousMemory?.customer_name ||
            ""
          ).trim();
          const rememberedCrmEmail = String(
            nextMemory.crm_contact_email ||
            previousMemory?.crm_contact_email ||
            nextMemory.customer_email ||
            previousMemory?.customer_email ||
            ""
          ).trim();
          const rememberedCrmPhone = String(
            nextMemory.crm_contact_phone ||
            previousMemory?.crm_contact_phone ||
            nextMemory.customer_phone ||
            previousMemory?.customer_phone ||
            ""
          ).trim();

          const canReusePriorQuoteIdentity =
            continuationIntent &&
            explicitModelProducts.length > 0 &&
            Boolean(previousDraftForCustomer?.id);

          const effectiveCustomerCity = normalizeCityLabel(
            String(customerCity || previousDraftForCustomer?.location || (previousDraftPayload as any)?.customer_city || "Bogota")
          );
          const effectiveCustomerCompany = String(
            customerCompany ||
            rememberedCrmCompany ||
            (previousDraftPayload as any)?.customer_company ||
            previousDraftForCustomer?.company_name ||
            cfg?.company_name ||
            "Cliente WhatsApp"
          ).trim();
          const effectiveCustomerNit = String(
            customerNit ||
            rememberedCrmNit ||
            (previousDraftPayload as any)?.customer_nit ||
            "N/A"
          ).trim();
          const effectiveCustomerContact = String(
            customerContact || rememberedCrmContact || customerName || (previousDraftPayload as any)?.customer_contact || previousDraftForCustomer?.customer_name || "Contacto"
          ).trim();
          const effectiveCustomerEmail = String(customerEmail || rememberedCrmEmail || previousDraftForCustomer?.customer_email || "").trim();
          const effectiveCustomerPhone = String(customerPhone || rememberedCrmPhone || previousDraftForCustomer?.customer_phone || inboundPhoneFallback).trim();

          const missingFields: string[] = [];
          if (!isPresent(effectiveCustomerCity)) missingFields.push("ciudad");
          if (!isPresent(effectiveCustomerCompany)) missingFields.push("empresa");
          if (!isPresent(effectiveCustomerNit)) missingFields.push("NIT");
          if (!isPresent(effectiveCustomerContact)) missingFields.push("contacto");
          if (!isPresent(effectiveCustomerEmail)) missingFields.push("correo");
          if (!isPresent(effectiveCustomerPhone)) missingFields.push("celular");

          if (canReusePriorQuoteIdentity) {
            missingFields.length = 0;
          }

          nextMemory.customer_name = effectiveCustomerContact || nextMemory.customer_name;
          nextMemory.customer_phone = effectiveCustomerPhone || nextMemory.customer_phone;
          nextMemory.customer_email = effectiveCustomerEmail || nextMemory.customer_email;

          const requireQuoteContactBundle = String(process.env.WHATSAPP_REQUIRE_QUOTE_CONTACT_BUNDLE || "false").toLowerCase() === "true";
          if (!handledByQuoteIntake && missingFields.length && requireQuoteContactBundle) {
            reply = `Para formalizar la cotizacion me faltan: ${missingFields.join(", ")}. Enviamelos en un solo mensaje (ejemplo: Ciudad: Bogota, Empresa: ..., NIT: ..., Contacto: ..., Correo: ..., Celular: ...).`;
            nextMemory.awaiting_action = "quote_contact_bundle";
            handledByQuoteIntake = true;
            billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
          } else if (missingFields.length) {
            missingFields.length = 0;
          }

          if (!missingFields.length && !handledByQuoteIntake && selectedProducts.length === 1) {
            const selected = selectedProducts[0] as any;
            const requestedQty = Math.max(1,
              extractQuoteRequestedQuantityApp({ text: originalInboundText, normalizeText, parseTechnicalSpecQuery }) ||
              extractQuoteRequestedQuantityApp({ text: inbound.text, normalizeText, parseTechnicalSpecQuery }) ||
              extractQuoteRequestedQuantityApp({ text: quoteSourceText, normalizeText, parseTechnicalSpecQuery })
            );
            const cityPrices = (selected as any)?.source_payload?.prices_cop || {};
            const cityPriceCop = Number(cityPrices?.[effectiveCustomerCity] || 0);
            const basePrice = Number(selected?.base_price_usd || 0);
            if (!(basePrice > 0) && !(cityPriceCop > 0)) {
              reply = `Confirmo ${requestedQty} unidades de ${String(selected?.name || "ese producto")}. Este modelo no tiene precio base USD cargado todavía, por eso no puedo generar el PDF de cotización en este momento. Si me compartes precio base o autorizas cargarlo, te la genero de inmediato.`;
              handledByQuoteIntake = true;
              billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            }
          }

          if (!missingFields.length && !handledByQuoteIntake) {
            const trm = await getOrFetchTrm(supabase, ownerId, (agent as any)?.tenant_id || null);
            const trmRate = Number(trm?.rate || 0);

            if (trmRate > 0) {
              for (const selected of selectedProducts) {
                nextMemory.last_product_name = String((selected as any)?.name || nextMemory.last_product_name || "");
                nextMemory.last_product_id = String((selected as any)?.id || nextMemory.last_product_id || "");
                nextMemory.last_selected_product_name = String((selected as any)?.name || nextMemory.last_selected_product_name || "");
                nextMemory.last_selected_product_id = String((selected as any)?.id || nextMemory.last_selected_product_id || "");
                nextMemory.last_selection_at = new Date().toISOString();
                let quantity =
                  Number(perProductQty[String((selected as any).id)]) ||
                  (uniformHint ? defaultQuantity : 0) ||
                  defaultQuantity ||
                  1;
                if (selectedProducts.length === 1) {
                  const explicitQty = Math.max(
                    extractQuoteRequestedQuantityApp({ text: originalInboundText, normalizeText, parseTechnicalSpecQuery }),
                    extractQuoteRequestedQuantityApp({ text: inbound.text, normalizeText, parseTechnicalSpecQuery })
                  );
                  if (explicitQty > 1) quantity = explicitQty;
                }
                const cityPrices = (selected as any)?.source_payload?.prices_cop || {};
                const cityPriceCop = Number(cityPrices?.[effectiveCustomerCity] || 0);
                const bogotaPriceCop = Number(cityPrices?.bogota || 0);
                const selectedUnitCop = cityPriceCop > 0 ? cityPriceCop : bogotaPriceCop;
                const basePriceUsdRaw = Number((selected as any)?.base_price_usd || 0);
                const basePriceUsd = basePriceUsdRaw > 0
                  ? basePriceUsdRaw
                  : (selectedUnitCop > 0 && trmRate > 0 ? Number((selectedUnitCop / trmRate).toFixed(6)) : 0);
                if (!(basePriceUsd > 0) && !(selectedUnitCop > 0)) {
                  if (forceBundleQuoteIntake) {
                    bundleDiscarded.push({ product: String((selected as any)?.name || ""), reason: "missing_price_usd_and_city_price" });
                  }
                  continue;
                }
                if (forceBundleQuoteIntake) bundleValidCount += 1;

                const totalCop = selectedUnitCop > 0
                  ? Number((selectedUnitCop * quantity).toFixed(2))
                  : Number((basePriceUsd * trmRate * quantity).toFixed(2));
                const selectedNameForQuote = String((selected as any).name || "");
                const quoteDescriptionForDraft = buildQuoteItemDescription(selected, selectedNameForQuote);
                const productImageDataUrlForDraft = await resolveProductImageDataUrl(selected);
                const draftPayload = {
                  tenant_id: (agent as any)?.tenant_id || null,
                  created_by: ownerId,
                  agent_id: String(agent.id),
                  customer_name: effectiveCustomerContact || null,
                  customer_email: effectiveCustomerEmail || null,
                  customer_phone: effectiveCustomerPhone || null,
                  company_name: String(effectiveCustomerCompany || cfg?.company_name || cfg?.company_desc || "Avanza Balanzas").slice(0, 120) || "Avanza Balanzas",
                  location: effectiveCustomerCity || null,
                  product_catalog_id: (selected as any).id,
                  product_name: String((selected as any).name || ""),
                  base_price_usd: basePriceUsd,
                  trm_rate: trmRate,
                  total_cop: totalCop,
                  notes: selectedUnitCop > 0
                    ? `Cotizacion automatica por WhatsApp - precio ciudad ${effectiveCustomerCity}`
                    : "Cotizacion automatica por WhatsApp",
                  payload: {
                    quantity,
                    trm_date: trm.rate_date,
                    trm_source: trm.source,
                    price_currency: String((selected as any)?.price_currency || "USD"),
                    customer_city: effectiveCustomerCity || null,
                    customer_nit: effectiveCustomerNit || null,
                    customer_company: effectiveCustomerCompany || null,
                    customer_contact: effectiveCustomerContact || null,
                    customer_phone: effectiveCustomerPhone || null,
                    item_description: quoteDescriptionForDraft,
                    item_image_data_url: productImageDataUrlForDraft || "",
                    unit_price_cop: selectedUnitCop > 0 ? selectedUnitCop : null,
                    automation: "evolution_webhook",
                  },
                  status: "analysis",
                };

                let { data: draft, error: draftError } = await supabase
                  .from("agent_quote_drafts")
                  .insert(draftPayload)
                  .select("id")
                  .single();

                if (draftError && isQuoteDraftStatusConstraintError(draftError)) {
                  const legacyPayload = {
                    ...draftPayload,
                    status: "draft",
                    payload: {
                      ...(draftPayload.payload || {}),
                      crm_stage: "analysis",
                      crm_stage_updated_at: new Date().toISOString(),
                    },
                  } as any;
                  const retry = await supabase
                    .from("agent_quote_drafts")
                    .insert(legacyPayload)
                    .select("id")
                    .single();
                  draft = retry.data as any;
                  draftError = retry.error as any;
                }

                if (draftError && forceBundleQuoteIntake) {
                  bundleDiscarded.push({ product: String((selected as any)?.name || ""), reason: `draft_insert_failed:${String(draftError?.message || "unknown")}` });
                }

                if (!draftError && draft?.id) {
                  nextMemory.last_quote_draft_id = String(draft.id);
                  nextMemory.last_quote_product_name = String((selected as any).name || "");
                  nextMemory.awaiting_action = "none";
                  const productImageDataUrl = await resolveProductImageDataUrl(selected);
                  const quoteDescription = await buildQuoteItemDescriptionAsync(selected, String((selected as any).name || ""));
                  const pdfBase64 = await buildQuotePdf({
                    draftId: String(draft.id),
                    companyName: String(draftPayload.company_name || "Avanza Balanzas"),
                    customerName: effectiveCustomerContact || "",
                    customerEmail: effectiveCustomerEmail || "",
                    customerPhone: effectiveCustomerPhone || "",
                    productName: String((selected as any).name || ""),
                    quantity,
                    basePriceUsd,
                    trmRate,
                    totalCop,
                    city: effectiveCustomerCity,
                    nit: effectiveCustomerNit,
                    itemDescription: quoteDescription,
                    imageDataUrl: productImageDataUrl,
                    notes: String(draftPayload.notes || ""),
                  });

                  autoQuoteDocs.push({
                    draftId: String(draft.id),
                    fileName: `cotizacion-${String(draft.id).slice(0, 8)}.pdf`,
                    pdfBase64,
                    quantity,
                    productName: String((selected as any).name || ""),
                    itemDescription: quoteDescription,
                    imageDataUrl: productImageDataUrl,
                    basePriceUsd,
                    trmRate,
                    totalCop,
                  });
                }
              }

              if (autoQuoteDocs.length === 1) {
                const q1 = autoQuoteDocs[0]?.quantity || 1;
                reply = `Confirmo ${q1} unidades de ${String((selectedProducts[0] as any)?.name || "el producto")}. Ya generé tu cotización con la TRM de hoy y te envío el PDF por este chat ahora mismo.`;
              } else if (autoQuoteDocs.length > 1) {
                const bundlePdfBase64 = await buildBundleQuotePdf({
                  bundleId: `B-${new Date().toISOString().slice(0, 10)}-${String(autoQuoteDocs[0].draftId).slice(0, 6)}`,
                  companyName: String(cfg?.company_name || cfg?.company_desc || "Avanza Balanzas").slice(0, 120) || "Avanza Balanzas",
                  customerName: effectiveCustomerContact || "",
                  customerEmail: effectiveCustomerEmail || "",
                  customerPhone: effectiveCustomerPhone || "",
                  items: autoQuoteDocs.map((d) => ({
                    productName: d.productName,
                    quantity: d.quantity,
                    basePriceUsd: d.basePriceUsd,
                    trmRate: d.trmRate,
                    totalCop: d.totalCop,
                    description: d.itemDescription,
                    imageDataUrl: d.imageDataUrl,
                  })),
                });
                autoQuoteBundle = {
                  fileName: `cotizacion-consolidada-${String(autoQuoteDocs[0].draftId).slice(0, 8)}.pdf`,
                  pdfBase64: bundlePdfBase64,
                  draftIds: autoQuoteDocs.map((d) => d.draftId),
                };

                const byQty = autoQuoteDocs.every((d) => d.quantity === autoQuoteDocs[0].quantity);
                reply = byQty
                  ? `Listo. Ya genere la cotizacion consolidada de ${autoQuoteDocs.length} productos (cantidad ${autoQuoteDocs[0].quantity} cada una) con la TRM de hoy. Te envio un solo PDF por este chat ahora mismo.`
                  : `Listo. Ya genere la cotizacion consolidada de ${autoQuoteDocs.length} productos con las cantidades que me indicaste y la TRM de hoy. Te envio un solo PDF por este chat ahora mismo.`;
              }
              if (forceBundleQuoteIntake) {
                console.log("[quote-bundle] build quote done", {
                  received_products: selectedProducts.length,
                  valid_products: bundleValidCount,
                  discarded_products: bundleDiscarded.length,
                  discarded_reasons: bundleDiscarded,
                  docs: autoQuoteDocs.length,
                  bundle: Boolean(autoQuoteBundle),
                });
              }
              if (forceBundleQuoteIntake && selectedProducts.length >= 2 && autoQuoteDocs.length === 0 && !autoQuoteBundle && !String(reply || "").trim()) {
                const hasDraftInsertFailure = bundleDiscarded.some((d) => String(d?.reason || "").startsWith("draft_insert_failed:"));
                reply = hasDraftInsertFailure
                  ? "No pude generar la cotización múltiple por un error interno al guardar la cotización. Intenta nuevamente en unos segundos."
                  : "No pude generar la cotización múltiple con esas referencias porque faltan datos de catálogo/precio para una o más referencias.";
                handledByQuoteIntake = true;
                billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
              }
              if (reply) billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            } else {
              reply = "No pude consultar la TRM de hoy en este momento. Intenta de nuevo en 1 minuto y te genero el PDF por este WhatsApp.";
              handledByQuoteIntake = true;
              billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            }
          }
        } else if (resumeQuoteFromContext || shouldAutoQuote(inbound.text)) {
          const pricedNames = pricedProducts.slice(0, 8).map((p: any) => String(p?.name || "").trim()).filter(Boolean);
          reply = pricedNames.length
            ? `Para generar la cotizacion, elige un producto exacto de este listado: ${pricedNames.join("; ")}.`
            : "No encontre productos con precio cargado para cotizar en este momento.";
          handledByQuoteIntake = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
      } catch (autoErr: any) {
        if (forceBundleQuoteIntake) console.warn("[quote-bundle] error", autoErr?.message || autoErr);
        console.warn("[evolution-webhook] auto_quote_failed", autoErr?.message || autoErr);
      }
    }

    if (bundleOverrideApplied && !handledByQuoteIntake && !autoQuoteDocs.length && !String(reply || "").trim()) {
      reply = "Perfecto. Estoy procesando la cotización múltiple con las referencias seleccionadas. Te la envío enseguida por este WhatsApp.";
      nextMemory.awaiting_action = "quote_bundle_request";
      nextMemory.last_intent = "quote_bundle_request";
      handledByQuoteIntake = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }

    if (!autoQuoteDocs.length && !handledByGreeting && !handledByRecall && !handledByTechSheet && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByQuoteStarter && !handledByQuoteIntake) {
      const selectedProductForGuide = String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || "").trim();
      const selectedAtMs = Date.parse(String(nextMemory.last_selection_at || previousMemory?.last_selection_at || ""));
      const selectedStillActive = Boolean(selectedProductForGuide) && Number.isFinite(selectedAtMs) && (Date.now() - selectedAtMs) <= 30 * 60 * 1000;
      const inboundBulkQuoteCommand = /\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/.test(normalizeText(originalInboundText));
      const skipSingleProductFallback =
        String(nextMemory.last_intent || previousMemory?.last_intent || "") === "quote_bundle_request" ||
        false;
      if (selectedStillActive && !inboundTechnicalSpec && !inboundBulkQuoteCommand && !skipSingleProductFallback) {
          reply = `¿Quieres ficha técnica o cotización de ${selectedProductForGuide}?`;
          nextMemory.awaiting_action = "product_action";
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      } else {
      const catalogRows = await fetchCatalogRows("name,brand,category,source_payload,product_url", 120, false);
      const allCatalogRows = Array.isArray(catalogRows) ? catalogRows : [];
      const commercialRows = allCatalogRows.filter((r: any) => isCommercialCatalogRow(r));
      const rememberedCategoryIntent = String(previousMemory?.last_category_intent || "").trim();
      const deterministicOnly =
        STRICT_WHATSAPP_MODE ||
        isTechnicalSpecQuery(inbound.text) ||
        isFeatureQuestionIntent(inbound.text) ||
        isStrictCatalogIntent(inbound.text) ||
        (isCategoryFollowUpIntent(inbound.text) && Boolean(rememberedCategoryIntent)) ||
        isConsistencyChallengeIntent(inbound.text);

      if (deterministicOnly) {
        const technicalSpecQuery = parseTechnicalSpecQuery(inbound.text);
        const requestedCategory = normalizeText(String(technicalSpecQuery ? "balanzas" : (detectCatalogCategoryIntent(inbound.text) || rememberedCategoryIntent || "")));
        const categoryScopedCommercial = requestedCategory ? scopeCatalogRows(commercialRows as any, requestedCategory) : commercialRows;
        const categoryScopedAll = requestedCategory ? scopeCatalogRows(allCatalogRows as any, requestedCategory) : allCatalogRows;
        const baseSource = categoryScopedCommercial.length
          ? categoryScopedCommercial
          : (categoryScopedAll.length ? categoryScopedAll : commercialRows);
        const featureTerms = extractFeatureTerms(inbound.text);
        const asksNumericSpec = /\b\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)?\b\s*[x×]\s*\d+(?:[\.,]\d+)?/.test(normalizeCatalogQueryText(inbound.text || ""));
        const asksFeatureLike = isFeatureQuestionIntent(inbound.text) || asksNumericSpec;
        if (technicalSpecQuery) nextMemory.last_technical_spec_query = originalInboundText;

        if (asksFeatureLike && baseSource.length) {
          const numericRanked = technicalSpecQuery
            ? rankCatalogByTechnicalSpec(baseSource as any[], technicalSpecQuery)
            : [];
          const ranked = numericRanked.length
            ? numericRanked.slice(0, 8)
            : rankCatalogByFeature(baseSource as any[], featureTerms.length ? featureTerms : extractCatalogTerms(inbound.text)).slice(0, 6);
          if (ranked.length) {
            const strictNumeric = technicalSpecQuery
              ? (ranked as any[]).filter((x: any) => x.capacityDeltaPct <= 40 && x.readabilityRatio <= 1)
              : [];
            const calibrationPref = detectCalibrationPreference(inbound.text);
            const sourceRowsUnfiltered = technicalSpecQuery
              ? strictNumeric.map((x: any) => x.row)
              : (ranked as any[]).map((x: any) => x.row);
            const sourceRows = calibrationPref
              ? sourceRowsUnfiltered.filter((row: any) => rowMatchesCalibrationPreference(row, calibrationPref))
              : sourceRowsUnfiltered;
            const options = buildNumberedProductOptions(sourceRows, technicalSpecQuery ? 10 : 4);
            if (options.length) {
              const shown = technicalSpecQuery ? options.slice(0, 10) : options;
              const more = Math.max(0, options.length - shown.length);
              reply = [
                technicalSpecQuery
                  ? "Con base en esa referencia técnica, estas son opciones relacionadas del catálogo:"
                  : "Con base en esa referencia técnica, estas son opciones relacionadas del catálogo:",
                ...shown.map((o) => `${o.code}) ${o.name}`),
                ...(more > 0 ? [`- y ${more} más`] : []),
                "",
                "Responde con letra o número (ej.: A o 1) y te envío ficha técnica o cotización.",
              ].join("\n");
              nextMemory.pending_product_options = options;
              nextMemory.awaiting_action = "product_option_selection";
              if (requestedCategory) nextMemory.last_category_intent = requestedCategory;
              billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            } else if (technicalSpecQuery) {
              const closestOptions = buildNumberedProductOptions((ranked as any[]).map((x: any) => x.row), 6);
              if (closestOptions.length) {
                reply = [
                  "No encontré una coincidencia exacta con esa combinación, pero estas son las referencias más cercanas del catálogo:",
                  ...closestOptions.map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Responde con letra o número (ej.: A o 1) y te envío ficha técnica o cotización.",
                ].join("\n");
                nextMemory.pending_product_options = closestOptions;
                nextMemory.awaiting_action = "product_option_selection";
                if (requestedCategory) nextMemory.last_category_intent = requestedCategory;
                billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
              }
            }
          } else if (technicalSpecQuery) {
            const allByCapacity = rankCatalogByTechnicalSpec(baseSource as any[], {
              capacityG: technicalSpecQuery.capacityG,
              readabilityG: Math.max(technicalSpecQuery.readabilityG, 0.000000001),
            })
              .filter((x: any) => x.readabilityRatio <= 1)
              .slice(0, 10);
            const fallbackOptions = buildNumberedProductOptions(allByCapacity.map((x: any) => x.row), 10);
            if (fallbackOptions.length) {
              reply = [
                "No encontré coincidencia exacta para esa referencia. Estas son las más cercanas disponibles:",
                ...fallbackOptions.slice(0, 10).map((o) => `${o.code}) ${o.name}`),
                "",
                "Responde con letra o número (ej.: A o 1) y te envío ficha técnica o cotización.",
              ].join("\n");
              nextMemory.pending_product_options = fallbackOptions;
              nextMemory.awaiting_action = "product_option_selection";
              if (requestedCategory) nextMemory.last_category_intent = requestedCategory;
              billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            } else {
              const capacityOnlyRanked = rankCatalogByTechnicalSpec(baseSource as any[], {
                capacityG: technicalSpecQuery.capacityG,
                readabilityG: Math.max(technicalSpecQuery.readabilityG, 0.000000001),
              })
                .filter((x: any) => x.capacityDeltaPct <= 60)
                .slice(0, 10);
              const capacityOnlyOptions = buildNumberedProductOptions(capacityOnlyRanked.map((x: any) => x.row), 10);
              if (capacityOnlyOptions.length) {
                reply = [
                  "No tengo una referencia que cumpla esa resolución exacta en el catálogo actual.",
                  "Te comparto opciones cercanas por capacidad:",
                  ...capacityOnlyOptions.slice(0, 10).map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Responde con letra o número (ej.: A o 1) y te envío ficha técnica o cotización.",
                ].join("\n");
                nextMemory.pending_product_options = capacityOnlyOptions;
                nextMemory.awaiting_action = "product_option_selection";
              } else {
                const requiresFineReadability = Number(technicalSpecQuery?.readabilityG || 0) > 0 && Number(technicalSpecQuery?.readabilityG || 0) <= 0.001;
                const nearbyGeneralSource = (baseSource as any[])
                  .map((r: any) => {
                    const hay = normalizeText(`${String(r?.name || "")} ${String(r?.specs_text || "")}`);
                    const score = (
                      (/analitic|semi micro|semi-micro|explorer|adventurer|pioneer|precision|exr|exp/.test(hay) ? 4 : 0) +
                      (/lectura minima|resolucion/.test(hay) ? 2 : 0) +
                      (/scout|compass|joyeria|portatil/.test(hay) ? -3 : 0)
                    );
                    return { row: r, hay, score };
                  })
                  .filter((x: any) => {
                    if (!requiresFineReadability) return /analitic|precision|explorer|adventurer|pioneer|scout/.test(x.hay);
                    return /analitic|semi micro|semi-micro|explorer|adventurer|pioneer|precision|exr|exp/.test(x.hay) && !/scout|compass|joyeria|portatil/.test(x.hay);
                  })
                  .sort((a: any, b: any) => b.score - a.score)
                  .map((x: any) => x.row)
                  .slice(0, 8);
                const nearbyGeneral = buildNumberedProductOptions(nearbyGeneralSource, 6);
                if (nearbyGeneral.length) {
                  reply = [
                    "No encontré coincidencia exacta para esa capacidad/resolución. Te comparto opciones analíticas o de precisión disponibles:",
                    ...nearbyGeneral.map((o) => `${o.code}) ${o.name}`),
                    "",
                    "Responde con letra o número (ej.: A o 1) y te envío ficha técnica o cotización.",
                  ].join("\n");
                  nextMemory.pending_product_options = nearbyGeneral;
                  nextMemory.awaiting_action = "product_option_selection";
                } else {
                  reply = "No encontré referencias cercanas para esa capacidad/resolución en el catálogo actual. Si quieres, te ayudo a filtrar por otra capacidad o resolución.";
                  nextMemory.awaiting_action = "technical_refine_prompt";
                }
              }
              if (requestedCategory) nextMemory.last_category_intent = requestedCategory;
              billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            }
          }
        }

        if (!String(reply || "").trim() && !bundleOverrideApplied) {
        const continueWithoutDataInBundle =
          false &&
          (
            String(nextMemory.last_intent || previousMemory?.last_intent || "") === "quote_bundle_request" ||
            String(nextMemory.awaiting_action || previousMemory?.awaiting_action || "") === "strict_quote_data"
          );
        if (continueWithoutDataInBundle) {
          reply = "Perfecto. Para avanzar sin datos, confirma los modelos a cotizar en una sola línea (ej.: cotizar A,B,C,D,E,F,G,H o cotizar 8 cantidad 1 para todos).";
          nextMemory.awaiting_action = "strict_choose_model";
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
        if (!String(reply || "").trim()) {
        const narrowed = filterCatalogByTerms(inbound.text, baseSource as any, requestedCategory);
        const sampleSource = narrowed.length ? narrowed : baseSource;
        const directModelMatch = hasConcreteProductHint(inbound.text)
          ? pickBestCatalogProduct(inbound.text, sampleSource as any)
          : null;
        if (directModelMatch?.id) {
          const directName = String((directModelMatch as any)?.name || "").trim();
          nextMemory.last_product_name = directName;
          nextMemory.last_product_id = String((directModelMatch as any)?.id || "").trim();
          nextMemory.last_product_category = String((directModelMatch as any)?.category || "").trim();
          nextMemory.last_selected_product_name = directName;
          nextMemory.last_selected_product_id = String((directModelMatch as any)?.id || "").trim();
          nextMemory.last_selection_at = new Date().toISOString();
          nextMemory.awaiting_action = "product_action";
          nextMemory.pending_product_options = [];
          reply = [
            `Perfecto, encontré el modelo ${directName}.`,
            "Ahora dime qué deseas con ese modelo:",
            "1) Cotización con TRM y PDF",
            "2) Ficha técnica",
          ].join("\n");
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
        if (!String(reply || "").trim()) {
        const sample = uniqueNormalizedStrings(
          sampleSource.map((r: any) => humanCatalogName(String(r?.name || "").trim())).filter(Boolean),
          2
        )
          .map((n) => (n.length > 56 ? `${n.slice(0, 53)}...` : n))
          ;
        const categoryHint = requestedCategory ? ` Categoría: ${requestedCategory.replace(/_/g, " ")}.` : "";
        reply = sample.length
          ? `Para evitar errores, solo respondo con datos confirmados del catálogo.${categoryHint} Escríbeme el modelo exacto (ej.: ${sample.join(" / ")}).`
          : `Para evitar errores, solo respondo con datos confirmados del catálogo.${categoryHint} No encontré coincidencia exacta. Escríbeme el modelo completo.`;
        if (requestedCategory) nextMemory.last_category_intent = requestedCategory;
        nextMemory.awaiting_action = "tech_product_selection";
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
        }
        }
        if (!String(reply || "").trim() && bundleOverrideApplied) {
          reply = "Perfecto. Estoy procesando la cotización múltiple con las referencias seleccionadas. Te la envío enseguida por este WhatsApp.";
          nextMemory.awaiting_action = "quote_bundle_request";
          nextMemory.last_intent = "quote_bundle_request";
          handledByQuoteIntake = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
      } else {

      const catalogNames = Array.isArray(commercialRows)
        ? commercialRows
            .map((r: any) => `${String(r?.name || "").trim()}${r?.brand ? ` (marca ${String(r.brand).trim()})` : ""}`.trim())
            .filter(Boolean)
        : [];

      const systemPrompt = [
        `Eres ${String(cfg?.identity_name || agent.name || "asistente")}.`,
        String(cfg?.purpose || agent.description || "Asistente virtual"),
        String(cfg?.company_desc || ""),
        String(cfg?.system_prompt || cfg?.important_instructions || ""),
        "Responde en espanol claro y profesional, con mensajes cortos de WhatsApp.",
        "Regla de claridad y contexto: 3-7 lineas segun complejidad, maximo 2 preguntas por mensaje, evita respuestas planas.",
        "Cuando el cliente pregunte para que sirve, diferencias, ventajas, uso o como elegir, responde en formato consultivo: (1) explicacion simple, (2) utilidad practica/impacto, (3) ejemplo breve aplicado, (4) cierre comercial para avanzar.",
        "En cada respuesta comercial, cierra con una accion concreta: elegir modelo, pedir cotizacion, o solicitar ficha tecnica.",
        "Regla estricta de canal: toda entrega de informacion, fichas tecnicas, imagenes y cotizaciones debe ser por este mismo WhatsApp; no ofrecer envio por correo salvo que el cliente lo pida explicitamente.",
        "Regla estricta: solo puedes mencionar, recomendar o cotizar productos presentes en el catalogo cargado abajo. Si el usuario pide algo fuera de catalogo, dilo explicitamente y pide elegir un producto existente.",
        "Nunca afirmes vender carros/vehiculos; solo equipos de pesaje/laboratorio del catalogo.",
        `Catalogo oficial web de referencia: ${CATALOG_REFERENCE_URL} (acceso alterno: ${CATALOG_REFERENCE_SHARE_URL}).`,
        "Si el cliente pide catalogo completo, comparte el enlace del catalogo oficial web antes de listar opciones.",
        "No mencionar ni recomendar marcas fuera de OHAUS dentro de esta instancia.",
        catalogNames.length ? `Catalogo activo (nombres exactos): ${catalogNames.join(" | ")}` : "Catalogo activo: no disponible.",
        "Si no tienes la informacion, dilo sin inventar.",
        docs,
      ]
        .filter(Boolean)
        .join("\n\n");

      const openai = new OpenAI({ apiKey });

      const allMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: inbound.text },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 160,
        messages: allMessages as any,
      });

      reply = String(completion.choices?.[0]?.message?.content || "").trim() || "No tengo una respuesta en este momento.";

      const lcReply = normalizeText(reply);
      if (
        lcReply.includes("no puedo enviar archivos") ||
        lcReply.includes("no puedo enviar cotizaciones completas por este medio") ||
        lcReply.includes("solo puedo enviarla a tu correo") ||
        lcReply.includes("no puedo enviar la cotizacion formal directamente por aqui") ||
        lcReply.includes("modo demo") ||
        lcReply.includes("no puedo enviar el pdf real")
      ) {
        reply = "Si puedo enviarte la cotizacion por este WhatsApp en PDF. Si me confirmas producto(s), cantidad y datos de contacto, la genero y te la envio por aqui.";
      }

      usageTotal = Math.max(0, Number(completion.usage?.total_tokens || 0));
      usageCompletion = Math.max(0, Number(completion.usage?.completion_tokens || 0));
      billedTokens = Math.max(1, Math.min(500, usageCompletion || estimateTokens(reply)));
      }
      }
    }

    if (
      !knownCustomerName &&
      !handledByGreeting &&
      String(reply || "").trim() &&
      !/con quien tengo el gusto/i.test(normalizeText(reply)) &&
      (handledByQuoteIntake || handledByTechSheet || handledByPricing || handledByProductLookup)
    ) {
      reply = `${String(reply || "").trim()}\n\nSi quieres, compárteme tu nombre para dejarlo guardado.`;
      nextMemory.awaiting_action = "capture_name";
    }

    let resolvedRoute =
      autoQuoteDocs.length || autoQuoteBundle || resendPdf
        ? "quote_delivery"
        : technicalDocs.length || sentTechSheet || sentImage
          ? "technical_delivery"
          : handledByRecall
            ? "quote_recall"
            : handledByQuoteIntake
              ? "quote_intake"
              : handledByQuoteStarter
                ? "quote_starter"
                : handledByInventory
                  ? "inventory_category"
                  : handledByTechSheet
                    ? "technical_lookup"
                    : handledByPricing
                      ? "pricing_lookup"
                      : handledByProductLookup
                        ? "product_lookup"
                        : handledByRecommendation
                          ? "recommendation"
                          : handledByHistory
                            ? "history"
                            : handledByGreeting
                              ? (isConversationCloseIntentApp(originalInboundText, normalizeCatalogQueryText) ? "conversation_close" : "greeting")
                              : "fallback";
    let effectiveAwaitingAction = String(nextMemory.awaiting_action || "");
    if (bundleOverrideApplied) {
      effectiveAwaitingAction = "quote_bundle_request";
      resolvedRoute = "quote_bundle";
      nextMemory.awaiting_action = "quote_bundle_request";
      nextMemory.last_intent = "quote_bundle_request";
    }
    nextMemory.last_route = resolvedRoute;
    nextMemory.last_route_at = new Date().toISOString();
    if (bundleOverrideApplied) {
      console.log("[evolution-webhook] post_bundle_override_route", {
        effectiveAwaitingAction,
        resolvedRoute,
      });
    }
    console.log("[evolution-webhook] route_decision", {
      route: resolvedRoute,
      awaitingAction: effectiveAwaitingAction,
      bundle_override_applied: bundleOverrideApplied,
      ignoredAwaitingAction: ignoredAwaitingActionForBundle,
      inboundCategoryIntent: inboundCategoryIntent || null,
      inboundInventoryIntent,
      inboundTechnicalSpec,
    });

    const deliveredSalesAsset = Boolean(autoQuoteDocs.length || autoQuoteBundle || resendPdf || technicalDocs.length || sentQuotePdf || sentTechSheet || sentImage);
    if (!handledByGreeting && deliveredSalesAsset) {
      nextMemory.conversation_status = "open";
    }

    if (!String(reply || "").trim()) {
      const pendingFamiliesNow = Array.isArray(nextMemory?.pending_family_options) && nextMemory.pending_family_options.length > 0;
      const pendingModelsNow = Array.isArray(nextMemory?.pending_product_options) && nextMemory.pending_product_options.length > 0;
      reply = buildGuidedRecoveryMessageApp({
        awaiting: String(nextMemory.awaiting_action || previousMemory?.awaiting_action || ""),
        rememberedProduct: String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || ""),
        hasPendingFamilies: pendingFamiliesNow || (Array.isArray(previousMemory?.pending_family_options) && previousMemory.pending_family_options.length > 0),
        hasPendingModels: pendingModelsNow || (Array.isArray(previousMemory?.pending_product_options) && previousMemory.pending_product_options.length > 0),
        inboundText: inbound.text,
        normalizeText,
      });
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }

    const quoteDeliveryPlanned = Boolean(autoQuoteDocs.length || autoQuoteBundle || resendPdf);
    const techDeliveryPlanned = Boolean(technicalDocs.length);
    if (quoteDeliveryPlanned && String(reply || "").trim()) {
      const multiQuoteDelivery = Boolean(
        autoQuoteBundle ||
        autoQuoteDocs.length > 1 ||
        Number(nextMemory?.bundle_quote_count || previousMemory?.bundle_quote_count || 0) >= 2
      );
      reply = appendAdvisorAppointmentPromptApp(reply, normalizeText);
      reply = multiQuoteDelivery ? appendBundleQuoteClosurePrompt(reply) : appendQuoteClosurePrompt(reply);
      nextMemory.awaiting_action = "conversation_followup";
      if (String(nextMemory.conversation_status || "") !== "closed") nextMemory.conversation_status = "open";
      nextMemory.quote_feedback_due_at = isoAfterHoursApp(24);
    } else if (techDeliveryPlanned && String(reply || "").trim()) {
      reply = appendQuoteClosurePrompt(reply);
      nextMemory.awaiting_action = "conversation_followup";
      if (String(nextMemory.conversation_status || "") !== "closed") nextMemory.conversation_status = "open";
    }

    reply = enforceWhatsAppDelivery(reply, inbound.text);
    reply = withAvaSignature(reply);

    const outboundInstance = String((channel as any)?.config?.evolution_instance_name || inbound.instance || "");
    console.log("[evolution-webhook] outbound instance debug", {
      configInstance: (channel as any)?.config?.evolution_instance_name,
      inboundInstance: inbound.instance,
      outboundInstance,
    });
    if (!outboundInstance) {
      console.warn("[evolution-webhook] ignored: instance_missing", { inboundInstance: inbound.instance || null });
      return NextResponse.json({ ok: true, ignored: true, reason: "instance_missing" });
    }

    // Fallback: si no hay numero propio en config, intentar leerlo desde metadata de la instancia Evolution.
    if (!agentPhone) {
      try {
        const instances = await evolutionService.fetchInstances();
        const meta = (instances || []).find(
          (i: any) => String(i?.name || "").toLowerCase() === outboundInstance.toLowerCase()
        );
        const metaPhoneRaw = String(
          meta?.owner || meta?.number || meta?.wid || meta?.me || meta?.phone || ""
        );
        const metaPhone = normalizePhone(metaPhoneRaw);
        if (metaPhone.length >= 10 && metaPhone.length <= 15) agentPhone = metaPhone;
      } catch {
        // ignore metadata lookup errors
      }
    }

    // Guardrail anti-loop: si inbound coincide con numero propio, ignorar.
    if (agentPhone && inbound.from === agentPhone) {
      console.warn("[evolution-webhook] ignored: self_inbound", {
        inboundFrom: inbound.from,
        selfPhone: agentPhone,
        instance: outboundInstance,
      });
      return NextResponse.json({ ok: true, ignored: true, reason: "self_inbound" });
    }

    const selfHints = [
      agentPhone,
      normalizePhone(String(payload?.destination || "")),
      normalizePhone(String(payload?.data?.destination || "")),
      normalizePhone(String(payload?.sender || "")),
      normalizePhone(String(payload?.data?.sender || "")),
    ]
      .filter((n) => n.length >= 10 && n.length <= 15)
      .filter((n, i, arr) => arr.indexOf(n) === i);

    const selfPhone = selfHints[0] || "";
    const selfSet = new Set(selfHints);

    const toCandidates = [inbound.from, ...(inbound.alternates || [])]
      .map((n) => normalizePhone(String(n || "")))
      .filter((n, i, arr) => n && arr.indexOf(n) === i)
      .filter((n) => !(Boolean(inbound.fromIsLid) && n === inbound.from))
      .filter((n) => !selfSet.has(n))
      .filter((n) => n.length >= 10 && n.length <= 15)
      .sort((a, b) => {
        const aLikelyReal = a.length <= 13 ? 0 : 1;
        const bLikelyReal = b.length <= 13 ? 0 : 1;
        if (aLikelyReal !== bLikelyReal) return aLikelyReal - bLikelyReal;
        return a.length - b.length;
      });

    const jidCandidates = (inbound.jidCandidates || [])
      .map((v) => String(v || "").trim())
      .filter((v, i, arr) => v && arr.indexOf(v) === i)
      .filter((v) => /@(lid|s\.whatsapp\.net|c\.us)$/i.test(v))
      .filter((v) => !selfSet.has(normalizePhone(v)));

    console.log("[evolution-webhook] routing debug", {
      inboundFrom: inbound.from,
      alternates: inbound.alternates || [],
      inboundFromIsLid: Boolean(inbound.fromIsLid),
      selfPhone,
      selfHints,
      toCandidates,
      jidCandidates,
      payloadEvent: payload?.event || payload?.type || payload?.eventName || null,
    });

    let sentTo = "";
    for (const to of toCandidates) {
      console.info("[evolution-webhook] sending reply", {
        outboundInstance,
        to,
        messageChars: reply.length,
        agentId: agent.id,
      });
      try {
        await evolutionService.sendMessage(outboundInstance, to, reply);
        sentTo = to;
        break;
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (msg.includes('"exists":false') || msg.includes("Bad Request")) {
          console.warn("[evolution-webhook] send candidate rejected", { to, reason: "exists_false" });
          continue;
        }
        throw err;
      }
    }

    if (!sentTo) {
      for (const jid of jidCandidates) {
        console.info("[evolution-webhook] sending reply via jid", {
          outboundInstance,
          jid,
          messageChars: reply.length,
          agentId: agent.id,
        });
        try {
          await evolutionService.sendMessageToJid(outboundInstance, jid, reply);
          sentTo = jid;
          break;
        } catch (err: any) {
          const msg = String(err?.message || "");
          if (msg.includes('"exists":false') || msg.includes("Bad Request")) {
            console.warn("[evolution-webhook] send jid candidate rejected", { jid, reason: "exists_false" });
            continue;
          }
          throw err;
        }
      }
    }

    if (!sentTo) {
      console.warn("[evolution-webhook] ignored: invalid_destination", {
        to: inbound.from,
        fromIsLid: Boolean(inbound.fromIsLid),
        alternates: inbound.alternates || [],
        jidCandidates,
      });
      return NextResponse.json({ ok: true, ignored: true, reason: "invalid_destination" });
    }
    console.info("[evolution-webhook] reply sent", { channelId: (channel as any)?.id, agentId: agent.id, to: sentTo });

    if (autoQuoteDocs.length || resendPdf || autoQuoteBundle) {
      try {
        if (autoQuoteBundle) {
          console.log("[quote-bundle] send final start", { drafts: autoQuoteBundle.draftIds?.length || 0, fileName: autoQuoteBundle.fileName });
        }
        if (autoQuoteBundle) {
          await evolutionService.sendDocument(outboundInstance, sentTo, {
            base64: autoQuoteBundle.pdfBase64,
            fileName: autoQuoteBundle.fileName,
            caption: `Cotizacion consolidada ${autoQuoteBundle.fileName}`,
            mimetype: "application/pdf",
          });

          for (const id of autoQuoteBundle.draftIds) {
            await supabase
              .from("agent_quote_drafts")
              .update({ status: "quote" })
              .eq("id", id)
              .eq("created_by", ownerId);
          }
          sentQuotePdf = true;
          console.log("[quote-bundle] send final done", { mode: "bundle", to: sentTo });
        } else if (autoQuoteDocs.length) {
          for (const doc of autoQuoteDocs) {
            await evolutionService.sendDocument(outboundInstance, sentTo, {
              base64: doc.pdfBase64,
              fileName: doc.fileName,
              caption: `Cotizacion preliminar ${doc.fileName}`,
              mimetype: "application/pdf",
            });

            await supabase
              .from("agent_quote_drafts")
              .update({ status: "quote" })
              .eq("id", doc.draftId)
              .eq("created_by", ownerId);
          }
          sentQuotePdf = true;
        } else {
          await evolutionService.sendDocument(outboundInstance, sentTo, {
            base64: resendPdf!.pdfBase64,
            fileName: resendPdf!.fileName,
            caption: `Cotizacion preliminar ${resendPdf!.fileName}`,
            mimetype: "application/pdf",
          });
          sentQuotePdf = true;
        }
      } catch (pdfErr: any) {
        console.warn("[evolution-webhook] auto_quote_pdf_send_failed", pdfErr?.message || pdfErr);
        try {
          await evolutionService.sendMessage(
            outboundInstance,
            sentTo,
            "Tu cotización ya quedó generada, pero falló el envío del PDF en este intento. Si escribes 'reenviar PDF' te lo intento nuevamente ahora mismo."
          );
        } catch {}
      }
    }

    if (technicalDocs.length) {
      try {
        for (const doc of technicalDocs) {
          if (doc.kind === "image") {
            await evolutionService.sendImage(outboundInstance, sentTo, {
              base64: doc.base64,
              fileName: doc.fileName,
              caption: doc.caption || "Imagen del producto",
              mimetype: doc.mimetype || "image/jpeg",
            });
            sentImage = true;
          } else {
            const primaryName = safeFileName(String(doc.fileName || "ficha-tecnica.pdf"), "ficha-tecnica", "pdf");
            const retryName = safeFileName(`ficha-${Date.now()}.pdf`, "ficha-tecnica", "pdf");
            try {
              await evolutionService.sendDocument(outboundInstance, sentTo, {
                base64: doc.base64,
                fileName: primaryName,
                caption: doc.caption || "Ficha técnica",
                mimetype: doc.mimetype || "application/pdf",
              });
            } catch {
              await evolutionService.sendDocument(outboundInstance, sentTo, {
                base64: doc.base64,
                fileName: retryName,
                caption: "Ficha técnica",
                mimetype: doc.mimetype || "application/pdf",
              });
            }
            sentTechSheet = true;
          }
        }
      } catch (techDocErr: any) {
        console.warn("[evolution-webhook] technical_doc_send_failed", techDocErr?.message || techDocErr);
        try {
          const links = uniqueNormalizedStrings(technicalFallbackLinks, 2);
          const extra = links.length
            ? ` Puedes abrirlo desde aquí mientras tanto: ${links.join(" | ")}`
            : "";
          await evolutionService.sendMessage(
            outboundInstance,
            sentTo,
            `Intenté enviarte la ficha técnica, pero falló en este intento. Si escribes 'reenviar ficha', lo reintento ahora mismo.${extra}`
          );
        } catch {}
      }
    }

    if (sentQuotePdf) nextMemory.last_quote_pdf_sent_at = new Date().toISOString();
    if (sentTechSheet) nextMemory.last_datasheet_sent_at = new Date().toISOString();
    if (sentImage) nextMemory.last_image_sent_at = new Date().toISOString();
    const deliveredAssetNow = Boolean(sentQuotePdf || sentTechSheet || sentImage || autoQuoteDocs.length || autoQuoteBundle);
    if (deliveredAssetNow) {
      nextMemory.pending_product_options = [];
      if (String(nextMemory.awaiting_action || "") === "product_option_selection") nextMemory.awaiting_action = "none";
    }

    if (autoQuoteDocs.length || autoQuoteBundle) {
      nextMemory.last_intent = "quote_generated";
      if (String(nextMemory.conversation_status || "") !== "closed") {
        nextMemory.awaiting_action = "conversation_followup";
        nextMemory.quote_feedback_due_at = isoAfterHoursApp(24);
      }
    }
    else if (handledByRecall) nextMemory.last_intent = "quote_recall";
    else if (String(nextMemory.awaiting_action || "") === "followup_quote_disambiguation") nextMemory.last_intent = "followup_quote_disambiguation";
    else if (handledByTechSheet && isProductImageIntent(inbound.text)) nextMemory.last_intent = "image_request";
    else if (handledByTechSheet) nextMemory.last_intent = "tech_sheet_request";
    else if (handledByPricing) nextMemory.last_intent = "price_request";
    else if (handledByRecommendation) nextMemory.last_intent = "recommendation_request";
    else if (handledByHistory) nextMemory.last_intent = "history_request";
    else if (handledByGreeting) nextMemory.last_intent = "greeting";
    else nextMemory.last_intent = classifiedIntent.intent;

    nextMemory.intent_snapshot = {
      intent: classifiedIntent.intent,
      category: classifiedIntent.category,
      product: classifiedIntent.product,
      request_datasheet: classifiedIntent.request_datasheet,
      request_quote: classifiedIntent.request_quote,
      request_trm: classifiedIntent.request_trm,
      needs_clarification: classifiedIntent.needs_clarification,
      at: new Date().toISOString(),
    };

    const burn = await consumeEntitlementCredits(supabase as any, ownerId, billedTokens);
    if (!burn.ok) {
      console.warn("[evolution-webhook] credits consume skipped_after_send", {
        code: burn.code,
        ownerId,
        billedTokens,
        usageTotal,
        usageCompletion,
      });
    }

    try {
      if (knownCustomerName) {
        await persistKnownNameInCrm(supabase as any, {
          ownerId,
          tenantId: (agent as any)?.tenant_id || null,
          phone: inbound.from,
          name: knownCustomerName,
        });
      }

      await syncCrmLifecycleAndMeeting({
        memory: nextMemory,
        previous: previousMemory,
        source: "evolution_webhook",
        externalRefSuffix: "final",
      });

      await persistCurrentTurn(reply, nextMemory);
    } catch (saveErr: any) {
      console.warn("[evolution-webhook] conversation save failed", saveErr?.message || saveErr);
    }

    await logUsageEvent(supabase as any, ownerId, billedTokens, {
      endpoint: "/api/agents/channels/evolution/webhook-v2",
      action: autoQuoteDocs.length ? "whatsapp_evolution_quote_auto" : "whatsapp_evolution_turn",
      metadata: {
        agent_id: agent.id,
        llm_tokens_total: usageTotal,
        llm_tokens_completion: usageCompletion,
        llm_tokens_billed: billedTokens,
        channel: "whatsapp_evolution",
        quote_auto: Boolean(autoQuoteDocs.length),
        quote_auto_docs: autoQuoteDocs.length,
      },
    });

    try {
      await supabase.from("message_audit_log").insert({
        provider: "evolution",
        agent_id: String(agent.id),
        owner_id: ownerId,
        tenant_id: (agent as any)?.tenant_id || null,
        phone: inbound.from,
        message_id: incomingDedupKey,
        intent: String(classifiedIntent.intent || ""),
        category: classifiedIntent.category,
        product: classifiedIntent.product,
        action: String(nextMemory.last_intent || classifiedIntent.intent || ""),
        request_payload: {
          text: inbound.text,
          classified_intent: classifiedIntent,
        },
        response_payload: {
          reply,
          sent_quote_pdf: sentQuotePdf,
          sent_tech_sheet: sentTechSheet,
          sent_image: sentImage,
        },
      });
    } catch (auditErr: any) {
      console.warn("[evolution-webhook] audit_log_failed", auditErr?.message || auditErr);
    }

    await markIncomingMessageProcessed(supabase as any, incomingDedupKey);

    safeLogPhase1Invariants({
      inboundText: inbound.text,
      outboundText: reply,
      strict: false,
      route: resolvedRoute,
      intent: String(nextMemory?.last_intent || classifiedIntent.intent || ""),
      awaitingAction: String(nextMemory?.awaiting_action || ""),
    });

    return NextResponse.json({ ok: true, sent: true });
  } catch (e: any) {
    console.error("[evolution-webhook] error", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "Error en webhook Evolution" }, { status: 500 });
  }
}

export const handleWebhookTurn = POST;

