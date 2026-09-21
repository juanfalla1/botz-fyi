import crypto from "node:crypto";
import { AgentRuntimeError } from "./errors";
import type { ToolAuditEvent, ToolAuditSink } from "./types";

export function createStructuredToolAuditSink(
  logger: Pick<Console, "info"> = console,
): ToolAuditSink {
  return {
    record(event) {
      logger.info(JSON.stringify({ event: "agent_tool_runtime", ...event }));
    },
  };
}

export function hashToolArguments(input: unknown) {
  return crypto.createHash("sha256").update(stableStringify(input)).digest("hex");
}

export async function recordToolAudit(
  sink: ToolAuditSink,
  event: ToolAuditEvent,
  required = false,
) {
  try {
    await sink.record(event);
  } catch {
    if (required) {
      throw new AgentRuntimeError("AUDIT_FAILED", "Required tool auditing is unavailable.", true);
    }
  }
}

function stableStringify(input: unknown): string {
  if (input === null || typeof input !== "object") return JSON.stringify(input);
  if (Array.isArray(input)) return `[${input.map(stableStringify).join(",")}]`;
  const record = input as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}
