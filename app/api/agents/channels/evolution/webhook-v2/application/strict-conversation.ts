import OpenAI from "openai";

export async function buildStrictConversationalReply(args: {
  apiKey?: string;
  inboundText: string;
  awaiting?: string;
  selectedProduct?: string;
  categoryHint?: string;
  pendingOptions?: Array<{ code?: string; name?: string }>;
  normalizeText: (value: string) => string;
  isOutOfCatalogDomainQuery: (value: string) => boolean;
}): Promise<string> {
  const apiKey = String(args.apiKey || "").trim();
  const inboundText = String(args.inboundText || "").trim();
  if (!apiKey || !inboundText) return "";

  const textNorm = args.normalizeText(inboundText);
  const outOfCatalog =
    args.isOutOfCatalogDomainQuery(inboundText) ||
    /\b(carro|carros|vehiculo|vehiculos|moto|motos|leche|comida|alimento|alimentos)\b/.test(textNorm);
  const pending = Array.isArray(args.pendingOptions) ? args.pendingOptions : [];
  const optionsHint = pending.length
    ? pending
        .slice(0, 4)
        .map((o) => `${String(o?.code || "").trim()}) ${String(o?.name || "").trim()}`)
        .filter((x) => /\w/.test(x))
        .join(" | ")
    : "";

  const systemPrompt = [
    "Eres Ava, asesora comercial por WhatsApp.",
    "Responde SIEMPRE en español, tono natural, consultivo y útil.",
    "No respondas plano: cuando el cliente haga preguntas de uso/definicion/comparacion, explica en lenguaje simple que es, para que sirve, por que importa y un ejemplo breve aplicado.",
    "Formato recomendado: 3-6 lineas; primero explicas, luego guias a siguiente paso comercial.",
    "No inventes productos, precios ni disponibilidad fuera de catálogo activo.",
    outOfCatalog
      ? "Si el cliente pide algo fuera del catálogo, dilo directo en una línea y redirige a balanzas/analizador de humedad."
      : "Si hay contexto técnico/comercial, aprovéchalo y guía al siguiente paso sin forzar menú.",
    args.selectedProduct ? `Producto de referencia actual: ${String(args.selectedProduct || "")}.` : "",
    args.categoryHint ? `Categoría activa: ${String(args.categoryHint || "").replace(/_/g, " ")}.` : "",
    optionsHint ? `Opciones activas: ${optionsHint}.` : "",
    "Si existe lista de opciones activa, sugiere que también puede elegir con letra/número o escribir 'más', pero sin bloquear la conversación.",
    "Cierra siempre con una accion concreta para continuar (elegir modelo, cotizar o pedir ficha tecnica).",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 140,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: inboundText },
      ] as any,
    });
    return String(completion.choices?.[0]?.message?.content || "").trim();
  } catch {
    return "";
  }
}

export async function resolveStrictChooseActionFallbackReply(args: {
  strictReply: string;
  awaiting: string;
  wantsQuote: boolean;
  wantsSheet: boolean;
  textNorm: string;
  text: string;
  apiKey?: string;
  selectedName: string;
  rememberedCategory?: string;
  previousMemory?: Record<string, any>;
  hasSheetCandidate: boolean;
  buildStrictConversationalReply: (args: {
    apiKey?: string;
    inboundText: string;
    awaiting?: string;
    selectedProduct?: string;
    categoryHint?: string;
    pendingOptions?: Array<{ code?: string; name?: string }>;
    normalizeText: (value: string) => string;
    isOutOfCatalogDomainQuery: (value: string) => boolean;
  }) => Promise<string>;
  normalizeText: (value: string) => string;
  isOutOfCatalogDomainQuery: (value: string) => boolean;
}): Promise<string> {
  if (String(args.strictReply || "").trim()) return String(args.strictReply || "");

  if (args.awaiting === "strict_choose_action" && !args.wantsQuote && !args.wantsSheet && !/^\s*[12]\b/.test(args.textNorm)) {
    const softReply = await args.buildStrictConversationalReply({
      apiKey: args.apiKey,
      inboundText: args.text,
      awaiting: args.awaiting,
      selectedProduct: args.selectedName,
      categoryHint: args.rememberedCategory,
      pendingOptions: Array.isArray(args.previousMemory?.last_recommended_options) ? args.previousMemory?.last_recommended_options : [],
      normalizeText: args.normalizeText,
      isOutOfCatalogDomainQuery: args.isOutOfCatalogDomainQuery,
    });
    return String(softReply || "").trim() || [
      `Entiendo. Si ${args.selectedName} no te sirve, te puedo proponer alternativas reales del catálogo por:`,
      "- mayor/menor capacidad",
      "- mayor/menor resolución",
      "- más económicas",
      "También puedes escribir 1 para cotizar o 2 para ficha técnica.",
    ].join("\n");
  }

  return args.hasSheetCandidate
    ? [
        `Perfecto, encontré el modelo ${args.selectedName}.`,
        "Ahora dime qué deseas con ese modelo:",
        "1) Cotización con TRM y PDF",
        "2) Ficha técnica",
      ].join("\n")
    : [
        `Perfecto, encontré el modelo ${args.selectedName}.`,
        "Ahora dime qué deseas con ese modelo:",
        "1) Cotización con TRM y PDF",
        "",
        "Nota: este modelo no tiene ficha técnica PDF cargada en este momento.",
      ].join("\n");
}

export function applyStrictAffirmativeReentry(args: {
  strictReply: string;
  awaiting: string;
  text: string;
  previousMemory?: Record<string, any>;
  strictMemory: Record<string, any>;
  isAffirmativeShortIntent: (text: string) => boolean;
}): string {
  if (String(args.strictReply || "").trim()) return String(args.strictReply || "");
  if (!args.isAffirmativeShortIntent(args.text)) return String(args.strictReply || "");
  if (!/^\s*(s[íi]|si|ok|dale|claro|bueno|listo|perfecto|enviamela|enviame|manda|mandate|mandame)\s*$/i.test(String(args.text || "").trim())) return String(args.strictReply || "");
  if (!/^(conversation_followup|none|strict_need_spec)$/i.test(String(args.awaiting || ""))) return String(args.strictReply || "");

  const productName = String(args.previousMemory?.last_selected_product_name || args.previousMemory?.last_product_name || "").trim();
  if (!productName) return String(args.strictReply || "");

  args.strictMemory.awaiting_action = "strict_choose_action";
  args.strictMemory.last_selected_product_name = productName;
  return [
    `Perfecto. Para ${productName}, ¿qué deseas?`,
    "1) Cotización",
    "2) Ficha técnica",
  ].join("\n");
}
