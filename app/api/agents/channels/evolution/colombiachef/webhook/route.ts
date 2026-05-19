import { NextRequest, NextResponse } from "next/server";
import { evolutionService } from "../../../../../../../lib/services/evolution.service";
import { categoryMatches, findExactProductByName, findProductByUrl, findProductsByCategory, findProductsByText, loadCatalog } from "../_lib/catalog";
import { parseInbound } from "../_lib/evolution-payload";
import { isCatalogScopeQuestion, isConfusionSignal, isGreeting, isMoreInCategoryIntent, isMoreOptionsIntent, isPurchaseIntent, isUnsupportedRequest } from "../_lib/intent";
import { getSession, saveSession } from "../_lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECENT_MESSAGE_TTL_MS = 3 * 60 * 1000;
const recentMessageIds = new Map<string, number>();
const ADVISOR_NUMBER = String(process.env.COLOMBIACHEF_ADVISOR_NUMBER || "573176408961").replace(/\D/g, "");
const ADVISOR_NAME = String(process.env.COLOMBIACHEF_ADVISOR_NAME || "Andres Castillo").trim();
const ADVISOR_LINK = ADVISOR_NUMBER ? `https://wa.me/${ADVISOR_NUMBER}` : "";

function isDuplicateMessage(messageId: string): boolean {
  const now = Date.now();
  for (const [id, ts] of recentMessageIds.entries()) {
    if (now - ts > RECENT_MESSAGE_TTL_MS) recentMessageIds.delete(id);
  }
  if (!messageId) return false;
  if (recentMessageIds.has(messageId)) return true;
  recentMessageIds.set(messageId, now);
  return false;
}

function parseSizeAndColor(text: string): { size: string; colors: string[] } {
  const src = String(text || "").toLowerCase();
  const sizeMatch = src.match(/\b(xs|s|m|l|xl|xxl|xxxl|talla\s+[a-z0-9]+)\b/i);
  const size = sizeMatch ? sizeMatch[1].toUpperCase().replace("TALLA ", "") : "";
  const colorWords = ["negro", "blanco", "verde", "azul", "gris", "rojo", "rosado", "mostaza", "mocca", "naranja", "crudo"];
  const colors = colorWords.filter((c) => src.includes(c));
  return { size, colors };
}

function buildCategoryAnswer(input: string): string | null {
  const category = categoryMatches(input);
  if (!category) return null;
  const { size, colors } = parseSizeAndColor(input);
  const candidates = findProductsByCategory(category, 60);
  const filtered = candidates.filter((p) => {
    const okSize = size ? (p.sizes || []).map((s) => s.toUpperCase()).includes(size) : true;
    const okColor = colors.length ? colors.some((c) => (p.colors || []).map((x) => x.toLowerCase()).includes(c)) : true;
    return okSize && okColor;
  });
  const items = (filtered.length ? filtered : candidates).slice(0, 3);
  if (!items.length) {
    return `Por ahora no tengo productos listados en ${category}. ¿Quieres que te pase otras categorías?`;
  }

  const lines = items.map((p, i) => formatOptionLine(i + 1, p.name, p.price, p.url, undefined, p.sizes));
  const guidance = size || colors.length
    ? "Si quieres, te paso mas opciones o validamos disponibilidad exacta con asesor."
    : category === "Accesorios"
      ? "Si me dices uso, referencia o presupuesto te recomiendo mejor."
      : "Si me dices talla, color y presupuesto te recomiendo mejor.";
  return [
    `Perfecto. Opciones en ${category}:`,
    ...lines,
    "",
    guidance,
  ].join("\n");
}

function buildPolicyAnswer(input: string): string | null {
  const t = input.toLowerCase();
  const data = loadCatalog();
  const policies = data.business?.policies || [];
  if (!policies.length) return null;

  if (/(envio|envios|entrega|domicilio|despachan|despacho|ciudad)/.test(t)) {
    return [
      "Si, hacemos despachos nacionales sujetos a cobertura y tiempos de transportadora.",
      "Para confirmar Monteria o tu ciudad exacta, te ayudo a validar con asesor y costo de envio.",
      `Politicas oficiales: ${policies.join(" | ")}`,
    ].join(" ");
  }
  if (/(cambio|devolucion|garantia|politica|faq)/.test(t)) {
    return `Te comparto políticas oficiales de Colombia Chef:\n${policies.join("\n")}`;
  }
  return null;
}

