function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function quoteClosureCta(): string {
  return "Dime cuál balanza te interesa para cotizar (número o modelo).";
}

export function appendQuoteClosureCta(text: string): string {
  const body = String(text || "").trim();
  if (!body) return quoteClosureCta();
  if (/dime\s+cual\s+balanza\s+te\s+interesa\s+para\s+cotizar/i.test(normalizeText(body))) return body;
  return `${body}\n\n${quoteClosureCta()}`;
}

export function buildCapacityResolutionExplanation(): string {
  return appendQuoteClosureCta([
    "Capacidad:",
    "Es el peso máximo que una balanza puede medir.",
    "👉 Ejemplo: si la capacidad es de 5 kg, no puedes pesar más de eso.",
    "",
    "Resolución:",
    "Es la cantidad de dígitos que ves después del punto (.) en el peso, y define qué tan preciso es el resultado.",
    "👉 Ejemplo:",
    "1 decimal → 0.1 g = 100 mg",
    "2 decimales → 0.01 g = 10 mg",
    "3 decimales → 0.001 g = 1 mg",
    "",
    "En pocas palabras:",
    "Capacidad = cuánto peso aguanta",
    "Resolución = cuántos decimales muestra (qué tan exacto mide) 👍",
  ].join("\n"));
}

export function buildPriceObjectionReply(): string {
  return appendQuoteClosureCta([
    "Buena pregunta 👌",
    "La diferencia real está en esto:",
    "1) Estabilidad y precisión real",
    "Las balanzas profesionales mantienen lecturas estables, incluso con vibraciones o cambios de ambiente.",
    "2) Reproducibilidad",
    "En laboratorio necesitas que el resultado sea el mismo siempre, no que varíe cada vez que pesas.",
    "3) Durabilidad y respaldo",
    "Son equipos diseñados para uso continuo, con soporte técnico y garantía real.",
    "",
    "👉 Las más económicas pesan,",
    "👉 las profesionales garantizan resultados confiables.",
    "",
    "Si quieres, te propongo 3 opciones por gama (esencial/intermedia/premium) para comparar costo-beneficio y elegir la ideal.",
  ].join("\n"));
}

export function pickDistinctGamaOptions(
  options: any[],
  maxItems = 3,
  gamaLabelForModelName: (name: string) => string
): any[] {
  const list = Array.isArray(options) ? options : [];
  const selected: any[] = [];
  const seenIds = new Set<string>();
  const seenGamas = new Set<string>();

  const optionGamaLabel = (option: any): string => {
    const fromName = String(option?.name || "").match(/\bgama\s*:\s*([a-zA-Z]+)/i);
    if (fromName?.[1]) return normalizeText(String(fromName[1] || ""));
    return normalizeText(gamaLabelForModelName(String(option?.raw_name || option?.name || "")));
  };

  for (const opt of list) {
    const id = String(opt?.id || opt?.product_id || opt?.raw_name || opt?.name || "").trim();
    if (!id || seenIds.has(id)) continue;
    const gama = optionGamaLabel(opt);
    if (!gama || seenGamas.has(gama)) continue;
    selected.push(opt);
    seenIds.add(id);
    seenGamas.add(gama);
    if (selected.length >= maxItems) return selected;
  }

  for (const opt of list) {
    const id = String(opt?.id || opt?.product_id || opt?.raw_name || opt?.name || "").trim();
    if (!id || seenIds.has(id)) continue;
    selected.push(opt);
    seenIds.add(id);
    if (selected.length >= maxItems) return selected;
  }

  return selected;
}

export function normalizeDeliveryLabel(raw: string): string {
  const t = normalizeText(String(raw || ""));
  if (!t) return "";
  if (/(stock|inmediat|disponible\s+ya|entrega\s+inmediata)/.test(t)) return "stock";
  if (/(4\s*seman|cuatro\s*seman|importaci)/.test(t)) return "importación a cuatro semanas";
  return String(raw || "").trim();
}

export function deliveryLabelForRow(args: {
  row: any;
  catalogReferenceCode: (row: any) => string;
  guidedCatalog: any;
}): string {
  const { row, catalogReferenceCode, guidedCatalog } = args;
  const source = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const fromRow = [row?.delivery, row?.delivery_time, row?.lead_time, row?.availability, row?.disponibilidad]
    .map((v) => String(v || "").trim())
    .find(Boolean) || "";
  const fromSource = [source?.delivery, source?.delivery_time, source?.lead_time, source?.availability, source?.disponibilidad, source?.entrega]
    .map((v: any) => String(v || "").trim())
    .find(Boolean) || "";
  const direct = normalizeDeliveryLabel(fromRow || fromSource);
  if (direct) return direct;
  const modelNorm = normalizeText(catalogReferenceCode(row) || String(row?.name || ""));
  const guided = Object.values(guidedCatalog || {})
    .flatMap((g: any) => g)
    .flatMap((g: any) => g.models)
    .find((m: any) => modelNorm.includes(normalizeText(m.model)));
  return guided?.delivery || "";
}

