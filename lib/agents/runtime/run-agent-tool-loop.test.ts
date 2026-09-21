import test from "node:test";
import assert from "node:assert/strict";
import { AgentRuntimeError } from "./errors";
import { ToolExecutorRegistry } from "./executor-registry";
import { OpenAIAgentModelAdapter } from "./openai-adapter";
import { createSupabaseToolPermissionResolver } from "./permission-resolver";
import { runAgentToolLoop } from "./run-agent-tool-loop";
import type {
  AgentModelAdapter,
  AgentModelMessage,
  AgentModelRequest,
  AgentModelTurn,
  AgentToolResultMessage,
  RuntimeToolDefinition,
  ToolPermissionResolver,
} from "./types";

const definition: RuntimeToolDefinition = {
  id: "test_tool",
  name: "Test tool",
  description: "A test-only tool.",
  category: "test",
  inputSchema: {
    type: "object",
    properties: { value: { type: "string" } },
    required: ["value"],
    additionalProperties: false,
  },
};

const context = {
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  ownerId: "owner-1",
  actorId: "actor-1",
  agentId: "agent-1",
  conversationId: "conversation-1",
  channel: "test",
  runId: "run-1",
  services: {},
};

const silentAudit = { record() {} };

class QueueModelAdapter implements AgentModelAdapter {
  readonly requests: AgentModelRequest[] = [];
  readonly toolResults: AgentToolResultMessage[] = [];

  constructor(private readonly turns: AgentModelTurn[]) {}

  async generate(request: AgentModelRequest) {
    this.requests.push(request);
    const turn = this.turns.shift();
    if (!turn) throw new Error("No queued model turn");
    return turn;
  }

  appendAssistantTurn(messages: readonly AgentModelMessage[], turn: AgentModelTurn) {
    return [...messages, { role: "assistant" as const, content: turn.text, toolCalls: turn.toolCalls }];
  }

  appendToolResult(messages: readonly AgentModelMessage[], result: AgentToolResultMessage) {
    this.toolResults.push(result);
    return [...messages, {
      role: "tool" as const,
      content: result.content,
      name: result.toolId,
      toolCallId: result.toolCallId,
    }];
  }
}

function permissions(enabledToolIds: string[]): ToolPermissionResolver {
  return {
    async resolve() {
      return {
        tenantId: context.tenantId,
        ownerId: context.ownerId,
        agentId: context.agentId,
        enabledToolIds,
      };
    },
  };
}

function toolTurn(id = "call-1", args: unknown = { value: "hello" }): AgentModelTurn {
  return {
    text: "",
    toolCalls: [{ id, toolId: definition.id, arguments: args }],
  };
}

function finalTurn(text = "final answer"): AgentModelTurn {
  return { text, toolCalls: [] };
}

test("uses the provider-neutral adapter and revalidates permission before execution", async () => {
  let permissionChecks = 0;
  let executed = 0;
  const permissionResolver: ToolPermissionResolver = {
    async resolve() {
      permissionChecks += 1;
      return {
        tenantId: context.tenantId,
        ownerId: context.ownerId,
        agentId: context.agentId,
        enabledToolIds: [definition.id],
      };
    },
  };
  const executors = new ToolExecutorRegistry([{
    toolId: definition.id,
    riskLevel: "read",
    async execute(input, executionContext) {
      executed += 1;
      assert.equal(executionContext.services.marker, "available");
      return {
        echoed: input,
        access_token: "must-not-reach-model",
        diagnostic: "Basic dXNlcjpwYXNzd29yZA== password=hunter2 AKIAIOSFODNN7EXAMPLE AWS_SECRET_ACCESS_KEY=very-secret-value client_secret=another-secret",
      };
    },
  }]);
  const model = new QueueModelAdapter([toolTurn(), finalTurn()]);

  const result = await runAgentToolLoop({
    context: { ...context, services: { marker: "available" } },
    messages: [{ role: "user", content: "Use the tool" }],
    model: "provider-neutral-model",
    toolDefinitions: [definition],
    modelAdapter: model,
    executorRegistry: executors,
    permissionResolver,
    auditSink: silentAudit,
  });

  assert.equal(result.finalText, "final answer");
  assert.equal(result.iterations, 2);
  assert.equal(result.toolCalls, 1);
  assert.equal(executed, 1);
  assert.equal(permissionChecks, 3);
  assert.deepEqual(model.requests[0].tools.map((tool) => tool.id), [definition.id]);
  const toolMessage = model.requests[1].messages.find((message) => message.role === "tool");
  assert.match(toolMessage?.content || "", /\[redacted\]/);
  assert.doesNotMatch(toolMessage?.content || "", /must-not-reach-model/);
  assert.doesNotMatch(toolMessage?.content || "", /dXNlcjpwYXNzd29yZA|hunter2|AKIAIOSFODNN7EXAMPLE|very-secret-value|another-secret/);
});

