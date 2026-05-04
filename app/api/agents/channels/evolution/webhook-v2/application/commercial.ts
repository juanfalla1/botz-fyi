function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizeCityLabel(raw: string): string {
  const t = normalizeText(String(raw || ""));
  if (!t) return "";
  if (/(bogota|bogota dc|bogota d c)/.test(t)) return "bogota";
  if (/(medellin|antioquia|envigado|itagui|sabaneta|bello)/.test(t)) return "antioquia";
  return t;
}

export function sanitizeCustomerDisplayName(raw: string): string {
  const v = String(raw || "").trim().replace(/\s+/g, " ");
  if (!v) return "";
  const lc = v.toLowerCase();
  if (["hola", "cliente", "usuario", "user", "amigo", "amiga"].includes(lc)) return "";
  if (/^\+?\d+$/.test(v)) return "";
  if (v.length < 2) return "";
  return v;
}

export function extractCustomerName(text: string, fallback: string): string {
  const m = String(text || "").match(/nombre(?:\s+completo)?\s*:\s*([^\n,.]+)/i);
  if (m?.[1]) return String(m[1]).trim();
  const fb = String(fallback || "").trim();
  if (!fb) return "";
  if (["hola", "cliente", "usuario", "user"].includes(fb.toLowerCase())) return "";
  return fb;
}

export function extractEmail(text: string): string {
  const m = String(text || "").match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return m ? String(m[0] || "").toLowerCase() : "";
}

export function extractCustomerPhone(args: {
  text: string;
  fallbackInbound: string;
  normalizePhone: (raw: string) => string;
}): string {
  const raw = String(args.text || "");
  const labeled = raw.match(/(?:telefono|tel|celular|movil|whatsapp)\s*[:=]?\s*([+\d\s().-]{8,25})/i);
  const fromLabel = args.normalizePhone(String(labeled?.[1] || ""));
  if (fromLabel.length >= 10 && fromLabel.length <= 12) return fromLabel;

  const any = raw.match(/\+?\d[\d\s().-]{8,20}\d/g);
  if (any?.length) {
    for (const candidate of any) {
      const n = args.normalizePhone(candidate);
      if (n.length >= 10 && n.length <= 12) return n;
    }
  }

  const inbound = args.normalizePhone(args.fallbackInbound || "");
  if (inbound.length >= 10 && inbound.length <= 12) return inbound;
  return "";
}

export function isPresent(v: string): boolean {
  return Boolean(String(v || "").trim());
}

export function looksLikeCustomerNameAnswer(text: string): string {
  const src = String(text || "").trim();
  if (!src) return "";
  const cleaned = src
    .replace(/^soy\s+/i, "")
    .replace(/^mi\s+nombre\s+es\s+/i, "")
    .replace(/^nombre\s*[:\-]\s*/i, "")
    .replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";
  if (cleaned.length < 3 || cleaned.length > 60) return "";
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length > 5) return "";
  const bad = ["hola", "si", "ok", "dale", "cotizar", "producto", "ficha", "imagen", "pdf"];
  if (words.some((w) => bad.includes(w.toLowerCase()))) return "";
  return sanitizeCustomerDisplayName(cleaned);
}

export function extractLabeledValue(text: string, labels: string[]): string {
  const raw = String(text || "");
  for (const label of labels) {
    const rxStrict = new RegExp(`(?:${label})\\s*[:=\\-–]\\s*([^\\n,;]{2,120})`, "i");
    const mStrict = raw.match(rxStrict);
    if (mStrict?.[1]) return String(mStrict[1]).trim();
    const rxLoose = new RegExp(`(?:${label})\\s+([^\\n,;]{2,120})`, "i");
    const mLoose = raw.match(rxLoose);
    if (mLoose?.[1]) return String(mLoose[1]).trim();
  }
  return "";
}

export function extractSimpleLabeledValue(text: string, keys: string[]): string {
  const source = String(text || "");
  for (const k of keys) {
    const m = source.match(new RegExp(`\\b${k}\\b\\s*[:=\\-–]?\\s*([^\\n,;]+)`, "i"));
    if (m?.[1]) return String(m[1]).trim();
  }
  return "";
}

