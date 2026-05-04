export async function persistAdvisorMeetingSelection(args: {
  supabase: any;
  upsertCrmLifecycleState: (supabase: any, args: {
    ownerId: string;
    tenantId?: string | null;
    phone: string;
    realPhone?: string;
    name?: string;
    status?: string;
    nextAction?: string;
    nextActionAt?: string;
    metadata?: Record<string, any>;
  }) => Promise<any>;
  mirrorAdvisorMeetingToAvanza: (args: {
    ownerId: string;
    tenantId?: string | null;
    externalRef: string;
    phone: string;
    customerName: string;
    advisor: string;
    meetingAt: string;
    meetingLabel: string;
    source?: string;
  }) => Promise<void>;
  persistConversationTurn: (supabase: any, args: {
    agentId: string;
    ownerId: string;
    tenantId?: string | null;
    from: string;
    pushName?: string;
    inboundText: string;
    outboundText: string;
    messageId?: string;
    memory?: Record<string, any>;
    contactName?: string;
  }) => Promise<void>;
  isoAfterHours: (hours: number) => string;
  ownerId: string;
  tenantId?: string | null;
  inboundFrom: string;
  inboundPushName?: string;
  inboundText: string;
  inboundMessageId?: string;
  incomingDedupKey: string;
  knownCustomerName: string;
  previousCustomerPhone: string;
  strictMemory: Record<string, any>;
  strictReply: string;
  agentId: string;
}): Promise<void> {
  const {
    supabase,
    upsertCrmLifecycleState,
    mirrorAdvisorMeetingToAvanza,
    persistConversationTurn,
    isoAfterHours,
    ownerId,
    tenantId,
    inboundFrom,
    inboundPushName,
    inboundText,
    inboundMessageId,
    incomingDedupKey,
    knownCustomerName,
    previousCustomerPhone,
    strictMemory,
    strictReply,
    agentId,
  } = args;

  const strictMeetingAt = String(strictMemory.advisor_meeting_at || "").trim();
  await upsertCrmLifecycleState(supabase as any, {
    ownerId,
    tenantId: tenantId || null,
    phone: inboundFrom,
    realPhone: String(strictMemory.customer_phone || previousCustomerPhone || ""),
    name: knownCustomerName || inboundPushName || "",
    status: "quote",
    nextAction: strictMeetingAt ? "Llamar cliente (cita WhatsApp)" : "Seguimiento cotizacion",
    nextActionAt: strictMeetingAt || isoAfterHours(24),
    metadata: {
      source: "evolution_strict_webhook",
      advisor_meeting_at: strictMeetingAt,
      advisor_meeting_label: String(strictMemory.advisor_meeting_label || ""),
    },
  });
  if (strictMeetingAt) {
    await mirrorAdvisorMeetingToAvanza({
      ownerId,
      tenantId: tenantId || null,
      externalRef: String(inboundMessageId || incomingDedupKey || "slot"),
      phone: inboundFrom,
      customerName: knownCustomerName || inboundPushName || inboundFrom,
      advisor: "Asesor comercial",
      meetingAt: strictMeetingAt,
      meetingLabel: String(strictMemory.advisor_meeting_label || ""),
      source: "evolution_strict_webhook",
    });
  }
  await persistConversationTurn(supabase as any, {
    agentId: String(agentId),
    ownerId,
    tenantId: tenantId || null,
    from: inboundFrom,
    pushName: inboundPushName,
    contactName: knownCustomerName || inboundPushName || inboundFrom,
    inboundText,
    outboundText: strictReply,
    messageId: inboundMessageId,
    memory: strictMemory,
  });
}

export function resolveAdvisorMeetingReply(args: {
  slot: { iso: string; label: string } | null;
  compactReprompt?: boolean;
}): {
  reply: string;
  awaitingAction: string;
  conversationStatus?: string;
  advisorMeetingAt?: string;
  advisorMeetingLabel?: string;
  scheduled: boolean;
} {
  const { slot, compactReprompt } = args;
  if (!slot) {
    const reprompt = compactReprompt
      ? "Para agendar con asesor, responde 1, 2 o 3 según el horario."
      : [
          "Para agendar con asesor, responde 1, 2 o 3 según el horario.",
          "1) Hoy (en las próximas horas)",
          "2) Mañana 9:00 am",
          "3) Esta semana (próximo disponible)",
        ].join("\n");
    return {
      reply: reprompt,
      awaitingAction: "advisor_meeting_slot",
      scheduled: false,
    };
  }
  return {
    reply: `Perfecto. Agendé la gestión con asesor para ${slot.label}. Te contactaremos en ese horario por WhatsApp o llamada.`,
    awaitingAction: "conversation_followup",
    conversationStatus: "open",
    advisorMeetingAt: slot.iso,
    advisorMeetingLabel: slot.label,
    scheduled: true,
  };
}
