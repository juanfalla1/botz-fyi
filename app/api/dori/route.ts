import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createDecipheriv, hkdfSync } from "crypto";
import { createRequire } from "module";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOTION_VERSION = "2022-06-28";
const DEFAULT_PARENT_PAGE_ID = "38996330912d800c86ead746c6909bfb";
const DEFAULT_TEAM_DATABASE_ID = "49ef06da-ec24-441a-bfc6-78421bb4567a";
const CHAT_HISTORY_PAGE_TITLE = "Historial WhatsApp Dori";
const DEFAULT_TIME_ZONE = "America/Toronto";
const requireNode = createRequire(import.meta.url);
const PROCESSED_MESSAGE_TTL_MS = 30 * 60 * 1000;
const PROCESSED_TEXT_TTL_MS = 90 * 1000;

const processedDoriMessages: Map<string, number> = ((globalThis as any).__doriProcessedMessages ||= new Map<string, number>());
const processedDoriTextMessages: Map<string, number> = ((globalThis as any).__doriProcessedTextMessages ||= new Map<string, number>());
const recentDoriChatLines: string[] = ((globalThis as any).__doriRecentChatLines ||= []);

type DoriIntent = {
  action: "ignore" | "answer" | "create_task" | "create_page" | "append_page" | "create_bug" | "create_idea" | "create_decision" | "create_calendar_event" | "update_calendar_event" | "process_document_to_backlog";
  title: string;
  content: string;
  query: string;
  area: string;
};

type DocumentAttachment = {
  fileName: string;
  mimeType: string;
  caption: string;
  url: string;
  base64: string;
  mediaKey: string;
  messageKey: any;
  rawMessage: any;
  rawDocument: any;
  instance: string;
};

type DoriMemory = {
  sender: string;
  chatId: string;
  recentHistory: string;
  lastDocument: string;
  lastTasks: string[];
};

type ExtractedDocumentTask = {
  title: string;
  description: string;
  responsible: string;
  priority: string;
  area: string;
  observations: string;
};

type DoriDecision = {
  intent: string;
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion: string;
  plan: string[];
  actions: string[];
  expectedOutput: string;
};

type CalendarEvent = {
  summary: string;
  description: string;
  start: string;
  end: string;
  timeZone: string;
  attendees: { email: string }[];
  reminderNote?: string;
};

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return asText(obj.content || obj.text || obj.description || obj.title || JSON.stringify(value));
  }
  return String(value);
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function getNotionKey() {
  return process.env.NOTION_API_KEY || process.env.NOTION_TOKEN || process.env.NOTION_SECRET || "";
}

function getTextFromPayload(payload: any): string {
  const body = payload?.body ?? payload;
  return String(
    body?.message?.conversation ||
      body?.data?.message?.conversation ||
      body?.data?.message?.extendedTextMessage?.text ||
      body?.data?.message?.documentMessage?.caption ||
      body?.data?.message?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
      body?.data?.message?.imageMessage?.caption ||
      body?.text ||
      body?.message ||
      body?.data?.text ||
      payload?.message ||
      ""
  ).trim();
}

function pickFirstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickFirstBase64ish(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value) && value.every((item) => typeof item === "number")) return Buffer.from(value).toString("base64");
    if (value && typeof value === "object") {
      const obj: any = value;
      if (Array.isArray(obj.data) && obj.data.every((item: any) => typeof item === "number")) return Buffer.from(obj.data).toString("base64");
      const numericKeys = Object.keys(obj).filter((key) => /^\d+$/.test(key));
      if (numericKeys.length) {
        const bytes = numericKeys.sort((a, b) => Number(a) - Number(b)).map((key) => obj[key]);
        if (bytes.every((item) => typeof item === "number")) return Buffer.from(bytes).toString("base64");
      }
    }
  }
  return "";
}

function findDocumentNode(value: any, seen = new Set<any>()): any {
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  if (value.documentMessage) return value.documentMessage;
  if (value.documentWithCaptionMessage?.message?.documentMessage) return value.documentWithCaptionMessage.message.documentMessage;
  if ((value.fileName || value.title || value.mimetype || value.mimeType) && (value.url || value.mediaUrl || value.base64 || value.mediaKey)) return value;
  for (const child of Object.values(value)) {
    const found = findDocumentNode(child, seen);
    if (found) return found;
  }
  return null;
}

function getDocumentAttachment(payload: any): DocumentAttachment | null {
  const body = payload?.body ?? payload;
  const message = body?.data?.message || body?.message || {};
  const document = message?.documentMessage || message?.documentWithCaptionMessage?.message?.documentMessage || body?.data?.documentMessage || body?.documentMessage || findDocumentNode(body) || {};
  const hasDocumentNode = Boolean(message?.documentMessage || message?.documentWithCaptionMessage || body?.data?.documentMessage || body?.documentMessage || document?.fileName || document?.mimetype || document?.mimeType);
  const fileName = pickFirstString(document.fileName, document.title, body?.data?.fileName, body?.fileName);
  const mimeType = pickFirstString(document.mimetype, document.mimeType, body?.data?.mimetype, body?.mimetype, body?.mimeType);
  const url = pickFirstString(document.url, document.mediaUrl, body?.data?.mediaUrl, body?.data?.url, body?.mediaUrl, body?.url);
  const base64 = pickFirstString(document.base64, body?.data?.base64, body?.base64, body?.data?.message?.base64);
  const mediaKey = pickFirstBase64ish(document.mediaKey, body?.data?.mediaKey, body?.mediaKey);
  const messageKey = body?.data?.key || body?.key || {};
  const instance = pickFirstString(body?.instance, body?.instanceName, body?.data?.instance, body?.data?.instanceName, process.env.EVOLUTION_INSTANCE, "Dori");
  const attachment: DocumentAttachment = {
    fileName: fileName || "documento",
    mimeType,
    caption: pickFirstString(document.caption, message?.extendedTextMessage?.text, message?.conversation, body?.data?.text, body?.text),
    url,
    base64,
    mediaKey,
    messageKey,
    rawMessage: message,
    rawDocument: document,
    instance,
  };
  const looksLikeDocument = Boolean(hasDocumentNode || attachment.url || attachment.base64 || /pdf|manual|archivo|documento/i.test(`${fileName} ${mimeType}`));
  return looksLikeDocument ? attachment : null;
}

function summarizeDocumentPayload(payload: any, attachment: DocumentAttachment | null) {
  const body = payload?.body ?? payload;
  const message = body?.data?.message || body?.message || {};
  const document = attachment?.rawDocument || {};
  return {
    event: body?.event || body?.data?.event || "",
    instance: attachment?.instance || body?.instance || body?.data?.instance || "",
    key: {
      id: attachment?.messageKey?.id || body?.data?.key?.id || body?.key?.id || "",
      remoteJid: attachment?.messageKey?.remoteJid || body?.data?.key?.remoteJid || body?.key?.remoteJid || "",
      fromMe: attachment?.messageKey?.fromMe ?? body?.data?.key?.fromMe ?? body?.key?.fromMe ?? null,
    },
    messageTypes: Object.keys(message || {}),
    documentKeys: Object.keys(document || {}),
    contextInfo: {
      stanzaId: document?.contextInfo?.stanzaId || message?.extendedTextMessage?.contextInfo?.stanzaId || "",
      participant: document?.contextInfo?.participant || message?.extendedTextMessage?.contextInfo?.participant || "",
      quotedTypes: Object.keys(document?.contextInfo?.quotedMessage || message?.extendedTextMessage?.contextInfo?.quotedMessage || {}),
    },
    hasUrl: Boolean(attachment?.url),
    hasBase64: Boolean(attachment?.base64),
    hasMediaKey: Boolean(attachment?.mediaKey),
    fileName: attachment?.fileName || "",
    mimeType: attachment?.mimeType || "",
  };
}

function isDocumentBacklogRequest(text: string, payload: any) {
  const normalized = normalizeKey(text);
  const attachment = getDocumentAttachment(payload);
  return Boolean(attachment || /pdf|manual|archivo|documento|adjunto/.test(normalized)) && /backlog|actividad|actividades|tarea|tareas|plan de negocio|notion/.test(normalized);
}

function isPdfAttachment(attachment: DocumentAttachment | null) {
  if (!attachment) return false;
  return /pdf|application\/pdf/i.test(`${attachment.fileName} ${attachment.mimeType}`);
}

function personFromText(text: string) {
  const normalized = normalizeKey(text);
  const people = ["sandra", "ruth", "ricardo", "juan", "monica", "mónica", "alianza", "icp", "todos", "equipo"];
  const found = people.find((person) => normalized.includes(normalizeKey(person)));
  if (!found) return "";
  if (found === "mónica") return "Monica";
  return found.charAt(0).toUpperCase() + found.slice(1);
}

function isFollowupQuestion(text: string) {
  const normalized = normalizeKey(text);
  const hasQuestionShape = /\b(que|qué|quien|quién|cual|cuál|cuales|cuáles|dime|muestra|mostrar|lista|listar|estado|como va|cómo va|pendiente|pendientes|tarea|tareas|responsable|responsables|seguimiento|bloqueos|bloquead|vencid|sin responsable|sin fecha)\b/.test(normalized);
  const hasTeamTarget = Boolean(personFromText(text)) || /\b(equipo|todos|tarea|tareas|backlog|product backlog|responsable|responsables|sin responsable|bloqueos|bloquead|vencid|sin fecha)\b/.test(normalized);
  const hasCreateVerb = /\b(crea|crear|agrega|agregar|guarda|guardar|deja|lleva|pon|poner|asigna|asignar|registra|registrar)\b/.test(normalized);
  return hasQuestionShape && hasTeamTarget && !hasCreateVerb;
}

function isGreeting(text: string) {
  const clean = normalizeKey(stripDoriCommand(text));
  return /^(hola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hello|hi)$/.test(clean) || /\b(como estas|como vas|que tal|todo bien)\b/.test(clean);
}

function doriGreeting(sender: string) {
  const name = sender && sender !== "Participante" ? ` ${sender}` : "";
  return `Hola${name}. Estoy bien, gracias.

Soy Dori, asistente de Origen. Puedo ayudarte a revisar pendientes, tareas del equipo, reuniones, decisiones y contexto en Notion.

Dime qué necesitas y lo reviso.`;
}

function isSocialClose(text: string) {
  const clean = normalizeKey(stripDoriCommand(text));
  return /^(gracias|muchas gracias|ok gracias|vale gracias|listo gracias|perfecto gracias|super gracias|bien gracias|todo bien gracias|listo|ok|perfecto|excelente|entendido|genial|bueno)$/.test(clean);
}

function mentionsDori(text: string) {
  return /\bdori\b/i.test(text);
}

function doriSocialClose(sender: string) {
  const name = sender && sender !== "Participante" ? ` ${sender}` : "";
  return `Con gusto${name}. Aquí estoy si necesitas revisar algo más de Origen.`;
}

function isImplicitBacklogFollowup(text: string, memory: DoriMemory) {
  const clean = normalizeKey(stripDoriCommand(text));
  const asksForPreviousList = /\b(damelas|dame las|pasamelas|pasame las|muestramelas|muestrame las|listalas|aqui|aca|por aqui)\b/.test(clean);
  const recentAskedTasks = /pendiente|pendientes|tarea|tareas|backlog|equipo|seguimiento/i.test(memory.recentHistory.slice(-2500));
  return asksForPreviousList && recentAskedTasks;
}

function isTaskResponsibilityQuestion(text: string) {
  const normalized = normalizeKey(text);
  return /\b(responsable|responsables|quien|quién)\b/.test(normalized) && /\b(tarea|tareas|backlog|pendiente|pendientes|cada)\b/.test(normalized);
}

function isLastPdfQuestion(text: string) {
  const normalized = normalizeKey(text);
  return /\b(pdf|pdfs|documento|documentos|archivo|archivos|repositorio)\b/.test(normalized) && /\b(ultimo|último|anterior|reciente|guardado|guardados|donde|dónde|cuales|cuáles|que|qué|listar|lista|mostrar|muestra|usar|usa|utiliza|llevalo|ll[eé]valo)\b/.test(normalized);
}

function isPdfSaveRequest(text: string) {
  const normalized = normalizeKey(text);
  return /\b(pdf|documento|archivo|adjunto)\b/.test(normalized) && /\b(guarda|guardar|registra|registrar|sube|subir|archiva|archivar|notion|repositorio)\b/.test(normalized);
}

function pdfUrlFromText(text: string) {
  const url = text.match(/https?:\/\/\S+/i)?.[0]?.replace(/[).,;]+$/, "") || "";
  return /\.pdf(?:\?|#|$)|application\/pdf|drive\.google\.com|dropbox\.com|supabase|storage/i.test(url) ? url : "";
}

function fileNameFromUrl(url: string) {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() || "documento.pdf");
    return /\.pdf$/i.test(last) ? last : "documento.pdf";
  } catch {
    return "documento.pdf";
  }
}

function isPersonChatQuestion(text: string) {
  const normalized = normalizeKey(text);
  return Boolean(personFromText(text)) && /\b(dijo|dice|pregunto|pregunt[oó]|pidio|pidi[oó]|comento|coment[oó]|menciono|mencion[oó]|hablo|habl[oó])\b/.test(normalized);
}

function clarificationFor(text: string) {
  const clean = stripDoriCommand(text).trim();
  return `No tengo suficiente contexto para responder eso con seguridad.

¿Te refieres a revisar el chat, una tarea del Product Backlog, una reunión o una página específica de Notion?

Mensaje que recibí: "${clean || text}"`;
}

function isCorrectionWithoutIntent(text: string) {
  const normalized = normalizeKey(stripDoriCommand(text));
  return /\b(no es eso|no te estoy diciendo eso|eso no|no dije eso|no entendiste|estas entendiendo mal|est[aá]s entendiendo mal|no era eso)\b/.test(normalized);
}

function cleanNotionId(value: string) {
  return asText(value).replace(/\\r|\\n|\r|\n/g, "").trim();
}

function isCreateTaskCommand(text: string) {
  const normalized = normalizeKey(text);
  return /\b(crea|crear|agrega|agregar|deja|lleva|pon|poner|asigna|asignar|registra|registrar|recuerdame|recuérdame)\b/.test(normalized) && /\b(tarea|tareas|backlog|pendiente|pendientes|action item|recordatorio)\b/.test(normalized);
}

function decideNextAction(text: string, payload: any, memory: DoriMemory, notionContext = ""): DoriDecision {
  const normalized = normalizeKey(text);
  const hasAttachment = Boolean(getDocumentAttachment(payload));
  let intent = "answer_question";
  let confidence = 0.72;
  let needsClarification = false;
  let clarificationQuestion = "";
  const plan = ["Entender la solicitud del usuario", "Revisar memoria reciente y Notion", "Ejecutar la acción mínima segura", "Verificar el resultado", "Responder al grupo con resumen claro"];
  const actions: string[] = ["read_memory"];
  let expectedOutput = "respuesta útil para el equipo";

  if (/que sigue|qué sigue|que hacemos hoy|qué hacemos hoy|en que debe enfocarse|en qué debe enfocarse|prioridad|prioridades recomendadas/.test(normalized)) {
    intent = "recommend_next_steps";
    confidence = 0.9;
    actions.push("read_backlog", "read_plan", "recommend_priorities");
    expectedOutput = "prioridades recomendadas y foco por persona";
  } else if (/calidad.*backlog|revisa.*backlog|audita.*backlog|duplicad|sin descripcion|sin descripción|títulos largos|titulos largos|epicas|épicas/.test(normalized)) {
    intent = "backlog_quality";
    confidence = 0.89;
    actions.push("read_backlog", "detect_quality_issues");
    expectedOutput = "hallazgos de calidad del backlog";
  } else if (/acta|reunion|reunión|minuta|resumen de reunion|resumen de reunión/.test(normalized) && /haz|hacer|genera|generar|guarda|guardar|resume|resumen/.test(normalized)) {
    intent = "meeting_minutes";
    confidence = 0.88;
    actions.push("read_chat_history", "create_notion_page");
    expectedOutput = "acta con temas, decisiones, tareas, responsables y próximos pasos";
  } else if (isFollowupQuestion(text) || /que tiene|qué tiene|sin responsable|bloquead|vencid|sin fecha/.test(normalized)) {
    intent = "team_followup";
    confidence = 0.9;
    actions.push("read_backlog", "filter_by_person_or_status");
    expectedOutput = "seguimiento por persona o por estado";
  } else if (isDocumentBacklogRequest(text, payload) || (hasAttachment && /dori/.test(normalized))) {
    intent = "process_document_to_backlog";
    confidence = hasAttachment ? 0.92 : 0.78;
    actions.push("read_document", "save_document", "extract_tasks", "create_backlog_items");
    expectedOutput = "resumen del documento y tareas accionables creadas o pendientes";
  } else if (/crea|crear|agrega|agregar|deja|lleva|guardar|guarda/.test(normalized) && /tarea|backlog|pendiente/.test(normalized) && !/:|\d\)/.test(text)) {
    needsClarification = !/responsable|prioridad|descripcion|descripción|:/.test(normalized);
    clarificationQuestion = "Puedo crear la tarea, pero necesito que me confirmes el título o descripción mínima de la tarea.";
    actions.push("create_task_if_clear");
  }

  if (needsClarification) actions.push("ask_clarification");
  doriLog("intent", "decision plan", { intent, confidence, needsClarification, actions, notionContext: notionContext.slice(0, 300), lastDocument: memory.lastDocument });
  return { intent, confidence, needsClarification, clarificationQuestion, plan, actions, expectedOutput };
}

function isFromMe(payload: any) {
  const body = payload?.body ?? payload;
  return body?.data?.key?.fromMe === true;
}

function getSenderFromPayload(payload: any) {
  const body = payload?.body ?? payload;
  return String(
    body?.data?.pushName ||
      body?.pushName ||
      body?.data?.key?.participant ||
      body?.data?.key?.remoteJid ||
      body?.from ||
      body?.sender ||
      "Participante"
  ).trim();
}

function getChatIdFromPayload(payload: any) {
  const body = payload?.body ?? payload;
  return String(body?.data?.key?.remoteJid || body?.remoteJid || body?.chatId || "whatsapp").trim();
}

function getMessageIdFromPayload(payload: any) {
  const body = payload?.body ?? payload;
  return String(body?.data?.key?.id || body?.key?.id || body?.data?.messageId || body?.messageId || "").trim();
}