export function detectPersonaNatural(text: string): boolean {
  const t = normalizeText(String(text || ""));
  return /persona\s+natural|soy\s+natural|no\s+tengo\s+empresa|sin\s+empresa/.test(t);
}

export function extractRut(text: string): string {
  const raw = String(text || "");
  const labeled = raw.match(/\brut\s*[:=]?\s*([a-z0-9.\-]{5,24})/i)?.[1] || "";
  return String(labeled || "").trim();
}

export function extractCommercialCompanyName(text: string): string {
  const raw = String(text || "");
  const labeled = raw.match(/\b(?:empresa|compania|compañia|razon\s+social)\s*[:=]?\s*([^\n,;]{3,120})/i)?.[1] || "";
  const cleaned = String(labeled || "").trim();
  if (!cleaned) return "";
  if (/^(persona\s+natural|natural)$/i.test(cleaned)) return "";
  return cleaned;
}

export function updateCommercialValidation(args: {
  memory: any;
  text: string;
  fallbackName: string;
  sanitizeCustomerDisplayName: (raw: string) => string;
  extractCustomerName: (text: string, fallback: string) => string;
  extractCompanyNit: (text: string) => string;
  isValidColombianNit: (value: string) => boolean;
  isLikelyRutValue: (value: string) => boolean;
}): void {
  const inferredName = args.sanitizeCustomerDisplayName(args.extractCustomerName(args.text, args.fallbackName || ""));
  const nit = args.extractCompanyNit(args.text);
  const rut = extractRut(args.text);
  const company = extractCommercialCompanyName(args.text);
  const saysPersonaNatural = detectPersonaNatural(args.text);
  const memory = args.memory;

  if (inferredName && !String(memory?.customer_name || "").trim()) memory.customer_name = inferredName;
  if (inferredName) memory.commercial_customer_name = inferredName;
  if (company) memory.commercial_company_name = company;
  if (nit) memory.commercial_company_nit = nit;
  if (rut) memory.commercial_rut = rut;
  if (saysPersonaNatural) memory.is_persona_natural = true;

  memory.has_customer_name = Boolean(String(memory?.commercial_customer_name || memory?.customer_name || "").trim());
  memory.has_company_name = Boolean(String(memory?.commercial_company_name || "").trim());
  memory.has_company_nit = args.isValidColombianNit(String(memory?.commercial_company_nit || ""));
  memory.has_rut = args.isLikelyRutValue(String(memory?.commercial_rut || ""));
  memory.has_valid_nit = memory.has_company_nit;
  memory.has_valid_rut = memory.has_rut;
  memory.is_persona_natural = Boolean(memory?.is_persona_natural);
  memory.commercial_validation_complete = memory.is_persona_natural
    ? Boolean(memory.has_customer_name && memory.has_rut)
    : Boolean(memory.has_customer_name && memory.has_company_name && memory.has_company_nit);
}

export function buildCommercialEscalationMessage(): string {
  return [
    "⚠️ Si no contamos con esta información, no podremos continuar con el proceso.",
    "Para continuar con este proceso te pondremos en contacto con nuestra asesora Milena.",
    "Milena: +57 300 8265047",
    "https://wa.me/573008265047",
  ].join("\n");
}

export function equipmentChoiceLabel(choice: string): string {
  const key = normalizeText(String(choice || ""));
  if (key === "balanza") return "balanzas";
  if (key === "bascula") return "basculas";
  if (key === "pesas_patron") return "pesas patron";
  if (key === "analizador_humedad") return "analizadores de humedad";
  if (key === "agitador_orbital") return "agitadores orbitales";
  if (key === "plancha_agitacion") return "planchas de calentamiento y agitacion";
  if (key === "centrifuga") return "centrifugas";
  if (key === "electroquimica") return "electroquimica";
  if (key === "otros") return "otros equipos";
  return "esa categoria";
}

