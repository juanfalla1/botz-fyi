export async function handleCommercialExistingContactUpdateFlow(args: {
  currentAwaiting: string;
  strictMemory: Record<string, any>;
  text: string;
  inboundFrom: string;
  supabase: any;
  ownerId: string;
  tenantId?: string | null;
  agentId?: string | null;
  parseExistingContactUpdateData: (args: {
    text: string;
    fallbackInboundPhone: string;
    extractEmail: (text: string) => string;
    normalizePhone: (raw: string) => string;
    extractCustomerPhone: (text: string, fallbackInbound: string) => string;
    extractSimpleLabeledValue: (text: string, keys: string[]) => string;
    extractCustomerName: (text: string, fallback: string) => string;
    sanitizeCustomerDisplayName: (raw: string) => string;
  }) => { name: string; email: string; phone: string; area: string };
  extractEmail: (text: string) => string;
  normalizePhone: (raw: string) => string;
  extractCustomerPhone: (text: string, fallbackInbound: string) => string;
  extractSimpleLabeledValue: (text: string, keys: string[]) => string;
  extractCustomerName: (text: string, fallback: string) => string;
  sanitizeCustomerDisplayName: (raw: string) => string;
  ensureAnalysisOpportunitySeed: (args: {
    supabase: any;
    ownerId: string;
    tenantId?: string | null;
    agentId?: string | null;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    companyName?: string;
    location?: string;
    customerNit?: string;
    customerType?: string;
    sanitizeCustomerDisplayName: (raw: string) => string;
    normalizePhone: (raw: string) => string;
    phoneTail10: (raw: string) => string;
    normalizeCityLabel: (raw: string) => string;
    normalizeText: (raw: string) => string;
    isQuoteDraftStatusConstraintError: (err: any) => boolean;
  }) => Promise<void>;
  phoneTail10: (raw: string) => string;
  normalizeCityLabel: (raw: string) => string;
  normalizeText: (raw: string) => string;
  isQuoteDraftStatusConstraintError: (err: any) => boolean;
}): Promise<null | { kind: "missing" | "updated"; strictReply: string; strictMemory: Record<string, any>; recognizedReturningCustomer: boolean; gate: string }> {
  if (args.currentAwaiting !== "commercial_existing_contact_update") return null;

  const matched = args.strictMemory?.commercial_existing_match && typeof args.strictMemory.commercial_existing_match === "object"
    ? args.strictMemory.commercial_existing_match
    : {};
  const updated = args.parseExistingContactUpdateData({
    text: args.text,
    fallbackInboundPhone: args.inboundFrom,
    extractEmail: args.extractEmail,
    normalizePhone: args.normalizePhone,
    extractCustomerPhone: args.extractCustomerPhone,
    extractSimpleLabeledValue: args.extractSimpleLabeledValue,
    extractCustomerName: args.extractCustomerName,
    sanitizeCustomerDisplayName: args.sanitizeCustomerDisplayName,
  });
  if (!updated.name || (!updated.email && !updated.phone)) {
    args.strictMemory.awaiting_action = "commercial_existing_contact_update";
    return {
      kind: "missing",
      strictReply: "Para actualizar el contacto necesito al menos: nombre y (correo o celular).",
      strictMemory: args.strictMemory,
      recognizedReturningCustomer: false,
      gate: "existing_customer_contact_update_missing_fields",
    };
  }

  let insertedContactId = "";
  try {
    const metadata = {
      nit: String(matched?.nit || args.strictMemory.crm_nit || "").trim(),
      billing_city: String(matched?.city || args.strictMemory.crm_billing_city || "").trim(),
      customer_type: "existing",
      source: "whatsapp_existing_customer_contact_update",
      parent_contact_id: String(matched?.id || args.strictMemory.crm_contact_id || "").trim(),
      area: String(updated.area || "").trim(),
      whatsapp_transport_id: args.normalizePhone(args.inboundFrom || ""),
      whatsapp_lifecycle_at: new Date().toISOString(),
    };
    const { data: inserted } = await args.supabase
      .from("agent_crm_contacts")
      .insert({
        tenant_id: args.tenantId || null,
        created_by: args.ownerId,
        name: updated.name,
        email: updated.email || null,
        phone: updated.phone || null,
        company: String(matched?.company || args.strictMemory.crm_company || "").trim() || null,
        status: "analysis",
        metadata,
      })
      .select("id")
      .single();
    insertedContactId = String((inserted as any)?.id || "").trim();
  } catch {}

  args.strictMemory.crm_contact_found = true;
  args.strictMemory.crm_contact_id = insertedContactId || String(args.strictMemory.crm_contact_id || "").trim();
  args.strictMemory.crm_contact_name = updated.name;
  args.strictMemory.crm_contact_email = updated.email || String(args.strictMemory.crm_contact_email || "").trim();
  args.strictMemory.crm_contact_phone = updated.phone || String(args.strictMemory.crm_contact_phone || "").trim();
  args.strictMemory.customer_name = updated.name;
  args.strictMemory.commercial_customer_name = updated.name;
  args.strictMemory.commercial_validation_complete = true;

  await args.ensureAnalysisOpportunitySeed({
    supabase: args.supabase,
    ownerId: args.ownerId,
    tenantId: args.tenantId,
    agentId: args.agentId,
    customerName: updated.name,
    customerEmail: updated.email || String(args.strictMemory.crm_contact_email || "").trim(),
    customerPhone: updated.phone || String(args.strictMemory.crm_contact_phone || "").trim(),
    companyName: String(matched?.company || args.strictMemory.crm_company || "").trim(),
    location: String(matched?.city || args.strictMemory.crm_billing_city || "").trim(),
    customerNit: String(matched?.nit || args.strictMemory.crm_nit || "").trim(),
    customerType: "existing",
    sanitizeCustomerDisplayName: args.sanitizeCustomerDisplayName,
    normalizePhone: args.normalizePhone,
    phoneTail10: args.phoneTail10,
    normalizeCityLabel: args.normalizeCityLabel,
    normalizeText: args.normalizeText,
    isQuoteDraftStatusConstraintError: args.isQuoteDraftStatusConstraintError,
  });

  args.strictMemory.awaiting_action = "commercial_choose_equipment";
  return {
    kind: "updated",
    strictReply: "Perfecto, ya actualicé el contacto y quedó registrado en CRM/base BOT.",
    strictMemory: args.strictMemory,
    recognizedReturningCustomer: true,
    gate: "existing_customer_contact_updated",
  };
}

