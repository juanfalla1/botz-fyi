import { AgentRuntimeError, safeErrorResult, toAgentRuntimeError } from "./errors";
import { ToolExecutorRegistry } from "./executor-registry";
import { assertPermissionSnapshot } from "./permission-resolver";
import { AjvToolSchemaValidator } from "./schema-validator";
import { createStructuredToolAuditSink, hashToolArguments, recordToolAudit } from "./audit";
import type {
  AgentModelAdapter,
  AgentModelMessage,
  AgentModelUsage,
  AgentRunContext,
  AgentToolLoopLimits,
  AgentToolLoopResult,
  NormalizedToolCall,
  RuntimeToolDefinition,
  ToolApprovalGate,
  ToolAuditEvent,
  ToolAuditSink,
  ToolExecutor,
  ToolPermissionResolver,
  ToolSchemaValidator,
} from "./types";

const HARD_MAX_ITERATIONS = 5;
const HARD_MAX_TOOL_CALLS = 8;
const DEFAULT_TOOL_TIMEOUT_MS = 15_000;
const HARD_MAX_TOOL_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_TOOL_RESULT_CHARS = 12_000;
const HARD_MAX_TOOL_RESULT_CHARS = 12_000;
const MAX_ARGUMENT_CHARS = 20_000;

export type RunAgentToolLoopInput = {
  context: AgentRunContext;
  messages: readonly AgentModelMessage[];
  model: string;
  toolDefinitions: readonly RuntimeToolDefinition[];
  modelAdapter: AgentModelAdapter;
  executorRegistry: ToolExecutorRegistry;
  permissionResolver: ToolPermissionResolver;
  schemaValidator?: ToolSchemaValidator;
  auditSink?: ToolAuditSink;
  approvalGate?: ToolApprovalGate;
  temperature?: number;
  maxOutputTokens?: number;
  limits?: AgentToolLoopLimits;
  signal?: AbortSignal;
};

export async function runAgentToolLoop(input: RunAgentToolLoopInput): Promise<AgentToolLoopResult> {
  const maxIterations = clampLimit(input.limits?.maxIterations, HARD_MAX_ITERATIONS);
  const maxToolCalls = clampLimit(input.limits?.maxToolCalls, HARD_MAX_TOOL_CALLS);
  const defaultToolTimeoutMs = clampPositiveLimit(
    input.limits?.defaultToolTimeoutMs,
    DEFAULT_TOOL_TIMEOUT_MS,
    HARD_MAX_TOOL_TIMEOUT_MS,
  );
  const maxToolResultChars = clampPositiveLimit(
    input.limits?.maxToolResultChars,
    DEFAULT_MAX_TOOL_RESULT_CHARS,
    HARD_MAX_TOOL_RESULT_CHARS,
  );
  const schemaValidator = input.schemaValidator || new AjvToolSchemaValidator();
  const auditSink = input.auditSink || createStructuredToolAuditSink();
  const runSignal = input.signal || new AbortController().signal;
  const definitions = createToolDefinitionMap(input.toolDefinitions);
  const usage: AgentModelUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let messages = [...input.messages];
  let toolCallCount = 0;
  let completedIterations = 0;

  await audit(input.context, auditSink, { status: "run_started" });

  try {
    const initialPermissions = await awaitWithAbort(input.permissionResolver.resolve(input.context), runSignal);
    assertPermissionSnapshot(input.context, initialPermissions);
    const enabled = new Set(initialPermissions.enabledToolIds);
    const availableTools = input.toolDefinitions.filter(
      (definition) => enabled.has(definition.id) && input.executorRegistry.has(definition.id),
    );

    for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
      throwIfAborted(runSignal);
      completedIterations = iteration;

      let turn;
      try {
        turn = await awaitWithAbort(input.modelAdapter.generate({
          messages,
          tools: availableTools,
          model: input.model,
          temperature: input.temperature,
          maxOutputTokens: input.maxOutputTokens,
          signal: runSignal,
        }), runSignal);
      } catch (error) {
        if (runSignal.aborted) throw new AgentRuntimeError("RUN_ABORTED", "The agent run was cancelled.", true);
        throw new AgentRuntimeError("MODEL_FAILED", "The model could not complete the agent turn.", true);
      }

      addUsage(usage, turn.usage);
      messages = input.modelAdapter.appendAssistantTurn(messages, turn);

      if (!turn.toolCalls.length) {
        await audit(input.context, auditSink, { status: "run_succeeded" });
        return {
          finalText: turn.text,
          messages,
          iterations: completedIterations,
          toolCalls: toolCallCount,
          usage,
        };
      }

      if (iteration === maxIterations) {
        throw new AgentRuntimeError("MAX_ITERATIONS", "The agent reached the maximum number of model iterations.");
      }
      if (toolCallCount + turn.toolCalls.length > maxToolCalls) {
        throw new AgentRuntimeError("MAX_TOOL_CALLS", "The agent reached the maximum number of tool calls.");
      }

      for (const toolCall of turn.toolCalls) {
        toolCallCount += 1;
        const result = await executeToolCall({
          context: input.context,
          toolCall,
          definitions,
          executorRegistry: input.executorRegistry,
          permissionResolver: input.permissionResolver,
          schemaValidator,
          approvalGate: input.approvalGate,
          auditSink,
          runSignal,
          defaultToolTimeoutMs,
          maxToolResultChars,
        });
        messages = input.modelAdapter.appendToolResult(messages, result);
      }
    }

    throw new AgentRuntimeError("MAX_ITERATIONS", "The agent reached the maximum number of model iterations.");
  } catch (error) {
    const normalized = error instanceof AgentRuntimeError
      ? error
      : new AgentRuntimeError("TOOL_EXECUTION_FAILED", "The agent runtime failed.", true);
    await audit(input.context, auditSink, { status: "run_failed", errorCode: normalized.code });
    throw normalized;
  }
}