export function detectUnavailableLabTopic(text: string): string {
  const t = normalizeText(String(text || ""));
  if (/(agita|agitad|agbit|orbital)/.test(t)) return "agitadores orbitales";
  if (/(planch|calent)/.test(t)) return "planchas de calentamiento y agitacion";
  if (/(centrifug|centrifuga|centrifugas)/.test(t)) return "centrifugas";
  if (/(electroquim|phmetro|conductivimetro|multiparametro|electrodos)/.test(t)) return "electroquimica";
  return "equipos de laboratorio";
}

export function looksLikeCommercialDataInput(text: string): boolean {
  const t = normalizeText(String(text || ""));
  if (!t) return false;
  return /(\bnit\b|\brut\b|\bnombre\b|\bempresa\b|\brazon\s+social\b|persona\s+natural)/.test(t);
}

export function buildCommercialValidationOkMessage(): string {
  return [
    "Perfecto, datos registrados correctamente.",
    "¿En qué equipo estás interesado?",
    "1) Balanza",
    "2) Báscula",
    "3) Pesas patrón",
    "4) Analizadores de humedad",
    "5) Agitadores orbitales",
    "6) Planchas de calentamiento y agitación",
    "7) Centrífugas",
    "8) Electroquímica (pHmetro, conductivímetro, multiparámetro y electrodos)",
    "9) Otros",
  ].join("\n");
}

export function isAffirmativeShortIntent(text: string, isQuoteProceedIntent: (text: string) => boolean): boolean {
  const t = normalizeText(String(text || "")).trim();
  if (!t) return false;
  if (/^(si|s[ií]|ok|dale|de\s+una|listo|hagamoslo|hagamoslo\s+asi|perfecto)$/.test(t)) return true;
  return isQuoteProceedIntent(t);
}

export function isNegativeShortIntent(text: string): boolean {
  const t = normalizeText(String(text || "")).trim();
  if (!t) return false;
  return /^(no|nop|negativo|despues|después|luego|ahora\s+no)$/.test(t);
}

export function buildNoActiveCatalogEscalationMessage(topic?: string): string {
  const label = String(topic || "").trim();
  return [
    label
      ? `Ahora mismo no tengo referencias activas para ${label} en el catalogo automatico.`
      : "Ahora mismo no tengo referencias activas para esa solicitud en el catalogo automatico.",
    "Te conecto de inmediato con nuestra asesora Milena para validar disponibilidad y precio actualizado:",
    "Milena: +57 300 8265047",
    "https://wa.me/573008265047",
  ].join("\n");
}

