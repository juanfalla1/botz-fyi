import { NextResponse } from "next/server";
import OpenAI from "openai";

import { getServiceSupabase } from "../../_utils/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NormalizedMessage = {
  contactId: string;
  text: string;
  fromMe: boolean;
  pushName: string | null;
  raw: any;
};

type Intent = "greeting" | "catalog" | "catalog_option" | "affirmative" | "demo" | "handoff" | "other";

type LeadContext = {
  lastBotMessage: string | null;
  nextStep: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
};

const recentContext = new Map<string, { lastBotMessage: string; nextStep: string | null; name: string | null; email: string | null; phone: string | null; updatedAt: number }>();
const RECENT_CONTEXT_TTL_MS = 1000 * 60 * 30;

function extractContactDetails(text: string) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
  const phone = text.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0]?.replace(/\s+/g, " ") || null;
  let name: string | null = null;

  const nameMatch = text.match(/(?:mi nombre es|soy)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{1,60})/i);
  if (nameMatch?.[1]) {
    name = nameMatch[1].trim();
  }

  return { name, email, phone };
}

function hasEnoughContactDetails(context: LeadContext, details: { name: string | null; email: string | null; phone: string | null }) {
  const finalName = details.name || context.name;
  const finalEmail = details.email || context.email;
  const finalPhone = details.phone || context.phone;
  return Boolean(finalName && finalEmail && finalPhone);
}

function resolveNextStep(intent: Intent, option: string | null, reply: string, previousNextStep: string | null): string | null {
  if (intent === "catalog") return "await_catalog_choice";
  if (intent === "greeting") return "await_catalog_choice";
  if (intent === "catalog_option" && option === "1") return "sales_intro_done";
  if (intent === "catalog_option" && option === "2") return "support_intro_done";
  if (intent === "catalog_option" && option === "3") return "geo_intro_done";
  if (intent === "catalog_option" && option === "4") return "specialized_intro_done";
  if (intent === "demo") return "demo_intro_done";
  if (intent === "handoff") return "await_contact_details";
  if (intent === "affirmative") {
    if (previousNextStep === "geo_intro_done") return "geo_explained";
    if (previousNextStep === "specialized_intro_done") return "specialized_need_focus";
    if (previousNextStep === "sales_intro_done") return "sales_need_context";
    if (previousNextStep === "support_intro_done") return "support_need_context";
    if (previousNextStep === "demo_intro_done") return "demo_need_context";
    if (previousNextStep === "await_catalog_choice") return "await_catalog_choice";
  }
  if (/nombre, empresa, correo y telefono/i.test(reply)) return "await_contact_details";
  return previousNextStep;
}

const EVOLUTION_BASE_URL = process.env.BOTZ_EVOLUTION_URL || process.env.EVOLUTION_API_URL || "http://95.111.236.226:8080";
const EVOLUTION_INSTANCE = process.env.BOTZ_EVOLUTION_INSTANCE || "botz Bot";
const EVOLUTION_API_KEY = process.env.BOTZ_EVOLUTION_API_KEY || process.env.EVOLUTION_API_KEY || "";
const N8N_BACKGROUND_WEBHOOK = process.env.BOTZ_N8N_BACKGROUND_WEBHOOK || "";

function normalizeIncoming(body: any): NormalizedMessage {
  const msgObj = body?.data?.message ?? {};
  const rawMessage = body?.message;

  const text = (
    msgObj.conversation ??
    msgObj.extendedTextMessage?.text ??
    msgObj.imageMessage?.caption ??
    msgObj.videoMessage?.caption ??
    rawMessage?.body ??
    rawMessage ??
    body?.text ??
    body?.query ??
    ""
  )
    .toString()
    .trim();

  const contactId = (
    body?.data?.key?.remoteJidAlt ??
    body?.data?.key?.remoteJid ??
    body?.sender ??
    body?.contact_id ??
    body?.phone ??
    body?.user_id ??
    ""
  )
    .toString()
    .replace("@s.whatsapp.net", "")
    .replace("@lid", "")
    .replace(/\D/g, "");

  return {
    contactId,
    text,
    fromMe: Boolean(body?.data?.key?.fromMe),
    pushName: body?.data?.pushName ?? body?.name ?? body?.nombre ?? null,
    raw: body,
  };
}