type ExecuteToolCallInput = {
  context: AgentRunContext;
  toolCall: NormalizedToolCall;
  definitions: Map<string, RuntimeToolDefinition>;
  executorRegistry: ToolExecutorRegistry;
  permissionResolver: ToolPermissionResolver;
  schemaValidator: ToolSchemaValidator;
  approvalGate?: ToolApprovalGate;
  auditSink: ToolAuditSink;
  runSignal: AbortSignal;
  defaultToolTimeoutMs: number;
  maxToolResultChars: number;
};

async function executeToolCall(input: ExecuteToolCallInput) {
  const startedAt = Date.now();
  let executor: ToolExecutor | undefined;
  let argumentsHash: string | undefined;

  try {
    const definition = input.definitions.get(input.toolCall.toolId);
    if (!definition) {
      throw new AgentRuntimeError("TOOL_NOT_REGISTERED", "The requested tool is not registered.");
    }

    executor = input.executorRegistry.get(input.toolCall.toolId);
    if (!executor) {
      throw new AgentRuntimeError("EXECUTOR_UNAVAILABLE", "The requested tool is not available.");
    }

    await assertToolAllowed(input);

    const parsedArguments = parseToolArguments(input.toolCall.arguments);
    input.schemaValidator.validate(definition, parsedArguments);
    argumentsHash = hashToolArguments(parsedArguments);

    await audit(input.context, input.auditSink, {
      status: "tool_requested",
      toolCallId: input.toolCall.id,
      toolId: input.toolCall.toolId,
      argumentsHash,
    }, executor.riskLevel === "sensitive");

    if (executor.approval === "required") {
      if (!input.approvalGate) {
        throw new AgentRuntimeError("APPROVAL_REQUIRED", "This tool requires human approval.");
      }
      const decision = await awaitWithAbort(input.approvalGate.check({
        context: input.context,
        toolCall: input.toolCall,
        executor,
        argumentsHash,
      }), input.runSignal);
      if (decision === "pending") throw new AgentRuntimeError("APPROVAL_REQUIRED", "Human approval is pending.");
      if (decision === "denied") throw new AgentRuntimeError("APPROVAL_DENIED", "Human approval was denied.");
    }

    await assertToolAllowed(input);
    const output = await executeWithTimeout(
      executor,
      parsedArguments,
      input,
      clampPositiveLimit(executor.timeoutMs, input.defaultToolTimeoutMs, HARD_MAX_TOOL_TIMEOUT_MS),
    );
    const serializedResult = serializeToolResult({ ok: true, data: sanitizeForModel(output) }, input.maxToolResultChars);

    await audit(input.context, input.auditSink, {
      status: "tool_succeeded",
      toolCallId: input.toolCall.id,
      toolId: input.toolCall.toolId,
      argumentsHash,
      durationMs: Date.now() - startedAt,
    }, executor.riskLevel === "sensitive");

    return {
      toolCallId: input.toolCall.id,
      toolId: input.toolCall.toolId,
      content: serializedResult.content,
      isError: serializedResult.truncated,
    };
  } catch (error) {
    const normalized = toAgentRuntimeError(error);
    if (normalized.code === "AUDIT_FAILED" || normalized.code === "RUN_ABORTED") throw normalized;

    await audit(input.context, input.auditSink, {
      status: "tool_failed",
      toolCallId: input.toolCall.id,
      toolId: input.toolCall.toolId,
      argumentsHash,
      durationMs: Date.now() - startedAt,
      errorCode: normalized.code,
    }, executor?.riskLevel === "sensitive");

    return {
      toolCallId: input.toolCall.id,
      toolId: input.toolCall.toolId,
      content: serializeToolResult(safeErrorResult(normalized), input.maxToolResultChars).content,
      isError: true,
    };
  }
}

