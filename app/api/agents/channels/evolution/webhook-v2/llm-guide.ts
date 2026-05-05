import OpenAI from "openai";

export const LLM_GUIDE_ENABLED =
  String(process.env.LLM_GUIDE_ENABLED ?? "false").toLowerCase() === "true";

export type LLMIntent =
  | "greeting"
  | "guided_need_discovery"
  | "consultar_categoria"
  | "consultar_producto"
  | "solicitar_ficha"
  | "solicitar_cotizacion"
  | "consultar_trm"
  | "consultar_historial"
  | "despedida"
  | "aclaracion"
  | "fuera_de_catalogo";

export type LLMNextStep =
  | "strict_choose_family"
  | "strict_choose_model"
  | "strict_choose_action"
  | "strict_quote_data"
  | "strict_need_spec"
  | "strict_need_industry"
  | "advisor_meeting_slot"
  | "conversation_followup"
  | "none";

export interface LLMEntities {
  familia?: string;
  modelo?: string;
  capacidad?: string;
  resolucion?: string;
  industria?: string;
  cantidad?: number;
  ciudad?: string;
  empresa?: string;
  contacto?: string;
  email?: string;
  telefono?: string;
}

export interface LLMGuideResult {
  ok: boolean;
  intent: LLMIntent;
  entities: LLMEntities;
  missing_fields: string[];
  next_step: LLMNextStep;
  reply: string;
  confidence: number;
  out_of_domain: boolean;
  elapsed_ms: number;
}

const EMPTY_RESULT: LLMGuideResult = {
  ok: false,
  intent: "aclaracion",
  entities: {},
  missing_fields: [],
  next_step: "none",
  reply: "",
  confidence: 0,
  out_of_domain: false,
  elapsed_ms: 0,
};

const CATALOG_CONTEXT = `
Catálogo OHAUS en Colombia:
- Balanzas: Explorer, Adventurer, Pioneer, Scout
- Basculas: Ranger, Defender, Valor
- Analizadores de humedad: MB120, MB90, MB27, MB23
- Equipos de laboratorio y electroquimica

No inventes precios, disponibilidad ni modelos fuera de catálogo.
Si no hay dato, indícalo y guía al siguiente paso.
`;

function buildSystemPrompt(memory: Record<string, any>): string {
  const awaitingAction = String(memory?.awaiting_action || "none").trim();
  const lastProduct = String(memory?.last_selected_product_name || "").trim();
  return [
    "Eres el analizador de mensajes del bot comercial de Avanza.",
    "Responde solo JSON válido.",
    "No tomes decisiones de negocio críticas.",
    CATALOG_CONTEXT,
    `Estado actual: ${awaitingAction}`,
    lastProduct ? `Último producto: ${lastProduct}` : "",
    "Devuelve objeto con: intent, entities, missing_fields, next_step, reply, confidence, out_of_domain.",
  ].filter(Boolean).join("\n");
}

const VALID_INTENTS: LLMIntent[] = [
  "greeting", "guided_need_discovery", "consultar_categoria", "consultar_producto",
  "solicitar_ficha", "solicitar_cotizacion", "consultar_trm", "consultar_historial",
  "despedida", "aclaracion", "fuera_de_catalogo",
];

const VALID_NEXT_STEPS: LLMNextStep[] = [
  "strict_choose_family", "strict_choose_model", "strict_choose_action",
  "strict_quote_data", "strict_need_spec", "strict_need_industry",
  "advisor_meeting_slot", "conversation_followup", "none",
];

function validateAndParseJSON(raw: string): LLMGuideResult | null {
  try {
    const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(clean);
    if (!parsed || typeof parsed !== "object") return null;
    if (!VALID_INTENTS.includes(parsed.intent)) return null;
    if (!VALID_NEXT_STEPS.includes(parsed.next_step)) return null;
    if (typeof parsed.reply !== "string") return null;

    const e = parsed.entities && typeof parsed.entities === "object" ? parsed.entities : {};
    const entities: LLMEntities = {};
    for (const key of ["familia", "modelo", "capacidad", "resolucion", "industria", "ciudad", "empresa", "contacto", "email", "telefono"]) {
      if (typeof (e as any)[key] === "string" && String((e as any)[key]).trim()) {
        (entities as any)[key] = String((e as any)[key]).trim();
      }
    }
    if (typeof (e as any).cantidad === "number") entities.cantidad = (e as any).cantidad;

    return {
      ok: true,
      intent: parsed.intent as LLMIntent,
      entities,
      missing_fields: Array.isArray(parsed.missing_fields) ? parsed.missing_fields.filter((x: any) => typeof x === "string") : [],
      next_step: parsed.next_step as LLMNextStep,
      reply: String(parsed.reply || "").trim(),
      confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
      out_of_domain: Boolean(parsed.out_of_domain),
      elapsed_ms: 0,
    };
  } catch {
    return null;
  }
}

export async function runLLMGuide(args: {
  apiKey: string;
  inboundText: string;
  previousMemory: Record<string, any>;
  historyMessages?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<LLMGuideResult> {
  const start = Date.now();
  if (!LLM_GUIDE_ENABLED) return { ...EMPTY_RESULT };

  const apiKey = String(args.apiKey || "").trim();
  const inboundText = String(args.inboundText || "").trim();
  if (!apiKey || !inboundText) return { ...EMPTY_RESULT };

  try {
    const openai = new OpenAI({ apiKey });
    const history = (args.historyMessages || []).slice(-6);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      max_tokens: 320,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(args.previousMemory) },
        ...history,
        { role: "user", content: inboundText },
      ] as any,
    });
    const rawContent = String(completion.choices?.[0]?.message?.content || "").trim();
    const elapsed_ms = Date.now() - start;
    const parsed = rawContent ? validateAndParseJSON(rawContent) : null;
    if (!parsed) return { ...EMPTY_RESULT, elapsed_ms };
    return { ...parsed, elapsed_ms };
  } catch {
    return { ...EMPTY_RESULT, elapsed_ms: Date.now() - start };
  }
}

export function applyLLMEntitiesToMemory(nextMemory: Record<string, any>, guide: LLMGuideResult): void {
  if (!guide.ok) return;
  const e = guide.entities || {};
  if (e.familia && !nextMemory.last_category_intent) nextMemory.last_category_intent = e.familia;
  if (e.ciudad) {
    if (!nextMemory.customer_city) nextMemory.customer_city = e.ciudad;
    if (!nextMemory.crm_billing_city) nextMemory.crm_billing_city = e.ciudad;
  }
  if (e.empresa && !nextMemory.crm_company) nextMemory.crm_company = e.empresa;
  if (e.contacto && !nextMemory.customer_name) nextMemory.customer_name = e.contacto;
  if (e.email && !nextMemory.customer_email) nextMemory.customer_email = e.email;
  if (e.telefono && !nextMemory.customer_phone) nextMemory.customer_phone = e.telefono;
  if (e.cantidad && !nextMemory.quote_quantity) nextMemory.quote_quantity = e.cantidad;
}

export function resolveFinalReply(motorReply: string, guide: LLMGuideResult): string {
  const motor = String(motorReply || "").trim();
  if (motor) return motor;
  if (guide.ok && String(guide.reply || "").trim()) return String(guide.reply || "").trim();
  return "";
}