export async function handleCommercialExistingLookupFlow(args: {
  currentAwaiting: string;
  strictMemory: Record<string, any>;
  text: string;
  inboundFrom: string;
  supabase: any;
  ownerId: string;
  extractCompanyNit: (text: string) => string;
  normalizePhone: (raw: string) => string;
  extractCustomerPhone: (text: string, fallbackInbound: string) => string;
  phoneTail10: (raw: string) => string;
  findCommercialContactByIdentifiers: (args: {
    supabase: any;
    ownerId: string;
    lookupNit?: string;
    lookupPhone?: string;
    lookupPhoneTail?: string;
  }) => Promise<{ matchedContact: any; fallbackCandidatesCount: number }>;
  normalizeCityLabel: (raw: string) => string;
  sanitizeCustomerDisplayName: (raw: string) => string;
  buildNewCustomerDataPrompt: () => string;
  buildExistingClientMatchConfirmationPrompt: (args: { company: string; nit: string; contact: string; email: string; phone: string }) => string;
}): Promise<null | { kind: "missing_key" | "not_found" | "confirm"; strictReply: string; gate: string }> {
  if (args.currentAwaiting !== "commercial_existing_lookup") return null;

  const lookupNit = String(args.extractCompanyNit(args.text) || "").replace(/\D/g, "").trim();
  const lookupPhone = args.normalizePhone(String(args.extractCustomerPhone(args.text, args.inboundFrom) || "").trim());
  const lookupPhoneTail = args.phoneTail10(lookupPhone);
  if (!lookupNit && !lookupPhoneTail) {
    args.strictMemory.awaiting_action = "commercial_existing_lookup";
    return {
      kind: "missing_key",
      strictReply: "Para validar en base de datos necesito NIT o celular registrado. Ejemplo: NIT 900505419 o celular 3131657711.",
      gate: "existing_customer_lookup_missing_key",
    };
  }

  const existingLookup = await args.findCommercialContactByIdentifiers({
    supabase: args.supabase,
    ownerId: args.ownerId,
    lookupNit,
    lookupPhone,
    lookupPhoneTail,
  });
  const matchedContact: any = existingLookup.matchedContact;
  const lookupCandidatesCount = Number(existingLookup.fallbackCandidatesCount || 0);

  console.log("[existing-customer-lookup]", {
    ownerId: args.ownerId,
    lookupNit,
    lookupPhoneTail,
    matched: Boolean(matchedContact),
    fallbackCandidates: lookupCandidatesCount,
  });

  if (!matchedContact) {
    args.strictMemory.commercial_client_type = "new";
    args.strictMemory.awaiting_action = "commercial_new_customer_data";
    return {
      kind: "not_found",
      strictReply: [
        "No encontré ese NIT/celular en nuestra base de clientes.",
        "Para continuar te registro como contacto nuevo.",
        "",
        args.buildNewCustomerDataPrompt(),
      ].join("\n"),
      gate: "existing_customer_not_found_switch_new",
    };
  }

  const matchedMeta = matchedContact?.metadata && typeof matchedContact.metadata === "object" ? matchedContact.metadata : {};
  const matchedNit = String(matchedMeta?.nit || "").replace(/\D/g, "").trim();
  const matchedCity = args.normalizeCityLabel(String(matchedMeta?.billing_city || "").trim());
  const matchedName = args.sanitizeCustomerDisplayName(String(matchedContact?.name || ""));
  const matchedEmail = String(matchedContact?.email || "").trim().toLowerCase();
  const matchedPhone = args.normalizePhone(String(matchedContact?.phone || ""));
  const matchedCompany = String(matchedContact?.company || "").trim();

  args.strictMemory.crm_contact_found = true;
  args.strictMemory.crm_contact_id = String(matchedContact?.id || "").trim();
  args.strictMemory.crm_contact_name = matchedName;
  args.strictMemory.crm_contact_email = matchedEmail;
  args.strictMemory.crm_contact_phone = matchedPhone;
  args.strictMemory.crm_company = matchedCompany;
  args.strictMemory.crm_nit = matchedNit;
  args.strictMemory.crm_billing_city = matchedCity;
  args.strictMemory.quote_data = {
    city: matchedCity || String(args.strictMemory?.quote_data?.city || "") || "Bogota",
    company: matchedCompany || String(args.strictMemory?.quote_data?.company || ""),
    nit: matchedNit || String(args.strictMemory?.quote_data?.nit || ""),
    contact: matchedName || String(args.strictMemory?.quote_data?.contact || ""),
    email: matchedEmail || String(args.strictMemory?.quote_data?.email || ""),
    phone: matchedPhone || args.normalizePhone(String(args.strictMemory?.customer_phone || args.inboundFrom || "")),
  };

  args.strictMemory.commercial_existing_match = {
    id: String(matchedContact?.id || "").trim(),
    company: matchedCompany,
    nit: matchedNit,
    contact: matchedName,
    email: matchedEmail,
    phone: matchedPhone,
    city: matchedCity,
  };

  args.strictMemory.awaiting_action = "commercial_existing_confirm";
  return {
    kind: "confirm",
    strictReply: args.buildExistingClientMatchConfirmationPrompt({
      company: matchedCompany,
      nit: matchedNit,
      contact: matchedName,
      email: matchedEmail,
      phone: matchedPhone,
    }),
    gate: "existing_customer_confirm_identity",
  };
}

export async function handleCommercialExistingConfirmFlow(args: {
  currentAwaiting: string;
  strictMemory: Record<string, any>;
  text: string;
  inboundFrom: string;
  detectExistingClientConfirmationChoice: (text: string) => "same" | "different" | "";
  normalizePhone: (raw: string) => string;
  normalizeCityLabel: (raw: string) => string;
  ensureAnalysisOpportunitySeed: (args: {
    supabase: any;
    ownerId: string;
    tenantId?: string | null;
    agentId?: string | null;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    companyName?: string;
    location?: string;
    customerNit?: string;
    customerType?: string;
    sanitizeCustomerDisplayName: (raw: string) => string;
    normalizePhone: (raw: string) => string;
    phoneTail10: (raw: string) => string;
    normalizeCityLabel: (raw: string) => string;
    normalizeText: (raw: string) => string;
    isQuoteDraftStatusConstraintError: (err: any) => boolean;
  }) => Promise<void>;
  supabase: any;
  ownerId: string;
  tenantId?: string | null;
  agentId?: string | null;
  sanitizeCustomerDisplayName: (raw: string) => string;
  phoneTail10: (raw: string) => string;
  normalizeText: (raw: string) => string;
  isQuoteDraftStatusConstraintError: (err: any) => boolean;
}): Promise<null | { kind: "required" | "different" | "confirmed"; strictReply: string; gate: string; recognizedReturningCustomer: boolean }> {
  if (args.currentAwaiting !== "commercial_existing_confirm") return null;
  const confirmChoice = args.detectExistingClientConfirmationChoice(args.text);
  const matched = args.strictMemory?.commercial_existing_match && typeof args.strictMemory.commercial_existing_match === "object"
    ? args.strictMemory.commercial_existing_match
    : {};
  if (!confirmChoice) {
    args.strictMemory.awaiting_action = "commercial_existing_confirm";
    return {
      kind: "required",
      strictReply: "Confírmame por favor: 1) Sí, soy la misma persona 2) No, soy otra persona/área.",
      gate: "existing_customer_confirm_required",
      recognizedReturningCustomer: false,
    };
  }

  if (confirmChoice === "different") {
    args.strictMemory.awaiting_action = "commercial_existing_contact_update";
    return {
      kind: "different",
      strictReply: [
        "Perfecto, actualicemos el contacto para esa empresa.",
        "Compárteme en un solo mensaje:",
        "- Nombre de contacto",
        "- Correo",
        "- Celular",
        "- Área/Cargo (opcional)",
      ].join("\n"),
      gate: "existing_customer_contact_update_required",
      recognizedReturningCustomer: false,
    };
  }

  args.strictMemory.commercial_validation_complete = true;
  args.strictMemory.commercial_client_type = "existing";
  args.strictMemory.crm_contact_found = true;
  args.strictMemory.crm_contact_name = String(matched?.contact || args.strictMemory.crm_contact_name || "").trim();
  args.strictMemory.crm_contact_email = String(matched?.email || args.strictMemory.crm_contact_email || "").trim().toLowerCase();
  args.strictMemory.crm_contact_phone = args.normalizePhone(String(matched?.phone || args.strictMemory.crm_contact_phone || ""));
  args.strictMemory.crm_company = String(matched?.company || args.strictMemory.crm_company || "").trim();
  args.strictMemory.crm_nit = String(matched?.nit || args.strictMemory.crm_nit || "").replace(/\D/g, "").trim();
  args.strictMemory.crm_billing_city = args.normalizeCityLabel(String(matched?.city || args.strictMemory.crm_billing_city || "").trim());
  args.strictMemory.quote_data = {
    city: String((matched as any)?.city || args.strictMemory.crm_billing_city || args.strictMemory?.quote_data?.city || "Bogota").trim(),
    company: String((matched as any)?.company || args.strictMemory.crm_company || args.strictMemory?.quote_data?.company || "").trim(),
    nit: String((matched as any)?.nit || args.strictMemory.crm_nit || args.strictMemory?.quote_data?.nit || "").replace(/\D/g, "").trim(),
    contact: String((matched as any)?.contact || args.strictMemory.crm_contact_name || args.strictMemory?.quote_data?.contact || "").trim(),
    email: String((matched as any)?.email || args.strictMemory.crm_contact_email || args.strictMemory?.quote_data?.email || "").trim().toLowerCase(),
    phone: args.normalizePhone(String((matched as any)?.phone || args.strictMemory.crm_contact_phone || args.strictMemory?.quote_data?.phone || args.inboundFrom || "")),
  };
  args.strictMemory.customer_name = String(matched?.contact || args.strictMemory.crm_contact_name || args.strictMemory.customer_name || "").trim();

  await args.ensureAnalysisOpportunitySeed({
    supabase: args.supabase,
    ownerId: args.ownerId,
    tenantId: args.tenantId,
    agentId: args.agentId,
    customerName: String(matched?.contact || args.strictMemory.crm_contact_name || "").trim(),
    customerEmail: String(matched?.email || args.strictMemory.crm_contact_email || "").trim(),
    customerPhone: String(matched?.phone || args.strictMemory.crm_contact_phone || "").trim(),
    companyName: String(matched?.company || args.strictMemory.crm_company || "").trim(),
    location: String(matched?.city || args.strictMemory.crm_billing_city || "").trim(),
    customerNit: String(matched?.nit || args.strictMemory.crm_nit || "").trim(),
    customerType: "existing",
    sanitizeCustomerDisplayName: args.sanitizeCustomerDisplayName,
    normalizePhone: args.normalizePhone,
    phoneTail10: args.phoneTail10,
    normalizeCityLabel: args.normalizeCityLabel,
    normalizeText: args.normalizeText,
    isQuoteDraftStatusConstraintError: args.isQuoteDraftStatusConstraintError,
  });

  args.strictMemory.awaiting_action = "commercial_choose_equipment";
  return {
    kind: "confirmed",
    strictReply: "",
    gate: "existing_customer_confirmed",
    recognizedReturningCustomer: true,
  };
}

