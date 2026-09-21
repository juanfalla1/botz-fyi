export type ToolInputSchema = Readonly<Record<string, unknown>>;

export type AgentToolDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  inputSchema: ToolInputSchema;
};

export const TOOL_REGISTRY = [
  {
    id: "calculate_quote",
    name: "Calculate quote",
    description: "Calculate a quote using the company's configured products and business rules.",
    category: "business",
    inputSchema: {
      type: "object",
      properties: {
        customer: { type: "object", additionalProperties: true },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              product_id: { type: "string" },
              quantity: { type: "number", minimum: 1 },
            },
            required: ["product_id", "quantity"],
            additionalProperties: true,
          },
        },
      },
      required: ["items"],
      additionalProperties: true,
    },
  },
  {
    id: "generate_pdf",
    name: "Generate PDF",
    description: "Generate a PDF document using the supported basic_document template.",
    category: "documents",
    inputSchema: {
      type: "object",
      properties: {
        template_id: { type: "string", enum: ["basic_document"] },
        data: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 1, pattern: "\\S" },
            content: { type: "string" },
          },
          required: ["title", "content"],
          additionalProperties: false,
        },
        filename: { type: "string" },
      },
      required: ["template_id", "data"],
      additionalProperties: false,
    },
  },
  {
    id: "send_document",
    name: "Send document",
    description: "Send an existing document to a recipient through an authorized channel.",
    category: "channels",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string" },
        recipient: { type: "string" },
        document_id: { type: "string" },
        caption: { type: "string" },
      },
      required: ["channel", "recipient", "document_id"],
      additionalProperties: false,
    },
  },
  {
    id: "call_api",
    name: "Call API",
    description: "Call an operation exposed by an authorized company integration.",
    category: "integrations",
    inputSchema: {
      type: "object",
      properties: {
        integration_id: { type: "string" },
        operation: { type: "string" },
        payload: { type: "object", additionalProperties: true },
      },
      required: ["integration_id", "operation"],
      additionalProperties: false,
    },
  },
  {
    id: "save_to_crm",
    name: "Save to CRM",
    description: "Create or update structured business data in an authorized CRM.",
    category: "crm",
    inputSchema: {
      type: "object",
      properties: {
        entity: { type: "string" },
        data: { type: "object", additionalProperties: true },
      },
      required: ["entity", "data"],
      additionalProperties: false,
    },
  },
] as const satisfies readonly AgentToolDefinition[];

export function getToolDefinition(id: string): AgentToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.id === id);
}

export function isRegisteredToolId(id: string): boolean {
  return Boolean(getToolDefinition(id));
}