async function executeWithTimeout(
  executor: ToolExecutor,
  parsedArguments: unknown,
  input: ExecuteToolCallInput,
  timeoutMs: number,
) {
  throwIfAborted(input.runSignal);
  const controller = new AbortController();
  const abortFromRun = () => controller.abort(input.runSignal.reason);
  input.runSignal.addEventListener("abort", abortFromRun, { once: true });
  const timer = setTimeout(() => controller.abort(new AgentRuntimeError("TOOL_TIMEOUT", "The tool execution timed out.", true)), timeoutMs);

  try {
    return await Promise.race([
      executor.execute(parsedArguments, {
        ...input.context,
        toolCallId: input.toolCall.id,
        signal: controller.signal,
      }),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => {
          if (input.runSignal.aborted) {
            reject(new AgentRuntimeError("RUN_ABORTED", "The agent run was cancelled.", true));
          } else {
            reject(new AgentRuntimeError("TOOL_TIMEOUT", "The tool execution timed out.", true));
          }
        }, { once: true });
      }),
    ]);
  } finally {
    clearTimeout(timer);
    input.runSignal.removeEventListener("abort", abortFromRun);
  }
}

function parseToolArguments(input: unknown) {
  const serialized = typeof input === "string" ? input : safeStringifyArguments(input);
  if (serialized.length > MAX_ARGUMENT_CHARS) {
    throw new AgentRuntimeError("INVALID_TOOL_ARGUMENTS", "Tool arguments exceed the allowed size.");
  }
  if (typeof input !== "string") return input;
  try {
    return JSON.parse(input);
  } catch {
    throw new AgentRuntimeError("INVALID_TOOL_ARGUMENTS", "Tool arguments are not valid JSON.");
  }
}

function sanitizeForModel(input: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > 6) return "[maximum depth reached]";
  if (input == null || typeof input === "number" || typeof input === "boolean") return input;
  if (typeof input === "string") return sanitizeString(input);
  if (typeof input !== "object") return String(input);
  if (seen.has(input)) return "[circular]";
  seen.add(input);
  if (Array.isArray(input)) return input.slice(0, 100).map((value) => sanitizeForModel(value, depth + 1, seen));

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>).slice(0, 100)) {
    output[key] = isSecretKey(key) ? "[redacted]" : sanitizeForModel(value, depth + 1, seen);
  }
  return output;
}