export function handleCommercialExistingEntryStep(args: {
  currentAwaiting: string;
  text: string;
  strictMemory: Record<string, any>;
  isAffirmativeShortIntent: (text: string) => boolean;
  buildGuidedNeedReframePrompt: () => string;
  buildExistingClientLookupPrompt: () => string;
}): null | { strictReply: string; gate: string } {
  if (!/^(commercial_client_recognition|none)$/i.test(args.currentAwaiting)) return null;
  if (args.isAffirmativeShortIntent(args.text)) {
    args.strictMemory.awaiting_action = "strict_need_spec";
    return {
      strictReply: args.buildGuidedNeedReframePrompt(),
      gate: "existing_customer_affirmative_without_lookup",
    };
  }
  args.strictMemory.awaiting_action = "commercial_existing_lookup";
  return {
    strictReply: args.buildExistingClientLookupPrompt(),
    gate: "existing_customer_lookup_required",
  };
}

export function handleCommercialExistingEquipmentGate(args: {
  currentAwaiting: string;
  text: string;
  strictMemory: Record<string, any>;
  detectEquipmentChoice: (text: string) => string;
  detectGuidedBalanzaProfile: (text: string) => string;
  buildEquipmentMenuPrompt: () => string;
}): null | { effectiveEquipment: string } | { strictReply: string; gate: string } {
  args.strictMemory.commercial_validation_complete = true;
  const chosenEquipment = args.detectEquipmentChoice(args.text);
  const guidedProfileFromNeed = args.detectGuidedBalanzaProfile(args.text);
  const effectiveEquipment = chosenEquipment || (guidedProfileFromNeed ? "balanza" : "");
  if (!effectiveEquipment || /^(commercial_client_recognition|commercial_existing_lookup|commercial_existing_confirm|commercial_existing_contact_update)$/i.test(args.currentAwaiting)) {
    args.strictMemory.awaiting_action = "commercial_choose_equipment";
    return {
      strictReply: args.buildEquipmentMenuPrompt(),
      gate: "equipment_selection_required",
    };
  }
  return { effectiveEquipment };
}