function markDoriMessageProcessing(payload: any) {
  const messageId = getMessageIdFromPayload(payload);
  const now = Date.now();
  for (const [key, timestamp] of processedDoriMessages.entries()) {
    if (now - timestamp > PROCESSED_MESSAGE_TTL_MS) processedDoriMessages.delete(key);
  }
  for (const [key, timestamp] of processedDoriTextMessages.entries()) {
    if (now - timestamp > PROCESSED_TEXT_TTL_MS) processedDoriTextMessages.delete(key);
  }
  const chatId = getChatIdFromPayload(payload);
  if (messageId) {
    const key = `${chatId}:${messageId}`;
    if (processedDoriMessages.has(key)) {
      doriLog("duplicate_check", "duplicate webhook ignored", { key });
      return true;
    }
    processedDoriMessages.set(key, now);
  }
  const text = normalizeKey(getTextFromPayload(payload)).slice(0, 500);
  if (text) {
    const textKey = `${chatId}:${text}`;
    if (processedDoriTextMessages.has(textKey)) {
      doriLog("duplicate_check", "duplicate text webhook ignored", { textKey });
      return true;
    }
    processedDoriTextMessages.set(textKey, now);
  }
  return false;
}

function stripDoriCommand(text: string) {
  return text.replace(/\bdori\b/gi, "").trim();
}

function extractSaveThis(text: string) {
  const match = text.match(/\bdori\s+(guarda|guardar|registra|registrar|anota|añade|agrega)\s+(esto|esta información|esta informacion)\s*$/i);
  if (!match) return "";
  return text.slice(0, match.index).trim();
}

function normalizeArea(text: string) {
  const lower = text.toLowerCase();
  if (/backlog|action item|action items|tarea|tareas|pendiente|pendientes|recordatorio|recuerd|enfocarme hoy|para hoy/.test(lower)) return "Product Backlog";
  if (/plan de negocio|negocio|proyecto de negocio|desarrollaremos|desarrollar.+actividad|actividad.+negocio|actividad.+proyecto/.test(lower)) return "Plan de Negocio";
  if (/proveedor|proveedores/.test(lower)) return "Proveedores";
  if (/catálogo|catalogo|producto|productos|inventario|sku/.test(lower)) return "Catálogo de Productos";
  if (/reunión|reunion|reuniones|llamada|meet/.test(lower)) return "Reuniones";
  if (/marketing|campaña|contenido|redes|anuncio/.test(lower)) return "Marketing";
  if (/finanza|finanzas|costo|precio|margen|presupuesto/.test(lower)) return "Finanzas";
  if (/arquitectura|mvp/.test(lower)) return "Arquitectura MVP";
  if (/backend|servidor/.test(lower)) return "Backend";
  if (/frontend|front\b|interfaz|pantalla|ui/.test(lower)) return "Frontend";
  if (/equipo|integrante|integrantes|persona|personas|miembro|miembros|responsable|responsables/.test(lower)) return "Equipo D'Origen";
  if (/roadmap mvp/.test(lower)) return "Roadmap MVP";
  if (/roadmap/.test(lower)) return "Roadmap";
  if (/modelo de datos|base de datos/.test(lower)) return "Modelo de Datos";
  if (/api|integración|integracion/.test(lower)) return "APIs e Integraciones";
  if (/backlog técnico|backlog tecnico|bug|error|fallo/.test(lower)) return "Backlog Técnico";
  return "Plataforma D'Origen";
}

function isKnownArea(area: string) {
  return [
    "Plan de Negocio",
    "Proveedores",
    "Catálogo de Productos",
    "Reuniones",
    "Product Backlog",
    "Marketing",
    "Finanzas",
    "Arquitectura MVP",
    "Backend",
    "Frontend",
    "Equipo D'Origen",
    "Roadmap MVP",
    "Roadmap",
    "Modelo de Datos",
    "APIs e Integraciones",
    "Backlog Técnico",
    "Plataforma D'Origen",
  ].includes(area);
}