test("revalidates permission after human approval and immediately before execution", async () => {
  let permissionChecks = 0;
  let executed = 0;
  const permissionResolver: ToolPermissionResolver = {
    async resolve() {
      permissionChecks += 1;
      return {
        tenantId: context.tenantId,
        ownerId: context.ownerId,
        agentId: context.agentId,
        enabledToolIds: permissionChecks < 3 ? [definition.id] : [],
      };
    },
  };
  const executors = new ToolExecutorRegistry([{
    toolId: definition.id,
    riskLevel: "sensitive",
    approval: "required",
    async execute() {
      executed += 1;
      return { ok: true };
    },
  }]);
  const model = new QueueModelAdapter([toolTurn("approval-call"), finalTurn("revocation handled")]);

  await runAgentToolLoop({
    context,
    messages: [{ role: "user", content: "Use sensitive tool" }],
    model: "test-model",
    toolDefinitions: [definition],
    modelAdapter: model,
    executorRegistry: executors,
    permissionResolver,
    approvalGate: { async check() { return "approved"; } },
    auditSink: silentAudit,
  });

  assert.equal(executed, 0);
  assert.equal(permissionChecks, 3);
  const toolMessage = model.requests[1].messages.find((message) => message.role === "tool");
  assert.match(toolMessage?.content || "", /TOOL_NOT_ALLOWED/);
});

test("does not execute a tool whose permission was revoked", async () => {
  let permissionChecks = 0;
  let executed = 0;
  const permissionResolver: ToolPermissionResolver = {
    async resolve() {
      permissionChecks += 1;
      return {
        tenantId: context.tenantId,
        ownerId: context.ownerId,
        agentId: context.agentId,
        enabledToolIds: permissionChecks === 1 ? [definition.id] : [],
      };
    },
  };
  const executors = new ToolExecutorRegistry([{
    toolId: definition.id,
    riskLevel: "write",
    async execute() {
      executed += 1;
      return { ok: true };
    },
  }]);
  const model = new QueueModelAdapter([toolTurn(), finalTurn("permission handled")]);

  const result = await runAgentToolLoop({
    context,
    messages: [{ role: "user", content: "Use the tool" }],
    model: "test-model",
    toolDefinitions: [definition],
    modelAdapter: model,
    executorRegistry: executors,
    permissionResolver,
    auditSink: silentAudit,
  });

  assert.equal(result.finalText, "permission handled");
  assert.equal(executed, 0);
  const toolMessage = model.requests[1].messages.find((message) => message.role === "tool");
  assert.match(toolMessage?.content || "", /TOOL_NOT_ALLOWED/);
});

test("validates tool arguments with Ajv before execution", async () => {
  let executed = 0;
  const executors = new ToolExecutorRegistry([{
    toolId: definition.id,
    riskLevel: "read",
    async execute() {
      executed += 1;
      return { ok: true };
    },
  }]);
  const model = new QueueModelAdapter([toolTurn("call-invalid", { value: 123 }), finalTurn("validation handled")]);

  await runAgentToolLoop({
    context,
    messages: [{ role: "user", content: "Use invalid arguments" }],
    model: "test-model",
    toolDefinitions: [definition],
    modelAdapter: model,
    executorRegistry: executors,
    permissionResolver: permissions([definition.id]),
    auditSink: silentAudit,
  });

  assert.equal(executed, 0);
  const toolMessage = model.requests[1].messages.find((message) => message.role === "tool");
  assert.match(toolMessage?.content || "", /INVALID_TOOL_ARGUMENTS/);
});

