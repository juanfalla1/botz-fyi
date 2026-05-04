export async function sendStrictQuickText(args: {
  replyText: string;
  inboundText: string;
  inboundFrom: string;
  inboundAlternates?: string[];
  inboundJidCandidates?: string[];
  outboundInstance: string;
  normalizePhone: (v: string) => string;
  withAvaSignature: (v: string) => string;
  enforceWhatsAppDelivery: (text: string, inboundText: string) => string;
  sendMessage: (instance: string, to: string, msg: string) => Promise<any>;
  sendMessageToJid: (instance: string, jid: string, msg: string) => Promise<any>;
}): Promise<boolean> {
  const msg = args.withAvaSignature(args.enforceWhatsAppDelivery(args.replyText, args.inboundText));
  const quickTo = [args.inboundFrom, ...(args.inboundAlternates || [])]
    .map((n) => args.normalizePhone(String(n || "")))
    .filter((n, i, arr) => n && arr.indexOf(n) === i)
    .filter((n) => n.length >= 10 && n.length <= 15);
  for (const to of quickTo) {
    try {
      await args.sendMessage(args.outboundInstance, to, msg);
      return true;
    } catch {
      continue;
    }
  }
  const quickJids = (args.inboundJidCandidates || [])
    .map((v) => String(v || "").trim())
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .filter((v) => /@(lid|s\.whatsapp\.net|c\.us)$/i.test(v));
  for (const jid of quickJids) {
    try {
      await args.sendMessageToJid(args.outboundInstance, jid, msg);
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

export function buildStrictDeliveryCandidates(args: {
  agentPhone: string;
  inboundFrom: string;
  inboundFromIsLid?: boolean;
  inboundAlternates?: string[];
  inboundJidCandidates?: string[];
  payloadDestination?: string;
  payloadDataDestination?: string;
  payloadSender?: string;
  payloadDataSender?: string;
  normalizePhone: (v: string) => string;
}): { toCandidates: string[]; jidCandidates: string[] } {
  const selfHints = [
    args.agentPhone,
    args.normalizePhone(String(args.payloadDestination || "")),
    args.normalizePhone(String(args.payloadDataDestination || "")),
    args.normalizePhone(String(args.payloadSender || "")),
    args.normalizePhone(String(args.payloadDataSender || "")),
  ]
    .filter((n) => n.length >= 10 && n.length <= 15)
    .filter((n, i, arr) => arr.indexOf(n) === i);
  const selfSet = new Set(selfHints);

  const toCandidates = [args.inboundFrom, ...(args.inboundAlternates || [])]
    .map((n) => args.normalizePhone(String(n || "")))
    .filter((n, i, arr) => n && arr.indexOf(n) === i)
    .filter((n) => !(Boolean(args.inboundFromIsLid) && n === args.inboundFrom))
    .filter((n) => !selfSet.has(n))
    .filter((n) => n.length >= 10 && n.length <= 15);

  const jidCandidates = (args.inboundJidCandidates || [])
    .map((v) => String(v || "").trim())
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .filter((v) => /@(lid|s\.whatsapp\.net|c\.us)$/i.test(v))
    .filter((v) => !selfSet.has(args.normalizePhone(v)));

  return { toCandidates, jidCandidates };
}

export async function sendStrictTextAndDocs(args: {
  replyText: string;
  inboundText: string;
  outboundInstance: string;
  toCandidates: string[];
  jidCandidates: string[];
  withAvaSignature: (v: string) => string;
  enforceWhatsAppDelivery: (text: string, inboundText: string) => string;
  sendMessage: (instance: string, to: string, msg: string) => Promise<any>;
  sendMessageToJid: (instance: string, jid: string, msg: string) => Promise<any>;
  sendDocument: (instance: string, to: string, doc: { base64: string; fileName: string; caption: string; mimetype: string }) => Promise<any>;
  safeFileName: (fileName: string, fallbackBase: string, fallbackExt: string) => string;
  docs: Array<{ base64: string; fileName: string; mimetype: string; caption?: string }>;
}): Promise<{ ok: boolean; sentTo: string }> {
  const msg = args.withAvaSignature(args.enforceWhatsAppDelivery(args.replyText, args.inboundText));
  let sentTo = "";
  for (const to of args.toCandidates) {
    try {
      await args.sendMessage(args.outboundInstance, to, msg);
      sentTo = to;
      break;
    } catch {
      continue;
    }
  }
  if (!sentTo) {
    for (const jid of args.jidCandidates) {
      try {
        await args.sendMessageToJid(args.outboundInstance, jid, msg);
        sentTo = jid;
        break;
      } catch {
        continue;
      }
    }
  }
  if (!sentTo) return { ok: false, sentTo: "" };

  const docDestinations = [sentTo, ...args.toCandidates, ...args.jidCandidates]
    .map((v) => String(v || "").trim())
    .filter((v, i, arr) => v && arr.indexOf(v) === i);

  for (const d of args.docs) {
    const docFile = String(d.fileName || "").toLowerCase();
    const docCaption = String(d.caption || "").toLowerCase();
    const isQuoteDoc = /cotiz|quote/.test(docFile) || /cotiz|quote/.test(docCaption);
    let deliveredDoc = false;
    for (const dst of docDestinations) {
      try {
        await args.sendDocument(args.outboundInstance, dst, {
          base64: d.base64,
          fileName: args.safeFileName(d.fileName, isQuoteDoc ? "cotizacion" : "ficha-tecnica", "pdf"),
          caption: d.caption || (isQuoteDoc ? "Cotización" : "Ficha técnica"),
          mimetype: d.mimetype || "application/pdf",
        });
        deliveredDoc = true;
        break;
      } catch {
        continue;
      }
    }
    if (!deliveredDoc) {
      await args.sendMessage(
        args.outboundInstance,
        sentTo,
        isQuoteDoc
          ? "Intenté enviarte la cotización PDF, pero falló en este intento. Si escribes 'reenviar cotizacion', la reintento ahora mismo."
          : "Intenté enviarte la ficha técnica, pero falló en este intento. Escribe 'reenviar ficha' y lo reintento ahora mismo."
      );
      break;
    }
  }

  return { ok: true, sentTo };
}

export async function finalizeStrictTurnDelivery(args: any): Promise<{ handled: boolean; strictReply: string }> {
  let strictReply = String(args.strictReply || "");
  const strictAssetDelivered = Array.isArray(args.strictDocs) && args.strictDocs.length > 0;
  const strictQuoteDelivered = (args.strictDocs || []).some((d: any) => /cotiz/i.test(`${String(d?.caption || "")} ${String(d?.fileName || "")}`));

  if (!String(strictReply || "").trim() && strictAssetDelivered) {
    strictReply = strictQuoteDelivered
      ? "Listo. Te envié la cotización por este WhatsApp."
      : "Listo. Te envié la ficha técnica por este WhatsApp.";
  }
  if (strictAssetDelivered && String(strictReply || "").trim()) {
    strictReply = args.appendAdvisorAppointmentPrompt(strictReply);
    strictReply = args.appendQuoteClosurePrompt(strictReply);
    args.strictMemory.awaiting_action = "conversation_followup";
    args.strictMemory.conversation_status = "open";
    args.strictMemory.last_intent = strictQuoteDelivered ? "quote_generated" : "tech_sheet_request";
    if (strictQuoteDelivered) args.strictMemory.quote_feedback_due_at = args.isoAfterHours(24);
  }

  args.strictMemory.last_valid_state = String(args.strictMemory.awaiting_action || args.awaiting || "none");
  args.logStrictTransition({
    before: args.awaiting,
    after: String(args.strictMemory.awaiting_action || "none"),
    text: args.text,
    intent: String(args.strictMemory.last_intent || args.previousMemory?.last_intent || "strict_router"),
  });

  if (!String(strictReply || "").trim()) {
    const awaitingNow = String(args.strictMemory.awaiting_action || args.awaiting || "").trim();
    strictReply = args.buildStrictQuoteFallbackReply(awaitingNow);
    console.warn("[evolution-webhook] strict_reply_empty_before_send", { awaiting: awaitingNow, text: args.text });
  }

  if (args.strictBypassAutoQuote) {
    return { handled: false, strictReply };
  }

  const sendResult = await args.sendTextAndDocs(strictReply, args.strictDocs);
  if (!sendResult.ok) {
    return { handled: true, strictReply: "" };
  }

  const pendingVideoLink = String(args.strictMemory.pending_post_quote_video_link || "").trim();
  if (pendingVideoLink && strictQuoteDelivered && String(sendResult.sentTo || "").trim()) {
    try {
      await args.evolutionService.sendMessage(
        args.outboundInstance,
        String(sendResult.sentTo || "").trim(),
        args.withAvaSignature(`Video del equipo:\n${pendingVideoLink}`)
      );
    } catch {}
    args.strictMemory.pending_post_quote_video_link = "";
  }

  try {
    await args.syncCrmLifecycleAndMeeting({
      memory: args.strictMemory,
      previous: args.previousMemory,
      source: "evolution_strict_webhook",
      externalRefSuffix: "reply",
    });
    await args.persistCurrentTurn(strictReply, args.strictMemory);
  } catch {}

  await args.markIncomingMessageProcessed(args.supabase as any, args.incomingDedupKey);
  args.safeLogPhase1Invariants({
    inboundText: args.inbound.text,
    outboundText: strictReply,
    strict: true,
    route: "strict",
    intent: String(args.strictMemory?.last_intent || args.classifiedIntent?.intent || "strict_turn"),
    awaitingAction: String(args.strictMemory?.awaiting_action || ""),
  });

  return { handled: true, strictReply };
}