function classifyIntent(text: string): { intent: Intent; option: string | null } {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const option = /^([1-4])$/.exec(lower)?.[1] || null;

  if (/quiero hablar con alguien|quiero hablar con una persona|quiero hablar con un asesor|humano|asesor humano|llam(en|é)nme|que me contacten|no quiero bot/i.test(trimmed)) {
    return { intent: "handoff", option: null };
  }
  if (option) return { intent: "catalog_option", option };
  if (/^(hola|hello|hi|buenas|buenos dias|buen dia|buenas tardes|buenas noches)$/i.test(trimmed)) {
    return { intent: "greeting", option: null };
  }
  if (/^(catalogo|cat[aá]logo|productos?|servicios?|portafolio|soluciones|que ofrecen|que venden)$/i.test(trimmed)) {
    return { intent: "catalog", option: null };
  }
  if (/^(si|sí|ok|dale|perfecto|claro|listo|me interesa|quiero|va|de una)$/i.test(trimmed)) {
    return { intent: "affirmative", option: null };
  }
  if (/^(demo|agendar demo|cotizacion|cotización|precios|precio|planes|plan)$/i.test(trimmed)) {
    return { intent: "demo", option: null };
  }
  return { intent: "other", option: null };
}

function buildTemplateReply(intent: Intent, option: string | null, context: LeadContext, userText: string): string | null {
  const links = "Web: https://www.botz.fyi\nDemo en vivo software hipotecario: https://www.botz.fyi/start";
  const nextStep = context.nextStep;
  const lowerUserText = userText.toLowerCase();
  const lastBotMessage = (context.lastBotMessage || "").toLowerCase();
  const details = extractContactDetails(userText);

  if (nextStep === "await_contact_details" && hasEnoughContactDetails(context, details)) {
    const finalName = details.name || context.name || "tu equipo";
    const finalEmail = details.email || context.email;
    const finalPhone = details.phone || context.phone;
    return `Excelente.\n\nHemos recibido tu informacion correctamente:\n• Nombre: ${finalName}\n• Correo: ${finalEmail}\n• Telefono: ${finalPhone}\n\nUn especialista de Botz te contactara para coordinar la siguiente etapa.\n\n${links}`;
  }

  if (intent === "greeting") {
    return `Hola, soy *Botz Assistant*.\n\nTe ayudo a encontrar la mejor solucion de IA, automatizacion y software para tu negocio.\n\nPrincipales areas:\n1. Ventas y conversion\n2. Atencion al cliente y agentes inteligentes\n3. Visibilidad de marca en IA\n4. Soluciones especializadas e integraciones\n\nResponde con *1, 2, 3 o 4* y te guio.\n\n${links}`;
  }

  if (intent === "catalog") {
    return `Soy *Botz Assistant*, asesor virtual de Botz.\n\nEstas son nuestras soluciones principales:\n\n*1. Ventas y conversion*\nHotLead, CRM, automatizacion comercial y seguimiento de leads.\n\n*2. Atencion al cliente y agentes inteligentes*\nAgentes para WhatsApp, llamadas/voz, soporte, reservas y automatizacion conversacional.\n\n*3. Visibilidad en IA*\nStar GEO y GEO Audit IA para presencia de marca en respuestas de IA.\n\n*4. Soluciones especializadas e integraciones*\nSoftware hipotecario, dashboards, analitica e integraciones empresariales.\n\nResponde con *1, 2, 3 o 4* y te explico la opcion que mejor encaja con tu negocio.\n\n${links}`;
  }

  if (intent === "catalog_option" && option === "1") {
    return `*Ventas y conversion*\n\nIncluye:\n• HotLead\n• CRM\n• Automatizacion comercial\n• Seguimiento de leads\n• Procesos de cotizacion\n\nIdeal si hoy tu equipo pierde tiempo en tareas manuales o seguimiento inconsistente.\n\nSi quieres, cuentame tu tipo de negocio y te digo como se veria aplicado en tu caso.\n\n${links}`;
  }
  if (intent === "catalog_option" && option === "2") {
    return `*Atencion al cliente y agentes inteligentes*\n\nIncluye:\n• Agentes para WhatsApp\n• Agentes de llamadas y voz\n• Captura de datos\n• Respuestas 24/7\n• FAQ automatizado\n• Escalamiento a humano\n\nIdeal para mejorar tiempos de respuesta y experiencia del cliente.\n\nSi quieres, te muestro un caso aplicable a tu empresa.\n\n${links}`;
  }
  if (intent === "catalog_option" && option === "3") {
    return `*Visibilidad en IA*\n\nIncluye:\n• Star GEO\n• GEO Audit IA\n• Analisis de presencia en respuestas de IA\n• Comparativo con competidores\n• Priorizacion de mejoras\n\nIdeal para marcas que quieren ganar visibilidad en buscadores y motores de IA.\n\nSi quieres, te explico que revisa una auditoria inicial.\n\n${links}`;
  }
  if (intent === "catalog_option" && option === "4") {
    return `*Soluciones especializadas e integraciones*\n\nIncluye:\n• Software hipotecario\n• Agente Hipotecario IA\n• Dashboards y analitica\n• Integraciones con CRM\n• WhatsApp, Google y Meta\n\nIdeal para centralizar operacion, ventas y seguimiento.\n\nSi me dices tu objetivo, te recomiendo la opcion mas adecuada.\n\n${links}`;
  }

  if (intent === "affirmative") {
    if (nextStep === "geo_intro_done") {
      return `Claro. Una auditoria inicial de visibilidad en IA normalmente revisa:\n• Como aparece tu marca en respuestas de IA\n• Que competidores ganan mas presencia\n• Que categorias, preguntas o prompts te favorecen o te dejan fuera\n• Que mejoras priorizar para ganar visibilidad\n\nSi quieres, te explico como aplicarlo a tu marca o sector.\n\n${links}`;
    }
    if (nextStep === "geo_explained") {
      return "Perfecto. Para aterrizarlo mejor, dime tu marca o sector y te explico como se aplicaria una auditoria inicial en tu caso.";
    }
    if (nextStep === "specialized_intro_done") {
      return "Perfecto. Dentro de esta linea te puedo orientar en 3 frentes: 1) software hipotecario, 2) dashboards y analitica, 3) integraciones con CRM, Google, Meta o WhatsApp. Responde con 1, 2 o 3.";
    }
    if (nextStep === "sales_intro_done") {
      return "Perfecto. Dime tu tipo de negocio y si hoy quieres mejorar captacion de leads, seguimiento comercial o cotizaciones, y te indico la mejor ruta.";
    }
    if (nextStep === "support_intro_done") {
      return "Perfecto. Dime si quieres mejorar soporte, respuestas en WhatsApp, captacion de datos o seguimiento automatico, y te indico la mejor opcion.";
    }
    if (nextStep === "demo_intro_done") {
      return "Perfecto. Dime tu tipo de negocio y el proceso que hoy haces manual, y te digo que solucion de Botz encaja mejor antes de pasar a demo o cotizacion.";
    }
    if (nextStep === "await_catalog_choice") {
      return "Perfecto. Si quieres, responde con 1, 2, 3 o 4 y te explico la linea que mas te interese.";
    }
    return "Perfecto. Para orientarte rapido, dime en una linea: tu tipo de negocio y que proceso quieres mejorar (ventas, atencion, operacion o visibilidad en IA).";
  }

  if (intent === "other" && nextStep === "geo_explained") {
    return `Perfecto. Para una marca o sector como *${userText}*, una auditoria inicial de visibilidad en IA nos permitiria detectar como aparece hoy tu propuesta en respuestas de IA, que competidores ganan mas presencia y que mejoras priorizar para generar mas oportunidades.\n\nSi quieres, el siguiente paso es coordinar una revision con un especialista de Botz. Comparteme por favor:\n• Nombre\n• Empresa\n• Correo\n• Telefono\n\ny te contactamos para agendarlo.\n\n${links}`;
  }

  if (intent === "other" && nextStep === "sales_need_context") {
    return `Entiendo. Con ese contexto podemos ayudarte a mejorar el proceso comercial con automatizacion, seguimiento y gestion de leads o cotizaciones segun tu caso.\n\nSi quieres, el siguiente paso es que un especialista revise tu flujo y te proponga una ruta concreta. Comparteme por favor:\n• Nombre\n• Empresa\n• Correo\n• Telefono\n\ny coordinamos el contacto.\n\n${links}`;
  }

  if (intent === "other" && nextStep === "support_need_context") {
    return `Perfecto. Con ese contexto podemos ayudarte a automatizar atencion, respuestas en WhatsApp, captura de datos o seguimiento segun tu operacion.\n\nSi quieres, el siguiente paso es que un especialista revise tu caso. Comparteme por favor:\n• Nombre\n• Empresa\n• Correo\n• Telefono\n\ny coordinamos el contacto.\n\n${links}`;
  }

  if (intent === "other" && nextStep === "demo_need_context") {
    return `Entiendo. Con ese proceso podemos orientarte mejor sobre la solucion adecuada y, si aplica, coordinar una demo enfocada en tu caso.\n\nPara avanzar, comparteme por favor:\n• Nombre\n• Empresa\n• Correo\n• Telefono\n\ny un especialista de Botz te contacta.\n\n${links}`;
  }

  if (intent === "other" && nextStep === "specialized_need_focus") {
    if (/^1$|hipotec/i.test(lowerUserText)) {
      return `Perfecto. En software hipotecario y Agente Hipotecario IA podemos ayudarte con precalificacion, seguimiento comercial y automatizacion del proceso.\n\nSi quieres avanzar, comparteme por favor:\n• Nombre\n• Empresa\n• Correo\n• Telefono\n\ny te contacta un especialista.\n\n${links}`;
    }
    if (/^2$|dashboard|anal[ií]tica/i.test(lowerUserText)) {
      return `Perfecto. En dashboards y analitica podemos ayudarte a centralizar KPIs, seguimiento comercial y visibilidad operativa en tiempo real.\n\nSi quieres avanzar, comparteme por favor:\n• Nombre\n• Empresa\n• Correo\n• Telefono\n\ny te contacta un especialista.\n\n${links}`;
    }
    if (/^3$|integraci|crm|google|meta|whatsapp/i.test(lowerUserText)) {
      return `Perfecto. En integraciones podemos conectar CRM, WhatsApp, Google, Meta y otros sistemas clave para automatizar operacion y seguimiento.\n\nSi quieres avanzar, comparteme por favor:\n• Nombre\n• Empresa\n• Correo\n• Telefono\n\ny te contacta un especialista.\n\n${links}`;
    }
    return "Perfecto. Dentro de esta linea te puedo orientar en 3 frentes: 1) software hipotecario, 2) dashboards y analitica, 3) integraciones con CRM, Google, Meta o WhatsApp. Responde con 1, 2 o 3.";
  }

  if (intent === "other" && /ejemplo|caso|como funciona|cómo funciona/i.test(userText) && /dashboard hipotecario|agente hipotecario|hipotecario|hipotecas/.test(lastBotMessage)) {
    return `Claro. Un ejemplo seria este:\n\nUna empresa hipotecaria recibe prospectos por WhatsApp o formularios. El agente recopila datos basicos, precalifica el caso, registra la oportunidad y muestra el avance en un dashboard para que el equipo comercial priorice a quien contactar primero.\n\nPara revisar si aplica a tu operacion, lo mejor es que un especialista de Botz te contacte. Comparteme por favor:\n• Nombre\n• Empresa\n• Correo\n• Telefono\n\n${links}`;
  }

  if (intent === "other" && /dashboard hipotecario|agente hipotecario|software hipotecario|hipotecari|hipoteca|hipotecas/i.test(userText)) {
    return `Si, en Botz podemos implementar *software hipotecario*, *Agente Hipotecario IA* y dashboards para seguimiento comercial y operativo.\n\nPuede ayudarte con:\n• Captura y precalificacion de prospectos\n• Seguimiento de oportunidades\n• Visualizacion de casos en dashboard\n• Alertas y tareas para el equipo comercial\n\nPara avanzar, lo ideal es que un especialista revise tu caso. Comparteme por favor:\n• Nombre\n• Empresa\n• Correo\n• Telefono\n\n${links}`;
  }

  if (intent === "other" && /facturaci[oó]n|cotizaci[oó]n|cotizacion|ecommerce|tienda|pedido|inventario|lead|leads|crm|seguimiento comercial/i.test(userText)) {
    return `Si, ese proceso se puede automatizar con Botz.\n\nPodemos ayudarte a reducir tareas manuales, organizar la informacion y conectar el flujo con WhatsApp, CRM, formularios o dashboards segun tu operacion.\n\nPara darte una recomendacion concreta y pasar tu caso a un especialista, comparteme por favor:\n• Nombre\n• Empresa\n• Correo\n• Telefono\n\n${links}`;
  }

  if (intent === "other" && /llamada|llamadas|voz|telefono|tel[eé]fono|call center|voice/i.test(userText)) {
    return `Si, tambien podemos implementar *agentes de llamadas y voz*.\n\nPueden ayudar con:\n• Atencion telefonica automatizada\n• Calificacion de leads por llamada\n• Agendamiento\n• Recordatorios\n• Seguimiento comercial\n• Escalamiento a un asesor humano\n\nSi quieres, podemos revisar tu caso y definir si conviene WhatsApp, llamadas o un flujo combinado.\n\nPara avanzar, comparteme por favor:\n• Nombre\n• Empresa\n• Correo\n• Telefono\n\n${links}`;
  }

  if (intent === "demo") {
    return `Excelente.\n\nTe ayudo con precios, planes o una demo.\n\nSi quieres, dime tu tipo de negocio y el proceso que hoy haces manual, y te oriento con la mejor solucion.\n\n${links}`;
  }

  if (intent === "handoff") {
    return "Perfecto. Te voy a pasar con un especialista del equipo Botz. Si quieres agilizarlo, comparteme tu nombre, empresa, correo y telefono.";
  }

  return null;
}

