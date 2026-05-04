export type ReusableBillingData = {
  city: string;
  company: string;
  nit: string;
  contact: string;
  email: string;
  phone: string;
  complete: boolean;
};

export type AnotherQuoteChoice = "same_model" | "other_model" | "cheaper" | "advisor";

export type AlternativeFollowupIntent =
  | "alternative_lower_price"
  | "alternative_same_need"
  | "alternative_other_brand"
  | "alternative_higher_capacity"
  | "alternative_lower_capacity"
  | "requote_same_model";

export function isHistoryIntent(text: string, normalizeText: (text: string) => string): boolean {
  const t = normalizeText(text);
  return /(mi historial|que tengo en mi historial|historial|mis cotizaciones|cotizaciones anteriores|compras anteriores|mi ultima cotizacion)/.test(t);
}

export function isContactInfoBundle(args: {
  text: string;
  extractEmail: (text: string) => string;
  extractCustomerPhone: (text: string, fallback: string) => string;
}): boolean {
  const t = String(args.text || "");
  const hasEmail = Boolean(args.extractEmail(t));
  const hasPhone = Boolean(args.extractCustomerPhone(t, ""));
  const hasNameLike = /(^|\n|\r)(nombre|name)\s*[:=]|^[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}(\s+[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,})?/m.test(t);
  return (hasPhone && hasNameLike) || (hasEmail && hasNameLike);
}

export function looksLikeBillingData(args: {
  text: string;
  isContactInfoBundle: (text: string) => boolean;
  extractEmail: (text: string) => string;
  extractCustomerPhone: (text: string, fallback: string) => string;
}): boolean {
  const raw = String(args.text || "").trim();
  if (!raw) return false;
  if (args.isContactInfoBundle(raw)) return true;
  const hasEmail = Boolean(args.extractEmail(raw));
  const hasPhone = Boolean(args.extractCustomerPhone(raw, ""));
  const hasNit = /\bnit\s*[:=]?\s*[0-9\.\-]{5,20}\b/i.test(raw);
  const hasLabeledFields = /\b(ciudad|empresa|razon\s+social|contacto|correo|email|celular|telefono)\s*[:=]/i.test(raw);
  const hasCityLike = /^[a-zA-Záéíóúüñ\s]{3,40}$/.test(raw) && !/@/.test(raw) && !/^\+?\d[\d\s\-]{6,}$/.test(raw);
  const hasNameLike = /^[a-zA-Záéíóúüñ\s]{6,60}$/.test(raw) && !/\b(cotiz|modelo|ficha|precio|marca|opcion|opciones|asesor)\b/i.test(raw);
  return hasNit || hasLabeledFields || hasEmail || hasPhone || hasCityLike || hasNameLike;
}

export function getReusableBillingData(args: {
  memory: any;
  normalizeCityLabel: (value: string) => string;
  normalizePhone: (value: string) => string;
}): ReusableBillingData {
  const q = args.memory?.quote_data && typeof args.memory.quote_data === "object" ? args.memory.quote_data : {};
  const ncd = args.memory?.new_customer_data && typeof args.memory.new_customer_data === "object" ? args.memory.new_customer_data : {};
  const city = args.normalizeCityLabel(String(q?.city || args.memory?.crm_billing_city || ncd?.city || "").trim());
  const company = String(q?.company || args.memory?.crm_company || args.memory?.commercial_company_name || ncd?.company || "").trim();
  const nit = String(q?.nit || args.memory?.crm_nit || args.memory?.commercial_company_nit || ncd?.nit || "").replace(/[^0-9.-]/g, "").trim();
  const contact = String(q?.contact || args.memory?.crm_contact_name || args.memory?.commercial_customer_name || args.memory?.customer_name || ncd?.contact || "").trim();
  const email = String(q?.email || args.memory?.crm_contact_email || args.memory?.customer_email || ncd?.email || "").trim().toLowerCase();
  const phone = args.normalizePhone(String(q?.phone || args.memory?.crm_contact_phone || args.memory?.customer_phone || ncd?.phone || "").trim());
  const complete = Boolean(city && company && nit && contact && email && phone);
  return { city, company, nit, contact, email, phone, complete };
}

export function billingDataAsSingleMessage(data: {
  city: string;
  company: string;
  nit: string;
  contact: string;
  email: string;
  phone: string;
}): string {
  return [
    `ciudad: ${data.city}`,
    `empresa: ${data.company}`,
    `nit: ${data.nit}`,
    `contacto: ${data.contact}`,
    `correo: ${data.email}`,
    `celular: ${data.phone}`,
  ].join(", ");
}

export function buildQuoteDataIntakePrompt(prefix: string, reusable: ReusableBillingData): string {
  const missing: string[] = [];
  if (!reusable.city) missing.push("ciudad");
  if (!reusable.company) missing.push("empresa");
  if (!reusable.nit) missing.push("NIT");
  if (!reusable.contact) missing.push("contacto");
  if (!reusable.email) missing.push("correo");
  if (!reusable.phone) missing.push("celular");
  if (!missing.length) {
    return `${prefix} Ya tengo tus datos de facturación. Si deseas continuar con los mismos datos, responde: mismos datos.`;
  }
  return `${prefix} Ya tengo parte de tus datos. Para continuar, envíame en un solo mensaje: ${missing.join(", ")}. Si deseas usar los mismos datos anteriores, responde: mismos datos.`;
}