export function isScaleUseExplanationIntent(text: string): boolean {
  const t = normalizeText(String(text || "")).replace(/\s+/g, " ").trim();
  if (!t) return false;
  return /(para\s+que\s+sirven?|que\s+uso\s+tienen|para\s+que\s+se\s+usan|para\s+que\s+me\s+sirven)/.test(t) && /(balanza|balanzas|bascula|basculas)/.test(t);
}

export function buildScaleUseExplanationReply(categoryHint: string): string {
  const isBascula = normalizeText(String(categoryHint || "")) === "basculas";
  const productWord = isBascula ? "básculas" : "balanzas";
  return [
    "Claro 👌",
    `Las ${productWord} sirven para medir peso con precisión y controlar mejor tus procesos (calidad, inventario, dosificación y costos).`,
    "Te ayudan a evitar errores de pesaje, reducir mermas y tomar decisiones con datos confiables.",
    "La elección correcta depende de capacidad (peso máximo) y resolución (nivel de detalle).",
    "Si quieres, te recomiendo ahora mismo la mejor opción para tu caso y te la cotizo.",
  ].join("\n");
}

export function buildGuidedNeedReframePrompt(): string {
  return [
    "Perfecto, gracias por decirmelo.",
    "Para recomendarte algo que si te sirva, cuentame por favor:",
    "1) Que vas a pesar",
    "2) Rango de peso aproximado (minimo y maximo)",
    "3) Precision deseada (ej.: 0.01 g o 0.001 g)",
  ].join("\n");
}

export function buildScaleDifferenceGuidanceReply(): string {
  return [
    "Claro, te explico rapido 👌",
    "La diferencia principal entre balanzas/basculas esta en: capacidad (peso maximo), resolucion (nivel de precision), tipo de uso (laboratorio/joyeria/industrial) y tiempo de entrega.",
    "Ejemplo: 0.01 g da mas precision que 0.1 g, pero normalmente con menor capacidad.",
    "Si quieres, te comparo 3 modelos exactos para tu caso. Dime: que vas a pesar, rango de peso (min-max) y precision deseada.",
  ].join("\n");
}

export function isCapacityResolutionHelpIntent(text: string): boolean {
  const t = normalizeText(String(text || ""));
  return /(no\s+se|no\s+entiendo|que\s+es\s+(?:la\s+)?capacidad|que\s+es\s+(?:la\s+)?resolucion|no\s+entiendo\s+capacidad|no\s+entiendo\s+resolucion|explicame\s+capacidad|explicame\s+resolucion)/.test(t.replace(/\s+/g, " "));
}

export function isPriceObjectionIntent(text: string): boolean {
  const t = normalizeText(String(text || ""));
  if (!t) return false;
  return /(por\s*que\s+es\s+tan\s+car|por\s*que\s+tan\s+car|porque\s+es\s+tan\s+car|porque\s+tan\s+car|esta\s+muy\s+car|es\s+muy\s+car|muy\s+costos|muy\s+costosa|esta\s+costosa|esta\s+costoso|esta\s+cara|esta\s+caro)/i.test(t.replace(/\s+/g, " "));
}

export function isProductDefinitionIntent(text: string, hasNumericSpec: boolean): boolean {
  const t = normalizeText(String(text || ""));
  if (!t) return false;
  const asksDefinition = /(que\s+es|que\s+significa|que\s+quiere\s+decir|explicame|explica|definicion|definicion\s+de|para\s+que\s+sirve)/.test(t);
  const mentionsTechTerm = /(microbalanza|semimicro|semi\s*analitica|analitica|balanza\s+de\s+precision|capacidad|resolucion|lectura\s+minima|linealidad|repetibilidad|calibracion|trazabilidad|estabilidad|usb|rs\s*232|ethernet|bluetooth|wifi)/.test(t);
  const looksLikeProductRequest = /(balanza|balanzas|bascula|basculas|opciones|modelos|catalogo|gama|cotizar|precio)/.test(t);
  if (!asksDefinition && hasNumericSpec) return false;
  if (!asksDefinition && looksLikeProductRequest) return false;
  return asksDefinition || mentionsTechTerm;
}