export async function upsertNewCommercialCustomerContact(args: {
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
}): Promise<boolean> {
  const ownerId = String(args.ownerId || "").trim();
  const city = args.normalizeCityLabel(String(args.city || "").trim());
  const company = String(args.company || "").trim();
  const nit = String(args.nit || "").replace(/\D/g, "").trim();
  const contact = args.sanitizeCustomerDisplayName(String(args.contact || "").trim());
  const email = String(args.email || "").trim().toLowerCase();
  const phone = args.normalizePhone(String(args.phone || "").trim());
  const tail = args.phoneTail10(phone);
  if (!ownerId || !company || !nit || !contact || !email || !phone) return false;

  const baseMeta = {
    nit,
    billing_city: city,
    customer_type: "new",
    source: "whatsapp_new_customer_data",
    whatsapp_transport_id: phone,
    whatsapp_lifecycle_at: new Date().toISOString(),
  };

  try {
    let existingByNit: any = null;
    const { data: byNit } = await args.supabase
      .from("agent_crm_contacts")
      .select("id,metadata")
      .eq("created_by", ownerId)
      .eq("contact_key", `nit:${nit}`)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (Array.isArray(byNit) && byNit[0]) existingByNit = byNit[0];

    const mergedMeta = {
      ...(existingByNit?.metadata && typeof existingByNit.metadata === "object" ? existingByNit.metadata : {}),
      ...baseMeta,
    };

    let persisted = false;
    for (let attempt = 0; attempt < 2 && !persisted; attempt++) {
      const { error: upsertErr } = await args.supabase
        .from("agent_crm_contacts")
        .upsert(
          {
            tenant_id: args.tenantId || null,
            created_by: ownerId,
            name: contact,
            email,
            phone,
            company,
            contact_key: `nit:${nit}`,
            status: "analysis",
            metadata: mergedMeta,
          },
          { onConflict: "created_by,contact_key" }
        );

      if (upsertErr) {
        console.error("[webhook-v2][crm-upsert-new-customer]", {
          attempt,
          ownerId,
          nit,
          phoneTail: tail,
          error: String((upsertErr as any)?.message || upsertErr),
        });
        continue;
      }

      const { data: verifyRows, error: verifyErr } = await args.supabase
        .from("agent_crm_contacts")
        .select("id")
        .eq("created_by", ownerId)
        .eq("contact_key", `nit:${nit}`)
        .limit(1);
      if (!verifyErr && Array.isArray(verifyRows) && verifyRows[0]?.id) persisted = true;
      if (verifyErr) {
        console.error("[webhook-v2][crm-upsert-new-customer-verify]", {
          ownerId,
          nit,
          error: String((verifyErr as any)?.message || verifyErr),
        });
      }
    }

    return persisted;
  } catch (error) {
    console.error("[webhook-v2][crm-upsert-new-customer-fatal]", {
      ownerId,
      nit,
      phoneTail: tail,
      error: String((error as any)?.message || error),
    });
    return false;
  }
}

export async function ensureAnalysisOpportunitySeed(args: {
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
}): Promise<void> {
  const ownerId = String(args.ownerId || "").trim();
  if (!ownerId) return;
  const customerName = args.sanitizeCustomerDisplayName(String(args.customerName || "").trim());
  const customerEmail = String(args.customerEmail || "").trim().toLowerCase();
  const customerPhone = args.normalizePhone(String(args.customerPhone || "").trim());
  const phoneTail = args.phoneTail10(customerPhone);
  if (!customerEmail && !phoneTail) return;

  try {
    let exists = false;
    let lookup = args.supabase
      .from("agent_quote_drafts")
      .select("id,payload,status,updated_at")
      .eq("created_by", ownerId)
      .order("updated_at", { ascending: false })
      .limit(20);
    if (customerEmail && phoneTail) {
      lookup = lookup.or(`customer_email.eq.${customerEmail},customer_phone.like.%${phoneTail}`);
    } else if (customerEmail) {
      lookup = lookup.eq("customer_email", customerEmail);
    } else {
      lookup = lookup.like("customer_phone", `%${phoneTail}`);
    }
    const { data: recentRows } = await lookup;
    if (Array.isArray(recentRows)) {
      exists = recentRows.some((r: any) => {
        const payload = r?.payload && typeof r.payload === "object" ? r.payload : {};
        const isSeed = Boolean(payload?.lead_seed);
        const st = args.normalizeText(String(r?.status || ""));
        const isOpenStage = /^(analysis|study|quote|purchase_order|invoicing|draft|sent|won|lost)$/.test(st);
        return isSeed || isOpenStage;
      });
    }
    if (exists) return;

    const draftPayload: any = {
      tenant_id: args.tenantId || null,
      created_by: ownerId,
      agent_id: args.agentId || null,
      customer_name: customerName || null,
      customer_email: customerEmail || null,
      customer_phone: customerPhone || null,
      company_name: String(args.companyName || "").trim() || null,
      location: args.normalizeCityLabel(String(args.location || "").trim()) || null,
      product_name: "Prospecto WhatsApp",
      notes: "Lead automático desde validación comercial (WhatsApp)",
      payload: {
        lead_seed: true,
        lead_seed_source: "whatsapp_commercial_validation",
        customer_nit: String(args.customerNit || "").replace(/\D/g, "").trim() || null,
        customer_type: args.normalizeText(String(args.customerType || "").trim()) || null,
        created_at_iso: new Date().toISOString(),
      },
      status: "analysis",
    };

    let { error: seedErr } = await args.supabase.from("agent_quote_drafts").insert(draftPayload);
    if (seedErr && args.isQuoteDraftStatusConstraintError(seedErr)) {
      draftPayload.status = "draft";
      draftPayload.payload = {
        ...(draftPayload.payload || {}),
        crm_stage: "analysis",
        crm_stage_updated_at: new Date().toISOString(),
      };
      const retry = await args.supabase.from("agent_quote_drafts").insert(draftPayload);
      seedErr = retry.error as any;
    }
    if (seedErr) {
      console.error("[webhook-v2][crm-seed-opportunity]", {
        ownerId,
        phoneTail,
        email: customerEmail,
        error: String((seedErr as any)?.message || seedErr),
      });
    }
  } catch (error) {
    console.error("[webhook-v2][crm-seed-opportunity-fatal]", {
      ownerId,
      phoneTail,
      email: customerEmail,
      error: String((error as any)?.message || error),
    });
  }
}