async function generateOpenAIReply(text: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "Podemos ayudarte a mejorar ventas, atencion u operaciones con IA y automatizacion. Si quieres, cuentame tu tipo de negocio y el proceso que hoy haces manual.";
  }

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 180,
    messages: [
      {
        role: "system",
        content:
          "Eres Botz Assistant, asesor comercial de Botz. Responde en espanol, breve, profesional y consultivo. Formato obligatorio para WhatsApp: usa parrafos cortos, maximo 2 lineas por parrafo, separa ideas con saltos de linea y usa bullets solo cuando pidas datos. Si el cliente expresa una necesidad concreta, no alargues la conversacion: valida el caso, explica en 2-3 frases como Botz podria ayudar y pide datos con este formato: Para avanzar, comparteme por favor:\n• Nombre\n• Empresa\n• Correo\n• Telefono. Productos: HotLead, Agentes Inteligentes para WhatsApp, Agentes de llamadas/voz, Star GEO/GEO Audit IA, Agente Hipotecario IA, software hipotecario, automatizacion comercial con CRM/n8n, dashboards y analitica. Si preguntan por llamadas, confirma que Botz tambien puede implementar agentes de voz para atencion telefonica, calificacion, agendamiento y seguimiento. No cierres con preguntas genericas como 'como te gustaria usarlo' si ya hay interes claro. Devuelve solo texto, sin JSON.",
      },
      { role: "user", content: text },
    ],
  });

  const message = completion.choices?.[0]?.message?.content?.trim();
  return formatWhatsappText(
    message || "Podemos ayudarte con ese proceso usando IA y automatizacion.\n\nPara avanzar, comparteme por favor:\n• Nombre\n• Empresa\n• Correo\n• Telefono."
  );
}