test("enforces executor timeout with AbortSignal", async () => {
  const executors = new ToolExecutorRegistry([{
    toolId: definition.id,
    riskLevel: "read",
    timeoutMs: 10,
    async execute(_input, executionContext) {
      return await new Promise((resolve, reject) => {
        executionContext.signal.addEventListener("abort", () => reject(executionContext.signal.reason), { once: true });
        setTimeout(() => resolve({ tooLate: true }), 1_000);
      });
    },
  }]);
  const model = new QueueModelAdapter([toolTurn("call-timeout"), finalTurn("timeout handled")]);

  await runAgentToolLoop({
    context,
    messages: [{ role: "user", content: "Use slow tool" }],
    model: "test-model",
    toolDefinitions: [definition],
    modelAdapter: model,
    executorRegistry: executors,
    permissionResolver: permissions([definition.id]),
    auditSink: silentAudit,
  });

  const toolMessage = model.requests[1].messages.find((message) => message.role === "tool");
  assert.match(toolMessage?.content || "", /TOOL_TIMEOUT/);
});

test("cancels a model adapter that ignores AbortSignal", async () => {
  const controller = new AbortController();
  const model: AgentModelAdapter = {
    async generate() {
      return await new Promise<AgentModelTurn>(() => {});
    },
    appendAssistantTurn(messages) { return [...messages]; },
    appendToolResult(messages) { return [...messages]; },
  };
  setTimeout(() => controller.abort(), 10);

  await assert.rejects(
    runAgentToolLoop({
      context: { ...context, runId: "run-abort" },
      messages: [{ role: "user", content: "Wait forever" }],
      model: "test-model",
      toolDefinitions: [],
      modelAdapter: model,
      executorRegistry: new ToolExecutorRegistry(),
      permissionResolver: permissions([]),
      auditSink: silentAudit,
      signal: controller.signal,
    }),
    (error) => error instanceof AgentRuntimeError && error.code === "RUN_ABORTED",
  );
});

test("OpenAI adapter maps provider-safe names without leaking provider formats into the runtime", async () => {
  let submittedBody: any;
  const client = {
    chat: {
      completions: {
        async create(body: any) {
          submittedBody = body;
          return {
            choices: [{ message: { content: null, tool_calls: [{
              id: "provider-call-1",
              type: "function",
              function: { name: body.tools[0].function.name, arguments: "{\"value\":\"ok\"}" },
            }] } }],
          };
        },
      },
    },
  };
  const adapter = new OpenAIAgentModelAdapter({ client: client as any });
  const customDefinition = { ...definition, id: "private/client/tool" };
  const turn = await adapter.generate({
    messages: [{ role: "user", content: "Use custom tool" }],
    tools: [customDefinition],
    model: "test-model",
    signal: new AbortController().signal,
  });

  assert.equal(submittedBody.tools[0].function.name, "runtime_tool_0");
  assert.equal(turn.toolCalls[0].toolId, customDefinition.id);
  assert.equal(turn.toolCalls[0].id, "provider-call-1");
});

test("rejects duplicate definitions and non-serializable arguments deterministically", async () => {
  const model = new QueueModelAdapter([finalTurn()]);
  await assert.rejects(
    runAgentToolLoop({
      context: { ...context, runId: "run-duplicate" },
      messages: [{ role: "user", content: "Duplicate" }],
      model: "test-model",
      toolDefinitions: [definition, { ...definition }],
      modelAdapter: model,
      executorRegistry: new ToolExecutorRegistry(),
      permissionResolver: permissions([]),
      auditSink: silentAudit,
    }),
    (error) => error instanceof AgentRuntimeError && error.code === "INVALID_TOOL_DEFINITION",
  );

  let executed = 0;
  const invalidArgumentModel = new QueueModelAdapter([{
    text: "",
    toolCalls: [{ id: "undefined-args", toolId: definition.id, arguments: undefined }],
  }, finalTurn("invalid handled")]);
  await runAgentToolLoop({
    context: { ...context, runId: "run-invalid-serialization" },
    messages: [{ role: "user", content: "Invalid arguments" }],
    model: "test-model",
    toolDefinitions: [definition],
    modelAdapter: invalidArgumentModel,
    executorRegistry: new ToolExecutorRegistry([{
      toolId: definition.id,
      riskLevel: "read",
      async execute() { executed += 1; },
    }]),
    permissionResolver: permissions([definition.id]),
    auditSink: silentAudit,
  });
  assert.equal(executed, 0);
  const toolMessage = invalidArgumentModel.requests[1].messages.find((message) => message.role === "tool");
  assert.match(toolMessage?.content || "", /INVALID_TOOL_ARGUMENTS/);
});