function normalizeKey(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function expectedAreaTitle(area: string, question = "") {
  const normalized = normalizeKey(`${area} ${question}`);
  if (/tarea|backlog|action|pendiente|recuerdo|recordatorio|enfocarme hoy|para hoy/.test(normalized)) return "Product Backlog";
  if (/plan de negocio|negocio|proyecto de negocio|desarrollaremos|desarrollar actividad|actividad negocio|actividad proyecto/.test(normalized)) return "Plan de Negocio";
  if (/equipo|integrante|miembro|responsable|persona/.test(normalized)) return "Equipo D'Origen";
  if (/frontend|front|interfaz|pantalla/.test(normalized)) return "Frontend";
  if (/backend|servidor/.test(normalized)) return "Backend";
  if (/arquitectura|mvp/.test(normalized)) return "Arquitectura MVP";
  if (/roadmap/.test(normalized)) return normalized.includes("mvp") ? "Roadmap MVP" : "Roadmap";
  if (/proveedor/.test(normalized)) return "Proveedores";
  if (/catalogo|producto|inventario|sku/.test(normalized)) return "Catálogo de Productos";
  if (/api|integracion/.test(normalized)) return "APIs e Integraciones";
  return area;
}

async function notionFetch(path: string, init: RequestInit = {}) {
  const token = getNotionKey();
  if (!token) throw new Error("Missing NOTION_API_KEY / NOTION_TOKEN");
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Notion error ${res.status}`);
  return data;
}

function richText(text: string) {
  return [{ type: "text", text: { content: asText(text).slice(0, 1900) } }];
}

function contentBlocks(content: unknown) {
  const text = asText(content).trim();
  if (!text) return [];
  const chunks = text.match(/[\s\S]{1,1900}/g) || [];
  return chunks.slice(0, 100).map((chunk) => ({
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: richText(chunk) },
  }));
}

function paragraphBlock(text: string) {
  return { object: "block", type: "paragraph", paragraph: { rich_text: richText(text) } };
}

function headingBlock(text: string) {
  return { object: "block", type: "heading_2", heading_2: { rich_text: richText(text) } };
}

function bulletBlock(text: string) {
  return { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: richText(text) } };
}

function fileBlock(name: string, url: string) {
  return { object: "block", type: "file", file: { caption: richText(name), type: "external", external: { url } } };
}

function paragraphBlocksFromText(text: string, maxChars = 60000) {
  return asText(text)
    .slice(0, maxChars)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+\n/g, "\n").trim())
    .filter(Boolean)
    .flatMap((paragraph) => (paragraph.match(/[\s\S]{1,1900}/g) || []).map((chunk) => paragraphBlock(chunk)));
}

function plainFromRich(value: any): string {
  if (Array.isArray(value)) return value.map((v) => v?.plain_text || v?.text?.content || "").join("");
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.plain_text || value?.text?.content || value.content || "";
  return "";
}

function titleFromNotion(item: any): string {
  if (item?.type === "child_page") return item?.child_page?.title || "";
  const props = item?.properties || {};
  for (const prop of Object.values<any>(props)) {
    if (prop?.type === "title") return plainFromRich(prop.title).trim();
  }
  return plainFromRich(item?.title).trim() || item?.url || "";
}

function isActiveNotionItem(item: any) {
  return Boolean(item?.id) && item.archived !== true && item.in_trash !== true;
}

function notionUrl(id: string) {
  return id ? `https://www.notion.so/${id.replace(/-/g, "")}` : "";
}

function itemUrl(item: any) {
  return item?.url || notionUrl(item?.id || "");
}

function sourceLine(title: string, url: string) {
  const noPreviewUrl = url.replace(/^https?:\/\//, "");
  return url ? `\n\nFuente: ${title}\n${noPreviewUrl}` : `\n\nFuente: ${title}`;
}

function cleanWhatsAppText(text: string) {
  return text.replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

function doriLog(step: string, detail: string, data?: unknown) {
  const prefix = `[dori][${step}]`;
  if (data === undefined) console.log(prefix, detail);
  else console.log(prefix, detail, data);
}

function standardActionResponse(input: { sender?: string; intent: string; did: string[]; result: string[]; missing?: string[]; source?: string[] }) {
  const name = input.sender ? ` ${input.sender}` : "";
  return cleanWhatsAppText(
    [
      `Listo${name}. Entendí que quieres ${input.intent}.`,
      input.did.length ? `Hice esto:\n${input.did.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : "",
      input.result.length ? `Resultado:\n${input.result.map((item) => `- ${item}`).join("\n")}` : "",
      input.missing?.length ? `Faltó:\n${input.missing.map((item) => `- ${item}`).join("\n")}` : "",
      input.source?.length ? `Fuente:\n${input.source.map((item) => `- ${item}`).join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  );
}

async function sendWhatsAppMessage(payload: any, text: string) {
  const number = getChatIdFromPayload(payload);
  if (!number || !text.trim()) return;
  const apiUrl = (process.env.EVOLUTION_API_URL || process.env.EVOLUTION_BASE_URL || "http://95.111.236.226:8080").replace(/\/$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_TOKEN || process.env.BOTZ_EVOLUTION_API_KEY || "";
  const instance = process.env.EVOLUTION_INSTANCE || "Dori";
  if (!apiKey) {
    console.warn("[dori][response] missing Evolution API key for background WhatsApp send");
    return;
  }
  const response = await fetch(`${apiUrl}/message/sendText/${encodeURIComponent(instance)}`, {
    method: "POST",
    headers: { apikey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ number, text: cleanWhatsAppText(text) }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.warn("[dori][response] background WhatsApp send failed", { status: response.status, body: body.slice(0, 300) });
  }
}

async function searchNotion(query: string, pageSize = 10) {
  const body: Record<string, unknown> = { page_size: pageSize, sort: { direction: "descending", timestamp: "last_edited_time" } };
  if (query.trim()) body.query = query;
  return notionFetch("/search", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function searchNotionObject(query: string, object: "page" | "database", pageSize = 20) {
  const body: Record<string, unknown> = {
    page_size: pageSize,
    filter: { property: "object", value: object },
    sort: { direction: "descending", timestamp: "last_edited_time" },
  };
  if (query.trim()) body.query = query;
  return notionFetch("/search", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function findCandidates(query: string) {
  const data = await searchNotion(query, 20);
  const results = (Array.isArray(data.results) ? data.results : []).filter(isActiveNotionItem);
  const q = normalizeKey(query);
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  const scored = results
    .map((item: any) => {
      const rawTitle = titleFromNotion(item);
      const title = normalizeKey(rawTitle);
      let score = item.object === "page" ? 3 : 1;
      for (const word of words) if (title.includes(word)) score += 5;
      if (title === q) score += 100;
      if (title && q && (q.includes(title) || title.includes(q))) score += 40;
      if (words.length && words.every((word) => title.includes(word))) score += 25;
      if (q.includes("plan") && title.includes("negocio")) score += 50;
      if (q.includes("equipo") && title.includes("equipo")) score += 50;
      if (q.includes("arquitectura") && title.includes("arquitectura")) score += 80;
      return { item, score };
    })
    .sort((a: any, b: any) => b.score - a.score);
  return scored.filter((entry: any) => entry.score > 4).map((entry: any) => entry.item);
}

async function findExactTitle(title: string) {
  const expected = normalizeKey(title);
  const data = await searchNotion(title, 50);
  const results = (Array.isArray(data.results) ? data.results : []).filter(isActiveNotionItem);
  return (
    results.find((item: any) => normalizeKey(titleFromNotion(item)) === expected) ||
    results.find((item: any) => normalizeKey(titleFromNotion(item)).includes(expected) || expected.includes(normalizeKey(titleFromNotion(item)))) ||
    null
  );
}

async function findBest(query: string) {
  return (await findCandidates(query))[0] || null;
}

function uniqueItems(items: any[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item?.id || `${item?.object || item?.type}:${titleFromNotion(item)}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function answerSearchQueries(question: string, expectedTitle: string, area: string) {
  const normalized = normalizeKey(`${question} ${area}`);
  const isBusinessQuestion = /plan de negocio|negocio|proyecto|actividad|desarrollaremos|desarrollo|nicho|mercado|rubro|slogan|producto|necesidades|analisis/.test(normalized);
  const queries = isBusinessQuestion ? ["Plan de Negocio", "Proyecto de Negocio D'Origen", "2606224 Nuevo Proyecto de Negocio D'Origen", question, stripDoriCommand(question)] : [expectedTitle, area, question, stripDoriCommand(question)];
  if (isBusinessQuestion) {
    queries.push("Plan de Negocio", "Proyecto de Negocio D'Origen", "2606224 Nuevo Proyecto de Negocio D'Origen");
  }
  if (/tarea|pendiente|backlog|enfocarme hoy/.test(normalized)) queries.push("Product Backlog", "Backlog Técnico", "Tareas");
  return Array.from(new Set(queries.map((query) => query.trim()).filter(Boolean)));
}

async function answerCandidates(question: string, expectedTitle: string, area: string, shouldReadRoot: boolean) {
  const queries = answerSearchQueries(question, expectedTitle, area);
  const candidates: any[] = [];
  if (expectedTitle === "Product Backlog") candidates.push(await findBacklogTarget());
  for (const query of queries) {
    candidates.push(await findExactTitle(query).catch(() => null));
    if (!shouldReadRoot) candidates.push(await findRootChildPage(query).catch(() => null));
    candidates.push(...(await findCandidates(query).catch(() => [])));
  }
  return uniqueItems(candidates.filter(Boolean));
}

async function readBlockChildren(blockId: string) {
  const results: any[] = [];
  let cursor = "";
  do {
    const path = `/blocks/${blockId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`;
    const data = await notionFetch(path);
    results.push(...(Array.isArray(data.results) ? data.results : []));
    cursor = data.has_more ? data.next_cursor || "" : "";
  } while (cursor);
  return results;
}

async function readBlocks(blockId: string, depth = 0, maxDepth = 4): Promise<string[]> {
  if (!blockId || depth > maxDepth) return [];
  const blocks = await readBlockChildren(blockId);
  const lines: string[] = [];
  for (const block of blocks) {
    const type = block.type;
    const body = block[type] || {};
    const text = plainFromRich(body.rich_text || body.title || body.caption || body.text).trim();
    if (type === "child_page" && body.title) lines.push(`[Página] ${body.title}`);
    else if (text) lines.push(text);
    if (block.has_children) lines.push(...(await readBlocks(block.id, depth + 1, maxDepth)));
  }
  return lines;
}

function wordsFrom(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !["como", "cual", "que", "del", "para", "puedes", "ayudar"].includes(word));
}

async function findRootChildPage(query: string) {
  const rootPageId = process.env.DORI_NOTION_PARENT_PAGE_ID || DEFAULT_PARENT_PAGE_ID;
  const blocks = await readBlockChildren(rootPageId);
  const words = wordsFrom(query);
  const matches = blocks
    .filter((block) => block.type === "child_page")
    .map((block) => {
      const title = String(block.child_page?.title || "");
      const normalizedTitle = wordsFrom(title).join(" ");
      let score = 0;
      for (const word of words) if (normalizedTitle.includes(word)) score += 10;
      if (words.length && words.every((word) => normalizedTitle.includes(word))) score += 50;
      return { item: block, score };
    })
    .sort((a, b) => b.score - a.score);
  return matches[0]?.score > 0 ? matches[0].item : null;
}

async function queryDatabase(databaseId: string) {
  const data = await notionFetch(`/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify({ page_size: 20 }),
  });
  const results = Array.isArray(data.results) ? data.results : [];
  return results
    .map((row: any) => {
      const props = row.properties || {};
      const values = Object.entries<any>(props)
        .map(([name, prop]) => {
          let value = "";
          if (prop.type === "title") value = plainFromRich(prop.title);
          else if (prop.type === "rich_text") value = plainFromRich(prop.rich_text);
          else if (prop.type === "select") value = prop.select?.name || "";
          else if (prop.type === "multi_select") value = (prop.multi_select || []).map((v: any) => v.name).join(", ");
          else if (prop.type === "people") value = (prop.people || []).map((v: any) => v.name || v.person?.email || v.id).join(", ");
          else if (prop.type === "email") value = prop.email || "";
          else if (prop.type === "phone_number") value = prop.phone_number || "";
          else if (prop.type === "checkbox") value = prop.checkbox ? "sí" : "no";
          else if (prop.type === "date") value = prop.date?.start || "";
          else if (prop.type === "url") value = prop.url || "";
          else if (prop.type === "number") value = String(prop.number ?? "");
          else if (prop.type === "status") value = prop.status?.name || "";
          return value ? `${name}: ${value}` : "";
        })
        .filter(Boolean);
      return values.length ? `- ${values.join(" | ")}` : titleFromNotion(row);
    })
    .filter(Boolean);
}

async function classify(openai: OpenAI, text: string, memory?: DoriMemory): Promise<DoriIntent> {
  doriLog("intent", "classifying message", { text: text.slice(0, 500), sender: memory?.sender || "" });
  const saveThis = extractSaveThis(text);
  if (saveThis) {
    return { action: "append_page", title: "Información guardada", content: saveThis, query: "", area: normalizeArea(saveThis) };
  }
  if (isBacklogListQuestion(text)) {
    return { action: "answer", title: "", content: "", query: stripDoriCommand(text), area: "Product Backlog" };
  }
  if (isFollowupQuestion(text)) {
    return { action: "answer", title: "", content: "", query: stripDoriCommand(text), area: "Product Backlog" };
  }
  if (isTaskRequest(text)) {
    const task = buildTaskIntent(text);
    return {
      action: "create_task",
      title: task.title,
      content: task.content,
      query: "Product Backlog",
      area: "Product Backlog",
    };
  }
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Clasifica mensajes para Dori, asistente de Origen y Project Manager/Product Owner conectado a Notion. Responde SOLO JSON válido con action, title, content, query, area. Actions: answer, create_task, create_page, append_page, create_bug, create_idea, create_decision, process_document_to_backlog. Nunca uses ignore para mensajes normales: si saludan, conversan o preguntan algo, usa answer. Si es pregunta usa answer. Si piden pendientes, tareas, equipo, estado o seguimiento, usa answer con area Product Backlog. Si piden guardar usa append_page. Si pide procesar PDF/manual/documento para extraer actividades o llevarlas al backlog usa process_document_to_backlog. Si pide agenda/reunión usa create_page. Si falta archivo, responsable, fecha, prioridad o área, clasifica la intención igual y deja content indicando qué falta. Usa el contexto reciente para entender referencias como 'dámelas aquí', 'muéstramelas' o 'eso'.",
      },
      { role: "user", content: `Mensaje: ${text}\n\nContexto reciente:\n${memory?.recentHistory?.slice(-6000) || "Sin historial"}\n\nÚltimo documento mencionado: ${memory?.lastDocument || "ninguno"}\nÚltimas tareas: ${(memory?.lastTasks || []).join(" | ") || "ninguna"}` },
    ],
  });
  const raw = completion.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(raw.replace(/```json/g, "").replace(/```/g, "").trim());
    const detectedArea = normalizeArea(text);
    const parsedArea = asText(parsed.area);
    const intent = {
      action: parsed.action === "ignore" ? "answer" : parsed.action || "answer",
      title: asText(parsed.title),
      content: asText(parsed.content || parsed.description || stripDoriCommand(text)),
      query: asText(parsed.query || stripDoriCommand(text)),
      area: detectedArea !== "Plataforma D'Origen" ? detectedArea : isKnownArea(parsedArea) ? parsedArea : detectedArea,
    };
    doriLog("intent", "classified", intent);
    return intent;
  } catch {
    return { action: "answer", title: "", content: "", query: stripDoriCommand(text), area: normalizeArea(text) };
  }
}

function isBacklogListQuestion(text: string) {
  const normalized = normalizeKey(text);
  if (isFollowupQuestion(text)) return true;
  return /backlog|tarea|tareas|pendiente|pendientes/.test(normalized) && /que|qué|cuales|cuáles|listar|lista|mostrar|muestra|hay|tenemos|estado|dime/.test(normalized);
}

function buildTaskIntent(text: string) {
  const clean = stripDoriCommand(text).replace(/\s+/g, " ").trim();
  const normalized = normalizeKey(clean);
  const assignee = /r+i+c+a?rdo/.test(normalized)
    ? "Ricardo"
    : /responsable\s+juan\b|para\s+juan\b|ju[as]n\s+carlos|jusn\s+carlos|justn\s+carlos/.test(normalized)
      ? "Juan Carlos"
      : "Sin asignar";
  const priority = /priori|urgente|bloquea|p0|alta/.test(normalized) ? "Alta" : "Normal";
  const sprintMatch = clean.match(/sprint\s+\d+(?:\s*(?:al|a|hasta|->|-)\s*\d+)?/i)?.[0];
  const explicitTask = clean.includes(":") ? clean.split(":").slice(1).join(":").trim() : "";
  const titleSource = (explicitTask || clean)
    .replace(/^puedes\s+/i, "")
    .replace(/^puede\s+/i, "")
    .replace(/por favor/gi, "")
    .replace(/dej[aá]lo en el backlog como una tarea para .+$/i, "")
    .replace(/dej[aá]lo en el backlog.*$/i, "")
    .trim();
  const title = titleSource
    ? titleSource.charAt(0).toUpperCase() + titleSource.slice(1)
    : sprintMatch
      ? `Priorizar ${sprintMatch}`
      : assignee !== "Sin asignar"
        ? `Tarea para ${assignee}`
        : "Tarea Dori";
  const content = [
    `Solicitud: ${clean}`,
    sprintMatch ? `Sprint: ${sprintMatch}` : "",
    `Responsable: ${assignee}`,
    `Prioridad: ${priority}`,
    "Ubicación solicitada: Product Backlog",
    "Estado: pendiente de validación",
  ]
    .filter(Boolean)
    .join("\n");
  return { title, content };
}

function extractNumberedTasks(text: string) {
  const clean = stripDoriCommand(text);
  const matches = Array.from(clean.matchAll(/(?:^|\n)\s*\d+\)\s*([^\n]+)/g)).map((match) => match[1]?.trim()).filter(Boolean);
  return matches.map((line) => {
    const assignee = assigneeFromText(line) || assigneeFromText(clean) || "Sin asignar";
    const title = cleanTaskTitle(line);
    return {
    title,
    content: [
      `Solicitud: ${line}`,
      `Descripción: ${title}`,
      `Responsable: ${assignee}`,
      "Prioridad: Normal",
      "Ubicación solicitada: Product Backlog",
      "Estado: pendiente de validación",
    ].join("\n"),
    };
  });
}

function assigneeFromText(text: string) {
  const normalized = normalizeKey(text);
  const explicit = text.match(/(?:asignar|asigna|responsable|para)\s+a?\s*([a-záéíóúñ ]+?)\s*$/i)?.[1]?.trim();
  const candidate = explicit ? normalizeKey(explicit) : normalized;
  if (/r+i+c+a?rdo/.test(candidate)) return "Ricardo";
  if (/juan carlos|\bjuan\b/.test(candidate)) return "Juan";
  if (/\bruth\b|rut\b/.test(candidate)) return "Ruth";
  if (/\bsandra\b/.test(candidate)) return "Sandra";
  if (/\bmonica\b|\bmónica\b/.test(candidate)) return "Monica";
  if (/\btodos\b|equipo/.test(candidate)) return "Todos";
  return "";
}

function cleanTaskTitle(line: string) {
  return line
    .replace(/[\s.,;:-]*(?:asignar|asigna|responsable|para)\s+a?\s+[a-záéíóúñ ]+\s*$/i, "")
    .trim();
}

function isCapabilityQuestion(text: string) {
  return /c[oó]mo me puedes ayudar|qu[eé] puedes hacer|qu[eé] haces|para qu[eé] sirves|ayuda|manual|instrucciones|gu[ií]a/i.test(text);
}

function doriManual() {
  return [
    "Soy Dori, asistente del proyecto D'Origen conectado a Notion.",
    "",
    "Puedo hacer esto:",
    "- Responder preguntas leyendo Notion: plan de negocio, arquitectura MVP, frontend, backend, roadmap, equipo, proveedores, catálogo, tareas, finanzas, marketing e integraciones.",
    "- Leer contenido dentro de páginas y subpáginas cuando la integración tenga acceso.",
    "- Leer bases de datos de Notion y sus propiedades: nombres, cargos, país, emails, roles, estados, fechas, etc.",
    "- Guardar notas largas en la página o área correcta de Notion.",
    "- Crear tareas/action items, bugs, ideas, decisiones y páginas de reunión en Notion.",
    "- Decirte dónde guardé algo y pasarte el link de Notion.",
    "- Decirte de qué página o base saqué una respuesta y pasarte el link de fuente.",
    "",
    "Ejemplos:",
    "- Dori cuál es la arquitectura MVP?",
    "- Dori cuáles son los integrantes del equipo?",
    "- Dori guarda esto en action items: ...",
    "- Dori crea una reunión sobre proveedores para mañana a las 10am.",
    "",
    "Google Calendar:",
    "- Puedo preparar eventos reales para Google Calendar cuando n8n tenga la credencial conectada.",
    "- Si pides una reunión con el equipo, uso los emails registrados en Equipo D'Origen cuando estén disponibles.",
  ].join("\n");
}

function isDiagnosticsQuestion(text: string) {
  return /diagn[oó]stico|debug|p[aá]ginas visibles|que paginas ves|qu[eé] ves en notion/i.test(text);
}

function isChatSummaryQuestion(text: string) {
  const clean = stripDoriCommand(text).trim();
  const normalized = normalizeKey(clean);
  if (/^(dame|haz|hacer|pasame|pasar|genera|generar)?\s*(un\s+)?resumen\s*(por favor)?$/.test(normalized)) return true;
  return /resum|resumen|qu[eé] se habl[oó]|qu[eé] hablaron|chat|conversaci[oó]n|whatsapp|grupo/i.test(text) && /chat|conversaci[oó]n|whatsapp|grupo|hoy|ayer|habl/i.test(text);
}

function isCalendarInfoQuestion(text: string) {
  const normalized = normalizeKey(text);
  return /reuni|meet|meeting|calendar|calendario|evento|agenda/.test(normalized) && /hor|link|enlace|donde|cuando|toronto|equipo|tenemos|hay|programad|agendad|proxima|pr[oó]xima|pendiente|pendientes|lista|listar|dime|cu[aá]les|cuales|que|qué/.test(normalized);
}

function isCalendarCreateCommand(text: string) {
  const normalized = normalizeKey(text);
  return /\b(agenda|agendar|crear|crea|cita|citar|programa|programar)\b/.test(normalized) && /google calendar|google calendario|calendar|calendario|reuni|meet|meeting|evento/.test(normalized);
}

function isTaskRequest(text: string) {
  if (isFollowupQuestion(text) || isBacklogListQuestion(text)) return false;
  return isCreateTaskCommand(text) || /ponle (esta )?tarea|asigna(r)? tarea/i.test(text);
}

function taskStatusFromText(text: string) {
  const normalized = normalizeKey(text);
  if (/\b(en progreso|progreso|en curso)\b/.test(normalized)) return "En progreso";
  if (/\bpendiente\b/.test(normalized)) return "Pendiente";
  if (/\bready|lista|listo\b/.test(normalized)) return "Ready";
  if (/\bqa\b/.test(normalized)) return "QA";
  if (/\bdone|completado|completa|terminado|terminada\b/.test(normalized)) return "Done";
  return "";
}

function isTaskStatusUpdateRequest(text: string) {
  const normalized = normalizeKey(text);
  return Boolean(taskStatusFromText(text)) && /\b(cambia|cambiale|cambiar|pasa|pasar|pon|poner|mueve|mover|actualiza|actualizar)\b/.test(normalized) && /\b(tarea|backlog|estado|pendiente|ready|progreso|qa|done)\b/.test(normalized);
}

function extractTaskStatusUpdate(text: string) {
  const clean = stripDoriCommand(text).replace(/\s+/g, " ").trim();
  const status = taskStatusFromText(clean);
  if (!status) return { status: "", title: "" };
  const statusPattern = "en progreso|progreso|en curso|pendiente|ready|lista|listo|qa|done|completado|completa|terminado|terminada";
  const match = clean.match(new RegExp(`(?:estado\\s+de\\s+|tarea\\s+)?(.+?)\\s+(?:a|al|en|para)\\s+(${statusPattern})\\b`, "i"));
  let title = (match?.[1] || "")
    .replace(/^(cambia|cambiale|cámbiale|cambiar|pasa|pasar|pon|poner|mueve|mover|actualiza|actualizar)\s+/i, "")
    .replace(/^(el|la)\s+/i, "")
    .replace(/^estado\s+de\s+/i, "")
    .replace(/^tarea\s+/i, "")
    .replace(/\s+en\s+(el\s+)?product\s+backlog$/i, "")
    .trim();
  return { status, title };
}

function isCalendarInfoOnlyQuestion(text: string) {
  const normalized = normalizeKey(text);
  return isCalendarInfoQuestion(text) && !isCalendarCreateCommand(text) && !/\b(cambi|mueve|mover|mov|ajust|reprogram|modific|pasar|pasa)\b/.test(normalized);
}

function isScheduledMeetingQuestion(text: string) {
  const normalized = normalizeKey(text);
  return /reuni|meet|meeting|evento|calendar|calendario|agenda/.test(normalized) && /tenemos|hay|programad|agendad|pr[oó]xima|proxima|pendiente|pendientes/.test(normalized) && !isCalendarCreateCommand(text);
}

function formatCalendarTime(iso: string, timeZone: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CO", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function latestCalendarLine(history: string) {
  return history
    .split("\n")
    .reverse()
    .find((line) => /Dori \(/.test(line) && /Evento listo|Evento creado|Reuni[oó]n actualizada|Nuevo horario|Inicio:|Google Calendar/i.test(line));
}

async function answerCalendarInfo(question: string) {
  const history = await readChatHistory(160);
  const line = latestCalendarLine(history);
  if (!line) {
    return "No tengo una reunión reciente registrada en el historial. Si la reunión existe en Google Calendar, necesito que n8n consulte Calendar para traer hora y link real.";
  }
  const start = line.match(/(?:Inicio:|Nuevo horario:)\s*(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))/)?.[1];
  const asksToronto = /toronto/i.test(question);
  const timeZone = asksToronto ? "America/Toronto" : DEFAULT_TIME_ZONE;
  const link = line.match(/https?:\/\/\S+|calendar\.google\.com\/\S+/)?.[0];
  const parts = ["Última información de reunión que tengo en el historial:"];
  if (start) parts.push(`Horario ${asksToronto ? "Toronto" : "Canadá/Toronto"}: ${formatCalendarTime(start, timeZone)}`);
  else parts.push(line.replace(/^\[[^\]]+\]\s*/, ""));
  if (/link|enlace|donde/i.test(question)) parts.push(link ? `Link: ${link}` : "Aún no tengo guardado el enlace real de Google Calendar en este chat. Revisa la invitación del calendario o la última confirmación de la reunión.");
  return parts.join("\n");
}

async function answerMeetingInfoFromNotion(openai: OpenAI, question: string) {
  const todayToronto = zonedDateString(new Date(), DEFAULT_TIME_ZONE);
  const asksToday = /\b(hoy|today|esta tarde|esta noche|ahora)\b/i.test(normalizeKey(question));
  const meetingPattern = /reuni[oó]n|reunion|meet|meeting|calendar|calendario|agenda|acta|evento|google calendar|horario|link/i;
  const queries = isScheduledMeetingQuestion(question)
    ? [stripDoriCommand(question), "reunión programada", "reunion programada", "meet", "meeting", "calendario", "Google Calendar", "agenda", "evento"]
    : [stripDoriCommand(question), "Historial WhatsApp Dori", "reunión", "reunion", "meet", "meeting", "calendario", "Google Calendar", "acta reunión", "acta reunion"];
  const candidates = uniqueItems(
    (
      await Promise.all(
        queries.map((query) => findCandidates(query).catch(() => []))
      )
    )
      .flat()
      .filter(isActiveNotionItem)
  ).slice(0, 12);

  const sections: string[] = [];
  for (const item of candidates) {
      const title = titleFromNotion(item) || "Elemento Notion";
      if (isScheduledMeetingQuestion(question) && /historial whatsapp/i.test(title)) continue;
      const url = itemUrl(item);
    if (item.object === "database") {
      const rows = await queryDatabase(item.id).catch(() => []);
      const meetingRows = rows.filter((row) => meetingPattern.test(row));
      if (meetingRows.length) sections.push(`Fuente: ${title}\n${url}\n${meetingRows.slice(0, 30).join("\n")}`);
    } else if (item.object === "page") {
      const lines = await readBlocks(item.id, 0, 3).catch(() => []);
      const isMeetingPage = meetingPattern.test(title);
      const meetingLines = isMeetingPage ? lines : lines.filter((line) => meetingPattern.test(line));
      if (meetingLines.length) sections.push(`Fuente: ${title}\n${url}\n${meetingLines.slice(-120).join("\n")}`);
    }
  }

  const context = sections.join("\n\n---\n\n").trim();
  if (!context) {
    return "No encontré información de reuniones del equipo en Notion. Revisa que la reunión esté guardada en Notion o que Dori tenga acceso a esa página/base.";
  }

  if (isScheduledMeetingQuestion(question)) {
    const scheduledLines = context
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => !/^\[20\d{2}-\d{2}-\d{2}T/.test(line) && !/\bDori \(|\bJuan Carlos \(/.test(line))
      .filter((line) => meetingPattern.test(line) && /(20\d{2}-\d{2}-\d{2}|\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(am|pm)\b|calendar\.google|meet\.google)/i.test(line))
      .slice(0, 12);
    if (!scheduledLines.length) {
      const sources = sections
        .map((section) => section.split("\n").slice(0, 2).join("\n"))
        .slice(0, 4)
        .join("\n");
      return cleanWhatsAppText(`No encontré reuniones programadas en las páginas y bases de Notion que Dori puede leer.\n\nEncontré información relacionada con reuniones, pero sin fecha, hora o link de evento programado.\n\nFuentes revisadas:\n${sources}`);
    }
    return cleanWhatsAppText(`Sí encontré posibles reuniones programadas:\n${scheduledLines.map((line) => `- ${line}`).join("\n")}`);
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 1100,
    messages: [
      {
        role: "system",
        content:
          "Responde como Dori usando SOLO el contexto de Notion. El usuario pregunta por reuniones del equipo. Contesta primero la pregunta directa: si hay reuniones programadas, lista cuáles; si no ves ninguna programada, dilo claro. No digas que es para hoy salvo que el usuario pregunte por hoy. Incluye hora, asistentes, link, agenda, decisiones, pendientes y fuente cuando existan. Si el contexto solo tiene actas, notas o páginas relacionadas pero no eventos programados, aclara que encontraste información relacionada pero no reuniones programadas. No inventes. No pidas fecha/hora ni ofrezcas crear evento a menos que el usuario lo pida. No uses asteriscos ni Markdown de negrita.",
      },
      { role: "user", content: `Pregunta: ${question}\nPregunta por hoy: ${asksToday ? "sí" : "no"}\nFecha de hoy en Toronto: ${todayToronto}\n\nContexto de Notion:\n${context.slice(0, 24000)}` },
    ],
  });
  return cleanWhatsAppText(completion.choices[0]?.message?.content || "No pude responder con la información disponible en Notion.");
}

async function summarizeChatHistory(openai: OpenAI, question: string) {
  const history = await readChatHistory(140).catch((error) => {
    console.warn("[dori][memory] could not read chat history for summary", error?.message || error);
    return "";
  });
  if (!history.trim()) return "Todavía no tengo historial legible del chat. Si quieres, reenvíame los mensajes o dime 'Dori resume desde aquí' y empiezo a guardar contexto nuevo.";
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 800,
    messages: [
      {
        role: "system",
        content:
          "Resume conversaciones de WhatsApp para el proyecto D'Origen usando solo el historial entregado. Sé concreto. Incluye temas principales, decisiones, pendientes, responsables si aparecen y dudas abiertas. No inventes. No uses Markdown de negrita ni asteriscos.",
      },
      { role: "user", content: `Solicitud: ${question}\n\nHistorial reciente:\n${history.slice(-18000)}` },
    ],
  });
  return cleanWhatsAppText(completion.choices[0]?.message?.content || "No pude resumir el historial disponible.");
}

function isGoogleCalendarRequest(text: string) {
  return isCalendarCreateCommand(text);
}

function isCalendarUpdateRequest(text: string) {
  const normalized = normalizeKey(text);
  return /reuni|meet|meeting|evento|calendar|calendario/.test(normalized) && /cambi|mov|ajust|reprogram|modific|pasar|pasa (la|el|para)/.test(normalized);
}

function isMissingCalendarDate(text: string) {
  return !/\b(hoy|mañana|manana|pasado mañana|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|\d{1,2}[/-]\d{1,2}|\d{4}-\d{2}-\d{2})\b/i.test(text);
}

function isMissingCalendarTime(text: string) {
  return !/(\b(a las|a la|@)\s*\d{1,2}(:\d{2})?\s*(am|pm)?\b|\b\d{1,2}:\d{2}\s*(am|pm)?\b|\b\d{1,2}\s*(am|pm)\b|\bmediod[ií]a\b|\bmedio d[ií]a\b)/i.test(text);
}

function normalizeCalendarEnd(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return end;
  const durationMs = endDate.getTime() - startDate.getTime();
  if (durationMs > 0 && durationMs <= 12 * 60 * 60 * 1000) return end;
  return new Date(startDate.getTime() + 60 * 60 * 1000).toISOString();
}

function zonedDateString(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function replaceIsoDate(value: string, date: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.replace(/^\d{4}-\d{2}-\d{2}/, date) : value;
}

function applyRelativeCalendarDate(text: string, start: string, end: string, timeZone: string) {
  const lower = text.toLowerCase();
  let offsetDays: number | null = null;
  const weekdayMatch = lower.match(/\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/);
  if (weekdayMatch) {
    const targetDays: Record<string, number> = { lunes: 1, martes: 2, miercoles: 3, miércoles: 3, jueves: 4, viernes: 5, sabado: 6, sábado: 6, domingo: 0 };
    const today = zonedDateString(new Date(), timeZone);
    const currentDay = new Date(`${today}T12:00:00Z`).getUTCDay();
    const targetDay = targetDays[weekdayMatch[1]];
    offsetDays = (targetDay - currentDay + 7) % 7;
    if (offsetDays === 0 && !/\bhoy\b/.test(lower)) offsetDays = 7;
  }
  if (/\bhoy\b/.test(lower)) offsetDays = 0;
  if (/\bma[ñn]ana\b/.test(lower) && !weekdayMatch) offsetDays = 1;
  if (offsetDays == null) return { start, end };
  const target = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const date = zonedDateString(target, timeZone);
  return { start: replaceIsoDate(start, date), end: replaceIsoDate(end, date) };
}

function groupReminderNote(text: string) {
  if (!/recordatorio|recu[eé]rdalo|recordar/i.test(text)) return "";
  if (!/grupo|whatsapp|chat/i.test(text)) return "";
  return "Nota: el evento queda preparado para Calendar, pero el recordatorio automático en este grupo de WhatsApp requiere un nodo/flujo adicional en n8n.";
}

function extractEmailFromProps(props: Record<string, any>) {
  for (const prop of Object.values<any>(props)) {
    if (prop?.type === "email" && prop.email) return String(prop.email).trim();
  }
  return "";
}

async function getTeamEmails(): Promise<string[]> {
  const configuredTeamDatabaseId = process.env.DORI_TEAM_DATABASE_ID || DEFAULT_TEAM_DATABASE_ID;
  const candidates = [
    ...(await findCandidates("Equipo D'Origen")),
    ...(await findCandidates("Equipo")),
    ...(await findCandidates("integrantes")),
  ];
  const db = candidates.find((candidate: any) => candidate?.id && candidate.object === "database");
  const databaseId = db?.id || configuredTeamDatabaseId;
  if (!databaseId) return [];
  const data = await notionFetch(`/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify({ page_size: 50 }),
  });
  const rows = Array.isArray(data.results) ? data.results : [];
  return Array.from(
    new Set<string>(
      rows
        .map((row: any) => extractEmailFromProps(row.properties || {}))
        .filter((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )
  );
}

async function buildCalendarEvent(openai: OpenAI, text: string): Promise<{ event?: CalendarEvent; message?: string }> {
  if (isMissingCalendarDate(text) || isMissingCalendarTime(text)) {
    return { message: "Para crear el evento en Google Calendar necesito fecha y hora. Ejemplo: Dori crea una reunión en Google Calendar con el equipo mañana a las 10 para revisar arquitectura." };
  }

  const timeZone = process.env.DORI_TIME_ZONE || DEFAULT_TIME_ZONE;
  const now = new Date().toISOString();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Extrae un evento de calendario desde el mensaje. Responde SOLO JSON con summary, description, start, end. start y end deben ser ISO 8601 con offset horario. Si no hay duración, usa 60 minutos. No inventes invitados ni emails. Usa español claro.",
      },
      { role: "user", content: `Ahora: ${now}\nZona horaria: ${timeZone}\nMensaje: ${text}` },
    ],
  });
  const raw = completion.choices[0]?.message?.content || "{}";
  let parsed: any = {};
  try {
    parsed = JSON.parse(raw.replace(/```json/g, "").replace(/```/g, "").trim());
  } catch {
    return { message: "No pude interpretar bien la fecha y hora del evento. Dime algo como: Dori crea una reunión en Google Calendar con el equipo mañana a las 10 para revisar arquitectura." };
  }
  const summary = asText(parsed.summary || parsed.title || "Reunión D'Origen").trim();
  const description = asText(parsed.description || stripDoriCommand(text)).trim();
  const rawStart = asText(parsed.start).trim();
  const rawEnd = normalizeCalendarEnd(rawStart, asText(parsed.end).trim());
  const dated = applyRelativeCalendarDate(text, rawStart, rawEnd, timeZone);
  const start = dated.start;
  const end = normalizeCalendarEnd(start, dated.end);
  if (!summary || !start || !end || Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
    return { message: "No pude interpretar bien la fecha y hora del evento. Dime algo como: Dori crea una reunión en Google Calendar con el equipo mañana a las 10 para revisar arquitectura." };
  }
  const attendees = /\bequipo\b|integrantes|todos/i.test(text) ? (await getTeamEmails()).map((email: string) => ({ email })) : [];
  const reminderNote = groupReminderNote(text);
  return { event: { summary, description, start, end, timeZone, attendees, ...(reminderNote ? { reminderNote } : {}) } };
}

async function buildCalendarUpdate(openai: OpenAI, text: string) {
  const calendar = await buildCalendarEvent(openai, text);
  if (!calendar.event) return calendar;
  return {
    event: calendar.event,
    message: cleanWhatsAppText(
      [
        "Entendí que quieres cambiar una reunión existente en Google Calendar, no crear una página en Notion.",
        `Nuevo horario: ${calendar.event.start} a ${calendar.event.end}`,
        calendar.event.attendees.length ? `Invitados: ${calendar.event.attendees.map((attendee) => attendee.email).join(", ")}` : "Invitados: sin cambios especificados",
        "n8n debe buscar la reunión existente y aplicar este cambio en Google Calendar. No voy a crear un evento duplicado ni una página de Notion para este cambio.",
      ].join("\n")
    ),
  };
}

async function notionDiagnostics() {
  const rootPageId = process.env.DORI_NOTION_PARENT_PAGE_ID || DEFAULT_PARENT_PAGE_ID;
  const visible = await searchNotion("", 50);
  const visibleTitles = (Array.isArray(visible.results) ? visible.results : [])
    .map((item: any) => `${item.object}: ${titleFromNotion(item) || item.id}`)
    .filter(Boolean)
    .slice(0, 25);
  let childTitles: string[] = [];
  let architectureSnippet: string[] = [];
  try {
    const children = await readBlockChildren(rootPageId);
    childTitles = children
      .filter((block) => block.type === "child_page")
      .map((block) => `child_page: ${block.child_page?.title || block.id}`)
      .slice(0, 25);
    const architectureChild = children.find((block) => block.type === "child_page" && /arquitectura/i.test(block.child_page?.title || ""));
    if (architectureChild?.id) {
      const lines = await readBlocks(architectureChild.id, 0, 5);
      architectureSnippet = [`Arquitectura MVP raíz: ${lines.length} líneas legibles`, ...lines.slice(0, 12).map((line) => `> ${line}`)];
    }
  } catch (error: any) {
    childTitles = [`No pude leer hijos de la página raíz: ${error?.message || "error desconocido"}`];
  }
  if (!architectureSnippet.length || !isUsefulContext(architectureSnippet.join("\n"))) {
    const archCandidates = await findCandidates("Arquitectura MVP");
    for (const candidate of archCandidates.slice(0, 3)) {
      if (!candidate?.id || candidate.type === "child_page") continue;
      const lines = await readBlocks(candidate.id, 0, 5).catch(() => []);
      architectureSnippet.push(`Arquitectura MVP búsqueda (${titleFromNotion(candidate)}): ${lines.length} líneas legibles`);
      architectureSnippet.push(...lines.slice(0, 12).map((line) => `> ${line}`));
      if (lines.length) break;
    }
  }
  return [
    "Diagnóstico Notion de Dori:",
    "Páginas visibles por búsqueda:",
    ...(visibleTitles.length ? visibleTitles.map((title) => `- ${title}`) : ["- Ninguna"]),
    "Páginas hijas visibles desde la raíz configurada:",
    ...(childTitles.length ? childTitles.map((title) => `- ${title}`) : ["- Ninguna"]),
    "Contenido legible de Arquitectura MVP:",
    ...(architectureSnippet.length ? architectureSnippet.map((line) => `- ${line}`) : ["- Ninguno"]),
  ].join("\n");
}

function relevantLines(context: string, question: string, area: string) {
  const extra = /arquitectura/i.test(`${question} ${area}`)
    ? "frontend backend api postgres postgresql next react typescript admin pagos pedidos inventario proveedores catalogo catalogo checkout edge storage observabilidad seguridad roles"
    : "";
  const terms = new Set([...wordsFrom(`${question} ${area} ${extra}`)]);
  const lines = context
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 2);
  const scored = lines
    .map((line, index) => {
      const normalized = wordsFrom(line).join(" ");
      let score = 0;
      for (const term of terms) if (normalized.includes(term)) score += 1;
      if (/^[0-9]+\)|^#+|^\[Página\]/.test(line)) score += 1;
      return { line, score, index };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 35)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.line);
  return scored.join("\n");
}

function firstContextLines(context: string, limit = 45) {
  return context
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 2)
    .slice(0, limit)
    .join("\n");
}

function isUsefulContext(context: string) {
  const lines = context.split("\n").map((line) => line.trim()).filter(Boolean);
  const chars = lines.join(" ").length;
  return lines.length >= 3 || chars >= 180;
}

async function createPage(parentPageId: string, title: string, content: string) {
  return notionFetch("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      properties: { title: { title: richText(title || "Nueva página Dori") } },
      children: contentBlocks(content),
    }),
  });
}

async function createPageWithBlocks(parentPageId: string, title: string, children: any[]) {
  return notionFetch("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      properties: { title: { title: richText(title || "Nueva página Dori") } },
      children: children.slice(0, 100),
    }),
  });
}

async function getWritableParentPageId() {
  const configured = process.env.DORI_NOTION_PARENT_PAGE_ID || DEFAULT_PARENT_PAGE_ID;
  const configuredPage = await notionFetch(`/pages/${configured}`).catch(() => null);
  if (configuredPage?.id && isActiveNotionItem(configuredPage)) return configured;
  const fallback = await findBest("Plataforma D'Origen").catch(() => null);
  if (fallback?.id && fallback.object === "page" && isActiveNotionItem(fallback)) return fallback.id;
  const plan = await findBest("Plan de Negocio").catch(() => null);
  if (plan?.id && plan.object === "page" && isActiveNotionItem(plan)) return plan.id;
  return configured;
}

async function getChatHistoryPage() {
  const title = `${CHAT_HISTORY_PAGE_TITLE} - ${zonedDateString(new Date(), DEFAULT_TIME_ZONE)}`;
  const existing = await findExactTitle(title).catch(() => null);
  if (existing?.id && existing.object === "page") return existing;
  const parent = await getWritableParentPageId();
  return createPage(parent, title, "Historial automático de mensajes del grupo de WhatsApp para que Dori pueda resumir conversaciones.");
}

async function getDocumentRepositoryPage() {
  const title = process.env.DORI_DOCUMENT_REPOSITORY_TITLE || "Repositorio de Documentos Dori";
  const existing = await findExactTitle(title).catch(() => null);
  if (existing?.id && existing.object === "page" && isActiveNotionItem(existing)) return existing;
  const parent = await getWritableParentPageId();
  return createPage(parent, title, "Repositorio automático de PDFs compartidos en WhatsApp para que Dori pueda encontrarlos y usarlos como contexto.");
}

function documentRecordTitle(attachment: DocumentAttachment, payload: any) {
  const messageId = asText((payload?.body ?? payload)?.data?.key?.id || attachment.messageKey?.id || "").slice(0, 10);
  const date = new Date().toISOString().slice(0, 10);
  return `${date} - ${cleanDocumentTitle(attachment.fileName || "PDF WhatsApp")}${messageId ? ` - ${messageId}` : ""}`.slice(0, 120);
}

function getSupabaseStorageConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL_BOTZ || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_BOTZ || "";
  const bucket = process.env.DORI_DOCUMENTS_BUCKET || "dori-documents";
  return { url: url.replace(/\/$/, ""), key, bucket };
}

function safeStorageName(name: string) {
  const clean = cleanDocumentTitle(name || "documento.pdf").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return /\.pdf$/i.test(clean) ? clean : `${clean || "documento"}.pdf`;
}

async function ensureSupabaseBucket(url: string, key: string, bucket: string) {
  const response = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: bucket, name: bucket, public: true, file_size_limit: 52428800, allowed_mime_types: ["application/pdf"] }),
  });
  if (!response.ok && response.status !== 400 && response.status !== 409) {
    const body = await response.text().catch(() => "");
    throw new Error(`no pude preparar bucket Supabase: ${response.status} ${body.slice(0, 200)}`);
  }
}

async function uploadPdfToStorage(attachment: DocumentAttachment, payload: any, buffer: Buffer) {
  const { url, key, bucket } = getSupabaseStorageConfig();
  if (!url || !key) throw new Error("faltan variables Supabase para guardar el archivo PDF real");
  await ensureSupabaseBucket(url, key, bucket);
  const messageId = asText((payload?.body ?? payload)?.data?.key?.id || attachment.messageKey?.id || Date.now());
  const path = `${new Date().toISOString().slice(0, 10)}/${messageId}-${safeStorageName(attachment.fileName)}`;
  const response = await fetch(`${url}/storage/v1/object/${bucket}/${encodeURIComponent(path).replace(/%2F/g, "/")}`, {
    method: "PUT",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": attachment.mimeType || "application/pdf", "x-upsert": "true" },
    body: buffer,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`no pude subir PDF a Supabase: ${response.status} ${body.slice(0, 200)}`);
  }
  return `${url}/storage/v1/object/public/${bucket}/${encodeURIComponent(path).replace(/%2F/g, "/")}`;
}

function documentRepositoryBlocks(input: { attachment: DocumentAttachment; payload: any; instruction: string; status: string; documentText: string; storedFileUrl?: string; error?: string }) {
  const sender = getSenderFromPayload(input.payload);
  const chatId = getChatIdFromPayload(input.payload);
  const receivedAt = new Date().toISOString();
  const blocks: any[] = [
    headingBlock("Metadatos"),
    bulletBlock(`Archivo: ${input.attachment.fileName || "PDF WhatsApp"}`),
    bulletBlock(`Estado: ${input.status}`),
    bulletBlock(`Enviado por: ${sender}`),
    bulletBlock(`Chat: ${chatId}`),
    bulletBlock(`Fecha: ${receivedAt}`),
    input.instruction ? bulletBlock(`Mensaje asociado: ${stripDoriCommand(input.instruction)}`) : bulletBlock("Mensaje asociado: sin instrucción"),
    input.storedFileUrl ? bulletBlock(`Archivo guardado: ${input.storedFileUrl}`) : bulletBlock("Archivo guardado: no disponible"),
    input.attachment.url ? bulletBlock(`URL original: ${input.attachment.url}`) : bulletBlock("URL original: no disponible en webhook"),
  ];
  if (input.storedFileUrl) blocks.push(headingBlock("Archivo PDF"), fileBlock(input.attachment.fileName || "PDF WhatsApp", input.storedFileUrl));
  if (input.error) blocks.push(headingBlock("Observación"), paragraphBlock(input.error));
  if (input.documentText.trim()) {
    blocks.push(headingBlock("Texto extraído"), ...paragraphBlocksFromText(input.documentText, 30000));
  }
  return blocks;
}

function externalPdfAttachment(url: string, payload: any): DocumentAttachment {
  return {
    fileName: fileNameFromUrl(url),
    mimeType: "application/pdf",
    caption: getTextFromPayload(payload),
    url,
    base64: "",
    mediaKey: "",
    messageKey: (payload?.body ?? payload)?.data?.key || (payload?.body ?? payload)?.key || {},
    rawMessage: {},
    rawDocument: { url, mimetype: "application/pdf", fileName: fileNameFromUrl(url) },
    instance: pickFirstString((payload?.body ?? payload)?.instance, (payload?.body ?? payload)?.data?.instance, process.env.EVOLUTION_INSTANCE, "Dori"),
  };
}

async function archivePdfAttachmentInBackground(payload: any, text: string, providedAttachment?: DocumentAttachment) {
  const attachment = providedAttachment || getDocumentAttachment(payload);
  if (!isPdfAttachment(attachment)) return null;
  doriLog("document", "PDF payload summary", summarizeDocumentPayload(payload, attachment));

  const title = documentRecordTitle(attachment!, payload);
  const existing = await findExactTitle(title).catch(() => null);
  if (existing?.id && existing.object === "page" && isActiveNotionItem(existing)) return existing;

  let documentText = "";
  let status = "registrado";
  let error = "";
  let storedFileUrl = "";
  try {
    const buffer = await downloadAttachmentBuffer(attachment!);
    if (!isPdfBuffer(buffer)) throw new Error(`el archivo recibido no llegó como PDF guardable. header=${bufferHeader(buffer)}, bytes=${buffer.length}`);
    storedFileUrl = await uploadPdfToStorage(attachment!, payload, buffer);
    status = "archivo PDF guardado";
  } catch (err: any) {
    status = "registrado, archivo no guardado";
    error = `No pude guardar el archivo PDF real: ${String(err?.message || err).slice(0, 300)}`;
  }

  const repository = await getDocumentRepositoryPage();
  const page = await createPageWithBlocks(repository.id, title, documentRepositoryBlocks({ attachment: attachment!, payload, instruction: text, status, documentText, storedFileUrl, error }));
  await appendChatHistoryLine(`[${new Date().toISOString()}] PDF guardado (${getChatIdFromPayload(payload)}): ${attachment!.fileName || "PDF WhatsApp"} | Enviado por: ${getSenderFromPayload(payload)} | Estado: ${status} | Archivo: ${storedFileUrl || "no disponible"} | Notion: ${page.url || itemUrl(page)}`);
  return page;
}

async function getChatHistoryPages() {
  const todayTitle = `${CHAT_HISTORY_PAGE_TITLE} - ${zonedDateString(new Date(), DEFAULT_TIME_ZONE)}`;
  const candidates = [
    ...(await findCandidates(todayTitle).catch(() => [])),
    ...(await findCandidates(CHAT_HISTORY_PAGE_TITLE).catch(() => [])),
  ];
  return uniqueItems(candidates).filter((item: any) => item?.id && item.object === "page" && normalizeKey(titleFromNotion(item)).startsWith(normalizeKey(CHAT_HISTORY_PAGE_TITLE)));
}

async function appendChatHistoryLine(line: string) {
  recentDoriChatLines.push(line);
  if (recentDoriChatLines.length > 300) recentDoriChatLines.splice(0, recentDoriChatLines.length - 300);
  const pages = await getChatHistoryPages().catch(() => []);
  const activePages = pages.filter(isActiveNotionItem);
  for (const page of activePages) {
    try {
      await notionFetch(`/blocks/${page.id}/children`, {
        method: "PATCH",
        body: JSON.stringify({ children: contentBlocks(line) }),
      });
      return;
    } catch (error: any) {
      console.warn("[dori][memory] could not append to history page", { page: page.id, title: titleFromNotion(page), error: error?.message || error });
    }
  }
  const parent = await getWritableParentPageId();
  const page = await createPage(parent, `${CHAT_HISTORY_PAGE_TITLE} - ${zonedDateString(new Date(), DEFAULT_TIME_ZONE)} - ${new Date().toISOString().slice(11, 19)}`, "Historial automático de mensajes del grupo de WhatsApp para que Dori pueda resumir conversaciones.");
  await notionFetch(`/blocks/${page.id}/children`, {
    method: "PATCH",
    body: JSON.stringify({ children: contentBlocks(line) }),
  });
}

async function saveChatMessage(payload: any, text: string) {
  if (!text.trim() || isFromMe(payload)) return;
  const sender = getSenderFromPayload(payload);
  const chatId = getChatIdFromPayload(payload);
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${sender} (${chatId}): ${text}`;
  await appendChatHistoryLine(line);
}

async function rememberDoriMessage(payload: any, text: string) {
  if (!text.trim()) return;
  const chatId = getChatIdFromPayload(payload);
  const timestamp = new Date().toISOString();
  const compactText = text.split("\n").map((line) => line.trim()).filter(Boolean).join(" | ");
  const line = `[${timestamp}] Dori (${chatId}): ${compactText}`;
  await appendChatHistoryLine(line);
}

async function readChatHistory(limit = 120) {
  const pages = await getChatHistoryPages();
  const linesNested = await Promise.all(pages.filter(isActiveNotionItem).map((page: any) => readBlocks(page.id, 0, 1).catch(() => [])));
  const lines = [...linesNested.flat(), ...recentDoriChatLines];
  return Array.from(new Set(lines.filter((line) => line.includes(":")))).slice(-limit).join("\n");
}

async function buildDoriMemory(payload: any): Promise<DoriMemory> {
  doriLog("memory", "building memory snapshot");
  const recentHistory = await readChatHistory(80).catch((error) => {
    console.warn("[dori][memory] could not read chat history", error?.message || error);
    return "";
  });
  const lines = recentHistory.split("\n").filter(Boolean);
  const lastDocument = [...lines].reverse().find((line) => /pdf|manual|documento|archivo|adjunto/i.test(line)) || "";
  const lastTasks = [...lines].reverse().filter((line) => /Product Backlog|Creada:|Actualizada:|tarea/i.test(line)).slice(0, 8);
  return {
    sender: firstNameFromPayload(payload),
    chatId: getChatIdFromPayload(payload),
    recentHistory,
    lastDocument,
    lastTasks,
  };
}

function getDatabaseTitleProperty(database: any) {
  const properties = database?.properties || {};
  for (const [name, property] of Object.entries<any>(properties)) {
    if (property?.type === "title") return name;
  }
  return "Name";
}

async function createDatabasePage(database: any, title: string, content: string) {
  const titleProperty = getDatabaseTitleProperty(database);
  const body = asText(content);
  const properties = {
    [titleProperty]: { title: richText(title || body.slice(0, 80) || "Dori") },
    ...(await taskDatabaseProperties(database, body)),
  };
  const existing = await findDatabasePageByTitle(database.id, titleProperty, title).catch(() => null);
  if (existing?.id) {
    await notionFetch(`/pages/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: { ...properties, ...accidentalIdCleanup(existing) } }),
    });
    await notionFetch(`/blocks/${existing.id}/children`, {
      method: "PATCH",
      body: JSON.stringify({ children: contentBlocks(`Actualización Dori\n\n${body}`) }),
    });
    const verified = await notionFetch(`/pages/${existing.id}`).catch(() => null);
    doriLog("task_create", "verified updated task", { title: titleFromNotion(verified || existing), id: existing.id, verified: Boolean(verified) });
    return { ...(verified || existing), url: verified?.url || existing.url || itemUrl(existing), updatedExisting: true, verified: Boolean(verified) };
  }
  const created = await notionFetch("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: database.id },
      properties,
      children: contentBlocks(body),
    }),
  });
  const verified = created?.id ? await notionFetch(`/pages/${created.id}`).catch(() => null) : null;
  doriLog("task_create", "verified created task", { title: titleFromNotion(verified || created), id: created?.id, verified: Boolean(verified) });
  return { ...(verified || created), verified: Boolean(verified) };
}

async function findDatabasePageByTitle(databaseId: string, titleProperty: string, title: string) {
  if (!title.trim()) return null;
  doriLog("duplicate_check", "checking task title", { title });
  const exact = await notionFetch(`/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify({
      page_size: 10,
      filter: { property: titleProperty, title: { equals: title } },
    }),
  }).catch(() => null);
  if (Array.isArray(exact?.results) && exact.results[0]) return exact.results[0];
  const suffix = await notionFetch(`/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify({
      page_size: 10,
      filter: { property: titleProperty, title: { starts_with: title } },
    }),
  }).catch(() => null);
  const suffixResults = Array.isArray(suffix?.results) ? suffix.results : [];
  const suffixed = suffixResults.find((item: any) => {
    const itemTitle = normalizeKey(titleFromNotion(item));
    const target = normalizeKey(title);
    return itemTitle === target || itemTitle.startsWith(`${target} asignar a`) || itemTitle.startsWith(`${target} responsable`) || itemTitle.startsWith(`${target} para `);
  });
  if (suffixed) return suffixed;
  const fuzzy = await findSimilarDatabasePage(databaseId, title);
  if (fuzzy) return fuzzy;
  const data = await notionFetch(`/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify({
      page_size: 100,
    }),
  });
  const target = normalizeKey(title);
  const results = Array.isArray(data.results) ? data.results : [];
  return (
    results.find((item: any) => normalizeKey(titleFromNotion(item)) === target) ||
    results.find((item: any) => {
      const itemTitle = normalizeKey(titleFromNotion(item));
      return itemTitle.startsWith(`${target} asignar a`) || itemTitle.startsWith(`${target} responsable`) || itemTitle.startsWith(`${target} para `);
    }) ||
    null
  );
}

function tokenSet(text: string) {
  return new Set(
    normalizeKey(text)
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 2 && !["para", "con", "del", "los", "las", "una", "uno", "por", "que", "como"].includes(word))
  );
}

function titleSimilarity(a: string, b: string) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter((word) => right.has(word)).length;
  return overlap / Math.max(left.size, right.size);
}

async function queryDatabasePages(databaseId: string, maxPages = 300) {
  const results: any[] = [];
  let cursor = "";
  do {
    const data = await notionFetch(`/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    results.push(...(Array.isArray(data.results) ? data.results : []));
    cursor = data.has_more && results.length < maxPages ? data.next_cursor || "" : "";
  } while (cursor);
  return results.slice(0, maxPages);
}

async function findSimilarDatabasePage(databaseId: string, title: string) {
  const results = await queryDatabasePages(databaseId, 300).catch(() => []);
  const scored = results
    .map((item: any) => ({ item, score: titleSimilarity(title, titleFromNotion(item)) }))
    .filter(({ score }) => score >= 0.78)
    .sort((a, b) => b.score - a.score);
  if (scored[0]) doriLog("duplicate_check", "similar task found", { title, existing: titleFromNotion(scored[0].item), score: scored[0].score });
  return scored[0]?.item || null;
}

async function findExistingTaskPage(title: string) {
  const data = await searchNotionObject(title, "page", 20).catch(() => ({ results: [] }));
  const results = Array.isArray(data.results) ? data.results : [];
  for (const item of results) {
    if (normalizeKey(titleFromNotion(item)) !== normalizeKey(title)) continue;
    const page = await notionFetch(`/pages/${item.id}`).catch(() => null);
    if (page?.parent?.type === "database_id") return page;
  }
  return null;
}

async function updateExistingTaskPage(page: any, content: string) {
  const databaseId = page?.parent?.database_id;
  const database = databaseId ? await notionFetch(`/databases/${databaseId}`).catch(() => null) : null;
  const titleProperty = database ? getDatabaseTitleProperty(database) : getDatabaseTitleProperty(page);
  const title = titleFromNotion(page);
  const properties = database
    ? { [titleProperty]: { title: richText(title) }, ...(await taskDatabaseProperties(database, content)) }
    : { [titleProperty]: { title: richText(title) } };
  await notionFetch(`/pages/${page.id}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
  await notionFetch(`/blocks/${page.id}/children`, {
    method: "PATCH",
    body: JSON.stringify({ children: contentBlocks(`Actualización Dori\n\n${content}`) }),
  });
  return { ...page, url: page.url || itemUrl(page), updatedExisting: true, databaseTitle: database ? titleFromNotion(database) : "Product Backlog" };
}

async function findNotionUserByName(name: string) {
  const target = normalizeKey(name);
  const data = await notionFetch("/users?page_size=100").catch(() => null);
  const users = Array.isArray(data?.results) ? data.results : [];
  return (
    users.find((user: any) => normalizeKey(user?.name || "") === target) ||
    users.find((user: any) => normalizeKey(user?.name || "").includes(target) || target.includes(normalizeKey(user?.name || ""))) ||
    users.find((user: any) => normalizeKey(user?.person?.email || "").includes(target)) ||
    null
  );
}

async function ensureRichTextDatabaseProperty(database: any, propertyName: string) {
  const properties = database?.properties || {};
  const existing = Object.entries<any>(properties).find(([name, property]) => normalizeKey(name) === normalizeKey(propertyName) && property?.type === "rich_text");
  if (existing) return existing[0];
  if (!database?.id) return "";
  await notionFetch(`/databases/${database.id}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: { [propertyName]: { rich_text: {} } } }),
  });
  return propertyName;
}

async function taskDatabaseProperties(database: any, content: string) {
  const schema = database?.properties || {};
  const props: Record<string, any> = {};
  const normalized = normalizeKey(content);
  const explicitPriority = content.match(/Prioridad:\s*([^\n]+)/i)?.[1]?.trim() || "";
  const priority = explicitPriority || (/prioridad alta|priori|urgente|bloquea|p0|alta/.test(normalized) ? "Alta" : /p1|media|normal/.test(normalized) ? "Normal" : /baja|p2|p3/.test(normalized) ? "Baja" : "Normal");
  const responsible = content.match(/Responsable:\s*([^\n]+)/i)?.[1]?.trim() || content.match(/responsable\s+([a-záéíóúñ\s]+?)(?:\s+prioridad|\s+sprint|\s+dej|$)/i)?.[1]?.trim() || "";
  const description = content.match(/Descripción:\s*([^\n]+)/i)?.[1]?.trim() || content.match(/Solicitud:\s*([^\n]+)/i)?.[1]?.trim() || content.trim();
  const source = content.match(/(?:Fuente|Origen):\s*([^\n]+)/i)?.[1]?.trim() || "";
  const area = content.match(/Área:\s*([^\n]+)/i)?.[1]?.trim() || content.match(/Area:\s*([^\n]+)/i)?.[1]?.trim() || "";
  const observations = content.match(/Observaciones:\s*([^\n]+)/i)?.[1]?.trim() || "";
  const sprintTarget = content.match(/sprint\s+\d+\s*(?:al|a|hasta|->|-)\s*(\d+)/i)?.[1] || content.match(/sprint\s+(\d+)/i)?.[1];
  const setByName = async (wanted: string[], valueForType: (property: any) => any | Promise<any>) => {
    const entry = Object.entries<any>(schema).find(([name]) => {
      const propertyName = normalizeKey(name);
      return wanted.some((target) => {
        const wantedName = normalizeKey(target);
        return propertyName === wantedName || (propertyName.length > 3 && propertyName.includes(wantedName));
      });
    });
    if (!entry) return;
    const [name, property] = entry;
    const value = await valueForType(property);
    if (value) props[name] = value;
  };
  await setByName(["Prioridad", "Priority"], (property) => {
    if (property.type === "select") return { select: { name: priority } };
    if (property.type === "status") return { status: { name: priority } };
    if (property.type === "rich_text") return { rich_text: richText(priority) };
    return null;
  });
  await setByName(["Descripción", "Descripcion", "Description", "Detalle", "Details"], (property) => {
    if (property.type === "rich_text") return { rich_text: richText(description) };
    if (property.type === "url") return null;
    return null;
  });
  if (responsible && !/sin asignar/i.test(responsible)) {
    await setByName(["Responsable", "Responsables", "Owner", "Assignee", "Asignado", "Asignado a"], async (property) => {
      if (property.type === "rich_text") return { rich_text: richText(responsible) };
      if (property.type === "select") return { select: { name: responsible } };
      if (property.type === "multi_select") return { multi_select: [{ name: responsible }] };
      if (property.type === "people") {
        const user = await findNotionUserByName(responsible);
        return user?.id ? { people: [{ id: user.id }] } : null;
      }
      return null;
    });
    if (!Object.keys(props).some((name) => /responsable|owner|assignee|asignado/i.test(name))) {
      const fallbackName = await ensureRichTextDatabaseProperty(database, "Responsable Dori").catch(() => "");
      if (fallbackName) props[fallbackName] = { rich_text: richText(responsible) };
    }
  }
  await setByName(["Estado", "Status"], (property) => {
    if (property.type === "status") {
      const option = (property.status?.options || []).find((item: any) => /pendiente|to do|todo|backlog/i.test(item?.name || ""));
      return option?.name ? { status: { name: option.name } } : null;
    }
    if (property.type === "select") return { select: { name: "Pendientes" } };
    if (property.type === "rich_text") return { rich_text: richText("Pendientes") };
    return null;
  });
  if (sprintTarget) {
    await setByName(["Sprint"], (property) => {
      const sprint = `Sprint ${sprintTarget}`;
      if (property.type === "select") return { select: { name: sprint } };
      if (property.type === "multi_select") return { multi_select: [{ name: sprint }] };
      if (property.type === "number") return { number: Number(sprintTarget) };
      if (property.type === "rich_text") return { rich_text: richText(sprint) };
      return null;
    });
  }
  const setTextOrFallback = async (wanted: string[], fallback: string, value: string) => {
    if (!value.trim()) return;
    const before = new Set(Object.keys(props));
    await setByName(wanted, (property) => {
      if (property.type === "rich_text") return { rich_text: richText(value) };
      if (property.type === "select") return { select: { name: value } };
      if (property.type === "multi_select") return { multi_select: [{ name: value }] };
      if (property.type === "url" && /^https?:\/\//.test(value)) return { url: value };
      return null;
    });
    if (Object.keys(props).every((key) => before.has(key))) {
      const fallbackName = await ensureRichTextDatabaseProperty(database, fallback).catch(() => "");
      if (fallbackName) props[fallbackName] = { rich_text: richText(value) };
    }
  };
  await setTextOrFallback(["Fuente", "Origen", "Documento", "Source"], "Fuente Dori", source);
  await setTextOrFallback(["Área", "Area", "Proyecto", "Modulo", "Módulo"], "Área Dori", area);
  await setTextOrFallback(["Observaciones", "Notas", "Notes", "Faltante", "Faltantes"], "Observaciones Dori", observations);
  return props;
}

async function answerBacklogList() {
  const target = (await findProductBacklogTarget().catch(() => null)) || (await findBacklogTarget().catch(() => null));
  if (!target?.id || target.object !== "database") return "No encontré la base Product Backlog como base de datos accesible para listar tareas.";
  const rows = await queryDatabase(target.id);
  if (!rows.length) return "Product Backlog está vacío o no pude leer sus filas.";
  return cleanWhatsAppText(`Estas son las tareas visibles en Product Backlog:\n${rows.slice(0, 12).join("\n")}\n\nFuente: ${titleFromNotion(target) || "Product Backlog"}`);
}

function rowProp(row: any, patterns: RegExp[]) {
  const entries = Object.entries<any>(row?.properties || {});
  const matches = entries.filter(([name]) => patterns.some((pattern) => pattern.test(normalizeKey(name))));
  for (const [, property] of matches) {
    const value = propertyPlainText(property).trim();
    if (value) return value;
  }
  return "";
}

function backlogRowSummary(row: any) {
  return {
    title: titleFromNotion(row),
    status: rowProp(row, [/^estado$/, /^status$/]),
    responsible: rowProp(row, [/responsable/, /owner/, /assignee/, /asignado/]),
    priority: rowProp(row, [/prioridad/, /priority/]),
    description: rowProp(row, [/descripcion/, /description/, /detalle/]),
    date: rowProp(row, [/fecha/, /date/, /due/, /venc/]),
    source: rowProp(row, [/fuente/, /origen/, /documento/]),
    url: itemUrl(row),
  };
}

async function readBacklogRows(maxPages = 300) {
  const target = await findProductBacklogTarget().catch(() => null);
  if (!target?.id || target.object !== "database") return { target: null, rows: [] as any[] };
  const pages = await queryDatabasePages(target.id, maxPages);
  return { target, rows: pages.map(backlogRowSummary) };
}

async function answerNextSteps(openai: OpenAI, memory: DoriMemory) {
  const { target, rows } = await readBacklogRows(300);
  if (!target) return "Puedo recomendar próximos pasos, pero no encontré Product Backlog accesible en Notion.";
  const planContext = await answerQuestion(openai, "resume prioridades y plan de negocio actual", "Plan de Negocio").catch(() => "");
  const pending = rows.filter((row) => !/done|complet|descart/i.test(row.status)).slice(0, 80);
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 900,
    messages: [
      { role: "system", content: "Actúa como Project Manager/Product Owner de D'Origen. Recomienda foco de hoy con criterio, usando solo backlog, historial y plan entregados. Sé concreto, humano, sin asteriscos, y separa prioridades, foco por persona, bloqueos/faltantes y próximos pasos." },
      { role: "user", content: `Backlog pendiente:\n${JSON.stringify(pending.slice(0, 60))}\n\nHistorial reciente:\n${memory.recentHistory.slice(-8000)}\n\nPlan/contexto:\n${planContext.slice(0, 5000)}` },
    ],
  });
  return standardActionResponse({ sender: memory.sender, intent: "definir qué sigue y en qué enfocarse", did: ["Revisé Product Backlog", "Revisé historial reciente", "Consulté Plan de Negocio"], result: [completion.choices[0]?.message?.content?.trim() || "No pude generar recomendación"], source: [titleFromNotion(target) || "Product Backlog", "Historial WhatsApp Dori", "Plan de Negocio"] });
}

async function answerTeamFollowup(text: string, memory: DoriMemory) {
  const { target, rows } = await readBacklogRows(300);
  if (!target) return "Puedo revisar seguimiento del equipo, pero no encontré Product Backlog accesible en Notion.";
  const normalized = normalizeKey(text);
  const person = personFromText(text);
  let filtered = rows.filter((row) => !/done|complet|descart/i.test(row.status));
  if (person && !/todos|equipo/i.test(person)) filtered = filtered.filter((row) => normalizeKey(`${row.responsible} ${row.title} ${row.description}`).includes(normalizeKey(person)));
  if (/sin responsable/.test(normalized)) filtered = filtered.filter((row) => !row.responsible || /sin asignar/i.test(row.responsible));
  if (/bloquead/.test(normalized)) filtered = filtered.filter((row) => /bloque|block/i.test(`${row.status} ${row.description}`));
  if (/vencid|sin fecha/.test(normalized)) filtered = filtered.filter((row) => /vencid/.test(normalized) ? row.date && new Date(row.date) < new Date() : !row.date);
  const label = person && !/todos|equipo/i.test(person) ? `pendientes de ${person}` : /sin responsable/.test(normalized) ? "tareas sin responsable" : /bloquead/.test(normalized) ? "bloqueos" : /vencid|sin fecha/.test(normalized) ? "tareas vencidas o sin fecha" : "seguimiento del equipo";
  return standardActionResponse({ sender: memory.sender, intent: `revisar ${label}`, did: ["Leí Product Backlog", "Filtré tareas abiertas según la solicitud"], result: filtered.length ? filtered.slice(0, 15).map((row) => `${row.title} | Estado: ${row.status || "sin estado"} | Responsable: ${row.responsible || "sin responsable"} | Prioridad: ${row.priority || "sin prioridad"}`) : [`No encontré ${label} con los filtros actuales`], source: [titleFromNotion(target) || "Product Backlog"] });
}

async function answerTaskResponsibilities() {
  const { target, rows } = await readBacklogRows(300);
  if (!target) return "No pude revisar responsables porque no encontré Product Backlog accesible en Notion.";
  const openRows = rows.filter((row) => !/done|complet|descart/i.test(row.status));
  const resolved = openRows.map((row) => ({
    ...row,
    responsible: row.responsible || assigneeFromText(`${row.title} ${row.description}`),
  }));
  const assigned = resolved.filter((row) => row.responsible && !/sin asignar|sin responsable/i.test(row.responsible));
  const missing = resolved.filter((row) => !row.responsible || /sin asignar|sin responsable/i.test(row.responsible));

  const lines = [
    `No todas las tareas tienen responsable.`,
    `Con responsable: ${assigned.length}`,
    `Sin responsable: ${missing.length}`,
    "",
    assigned.length ? "Tareas con responsable:" : "Tareas con responsable: ninguna en las filas revisadas",
    ...assigned.slice(0, 15).map((row) => `- ${row.title} | Responsable: ${row.responsible} | Estado: ${row.status || "sin estado"}`),
    "",
    missing.length ? "Tareas sin responsable:" : "Tareas sin responsable: ninguna",
    ...missing.slice(0, 15).map((row) => `- ${row.title} | Estado: ${row.status || "sin estado"}`),
    "",
    `Fuente: ${titleFromNotion(target) || "Product Backlog"}`,
  ];

  return cleanWhatsAppText(lines.join("\n"));
}

function answerLastPdfFromMemory(memory: DoriMemory) {
  const docs = memory.recentHistory
    .split("\n")
    .filter((line) => /^(?:\[[^\]]+\]\s*)?PDF guardado\s*\(/i.test(line))
    .slice(-5);

  if (!docs.length) {
    return "No tengo un PDF reciente registrado en el historial. Reenvía el PDF al chat y lo archivo automáticamente en Notion.";
  }

  return cleanWhatsAppText([
    "Sí. Tengo estos PDFs recientes registrados:",
    ...docs.map((line) => `- ${line.replace(/^\[[^\]]+\]\s*/, "")}`),
    "",
    "Si quieres que trabaje sobre uno, dime por ejemplo: Dori usa el último PDF para crear tareas, o Dori guarda el último PDF en Investigación de mercado.",
  ].join("\n"));
}

async function answerPdfRepository() {
  const repository = await getDocumentRepositoryPage();
  const children = await readBlockChildren(repository.id);
  const pages = children.filter((block: any) => block.type === "child_page" && block.id);

  if (!pages.length) {
    return `No encontré PDFs guardados dentro de Repositorio de Documentos Dori.\n\nFuente: ${titleFromNotion(repository) || "Repositorio de Documentos Dori"}\n${repository.url || itemUrl(repository)}`;
  }

  const savedRows = [];
  const failedRows = [];
  for (const page of pages.slice(-20).reverse()) {
    const title = page.child_page?.title || "Documento sin título";
    const lines = (await readBlocks(page.id, 0, 1).catch(() => [])).join("\n");
    const file = lines.match(/Archivo:\s*(.+)/i)?.[1]?.trim() || title;
    const status = lines.match(/Estado:\s*(.+)/i)?.[1]?.trim() || "sin estado";
    const stored = lines.match(/Archivo guardado:\s*(https?:\/\/\S+)/i)?.[1]?.trim() || "";
    const row = `- ${file}\n  Estado: ${status}\n  Notion: ${notionUrl(page.id)}${stored ? `\n  Archivo: ${stored}` : ""}`;
    if (/archivo PDF guardado/i.test(status) && stored) savedRows.push(row);
    else failedRows.push(row);
  }

  return cleanWhatsAppText([
    `PDFs guardados reales en Repositorio de Documentos Dori: ${savedRows.length}`,
    ...(savedRows.length ? savedRows : ["- No encontré PDFs con archivo real guardado."]),
    failedRows.length ? `\nIntentos registrados sin archivo real: ${failedRows.length}` : "",
    ...failedRows.slice(0, 8),
    "",
    `Fuente: ${titleFromNotion(repository) || "Repositorio de Documentos Dori"}`,
    repository.url || itemUrl(repository),
  ].join("\n"));
}

async function answerPersonChatQuestion(openai: OpenAI, text: string, memory: DoriMemory) {
  const person = personFromText(text);
  const lines = memory.recentHistory
    .split("\n")
    .filter((line) => person && normalizeKey(line).includes(normalizeKey(person)))
    .slice(-30);

  if (!person || !lines.length) {
    return `No encontré mensajes recientes de ${person || "esa persona"} en el historial que tengo disponible.

¿Quieres que revise el chat completo, una fecha específica o una reunión?`;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 450,
    messages: [
      { role: "system", content: "Responde como Dori usando solo las líneas de historial entregadas. Si preguntan qué dijo o preguntó una persona, resume literal y brevemente. No inventes. Si no hay pregunta explícita, di qué comentó. Español natural, sin asteriscos." },
      { role: "user", content: `Solicitud: ${text}\nPersona: ${person}\nHistorial reciente de esa persona:\n${lines.join("\n")}` },
    ],
  });

  return cleanWhatsAppText(`${completion.choices[0]?.message?.content?.trim() || `Esto encontré de ${person}:\n${lines.slice(-5).join("\n")}`}\n\nFuente: Historial WhatsApp Dori`);
}

async function answerBacklogQuality(memory: DoriMemory) {
  const { target, rows } = await readBacklogRows(300);
  if (!target) return "Puedo revisar calidad del backlog, pero no encontré Product Backlog accesible en Notion.";
  const issues: string[] = [];
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (row.title.length > 95) issues.push(`Título muy largo: ${row.title}`);
    if (!row.responsible || /sin asignar/i.test(row.responsible)) issues.push(`Sin responsable: ${row.title}`);
    if (!row.priority) issues.push(`Sin prioridad: ${row.title}`);
    if (!row.description || row.description.length < 12) issues.push(`Sin descripción suficiente: ${row.title}`);
    if (/ y |\/|,/.test(row.title) && row.title.length > 55) issues.push(`Parece épica o tarea compuesta, revisar división: ${row.title}`);
    const key = [...tokenSet(row.title)].sort().join(" ");
    const previous = seen.get(key);
    if (previous && titleSimilarity(previous, row.title) > 0.85) issues.push(`Posible duplicado: ${previous} / ${row.title}`);
    else seen.set(key, row.title);
  }
  return standardActionResponse({ sender: memory.sender, intent: "revisar calidad del Product Backlog", did: ["Leí tareas del backlog", "Busqué duplicados, faltantes y tareas demasiado grandes"], result: issues.length ? issues.slice(0, 25) : ["No encontré problemas críticos de calidad en las tareas revisadas"], source: [titleFromNotion(target) || "Product Backlog"] });
}

async function createMeetingMinutes(openai: OpenAI, memory: DoriMemory, text: string) {
  const history = memory.recentHistory || (await readChatHistory(120));
  if (!history.trim()) return "Puedo hacer el acta, pero necesito historial o notas de la reunión para resumir.";
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 1000,
    messages: [
      { role: "system", content: "Genera un acta profesional para D'Origen usando solo el historial. Incluye temas tratados, decisiones, tareas, responsables, pendientes y próximos pasos. No inventes. Sin asteriscos." },
      { role: "user", content: `Solicitud: ${text}\n\nHistorial:\n${history.slice(-14000)}` },
    ],
  });
  const minutes = cleanWhatsAppText(completion.choices[0]?.message?.content || "No pude generar acta.");
  const page = await createPage(process.env.DORI_NOTION_PARENT_PAGE_ID || DEFAULT_PARENT_PAGE_ID, `Acta reunión Dori - ${new Date().toISOString().slice(0, 10)}`, minutes);
  return standardActionResponse({ sender: memory.sender, intent: "generar y guardar acta de reunión", did: ["Revisé historial reciente del grupo", "Generé acta con temas, decisiones, tareas y próximos pasos", "Guardé el acta en Notion"], result: [minutes.slice(0, 1200)], source: [page.url || itemUrl(page), "Historial WhatsApp Dori"] });
}

async function updateTaskStatus(title: string, status: string) {
  if (!title.trim()) return { message: "Necesito el nombre de la tarea para cambiarle el estado. Ejemplo: Dori cambia la tarea Slogan a En progreso." };
  const target = await findProductBacklogTarget().catch(() => null);
  if (!target?.id || target.object !== "database") return { message: "No encontré la base Product Backlog como base de datos accesible para cambiar estados." };
  const statusProperty = findStatusProperty(target);
  if (!statusProperty) return { message: "No encontré la propiedad Estado en Product Backlog." };
  const task = await findTaskInDatabase(target.id, title);
  if (!task) return { message: `No encontré una tarea que coincida con: ${title}` };
  const statusValue = statusPropertyValue(statusProperty.property, status);
  if (!statusValue) return { message: `No pude usar el estado ${status}. Revisa que exista como opción en Notion.` };
  await notionFetch(`/pages/${task.id}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: { [statusProperty.name]: statusValue } }),
  });
  return { message: `Estado actualizado en Product Backlog.\nTarea: ${titleFromNotion(task)}\nNuevo estado: ${status}\n${task.url || itemUrl(task)}` };
}