export async function handleCommercialExistingStep(args: {
  strictReply: string;
  awaiting: string;
  clientType: string;
  text: string;
  inboundFrom: string;
  strictMemory: Record<string, any>;
  supabase: any;
  ownerId: string;
  tenantId?: string | null;
  agentId?: string | null;
  hasPriorityProductGuidanceIntent: (text: string) => boolean;
  isDifferenceQuestionIntent: (text: string) => boolean;
  isInventoryInfoIntent: (text: string) => boolean;
  isCatalogBreadthQuestion: (text: string) => boolean;
  isGlobalCatalogAsk: (text: string) => boolean;
  handleCommercialExistingEntryStep: any;
  isAffirmativeShortIntent: (text: string) => boolean;
  buildGuidedNeedReframePrompt: () => string;
  buildExistingClientLookupPrompt: () => string;
  handleCommercialExistingLookupFlow: any;
  extractCompanyNit: (text: string) => string;
  normalizePhone: (raw: string) => string;
  extractCustomerPhone: (text: string, fallbackInbound: string) => string;
  phoneTail10: (raw: string) => string;
  findCommercialContactByIdentifiers: any;
  normalizeCityLabel: (raw: string) => string;
  sanitizeCustomerDisplayName: (raw: string) => string;
  buildNewCustomerDataPrompt: () => string;
  buildExistingClientMatchConfirmationPrompt: any;
  handleCommercialExistingConfirmFlow: any;
  detectExistingClientConfirmationChoice: any;
  ensureAnalysisOpportunitySeed: any;
  normalizeText: (raw: string) => string;
  isQuoteDraftStatusConstraintError: (err: any) => boolean;
  handleCommercialExistingContactUpdateFlow: any;
  parseExistingContactUpdateData: any;
  extractEmail: (text: string) => string;
  extractSimpleLabeledValue: (text: string, keys: string[]) => string;
  extractCustomerName: (text: string, fallback: string) => string;
  handleCommercialExistingEquipmentGate: any;
  detectEquipmentChoice: any;
  detectGuidedBalanzaProfile: any;
  buildEquipmentMenuPrompt: () => string;
  ownerRows: any[];
  handleCommercialExistingEquipmentSelection: any;
  detectIndustrialGuidedMode: (text: string) => string;
  buildGuidedPendingOptions: (rows: any[], profile: any, mode: any) => any[];
  buildGuidedBalanzaReplyWithMode: (profile: any, mode: any) => string;
  buildScaleDifferenceGuidanceReply: () => string;
  buildBalanzaQualificationPrompt: () => string;
  scopeStrictBasculaRows: (rows: any[]) => any[];
  buildNumberedProductOptions: (rows: any[], maxItems?: number) => any[];
  buildNoActiveCatalogEscalationMessage: (topic?: string) => string;
  equipmentChoiceLabel: (choice: string) => string;
}): Promise<null | { strictReply: string; gate: string; recognizedReturningCustomer?: boolean; effectiveEquipment?: string }> {
  const isPlainCatalogAsk = args.isInventoryInfoIntent(args.text) || args.isCatalogBreadthQuestion(args.text) || args.isGlobalCatalogAsk(args.text);
  const shouldHandleExistingCommercialStep =
    args.clientType === "existing" &&
    !args.hasPriorityProductGuidanceIntent(args.text) &&
    !args.isDifferenceQuestionIntent(args.text) &&
    !(isPlainCatalogAsk && /^(commercial_existing_lookup|commercial_client_recognition|none)$/i.test(args.awaiting)) &&
    /^(commercial_client_recognition|commercial_existing_lookup|commercial_existing_confirm|commercial_existing_contact_update|commercial_choose_equipment|none)$/i.test(args.awaiting);
  if (String(args.strictReply || "").trim() || !shouldHandleExistingCommercialStep || /^(strict_quote_data|advisor_meeting_slot)$/i.test(args.awaiting)) return null;

  args.strictMemory.commercial_client_type = "existing";
  const currentAwaiting = String(args.awaiting || "").trim();

  const existingEntryResult = args.handleCommercialExistingEntryStep({
    currentAwaiting,
    text: args.text,
    strictMemory: args.strictMemory,
    isAffirmativeShortIntent: args.isAffirmativeShortIntent,
    buildGuidedNeedReframePrompt: args.buildGuidedNeedReframePrompt,
    buildExistingClientLookupPrompt: args.buildExistingClientLookupPrompt,
  });
  if (existingEntryResult) return { strictReply: existingEntryResult.strictReply, gate: existingEntryResult.gate };

  const existingLookupResult = await args.handleCommercialExistingLookupFlow({
    currentAwaiting,
    strictMemory: args.strictMemory,
    text: args.text,
    inboundFrom: args.inboundFrom,
    supabase: args.supabase,
    ownerId: args.ownerId,
    extractCompanyNit: args.extractCompanyNit,
    normalizePhone: args.normalizePhone,
    extractCustomerPhone: args.extractCustomerPhone,
    phoneTail10: args.phoneTail10,
    findCommercialContactByIdentifiers: args.findCommercialContactByIdentifiers,
    normalizeCityLabel: args.normalizeCityLabel,
    sanitizeCustomerDisplayName: args.sanitizeCustomerDisplayName,
    buildNewCustomerDataPrompt: args.buildNewCustomerDataPrompt,
    buildExistingClientMatchConfirmationPrompt: args.buildExistingClientMatchConfirmationPrompt,
  });
  if (existingLookupResult) return { strictReply: existingLookupResult.strictReply, gate: existingLookupResult.gate };

  const existingConfirmResult = await args.handleCommercialExistingConfirmFlow({
    currentAwaiting,
    strictMemory: args.strictMemory,
    text: args.text,
    inboundFrom: args.inboundFrom,
    detectExistingClientConfirmationChoice: args.detectExistingClientConfirmationChoice,
    normalizePhone: args.normalizePhone,
    normalizeCityLabel: args.normalizeCityLabel,
    ensureAnalysisOpportunitySeed: args.ensureAnalysisOpportunitySeed,
    supabase: args.supabase,
    ownerId: args.ownerId,
    tenantId: args.tenantId,
    agentId: args.agentId,
    sanitizeCustomerDisplayName: args.sanitizeCustomerDisplayName,
    phoneTail10: args.phoneTail10,
    normalizeText: args.normalizeText,
    isQuoteDraftStatusConstraintError: args.isQuoteDraftStatusConstraintError,
  });
  if (existingConfirmResult) {
    return {
      strictReply: existingConfirmResult.kind === "confirmed" ? args.buildEquipmentMenuPrompt() : existingConfirmResult.strictReply,
      gate: existingConfirmResult.gate,
      recognizedReturningCustomer: existingConfirmResult.recognizedReturningCustomer,
    };
  }

  const commercialUpdateResult = await args.handleCommercialExistingContactUpdateFlow({
    currentAwaiting,
    strictMemory: args.strictMemory,
    text: args.text,
    inboundFrom: args.inboundFrom,
    supabase: args.supabase,
    ownerId: args.ownerId,
    tenantId: args.tenantId,
    agentId: args.agentId,
    parseExistingContactUpdateData: args.parseExistingContactUpdateData,
    extractEmail: args.extractEmail,
    normalizePhone: args.normalizePhone,
    extractCustomerPhone: args.extractCustomerPhone,
    extractSimpleLabeledValue: args.extractSimpleLabeledValue,
    extractCustomerName: args.extractCustomerName,
    sanitizeCustomerDisplayName: args.sanitizeCustomerDisplayName,
    ensureAnalysisOpportunitySeed: args.ensureAnalysisOpportunitySeed,
    phoneTail10: args.phoneTail10,
    normalizeCityLabel: args.normalizeCityLabel,
    normalizeText: args.normalizeText,
    isQuoteDraftStatusConstraintError: args.isQuoteDraftStatusConstraintError,
  });
  if (commercialUpdateResult) {
    return {
      strictReply: commercialUpdateResult.kind === "updated"
        ? [commercialUpdateResult.strictReply, args.buildEquipmentMenuPrompt()].join("\n\n")
        : commercialUpdateResult.strictReply,
      gate: commercialUpdateResult.gate,
      recognizedReturningCustomer: commercialUpdateResult.recognizedReturningCustomer,
    };
  }

  const existingEquipmentGate = args.handleCommercialExistingEquipmentGate({
    currentAwaiting,
    text: args.text,
    strictMemory: args.strictMemory,
    detectEquipmentChoice: args.detectEquipmentChoice,
    detectGuidedBalanzaProfile: args.detectGuidedBalanzaProfile,
    buildEquipmentMenuPrompt: args.buildEquipmentMenuPrompt,
  });
  if (existingEquipmentGate && "strictReply" in existingEquipmentGate) {
    return { strictReply: existingEquipmentGate.strictReply, gate: existingEquipmentGate.gate };
  }

  const effectiveEquipment = existingEquipmentGate && "effectiveEquipment" in existingEquipmentGate
    ? existingEquipmentGate.effectiveEquipment
    : "";
  args.strictMemory.commercial_equipment_choice = effectiveEquipment;
  const existingEquipmentSelection = args.handleCommercialExistingEquipmentSelection({
    effectiveEquipment,
    text: args.text,
    strictMemory: args.strictMemory,
    ownerRows: args.ownerRows,
    detectGuidedBalanzaProfile: args.detectGuidedBalanzaProfile,
    detectIndustrialGuidedMode: args.detectIndustrialGuidedMode,
    buildGuidedPendingOptions: args.buildGuidedPendingOptions,
    buildGuidedBalanzaReplyWithMode: args.buildGuidedBalanzaReplyWithMode,
    isDifferenceQuestionIntent: args.isDifferenceQuestionIntent,
    buildScaleDifferenceGuidanceReply: args.buildScaleDifferenceGuidanceReply,
    buildBalanzaQualificationPrompt: args.buildBalanzaQualificationPrompt,
    scopeStrictBasculaRows: args.scopeStrictBasculaRows,
    buildNumberedProductOptions: args.buildNumberedProductOptions,
    buildNoActiveCatalogEscalationMessage: args.buildNoActiveCatalogEscalationMessage,
    equipmentChoiceLabel: args.equipmentChoiceLabel,
  });
  return { strictReply: existingEquipmentSelection.strictReply, gate: existingEquipmentSelection.gate };
}

export async function handleCommercialStep(args: {
  strictReply: string;
  awaiting: string;
  strictPrevAwaiting: string;
  text: string;
  inboundFrom: string;
  inboundPushName: string;
  strictMemory: Record<string, any>;
  previousMemory: any;
  ownerRows: any[];
  supabase: any;
  ownerId: string;
  tenantId?: string | null;
  agentId?: string | null;
  resolveCommercialClientTypeStep: any;
  detectClientRecognitionChoice: any;
  buildCommercialWelcomeMessage: () => string;
  handleCommercialNewCustomerStep: any;
  handleCommercialExistingStep: any;
  // pass-through dependencies
  deps: any;
}): Promise<null | { strictReply: string; gate: string; recognizedReturningCustomer?: boolean }> {
  const clientTypeStep = args.resolveCommercialClientTypeStep({
    text: args.text,
    awaiting: args.awaiting,
    strictPrevAwaiting: args.strictPrevAwaiting,
    previousMemory: args.previousMemory,
    strictMemory: args.strictMemory,
    detectClientRecognitionChoice: args.detectClientRecognitionChoice,
    buildCommercialWelcomeMessage: args.buildCommercialWelcomeMessage,
  });
  const clientType = clientTypeStep.clientType;
  if (!String(args.strictReply || "").trim() && clientTypeStep.handled) {
    return {
      strictReply: String(clientTypeStep.strictReply || ""),
      gate: String(clientTypeStep.gate || "commercial_recognition_required"),
    };
  }

  const newStep = await args.handleCommercialNewCustomerStep({
    strictReply: args.strictReply,
    awaiting: args.awaiting,
    clientType,
    text: args.text,
    inboundFrom: args.inboundFrom,
    inboundPushName: args.inboundPushName,
    strictMemory: args.strictMemory,
    ownerRows: args.ownerRows,
    supabase: args.supabase,
    ownerId: args.ownerId,
    tenantId: args.tenantId,
    agentId: args.agentId,
    ...args.deps,
  });
  if (newStep) return newStep;

  const existingStep = await args.handleCommercialExistingStep({
    strictReply: args.strictReply,
    awaiting: args.awaiting,
    clientType,
    text: args.text,
    inboundFrom: args.inboundFrom,
    strictMemory: args.strictMemory,
    supabase: args.supabase,
    ownerId: args.ownerId,
    tenantId: args.tenantId,
    agentId: args.agentId,
    ...args.deps,
  });
  if (existingStep) return existingStep;

  return null;
}