test("enforces hard iteration and tool-call limits", async () => {
  const executors = new ToolExecutorRegistry([{
    toolId: definition.id,
    riskLevel: "read",
    async execute() {
      return { ok: true };
    },
  }]);
  const tooManyCalls = Array.from({ length: 9 }, (_, index) => ({
    id: `call-${index}`,
    toolId: definition.id,
    arguments: { value: "x" },
  }));
  const model = new QueueModelAdapter([{ text: "", toolCalls: tooManyCalls }]);

  await assert.rejects(
    runAgentToolLoop({
      context,
      messages: [{ role: "user", content: "Use too many tools" }],
      model: "test-model",
      toolDefinitions: [definition],
      modelAdapter: model,
      executorRegistry: executors,
      permissionResolver: permissions([definition.id]),
      auditSink: silentAudit,
      limits: { maxIterations: 100, maxToolCalls: 100 },
    }),
    (error) => error instanceof AgentRuntimeError && error.code === "MAX_TOOL_CALLS",
  );

  const loopingModel = new QueueModelAdapter(Array.from({ length: 5 }, (_, index) => toolTurn(`loop-${index}`)));
  await assert.rejects(
    runAgentToolLoop({
      context: { ...context, runId: "run-loop" },
      messages: [{ role: "user", content: "Loop" }],
      model: "test-model",
      toolDefinitions: [definition],
      modelAdapter: loopingModel,
      executorRegistry: executors,
      permissionResolver: permissions([definition.id]),
      auditSink: silentAudit,
      limits: { maxIterations: 100, maxToolCalls: 100 },
    }),
    (error) => error instanceof AgentRuntimeError && error.code === "MAX_ITERATIONS",
  );
  assert.equal(loopingModel.requests.length, 5);
});

test("marks truncated results as errors and fails closed when sensitive auditing is unavailable", async () => {
  const largeOutputExecutors = new ToolExecutorRegistry([{
    toolId: definition.id,
    riskLevel: "read",
    async execute() { return { text: "x".repeat(1_000) }; },
  }]);
  const truncationModel = new QueueModelAdapter([toolTurn("large-result"), finalTurn("truncation handled")]);
  await runAgentToolLoop({
    context: { ...context, runId: "run-truncation" },
    messages: [{ role: "user", content: "Large result" }],
    model: "test-model",
    toolDefinitions: [definition],
    modelAdapter: truncationModel,
    executorRegistry: largeOutputExecutors,
    permissionResolver: permissions([definition.id]),
    auditSink: silentAudit,
    limits: { maxToolResultChars: 100 },
  });
  assert.equal(truncationModel.toolResults[0].isError, true);
  assert.match(truncationModel.toolResults[0].content, /TOOL_RESULT_TRUNCATED/);

  let executed = 0;
  const sensitiveExecutors = new ToolExecutorRegistry([{
    toolId: definition.id,
    riskLevel: "sensitive",
    async execute() { executed += 1; },
  }]);
  await assert.rejects(
    runAgentToolLoop({
      context: { ...context, runId: "run-audit-failure" },
      messages: [{ role: "user", content: "Sensitive operation" }],
      model: "test-model",
      toolDefinitions: [definition],
      modelAdapter: new QueueModelAdapter([toolTurn("sensitive-call")]),
      executorRegistry: sensitiveExecutors,
      permissionResolver: permissions([definition.id]),
      auditSink: { record() { throw new Error("audit unavailable"); } },
    }),
    (error) => error instanceof AgentRuntimeError && error.code === "AUDIT_FAILED",
  );
  assert.equal(executed, 0);
});

test("Supabase permission resolver scopes every lookup by agent, tenant, and owner", async () => {
  const filters: Record<string, string> = {};
  const query = {
    select() { return this; },
    eq(column: string, value: string) { filters[column] = value; return this; },
    async maybeSingle() {
      return {
        data: {
          id: context.agentId,
          tenant_id: context.tenantId,
          created_by: context.ownerId,
          configuration: { tools: { enabled: [definition.id, "private_tool"] } },
        },
        error: null,
      };
    },
  };
  const supabase = {
    from(table: string) {
      assert.equal(table, "ai_agents");
      return query;
    },
  };
  const resolver = createSupabaseToolPermissionResolver(supabase as any);
  const snapshot = await resolver.resolve(context);

  assert.deepEqual(filters, {
    id: context.agentId,
    tenant_id: context.tenantId,
    created_by: context.ownerId,
  });
  assert.deepEqual(snapshot.enabledToolIds, [definition.id, "private_tool"]);
});
