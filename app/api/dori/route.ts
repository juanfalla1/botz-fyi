import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOTION_VERSION = "2022-06-28";
const DEFAULT_PARENT_PAGE_ID = "38996330912d80a3aa05efe9d478a148";

type DoriIntent = {
  action: "ignore" | "answer" | "create_task" | "create_page" | "append_page" | "create_bug" | "create_idea" | "create_decision";
  title: string;
  content: string;
  query: string;
  area: string;
};

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
      body?.data?.message?.imageMessage?.caption ||
      body?.text ||
      body?.message ||
      body?.data?.text ||
      payload?.message ||
      ""
  ).trim();
}

function isFromMe(payload: any) {
  const body = payload?.body ?? payload;
  return body?.data?.key?.fromMe === true;
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
  if (/plan de negocio|negocio|proyecto de negocio/.test(lower)) return "Plan de Negocio";
  if (/proveedor|proveedores/.test(lower)) return "Proveedores";
  if (/catálogo|catalogo|producto|productos|inventario|sku/.test(lower)) return "Catálogo de Productos";
  if (/reunión|reunion|reuniones|llamada|meet/.test(lower)) return "Reuniones";
  if (/tarea|tareas|pendiente|pendientes/.test(lower)) return "Product Backlog";
  if (/marketing|campaña|contenido|redes|anuncio/.test(lower)) return "Marketing";
  if (/finanza|finanzas|costo|precio|margen|presupuesto/.test(lower)) return "Finanzas";
  if (/arquitectura/.test(lower)) return "Arquitectura MVP";
  if (/backend|servidor/.test(lower)) return "Backend";
  if (/frontend|interfaz|pantalla|ui/.test(lower)) return "Frontend";
  if (/equipo|integrante|persona|miembro|responsable/.test(lower)) return "Equipo D'Origen";
  if (/roadmap mvp/.test(lower)) return "Roadmap MVP";
  if (/roadmap/.test(lower)) return "Roadmap";
  if (/modelo de datos|base de datos/.test(lower)) return "Modelo de Datos";
  if (/api|integración|integracion/.test(lower)) return "APIs e Integraciones";
  if (/backlog técnico|backlog tecnico|bug|error|fallo/.test(lower)) return "Backlog Técnico";
  return "Plataforma D'Origen";
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
  return [{ type: "text", text: { content: text.slice(0, 1900) } }];
}

function contentBlocks(content: string) {
  const text = content.trim();
  if (!text) return [];
  const chunks = text.match(/[\s\S]{1,1900}/g) || [];
  return chunks.slice(0, 100).map((chunk) => ({
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: richText(chunk) },
  }));
}

function plainFromRich(value: any): string {
  if (Array.isArray(value)) return value.map((v) => v?.plain_text || v?.text?.content || "").join("");
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.plain_text || value?.text?.content || value.content || "";
  return "";
}

function titleFromNotion(item: any): string {
  const props = item?.properties || {};
  for (const prop of Object.values<any>(props)) {
    if (prop?.type === "title") return plainFromRich(prop.title).trim();
  }
  return plainFromRich(item?.title).trim() || item?.url || "";
}

async function searchNotion(query: string, pageSize = 10) {
  return notionFetch("/search", {
    method: "POST",
    body: JSON.stringify({ query, page_size: pageSize, sort: { direction: "descending", timestamp: "last_edited_time" } }),
  });
}

async function findBest(query: string) {
  const data = await searchNotion(query, 10);
  const results = Array.isArray(data.results) ? data.results : [];
  const q = query.toLowerCase();
  const scored = results
    .map((item: any) => {
      const title = titleFromNotion(item).toLowerCase();
      let score = item.object === "page" ? 3 : 1;
      for (const word of q.split(/\s+/).filter((w) => w.length > 2)) if (title.includes(word)) score += 5;
      if (q.includes("plan") && title.includes("negocio")) score += 50;
      if (q.includes("equipo") && title.includes("equipo")) score += 50;
      return { item, score };
    })
    .sort((a: any, b: any) => b.score - a.score);
  return scored[0]?.item || null;
}

async function readBlocks(blockId: string, depth = 0): Promise<string[]> {
  if (!blockId || depth > 1) return [];
  const data = await notionFetch(`/blocks/${blockId}/children?page_size=100`);
  const blocks = Array.isArray(data.results) ? data.results : [];
  const lines: string[] = [];
  for (const block of blocks) {
    const type = block.type;
    const body = block[type] || {};
    const text = plainFromRich(body.rich_text || body.title || body.caption || body.text).trim();
    if (text) lines.push(text);
    if (block.has_children) lines.push(...(await readBlocks(block.id, depth + 1)));
  }
  return lines;
}

