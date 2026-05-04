export function appendQuoteClosurePrompt(text: string, normalizeText: (value: string) => string): string {
  const base = String(text || "").trim();
  const prompt = [
    "Envio de cotización y ficha técnica",
    "De acuerdo con la información suministrada, te compartimos la cotización junto con la ficha técnica del equipo para tu revisión.",
    "",
    "¿Deseas saber algo más o recibir asesoría adicional? Con gusto te apoyamos 😊",
    "",
    "Recuerda que estás cotizando con Avanza International Group, distribuidores de la marca OHAUS, líder en el mercado, lo que te garantiza un equipo con la más alta tecnología, precisión y respaldo.",
    "",
    "Si tu equipo es para entrega en Bogotá o Medellín, te obsequiamos la entrega, instalación y capacitación. Para otras ciudades, el envío debe ser asumido por el cliente, pero te acompañamos con instalación y capacitación virtual.",
  ].join("\n");
  if (!base) return prompt;
  const t = normalizeText(base);
  if (/(envio de cotizacion y ficha tecnica|deseas saber algo mas|marca ohaus|instalacion y capacitacion virtual)/.test(t)) return base;
  return `${base}\n\n${prompt}`;
}

export function appendBundleQuoteClosurePrompt(text: string, normalizeText: (value: string) => string): string {
  const base = String(text || "").trim();
  const prompt = [
    "Envío de cotización consolidada",
    "De acuerdo con la información suministrada, te compartimos la cotización consolidada para tu revisión.",
    "Si deseas, también te comparto las fichas técnicas de cada referencia por separado.",
    "Escribe: fichas 1,2,3 (ejemplo).",
    "",
    "¿Deseas saber algo más o recibir asesoría adicional? Con gusto te apoyamos 😊",
    "",
    "Recuerda que estás cotizando con Avanza International Group, distribuidores de la marca OHAUS, líder en el mercado, lo que te garantiza un equipo con la más alta tecnología, precisión y respaldo.",
    "",
    "Si tu equipo es para entrega en Bogotá o Medellín, te obsequiamos la entrega, instalación y capacitación. Para otras ciudades, el envío debe ser asumido por el cliente, pero te acompañamos con instalación y capacitación virtual.",
  ].join("\n");
  if (!base) return prompt;
  const t = normalizeText(base);
  if (/(envio de cotizacion consolidada|fichas tecnicas de cada referencia|escribe:\s*fichas\s+1,2,3)/.test(t)) return base;
  return `${base}\n\n${prompt}`;
}

export function enforceWhatsAppDelivery(text: string, inboundText: string, normalizeText: (value: string) => string): string {
  const body = String(text || "");
  const intent = normalizeText(inboundText || "");
  const isSalesOrInfoFlow = /(cotiz|cotizacion|pdf|trm|precio|presupuesto|ficha|fichas|modelo|modelos|informacion|informacion tecnica|imagen|imagenes)/.test(intent);
  if (!isSalesOrInfoFlow) return body;
  const customerAskedEmail = /(correo|email|e-mail)/.test(intent);
  if (customerAskedEmail) return body;

  let fixed = body;
  fixed = fixed.replace(/correo\s+electr[oó]nico/gi, "WhatsApp");
  fixed = fixed.replace(/por\s+correo/gi, "por este WhatsApp");
  fixed = fixed.replace(/via\s+correo/gi, "por este WhatsApp");
  fixed = fixed.replace(/v[íi]a\s+correo/gi, "por este WhatsApp");
  fixed = fixed.replace(/te\s+la\s+enviare\s+a\s+tu\s+correo\s+en\s+breve\.?/gi, "Te la enviaré por este WhatsApp en breve.");
  fixed = fixed.replace(/te\s+la\s+enviare\s+a\s+tu\s+correo\s+electronico\.?/gi, "Te la enviaré por este WhatsApp.");
  fixed = fixed.replace(/te\s+la\s+enviare\s+a\s+tu\s+correo\.?/gi, "Te la enviaré por este WhatsApp.");
  fixed = fixed.replace(/enviarla\s+a\s+tu\s+correo\s+electronico/gi, "enviarla por este WhatsApp");
  fixed = fixed.replace(/enviarla\s+a\s+tu\s+correo/gi, "enviarla por este WhatsApp");
  fixed = fixed.replace(/enviartela\s+a\s+tu\s+correo\s+electronico/gi, "enviártela por este WhatsApp");
  fixed = fixed.replace(/enviartela\s+a\s+tu\s+correo/gi, "enviártela por este WhatsApp");
  fixed = fixed.replace(/la\s+cotizacion\s+formal\s+sera\s+generada\s+por\s+un\s+comercial[^.]*\.?/gi, "Te genero y envío la cotización por este WhatsApp.");
  fixed = fixed.replace(/no\s+puedo\s+enviar\s+la\s+cotizacion\s+formal\s+directamente\s+por\s+aqu[ií]\.?/gi, "Sí puedo enviarte la cotización por este WhatsApp.");
  fixed = fixed.replace(/estoy\s+en\s+modo\s+demo[^.]*\.?/gi, "Puedo enviarte archivos reales por este WhatsApp.");
  fixed = fixed.replace(/no\s+puedo\s+enviar\s+el\s+pdf\s+real[^.]*\.?/gi, "Sí puedo enviarte el PDF real por este WhatsApp.");
  fixed = fixed.replace(/se\s+pondra\s+en\s+contacto\s+contigo\s+para\s+generar\s+una\s+cotizacion\s+formal\.?/gi, "Si quieres, te genero la cotización aquí mismo por WhatsApp.");
  return fixed;
}