export function buildExistingClientMatchConfirmationPrompt(args: {
  company: string;
  nit: string;
  contact: string;
  email: string;
  phone: string;
}): string {
  const company = String(args.company || "").trim() || "Empresa no registrada";
  const nit = String(args.nit || "").trim() || "NIT no registrado";
  const contact = String(args.contact || "").trim() || "Contacto no registrado";
  const email = String(args.email || "").trim() || "Correo no registrado";
  const phone = String(args.phone || "").trim() || "Celular no registrado";
  return [
    "Perfecto, encontré estos datos en nuestra base:",
    `- Empresa: ${company}`,
    `- NIT: ${nit}`,
    `- Contacto: ${contact}`,
    `- Correo: ${email}`,
    `- Celular: ${phone}`,
    "",
    "¿Eres la misma persona de contacto?",
    "1) Sí, continuar",
    "2) No, soy otra persona/área",
  ].join("\n");
}

export function detectExistingClientConfirmationChoice(text: string): "same" | "different" | "" {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return "";
  if (/^(1|si|sí|soy yo|misma persona|correcto|confirmo|continuar)$/.test(t) || /(misma\s+persona|soy\s+yo|si\s+continuar)/.test(t)) return "same";
  if (/^(2|no|otra persona|otro contacto|otra area|otra área|cambio de personal)$/.test(t) || /(otra\s+persona|otro\s+contacto|otra\s+area|otra\s+área|cambio\s+de\s+personal)/.test(t)) return "different";
  return "";
}

export function parseExistingContactUpdateData(args: {
  text: string;
  fallbackInboundPhone: string;
  extractEmail: (text: string) => string;
  normalizePhone: (raw: string) => string;
  extractCustomerPhone: (text: string, fallbackInbound: string) => string;
  extractSimpleLabeledValue: (text: string, keys: string[]) => string;
  extractCustomerName: (text: string, fallback: string) => string;
  sanitizeCustomerDisplayName: (raw: string) => string;
}): {
  name: string;
  email: string;
  phone: string;
  area: string;
} {
  const raw = String(args.text || "");
  const lines = raw
    .split(/\n|;|,/)
    .map((l) => String(l || "").trim())
    .filter(Boolean);

  const email = String(args.extractEmail(raw) || lines.find((l) => /@/.test(l)) || "").trim().toLowerCase();
  const phone = args.normalizePhone(String(args.extractCustomerPhone(raw, args.fallbackInboundPhone || "") || "").trim());
  const area = String(args.extractSimpleLabeledValue(raw, ["area", "área", "cargo", "departamento"]) || "").trim();

  const fallbackNameLine = lines.find((l) => {
    const t = normalizeText(l);
    if (!t) return false;
    if (/@/.test(l)) return false;
    if (/^\+?\d[\d\s()-]{7,}$/.test(l)) return false;
    if (/\b(area|área|cargo|departamento|correo|email|cel|celular|telefono|tel|nit)\b/.test(t)) return false;
    return /[a-záéíóúñ]/i.test(l);
  }) || "";

  const name = args.sanitizeCustomerDisplayName(
    args.extractSimpleLabeledValue(raw, ["nombre", "contacto", "encargado", "responsable"]) ||
    args.extractCustomerName(raw, "") ||
    fallbackNameLine
  );
  return { name, email, phone, area };
}

