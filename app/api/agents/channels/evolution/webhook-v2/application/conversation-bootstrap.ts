export function buildNextMemory(args: {
  previousMemory: any;
  inboundText: string;
  inboundCustomerPhone: string;
}): Record<string, any> {
  const { previousMemory, inboundText, inboundCustomerPhone } = args;
  const nextMemory: Record<string, any> = {
    ...previousMemory,
    last_user_text: inboundText,
    last_user_at: new Date().toISOString(),
  };
  if (!String(nextMemory.customer_phone || "").trim() && inboundCustomerPhone.length >= 10 && inboundCustomerPhone.length <= 12) {
    nextMemory.customer_phone = inboundCustomerPhone;
  }
  if (String(previousMemory?.conversation_status || "") === "closed") {
    nextMemory.awaiting_action = "none";
    nextMemory.pending_product_options = [];
    nextMemory.last_selected_product_id = "";
    nextMemory.last_selected_product_name = "";
    nextMemory.last_selection_at = "";
    nextMemory.conversation_status = "open";
  } else if (!nextMemory.conversation_status) {
    nextMemory.conversation_status = "open";
  }
  return nextMemory;
}

export function collectHistoryMessages(transcript: any): Array<{ role: "user" | "assistant"; content: string }> {
  const historyMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (transcript && Array.isArray(transcript)) {
    for (const msg of transcript.slice(-10)) {
      if (msg?.role === "user" && msg?.content) {
        historyMessages.push({ role: "user", content: msg.content });
      } else if (msg?.role === "assistant" && msg?.content) {
        historyMessages.push({ role: "assistant", content: msg.content });
      }
    }
  }
  return historyMessages;
}

export async function resolveKnownCustomerProfile(args: {
  supabase: any;
  ownerId: string;
  agentId: string;
  inboundFilter: string;
  inboundPhoneNorm: string;
  inboundPhoneTail: string;
  previousMemory: any;
  existingConvContactName: string;
  inboundPushName: string;
  nextMemory: Record<string, any>;
  normalizePhone: (raw: string) => string;
  phoneTail10: (raw: string) => string;
  normalizeText: (v: string) => string;
  normalizeCityLabel: (v: string) => string;
  sanitizeCustomerDisplayName: (v: string) => string;
}): Promise<{ knownCustomerName: string; recognizedReturningCustomer: boolean; crmContactProfile: any }> {
  const {
    supabase,
    ownerId,
    agentId,
    inboundFilter,
    inboundPhoneNorm,
    inboundPhoneTail,
    previousMemory,
    existingConvContactName,
    inboundPushName,
    nextMemory,
    normalizePhone,
    phoneTail10,
    normalizeText,
    normalizeCityLabel,
    sanitizeCustomerDisplayName,
  } = args;

  const inboundName = sanitizeCustomerDisplayName(inboundPushName || "");
  let recognizedReturningCustomer = false;
  let crmContactProfile: any = null;
  let knownCustomerName = sanitizeCustomerDisplayName(String(nextMemory.customer_name || ""))
    || sanitizeCustomerDisplayName(String(existingConvContactName || ""))
    || inboundName;

  if (!knownCustomerName) {
    try {
      const { data: crmContact } = await supabase
        .from("agent_crm_contacts")
        .select("id,name,email,phone,company,status,quote_requests_count,metadata")
        .eq("created_by", ownerId)
        .or(inboundFilter.replace(/contact_phone/g, "phone"))
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      crmContactProfile = crmContact as any;
      knownCustomerName = sanitizeCustomerDisplayName(String((crmContact as any)?.name || ""));
      const crmStatus = normalizeText(String((crmContact as any)?.status || ""));
      const crmQuotes = Number((crmContact as any)?.quote_requests_count || 0);
      recognizedReturningCustomer =
        recognizedReturningCustomer ||
        crmQuotes > 0 ||
        /^(purchase_order|invoicing|won|quote|sent)$/.test(crmStatus);
    } catch {
      // ignore missing table or transient query errors
    }
  }

  if (crmContactProfile && typeof crmContactProfile === "object") {
    const crmMeta = crmContactProfile?.metadata && typeof crmContactProfile.metadata === "object" ? crmContactProfile.metadata : {};
    const crmNit = String(crmMeta?.nit || "").trim();
    const crmCity = normalizeCityLabel(String(crmMeta?.billing_city || "").trim());
    const crmTier = normalizeText(String(crmMeta?.price_tier || "").trim());
    const crmType = normalizeText(String(crmMeta?.customer_type || "").trim());
    nextMemory.crm_contact_found = true;
    nextMemory.crm_contact_id = String((crmContactProfile as any)?.id || "").trim();
    nextMemory.crm_contact_name = String((crmContactProfile as any)?.name || "").trim();
    nextMemory.crm_contact_email = String((crmContactProfile as any)?.email || "").trim();
    nextMemory.crm_contact_phone = String((crmContactProfile as any)?.phone || "").trim();
    nextMemory.crm_company = String((crmContactProfile as any)?.company || "").trim();
    nextMemory.crm_nit = crmNit;
    nextMemory.crm_billing_city = crmCity;
    nextMemory.crm_price_tier = crmTier;
    nextMemory.crm_customer_type = crmType;
  } else {
    nextMemory.crm_contact_found = Boolean(previousMemory?.crm_contact_found);
  }

  if (!knownCustomerName) {
    try {
      const { data: nameDrafts } = await supabase
        .from("agent_quote_drafts")
        .select("customer_name,customer_phone")
        .eq("created_by", ownerId)
        .eq("agent_id", String(agentId))
        .order("created_at", { ascending: false })
        .limit(30);
      const list = Array.isArray(nameDrafts) ? nameDrafts : [];
      const mine = list.find((d: any) => {
        const p = normalizePhone(String(d?.customer_phone || ""));
        return p === inboundPhoneNorm || phoneTail10(p) === inboundPhoneTail;
      });
      knownCustomerName = sanitizeCustomerDisplayName(String((mine as any)?.customer_name || ""));
      if (mine) recognizedReturningCustomer = true;
    } catch {
      // ignore
    }
  }

  if (!recognizedReturningCustomer) {
    try {
      const { data: recentDrafts } = await supabase
        .from("agent_quote_drafts")
        .select("customer_phone")
        .eq("created_by", ownerId)
        .eq("agent_id", String(agentId))
        .order("created_at", { ascending: false })
        .limit(60);
      const drafts = Array.isArray(recentDrafts) ? recentDrafts : [];
      recognizedReturningCustomer = drafts.some((d: any) => {
        const p = normalizePhone(String(d?.customer_phone || ""));
        return p === inboundPhoneNorm || phoneTail10(p) === inboundPhoneTail;
      });
    } catch {
      // ignore
    }
  }

  if (knownCustomerName) nextMemory.customer_name = knownCustomerName;
  nextMemory.recognized_returning_customer = recognizedReturningCustomer;

  return { knownCustomerName, recognizedReturningCustomer, crmContactProfile };
}