export function isAnotherQuoteAmbiguousIntent(text: string, normalizeText: (value: string) => string): boolean {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  if (/^(otra|otro)$/.test(t)) return true;
  return /(otra\s+cotiz|otra\s+cotizacion|nueva\s+cotizacion|nueva\s+cotiz)/.test(t);
}

export function parseAnotherQuoteChoice(text: string, normalizeText: (value: string) => string): AnotherQuoteChoice | null {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return null;
  if (/^(1|del\s+mismo\s+modelo|mismo\s+modelo|misma\s+referencia|la\s+misma)$/.test(t)) return "same_model";
  if (/^(2|de\s+otro\s+modelo|otro\s+modelo|otro\s+equipo)$/.test(t)) return "other_model";
  if (/^(3|mas\s+economic|mas\s+barat|muy\s+costos|mas\s+economicas?)$/.test(t)) return "cheaper";
  if (/^(4|hablar\s+con\s+asesor|asesor|cita)$/.test(t)) return "advisor";
  return null;
}

export function buildAnotherQuotePrompt(): string {
  return [
    "Claro. ¿Qué tipo de cotización quieres?",
    "1) Del mismo modelo",
    "2) De otro modelo",
    "3) Ver opciones más económicas",
    "4) Hablar con asesor",
  ].join("\n");
}

export function isGreetingIntent(text: string, normalizeText: (text: string) => string): boolean {
  const t = normalizeText(text).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  const hasGreeting = /^(hola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hey|hi)\b/.test(t);
  const hasBusinessIntent = /(cotiz|producto|pdf|trm|historial|recomiend|precio|catalogo)/.test(t);
  return hasGreeting && !hasBusinessIntent && t.length <= 40;
}

export function shouldUseFullGreeting(memory: any, normalizeText: (text: string) => string): boolean {
  const lastIntent = normalizeText(String(memory?.last_intent || ""));
  const lastUserAt = Date.parse(String(memory?.last_user_at || ""));
  if (lastIntent !== "greeting") return true;
  if (!Number.isFinite(lastUserAt)) return true;
  const elapsed = Date.now() - lastUserAt;
  return elapsed > 12 * 60 * 60 * 1000;
}

export function buildGreetingReply(args: {
  knownCustomerName: string;
  memory: any;
  shouldUseFullGreeting: (memory: any) => boolean;
}): string {
  const hasName = Boolean(String(args.knownCustomerName || "").trim());
  const hasHistory = Boolean(
    String(args.memory?.last_user_at || "").trim() ||
    String(args.memory?.last_intent || "").trim() ||
    String(args.memory?.customer_name || "").trim() ||
    String(args.memory?.last_quote_draft_id || "").trim()
  );
  const hasQuoteContext =
    Boolean(String(args.memory?.last_quote_draft_id || "").trim() || String(args.memory?.last_quote_pdf_sent_at || "").trim()) ||
    /(quote_generated|quote_recall|price_request)/.test(String(args.memory?.last_intent || ""));

  if (!hasHistory) {
    return hasName
      ? `Hola, ${args.knownCustomerName} 👋\nGracias por ser parte de la comunidad OHAUS 🤗, que está revolucionando la calidad de los productos para su empresa.\n¿Qué producto necesitas hoy?`
      : "Hola 👋\nGracias por ser parte de la comunidad OHAUS 🤗, que está revolucionando la calidad de los productos para su empresa.\n¿Qué producto necesitas hoy?";
  }

  if (hasQuoteContext) {
    return hasName
      ? `Hola de nuevo, ${args.knownCustomerName} 👋 ¿Continuamos con tu cotización o te cotizo otro modelo?`
      : "Hola de nuevo 👋 ¿Continuamos con tu cotización o te cotizo otro modelo?";
  }

  if (args.shouldUseFullGreeting(args.memory)) {
    return hasName
      ? `Hola, ${args.knownCustomerName} 👋 Qué bueno tenerte de nuevo. Dime el modelo exacto y te envío ficha o cotización.`
      : "Hola 👋 Qué bueno tenerte de nuevo. Dime el modelo exacto y te envío ficha o cotización.";
  }

  return hasName
    ? `Hola de nuevo, ${args.knownCustomerName} 👋 Dime modelo exacto y te envío ficha o cotización.`
    : "Hola de nuevo 👋 Dime modelo exacto y te envío ficha o cotización.";
}

export function isAffirmativeIntent(text: string, normalizeText: (text: string) => string): boolean {
  const t = normalizeText(text).replace(/[^a-z0-9\s]/g, " ").trim();
  return /^(si|sí|ok|vale|listo|dale|de una|perfecto|por favor|si por favor|hazlo|enviala|enviamela)\b/.test(t);
}