export function getMissingNewCustomerFields(memory: any): string[] {
  const d = memory?.new_customer_data && typeof memory.new_customer_data === "object" ? memory.new_customer_data : {};
  const missing: string[] = [];
  if (!String(d.city || "").trim()) missing.push("Departamento/ciudad");
  if (!String(d.company || "").trim()) missing.push("Empresa");
  if (!/^\d{9,13}$/.test(String(d.nit || "").replace(/\D/g, ""))) {
    missing.push("Documento (cédula o NIT, solo números, sin puntos, comas ni guiones)");
  }
  if (!String(d.contact || "").trim()) missing.push("Nombre de Contacto");
  if (!String(d.email || "").trim()) missing.push("Correo");
  if (!/^\d{10,15}$/.test(String(d.phone || "").replace(/\D/g, ""))) missing.push("Celular");
  return missing;
}

export function buildMissingNewCustomerDataMessage(missing: string[]): string {
  return [
    "⚠️ Si no contamos con esta información, no podremos continuar con el proceso.",
    `Por favor completa: ${missing.join(", ")}.`,
  ].join("\n");
}

export function buildGoalGuidedNewCustomerDataMessage(memory: any, missing: string[]): string {
  const d = memory?.new_customer_data && typeof memory.new_customer_data === "object" ? memory.new_customer_data : {};
  const totalFields = 6;
  const done = Math.max(0, totalFields - Number(missing?.length || 0));

  const city = String(d.city || "").trim();
  const company = String(d.company || "").trim();
  const nit = String(d.nit || "").replace(/\D/g, "").trim();
  const contact = String(d.contact || "").trim();
  const email = String(d.email || "").trim().toLowerCase();
  const phone = String(d.phone || "").replace(/\D/g, "").trim();

  const missingSet = new Set((missing || []).map((v) => normalizeText(String(v || ""))));
  const isMissing = (keywords: string[]) => keywords.some((k) => {
    const nk = normalizeText(k);
    for (const m of missingSet) {
      if (m.includes(nk) || nk.includes(m)) return true;
    }
    return false;
  });

  const cityLine = isMissing(["departamento/ciudad", "departamento", "ciudad"]) ? "Departamento/ciudad: " : `Departamento/ciudad: ${city}`;
  const companyLine = isMissing(["empresa"]) ? "Empresa (si aplica): " : `Empresa (si aplica): ${company}`;
  const docLine = isMissing(["documento", "nit", "cedula", "cédula"]) ? "Documento (cédula o NIT): " : `Documento (cédula o NIT): ${nit}`;
  const contactLine = isMissing(["nombre de contacto", "contacto", "nombre"]) ? "Nombre de Contacto: " : `Nombre de Contacto: ${contact}`;
  const emailLine = isMissing(["correo", "email"]) ? "Correo: " : `Correo: ${email}`;
  const phoneLine = isMissing(["celular", "cel", "telefono", "tel"]) ? "Celular: " : `Celular: ${phone}`;

  return [
    `Vamos muy bien (${done}/${totalFields} datos). Para generar tu cotización me faltan: ${missing.join(", ")}.`,
    "",
    "Envíamelo en un solo mensaje con este formato:",
    cityLine,
    companyLine,
    docLine,
    contactLine,
    emailLine,
    phoneLine,
    "",
    "Objetivo: apenas esté completo, te genero la cotización.",
  ].join("\n");
}

export function shouldEscalateToAdvisorByCommercialRule(memory: any, text: string): boolean {
  const t = normalizeText(String(text || ""));
  if (Boolean(memory?.is_persona_natural)) return true;
  if (/solo\s+precio|solamente\s+precio|dame\s+precio\s+solamente/.test(t)) return true;
  if (/no\s+quiero\s+dar\s+datos|no\s+dare\s+datos|sin\s+datos/.test(t)) return true;
  return false;
}

