import { NextRequest, NextResponse } from "next/server";
import { evolutionService } from "../../../../../../../lib/services/evolution.service";
import { categoryMatches, findProductByUrl, findProductsByCategory, findProductsByText, loadCatalog } from "../_lib/catalog";
import { parseInbound } from "../_lib/evolution-payload";
import { isCatalogScopeQuestion, isGreeting, isMoreOptionsIntent, isPurchaseIntent, isUnsupportedRequest } from "../_lib/intent";
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
  const found = findProductsByText(input, 3);
  if (!found.length) {
    return "No encontré coincidencias exactas. Dime categoría (chaquetas, pantalones, delantales, gorros, combos o accesorios), talla y presupuesto y te ayudo a elegir.";
  }
  const lines = found.map((p, i) => {
    const notes = [p.availability_notes, p.shipping_notes].filter(Boolean).join(". ");
    return formatOptionLine(i + 1, p.name, p.price, p.url, notes, p.sizes);
  });
  return ["Te encontré estas opciones:", ...lines].join("\n");
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

function formatOptionLine(index: number, name: string, price: string, url: string, notes?: string, sizes?: string[]): string {
  const sizeLabel = sizes && sizes.length ? `Tallas visibles: ${sizes.join(", ")}` : "No veo talla visible para ese producto en este momento.";
  const row = `${index}) ${compactName(name)} | ${visiblePrice(price)}\n${url}`;
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
    .replace(/\s+/g, " ")
    .trim();
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

  const desc = cleanDescription(picked.description);
  const sizeText = picked.sizes?.length ? `Tallas visibles: ${picked.sizes.join(", ")}.` : "No veo talla visible en la ficha.";
  const colorText = picked.colors?.length ? `Colores visibles: ${picked.colors.join(", ")}.` : "No veo colores visibles en la ficha.";
  const notes = [picked.availability_notes, picked.shipping_notes].filter(Boolean).join(" ");

  return [
    `Sobre ${picked.name}:`,
    desc ? desc : "No veo descripcion tecnica completa en la ficha publica.",
    sizeText,
    colorText,
    notes ? `Nota de ficha: ${notes}` : "",
    `URL: ${picked.url}`,
    "Si necesitas confirmar si se puede mojar o nivel de antifluido exacto, te lo valido con asesor antes de comprar.",
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

function buildUnsupportedAnswer(): string {
  return [
    "En este momento no vendemos ese tipo de producto.",
    "Si quieres, te ayudo con productos que si manejamos: chaquetas, pantalones, delantales, gorros, combos y accesorios.",
    "Dime que categoria te interesa y te muestro opciones reales.",
  ].join(" ");
}

function composeReply(input: string): string {
  const low = input.toLowerCase();
  if (isGreeting(low)) {
    return "Hola, soy el Asesor IA Colombia Chef. Que buscas hoy: chaqueta, pantalon, delantal, gorro, combo o accesorio?";
  }
  if (isUnsupportedRequest(low)) return buildUnsupportedAnswer();
  if (isCatalogScopeQuestion(low)) return buildCatalogScopeAnswer();
  if (/(promo|oferta|descuento)/.test(low)) return buildPromoAnswer();
  const policy = buildPolicyAnswer(low);
  if (policy) return policy;
  const byCategory = buildCategoryAnswer(low);
  if (byCategory) return byCategory;
  if (low.trim().length >= 3) return buildSearchAnswer(low);
  return buildFallback();
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

  const session = getSession(customerId);
  if (!session?.welcomed && isGreeting(normalizedText)) {
    saveSession(customerId, { welcomed: true });
  }

  if (isMoreOptionsIntent(normalizedText)) {
    const more = buildMoreOptionsAnswer(customerId);
    if (more) {
      try {
        await sendToInbound(outboundInstance, inbound, more);
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
      if (ADVISOR_NUMBER) {
        await evolutionService.sendMessage(outboundInstance, ADVISOR_NUMBER, handoff.advisorSummary);
      }
      console.log("[colombiachef-webhook] purchase_handoff_sent", {
        outboundInstance,
        customerId,
        advisorNumber: ADVISOR_NUMBER,
      });
    } else {
      const reply = composeReply(inbound.text);
      await sendToInbound(outboundInstance, inbound, reply);

      const category = categoryMatches(inbound.text) || getSession(customerId)?.lastCategory || "";
      const found = category ? findProductsByCategory(category, 3) : findProductsByText(inbound.text, 3);
      saveSession(customerId, {
        lastCategory: category,
        lastShownUrls: found.map((x) => x.url),
        lastResults: found.map((x) => ({ name: x.name, price: x.price, url: x.url })),
        lastUserMessage: inbound.text,
      });

      console.log("[colombiachef-webhook] sent", {
        outboundInstance,
        to: inbound.from,
        replyPreview: reply.slice(0, 120),
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
