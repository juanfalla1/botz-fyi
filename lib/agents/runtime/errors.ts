export type AgentRuntimeErrorCode =
  | "AGENT_ACCESS_DENIED"
  | "TENANT_MISMATCH"
  | "TOOL_NOT_REGISTERED"
  | "INVALID_TOOL_DEFINITION"
  | "TOOL_NOT_ALLOWED"
  | "EXECUTOR_UNAVAILABLE"
  | "INVALID_TOOL_ARGUMENTS"
  | "TOOL_TIMEOUT"
  | "TOOL_EXECUTION_FAILED"
  | "APPROVAL_REQUIRED"
  | "APPROVAL_DENIED"
  | "AUDIT_FAILED"
  | "MODEL_FAILED"
  | "MAX_ITERATIONS"
  | "MAX_TOOL_CALLS"
  | "RUN_ABORTED";

export class AgentRuntimeError extends Error {
  readonly code: AgentRuntimeErrorCode;
  readonly retryable: boolean;

  constructor(code: AgentRuntimeErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "AgentRuntimeError";
    this.code = code;
    this.retryable = retryable;
  }
}

export function toAgentRuntimeError(error: unknown): AgentRuntimeError {
  if (error instanceof AgentRuntimeError) return error;
  if (error instanceof Error && error.name === "AbortError") {
    return new AgentRuntimeError("RUN_ABORTED", "The agent run was cancelled.", true);
  }
  return new AgentRuntimeError("TOOL_EXECUTION_FAILED", "The tool could not complete its operation.", true);
}

export function safeErrorResult(error: unknown) {
  const normalized = toAgentRuntimeError(error);
  return {
    ok: false as const,
    error: {
      code: normalized.code,
      message: normalized.message,
      retryable: normalized.retryable,
    },
  };
}
