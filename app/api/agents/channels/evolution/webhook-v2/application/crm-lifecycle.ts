export function isoAfterHours(hours: number): string {
  return new Date(Date.now() + Math.max(1, hours) * 60 * 60 * 1000).toISOString();
}

export async function persistKnownNameInCrm(args: {
  supabase: any;
  ownerId: string;
  tenantId?: string | null;
  phone: string;
  name: string;
  normalizePhone: (value: string) => string;
  phoneTail10: (value: string) => string;
  sanitizeCustomerDisplayName: (value: string) => string;
}): Promise<void> {
  const ownerId = String(args.ownerId || "").trim();
  const phone = args.normalizePhone(args.phone || "");
  const tail = args.phoneTail10(phone);
  const name = args.sanitizeCustomerDisplayName(args.name || "");
  if (!ownerId || !tail || !name) return;

  try {
    const { data: existing, error: readErr } = await args.supabase
      .from("agent_crm_contacts")
      .select("id,name,metadata")
      .eq("created_by", ownerId)
      .or(`phone.eq.${phone},phone.like.%${tail}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readErr) return;

    if (existing?.id) {
      const mergedMeta = {
        ...(existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
        whatsapp_transport_id: phone,
      };
      await args.supabase
        .from("agent_crm_contacts")
        .update({ name, metadata: mergedMeta })
        .eq("id", String(existing.id))
        .eq("created_by", ownerId);
      return;
    }

    await args.supabase.from("agent_crm_contacts").insert({
      tenant_id: args.tenantId || null,
      created_by: ownerId,
      name,
      phone,
      status: "analysis",
      next_action: null,
      next_action_at: null,
      metadata: { source: "whatsapp_name_capture", whatsapp_transport_id: phone },
    });
  } catch {
    // best effort
  }
}

export async function upsertCrmLifecycleState(args: {
  supabase: any;
  ownerId: string;
  tenantId?: string | null;
  phone: string;
  realPhone?: string;
  name?: string;
  status?: string;
  nextAction?: string;
  nextActionAt?: string;
  metadata?: Record<string, any>;
  normalizePhone: (value: string) => string;
  normalizeRealCustomerPhone: (value: string) => string;
  phoneTail10: (value: string) => string;
  sanitizeCustomerDisplayName: (value: string) => string;
}): Promise<void> {
  const ownerId = String(args.ownerId || "").trim();
  const phone = args.normalizePhone(args.phone || "");
  const realPhone = args.normalizeRealCustomerPhone(String(args.realPhone || ""));
  const tail = args.phoneTail10(phone);
  if (!ownerId || !tail) return;

  try {
    const { data: existing } = await args.supabase
      .from("agent_crm_contacts")
      .select("id,status,next_action,next_action_at,metadata")
      .eq("created_by", ownerId)
      .or(`phone.eq.${phone},phone.like.%${tail}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextStatus = String(args.status || existing?.status || "analysis").trim() || "analysis";
    const nextAction = args.nextAction === undefined
      ? (existing?.next_action ?? null)
      : (String(args.nextAction || "").trim() || null);
    const nextActionAt = args.nextActionAt === undefined
      ? (existing?.next_action_at ?? null)
      : (String(args.nextActionAt || "").trim() || null);
    const mergedMetadata = {
      ...(existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
      ...(args.metadata && typeof args.metadata === "object" ? args.metadata : {}),
      whatsapp_transport_id: phone,
      whatsapp_real_phone: realPhone || String((existing?.metadata as any)?.whatsapp_real_phone || ""),
      whatsapp_lifecycle_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const updatePayload: Record<string, any> = {
        status: nextStatus,
        next_action: nextAction,
        next_action_at: nextActionAt,
        metadata: mergedMetadata,
      };
      const safeName = args.sanitizeCustomerDisplayName(String(args.name || ""));
      if (safeName) updatePayload.name = safeName;
      await args.supabase
        .from("agent_crm_contacts")
        .update(updatePayload)
        .eq("id", String(existing.id))
        .eq("created_by", ownerId);
      return;
    }

    await args.supabase.from("agent_crm_contacts").insert({
      tenant_id: args.tenantId || null,
      created_by: ownerId,
      name: args.sanitizeCustomerDisplayName(String(args.name || "")) || null,
      phone,
      status: nextStatus,
      next_action: nextAction,
      next_action_at: nextActionAt,
      metadata: mergedMetadata,
    });
  } catch {
    // best effort
  }
}