function buildRefinedFromSession(customerId: string, userText: string): string | null {
  const session = getSession(customerId);
  if (!session?.lastCategory) return null;
  const { size, colors } = parseSizeAndColor(userText);
  if (!size && !colors.length) return null;

  const all = findProductsByCategory(session.lastCategory, 60);
  const refined = all.filter((p) => {
    const okSize = size ? (p.sizes || []).map((s) => s.toUpperCase()).includes(size) : true;
    const okColor = colors.length ? colors.some((c) => (p.colors || []).map((x) => x.toLowerCase()).includes(c)) : true;
    return okSize && okColor;
  }).slice(0, 3);

  if (!refined.length) {
    return `No veo opciones exactas para talla ${size || ""}${colors.length ? ` y color ${colors.join("/")}` : ""} en ${session.lastCategory}. Te puedo mostrar alternativas cercanas o validar disponibilidad con asesor.`;
  }

  saveSession(customerId, {
    lastShownUrls: [...session.lastShownUrls, ...refined.map((x) => x.url)].slice(-30),
    lastResults: refined.map((x) => ({ name: x.name, price: x.price, url: x.url })),
  });

  return formatProductsList(refined, `Perfecto, con esos datos te recomiendo en ${session.lastCategory}:`);
}

function buildPromoAnswer(): string {
  const promos = findProductsByCategory("Promos", 3);
  if (!promos.length) return "En este momento no me aparecen promos activas. Si quieres, te busco por categoría.";
  const lines = promos.map((p, i) => formatOptionLine(i + 1, p.name, p.price, p.url, undefined, p.sizes));
  return ["Promociones activas:", ...lines].join("\n");
}

function buildSearchAnswer(input: string): string {
  const category = categoryMatches(input);
  const { size, colors } = parseSizeAndColor(input);
  const exact = findExactProductByName(input);
  let found = findProductsByText(input, 8);

  if (category) {
    const inCategory = findProductsByCategory(category, 80);
    const refined = inCategory.filter((p) => {
      const okSize = size ? (p.sizes || []).map((s) => s.toUpperCase()).includes(size) : true;
      const okColor = colors.length ? colors.some((c) => (p.colors || []).map((x) => x.toLowerCase()).includes(c)) : true;
      return okSize && okColor;
    });
    found = (refined.length ? refined : inCategory).slice(0, 8);
  }

  if (exact) {
    found = [exact, ...found.filter((p) => p.url !== exact.url)];
  }

  found = found.slice(0, 3);
  if (!found.length) {
    return "No encontré coincidencias exactas. Dime categoría (chaquetas, pantalones, delantales, gorros, combos o accesorios), talla y presupuesto y te ayudo a elegir.";
  }
  const lines = found.map((p, i) => {
    const notes = [p.availability_notes, p.shipping_notes].filter(Boolean).join(". ");
    return formatOptionLine(i + 1, p.name, p.price, p.url, notes, p.sizes);
  });
  return ["Te encontré estas opciones:", ...lines, "", "Si quieres, te muestro mas opciones de esta misma busqueda."].join("\n");
}