export function handleCommercialExistingEquipmentSelection(args: {
  effectiveEquipment: string;
  text: string;
  strictMemory: Record<string, any>;
  ownerRows: any[];
  detectGuidedBalanzaProfile: (text: string) => string;
  detectIndustrialGuidedMode: (text: string) => string;
  buildGuidedPendingOptions: (rows: any[], profile: any, mode: any) => any[];
  buildGuidedBalanzaReplyWithMode: (profile: any, mode: any) => string;
  isDifferenceQuestionIntent: (text: string) => boolean;
  buildScaleDifferenceGuidanceReply: () => string;
  buildBalanzaQualificationPrompt: () => string;
  scopeStrictBasculaRows: (rows: any[]) => any[];
  buildNumberedProductOptions: (rows: any[], maxItems?: number) => any[];
  buildNoActiveCatalogEscalationMessage: (topic?: string) => string;
  equipmentChoiceLabel: (choice: string) => string;
}): { strictReply: string; gate: string } {
  const effectiveEquipment = String(args.effectiveEquipment || "");
  if (effectiveEquipment === "balanza") {
    const guidedProfile = args.detectGuidedBalanzaProfile(args.text);
    if (guidedProfile) {
      const industrialMode = guidedProfile === "balanza_industrial_portatil_conteo" ? args.detectIndustrialGuidedMode(args.text) : "";
      const guidedOptions = args.buildGuidedPendingOptions(args.ownerRows as any[], guidedProfile, industrialMode as any);
      args.strictMemory.pending_product_options = guidedOptions;
      args.strictMemory.pending_family_options = [];
      args.strictMemory.awaiting_action = guidedOptions.length ? "strict_choose_model" : "strict_need_spec";
      args.strictMemory.last_category_intent = "balanzas";
      args.strictMemory.guided_balanza_profile = guidedProfile;
      args.strictMemory.guided_industrial_mode = industrialMode;
      args.strictMemory.strict_family_label = "balanzas";
      args.strictMemory.strict_model_offset = 0;
      return {
        strictReply: args.buildGuidedBalanzaReplyWithMode(guidedProfile, industrialMode as any),
        gate: "balanza_guided_existing_customer",
      };
    }
    args.strictMemory.awaiting_action = "strict_need_spec";
    return {
      strictReply: args.isDifferenceQuestionIntent(args.text)
        ? args.buildScaleDifferenceGuidanceReply()
        : args.buildBalanzaQualificationPrompt(),
      gate: "balanza_qualification",
    };
  }
  if (effectiveEquipment === "bascula") {
    args.strictMemory.last_category_intent = "basculas";
    const basculaRows = args.scopeStrictBasculaRows(args.ownerRows as any[]);
    const options = args.buildNumberedProductOptions(basculaRows as any[], 8);
    if (options.length) {
      args.strictMemory.pending_product_options = options;
      args.strictMemory.pending_family_options = [];
      args.strictMemory.awaiting_action = "strict_choose_model";
      args.strictMemory.strict_model_offset = 0;
      return {
        strictReply: [
          `Perfecto. En catálogo activo tengo ${options.length} báscula(s).`,
          ...options.slice(0, 4).map((o: any) => `${o.code}) ${o.name}`),
          "",
          "Elige con letra/número (A/1), o escribe 'más'.",
        ].join("\n"),
        gate: "bascula_qualification",
      };
    }
    args.strictMemory.awaiting_action = "strict_need_spec";
    return {
      strictReply: "Perfecto. Para báscula, dime capacidad y resolución objetivo para recomendarte la mejor opción.",
      gate: "bascula_qualification",
    };
  }
  if (effectiveEquipment === "analizador_humedad") {
    args.strictMemory.last_category_intent = "analizador_humedad";
    args.strictMemory.awaiting_action = "strict_need_spec";
    return {
      strictReply: "Perfecto. Para analizador de humedad, dime tipo de muestra, capacidad aproximada y precisión objetivo.",
      gate: "humidity_qualification",
    };
  }
  args.strictMemory.awaiting_action = "conversation_followup";
  return {
    strictReply: args.buildNoActiveCatalogEscalationMessage(args.equipmentChoiceLabel(effectiveEquipment)),
    gate: "other_equipment_escalation",
  };
}

export function resolveCommercialClientTypeStep(args: {
  text: string;
  awaiting: string;
  strictPrevAwaiting: string;
  previousMemory: any;
  strictMemory: Record<string, any>;
  detectClientRecognitionChoice: (text: string) => "new" | "existing" | "";
  buildCommercialWelcomeMessage: () => string;
}): {
  handled: boolean;
  strictReply?: string;
  gate?: string;
  clientType: string;
} {
  const recognitionChoiceCandidate = args.detectClientRecognitionChoice(args.text);
  const recognitionNumericOnly = /^\s*[12]\s*$/.test(String(args.text || "").trim());
  const rawPrevAwaiting = String(args.previousMemory?.awaiting_action || args.strictPrevAwaiting || "").trim();
  const recognitionStepActive = /^(commercial_client_recognition|none)$/i.test(args.awaiting) || /^commercial_client_recognition$/i.test(rawPrevAwaiting);
  const recognitionChoice = recognitionNumericOnly && !recognitionStepActive ? "" : recognitionChoiceCandidate;
  const currentClientType = String(args.strictMemory.commercial_client_type || args.previousMemory?.commercial_client_type || "").trim();
  const clientType = currentClientType || recognitionChoice;
  if (clientType) args.strictMemory.commercial_client_type = clientType;

  if (recognitionChoice === "new") {
    args.strictMemory.commercial_client_type = "new";
    args.strictMemory.commercial_validation_complete = false;
    args.strictMemory.new_customer_data = {};
    args.strictMemory.commercial_existing_match = {};
  }

  if (recognitionChoice === "existing") {
    args.strictMemory.commercial_client_type = "existing";
    args.strictMemory.commercial_validation_complete = false;
    args.strictMemory.commercial_existing_match = {};
  }

  if (!clientType && !/^(strict_quote_data|advisor_meeting_slot)$/i.test(args.awaiting)) {
    args.strictMemory.awaiting_action = "commercial_client_recognition";
    return {
      handled: true,
      strictReply: args.buildCommercialWelcomeMessage(),
      gate: "commercial_recognition_required",
      clientType: "",
    };
  }

  return { handled: false, clientType };
}

