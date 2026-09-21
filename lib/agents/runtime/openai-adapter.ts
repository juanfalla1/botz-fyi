import OpenAI from "openai";
import { AgentRuntimeError } from "./errors";
import type {
  AgentModelAdapter,
  AgentModelMessage,
  AgentModelRequest,
  AgentModelTurn,
  AgentToolResultMessage,
} from "./types";

type OpenAIAgentModelAdapterOptions = {
  client: OpenAI;
};

export class OpenAIAgentModelAdapter implements AgentModelAdapter {
  private readonly client: OpenAI;

  constructor(options: OpenAIAgentModelAdapterOptions) {
    this.client = options.client;
  }

  async generate(request: AgentModelRequest): Promise<AgentModelTurn> {
    const toolNames = createOpenAIToolNames(request.tools);
    const response = await this.client.chat.completions.create(
      {
        model: request.model,
        messages: request.messages.map((message) => toOpenAIMessage(message, toolNames.byToolId)) as any,
        tools: request.tools.length
          ? request.tools.map((tool) => ({
              type: "function" as const,
              function: {
                name: toolNames.byToolId.get(tool.id)!,
                description: tool.description,
                parameters: tool.inputSchema,
              },
            }))
          : undefined,
        tool_choice: request.tools.length ? "auto" : undefined,
        temperature: request.temperature,
        max_tokens: request.maxOutputTokens,
      },
      { signal: request.signal },
    );

    const message = response.choices[0]?.message;
    const toolCalls = (message?.tool_calls || [])
      .filter((call: any) => call?.type === "function" && call?.function?.name)
      .map((call: any) => {
        const id = String(call.id || "").trim();
        if (!id) throw new AgentRuntimeError("MODEL_FAILED", "The model returned a tool call without an ID.");
        const providerName = String(call.function.name || "");
        return {
          id,
          toolId: toolNames.byProviderName.get(providerName) || providerName,
          arguments: String(call.function.arguments || "{}"),
        };
      });

    return {
      text: String(message?.content || ""),
      toolCalls,
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  appendAssistantTurn(messages: readonly AgentModelMessage[], turn: AgentModelTurn) {
    return [
      ...messages,
      {
        role: "assistant" as const,
        content: turn.text,
        toolCalls: turn.toolCalls,
      },
    ];
  }

  appendToolResult(messages: readonly AgentModelMessage[], result: AgentToolResultMessage) {
    return [
      ...messages,
      {
        role: "tool" as const,
        content: result.content,
        name: result.toolId,
        toolCallId: result.toolCallId,
      },
    ];
  }
}

function toOpenAIMessage(message: AgentModelMessage, toolNames: Map<string, string>) {
  if (message.role === "tool") {
    return {
      role: "tool",
      tool_call_id: message.toolCallId,
      content: message.content,
    };
  }
  if (message.role === "assistant" && message.toolCalls?.length) {
    return {
      role: "assistant",
      content: message.content || null,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: "function",
        function: {
          name: toolNames.get(call.toolId) || call.toolId,
          arguments: typeof call.arguments === "string" ? call.arguments : JSON.stringify(call.arguments ?? {}),
        },
      })),
    };
  }
  return {
    role: message.role,
    content: message.content,
    ...(message.name ? { name: message.name } : {}),
  };
}

function createOpenAIToolNames(tools: AgentModelRequest["tools"]) {
  const byToolId = new Map<string, string>();
  const byProviderName = new Map<string, string>();
  const used = new Set<string>();

  tools.forEach((tool, index) => {
    if (byToolId.has(tool.id)) {
      throw new AgentRuntimeError("INVALID_TOOL_DEFINITION", `Duplicate tool definition: ${tool.id}`);
    }
    let providerName = /^[A-Za-z0-9_-]{1,64}$/.test(tool.id) ? tool.id : `runtime_tool_${index}`;
    let suffix = 1;
    while (used.has(providerName)) {
      providerName = `runtime_tool_${index}_${suffix}`;
      suffix += 1;
    }
    used.add(providerName);
    byToolId.set(tool.id, providerName);
    byProviderName.set(providerName, tool.id);
  });

  return { byToolId, byProviderName };
}
