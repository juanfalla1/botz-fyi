export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type NormalizedToolCall = {
  id: string;
  toolId: string;
  arguments: unknown;
};

export type AgentModelMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: readonly NormalizedToolCall[];
};

export type RuntimeToolDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  inputSchema: Readonly<Record<string, unknown>>;
};

export type AgentModelUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AgentModelTurn = {
  text: string;
  toolCalls: readonly NormalizedToolCall[];
  usage?: AgentModelUsage;
};

export type AgentToolResultMessage = {
  toolCallId: string;
  toolId: string;
  content: string;
  isError: boolean;
};

export type AgentModelRequest = {
  messages: readonly AgentModelMessage[];
  tools: readonly RuntimeToolDefinition[];
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
  signal: AbortSignal;
};

export interface AgentModelAdapter {
  generate(request: AgentModelRequest): Promise<AgentModelTurn>;
  appendAssistantTurn(messages: readonly AgentModelMessage[], turn: AgentModelTurn): AgentModelMessage[];
  appendToolResult(messages: readonly AgentModelMessage[], result: AgentToolResultMessage): AgentModelMessage[];
}

export type ToolRiskLevel = "read" | "write" | "sensitive";
export type ToolApprovalPolicy = "never" | "required";

export type ToolExecutionContext = {
  tenantId: string;
  workspaceId?: string;
  ownerId: string;
  actorId: string;
  agentId: string;
  conversationId?: string;
  channel: string;
  runId: string;
  toolCallId: string;
  services: Readonly<Record<string, unknown>>;
  signal: AbortSignal;
};

export interface ToolExecutor<TInput = unknown, TOutput = unknown> {
  readonly toolId: string;
  readonly riskLevel: ToolRiskLevel;
  readonly approval?: ToolApprovalPolicy;
  readonly timeoutMs?: number;
  readonly supportsIdempotency?: boolean;
  execute(input: TInput, context: ToolExecutionContext): Promise<TOutput>;
}

export type AgentRunContext = Omit<ToolExecutionContext, "toolCallId" | "signal">;

export type ToolPermissionSnapshot = {
  tenantId: string;
  ownerId: string;
  agentId: string;
  enabledToolIds: readonly string[];
};

export interface ToolPermissionResolver {
  resolve(context: AgentRunContext): Promise<ToolPermissionSnapshot>;
}

export interface ToolSchemaValidator {
  validate(definition: RuntimeToolDefinition, input: unknown): void;
}

export type ApprovalDecision = "approved" | "denied" | "pending";

export interface ToolApprovalGate {
  check(input: {
    context: AgentRunContext;
    toolCall: NormalizedToolCall;
    executor: ToolExecutor;
    argumentsHash: string;
  }): Promise<ApprovalDecision>;
}

export type ToolAuditStatus =
  | "run_started"
  | "tool_requested"
  | "tool_succeeded"
  | "tool_failed"
  | "run_succeeded"
  | "run_failed";

export type ToolAuditEvent = {
  timestamp: string;
  status: ToolAuditStatus;
  tenantId: string;
  ownerId: string;
  actorId: string;
  agentId: string;
  runId: string;
  conversationId?: string;
  channel: string;
  toolCallId?: string;
  toolId?: string;
  argumentsHash?: string;
  durationMs?: number;
  errorCode?: string;
};

export interface ToolAuditSink {
  record(event: ToolAuditEvent): Promise<void> | void;
}

export type AgentToolLoopLimits = {
  maxIterations?: number;
  maxToolCalls?: number;
  defaultToolTimeoutMs?: number;
  maxToolResultChars?: number;
};

export type AgentToolLoopResult = {
  finalText: string;
  messages: readonly AgentModelMessage[];
  iterations: number;
  toolCalls: number;
  usage: AgentModelUsage;
};