export async function handleCommercialNewCustomerRetryLookup(args: {
  awaiting: string;
  text: string;
  inboundFrom: string;
  strictMemory: Record<string, any>;
  supabase: any;
  ownerId: string;
  extractCompanyNit: (text: string) => string;
  normalizePhone: (raw: string) => string;
  extractCustomerPhone: (text: string, fallbackInbound: string) => string;
  phoneTail10: (raw: string) => string;
  normalizeText: (raw: string) => string;
  looksLikeBillingData: (raw: string) => boolean;
  findCommercialContactByIdentifiers: (args: {
    supabase: any;
    ownerId: string;
    lookupNit?: string;
    lookupPhone?: string;
    lookupPhoneTail?: string;
  }) => Promise<{ matchedContact: any; fallbackCandidatesCount: number }>;
  normalizeCityLabel: (raw: string) => string;
  sanitizeCustomerDisplayName: (raw: string) => string;
  buildExistingClientMatchConfirmationPrompt: (args: { company: string; nit: string; contact: string; email: string; phone: string }) => string;
}): Promise<null | { strictReply: string; gate: string }> {
  const retryTextNorm = args.normalizeText(String(args.text || ""));
  const hasRegistrationPayload =
    args.looksLikeBillingData(String(args.text || "")) ||
    /\b(empresa|correo|contacto|departamento|ciudad|razon\s+social|nombres?)\b/.test(retryTextNorm) ||
    /@/.test(String(args.text || ""));
  const retryLookupNit = String(args.extractCompanyNit(args.text) || "").replace(/\D/g, "").trim();
  const retryLookupPhone = args.normalizePhone(String(args.extractCustomerPhone(args.text, args.inboundFrom) || "").trim());
  const retryLookupPhoneTail = args.phoneTail10(retryLookupPhone);
  if (!(String(args.awaiting || "") === "commercial_new_customer_data" && !hasRegistrationPayload && (retryLookupNit || retryLookupPhoneTail))) {
    return null;
  }

  const retryLookup = await args.findCommercialContactByIdentifiers({
    supabase: args.supabase,
    ownerId: args.ownerId,
    lookupNit: retryLookupNit,
    lookupPhone: retryLookupPhone,
    lookupPhoneTail: retryLookupPhoneTail,
  });
  const matchedContact = retryLookup.matchedContact;

  if (matchedContact && typeof matchedContact === "object") {
    const matchedMeta = matchedContact?.metadata && typeof matchedContact.metadata === "object" ? matchedContact.metadata : {};
    const matchedNit = String(matchedMeta?.nit || "").replace(/\D/g, "").trim();
    const matchedCity = args.normalizeCityLabel(String(matchedMeta?.billing_city || "").trim());
    const matchedName = args.sanitizeCustomerDisplayName(String(matchedContact?.name || ""));
    const matchedEmail = String(matchedContact?.email || "").trim().toLowerCase();
    const matchedPhone = args.normalizePhone(String(matchedContact?.phone || ""));
    const matchedCompany = String(matchedContact?.company || "").trim();

    args.strictMemory.commercial_client_type = "existing";
    args.strictMemory.crm_contact_found = true;
    args.strictMemory.crm_contact_id = String(matchedContact?.id || "").trim();
    args.strictMemory.crm_contact_name = matchedName;
    args.strictMemory.crm_contact_email = matchedEmail;
    args.strictMemory.crm_contact_phone = matchedPhone;
    args.strictMemory.crm_company = matchedCompany;
    args.strictMemory.crm_nit = matchedNit;
    args.strictMemory.crm_billing_city = matchedCity;
    args.strictMemory.quote_data = {
      city: matchedCity || String(args.strictMemory?.quote_data?.city || "") || "Bogota",
      company: matchedCompany || String(args.strictMemory?.quote_data?.company || ""),
      nit: matchedNit || String(args.strictMemory?.quote_data?.nit || ""),
      contact: matchedName || String(args.strictMemory?.quote_data?.contact || ""),
      email: matchedEmail || String(args.strictMemory?.quote_data?.email || ""),
      phone: matchedPhone || args.normalizePhone(String(args.strictMemory?.customer_phone || args.inboundFrom || "")),
    };
    args.strictMemory.commercial_existing_match = {
      id: String(matchedContact?.id || "").trim(),
      company: matchedCompany,
      nit: matchedNit,
      contact: matchedName,
      email: matchedEmail,
      phone: matchedPhone,
      city: matchedCity,
    };
    args.strictMemory.awaiting_action = "commercial_existing_confirm";
    return {
      strictReply: [
        "Perfecto, gracias por la corrección. Ya encontré tu empresa en nuestra base de clientes.",
        "",
        args.buildExistingClientMatchConfirmationPrompt({
          company: matchedCompany,
          nit: matchedNit,
          contact: matchedName,
          email: matchedEmail,
          phone: matchedPhone,
        }),
      ].join("\n"),
      gate: "existing_customer_recovered_from_new_data",
    };
  }

  args.strictMemory.awaiting_action = "commercial_new_customer_data";
  return {
    strictReply: [
      "No encontré ese NIT/celular en nuestra base de clientes.",
      "Si quieres, intenta con otro NIT/celular o continúa como cliente nuevo.",
      "",
      "Opciones:",
      "1) Enviar otro NIT/celular para volver a buscar.",
      "2) Enviar en un solo mensaje: departamento/ciudad, empresa, NIT, nombre de contacto, correo y celular.",
    ].join("\n"),
    gate: "existing_customer_retry_not_found",
  };
}

export async function handleCommercialNewCustomerPersistAndDetectExisting(args: {
  strictMemory: Record<string, any>;
  inboundFrom: string;
  supabase: any;
  ownerId: string;
  tenantId?: string | null;
  agentId?: string | null;
  normalizeCityLabel: (raw: string) => string;
  sanitizeCustomerDisplayName: (raw: string) => string;
  normalizePhone: (raw: string) => string;
  phoneTail10: (raw: string) => string;
  findCommercialContactByIdentifiers: (args: {
    supabase: any;
    ownerId: string;
    lookupNit?: string;
    lookupPhone?: string;
    lookupPhoneTail?: string;
  }) => Promise<{ matchedContact: any; fallbackCandidatesCount: number }>;
  buildExistingClientMatchConfirmationPrompt: (args: { company: string; nit: string; contact: string; email: string; phone: string }) => string;
  upsertNewCommercialCustomerContact: (args: {
    supabase: any;
    ownerId: string;
    tenantId?: string | null;
    city: string;
    company: string;
    nit: string;
    contact: string;
    email: string;
    phone: string;
    normalizeCityLabel: (raw: string) => string;
    sanitizeCustomerDisplayName: (raw: string) => string;
    normalizePhone: (raw: string) => string;
    phoneTail10: (raw: string) => string;
  }) => Promise<boolean>;
  ensureAnalysisOpportunitySeed: (args: {
    supabase: any;
    ownerId: string;
    tenantId?: string | null;
    agentId?: string | null;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    companyName?: string;
    location?: string;
    customerNit?: string;
    customerType?: string;
    sanitizeCustomerDisplayName: (raw: string) => string;
    normalizePhone: (raw: string) => string;
    phoneTail10: (raw: string) => string;
    normalizeCityLabel: (raw: string) => string;
    normalizeText: (raw: string) => string;
    isQuoteDraftStatusConstraintError: (err: any) => boolean;
  }) => Promise<void>;
  normalizeText: (raw: string) => string;
  isQuoteDraftStatusConstraintError: (err: any) => boolean;
}): Promise<null | { strictReply: string; gate: string }> {
  const d = args.strictMemory?.new_customer_data && typeof args.strictMemory.new_customer_data === "object" ? args.strictMemory.new_customer_data : {};
  const city = args.normalizeCityLabel(String(d?.city || "").trim());
  const company = String(d?.company || "").trim();
  const nit = String(d?.nit || "").replace(/\D/g, "").trim();
  const contact = args.sanitizeCustomerDisplayName(String(d?.contact || "").trim());
  const email = String(d?.email || "").trim().toLowerCase();
  const phone = args.normalizePhone(String(d?.phone || "").trim());

  const existingFromFullData = await args.findCommercialContactByIdentifiers({
    supabase: args.supabase,
    ownerId: args.ownerId,
    lookupNit: nit,
    lookupPhone: phone,
    lookupPhoneTail: args.phoneTail10(phone),
  });
  const matchedContact = existingFromFullData.matchedContact;
  if (matchedContact && typeof matchedContact === "object") {
    const matchedMeta = matchedContact?.metadata && typeof matchedContact.metadata === "object" ? matchedContact.metadata : {};
    const matchedNit = String(matchedMeta?.nit || "").replace(/\D/g, "").trim();
    const matchedCity = args.normalizeCityLabel(String(matchedMeta?.billing_city || "").trim());
    const matchedName = args.sanitizeCustomerDisplayName(String(matchedContact?.name || ""));
    const matchedEmail = String(matchedContact?.email || "").trim().toLowerCase();
    const matchedPhone = args.normalizePhone(String(matchedContact?.phone || ""));
    const matchedCompany = String(matchedContact?.company || "").trim();

    args.strictMemory.commercial_client_type = "existing";
    args.strictMemory.commercial_validation_complete = false;
    args.strictMemory.crm_contact_found = true;
    args.strictMemory.crm_contact_id = String(matchedContact?.id || "").trim();
    args.strictMemory.crm_contact_name = matchedName;
    args.strictMemory.crm_contact_email = matchedEmail;
    args.strictMemory.crm_contact_phone = matchedPhone;
    args.strictMemory.crm_company = matchedCompany;
    args.strictMemory.crm_nit = matchedNit;
    args.strictMemory.crm_billing_city = matchedCity;
    args.strictMemory.quote_data = {
      city: matchedCity || String(args.strictMemory?.quote_data?.city || "") || "Bogota",
      company: matchedCompany || String(args.strictMemory?.quote_data?.company || ""),
      nit: matchedNit || String(args.strictMemory?.quote_data?.nit || ""),
      contact: matchedName || String(args.strictMemory?.quote_data?.contact || ""),
      email: matchedEmail || String(args.strictMemory?.quote_data?.email || ""),
      phone: matchedPhone || args.normalizePhone(String(args.strictMemory?.customer_phone || args.inboundFrom || "")),
    };
    args.strictMemory.commercial_existing_match = {
      id: String(matchedContact?.id || "").trim(),
      company: matchedCompany,
      nit: matchedNit,
      contact: matchedName,
      email: matchedEmail,
      phone: matchedPhone,
      city: matchedCity,
    };
    args.strictMemory.awaiting_action = "commercial_existing_confirm";
    return {
      strictReply: [
        "Ya encontré que esta información corresponde a un cliente existente en nuestra base.",
        "",
        args.buildExistingClientMatchConfirmationPrompt({
          company: matchedCompany,
          nit: matchedNit,
          contact: matchedName,
          email: matchedEmail,
          phone: matchedPhone,
        }),
      ].join("\n"),
      gate: "existing_customer_detected_from_full_data",
    };
  }

  if (city) args.strictMemory.crm_billing_city = city;
  if (company) args.strictMemory.crm_company = company;
  if (nit) args.strictMemory.crm_nit = nit;
  if (contact) {
    args.strictMemory.crm_contact_name = contact;
    args.strictMemory.customer_name = contact;
  }
  if (email) {
    args.strictMemory.crm_contact_email = email;
    args.strictMemory.customer_email = email;
  }
  if (phone) {
    args.strictMemory.crm_contact_phone = phone;
    args.strictMemory.customer_phone = phone;
    args.strictMemory.crm_contact_found = true;
  }

  const persistedNewCommercialContact = await args.upsertNewCommercialCustomerContact({
    supabase: args.supabase,
    ownerId: args.ownerId,
    tenantId: args.tenantId,
    city,
    company,
    nit,
    contact,
    email,
    phone,
    normalizeCityLabel: args.normalizeCityLabel,
    sanitizeCustomerDisplayName: args.sanitizeCustomerDisplayName,
    normalizePhone: args.normalizePhone,
    phoneTail10: args.phoneTail10,
  });
  if (!persistedNewCommercialContact) {
    args.strictMemory.commercial_validation_complete = false;
    args.strictMemory.awaiting_action = "commercial_new_customer_data";
    return {
      strictReply: [
        "Recibi tus datos, pero no pude guardarlos en CRM en este intento.",
        "Por favor reenvialos en un solo mensaje para completar el registro:",
        "- Departamento/ciudad",
        "- Tipo de cliente (Persona natural o Empresa)",
        "- Empresa (si aplica)",
        "- Documento (cédula o NIT, solo números, sin puntos, comas ni guiones)",
        "- Nombre de contacto",
        "- Correo",
        "- Celular",
      ].join("\n"),
      gate: "new_customer_data_persist_failed",
    };
  }

  await args.ensureAnalysisOpportunitySeed({
    supabase: args.supabase,
    ownerId: args.ownerId,
    tenantId: args.tenantId,
    agentId: args.agentId,
    customerName: contact,
    customerEmail: email,
    customerPhone: phone,
    companyName: company,
    location: city,
    customerNit: nit,
    customerType: "new",
    sanitizeCustomerDisplayName: args.sanitizeCustomerDisplayName,
    normalizePhone: args.normalizePhone,
    phoneTail10: args.phoneTail10,
    normalizeCityLabel: args.normalizeCityLabel,
    normalizeText: args.normalizeText,
    isQuoteDraftStatusConstraintError: args.isQuoteDraftStatusConstraintError,
  });

  return null;
}