function findStatusProperty(database: any) {
  const entries = Object.entries<any>(database?.properties || {});
  const entry = entries.find(([name]) => /^(estado|status)$/i.test(normalizeKey(name))) || entries.find(([name]) => /estado|status/i.test(normalizeKey(name)));
  return entry ? { name: entry[0], property: entry[1] } : null;
}

function statusPropertyValue(property: any, status: string) {
  const normalizedStatus = normalizeKey(status);
  const option = (property?.[property.type]?.options || []).find((item: any) => normalizeKey(item?.name || "") === normalizedStatus) || (property?.[property.type]?.options || []).find((item: any) => normalizeKey(item?.name || "").includes(normalizedStatus) || normalizedStatus.includes(normalizeKey(item?.name || "")));
  const name = option?.name || status;
  if (property.type === "status") return { status: { name } };
  if (property.type === "select") return { select: { name } };
  if (property.type === "rich_text") return { rich_text: richText(name) };
  return null;
}

function propertyPlainText(prop: any) {
  if (!prop) return "";
  if (prop.type === "string") return prop.string || "";
  if (prop.type === "boolean") return prop.boolean ? "Sí" : "";
  if (prop.type === "title") return plainFromRich(prop.title);
  if (prop.type === "rich_text") return plainFromRich(prop.rich_text);
  if (prop.type === "select") return prop.select?.name || "";
  if (prop.type === "multi_select") return (prop.multi_select || []).map((item: any) => item?.name).filter(Boolean).join(", ");
  if (prop.type === "status") return prop.status?.name || "";
  if (prop.type === "people") return (prop.people || []).map((person: any) => person?.name || person?.person?.email || person?.id).filter(Boolean).join(", ");
  if (prop.type === "number") return String(prop.number ?? "");
  if (prop.type === "checkbox") return prop.checkbox ? "Sí" : "";
  if (prop.type === "date") return prop.date?.start || "";
  if (prop.type === "url") return prop.url || "";
  if (prop.type === "email") return prop.email || "";
  if (prop.type === "phone_number") return prop.phone_number || "";
  if (prop.type === "formula") return propertyPlainText({ type: prop.formula?.type, [prop.formula?.type]: prop.formula?.[prop.formula?.type] });
  if (prop.type === "rollup") {
    const rollup = prop.rollup || {};
    if (Array.isArray(rollup.array)) return rollup.array.map(propertyPlainText).filter(Boolean).join(", ");
    if (rollup.type) return propertyPlainText({ type: rollup.type, [rollup.type]: rollup[rollup.type] });
  }
  if (prop.type === "relation") return (prop.relation || []).map((item: any) => item?.id).filter(Boolean).join(", ");
  return "";
}

