function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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
  const city = args.normalizeCityLabel(args.extractSimpleLabeledValue(args.text, ["departamento", "ciudad"]) || loose.city || current.city || "");
  const company = args.extractSimpleLabeledValue(args.text, ["empresa", "razon social", "compania", "compañia"]) || loose.company || current.company || "";
  const nit = String(args.extractSimpleLabeledValue(args.text, ["nit"]) || loose.nit || current.nit || "").replace(/\D/g, "").trim();
  const contact = args.sanitizeCustomerDisplayName(args.extractSimpleLabeledValue(args.text, ["nombre de contacto", "contacto", "nombre"]) || loose.contact || current.contact || args.extractCustomerName(args.text, args.fallbackName || ""));
  const email = String(args.extractEmail(args.text) || current.email || "").trim().toLowerCase();
  const phone = args.normalizePhone(String(args.extractCustomerPhone(args.text, "") || current.phone || "").trim());

  args.memory.new_customer_data = { city, company, nit, contact, email, phone };
  args.memory.commercial_customer_name = contact || args.memory.commercial_customer_name || "";
  args.memory.commercial_company_name = company || args.memory.commercial_company_name || "";
  args.memory.commercial_company_nit = nit || args.memory.commercial_company_nit || "";
  args.memory.customer_name = contact || args.memory.customer_name || "";
}