export function handleCommercialNewCustomerEquipmentSelection(args: {
  text: string;
  awaiting: string;
  strictMemory: Record<string, any>;
  ownerRows: any[];
  detectEquipmentChoice: (text: string) => string;
  detectGuidedBalanzaProfile: (text: string) => string;
  detectIndustrialGuidedMode: (text: string) => string;
  buildGuidedPendingOptions: (rows: any[], profile: any, mode: any) => any[];
  buildGuidedBalanzaReplyWithMode: (profile: any, mode: any) => string;
  isDifferenceQuestionIntent: (text: string) => boolean;
  buildScaleDifferenceGuidanceReply: () => string;
  buildBalanzaQualificationPrompt: () => string;
  scopeStrictBasculaRows: (rows: any[]) => any[];
  buildNumberedProductOptions: (rows: any[], maxItems?: number) => any[];
  buildNoActiveCatalogEscalationMessage: (topic?: string) => string;
  equipmentChoiceLabel: (choice: string) => string;
  buildCommercialValidationOkMessage: () => string;
}): { handled: boolean; strictReply?: string; gate?: string } {
  const chosenEquipment = args.detectEquipmentChoice(args.text);
  const guidedProfileFromNeed = args.detectGuidedBalanzaProfile(args.text);
  const effectiveEquipment = chosenEquipment || (guidedProfileFromNeed ? "balanza" : "");
  if (effectiveEquipment && args.awaiting === "commercial_choose_equipment") {
    args.strictMemory.commercial_equipment_choice = effectiveEquipment;
    if (effectiveEquipment === "balanza") {
      const guidedProfile = guidedProfileFromNeed;
      if (guidedProfile) {
        const industrialMode = guidedProfile === "balanza_industrial_portatil_conteo" ? args.detectIndustrialGuidedMode(args.text) : "";
        const guidedOptions = args.buildGuidedPendingOptions(args.ownerRows as any[], guidedProfile, industrialMode as any);
        args.strictMemory.pending_product_options = guidedOptions;
        args.strictMemory.pending_family_options = [];
        args.strictMemory.awaiting_action = guidedOptions.length ? "strict_choose_model" : "strict_need_spec";
        args.strictMemory.last_category_intent = "balanzas";
        args.strictMemory.guided_balanza_profile = guidedProfile;
        args.strictMemory.guided_industrial_mode = industrialMode;
        args.strictMemory.strict_family_label = "balanzas";
        args.strictMemory.strict_model_offset = 0;
        return {
          handled: true,
          strictReply: args.buildGuidedBalanzaReplyWithMode(guidedProfile, industrialMode as any),
          gate: "balanza_guided_new_customer",
        };
      }
      args.strictMemory.awaiting_action = "strict_need_spec";
      return {
        handled: true,
        strictReply: args.isDifferenceQuestionIntent(args.text)
          ? args.buildScaleDifferenceGuidanceReply()
          : args.buildBalanzaQualificationPrompt(),
        gate: "balanza_qualification_new_customer",
      };
    }
    if (effectiveEquipment === "bascula") {
      args.strictMemory.last_category_intent = "basculas";
      const basculaRows = args.scopeStrictBasculaRows(args.ownerRows as any[]);
      const options = args.buildNumberedProductOptions(basculaRows as any[], 8);
      if (options.length) {
        args.strictMemory.pending_product_options = options;
        args.strictMemory.pending_family_options = [];
        args.strictMemory.awaiting_action = "strict_choose_model";
        args.strictMemory.strict_model_offset = 0;
        return {
          handled: true,
          strictReply: [
            `Perfecto. En catálogo activo tengo ${options.length} báscula(s).`,
            ...options.slice(0, 4).map((o: any) => `${o.code}) ${o.name}`),
            "",
            "Elige con letra/número (A/1), o escribe 'más'.",
          ].join("\n"),
          gate: "bascula_qualification_new_customer",
        };
      }
      args.strictMemory.awaiting_action = "strict_need_spec";
      return {
        handled: true,
        strictReply: "Perfecto. Para báscula, dime capacidad y resolución objetivo para recomendarte la mejor opción.",
        gate: "bascula_qualification_new_customer",
      };
    }
    if (effectiveEquipment === "analizador_humedad") {
      args.strictMemory.last_category_intent = "analizador_humedad";
      args.strictMemory.awaiting_action = "strict_need_spec";
      return {
        handled: true,
        strictReply: "Perfecto. Para analizador de humedad, dime tipo de muestra, capacidad aproximada y precisión objetivo.",
        gate: "humidity_qualification_new_customer",
      };
    }
    args.strictMemory.awaiting_action = "conversation_followup";
    return {
      handled: true,
      strictReply: args.buildNoActiveCatalogEscalationMessage(args.equipmentChoiceLabel(effectiveEquipment)),
      gate: "other_equipment_escalation_new_customer",
    };
  }
  args.strictMemory.awaiting_action = "commercial_choose_equipment";
  return {
    handled: true,
    strictReply: args.buildCommercialValidationOkMessage(),
    gate: "new_customer_data_completed",
  };
}

