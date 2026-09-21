import type { SupabaseClient } from "@supabase/supabase-js";
import { AgentRuntimeError } from "./errors";
import type { AgentRunContext, ToolPermissionResolver, ToolPermissionSnapshot } from "./types";

export function createSupabaseToolPermissionResolver(supabase: SupabaseClient): ToolPermissionResolver {
  return {
    async resolve(context: AgentRunContext): Promise<ToolPermissionSnapshot> {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("id,tenant_id,created_by,configuration")
        .eq("id", context.agentId)
        .eq("tenant_id", context.tenantId)
        .eq("created_by", context.ownerId)
        .maybeSingle();

      if (error || !data) {
        throw new AgentRuntimeError("AGENT_ACCESS_DENIED", "The agent is not available in this tenant.");
      }

      const row = data as {
        id?: unknown;
        tenant_id?: unknown;
        created_by?: unknown;
        configuration?: unknown;
      };
      if (
        String(row.id || "") !== context.agentId ||
        String(row.tenant_id || "") !== context.tenantId ||
        String(row.created_by || "") !== context.ownerId
      ) {
        throw new AgentRuntimeError("TENANT_MISMATCH", "The agent does not belong to this tenant.");
      }

      const configuration = row.configuration && typeof row.configuration === "object"
        ? row.configuration as Record<string, unknown>
        : {};
      const tools = configuration.tools && typeof configuration.tools === "object"
        ? configuration.tools as Record<string, unknown>
        : {};
      const enabledToolIds = Array.isArray(tools.enabled)
        ? Array.from(new Set(tools.enabled.map((id) => String(id || "").trim()).filter(Boolean)))
        : [];

      return {
        tenantId: context.tenantId,
        ownerId: context.ownerId,
        agentId: context.agentId,
        enabledToolIds,
      };
    },
  };
}

export function assertPermissionSnapshot(context: AgentRunContext, snapshot: ToolPermissionSnapshot) {
  if (
    snapshot.tenantId !== context.tenantId ||
    snapshot.ownerId !== context.ownerId ||
    snapshot.agentId !== context.agentId
  ) {
    throw new AgentRuntimeError("TENANT_MISMATCH", "Tool permissions do not belong to this agent context.");
  }
}
