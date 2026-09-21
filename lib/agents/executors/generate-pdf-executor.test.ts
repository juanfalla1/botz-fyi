import test from "node:test";
import assert from "node:assert/strict";
import { AgentRuntimeError } from "../runtime/errors";
import type { ToolExecutionContext } from "../runtime/types";
import { generatePdfExecutor } from "./generate-pdf-executor";

const context: ToolExecutionContext = {
  tenantId: "tenant-1",
  ownerId: "owner-1",
  actorId: "actor-1",
  agentId: "agent-1",
  channel: "test",
  runId: "run-1",
  toolCallId: "call-1",
  services: {},
  signal: new AbortController().signal,
};

test("generates a real PDF in memory and returns metadata only", async () => {
  const result = await generatePdfExecutor.execute({
    template_id: "basic_document",
    data: {
      title: "Quarterly summary",
      content: "Revenue increased and customer retention improved.",
    },
    filename: "quarterly-summary",
  }, context);

  assert.deepEqual(Object.keys(result).sort(), ["generated", "mimeType", "pdfName", "sizeBytes"]);
  assert.equal(result.generated, true);
  assert.equal(result.pdfName, "quarterly-summary.pdf");
  assert.equal(result.mimeType, "application/pdf");
  assert.ok(result.sizeBytes > 500);
});

test("rejects unsupported templates", async () => {
  await assert.rejects(
    generatePdfExecutor.execute({
      template_id: "unknown_template",
      data: { title: "Title", content: "Content" },
    }, context),
    (error) => error instanceof AgentRuntimeError && error.code === "INVALID_TOOL_ARGUMENTS",
  );
});

test("rejects basic documents without the required data", async () => {
  await assert.rejects(
    generatePdfExecutor.execute({
      template_id: "basic_document",
      data: { title: "", content: "Content" },
    }, context),
    (error) => error instanceof AgentRuntimeError && error.code === "INVALID_TOOL_ARGUMENTS",
  );
});
