export async function persistConversationTurn(args: {
  supabase: any;
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
  normalizePhone: (v: string) => string;
  normalizeRealCustomerPhone: (v: string) => string;
  phoneTail10: (v: string) => string;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const fromReal = args.normalizeRealCustomerPhone(args.from || "");
  const fromNorm = args.normalizePhone(args.from || "");
  const fromKey = fromReal || fromNorm;
  const fromTail = args.phoneTail10(fromKey || args.from || "");
  const contactFilter = fromTail ? `contact_phone.eq.${fromKey},contact_phone.like.%${fromTail}` : `contact_phone.eq.${fromKey}`;

  const { data: existing } = await args.supabase
    .from("agent_conversations")
    .select("id,transcript,message_count,metadata")
    .eq("agent_id", args.agentId)
    .eq("channel", "whatsapp")
    .or(contactFilter)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextItems = [
    { role: "user", content: args.inboundText, timestamp: nowIso },
    { role: "assistant", content: args.outboundText, timestamp: nowIso },
  ];

  if (existing?.id) {
    const currentTranscript = Array.isArray(existing.transcript) ? existing.transcript : [];
    const currentMeta = existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {};

    if (args.messageId && String((currentMeta as any)?.last_inbound_message_id || "") === args.messageId) return;

    const mergedTranscript = [...currentTranscript, ...nextItems].slice(-80);
    const currentCount = Number(existing.message_count || 0) || 0;
    await args.supabase
      .from("agent_conversations")
      .update({
        ...(args.contactName ? { contact_name: args.contactName } : {}),
        transcript: mergedTranscript,
        message_count: currentCount + 2,
        status: "completed",
        ended_at: nowIso,
        metadata: {
          ...currentMeta,
          owner_id: args.ownerId,
          last_inbound_message_id: args.messageId || (currentMeta as any)?.last_inbound_message_id || null,
          whatsapp_memory: {
            ...((currentMeta as any)?.whatsapp_memory && typeof (currentMeta as any).whatsapp_memory === "object" ? (currentMeta as any).whatsapp_memory : {}),
            ...(args.memory && typeof args.memory === "object" ? args.memory : {}),
            updated_at: nowIso,
          },
        },
      })
      .eq("id", existing.id);
    return;
  }

  await args.supabase.from("agent_conversations").insert({
    agent_id: args.agentId,
    tenant_id: args.tenantId || null,
    contact_name: args.contactName || args.pushName || args.from,
    contact_phone: fromReal || fromNorm || args.from,
    channel: "whatsapp",
    status: "completed",
    message_count: 2,
    duration_seconds: 0,
    credits_used: 0,
    transcript: nextItems,
    metadata: {
      owner_id: args.ownerId,
      source: "evolution_webhook",
      last_inbound_message_id: args.messageId || null,
      whatsapp_memory: {
        ...(args.memory && typeof args.memory === "object" ? args.memory : {}),
        updated_at: nowIso,
      },
    },
    started_at: nowIso,
    ended_at: nowIso,
  });
}

export async function reserveIncomingMessage(supabase: any, args: {
  provider: string;
  providerMessageId: string;
  instance?: string;
  fromPhone?: string;
  payload?: any;
}): Promise<{ ok: boolean; duplicate: boolean }> {
  const providerMessageId = String(args.providerMessageId || "").trim();
  if (!providerMessageId) return { ok: true, duplicate: false };

  const { error } = await supabase.from("incoming_messages").insert({
    provider: String(args.provider || "evolution").trim() || "evolution",
    provider_message_id: providerMessageId,
    instance_name: String(args.instance || "").trim() || null,
    from_phone: String(args.fromPhone || "").trim() || null,
    payload: args.payload && typeof args.payload === "object" ? args.payload : null,
    status: "received",
  });

  if (!error) return { ok: true, duplicate: false };
  const code = String((error as any)?.code || "").trim();
  const msg = String((error as any)?.message || "").toLowerCase();
  if (code === "23505" || msg.includes("duplicate key") || msg.includes("unique constraint")) return { ok: true, duplicate: true };
  if (msg.includes("relation") && msg.includes("incoming_messages")) return { ok: true, duplicate: false };
  console.warn("[evolution-webhook] reserve incoming failed", (error as any)?.message || error);
  return { ok: false, duplicate: false };
}

export async function markIncomingMessageProcessed(supabase: any, args: {
  provider: string;
  providerMessageId: string;
}): Promise<void> {
  const provider = String(args.provider || "evolution").trim() || "evolution";
  const providerMessageId = String(args.providerMessageId || "").trim();
  if (!providerMessageId) return;
  await supabase
    .from("incoming_messages")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("provider", provider)
    .eq("provider_message_id", providerMessageId);
}

export function buildDocumentContext(message: string, files: { name: string; content: string }[]) {
  if (!files.length) return "";
  const terms = Array.from(new Set(String(message || "").toLowerCase().split(/[^a-z0-9áéíóúñü]+/i).map((t) => t.trim()).filter((t) => t.length >= 4))).slice(0, 8);
  const ranked = files.map((f) => {
    const lc = f.content.toLowerCase();
    const score = terms.reduce((acc, t) => (lc.includes(t) ? acc + 1 : acc), 0);
    return { ...f, score };
  }).sort((a, b) => b.score - a.score);

  const selected = ranked.filter((f) => f.score > 0).slice(0, 3);
  const fallback = selected.length ? selected : ranked.slice(0, 2);
  const blocks = fallback.map((f) => {
    const lc = f.content.toLowerCase();
    const firstHit = terms.map((t) => lc.indexOf(t)).find((i) => i >= 0) ?? -1;
    const start = firstHit >= 0 ? Math.max(0, firstHit - 700) : 0;
    const end = Math.min(f.content.length, start + 1800);
    const excerpt = f.content.slice(start, end).trim();
    return `\n--- ${f.name} ---\n${excerpt}`;
  });

  return `\n\nDocumentos indexados (extractos):\n${blocks.join("\n")}`;
}