export function detectEquipmentChoice(text: string): string {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (/^1$/.test(t) || /balanza/.test(t)) return "balanza";
  if (/^2$/.test(t) || /bascula|báscula/.test(t)) return "bascula";
  if (/^3$/.test(t) || /pesas?\s+patron/.test(t)) return "pesas_patron";
  if (/^4$/.test(t) || /analizador/.test(t)) return "analizador_humedad";
  if (/^5$/.test(t) || /agitador/.test(t)) return "agitador_orbital";
  if (/^6$/.test(t) || /planchas?/.test(t)) return "plancha_agitacion";
  if (/^7$/.test(t) || /centrifug/.test(t)) return "centrifuga";
  if (/^8$/.test(t) || /electroquim|phmetro|conductivimetro|multiparametro|electrodos/.test(t)) return "electroquimica";
  if (/^9$/.test(t) || /otros?/.test(t)) return "otros";
  return "";
}

export function detectClientRecognitionChoice(text: string): "new" | "existing" | "" {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (/^1$/.test(t) || /cliente\s+nuevo|soy\s+nuevo/.test(t)) return "new";
  if (/^2$/.test(t) || /ya\s+soy\s+cliente|ya\s+los\s+conozco|cliente\s+de\s+avanza/.test(t)) return "existing";
  return "";
}

export function extractLooseNewCustomerFields(text: string): { city: string; company: string; nit: string; contact: string } {
  const raw = String(text || "");
  const lines = raw
    .split(/\n|;|,/)
    .map((l) => String(l || "").trim())
    .filter(Boolean);
  let looseNit = "";
  for (const line of lines) {
    const candidate = String(line || "").replace(/\D/g, "");
    if (/^\d{8,12}$/.test(candidate)) {
      looseNit = candidate;
      break;
    }
  }
  const filtered = lines.filter((line) => {
    const l = normalizeText(line);
    if (looseNit && String(line).replace(/\D/g, "") === looseNit) return false;
    if (/@/.test(line)) return false;
    if (/^\+?\d[\d\s()-]{8,}$/.test(line)) return false;
    if (/\bnit\b|\bcorreo\b|\bemail\b|\bcel\b|\bcelular\b|\btelefono\b/.test(l)) return false;
    return true;
  });
  return {
    city: String(filtered[0] || "").trim(),
    company: String(filtered[1] || "").trim(),
    contact: String(filtered[2] || "").trim(),
    nit: looseNit,
  };
}

function cleanListLabelLine(rawLine: string): string {
  return String(rawLine || "")
    .replace(/^[\s\-•·*\.]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripKnownTemplatePrefix(line: string): string {
  const cleaned = cleanListLabelLine(line);
  return cleaned
    .replace(/^tipo\s+de\s+cliente\s*\([^)]*\)\s*/i, "")
    .replace(/^documento\s*\([^)]*\)\s*/i, "")
    .trim();
}

