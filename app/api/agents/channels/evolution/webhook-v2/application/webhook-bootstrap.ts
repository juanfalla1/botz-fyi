type InboundPayload = {
  instance: string;
  from: string;
  text: string;
  messageId?: string;
};

export async function resolveChannelAndAgent(args: {
  supabase: any;
  inbound: InboundPayload;
  normalizePhone: (raw: string) => string;
}): Promise<{
  channel: any | null;
  channelError?: string;
  agent: any | null;
  agentError?: string;
  agentPhone: string;
  configuredSelfPhoneRaw: string;
}> {
  const { supabase, inbound, normalizePhone } = args;
  const { data: channels, error: chErr } = await supabase
    .from("agent_channel_connections")
    .select("id,assigned_agent_id,created_by,status,config")
    .eq("provider", "evolution")
    .eq("channel_type", "whatsapp");

  if (chErr) {
    return { channel: null, channelError: chErr.message, agent: null, agentPhone: "", configuredSelfPhoneRaw: "" };
  }

  const byInstance = (channels || []).filter(
    (row: any) => String(row?.config?.evolution_instance_name || "") === inbound.instance
  );

  let channel =
    byInstance.find((row: any) => String(row?.status || "").toLowerCase() === "connected") ||
    byInstance[0] ||
    null;

  if (!channel) {
    const connectedAny = (channels || []).filter(
      (row: any) => String(row?.status || "").toLowerCase() === "connected"
    );
    if (connectedAny.length === 1) {
      channel = connectedAny[0];
    } else if ((channels || []).length === 1) {
      channel = (channels || [])[0];
    }
  }

  if (!channel) {
    return { channel: null, agent: null, agentPhone: "", configuredSelfPhoneRaw: "" };
  }

  const configuredSelfPhoneRaw = String(
    channel?.config?.phone ||
    channel?.config?.number ||
    channel?.config?.owner ||
    channel?.config?.wid ||
    channel?.config?.me ||
    ""
  );
  const agentPhone = normalizePhone(configuredSelfPhoneRaw);

  if (!channel.assigned_agent_id) {
    return {
      channel,
      agent: null,
      agentError: "agent_not_assigned",
      agentPhone,
      configuredSelfPhoneRaw,
    };
  }

  const { data: agent, error: agentErr } = await supabase
    .from("ai_agents")
    .select("id,name,status,description,created_by,tenant_id,configuration")
    .eq("id", String(channel.assigned_agent_id))
    .maybeSingle();

  if (agentErr) {
    return {
      channel,
      channelError: undefined,
      agent: null,
      agentError: agentErr.message,
      agentPhone,
      configuredSelfPhoneRaw,
    };
  }

  return { channel, agent: agent || null, agentPhone, configuredSelfPhoneRaw };
}

export function shouldIgnoreDuplicateRecentText(args: {
  previousMemory: any;
  inboundText: string;
  normalizeText: (text: string) => string;
  isStrictQuoteSelectionStep: (awaiting: string) => boolean;
  isOptionOnlyReply: (text: string) => boolean;
}): boolean {
  const { previousMemory, inboundText, normalizeText, isStrictQuoteSelectionStep, isOptionOnlyReply } = args;
  const prevTextNorm = normalizeText(String(previousMemory?.last_user_text || ""));
  const currTextNorm = normalizeText(String(inboundText || ""));
  const prevUserAtMs = Date.parse(String(previousMemory?.last_user_at || ""));
  const awaitingForDedup = String(previousMemory?.awaiting_action || "");
  const isStrictSelectionStep = isStrictQuoteSelectionStep(awaitingForDedup);
  const isShortOptionReply = isOptionOnlyReply(currTextNorm);

  return Boolean(
    prevTextNorm &&
    currTextNorm &&
    prevTextNorm === currTextNorm &&
    Number.isFinite(prevUserAtMs) &&
    Date.now() - prevUserAtMs < 45_000 &&
    !isStrictSelectionStep &&
    !isShortOptionReply
  );
}
