export async function resolveCrmOwnerScope(supabase: any, requesterUserId: string): Promise<{ ok: boolean; ownerId: string; error?: string; status?: number }> {
  const requesterId = String(requesterUserId || "").trim();
  if (!requesterId) return { ok: false, ownerId: "", error: "Unauthorized", status: 401 };

  const { data, error } = await supabase
    .from("agent_crm_access")
    .select("enabled,granted_by")
    .eq("user_id", requesterId)
    .maybeSingle();

  if (error) {
    const msg = String(error?.message || "");
    if (/does not exist|could not find the table|schema cache/i.test(msg)) {
      return { ok: false, ownerId: "", error: "Falta migración CRM access (agent_crm_access)", status: 400 };
    }
    return { ok: false, ownerId: "", error: msg || "No se pudo validar acceso CRM", status: 400 };
  }

  if (!Boolean((data as any)?.enabled)) {
    return { ok: false, ownerId: "", error: "CRM no habilitado para este usuario.", status: 403 };
  }

  const delegatedOwnerId = String((data as any)?.granted_by || "").trim();
  return { ok: true, ownerId: delegatedOwnerId || requesterId };
}