function sanitizeString(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]")
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, "Basic [redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[redacted]")
    .replace(/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}\b/gi, "[redacted]")
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "[redacted]")
    .replace(/\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{20,}\b/g, "[redacted]")
    .replace(/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, "[redacted]")
    .replace(/([A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s/:@]+:)[^\s@]+@/g, "$1[redacted]@")
    .replace(/\b(password|passwd|pwd|secret|client[_-]?secret|aws[_-]?secret[_-]?access[_-]?key|credential|private[_-]?key|api[_-]?key|access[_-]?token|auth[_-]?token)\s*[=:]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted]");
}

function isSecretKey(key: string) {
  return /(token|secret|password|authorization|cookie|credential|api[_-]?key|private[_-]?key)/i.test(key);
}

function serializeToolResult(payload: unknown, maxChars: number) {
  const serialized = JSON.stringify(payload);
  if (serialized.length <= maxChars) return { content: serialized, truncated: false };
  return {
    content: JSON.stringify({ ok: false, error: { code: "TOOL_RESULT_TRUNCATED", message: "Tool result exceeded the allowed size." } }),
    truncated: true,
  };
}

function clampLimit(value: number | undefined, hardMaximum: number) {
  if (!Number.isFinite(value)) return hardMaximum;
  return Math.max(1, Math.min(hardMaximum, Math.floor(Number(value))));
}

function clampPositiveLimit(value: number | undefined, fallback: number, hardMaximum: number) {
  if (!Number.isFinite(value) || Number(value) <= 0) return fallback;
  return Math.min(hardMaximum, Math.floor(Number(value)));
}

function safeStringifyArguments(input: unknown) {
  try {
    const serialized = JSON.stringify(input);
    if (typeof serialized !== "string") {
      throw new AgentRuntimeError("INVALID_TOOL_ARGUMENTS", "Tool arguments must be JSON serializable.");
    }
    return serialized;
  } catch {
    throw new AgentRuntimeError("INVALID_TOOL_ARGUMENTS", "Tool arguments must be JSON serializable.");
  }
}

function createToolDefinitionMap(definitions: readonly RuntimeToolDefinition[]) {
  const result = new Map<string, RuntimeToolDefinition>();
  for (const definition of definitions) {
    const toolId = String(definition.id || "").trim();
    if (!toolId) throw new AgentRuntimeError("INVALID_TOOL_DEFINITION", "Tool definitions require an ID.");
    if (result.has(toolId)) {
      throw new AgentRuntimeError("INVALID_TOOL_DEFINITION", `Duplicate tool definition: ${toolId}`);
    }
    result.set(toolId, definition);
  }
  return result;
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new AgentRuntimeError("RUN_ABORTED", "The agent run was cancelled.", true);
}

async function assertToolAllowed(input: ExecuteToolCallInput) {
  const permissions = await awaitWithAbort(
    input.permissionResolver.resolve(input.context),
    input.runSignal,
  );
  assertPermissionSnapshot(input.context, permissions);
  if (!permissions.enabledToolIds.includes(input.toolCall.toolId)) {
    throw new AgentRuntimeError("TOOL_NOT_ALLOWED", "The agent is not authorized to use this tool.");
  }
}

async function awaitWithAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  throwIfAborted(signal);
  return await new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new AgentRuntimeError("RUN_ABORTED", "The agent run was cancelled.", true));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function addUsage(target: AgentModelUsage, usage?: AgentModelUsage) {
  if (!usage) return;
  target.inputTokens = Number(target.inputTokens || 0) + Number(usage.inputTokens || 0);
  target.outputTokens = Number(target.outputTokens || 0) + Number(usage.outputTokens || 0);
  target.totalTokens = Number(target.totalTokens || 0) + Number(usage.totalTokens || 0);
}

async function audit(
  context: AgentRunContext,
  sink: ToolAuditSink,
  event: Pick<ToolAuditEvent, "status" | "toolCallId" | "toolId" | "argumentsHash" | "durationMs" | "errorCode">,
  required = false,
) {
  await recordToolAudit(sink, {
    timestamp: new Date().toISOString(),
    tenantId: context.tenantId,
    ownerId: context.ownerId,
    actorId: context.actorId,
    agentId: context.agentId,
    runId: context.runId,
    conversationId: context.conversationId,
    channel: context.channel,
    ...event,
  }, required);
}
