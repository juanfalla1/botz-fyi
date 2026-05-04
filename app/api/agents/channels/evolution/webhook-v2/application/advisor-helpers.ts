export function appendAdvisorAppointmentPrompt(text: string, normalizeText: (value: string) => string): string {
  const base = String(text || "").trim();
  if (!base) return "Si prefieres, también puedo agendar una cita con un asesor humano para cerrar la compra. Escribe: cita.";
  const t = normalizeText(base);
  if (/(agendar una cita|asesor humano|cerrar la compra|escribe:\s*cita)/.test(t)) return base;
  return `${base}\nSi prefieres, también puedo agendar una cita con un asesor humano para cerrar la compra. Escribe: cita.`;
}

export function buildGuidedRecoveryMessage(args: {
  awaiting: string;
  rememberedProduct?: string;
  hasPendingFamilies?: boolean;
  hasPendingModels?: boolean;
  inboundText?: string;
  normalizeText: (value: string) => string;
}): string {
  const awaiting = String(args.awaiting || "").trim();
  const rememberedProduct = String(args.rememberedProduct || "").trim();
  const hasPendingFamilies = Boolean(args.hasPendingFamilies);
  const hasPendingModels = Boolean(args.hasPendingModels);
  const inboundText = args.normalizeText(String(args.inboundText || ""));

  if (awaiting === "strict_choose_family" || hasPendingFamilies) {
    return [
      "No te preocupes si hubo un error de escritura, te guío de una.",
      "Responde con la letra/número de la familia (A/1), o dime qué vas a pesar y su funcionalidad (ej.: laboratorio, control de calidad, producción) y te sugiero la mejor opción.",
    ].join("\n");
  }

  if (awaiting === "strict_choose_model" || hasPendingModels) {
    return [
      "No pasa nada si hubo un typo.",
      "Responde con la letra/número del modelo (A/1), o escribe el modelo aproximado. También puedes escribir capacidad x resolución (ej.: 4000 g x 0.01 g).",
    ].join("\n");
  }

  if (rememberedProduct) {
    if (/(opciones?|alternativas?|categoria|categorias|familia|familias|balanza|balanzas|bascula|basculas|laboratorio|joyeria|joyería|industrial)/.test(inboundText)) {
      return [
        "Perfecto, mantengo el contexto y abrimos opciones según tu necesidad.",
        "Dime uso + capacidad + resolución (ej.: laboratorio, 1000 g, 0.1 g), o escribe solo la categoría y te muestro opciones activas.",
      ].join("\n");
    }
    if (/(sirve|aplica|funciona|precision|precisi[oó]n|resolucion|resoluci[oó]n|capacidad|pesar|menos de|mayor|menor)/.test(inboundText)) {
      return [
        `Claro. Tomo ${rememberedProduct} como referencia.`,
        "Para responder bien según catálogo, dime capacidad y resolución objetivo (ej.: 200 g x 0.001 g), o escribe: mayor resolución / más económica.",
      ].join("\n");
    }
    return [
      `Te ayudo de una con ${rememberedProduct}.`,
      "Puedes responder:",
      "1) Cotización",
      "2) Ficha técnica",
      "3) Otra pregunta técnica",
      "4) Cerrar conversación",
    ].join("\n");
  }

  return [
    "No te entendí del todo, pero te ayudo de una.",
    "Puedes escribir: modelo exacto (ej.: AX12001/E), categoría (balanzas o analizador humedad), o qué vas a pesar y su funcionalidad para orientarte mejor.",
    "También puedes ver el catálogo aquí: https://balanzasybasculas.com.co/",
    "Si quieres, te dejo más referencias aquí: https://share.google/cE6wPPEGCH3vytJMm",
  ].join("\n");
}

export function isAdvisorAppointmentIntent(text: string, normalizeText: (value: string) => string): boolean {
  const t = normalizeText(text || "");
  return /(\bcita\b|\basesor\b|asesor humano|asesor comercial|agendar|agenda|llamada con asesor|quiero hablar con asesor|mariana|milena|transferir\s+asesor|pasame\s+con\s+asesor)/.test(t);
}

export function buildAdvisorMiniAgendaPrompt(escalationLink: string): string {
  return [
    "Perfecto. Agendemos una llamada con asesor humano.",
    `Si prefieres atención inmediata, puedes escribirle a Milena aquí: ${escalationLink}`,
    "",
    "Elige horario:",
    "1) Hoy (en las próximas horas)",
    "2) Mañana 9:00 am",
    "3) Esta semana (próximo disponible)",
    "",
    "Responde 1, 2 o 3.",
  ].join("\n");
}

export function parseAdvisorMiniAgendaChoice(text: string, normalizeText: (value: string) => string): { iso: string; label: string } | null {
  const t = normalizeText(text || "");
  const now = new Date();
  const mk = (d: Date, label: string) => ({ iso: d.toISOString(), label });

  if (/\b1\b|hoy|ahora|mas tarde/.test(t)) {
    const d = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    return mk(d, "Hoy (próximas horas)");
  }
  if (/\b2\b|manana|mañana/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return mk(d, "Mañana 9:00 am");
  }
  if (/\b3\b|esta semana|proximo disponible|próximo disponible/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    d.setHours(10, 0, 0, 0);
    return mk(d, "Esta semana (próximo disponible)");
  }
  return null;
}