export async function handleCommercialNewCustomerStep(args: {
  strictReply: string;
  awaiting: string;
  clientType: string;
  text: string;
  inboundFrom: string;
  inboundPushName: string;
  strictMemory: Record<string, any>;
  ownerRows: any[];
  supabase: any;
  ownerId: string;
  tenantId?: string | null;
  agentId?: string | null;
  isInventoryInfoIntent: (text: string) => boolean;
  isCatalogBreadthQuestion: (text: string) => boolean;
  isGlobalCatalogAsk: (text: string) => boolean;
  normalizeText: (raw: string) => string;
  looksLikeBillingData: (raw: string) => boolean;
  extractCompanyNit: (text: string) => string;
  normalizePhone: (raw: string) => string;
  extractCustomerPhone: (text: string, fallbackInbound: string) => string;
  phoneTail10: (raw: string) => string;
  findCommercialContactByIdentifiers: any;
  normalizeCityLabel: (raw: string) => string;
  sanitizeCustomerDisplayName: (raw: string) => string;
  buildExistingClientMatchConfirmationPrompt: any;
  shouldEscalateToAdvisorByCommercialRule: (memory: any, text: string) => boolean;
  buildCommercialEscalationMessage: () => string;
  updateNewCustomerRegistration: any;
  extractSimpleLabeledValue: any;
  extractCustomerName: any;
  extractEmail: any;
  getMissingNewCustomerFields: (memory: any) => string[];
  buildNewCustomerDataPrompt: () => string;
  buildMissingNewCustomerDataMessage: (missing: string[]) => string;
  buildGoalGuidedNewCustomerDataMessage?: (memory: any, missing: string[]) => string;
  handleCommercialNewCustomerRetryLookup: any;
  handleCommercialNewCustomerPersistAndDetectExisting: any;
  upsertNewCommercialCustomerContact: any;
  ensureAnalysisOpportunitySeed: any;
  isQuoteDraftStatusConstraintError: any;
  handleCommercialNewCustomerEquipmentSelection: any;
  detectEquipmentChoice: any;
  detectGuidedBalanzaProfile: any;
  detectIndustrialGuidedMode: any;
  buildGuidedPendingOptions: any;
  buildGuidedBalanzaReplyWithMode: any;
  isDifferenceQuestionIntent: any;
  buildScaleDifferenceGuidanceReply: any;
  buildBalanzaQualificationPrompt: any;
  scopeStrictBasculaRows: any;
  buildNumberedProductOptions: any;
  buildNoActiveCatalogEscalationMessage: any;
  equipmentChoiceLabel: any;
  buildCommercialValidationOkMessage: any;
}): Promise<null | { strictReply: string; gate: string }> {
  const isPlainCatalogAsk = args.isInventoryInfoIntent(args.text) || args.isCatalogBreadthQuestion(args.text) || args.isGlobalCatalogAsk(args.text);
  const shouldHandleNewCommercialStep =
    args.clientType === "new" &&
    !isPlainCatalogAsk &&
    (!Boolean(args.strictMemory.commercial_validation_complete) || /^(commercial_client_recognition|commercial_new_customer_data|commercial_choose_equipment|none)$/i.test(args.awaiting));

  if (String(args.strictReply || "").trim() || !shouldHandleNewCommercialStep || /^(strict_quote_data|advisor_meeting_slot)$/i.test(args.awaiting)) return null;

  args.strictMemory.commercial_client_type = "new";
  args.strictMemory.awaiting_action = "commercial_new_customer_data";

  const retryLookupResult = await args.handleCommercialNewCustomerRetryLookup({
    awaiting: args.awaiting,
    text: args.text,
    inboundFrom: args.inboundFrom,
    strictMemory: args.strictMemory,
    supabase: args.supabase,
    ownerId: args.ownerId,
    extractCompanyNit: args.extractCompanyNit,
    normalizePhone: args.normalizePhone,
    extractCustomerPhone: args.extractCustomerPhone,
    phoneTail10: args.phoneTail10,
    normalizeText: args.normalizeText,
    looksLikeBillingData: args.looksLikeBillingData,
    findCommercialContactByIdentifiers: args.findCommercialContactByIdentifiers,
    normalizeCityLabel: args.normalizeCityLabel,
    sanitizeCustomerDisplayName: args.sanitizeCustomerDisplayName,
    buildExistingClientMatchConfirmationPrompt: args.buildExistingClientMatchConfirmationPrompt,
  });
  if (retryLookupResult) return retryLookupResult;

  if (args.shouldEscalateToAdvisorByCommercialRule(args.strictMemory, args.text)) {
    args.strictMemory.awaiting_action = "conversation_followup";
    return { strictReply: args.buildCommercialEscalationMessage(), gate: "commercial_escalation_new_customer" };
  }

  args.updateNewCustomerRegistration({
    memory: args.strictMemory,
    text: args.text,
    fallbackName: args.inboundPushName || "",
    normalizeCityLabel: args.normalizeCityLabel,
    extractSimpleLabeledValue: args.extractSimpleLabeledValue,
    sanitizeCustomerDisplayName: args.sanitizeCustomerDisplayName,
    extractCustomerName: args.extractCustomerName,
    extractEmail: args.extractEmail,
    normalizePhone: args.normalizePhone,
    extractCustomerPhone: args.extractCustomerPhone,
  });

  if (Boolean(args.strictMemory.is_persona_natural)) {
    args.strictMemory.awaiting_action = "conversation_followup";
    return { strictReply: args.buildCommercialEscalationMessage(), gate: "persona_natural_escalation" };
  }

  const missing = args.getMissingNewCustomerFields(args.strictMemory);
  if (missing.length) {
    return {
      strictReply: args.awaiting === "commercial_client_recognition"
        ? args.buildNewCustomerDataPrompt()
        : (args.buildGoalGuidedNewCustomerDataMessage
            ? args.buildGoalGuidedNewCustomerDataMessage(args.strictMemory, missing)
            : args.buildMissingNewCustomerDataMessage(missing)),
      gate: "new_customer_data_required",
    };
  }

  args.strictMemory.commercial_validation_complete = true;
  const persistAndDetectExistingResult = await args.handleCommercialNewCustomerPersistAndDetectExisting({
    strictMemory: args.strictMemory,
    inboundFrom: args.inboundFrom,
    supabase: args.supabase,
    ownerId: args.ownerId,
    tenantId: args.tenantId,
    agentId: args.agentId,
    normalizeCityLabel: args.normalizeCityLabel,
    sanitizeCustomerDisplayName: args.sanitizeCustomerDisplayName,
    normalizePhone: args.normalizePhone,
    phoneTail10: args.phoneTail10,
    findCommercialContactByIdentifiers: args.findCommercialContactByIdentifiers,
    buildExistingClientMatchConfirmationPrompt: args.buildExistingClientMatchConfirmationPrompt,
    upsertNewCommercialCustomerContact: args.upsertNewCommercialCustomerContact,
    ensureAnalysisOpportunitySeed: args.ensureAnalysisOpportunitySeed,
    normalizeText: args.normalizeText,
    isQuoteDraftStatusConstraintError: args.isQuoteDraftStatusConstraintError,
  });
  if (persistAndDetectExistingResult) return persistAndDetectExistingResult;

  const newEquipmentSelection = args.handleCommercialNewCustomerEquipmentSelection({
    text: args.text,
    awaiting: args.awaiting,
    strictMemory: args.strictMemory,
    ownerRows: args.ownerRows,
    detectEquipmentChoice: args.detectEquipmentChoice,
    detectGuidedBalanzaProfile: args.detectGuidedBalanzaProfile,
    detectIndustrialGuidedMode: args.detectIndustrialGuidedMode,
    buildGuidedPendingOptions: args.buildGuidedPendingOptions,
    buildGuidedBalanzaReplyWithMode: args.buildGuidedBalanzaReplyWithMode,
    isDifferenceQuestionIntent: args.isDifferenceQuestionIntent,
    buildScaleDifferenceGuidanceReply: args.buildScaleDifferenceGuidanceReply,
    buildBalanzaQualificationPrompt: args.buildBalanzaQualificationPrompt,
    scopeStrictBasculaRows: args.scopeStrictBasculaRows,
    buildNumberedProductOptions: args.buildNumberedProductOptions,
    buildNoActiveCatalogEscalationMessage: args.buildNoActiveCatalogEscalationMessage,
    equipmentChoiceLabel: args.equipmentChoiceLabel,
    buildCommercialValidationOkMessage: args.buildCommercialValidationOkMessage,
  });
  return { strictReply: String(newEquipmentSelection.strictReply || ""), gate: String(newEquipmentSelection.gate || "new_customer_data_completed") };
}
