import { generatePdfExecutor } from "./executors/generate-pdf-executor";
import { ToolExecutorRegistry } from "./runtime/executor-registry";
import { runAgentToolLoop } from "./runtime/run-agent-tool-loop";
import type {
  AgentModelAdapter,
  AgentModelMessage,
  AgentToolLoopResult,
  ToolPermissionResolver,
} from "./runtime/types";
import { TOOL_REGISTRY } from "./tool-registry";

type AgentTestHistoryMessage = {
  role: "user" | "agent";
  content: string;
};

export type RunAgentTestInput = {
  agentId: string;
  tenantId: string;
  ownerId: string;
  actorId: string;
  runId: string;
  conversationId?: string;
  systemPrompt: string;
  message: string;
  conversationHistory?: readonly AgentTestHistoryMessage[];
  model: string;
  modelAdapter: AgentModelAdapter;
  permissionResolver: ToolPermissionResolver;
  temperature?: number;
  maxOutputTokens?: number;
};

export function runAgentTest(input: RunAgentTestInput): Promise<AgentToolLoopResult> {
  const messages: AgentModelMessage[] = [
    { role: "system", content: input.systemPrompt },
    ...(input.conversationHistory || []).map((message) => ({
      role: message.role === "user" ? "user" as const : "assistant" as const,
      content: message.content,
    })),
    { role: "user", content: input.message },
  ];

  return runAgentToolLoop({
    context: {
      tenantId: input.tenantId,
      ownerId: input.ownerId,
      actorId: input.actorId,
      agentId: input.agentId,
      conversationId: input.conversationId,
      channel: "web_test",
      runId: input.runId,
      services: {},
    },
    messages,
    model: input.model,
    toolDefinitions: TOOL_REGISTRY,
    modelAdapter: input.modelAdapter,
    executorRegistry: new ToolExecutorRegistry([generatePdfExecutor]),
    permissionResolver: input.permissionResolver,
    temperature: input.temperature,
    maxOutputTokens: input.maxOutputTokens,
  });
}
