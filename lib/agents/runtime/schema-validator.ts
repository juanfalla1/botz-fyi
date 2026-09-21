import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import { AgentRuntimeError } from "./errors";
import type { RuntimeToolDefinition, ToolSchemaValidator } from "./types";

export class AjvToolSchemaValidator implements ToolSchemaValidator {
  private readonly ajv: Ajv;
  private readonly validators = new Map<string, ValidateFunction>();

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
  }

  validate(definition: RuntimeToolDefinition, input: unknown) {
    const validator = this.getValidator(definition);
    if (validator(input)) return;

    const summary = (validator.errors || [])
      .slice(0, 5)
      .map(formatValidationError)
      .join("; ");
    throw new AgentRuntimeError(
      "INVALID_TOOL_ARGUMENTS",
      summary ? `Invalid tool arguments: ${summary}` : "Invalid tool arguments.",
    );
  }

  private getValidator(definition: RuntimeToolDefinition) {
    const cacheKey = `${definition.id}:${JSON.stringify(definition.inputSchema)}`;
    const cached = this.validators.get(cacheKey);
    if (cached) return cached;

    const validator = this.ajv.compile(definition.inputSchema);
    this.validators.set(cacheKey, validator);
    return validator;
  }
}

function formatValidationError(error: ErrorObject) {
  const path = error.instancePath || "/";
  return `${path} ${error.message || error.keyword}`.trim();
}
