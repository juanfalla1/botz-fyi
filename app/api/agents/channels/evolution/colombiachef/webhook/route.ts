import { NextRequest, NextResponse } from "next/server";
import { evolutionService } from "../../../../../../../lib/services/evolution.service";
import { categoryMatches, findProductsByCategory, findProductsByText, loadCatalog } from "../_lib/catalog";
import { parseInbound } from "../_lib/evolution-payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildCategoryAnswer(input: string): string | null {
  const category = categoryMatches(input);
  if (!category) return null;
  const items = findProductsByCategory(category, 6);
  if (!items.length) {
    return `Por ahora no tengo productos listados en ${category}. ¿Quieres que te pase otras categorías?`;
  }

  const lines = items.map((p) => {
    const price = p.price || "Precio por confirmar";
    return `- ${p.name} | ${price} | ${p.url}`;
  });
  return `Perfecto, te comparto opciones en *${category}*:\n${lines.join("\n")}\n\nSi me dices talla, color y presupuesto te recomiendo la mejor opción.`;
}

function buildPolicyAnswer(input: string): string | null {
  const t = input.toLowerCase();
  const data = loadCatalog();
  const policies = data.business?.policies || [];
  if (!policies.length) return null;

  if (/(envio|envios|entrega|domicilio)/.test(t)) {
    return `Claro. Para envíos y condiciones de compra revisa:\n${policies.join("\n")}`;
  }
  if (/(cambio|devolucion|garantia|politica|faq)/.test(t)) {
    return `Te comparto políticas oficiales de Colombia Chef:\n${policies.join("\n")}`;
  }
  return null;
}

function buildPromoAnswer(): string {
  const promos = findProductsByCategory("Promos", 8);
  if (!promos.length) return "En este momento no me aparecen promos activas. Si quieres, te busco por categoría.";
  const lines = promos.map((p) => `- ${p.name} | ${p.price || "Precio por confirmar"} | ${p.url}`);
  return `Estas son algunas promociones activas:\n${lines.join("\n")}`;
}

function buildSearchAnswer(input: string): string {
  const found = findProductsByText(input, 5);
  if (!found.length) {
    return "No encontré coincidencias exactas. Dime categoría (chaquetas, pantalones, delantales, gorros, combos o accesorios), talla y presupuesto y te ayudo a elegir.";
  }
  const lines = found.map((p) => {
    const notes = [p.availability_notes, p.shipping_notes].filter(Boolean).join(" | ");
    return `- ${p.name} | ${p.price || "Precio por confirmar"} | ${p.url}${notes ? ` | ${notes}` : ""}`;
  });
  return `Te encontré estas opciones:\n${lines.join("\n")}`;
}

function buildFallback(): string {
  return [
    "Hola, soy el asistente comercial de Colombia Chef.",
    "Te ayudo a encontrar uniforme por categoría, talla y presupuesto.",
    "Categorías: Chaquetas, Pantalones, Delantales, Gorros, Combos, Accesorios y Promos.",
    "Escríbeme por ejemplo: 'chaqueta negra talla M hasta 120000'.",
  ].join(" ");
}

function composeReply(input: string): string {
  const low = input.toLowerCase();
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

  const allowedTestNumber = String(process.env.COLOMBIACHEF_ALLOWED_TEST_NUMBER || "573154829949").replace(/\D/g, "");
  const testMode = String(process.env.COLOMBIACHEF_TEST_MODE || "true").toLowerCase() !== "false";
  if (testMode && inbound.from !== allowedTestNumber) {
    console.log("[colombiachef-webhook] ignored test_mode_number_restricted", {
      inboundFrom: inbound.from,
      allowedTestNumber,
    });
    return NextResponse.json({ ok: true, ignored: true, reason: "test_mode_number_restricted", to: inbound.from });
  }

  const outboundInstance = String(process.env.COLOMBIACHEF_EVOLUTION_INSTANCE || inbound.instance || "").trim();
  if (!outboundInstance) {
    console.error("[colombiachef-webhook] missing_instance_name");
    return NextResponse.json({ ok: false, error: "missing_instance_name" }, { status: 500 });
  }

  const reply = composeReply(inbound.text);
  try {
    if (looksLikeRealMsisdn(inbound.from)) {
      await evolutionService.sendMessage(outboundInstance, inbound.from, reply);
    } else {
      const jidDestination = pickJidDestination(inbound);
      if (jidDestination.includes("@")) {
        await evolutionService.sendMessageToJid(outboundInstance, jidDestination, reply);
      } else {
        await evolutionService.sendMessage(outboundInstance, inbound.from, reply);
      }
    }
    console.log("[colombiachef-webhook] sent", {
      outboundInstance,
      to: inbound.from,
      replyPreview: reply.slice(0, 120),
    });
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