function accidentalIdCleanup(page: any) {
  const entry = Object.entries<any>(page?.properties || {}).find(([name, prop]) => normalizeKey(name) === "id" && normalizeKey(propertyPlainText(prop)) === "alta");
  if (!entry) return {};
  const [name, prop] = entry;
  if (prop.type === "rich_text") return { [name]: { rich_text: [] } };
  if (prop.type === "select") return { [name]: { select: null } };
  if (prop.type === "number") return { [name]: { number: null } };
  return {};
}

async function findTaskInDatabase(databaseId: string, title: string) {
  doriLog("duplicate_check", "finding task for update", { title });
  const results = await queryDatabasePages(databaseId, 300).catch(() => []);
  const target = normalizeKey(title);
  return (
    results.find((item: any) => normalizeKey(titleFromNotion(item)) === target) ||
    results.find((item: any) => {
      const itemTitle = normalizeKey(titleFromNotion(item));
      return target.length > 3 && (itemTitle.includes(target) || target.includes(itemTitle));
    }) ||
    (await findSimilarDatabasePage(databaseId, title)) ||
    null
  );
}

async function downloadAttachmentBuffer(attachment: DocumentAttachment) {
  if (attachment.base64) {
    const base64 = attachment.base64.includes(",") ? attachment.base64.split(",").pop() || "" : attachment.base64;
    return Buffer.from(base64, "base64");
  }
  const evolutionBase64 = await getEvolutionMediaBase64(attachment).catch((error) => {
    console.warn("[dori][document] Evolution media fetch failed", error?.message || error);
    return "";
  });
  if (evolutionBase64) {
    const base64 = evolutionBase64.includes(",") ? evolutionBase64.split(",").pop() || "" : evolutionBase64;
    return Buffer.from(base64, "base64");
  }
  if (!attachment.url) throw new Error("archivo no recibido");
  const headers: Record<string, string> = {};
  const evolutionKey = process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_TOKEN || process.env.BOTZ_EVOLUTION_API_KEY || "";
  if (evolutionKey) headers.apikey = evolutionKey;
  const directPathUrl = attachment.rawDocument?.directPath ? `https://mmg.whatsapp.net${attachment.rawDocument.directPath}` : "";
  const urls = Array.from(new Set([attachment.url, directPathUrl].filter(Boolean)));
  let response: Response | null = null;
  let lastError: any = null;
  for (const downloadUrl of urls) {
    try {
      response = await fetch(downloadUrl, { headers: { ...headers, "User-Agent": "WhatsApp/2.24.0" } });
      if (response.ok) break;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error: any) {
      lastError = error;
      doriLog("document", "WhatsApp media URL fetch failed", { name: error?.name || "", message: error?.message || String(error), code: error?.code || error?.cause?.code || "", cause: error?.cause?.message || "", host: (() => { try { return new URL(downloadUrl).host; } catch { return ""; } })() });
    }
  }
  if (!response) throw lastError || new Error("fetch failed");
  if (!response.ok) throw new Error(`no se pudo descargar archivo: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (isPdfBuffer(buffer) || !attachment.mediaKey) return buffer;
  const decrypted = decryptWhatsAppMedia(buffer, attachment.mediaKey, attachment.mimeType || "application/pdf");
  return decrypted || buffer;
}

async function getEvolutionMediaBase64(attachment: DocumentAttachment) {
  const apiUrl = (process.env.EVOLUTION_API_URL || process.env.EVOLUTION_BASE_URL || "http://95.111.236.226:8080").replace(/\/$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_TOKEN || process.env.BOTZ_EVOLUTION_API_KEY || "";
  const messageId = attachment.messageKey?.id || attachment.messageKey?.messageId || "";
  if (!apiUrl || !apiKey || !messageId) {
    doriLog("document", "Evolution media fetch skipped", { hasApiUrl: Boolean(apiUrl), hasApiKey: Boolean(apiKey), messageId: Boolean(messageId), instance: attachment.instance });
    return "";
  }
  const endpoint = `${apiUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(attachment.instance || "Dori")}`;
  const storedMessage = await findEvolutionStoredMessage(apiUrl, apiKey, attachment).catch((error) => {
    doriLog("document", "Evolution stored message lookup failed", { messageId, error: error?.message || String(error) });
    return null;
  });
  const attempts = [
    ...(storedMessage ? [{ label: "stored-record", body: { message: storedMessage, convertToMp4: false } }] : []),
    { label: "full-message", body: { message: { key: attachment.messageKey, message: attachment.rawMessage }, convertToMp4: false } },
    { label: "document-message", body: { message: { key: attachment.messageKey, message: { documentMessage: attachment.rawDocument } }, convertToMp4: false } },
    { label: "key-only", body: { message: { key: attachment.messageKey }, convertToMp4: false } },
  ];
  let lastError = "";
  for (const attempt of attempts) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(attempt.body),
    });
    const data = await response.json().catch(() => ({}));
    const base64 = pickFirstString(data?.base64, data?.data?.base64, data?.media, data?.data?.media, data?.file, data?.data?.file);
    doriLog("document", "Evolution media fetch attempt", { attempt: attempt.label, ok: Boolean(base64), status: response.status, instance: attachment.instance, messageId, mimeType: data?.mimetype || data?.data?.mimetype || "" });
    if (response.ok && base64) return base64;
    lastError = `${response.status} ${asText(data?.message || data?.error || "")}`.trim();
  }
  throw new Error(`Evolution getBase64 failed: ${lastError || "sin base64"}`);
}

async function findEvolutionStoredMessage(apiUrl: string, apiKey: string, attachment: DocumentAttachment) {
  const messageId = attachment.messageKey?.id || attachment.messageKey?.messageId || "";
  if (!messageId) return null;
  const response = await fetch(`${apiUrl}/chat/findMessages/${encodeURIComponent(attachment.instance || "Dori")}`, {
    method: "POST",
    headers: { apikey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ where: { key: { id: messageId } }, limit: 1 }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`findMessages failed: ${response.status} ${asText(data?.message || data?.error || "")}`);
  const record = data?.messages?.records?.[0] || data?.records?.[0] || null;
  doriLog("document", "Evolution stored message lookup", { found: Boolean(record), messageId, messageTypes: Object.keys(record?.message || {}) });
  return record;
}

function bufferHeader(buffer: Buffer) {
  return buffer.subarray(0, 16).toString("hex");
}

function isPdfBuffer(buffer: Buffer) {
  return buffer.subarray(0, 5).toString("utf8") === "%PDF-";
}

function whatsappMediaInfo(mimeType: string) {
  if (/image/i.test(mimeType)) return "WhatsApp Image Keys";
  if (/video/i.test(mimeType)) return "WhatsApp Video Keys";
  if (/audio/i.test(mimeType)) return "WhatsApp Audio Keys";
  return "WhatsApp Document Keys";
}

function decryptWhatsAppMedia(encrypted: Buffer, mediaKey: string, mimeType: string) {
  try {
    const mediaKeyBuffer = Buffer.from(mediaKey, "base64");
    const expanded = Buffer.from(hkdfSync("sha256", mediaKeyBuffer, Buffer.alloc(32), whatsappMediaInfo(mimeType), 112));
    const iv = expanded.subarray(0, 16);
    const cipherKey = expanded.subarray(16, 48);
    const ciphertext = encrypted.length > 10 ? encrypted.subarray(0, -10) : encrypted;
    const decipher = createDecipheriv("aes-256-cbc", cipherKey, iv);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    doriLog("document", "decrypted WhatsApp media", { mimeType, encryptedBytes: encrypted.length, decryptedBytes: decrypted.length, pdf: isPdfBuffer(decrypted) });
    return decrypted;
  } catch (error: any) {
    console.warn("[dori][document] could not decrypt WhatsApp media", error?.message || error);
    return null;
  }
}

async function extractPdfText(buffer: Buffer) {
  let mod: any;
  try {
    mod = await import("pdf-parse/node");
  } catch {
    mod = await import("pdf-parse");
  }
  const PDFParse = mod?.PDFParse || mod?.default?.PDFParse || mod?.NodePDFParse || mod?.default?.NodePDFParse;
  if (PDFParse) {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy?.();
    return asText(parsed?.text || parsed).trim();
  }
  throw new Error("pdf-parse no expuso un parser compatible en runtime");
}

async function extractDocumentText(attachment: DocumentAttachment) {
  const buffer = await downloadAttachmentBuffer(attachment);
  const nameAndType = `${attachment.fileName} ${attachment.mimeType}`.toLowerCase();
  doriLog("document", "downloaded attachment", { fileName: attachment.fileName, mimeType: attachment.mimeType, bytes: buffer.length, header: buffer.subarray(0, 12).toString("utf8"), isPdf: isPdfBuffer(buffer), hasMediaKey: Boolean(attachment.mediaKey) });
  if (/pdf|application\/pdf/.test(nameAndType)) {
    if (!isPdfBuffer(buffer)) {
      throw new Error(`el archivo descargado no llegó como PDF legible. header=${bufferHeader(buffer)}, bytes=${buffer.length}, mediaKey=${attachment.mediaKey ? "sí" : "no"}, base64=${attachment.base64 ? "sí" : "no"}`);
    }
    return extractPdfText(buffer);
  }
  if (/text|markdown|csv|json/.test(nameAndType)) return buffer.toString("utf8").trim();
  throw new Error("no se pudo leer PDF");
}

async function extractBacklogTasksFromDocument(openai: OpenAI, documentText: string, instruction: string, memory?: DoriMemory): Promise<ExtractedDocumentTask[]> {
  doriLog("document", "extracting backlog tasks from document", { instruction: instruction.slice(0, 300), lastDocument: memory?.lastDocument || "" });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Extrae actividades accionables para Product Backlog desde un documento como Product Owner senior. Responde SOLO JSON con tasks: array de objetos {title, description, responsible, priority, area, observations}. No inventes responsables. Si no hay responsable, responsible vacío y observations debe decir qué falta. priority debe ser Alta, Normal o Baja según urgencia/impacto. area debe ser una parte del proyecto si aparece; si no, Plan de Negocio. Títulos cortos, claros y accionables en español. Evita tareas duplicadas o demasiado parecidas al contexto reciente.",
      },
      { role: "user", content: `Instrucción del usuario: ${instruction}\n\nContexto reciente:\n${memory?.recentHistory?.slice(-6000) || "Sin historial"}\n\nÚltimas tareas conocidas:\n${(memory?.lastTasks || []).join("\n") || "Ninguna"}\n\nDocumento:\n${documentText.slice(0, 24000)}` },
    ],
  });
  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw.replace(/```json/g, "").replace(/```/g, "").trim());
  const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  return tasks
    .map((task: any) => ({
      title: asText(task.title).replace(/^[-\d.)\s]+/, "").trim(),
      description: asText(task.description || task.detail || task.title).trim(),
      responsible: asText(task.responsible || task.owner || task.assignee).trim(),
      priority: asText(task.priority || "Normal").trim() || "Normal",
      area: asText(task.area || "Plan de Negocio").trim() || "Plan de Negocio",
      observations: asText(task.observations || task.notes).trim(),
    }))
    .filter((task: any) => task.title.length > 2)
    .slice(0, 60);
}

async function analyzeDocumentForPM(openai: OpenAI, documentText: string, instruction: string) {
  doriLog("document", "analyzing document as PM");
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Analiza un documento del proyecto D'Origen como Project Manager/Product Owner. Responde SOLO JSON con summary, importantSections, risks, decisions, openQuestions. No inventes." },
      { role: "user", content: `Instrucción: ${instruction}\n\nDocumento:\n${documentText.slice(0, 24000)}` },
    ],
  });
  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw.replace(/```json/g, "").replace(/```/g, "").trim());
  return {
    summary: asText(parsed.summary).trim(),
    importantSections: Array.isArray(parsed.importantSections) ? parsed.importantSections.map(asText).filter(Boolean).slice(0, 8) : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks.map(asText).filter(Boolean).slice(0, 8) : [],
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions.map(asText).filter(Boolean).slice(0, 8) : [],
    openQuestions: Array.isArray(parsed.openQuestions) ? parsed.openQuestions.map(asText).filter(Boolean).slice(0, 8) : [],
  };
}

function firstNameFromPayload(payload: any) {
  return getSenderFromPayload(payload).split(/\s+/)[0] || "";
}

function cleanDocumentTitle(fileName: string) {
  return asText(fileName || "Manual D'Origen")
    .replace(/\.pdf$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function documentAnalysisBlocks(attachment: DocumentAttachment, instruction: string, analysis: Awaited<ReturnType<typeof analyzeDocumentForPM>>, documentText: string) {
  const blocks: any[] = [
    headingBlock("Resumen PM"),
    paragraphBlock(analysis.summary || "Sin resumen disponible"),
    headingBlock("Origen"),
    bulletBlock(`Archivo: ${attachment.fileName || "documento WhatsApp"}`),
    bulletBlock(`Instrucción: ${stripDoriCommand(instruction) || "Guardar en Plan de Negocio y extraer actividades"}`),
    bulletBlock(attachment.url ? `Archivo original: ${attachment.url}` : "Archivo original recibido desde WhatsApp"),
  ];
  if (analysis.importantSections.length) blocks.push(headingBlock("Secciones Importantes"), ...analysis.importantSections.map(bulletBlock));
  if (analysis.risks.length) blocks.push(headingBlock("Riesgos"), ...analysis.risks.map(bulletBlock));
  if (analysis.decisions.length) blocks.push(headingBlock("Decisiones Detectadas"), ...analysis.decisions.map(bulletBlock));
  if (analysis.openQuestions.length) blocks.push(headingBlock("Preguntas Abiertas"), ...analysis.openQuestions.map(bulletBlock));
  blocks.push(headingBlock("Texto Completo Del Manual"), ...paragraphBlocksFromText(documentText));
  return blocks;
}

async function saveDocumentToBusinessPlan(attachment: DocumentAttachment, instruction: string, analysis: Awaited<ReturnType<typeof analyzeDocumentForPM>>, documentText: string) {
  const title = cleanDocumentTitle(attachment.fileName || "Manual D'Origen");
  const existing = await findExactTitle(title).catch(() => null);
  if (existing?.id && existing.object === "page") {
    doriLog("notion_search", "document already saved in Plan de Negocio", { title, id: existing.id });
    return { where: title, url: existing.url || itemUrl(existing), alreadyExists: true };
  }
  const plan = await findBest("Plan de Negocio").catch(() => null);
  const parentId = plan?.object === "page" && plan.id ? plan.id : process.env.DORI_NOTION_PARENT_PAGE_ID || DEFAULT_PARENT_PAGE_ID;
  const page = await createPageWithBlocks(parentId, title, documentAnalysisBlocks(attachment, instruction, analysis, documentText));
  return { where: title, url: page.url || itemUrl(page), alreadyExists: false };
}

async function processDocumentToBacklog(openai: OpenAI, payload: any, text: string, memory?: DoriMemory) {
  const logPrefix = "[dori][process_document_to_backlog]";
  doriLog("intent", "process_document_to_backlog selected");
  const sender = memory?.sender || firstNameFromPayload(payload);
  const attachment = getDocumentAttachment(payload);
  const intro = sender ? `Listo ${sender}.` : "Listo.";
  if (!attachment?.url && !attachment?.base64) {
    console.warn(logPrefix, "archivo no recibido", { fileName: attachment?.fileName || "", mimeType: attachment?.mimeType || "" });
    return `${intro} Entendí que quieres guardar o procesar un documento, pero no puedo acceder al archivo desde este mensaje.

¿Te refieres al último PDF enviado en el chat${memory?.lastDocument ? ` (${memory.lastDocument.slice(0, 120)})` : ""}?

Para hacerlo bien, reenvía el PDF como documento y escribe en el mismo mensaje: "Dori guarda este PDF en Notion" o "Dori extrae actividades de este PDF al backlog".`;
  }

  let documentText = "";
  try {
    doriLog("document", "reading attachment", { fileName: attachment.fileName, mimeType: attachment.mimeType, hasUrl: Boolean(attachment.url), hasBase64: Boolean(attachment.base64) });
    documentText = await extractDocumentText(attachment);
  } catch (error: any) {
    const reason = String(error?.message || error || "error desconocido");
    console.error(logPrefix, "no se pudo leer PDF", reason);
    return standardActionResponse({ sender, intent: "leer el PDF/manual y procesarlo", did: [`Recibí ${attachment.fileName || "el archivo"}`], result: ["No pude extraer texto del PDF", `Causa: ${reason.slice(0, 220)}`], missing: [attachment.base64 || attachment.mediaKey ? "Reenvíalo como PDF legible o pega el texto del manual" : "Evolution/n8n debe enviar el archivo como base64 o incluir mediaKey para poder descifrarlo"], source: ["WhatsApp"] });
  }
  if (!documentText.trim()) {
    console.warn(logPrefix, "PDF sin texto extraíble", { fileName: attachment.fileName });
    return standardActionResponse({ sender, intent: "leer el manual y extraer actividades", did: [`Recibí ${attachment.fileName || "el archivo"}`], result: ["El documento no tiene texto extraíble"], missing: ["OCR del PDF escaneado o texto pegado en el chat"], source: ["WhatsApp"] });
  }

  const analysis = await analyzeDocumentForPM(openai, documentText, text).catch((error) => {
    console.warn(logPrefix, "error analizando documento", error?.message || error);
    return { summary: "", importantSections: [], risks: [], decisions: [], openQuestions: [] };
  });

  let saved: any = null;
  try {
    doriLog("notion_search", "saving document as structured Plan de Negocio page", { fileName: attachment.fileName });
    saved = await saveDocumentToBusinessPlan(attachment, text, analysis, documentText);
  } catch (error: any) {
    console.error(logPrefix, "Notion sin permisos", error?.message || error);
    return standardActionResponse({ sender, intent: "guardar el documento en Plan de Negocio", did: [`Leí ${attachment.fileName || "el archivo"}`], result: ["No pude guardar en Notion"], missing: ["Revisar permisos de la integración en Plan de Negocio"], source: ["WhatsApp", "Notion"] });
  }

  let tasks: ExtractedDocumentTask[] = [];
  try {
    tasks = await extractBacklogTasksFromDocument(openai, documentText, text, memory);
  } catch (error: any) {
    console.error(logPrefix, "error extrayendo tareas", error?.message || error);
    return standardActionResponse({ sender, intent: "extraer actividades del documento", did: [`Guardé ${attachment.fileName || "el archivo"} en ${saved?.where || "Plan de Negocio"}`], result: ["Falló la extracción de actividades"], missing: ["Revisar el formato del documento o indicar la sección exacta a convertir"], source: [saved?.url || "Notion"] });
  }
  if (!tasks.length) {
    console.warn(logPrefix, "sin actividades detectadas", { fileName: attachment.fileName });
    return standardActionResponse({ sender, intent: "guardar el documento y convertirlo en tareas", did: [`Guardé ${attachment.fileName || "el archivo"} en ${saved?.where || "Plan de Negocio"}`], result: ["No encontré actividades claras para Product Backlog"], missing: ["Dime qué sección del documento debo convertir en tareas"], source: [saved?.url || "Notion"] });
  }
  if (tasks.length > 30 && !/confirma|confirmo|carga todas|crear todas|sube todas/i.test(text)) {
    return standardActionResponse({ sender, intent: "procesar el documento sin crear tareas basura", did: [`Leí y guardé ${attachment.fileName || "el archivo"}`, `Detecté ${tasks.length} posibles actividades`], result: [analysis.summary || "Documento analizado", `Primeras actividades detectadas: ${tasks.slice(0, 10).map((task) => task.title).join("; ")}`], missing: ["Hay más de 30 actividades. Confírmame si quieres que cargue las primeras 30 o si debo filtrar por prioridad/área."], source: [saved?.url || "Notion", attachment.fileName || "documento WhatsApp"] });
  }
  tasks = tasks.slice(0, 30);

  const target = await findProductBacklogTarget().catch((error) => {
    console.error(logPrefix, "Product Backlog no encontrado", error?.message || error);
    return null;
  });
  if (!target?.id || target.object !== "database") {
    console.error(logPrefix, "Product Backlog no encontrado");
    return standardActionResponse({ sender, intent: "crear tareas en Product Backlog", did: [`Guardé ${attachment.fileName || "el archivo"} en ${saved?.where || "Plan de Negocio"}`], result: ["No encontré Product Backlog como base de datos"], missing: ["Revisar DORI_TASKS_DATABASE_ID o permisos de Notion"], source: [saved?.url || "Notion"] });
  }

  const globalAssignee = assigneeFromText(text);
  const created: string[] = [];
  const missingResponsible: string[] = [];
  const errors: string[] = [];
  for (const task of tasks) {
    const responsible = task.responsible || globalAssignee || "Sin asignar";
    if (responsible === "Sin asignar") missingResponsible.push(task.title);
    const content = [
      `Solicitud: ${task.title}`,
      `Descripción: ${task.description || task.title}`,
      `Responsable: ${responsible}`,
      `Prioridad: ${task.priority || "Normal"}`,
      `Área: ${task.area || "Plan de Negocio"}`,
      "Ubicación solicitada: Product Backlog",
      "Estado: pendiente de revisión",
      `Origen: ${attachment.fileName || "documento WhatsApp"}`,
      `Observaciones: ${task.observations || (responsible === "Sin asignar" ? "Falta responsable definido" : "")}`,
    ].join("\n");
    try {
      doriLog("task_create", "creating or updating document task", { title: task.title, responsible, priority: task.priority, area: task.area });
      const page = await createDatabasePage(target, task.title, content);
      created.push(`${page.updatedExisting ? "Actualizada" : "Creada"}: ${task.title}`);
    } catch (error: any) {
      console.error(logPrefix, "error creando tareas", { task: task.title, error: error?.message || error });
      errors.push(task.title);
    }
  }

  return standardActionResponse({
    sender,
    intent: "procesar el documento, guardarlo y llevar actividades al backlog",
    did: [`Recibí ${attachment.fileName || "el manual/documento"}`, saved?.alreadyExists ? `Ya existía en Plan de Negocio: ${saved.where}` : `Lo guardé estructurado en Plan de Negocio: ${saved?.where || "documento"}`, `Extraje ${tasks.length} actividades`, `Creé o actualicé ${created.length} tareas en Product Backlog`],
    result: [...(analysis.summary ? [`Resumen: ${analysis.summary}`] : []), ...(created.length ? created.slice(0, 12) : ["No pude crear tareas en Product Backlog"]), ...(analysis.risks.length ? [`Riesgos detectados: ${analysis.risks.join("; ")}`] : [])],
    missing: [...(missingResponsible.length ? [`${missingResponsible.length} tareas quedaron sin responsable definido`] : []), ...(analysis.openQuestions.length ? [`Preguntas abiertas: ${analysis.openQuestions.join("; ")}`] : []), ...(errors.length ? [`No pude crear: ${errors.join(", ")}`] : [])],
    source: [saved?.url || "Notion", attachment.fileName || "documento WhatsApp"],
  });
}

async function appendToArea(area: string, content: string) {
  const found = area === "Product Backlog" ? await findBacklogTarget() : await findBest(area);
  if (found?.object === "page") {
    await notionFetch(`/blocks/${found.id}/children`, {
      method: "PATCH",
      body: JSON.stringify({ children: contentBlocks(content) }),
    });
    return { where: titleFromNotion(found), url: found.url };
  }
  const parent = process.env.DORI_NOTION_PARENT_PAGE_ID || DEFAULT_PARENT_PAGE_ID;
  const page = await createPage(parent, area || "Información Dori", content);
  return { where: area || "Plataforma D'Origen", url: page.url };
}

async function findBacklogTarget() {
  const configured = process.env.DORI_TASKS_DATABASE_NAME || "Product Backlog";
  const candidates = [
    await findBest(configured),
    await findBest("Product Backlog"),
    await findBest("Backlog Técnico"),
    await findBest("Backlog Tecnico"),
  ].filter(Boolean);
  return candidates.find((item: any) => item?.object === "database") || candidates.find((item: any) => item?.object === "page") || null;
}

async function findProductBacklogTarget() {
  const configuredId = cleanNotionId(process.env.DORI_TASKS_DATABASE_ID || process.env.DORI_PRODUCT_BACKLOG_DATABASE_ID || "");
  if (configuredId.trim()) {
    const database = await notionFetch(`/databases/${configuredId.trim()}`).catch(() => null);
    if (database?.object === "database") return database;
  }
  const configured = process.env.DORI_TASKS_DATABASE_NAME || "Product Backlog";
  const candidates = [
    ...(await findCandidates(configured).catch(() => [])),
    ...(await findCandidates("Product Backlog").catch(() => [])),
  ].filter((item: any) => item?.object === "database" && !/t[eé]cnico|tecnico/i.test(titleFromNotion(item)));
  if (candidates.length) return candidates[0];
  const discovered = await discoverProductBacklogDatabase().catch(() => null);
  if (discovered) return discovered;
  const exactPage = await findExactTitle("Product Backlog").catch(() => null);
  return exactPage?.object === "page" && normalizeKey(titleFromNotion(exactPage)) === normalizeKey("Product Backlog") ? exactPage : null;
}

async function discoverProductBacklogDatabase() {
  const pageBatches = await Promise.all([
    searchNotionObject("", "page", 100).catch(() => ({ results: [] })),
    searchNotionObject("Priorizar el sprint", "page", 20).catch(() => ({ results: [] })),
    searchNotionObject("Explorar y navegar", "page", 20).catch(() => ({ results: [] })),
    searchNotionObject("Implementar autenticación", "page", 20).catch(() => ({ results: [] })),
    searchNotionObject("Configurar repositorio", "page", 20).catch(() => ({ results: [] })),
  ]);
  const pages = pageBatches.flatMap((batch: any) => (Array.isArray(batch.results) ? batch.results : []));
  const databaseIds = Array.from(new Set(pages.map((page: any) => page?.parent?.database_id).filter(Boolean)));
  for (const databaseId of databaseIds) {
    const database = await notionFetch(`/databases/${databaseId}`).catch(() => null);
    const title = normalizeKey(titleFromNotion(database));
    if (database?.object === "database" && title.includes("product") && title.includes("backlog")) return database;
  }
  return null;
}

async function answerQuestion(openai: OpenAI, question: string, area: string) {
  if (isDiagnosticsQuestion(question)) return notionDiagnostics();
  if (isCapabilityQuestion(question)) return doriManual();
  const expectedTitle = expectedAreaTitle(area, question);
  const shouldReadRoot = /plan de negocio|negocio|proyecto de negocio/i.test(`${question} ${area}`);
  const isSpecificArea = area && area !== "Plataforma D'Origen" && !shouldReadRoot;
  const candidateItems = await answerCandidates(question, expectedTitle, area, shouldReadRoot);
  let context = "";
  let title = "D'Origen";
  let sourceUrlValue = "";
  for (const found of candidateItems) {
    if (found?.object === "page" || found?.type === "child_page") {
      const pageContext = (await readBlocks(found.id, 0, 5)).join("\n");
      if (isUsefulContext(pageContext)) {
        context = pageContext;
        title = titleFromNotion(found) || title;
        sourceUrlValue = itemUrl(found);
        break;
      }
    } else if (found?.object === "database") {
      const dbContext = (await queryDatabase(found.id)).join("\n");
      if (isUsefulContext(dbContext)) {
        context = dbContext;
        title = titleFromNotion(found) || title;
        sourceUrlValue = itemUrl(found);
        break;
      }
    }
  }
  if (!context.trim()) {
    const rootPageId = process.env.DORI_NOTION_PARENT_PAGE_ID || DEFAULT_PARENT_PAGE_ID;
    context = (await readBlocks(rootPageId, 0, 5)).join("\n");
    title = "Página raíz D'Origen";
    sourceUrlValue = notionUrl(rootPageId);
  }
  if (!context.trim() && isSpecificArea) {
    return `No encontré información específica de ${area} en Notion. Revisa que la integración Dori tenga acceso a esa página o compártela con la integración.`;
  }
  if (!context.trim()) return `No encontré contenido útil en Notion. Revisa que la integración Dori tenga acceso a la página raíz de D'Origen.`;
  const excerpts = relevantLines(context, question, area) || (isSpecificArea ? firstContextLines(context) : "");
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 900,
    messages: [
      { role: "system", content: "Responde como Dori usando solo el contexto de Notion. Prohibido usar conocimiento general. No uses Markdown de negrita ni asteriscos. Si hay extractos relevantes, responde obligatoriamente con esos extractos y sus datos concretos. Si el contexto no contiene datos específicos para responder, di: 'No encontré esa información específica en Notion'. Usa términos concretos del contexto: títulos, bullets, módulos, tecnologías, tablas, campos y alcance. Si la fuente es una subpágina específica, prioriza esa subpágina y no respondas con descripción general del proyecto. Si preguntan cómo es el plan de negocio, describe el proyecto actual: idea general, origen, comunidad, mercado y propósito. Ignora listas de preguntas, pendientes o cosas por definir salvo que el usuario pregunte por pendientes. No digas 'me gustaría conocer' ni pidas más datos. Sé directo y claro en español." },
      { role: "user", content: `Pregunta: ${question}\nFuente: ${title}\nExtractos relevantes de Notion:\n${excerpts || "Sin extractos relevantes"}\n\nContexto completo de Notion:\n${context.slice(0, 18000)}` },
    ],
  });
  const answer = completion.choices[0]?.message?.content?.trim() || "No pude responder con la información disponible.";
  return cleanWhatsAppText(`${answer}${sourceLine(title, sourceUrlValue)}`);
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const text = getTextFromPayload(payload);
    const fromMe = isFromMe(payload);
    if (fromMe) return json({ success: true, action: "ignore", message: "" });
    if (markDoriMessageProcessing(payload)) return json({ success: true, action: "ignore", message: "" });
    if (text.trim() && getNotionKey()) {
      await saveChatMessage(payload, text).catch((error) => console.warn("[dori] chat history not saved", error?.message || error));
    }
    let archivedPdfPage: any = null;
    const publicPdfUrl = pdfUrlFromText(text);
    if (getNotionKey() && publicPdfUrl && isPdfSaveRequest(text)) {
      archivedPdfPage = await archivePdfAttachmentInBackground(payload, text, externalPdfAttachment(publicPdfUrl, payload)).catch((error) => {
        console.warn("[dori][document] PDF public URL archive failed", error?.message || error);
        return null;
      });
    } else if (getNotionKey() && isPdfAttachment(getDocumentAttachment(payload))) {
      archivedPdfPage = await archivePdfAttachmentInBackground(payload, text).catch((error) => {
        console.warn("[dori][document] PDF auto archive failed", error?.message || error);
        return null;
      });
    }
    if (!mentionsDori(text)) return json({ success: true, action: "ignore", message: "" });
    if (!process.env.OPENAI_API_KEY) return json({ success: false, error: "Missing OPENAI_API_KEY" }, 500);
    if (!getNotionKey()) return json({ success: false, error: "Missing NOTION_API_KEY or NOTION_TOKEN" }, 500);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const memory = await buildDoriMemory(payload);
    const reply = async (action: string, message: string, extra: Record<string, unknown> = {}) => {
      const cleanMessage = cleanWhatsAppText(message);
      doriLog("response", "replying to WhatsApp", { action, preview: cleanMessage.slice(0, 500) });
      await rememberDoriMessage(payload, cleanMessage).catch((error) => console.warn("[dori][memory] response not remembered", error?.message || error));
      return json({ success: true, action, ...extra, message: cleanMessage });
    };
    const normalizedText = normalizeKey(text);
    if (isGreeting(text)) return reply("answer", doriGreeting(memory.sender));
    if (isSocialClose(text)) return reply("answer", doriSocialClose(memory.sender));
    if (isCorrectionWithoutIntent(text)) return reply("answer", clarificationFor(text));
    if (isLastPdfQuestion(text)) return reply("answer", await answerPdfRepository());
    if (isPdfSaveRequest(text) && archivedPdfPage) {
      const lastPdfLine = recentDoriChatLines.slice().reverse().find((line) => line.includes(`Notion: ${itemUrl(archivedPdfPage)}`)) || "";
      const saved = /Estado: archivo PDF guardado/i.test(lastPdfLine) && /Archivo: https?:\/\//i.test(lastPdfLine);
      const status = saved ? "Guardé el PDF real en Repositorio de Documentos Dori." : "Registré el intento en Repositorio de Documentos Dori, pero no pude guardar el archivo PDF real.";
      return reply("answer", `Listo ${memory.sender}. ${status}\n${itemUrl(archivedPdfPage)}`);
    }
    if (isPdfSaveRequest(text) && !isPdfAttachment(getDocumentAttachment(payload))) {
      doriLog("document", "PDF save requested but no attachment detected", { text: text.slice(0, 300), messageKeys: Object.keys(payload?.data?.message || payload?.message || {}) });
      return reply("answer", "No recibí el archivo PDF en el webhook, solo el texto. Reenvíalo como documento adjunto y escribe en el mismo mensaje: Dori guarda este PDF.");
    }
    if (isPersonChatQuestion(text)) return reply("answer", await answerPersonChatQuestion(openai, text, memory));
    if (isImplicitBacklogFollowup(text, memory)) return reply("answer", await answerBacklogList());
    if (isTaskResponsibilityQuestion(text)) return reply("answer", await answerTaskResponsibilities());
    if (isCalendarInfoOnlyQuestion(text)) return reply("answer", await answerMeetingInfoFromNotion(openai, text));
    const decision = decideNextAction(text, payload, memory);
    if (decision.needsClarification) {
      return reply("answer", standardActionResponse({ sender: memory.sender, intent: decision.expectedOutput, did: ["Analicé la solicitud antes de actuar"], result: ["Puedo hacerlo, pero falta un dato mínimo para no crear información incorrecta"], missing: [decision.clarificationQuestion], source: ["WhatsApp", "Memoria Dori"] }));
    }
    if (decision.intent === "recommend_next_steps") return reply("answer", await answerNextSteps(openai, memory));
    if (decision.intent === "meeting_minutes") return reply("create_page", await createMeetingMinutes(openai, memory, text));
    if (decision.intent === "team_followup") return reply("answer", await answerTeamFollowup(text, memory));
    if (decision.intent === "backlog_quality") return reply("answer", await answerBacklogQuality(memory));
    if (isDocumentBacklogRequest(text, payload)) {
      const message = await processDocumentToBacklog(openai, payload, text, memory);
      return reply("process_document_to_backlog", message);
    }
    if (isTaskStatusUpdateRequest(text)) {
      const statusUpdate = extractTaskStatusUpdate(text);
      const result = await updateTaskStatus(statusUpdate.title, statusUpdate.status);
      return reply("answer", result.message);
    }
    const numberedTasks = extractNumberedTasks(text);
    if (numberedTasks.length > 1 && isTaskRequest(text)) {
      const target = await findProductBacklogTarget();
      if (!target?.id || target.object !== "database") {
        return reply("answer", standardActionResponse({ sender: memory.sender, intent: "crear tareas en Product Backlog", did: ["Busqué la base Product Backlog en Notion"], result: ["No encontré Product Backlog como base de datos accesible"], missing: ["Revisar permisos o DORI_TASKS_DATABASE_ID"], source: ["Notion"] }));
      }
      const results = [];
      for (const taskItem of numberedTasks) {
        const page = await createDatabasePage(target, taskItem.title, taskItem.content);
        results.push(`${page.updatedExisting ? "Actualizada" : "Creada"}: ${taskItem.title}`);
      }
      return reply("create_task", standardActionResponse({ sender: memory.sender, intent: "crear o actualizar una lista de tareas", did: [`Procesé ${results.length} tareas`, `Las llevé a ${titleFromNotion(target) || "Product Backlog"}`], result: results.slice(0, 20), source: [titleFromNotion(target) || "Product Backlog"] }));
    }
    if (isBacklogListQuestion(text)) return reply("answer", await answerBacklogList());
    if (!isTaskRequest(text) && /link|enlace|hor|cuando|donde|toronto/.test(normalizedText) && /reuni|meet|meeting|calendar|calendario/.test(normalizedText) && !/agenda|agendar|crear|crea|cita|citar|programa|programar|cambi|mov|ajust|reprogram|modific|pasar|pasa (la|el|para)/.test(normalizedText)) {
      return reply("answer", await answerMeetingInfoFromNotion(openai, text));
    }
    if (isChatSummaryQuestion(text)) {
      const summary = await summarizeChatHistory(openai, stripDoriCommand(text)).catch((error) => {
        console.warn("[dori][memory] summary failed", error?.message || error);
        return "No pude leer el historial para hacer el resumen. Reenvíame el bloque que quieres resumir o dime desde qué punto debo empezar.";
      });
      return reply("answer", summary);
    }
    if (isDiagnosticsQuestion(text)) return reply("answer", await notionDiagnostics());
    if (isCapabilityQuestion(text)) return reply("answer", await answerQuestion(openai, stripDoriCommand(text), "Plataforma D'Origen"));
    if (isCalendarUpdateRequest(text)) {
      const calendar = await buildCalendarUpdate(openai, text);
      const message = cleanWhatsAppText(calendar.message || "Entendí que quieres cambiar una reunión, pero necesito fecha y hora nueva.");
      return reply(calendar.event ? "update_calendar_event" : "answer", message, calendar.event ? { calendar: calendar.event, calendarUpdate: { mode: "update_existing_event", searchText: stripDoriCommand(text) } } : {});
    }
    if (isGoogleCalendarRequest(text)) {
      const calendar = await buildCalendarEvent(openai, text);
      if (!calendar.event) {
        return reply("answer", calendar.message || "Necesito fecha y hora para crear el evento en Google Calendar.");
      }
      const message = cleanWhatsAppText(
        [
          "Evento listo para crear en Google Calendar.",
          `Título: ${calendar.event.summary}`,
          `Inicio: ${calendar.event.start}`,
          `Fin: ${calendar.event.end}`,
          calendar.event.attendees.length ? `Invitados: ${calendar.event.attendees.map((attendee) => attendee.email).join(", ")}` : "Invitados: ninguno especificado",
          calendar.event.reminderNote || "",
        ].join("\n")
      );
      return reply("create_calendar_event", message, { calendar: calendar.event });
    }
    if (!isTaskRequest(text) && isCalendarInfoQuestion(text)) return reply("answer", await answerMeetingInfoFromNotion(openai, text));
    const intent = await classify(openai, text, memory);
    let message = "Operación realizada correctamente.";

    if (intent.action === "process_document_to_backlog") {
      if (getDocumentAttachment(payload)) {
        return reply("answer", standardActionResponse({ sender: memory.sender, intent: "procesar el documento", did: ["Ya recibí el adjunto y lo estoy procesando por la ruta de documentos"], result: ["Te aviso en el grupo cuando termine"], source: ["WhatsApp"] }));
      }
      message = await processDocumentToBacklog(openai, payload, text, memory);
      return reply("process_document_to_backlog", message);
    } else if (intent.action === "answer") {
      message = await answerQuestion(openai, intent.query || text, intent.area);
      if (/^No encontr[eé]/i.test(message)) message = clarificationFor(text);
    } else if (intent.action === "create_task" || intent.action === "create_bug" || intent.action === "create_idea") {
      const target = intent.action === "create_task" ? await findProductBacklogTarget() : await findBacklogTarget();
      const kind = intent.action === "create_task" ? "Tarea" : intent.action === "create_bug" ? "Bug" : "Idea";
      const taskItems = intent.action === "create_task" ? extractNumberedTasks(text) : [];
      if (target?.id && target.object === "database" && taskItems.length > 1) {
        const results = [];
        for (const taskItem of taskItems) {
          const page = await createDatabasePage(target, taskItem.title, taskItem.content);
          results.push(`${page.updatedExisting ? "Actualizada" : "Creada"}: ${taskItem.title}`);
        }
        message = `${results.length} tareas procesadas en ${titleFromNotion(target) || "Product Backlog"}.\n${results.slice(0, 12).join("\n")}`;
      } else if (target?.id && target.object === "database") {
        const page = await createDatabasePage(target, intent.title, intent.content);
        message = `${kind} ${page.updatedExisting ? "actualizada" : "creada"} correctamente en ${titleFromNotion(target) || "Product Backlog"}.\n${page.url || itemUrl(page)}`;
      } else if (target?.id && target.object === "page") {
        await notionFetch(`/blocks/${target.id}/children`, {
          method: "PATCH",
          body: JSON.stringify({ children: contentBlocks(`${intent.title}\n\n${intent.content}`) }),
        });
        message = `${kind} agregada correctamente en ${titleFromNotion(target) || "Backlog"}.\n${itemUrl(target)}`;
      } else {
        const existingTask = intent.action === "create_task" ? await findExistingTaskPage(intent.title).catch(() => null) : null;
        if (existingTask?.id) {
          const page = await updateExistingTaskPage(existingTask, intent.content);
          message = `${kind} actualizada correctamente en ${page.databaseTitle || "Product Backlog"}.\n${page.url || itemUrl(page)}`;
        } else {
        const parent = process.env.DORI_NOTION_PARENT_PAGE_ID || DEFAULT_PARENT_PAGE_ID;
        const page = await createPage(parent, intent.title || "Action item Dori", intent.content);
        message = `No encontré una base o página de backlog, así que guardé la información como página en Notion.\nDónde: Página raíz D'Origen\n${page.url || itemUrl(page)}`;
        }
      }
    } else if (intent.action === "create_page" || intent.action === "create_decision") {
      const parent = process.env.DORI_NOTION_PARENT_PAGE_ID || DEFAULT_PARENT_PAGE_ID;
      const page = await createPage(parent, intent.title || (intent.action === "create_decision" ? "Decisión Dori" : "Reunión"), intent.content);
      message = intent.action === "create_decision" ? `Decisión creada correctamente en Notion.\nDónde: Página raíz D'Origen\n${page.url || itemUrl(page)}` : `Página/reunión creada correctamente en Notion.\nDónde: Página raíz D'Origen\n${page.url || itemUrl(page)}`;
    } else if (intent.action === "append_page") {
      const saved = await appendToArea(intent.area, intent.content);
      message = `Información guardada en ${saved.where}.\n${saved.url || ""}`.trim();
    } else {
      message = await answerQuestion(openai, text, normalizeArea(text)).catch(() => "Estoy aquí. Puedo ayudarte a revisar Notion, pendientes, tareas del equipo, reuniones o decisiones de Origen. Dime qué quieres que revise.");
      if (/^No encontr[eé]/i.test(message)) message = clarificationFor(text);
    }

    return reply(intent.action, message);
  } catch (error: any) {
    console.error("[dori] error", error);
    return json({ success: false, action: "answer", error: error?.message || "Error procesando Dori", message: "Tuve un error procesando la solicitud. Ya dejé logs para revisar qué falló; intenta de nuevo o dame más detalle." });
  }
}