export function extractDefinitionSubject(text: string): string {
  const src = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!src) return "";
  const m = src.match(/(?:que\s+es|que\s+significa|que\s+quiere\s+decir|explicame|explica|definicion\s+de|para\s+que\s+sirve)\s+([a-z0-9\s]{2,60})/);
  const raw = String(m?.[1] || src).trim();
  return raw
    .replace(/\b(la|el|los|las|una|un|de|del|en|para|balanza|balanzas|equipo|equipos)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildProductDefinitionReply(
  text: string,
  appendQuoteClosureCta: (text: string) => string
): string {
  const source = normalizeText(String(text || "")).replace(/\s+/g, " ").trim();
  if (/(para\s+que\s+sirven?|que\s+uso\s+tienen|para\s+que\s+se\s+usan)/.test(source) && /(balanza|balanzas|bascula|basculas)/.test(source)) {
    return appendQuoteClosureCta([
      "Buena pregunta 👌",
      "Una balanza sirve para medir masa/peso con precision y tomar decisiones correctas en compra, produccion y control de calidad.",
      "",
      "En la practica, te ayuda a:",
      "1) Evitar errores de dosificacion o formulacion (laboratorio/farmacia/alimentos)",
      "2) Controlar mermas y estandarizar procesos (industria y bodega)",
      "3) Cumplir tolerancias y trazabilidad en auditorias",
      "4) Comprar/vender por peso real con confianza (joyeria y metales)",
      "",
      "La clave para elegir bien es combinar:",
      "- Capacidad: peso maximo que soporta",
      "- Resolucion: nivel de detalle (decimales) que puede leer",
      "",
      "Si quieres, te recomiendo opciones exactas segun tu caso.",
    ].join("\n"));
  }

  const subject = extractDefinitionSubject(text);
  const s = normalizeText(subject).replace(/\s+/g, " ").trim();

  if (/microbalanza|semi\s*micro|semimicro|semi\s*analitica|analitica|balanza\s+de\s+precision/.test(s)) {
    return appendQuoteClosureCta([
      "Las balanzas se diferencian principalmente por su nivel de precisión:",
      "1) Microbalanza: la más exacta (hasta 0,001 mg)",
      "2) Semimicro: 0,01 mg",
      "3) Analítica: 0,1 mg",
      "4) Semi-analítica: 1 mg",
      "5) Balanza de precisión: 0,01 g o más (uso más general)",
      "",
      "En resumen: entre más 'micro' es la balanza, mayor exactitud ofrece;",
      "entre más 'de precisión', más industrial y menos sensible es.",
    ].join("\n"));
  }
  if (/capacidad/.test(s)) {
    return appendQuoteClosureCta("Capacidad: es el peso máximo que puede soportar la balanza. Si la capacidad es 5 kg, no debes superar ese valor.");
  }
  if (/resolucion|precision|lectura\s*minima/.test(s)) {
    return appendQuoteClosureCta("Resolución (o lectura mínima): es el nivel de detalle que muestra la balanza. Entre más decimales, mayor precisión de lectura.");
  }
  if (/linealidad/.test(s)) {
    return appendQuoteClosureCta([
      "Linealidad: indica qué tan exacta es la balanza en todo el rango de pesaje.",
      "👉 Que pese bien tanto 1 g como 200 g.",
      "👉 Si no es buena, puede dar errores en diferentes puntos.",
    ].join("\n"));
  }
  if (/repetibilidad/.test(s)) {
    return appendQuoteClosureCta([
      "Repetibilidad: es la capacidad de dar el mismo resultado varias veces al pesar lo mismo.",
      "👉 Si pesas 10 veces el mismo objeto, debería dar igual siempre.",
    ].join("\n"));
  }
  if (/calibracion/.test(s)) {
    return appendQuoteClosureCta("Calibración: ajuste del equipo para asegurar exactitud. Puede ser interna (automática) o externa (con pesas patrón).");
  }
  if (/trazabilidad/.test(s)) {
    return appendQuoteClosureCta([
      "Trazabilidad: significa que los resultados están respaldados por estándares oficiales.",
      "👉 Importante en laboratorios, auditorías y normas (ISO, GLP).",
    ].join("\n"));
  }
  if (/estabilidad/.test(s)) {
    return appendQuoteClosureCta([
      "Estabilidad: es qué tan rápido y firme la balanza muestra un resultado sin fluctuar.",
      "👉 Una buena balanza no 'baila' el número.",
      "👉 Muy importante en ambientes reales de trabajo.",
    ].join("\n"));
  }
  if (/usb|rs\s*232|ethernet|bluetooth|wifi/.test(s)) {
    return appendQuoteClosureCta("Conectividad (USB/RS232/Ethernet/Bluetooth): permite transferir datos de pesaje a PC, impresora o sistema de control para trazabilidad y reportes.");
  }

  return appendQuoteClosureCta([
    "Buena pregunta. Te explico ese término en contexto de balanzas de forma simple.",
    "Si quieres, también te lo aterrizo a 3 modelos de referencia para que compares mejor.",
  ].join("\n"));
}
