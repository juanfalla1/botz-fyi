type PersistTurnArgs = {
  supabase: any;
  persistConversationTurn: (supabase: any, args: Record<string, any>) => Promise<any>;
  agentId: string;
  ownerId: string;
  tenantId: string | null;
  inbound: {
    from: string;
    pushName?: string;
    text?: string;
    messageId?: string;
  };
  knownCustomerName?: string;
  outboundText: string;
  memory: Record<string, any>;
};

type SyncLifecycleArgs = {
  supabase: any;
  ownerId: string;
  tenantId: string | null;
  inbound: {
    from: string;
    pushName?: string;
    messageId?: string;
  };
  knownCustomerName?: string;
  incomingDedupKey?: string;
  memory: Record<string, any>;
  previous?: Record<string, any>;
  source: string;
  externalRefSuffix: string;
  isoAfterHours: (hours: number) => string;
  upsertCrmLifecycleState: (supabase: any, args: Record<string, any>) => Promise<any>;
  mirrorAdvisorMeetingToAvanza: (args: Record<string, any>) => Promise<any>;
};

export async function persistCurrentTurnWithContext(args: PersistTurnArgs) {
  const contactName = String(args.knownCustomerName || args.inbound.pushName || args.inbound.from || "");
  await args.persistConversationTurn(args.supabase, {
    agentId: args.agentId,
    ownerId: args.ownerId,
    tenantId: args.tenantId,
    from: args.inbound.from,
    pushName: args.inbound.pushName,
    contactName,
    inboundText: args.inbound.text,
    outboundText: args.outboundText,
    messageId: args.inbound.messageId,
    memory: args.memory,
  });
}

export async function syncCrmLifecycleAndMeetingWithContext(args: SyncLifecycleArgs) {
  const previous = args.previous || {};
  const closed = String(args.memory.conversation_status || "") === "closed";
  const quoteContext =
    Boolean(args.memory.last_quote_draft_id || args.memory.last_quote_pdf_sent_at || previous?.last_quote_draft_id || previous?.last_quote_pdf_sent_at) ||
    /(quote_generated|quote_recall|price_request)/.test(String(args.memory.last_intent || previous?.last_intent || ""));
  const nextAction = closed
    ? (quoteContext ? "Recordatorio feedback cotizacion" : "Seguimiento WhatsApp")
    : (quoteContext ? "Seguimiento cotizacion" : "");
  const nextActionAt = closed
    ? (quoteContext ? args.isoAfterHours(24) : args.isoAfterHours(48))
    : (quoteContext ? args.isoAfterHours(24) : "");
  const meetingAt = String(args.memory.advisor_meeting_at || previous?.advisor_meeting_at || "").trim();
  const meetingLabel = String(args.memory.advisor_meeting_label || previous?.advisor_meeting_label || "");

  await args.upsertCrmLifecycleState(args.supabase, {
    ownerId: args.ownerId,
    tenantId: args.tenantId,
    phone: args.inbound.from,
    realPhone: String(args.memory.customer_phone || previous?.customer_phone || ""),
    name: String(args.knownCustomerName || args.inbound.pushName || ""),
    status: quoteContext ? "quote" : undefined,
    nextAction: meetingAt ? "Llamar cliente (cita WhatsApp)" : (nextAction || undefined),
    nextActionAt: meetingAt || nextActionAt || undefined,
    metadata: {
      source: args.source,
      conversation_status: String(args.memory.conversation_status || "open"),
      last_intent: String(args.memory.last_intent || ""),
      quote_feedback_due_at: String(args.memory.quote_feedback_due_at || ""),
      advisor_meeting_at: meetingAt,
      advisor_meeting_label: meetingLabel,
    },
  });

  if (!meetingAt) return;
  await args.mirrorAdvisorMeetingToAvanza({
    ownerId: args.ownerId,
    tenantId: args.tenantId,
    externalRef: String(args.inbound.messageId || args.incomingDedupKey || args.externalRefSuffix),
    phone: args.inbound.from,
    customerName: String(args.knownCustomerName || args.inbound.pushName || args.inbound.from || ""),
    advisor: "Asesor comercial",
    meetingAt,
    meetingLabel,
    source: args.source,
  });
}