function formatWhatsappText(text: string) {
  return text
    .replace(/\.\s+(?=(Para avanzar|Podemos|Esto|Asi|Además|Ademas|Si quieres|Un especialista)\b)/g, ".\n\n")
    .replace(/Por favor,?\s*ind[ií]came tu nombre, empresa, correo y tel[eé]fono[^.]*\./i, "Para avanzar, comparteme por favor:\n• Nombre\n• Empresa\n• Correo\n• Telefono.")
    .replace(/nombre, empresa, correo y tel[eé]fono/gi, "\n• Nombre\n• Empresa\n• Correo\n• Telefono")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sendWhatsAppMessage(number: string, text: string) {
  if (!number) throw new Error("missing_number");
  if (!EVOLUTION_API_KEY) throw new Error("missing_evolution_api_key");

  const url = `${EVOLUTION_BASE_URL.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: EVOLUTION_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ number, text }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`evolution_send_failed:${response.status}:${body}`);
  }
}

async function persistLeadInBackground(normalized: NormalizedMessage, reply: string, nextStep: string | null) {
  const supabase = getServiceSupabase();
  if (!supabase || !normalized.contactId) return;

  const text = normalized.text.toLowerCase();
  const asksCommercial = /demo|cotiz|precio|plan|asesor|humano|contact/i.test(text);
  const details = extractContactDetails(normalized.text);
  await supabase.from("leads").upsert(
    {
      lead_id: normalized.contactId,
      phone: normalized.contactId,
      name: details.name || normalized.pushName || "Sin nombre",
      email: details.email,
      problema: normalized.text,
      canal_principal: "whatsapp",
      etapa: asksCommercial ? "esperando_comercial" : null,
      send_to_llm: !asksCommercial,
      next_action: nextStep,
      ultimo_mensaje_bot: reply,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "lead_id" }
  );
}

async function loadLeadContext(contactId: string): Promise<LeadContext> {
  const cached = recentContext.get(contactId);
  if (cached && Date.now() - cached.updatedAt < RECENT_CONTEXT_TTL_MS) {
    return {
      lastBotMessage: cached.lastBotMessage,
      nextStep: cached.nextStep,
      name: cached.name,
      email: cached.email,
      phone: cached.phone,
    };
  }
  if (cached) recentContext.delete(contactId);

  const supabase = getServiceSupabase();
  if (!supabase || !contactId) return { lastBotMessage: null, nextStep: null, name: null, email: null, phone: null };

  const { data } = await supabase
    .from("leads")
    .select("ultimo_mensaje_bot,next_action,name,email,phone")
    .eq("lead_id", contactId)
    .maybeSingle();

  return {
    lastBotMessage: typeof data?.ultimo_mensaje_bot === "string" ? data.ultimo_mensaje_bot : null,
    nextStep: typeof data?.next_action === "string" ? data.next_action : null,
    name: typeof data?.name === "string" ? data.name : null,
    email: typeof data?.email === "string" ? data.email : null,
    phone: typeof data?.phone === "string" ? data.phone : null,
  };
}

async function notifyN8nInBackground(normalized: NormalizedMessage, reply: string, nextStep: string | null) {
  if (!N8N_BACKGROUND_WEBHOOK) return;
  await fetch(N8N_BACKGROUND_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "botz-api",
      contact_id: normalized.contactId,
      push_name: normalized.pushName,
      message: normalized.text,
      reply,
      next_step: nextStep,
      raw: normalized.raw,
    }),
    cache: "no-store",
  });
}

export async function POST(req: Request) {
  const startedAt = Date.now();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const normalized = normalizeIncoming(body);
  console.info("[botz-whatsapp] incoming", {
    contactId: normalized.contactId,
    text: normalized.text,
    fromMe: normalized.fromMe,
    messageType: body?.data?.messageType ?? null,
    event: body?.event ?? null,
    instance: body?.instance ?? null,
  });
  if (normalized.fromMe || !normalized.text) {
    console.info("[botz-whatsapp] ignored", {
      contactId: normalized.contactId,
      reason: normalized.fromMe ? "fromMe" : "empty_text",
    });
    return NextResponse.json({ ok: true, ignored: true });
  }
  if (!normalized.contactId) {
    return NextResponse.json({ ok: false, error: "missing_contact_id" }, { status: 400 });
  }

  try {
    const context = await loadLeadContext(normalized.contactId);
    const { intent, option } = classifyIntent(normalized.text);
    const templateReply = buildTemplateReply(intent, option, context, normalized.text);
    const reply = templateReply ?? (await generateOpenAIReply(normalized.text));
    const nextStep = resolveNextStep(intent, option, reply, context.nextStep);
    console.info("[botz-whatsapp] reply_ready", {
      contactId: normalized.contactId,
      intent,
      source: templateReply ? "template" : "llm",
      nextStep,
    });
    const details = extractContactDetails(normalized.text);

    recentContext.set(normalized.contactId, {
      lastBotMessage: reply,
      nextStep,
      name: details.name || context.name,
      email: details.email || context.email,
      phone: details.phone || context.phone,
      updatedAt: Date.now(),
    });

    await sendWhatsAppMessage(normalized.contactId, reply);
    console.info("[botz-whatsapp] sent", {
      contactId: normalized.contactId,
      latency_ms: Date.now() - startedAt,
    });

    void persistLeadInBackground(normalized, reply, nextStep).catch((error) => {
      console.error("[botz-whatsapp] persistLeadInBackground", error);
    });
    void notifyN8nInBackground(normalized, reply, nextStep).catch((error) => {
      console.error("[botz-whatsapp] notifyN8nInBackground", error);
    });

    return NextResponse.json({
      ok: true,
      source: templateReply ? "template" : "llm",
      intent,
      latency_ms: Date.now() - startedAt,
    });
  } catch (error: any) {
    console.error("[botz-whatsapp] error", error);
    return NextResponse.json(
      {
        ok: false,
        error: "botz_whatsapp_failed",
        detail: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}