async function queryDatabase(databaseId: string) {
  const data = await notionFetch(`/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify({ page_size: 20 }),
  });
  const results = Array.isArray(data.results) ? data.results : [];
  return results.map((r: any) => titleFromNotion(r)).filter(Boolean);
}

async function classify(openai: OpenAI, text: string): Promise<DoriIntent> {
  const saveThis = extractSaveThis(text);
  if (saveThis) {
    return { action: "append_page", title: "Información guardada", content: saveThis, query: "", area: normalizeArea(saveThis) };
  }
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Clasifica mensajes para Dori, PM de D'Origen. Responde SOLO JSON válido con action, title, content, query, area. Actions: answer, create_task, create_page, append_page, create_bug, create_idea, create_decision, ignore. Si es pregunta usa answer. Si pide guardar usa append_page. Si pide agenda/reunión usa create_page.",
      },
      { role: "user", content: text },
    ],
  });
  const raw = completion.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(raw.replace(/```json/g, "").replace(/```/g, "").trim());
    return {
      action: parsed.action || "ignore",
      title: parsed.title || "",
      content: parsed.content || parsed.description || stripDoriCommand(text),
      query: parsed.query || stripDoriCommand(text),
      area: parsed.area || normalizeArea(text),
    };
  } catch {
    return { action: "answer", title: "", content: "", query: stripDoriCommand(text), area: normalizeArea(text) };
  }
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

function getDatabaseTitleProperty(database: any) {
  const properties = database?.properties || {};
  for (const [name, property] of Object.entries<any>(properties)) {
    if (property?.type === "title") return name;
  }
  return "Name";
}

async function createDatabasePage(database: any, title: string, content: string) {
  const titleProperty = getDatabaseTitleProperty(database);
  return notionFetch("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: database.id },
      properties: { [titleProperty]: { title: richText(title || content.slice(0, 80) || "Dori") } },
      children: contentBlocks(content),
    }),
  });
}

async function appendToArea(area: string, content: string) {
  const found = await findBest(area);
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

async function answerQuestion(openai: OpenAI, question: string, area: string) {
  const query = area && area !== "Plataforma D'Origen" ? area : question;
  const found = await findBest(query);
  if (!found) return "No encontré información relacionada en Notion.";
  let context = "";
  if (found.object === "page") {
    context = (await readBlocks(found.id)).join("\n");
  } else if (found.object === "database") {
    context = (await queryDatabase(found.id)).join("\n");
  }
  const title = titleFromNotion(found);
  if (!context.trim()) return `Encontré ${title}, pero no pude leer contenido útil. Fuente: ${found.url || "sin URL"}`;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 500,
    messages: [
      { role: "system", content: "Responde como Dori usando solo el contexto de Notion. No inventes. Sé breve y claro en español." },
      { role: "user", content: `Pregunta: ${question}\nFuente: ${title}\nContexto:\n${context.slice(0, 12000)}` },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() || "No pude responder con la información disponible.";
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const text = getTextFromPayload(payload);
    if (isFromMe(payload) || !/\bdori\b/i.test(text)) return json({ success: true, action: "ignore", message: "" });
    if (!process.env.OPENAI_API_KEY) return json({ success: false, error: "Missing OPENAI_API_KEY" }, 500);
    if (!getNotionKey()) return json({ success: false, error: "Missing NOTION_API_KEY or NOTION_TOKEN" }, 500);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const intent = await classify(openai, text);
    let message = "Operación realizada correctamente.";

    if (intent.action === "answer") {
      message = await answerQuestion(openai, intent.query || text, intent.area);
    } else if (intent.action === "create_task" || intent.action === "create_bug" || intent.action === "create_idea") {
      const db = await findBest(process.env.DORI_TASKS_DATABASE_NAME || "Product Backlog");
      if (!db?.id || db.object !== "database") throw new Error("No encontré la base Product Backlog para crear el registro.");
      await createDatabasePage(db, intent.title, intent.content);
      message = intent.action === "create_task" ? "Tarea creada correctamente en Notion." : intent.action === "create_bug" ? "Bug registrado correctamente en Notion." : "Idea registrada correctamente en Notion.";
    } else if (intent.action === "create_page" || intent.action === "create_decision") {
      const parent = process.env.DORI_NOTION_PARENT_PAGE_ID || DEFAULT_PARENT_PAGE_ID;
      await createPage(parent, intent.title || (intent.action === "create_decision" ? "Decisión Dori" : "Reunión"), intent.content);
      message = intent.action === "create_decision" ? "Decisión creada correctamente en Notion." : "Página creada correctamente en Notion.";
    } else if (intent.action === "append_page") {
      const saved = await appendToArea(intent.area, intent.content);
      message = `Información guardada en ${saved.where}.`;
    } else {
      message = "No entendí la solicitud. Mencióname como Dori y dime si quieres guardar, crear o preguntar algo.";
    }

    return json({ success: true, action: intent.action, message });
  } catch (error: any) {
    console.error("[dori] error", error);
    return json({ success: false, error: error?.message || "Error procesando Dori" }, 500);
  }
}