export function isConversationCloseIntent(text: string, normalizeCatalogQueryText: (text: string) => string): boolean {
  const t = normalizeCatalogQueryText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  return /\b(no gracias|gracias|eso es todo|nada mas|finaliza|finalizar|finalicemos|finalizamos|termina|terminar|cerrar|cerramos|listo gracias|ok gracias|perfecto gracias|hasta luego|adios|chao)\b/.test(t);
}

export function isCorrectionIntent(text: string, normalizeText: (text: string) => string): boolean {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  return /(no entend|entendiste mal|esta mal|esta incorrect|no era eso|no me sirve|no coincide|equivoc|mal seleccionado|corrige)/.test(t);
}

export function isAlternativeRejectionIntent(text: string, normalizeText: (text: string) => string): boolean {
  const t = normalizeText(String(text || ""));
  if (!t) return false;
  return /(no\s+me\s+sirve|no\s+me\s+sirven|no\s+busco\s+eso|no\s+es\s+eso|no\s+me\s+funciona|no\s+me\s+conviene|ninguna\s+de\s+estas?|ninguna\s+me\s+sirve|en\s+lo\s+que\s+estoy\s+buscando|no\s+es\s+lo\s+que\s+busco|que\s+mas\s+opciones|que\s+otras\s+opciones|que\s+otra\s+tienes|que\s+mas\s+tienes)/.test(t);
}

export function toReadableBulletList(raw: string, maxLines = 4, normalizeText: (text: string) => string): string {
  const cleaned = String(raw || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  let chunks = cleaned
    .split(/[.;]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (chunks.length <= 1) {
    chunks = cleaned
      .split(/,\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  chunks = chunks
    .filter((s, i, arr) => arr.findIndex((x) => normalizeText(x) === normalizeText(s)) === i)
    .slice(0, maxLines);
  if (!chunks.length) return "";
  return chunks.map((c) => `- ${c}`).join("\n");
}

export function extractCatalogTerms(text: string, normalizeCatalogQueryText: (text: string) => string): string[] {
  const stop = new Set([
    "hola", "quiero", "necesito", "enviame", "envia", "ficha", "tecnica", "fichatecnica", "imagen", "imagenes", "foto", "fotos",
    "de", "del", "la", "el", "los", "las", "por", "para", "con", "y", "o", "que", "cual", "cuales", "modelo", "producto",
    "whatsapp", "favor", "porfavor", "si", "no", "una", "un", "esa", "ese", "me", "ya", "tienes", "tiene", "balanza", "balanzas",
    "bascula", "basculas", "ohaus", "especificaciones", "especificacion", "specs", "puedes", "puede", "enviar", "mandar", "mandame", "podrias", "podria",
  ]);
  return Array.from(
    new Set(
      normalizeCatalogQueryText(text || "")
        .split(/[^a-z0-9]+/i)
        .map((x) => x.trim())
        .filter((x) => x.length >= 3)
        .filter((x) => !stop.has(x))
    )
  );
}

export function isBudgetVisibilityFollowup(text: string, normalizeText: (text: string) => string): boolean {
  const t = normalizeText(String(text || ""));
  if (!/\b(presupuesto|precio|valor)\b/.test(t)) return false;
  return /(no\s+(sale|aparece|veo|salio|salio)|falta|no\s+me\s+(sale|aparece)|donde\s+esta|donde\s+quedo|no\s+sale\s+el\s+(presupuesto|precio|valor)|no\s+veo\s+el\s+(presupuesto|precio|valor))/.test(t);
}

export function detectAlternativeFollowupIntent(text: string, normalizeText: (text: string) => string): AlternativeFollowupIntent | null {
  const t = normalizeText(String(text || ""));
  if (!t) return null;
  if (/(otra\s+marca|otras\s+marcas|marca\s+diferente|de\s+otra\s+marca)/.test(t)) return "alternative_other_brand";
  if (/(muy\s+costos|mas\s+barat|más\s+barat|mas\s+econom|más\s+econom|economic)/.test(t)) return "alternative_lower_price";
  if (/(mayor\s+capacidad|mas\s+capacidad|más\s+capacidad)/.test(t)) return "alternative_higher_capacity";
  if (/(menor\s+capacidad|menos\s+capacidad)/.test(t)) return "alternative_lower_capacity";
  if (/(mayor\s+resolucion|mejor\s+resolucion|mas\s+resolucion|más\s+resolucion|mas\s+precision|más\s+precision|mejor\s+precision|menor\s+resolucion|menos\s+precision|menor\s+precision)/.test(t)) return "alternative_same_need";
  if (/(alternativ|otra\s+opcion|otro\s+modelo|similar|parecid|equivalent)/.test(t)) return "alternative_same_need";
  if (/(mismo\s+modelo|misma\s+referencia|esta\s+misma|este\s+mismo|la\s+misma\s+cotizacion|misma\s+cotizacion)/.test(t)) return "requote_same_model";
  if (/(otra\s+cotiz|otra\s+cotizacion|nueva\s+cotizacion|re\s*cotiz)/.test(t)) return null;
  return null;
}