export function extractTemplateNewCustomerFields(text: string): {
  city: string;
  company: string;
  nit: string;
  contact: string;
  email: string;
  phone: string;
  isPersonaNatural: boolean;
} {
  const raw = String(text || "");
  const lines = raw
    .split(/\n/)
    .map((l) => stripKnownTemplatePrefix(l))
    .filter(Boolean);

  let city = "";
  let company = "";
  let nit = "";
  let contact = "";
  let email = "";
  let phone = "";
  let isPersonaNatural = false;

  for (const line of lines) {
    const normalized = normalizeText(line);
    const noParens = line.replace(/\([^)]*\)/g, " ");

    if (!city) {
      const mCity = noParens.match(/(?:departamento\s*\/\s*ciudad|departamento|ciudad)\s*[:=\-–]?\s*(.+)$/i);
      if (mCity?.[1]) city = String(mCity[1]).trim();
    }

    if (!company) {
      const mCompany = noParens.match(/(?:empresa\s*\(si\s*aplica\)|empresa|razon\s+social|compania|compañia)\s*[:=\-–]?\s*(.+)$/i);
      if (mCompany?.[1]) company = String(mCompany[1]).trim();
    }

    if (!contact) {
      const mContact = noParens.match(/(?:nombre\s+de\s+contacto|contacto|nombre)\s*[:=\-–]?\s*(.+)$/i);
      if (mContact?.[1]) contact = String(mContact[1]).trim();
    }

    if (!email) {
      const mEmail = line.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
      if (mEmail?.[0]) email = String(mEmail[0]).trim().toLowerCase();
    }

    if (!phone) {
      const mPhoneLabel = noParens.match(/(?:celular|cel|telefono|tel|movil|whatsapp)\s*[:=\-–]?\s*([+\d\s().-]{8,25})/i);
      const phoneDigits = String((mPhoneLabel?.[1] || "")).replace(/\D/g, "");
      if (phoneDigits) phone = phoneDigits;
    }

    if (!nit) {
      const mDoc = noParens.match(/(?:documento|cedula|c[eé]dula|nit)\s*[:=\-–]?\s*([\d.,\-\s]{6,24})/i);
      const docDigits = String((mDoc?.[1] || "")).replace(/\D/g, "");
      if (docDigits.length >= 8) nit = docDigits;
    }

    if (/persona\s+natural|natural/.test(normalized) && !/empresa/.test(normalized)) {
      isPersonaNatural = true;
    }
  }

  return {
    city,
    company,
    nit,
    contact,
    email,
    phone,
    isPersonaNatural,
  };
}

export function updateNewCustomerRegistration(args: {
  memory: any;
  text: string;
  fallbackName: string;
  normalizeCityLabel: (value: string) => string;
  extractSimpleLabeledValue: (text: string, keys: string[]) => string;
  sanitizeCustomerDisplayName: (raw: string) => string;
  extractCustomerName: (text: string, fallback: string) => string;
  extractEmail: (text: string) => string;
  normalizePhone: (raw: string) => string;
  extractCustomerPhone: (text: string, fallbackInbound: string) => string;
}): void {
  const current = args.memory?.new_customer_data && typeof args.memory.new_customer_data === "object" ? args.memory.new_customer_data : {};
  const loose = extractLooseNewCustomerFields(args.text);
  const template = extractTemplateNewCustomerFields(args.text);
  const city = args.normalizeCityLabel(args.extractSimpleLabeledValue(args.text, ["departamento/ciudad", "departamento", "ciudad"]) || template.city || loose.city || current.city || "");
  const company = args.extractSimpleLabeledValue(args.text, ["empresa (si aplica)", "empresa", "razon social", "compania", "compañia"]) || template.company || loose.company || current.company || "";
  const nit = String(args.extractSimpleLabeledValue(args.text, ["documento", "cedula", "cédula", "nit"]) || template.nit || loose.nit || current.nit || "").replace(/\D/g, "").trim();
  const contact = args.sanitizeCustomerDisplayName(args.extractSimpleLabeledValue(args.text, ["nombre de contacto", "contacto", "nombre"]) || template.contact || loose.contact || current.contact || args.extractCustomerName(args.text, args.fallbackName || ""));
  const email = String(args.extractEmail(args.text) || template.email || current.email || "").trim().toLowerCase();
  const phone = args.normalizePhone(String(args.extractCustomerPhone(args.text, "") || template.phone || current.phone || "").trim());

  args.memory.new_customer_data = { city, company, nit, contact, email, phone };
  if (template.isPersonaNatural) args.memory.is_persona_natural = true;
  args.memory.commercial_customer_name = contact || args.memory.commercial_customer_name || "";
  args.memory.commercial_company_name = company || args.memory.commercial_company_name || "";
  args.memory.commercial_company_nit = nit || args.memory.commercial_company_nit || "";
  args.memory.customer_name = contact || args.memory.customer_name || "";
}