function buildPurchaseSummary(input: string, customerId: string): { customerReply: string; advisorSummary: string } {
  const candidates = findProductsByText(input, 3);
  const session = getSession(customerId);
  const selected = candidates[0] || session?.lastResults?.[0] || null;
  const selectedBlock = selected
    ? `Producto principal: ${selected.name} | Precio visible: ${selected.price || "No visible"} | URL: ${selected.url}`
    : "Producto principal: No identificado con exactitud";

  const customerReply = [
    "Perfecto, ya registré tu intención de compra.",
    "Para cerrar el pedido, te conecto con un asesor comercial ahora mismo.",
    ADVISOR_LINK ? `Enlace directo asesor: ${ADVISOR_LINK}` : "",
    "Por favor comparte en un solo mensaje: talla, color, cantidad y ciudad de entrega.",
  ].join(" ");

  const advisorSummary = [
    `Nuevo pedido para ${ADVISOR_NAME}`,
    `Canal: WhatsApp Colombia Chef`,
    `Cliente: ${customerId}`,
    `Mensaje cliente: ${input}`,
    selectedBlock,
    selected && selected.availability_notes ? `Disponibilidad: ${selected.availability_notes}` : "",
    selected && selected.shipping_notes ? `Notas envio: ${selected.shipping_notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { customerReply, advisorSummary };
}

function formatProductsList(items: Array<{ name: string; price: string; url: string; sizes?: string[] }>, prefix: string): string {
  if (!items.length) return "";
  const lines = items.map((p, i) => formatOptionLine(i + 1, p.name, p.price, p.url, undefined, p.sizes));
  return `${prefix}\n${lines.join("\n")}`;
}

function compactName(name: string): string {
  const cleaned = String(name || "").replace(/[\s\t\n]+/g, " ").trim();
  return cleaned.length > 52 ? `${cleaned.slice(0, 52)}...` : cleaned;
}

function visiblePrice(price: string): string {
  return price && String(price).trim() ? String(price).trim() : "No veo precio visible para ese producto en este momento.";
}

function extractReference(name: string): string {
  const n = String(name || "");
  const m = n.match(/\bREF\.?\s*([A-Z0-9-]+)/i);
  if (m?.[1]) return m[1].toUpperCase();
  const m2 = n.match(/\b(\d{2,6})\b/);
  return m2?.[1] || "";
}

function slugFromUrl(url: string): string {
  try {
    const u = new URL(String(url || ""));
    const parts = u.pathname.split("/").filter(Boolean);
    return (parts[parts.length - 1] || "").toUpperCase();
  } catch {
    return "";
  }
}

function formatOptionLine(index: number, name: string, price: string, url: string, notes?: string, sizes?: string[]): string {
  const sizeLabel = sizes && sizes.length ? `Tallas visibles: ${sizes.join(", ")}` : "No veo talla visible para ese producto en este momento.";
  const ref = extractReference(name);
  const refLabel = ref ? `Referencia: ${ref}` : `Referencia: ${slugFromUrl(url) || "no visible"}`;
  const row = `${index}) ${compactName(name)} | ${visiblePrice(price)}\n${refLabel}\n${url}`;
  if (!notes) return `${row}\n${sizeLabel}`;
  return `${row}\n${sizeLabel}\nNota: ${compactName(notes)}`;
}

function buildMoreOptionsAnswer(customerId: string): string | null {
  const session = getSession(customerId);
  if (!session?.lastCategory) return null;

  const all = findProductsByCategory(session.lastCategory, 20);
  const fresh = all.filter((p) => !session.lastShownUrls.includes(p.url)).slice(0, 3);
  if (!fresh.length) {
    return `Ya te mostré las opciones principales de ${session.lastCategory}. Si quieres, te filtro por talla, color o presupuesto.`;
  }

  saveSession(customerId, {
    lastShownUrls: [...session.lastShownUrls, ...fresh.map((x) => x.url)].slice(-30),
    lastResults: fresh.map((x) => ({ name: x.name, price: x.price, url: x.url })),
  });

  return formatProductsList(fresh, `Claro, aquí tienes más opciones de ${session.lastCategory}:`);
}

function buildFallback(): string {
  return [
    "Hola, soy el asistente comercial de Colombia Chef.",
    "Te ayudo a encontrar uniforme por categoría, talla y presupuesto.",
    "Categorías: Chaquetas, Pantalones, Delantales, Gorros, Combos, Accesorios y Promos.",
    "Escríbeme por ejemplo: 'chaqueta negra talla M hasta 120000'.",
  ].join(" ");
}

function isProductDetailQuestion(text: string): boolean {
  return /(que es|que incluye|que trae|de que material|material|composicion|antifluido|impermeable|se puede mojar|resiste agua|como es la tela)/i.test(
    String(text || "")
  );
}

function cleanDescription(text: string): string {
  return String(text || "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/SKU:\s*/gi, "SKU: ")
    .replace(/categor[ií]as?:/gi, " | Categorias: ")
    .replace(/etiquetas?:/gi, " | Etiquetas: ")
    .replace(/\|\s*\|/g, " | ")
    .replace(/\s+/g, " ")
    .trim();
}

function shortTechnicalDescription(raw: string): string {
  const txt = cleanDescription(raw);
  if (!txt) return "";
  const cut = txt.split(" | ").slice(0, 2).join(" | ").trim();
  return cut.length > 220 ? `${cut.slice(0, 220)}...` : cut;
}

function extractTechFacts(raw: string): string[] {
  const t = cleanDescription(raw).toLowerCase();
  const facts: string[] = [];
  if (/antifluido/.test(t)) facts.push("Antifluido: visible en ficha");
  if (/gabardina/.test(t)) facts.push("Material visible: gabardina");
  if (/algodon|algod[oó]n/.test(t)) facts.push("Material visible: algodon");
  if (/poliester|poli[eé]ster/.test(t)) facts.push("Material visible: poliester");
  if (/impermeable/.test(t)) facts.push("Impermeable: visible en ficha");
  if (/talla unica|talla única/.test(t)) facts.push("Talla visible: unica");
  return facts;
}

function hasExplicitProductHint(text: string): boolean {
  const t = String(text || "").toLowerCase();
  if (/\bref\s*[:#-]?\s*[a-z0-9-]{2,}\b/.test(t)) return true;
  if (/\b(chaqueta|pantalon|delantal|gorro|combo|accesorio)\b/.test(t) && t.length >= 24) return true;
  return false;
}

function buildProductDetailAnswer(customerId: string, input: string): string | null {
  if (!isProductDetailQuestion(input)) return null;

  const session = getSession(customerId);
  const fromSession = session?.lastResults?.[0]?.url ? findProductByUrl(session.lastResults[0].url) : null;
  const fromText = hasExplicitProductHint(input) ? findProductsByText(input, 1)[0] || null : null;
  const picked = fromSession || fromText;

  if (!picked) {
    return [
      "Te ayudo con eso.",
      "Dime el nombre o referencia exacta del producto y te confirmo que incluye, material y cuidados.",
      "Si quieres, tambien te muestro opciones por categoria.",
    ].join(" ");
  }

  const desc = shortTechnicalDescription(picked.description);
  const techFacts = extractTechFacts(picked.description);
  const sizeText = picked.sizes?.length ? `Tallas visibles: ${picked.sizes.join(", ")}.` : "No veo talla visible en la ficha.";
  const colorText = picked.colors?.length ? `Colores visibles: ${picked.colors.join(", ")}.` : "No veo colores visibles en la ficha.";
  const notes = [picked.availability_notes, picked.shipping_notes].filter(Boolean).join(" ");

  return [
    `Sobre ${picked.name}:`,
    desc ? desc : "No veo descripcion tecnica completa en la ficha publica.",
    sizeText,
    colorText,
    techFacts.length ? `Datos tecnicos visibles: ${techFacts.join(" | ")}.` : "",
    notes ? `Nota de ficha: ${notes}` : "",
    `URL: ${picked.url}`,
    "Importante: solo te confirmo datos visibles en la ficha. Si necesitas validar antifluido o resistencia al agua exacta, te lo confirmo con asesor.",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildCatalogScopeAnswer(): string {
  return [
    "Vendemos uniformes y accesorios para cocina.",
    "Categorias: chaquetas, pantalones, delantales, gorros, combos, accesorios y promociones.",
    "Dime una categoria y te comparto hasta 3 opciones con enlace directo.",
  ].join(" ");
}

function buildClarifyAnswer(): string {
  return [
    "Quiero ayudarte bien, pero no me quedo totalmente clara tu solicitud.",
    "Escribeme en este formato para responderte exacto: categoria + talla + color + presupuesto.",
    "Ejemplo: combo institucional talla L blanco/negro hasta 220000.",
  ].join(" ");
}

function buildGuidedHelpAnswer(): string {
  return [
    "Tranquilo, te guio rapido.",
    "Dime que buscas y yo te muestro opciones reales del catalogo.",
    "Puedes escribir por ejemplo:",
    "1) chaqueta negra talla M",
    "2) combo institucional gris talla L",
    "3) accesorios para cocina hasta 80000",
  ].join(" \n");
}

function isAffirmative(text: string): boolean {
  return /^(si|sí|dale|ok|listo|de una|hagale|h[aá]gale)$/i.test(String(text || "").trim());
}

function isNegative(text: string): boolean {
  return /^(no|negativo|ya no|mejor no)$/i.test(String(text || "").trim());
}

function isAdvisorIntent(text: string): boolean {
  return /(asesor|humano|agente|hablar con alguien|hablar con asesor)/i.test(String(text || ""));
}

function isBuyNowIntent(text: string): boolean {
  return /(comprar ahora|comprar|quiero comprar|lo compro|pagar|checkout|finalizar)/i.test(String(text || ""));
}

function parseCheckoutFields(text: string): Partial<{ talla: string; color: string; cantidad: string; ciudad: string }> {
  const src = String(text || "");
  const low = src.toLowerCase();
  const talla = (low.match(/\b(?:talla\s*)?(xs|s|m|l|xl|xxl|xxxl)\b/i)?.[1] || "").toUpperCase();
  const color = low.match(/\b(negro|blanco|verde|azul|gris|rojo|rosado|mostaza|mocca|naranja|crudo)\b/i)?.[1] || "";
  const cantidad = low.match(/\b(\d{1,3})\s*(unidades?|uds?|u)?\b/i)?.[1] || "";
  const ciudadMatch = src.match(/(?:ciudad|en)\s*[:\-]?\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ ]{3,})/i);
  const ciudad = ciudadMatch?.[1]?.trim() || "";
  return {
    talla,
    color,
    cantidad,
    ciudad,
  };
}

function buildChooseCategoryAnswer(): string {
  return "Perfecto. Para ayudarte exacto, dime una categoria: chaquetas, pantalones, delantales, gorros, combos o accesorios.";
}

function isSpecificProductQuery(text: string): boolean {
  const t = String(text || "").toLowerCase();
  const tokens = t.split(/\s+/).filter((x) => x.length >= 3);
  if (tokens.length < 3) return false;
  const genericOnly = /^(chaqueta|chaquetas|pantalon|pantalones|delantal|delantales|gorro|gorros|combo|combos|accesorio|accesorios|promo|promos|oferta|ofertas)$/i.test(
    t.trim()
  );
  return !genericOnly;
}

function buildUnsupportedAnswer(): string {
  return [
    "En este momento no vendemos ese tipo de producto.",
    "Si quieres, te ayudo con productos que si manejamos: chaquetas, pantalones, delantales, gorros, combos y accesorios.",
    "Dime que categoria te interesa y te muestro opciones reales.",
  ].join(" ");
}

type ReplyPlan = {
  text: string;
  expectedAction: string;
  assistantType: string;
};

function composeReply(input: string, customerId: string): ReplyPlan {
  const low = input.toLowerCase();
  if (isGreeting(low)) {
    return {
      text: "Hola, soy el Asesor IA Colombia Chef. Que buscas hoy: chaqueta, pantalon, delantal, gorro, combo o accesorio?",
      expectedAction: "choose_category",
      assistantType: "greeting",
    };
  }
  if (isUnsupportedRequest(low)) {
    return {
      text: buildUnsupportedAnswer(),
      expectedAction: "offer_supported_categories",
      assistantType: "unsupported_redirect",
    };
  }
  if (isConfusionSignal(low)) {
    return {
      text: buildGuidedHelpAnswer(),
      expectedAction: "choose_category",
      assistantType: "guided_help",
    };
  }
  if (isCatalogScopeQuestion(low)) {
    return {
      text: buildCatalogScopeAnswer(),
      expectedAction: "choose_category",
      assistantType: "catalog_scope",
    };
  }
  if (/(promo|oferta|descuento)/.test(low)) {
    return {
      text: buildPromoAnswer(),
      expectedAction: "offer_more_options",
      assistantType: "promo_results",
    };
  }
  const policy = buildPolicyAnswer(low);
  if (policy) {
    return {
      text: policy,
      expectedAction: "refine_or_buy",
      assistantType: "policy",
    };
  }
  if (isSpecificProductQuery(low)) {
    const searched = buildSearchAnswer(low);
    if (!/^No encontr[eé] coincidencias exactas\./i.test(searched)) {
      return { text: searched, expectedAction: "offer_more_options", assistantType: "search_results" };
    }
  }
  const byCategory = buildCategoryAnswer(low);
  if (byCategory) {
    return {
      text: byCategory,
      expectedAction: "offer_more_options",
      assistantType: "category_results",
    };
  }
  const session = getSession(customerId);
  if (session?.lastCategory && /(este|ese|esa|eso|incluye|material|se puede mojar|antifluido)/i.test(low)) {
    const retryDetail = buildProductDetailAnswer(customerId, low);
    if (retryDetail) {
      return {
        text: retryDetail,
        expectedAction: "buy_or_more",
        assistantType: "product_detail",
      };
    }
  }
  if (low.trim().length < 3) {
    return { text: buildClarifyAnswer(), expectedAction: "clarify", assistantType: "clarify" };
  }
  const searched = buildSearchAnswer(low);
  if (/^No encontre coincidencias exactas\./i.test(searched)) {
    return { text: buildClarifyAnswer(), expectedAction: "clarify", assistantType: "clarify" };
  }
  return { text: searched, expectedAction: "offer_more_options", assistantType: "search_results" };
}

function looksLikeRealMsisdn(value: string): boolean {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return false;
  if (digits.length === 10) return true;
  if (digits.length === 12 && digits.startsWith("57")) return true;
  return false;
}

function pickJidDestination(inbound: { remoteJid: string; participant: string; rawFrom: string }): string {
  const candidates = [inbound.remoteJid, inbound.participant, inbound.rawFrom]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  const explicit = candidates.find((v) => v.includes("@"));
  return explicit || "";
}

async function sendToInbound(outboundInstance: string, inbound: { from: string; remoteJid: string; participant: string; rawFrom: string }, message: string) {
  if (looksLikeRealMsisdn(inbound.from)) {
    await evolutionService.sendMessage(outboundInstance, inbound.from, message);
    return;
  }
  const jidDestination = pickJidDestination(inbound);
  if (jidDestination.includes("@")) {
    await evolutionService.sendMessageToJid(outboundInstance, jidDestination, message);
    return;
  }
  await evolutionService.sendMessage(outboundInstance, inbound.from, message);
}


export async function GET() {
  return NextResponse.json({ ok: true, service: "colombiachef-evolution-webhook", version: "1.0.0" });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    console.warn("[colombiachef-webhook] invalid_json");
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const inbound = parseInbound(body);
  if (!inbound) {
    console.log("[colombiachef-webhook] ignored no_inbound_text", {
      event: body?.event || body?.type,
      hasData: Boolean(body?.data),
    });
    return NextResponse.json({ ok: true, ignored: true, reason: "no_inbound_text" });
  }

  console.log("[colombiachef-webhook] inbound", {
    instance: inbound.instance,
    from: inbound.from,
    remoteJid: inbound.remoteJid,
    participant: inbound.participant,
    text: inbound.text.slice(0, 120),
    messageId: inbound.messageId,
  });

  if (isDuplicateMessage(inbound.messageId)) {
    console.log("[colombiachef-webhook] ignored duplicate_message", { messageId: inbound.messageId });
    return NextResponse.json({ ok: true, ignored: true, reason: "duplicate_message" });
  }

  const allowedTestNumber = String(process.env.COLOMBIACHEF_ALLOWED_TEST_NUMBER || "573154829949").replace(/\D/g, "");
  const testMode = String(process.env.COLOMBIACHEF_TEST_MODE || "true").toLowerCase() !== "false";
  if (testMode && inbound.from !== allowedTestNumber) {
    console.log("[colombiachef-webhook] ignored test_mode_number_restricted", {
      inboundFrom: inbound.from,
      allowedTestNumber,
    });
    return NextResponse.json({ ok: true, ignored: true, reason: "test_mode_number_restricted", to: inbound.from });
  }

  if (ADVISOR_NUMBER && inbound.from.replace(/\D/g, "") === ADVISOR_NUMBER) {
    return NextResponse.json({ ok: true, ignored: true, reason: "advisor_inbound_ignored" });
  }

  const outboundInstance = String(process.env.COLOMBIACHEF_EVOLUTION_INSTANCE || inbound.instance || "").trim();
  if (!outboundInstance) {
    console.error("[colombiachef-webhook] missing_instance_name");
    return NextResponse.json({ ok: false, error: "missing_instance_name" }, { status: 500 });
  }

  const customerId = inbound.from || inbound.remoteJid || inbound.participant || "sin-id";
  const normalizedText = String(inbound.text || "").trim();
  const isPurchase = isPurchaseIntent(normalizedText);
  const sessionNow = getSession(customerId);

  if (isAdvisorIntent(normalizedText)) {
    const handoff = buildPurchaseSummary(inbound.text, customerId);
    await sendToInbound(outboundInstance, inbound, `${handoff.customerReply} Si prefieres, tambien puedes escribirle directo: ${ADVISOR_LINK}`);
    if (ADVISOR_NUMBER) await evolutionService.sendMessage(outboundInstance, ADVISOR_NUMBER, handoff.advisorSummary);
    saveSession(customerId, { expectedAction: "advisor_followup", lastAssistantType: "manual_handoff" });
    return NextResponse.json({ ok: true, sent: true, to: inbound.from });
  }

  if (/^2$/.test(normalizedText) && ["offer_more_options", "buy_or_more", "refine_or_buy", "payment_choice"].includes(sessionNow?.expectedAction || "")) {
    const handoff = buildPurchaseSummary(inbound.text, customerId);
    await sendToInbound(outboundInstance, inbound, `${handoff.customerReply} Si prefieres, tambien puedes escribirle directo: ${ADVISOR_LINK}`);
    if (ADVISOR_NUMBER) await evolutionService.sendMessage(outboundInstance, ADVISOR_NUMBER, handoff.advisorSummary);
    saveSession(customerId, { expectedAction: "advisor_followup", lastAssistantType: "manual_handoff" });
    return NextResponse.json({ ok: true, sent: true, to: inbound.from });
  }

  if (/^1$/.test(normalizedText) && ["offer_more_options", "buy_or_more", "refine_or_buy"].includes(sessionNow?.expectedAction || "")) {
    const selected = sessionNow?.lastResults?.[0];
    const pending = {
      productName: selected?.name || "Producto seleccionado",
      productUrl: selected?.url || "",
      productPrice: selected?.price || "No visible",
      talla: "",
      color: "",
      cantidad: "",
      ciudad: "",
    };
    saveSession(customerId, { pendingOrder: pending, expectedAction: "checkout_collect", lastAssistantType: "checkout_start" });
    await sendToInbound(outboundInstance, inbound, "Perfecto. Para cerrar el pedido necesito: talla, color, cantidad y ciudad. Ejemplo: talla L, color negro, 2 unidades, ciudad Monteria.");
    return NextResponse.json({ ok: true, sent: true, to: inbound.from });
  }

  if (isBuyNowIntent(normalizedText) && (sessionNow?.lastResults?.length || sessionNow?.pendingOrder?.productUrl)) {
    const selected = sessionNow?.lastResults?.[0];
    const pending = sessionNow?.pendingOrder || {
      productName: selected?.name || "Producto seleccionado",
      productUrl: selected?.url || "",
      productPrice: selected?.price || "No visible",
      talla: "",
      color: "",
      cantidad: "",
      ciudad: "",
    };
    saveSession(customerId, { pendingOrder: pending, expectedAction: "checkout_collect", lastAssistantType: "checkout_start" });
    await sendToInbound(outboundInstance, inbound, "Perfecto. Para cerrar el pedido necesito: talla, color, cantidad y ciudad. Ejemplo: talla L, color negro, 2 unidades, ciudad Monteria.");
    return NextResponse.json({ ok: true, sent: true, to: inbound.from });
  }

  if (sessionNow?.expectedAction === "checkout_collect") {
    const fields = parseCheckoutFields(normalizedText);
    const pending = {
      ...(sessionNow.pendingOrder || {
        productName: sessionNow?.lastResults?.[0]?.name || "Producto seleccionado",
        productUrl: sessionNow?.lastResults?.[0]?.url || "",
        productPrice: sessionNow?.lastResults?.[0]?.price || "No visible",
        talla: "",
        color: "",
        cantidad: "",
        ciudad: "",
      }),
      ...Object.fromEntries(Object.entries(fields).filter(([, v]) => Boolean(v))),
    };
    const missing: string[] = [];
    if (!pending.talla) missing.push("talla");
    if (!pending.color) missing.push("color");
    if (!pending.cantidad) missing.push("cantidad");
    if (!pending.ciudad) missing.push("ciudad");
    saveSession(customerId, { pendingOrder: pending });
    if (missing.length) {
      await sendToInbound(outboundInstance, inbound, `Gracias. Para continuar me falta: ${missing.join(", ")}.`);
      return NextResponse.json({ ok: true, sent: true, to: inbound.from });
    }
    const summary = [
      "Resumen de tu pedido:",
      `Producto: ${pending.productName}`,
      `Referencia/URL: ${pending.productUrl}`,
      `Precio visible: ${pending.productPrice}`,
      `Talla: ${pending.talla} | Color: ${pending.color} | Cantidad: ${pending.cantidad}`,
      `Ciudad: ${pending.ciudad}`,
      "Responde: 1) Pagar ahora 2) Hablar con asesor",
    ].join("\n");
    saveSession(customerId, { expectedAction: "payment_choice", lastAssistantType: "checkout_summary", pendingOrder: pending });
    await sendToInbound(outboundInstance, inbound, summary);
    return NextResponse.json({ ok: true, sent: true, to: inbound.from });
  }

  if (sessionNow?.expectedAction === "payment_choice" && /^(1|pagar|pagar ahora)$/i.test(normalizedText)) {
    const payMsg = "Perfecto. Te comparto el enlace de pago seguro para continuar: https://colombiachef.com/finalizar-compra/ Si prefieres, tambien te paso con asesor.";
    saveSession(customerId, { expectedAction: "payment_pending", lastAssistantType: "payment_link" });
    await sendToInbound(outboundInstance, inbound, payMsg);
    return NextResponse.json({ ok: true, sent: true, to: inbound.from });
  }

  if (sessionNow?.expectedAction === "payment_choice" && /^(2|asesor|hablar con asesor)$/i.test(normalizedText)) {
    const handoff = buildPurchaseSummary(inbound.text, customerId);
    await sendToInbound(outboundInstance, inbound, handoff.customerReply);
    if (ADVISOR_NUMBER) await evolutionService.sendMessage(outboundInstance, ADVISOR_NUMBER, handoff.advisorSummary);
    saveSession(customerId, { expectedAction: "advisor_followup", lastAssistantType: "manual_handoff" });
    return NextResponse.json({ ok: true, sent: true, to: inbound.from });
  }

  const session = getSession(customerId);
  if (!session?.welcomed && isGreeting(normalizedText)) {
    saveSession(customerId, { welcomed: true });
  }

  if (isMoreOptionsIntent(normalizedText) || (isMoreInCategoryIntent(normalizedText) && Boolean(getSession(customerId)?.lastCategory))) {
    const more = buildMoreOptionsAnswer(customerId);
    if (more) {
      try {
        await sendToInbound(outboundInstance, inbound, more);
        saveSession(customerId, { expectedAction: "refine_or_buy", lastAssistantType: "more_options" });
        console.log("[colombiachef-webhook] sent_more_options", { customerId });
        return NextResponse.json({ ok: true, sent: true, to: inbound.from });
      } catch (error: any) {
        console.error("[colombiachef-webhook] send_more_options_failed", { error: error?.message || String(error) });
        return NextResponse.json({ ok: false, error: "send_failed" }, { status: 500 });
      }
    }
  }

  const refinedReply = buildRefinedFromSession(customerId, normalizedText);
  if (refinedReply) {
    try {
      await sendToInbound(outboundInstance, inbound, refinedReply);
      saveSession(customerId, { expectedAction: "buy_or_more", lastAssistantType: "refined_options" });
      console.log("[colombiachef-webhook] sent_refined_options", { customerId });
      return NextResponse.json({ ok: true, sent: true, to: inbound.from });
    } catch (error: any) {
      console.error("[colombiachef-webhook] send_refined_options_failed", { error: error?.message || String(error) });
      return NextResponse.json({ ok: false, error: "send_failed" }, { status: 500 });
    }
  }

  const detailReply = buildProductDetailAnswer(customerId, normalizedText);
  if (detailReply) {
    try {
      await sendToInbound(outboundInstance, inbound, detailReply);
      saveSession(customerId, { expectedAction: "buy_or_more", lastAssistantType: "product_detail" });
      console.log("[colombiachef-webhook] sent_product_detail", { customerId });
      return NextResponse.json({ ok: true, sent: true, to: inbound.from });
    } catch (error: any) {
      console.error("[colombiachef-webhook] send_product_detail_failed", { error: error?.message || String(error) });
      return NextResponse.json({ ok: false, error: "send_failed" }, { status: 500 });
    }
  }

  try {
    if (isPurchase) {
      const handoff = buildPurchaseSummary(inbound.text, customerId);
      await sendToInbound(outboundInstance, inbound, handoff.customerReply);
      saveSession(customerId, { expectedAction: "advisor_followup", lastAssistantType: "purchase_handoff" });
      if (ADVISOR_NUMBER) {
        await evolutionService.sendMessage(outboundInstance, ADVISOR_NUMBER, handoff.advisorSummary);
      }
      console.log("[colombiachef-webhook] purchase_handoff_sent", {
        outboundInstance,
        customerId,
        advisorNumber: ADVISOR_NUMBER,
      });
    } else {
      const sessionBeforeReply = getSession(customerId);
      if (isAffirmative(normalizedText) && sessionBeforeReply?.expectedAction === "offer_more_options") {
        const forcedMore = buildMoreOptionsAnswer(customerId);
        if (forcedMore) {
          await sendToInbound(outboundInstance, inbound, forcedMore);
          saveSession(customerId, { expectedAction: "refine_or_buy", lastAssistantType: "more_options" });
          return NextResponse.json({ ok: true, sent: true, to: inbound.from });
        }
      }
      if (isAffirmative(normalizedText) && sessionBeforeReply?.expectedAction === "offer_supported_categories") {
        const supported = "Perfecto. Te ayudo con gusto. Manejamos: chaquetas, pantalones, delantales, gorros, combos y accesorios. Cual te interesa?";
        await sendToInbound(outboundInstance, inbound, supported);
        saveSession(customerId, { expectedAction: "choose_category", lastAssistantType: "supported_categories" });
        return NextResponse.json({ ok: true, sent: true, to: inbound.from });
      }
      if (
        sessionBeforeReply?.expectedAction === "choose_category"
        && normalizedText.length <= 12
        && !categoryMatches(normalizedText)
        && !isCatalogScopeQuestion(normalizedText)
      ) {
        const chooseCategory = buildChooseCategoryAnswer();
        await sendToInbound(outboundInstance, inbound, chooseCategory);
        saveSession(customerId, { expectedAction: "choose_category", lastAssistantType: "choose_category" });
        return NextResponse.json({ ok: true, sent: true, to: inbound.from });
      }
      if (isNegative(normalizedText) && sessionBeforeReply?.expectedAction === "offer_more_options") {
        const closeReply = "Perfecto. Si quieres, te filtro por talla, color y presupuesto para darte una recomendacion exacta.";
        await sendToInbound(outboundInstance, inbound, closeReply);
        saveSession(customerId, { expectedAction: "refine", lastAssistantType: "guided_refine" });
        return NextResponse.json({ ok: true, sent: true, to: inbound.from });
      }

      const plan = composeReply(inbound.text, customerId);
      await sendToInbound(outboundInstance, inbound, plan.text);

      const category = categoryMatches(inbound.text) || getSession(customerId)?.lastCategory || "";
      const found = category ? findProductsByCategory(category, 3) : findProductsByText(inbound.text, 3);
      saveSession(customerId, {
        lastCategory: category,
        lastShownUrls: found.map((x) => x.url),
        lastResults: found.map((x) => ({ name: x.name, price: x.price, url: x.url })),
        lastUserMessage: inbound.text,
        expectedAction: plan.expectedAction,
        lastAssistantType: plan.assistantType,
      });

      console.log("[colombiachef-webhook] sent", {
        outboundInstance,
        to: inbound.from,
         replyPreview: plan.text.slice(0, 120),
      });
    }
  } catch (error: any) {
    console.error("[colombiachef-webhook] send_failed", {
      outboundInstance,
      to: inbound.from,
      error: error?.message || String(error),
    });
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent: true, to: inbound.from });
}
