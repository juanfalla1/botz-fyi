import { jsPDF } from "jspdf";
import { AgentRuntimeError } from "../runtime/errors";
import type { ToolExecutor } from "../runtime/types";

type GeneratePdfInput = {
  template_id: string;
  data: {
    title: string;
    content: string;
  };
  filename?: string;
};

export type GeneratePdfResult = {
  generated: true;
  pdfName: string;
  mimeType: "application/pdf";
  sizeBytes: number;
};

export const generatePdfExecutor: ToolExecutor<GeneratePdfInput, GeneratePdfResult> = {
  toolId: "generate_pdf",
  riskLevel: "write",
  supportsIdempotency: true,

  async execute(input, context) {
    assertValidInput(input);
    throwIfAborted(context.signal);

    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const margin = 20;
    const pageBottom = 277;
    const lineHeight = 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(input.data.title, margin, margin);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(input.data.content, 170) as string[];
    let y = margin + 12;

    for (const line of lines) {
      throwIfAborted(context.signal);
      if (y > pageBottom) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }

    const pdf = doc.output("arraybuffer");
    throwIfAborted(context.signal);

    return {
      generated: true,
      pdfName: normalizePdfName(input.filename),
      mimeType: "application/pdf",
      sizeBytes: pdf.byteLength,
    };
  },
};

function assertValidInput(input: GeneratePdfInput) {
  if (!input || typeof input !== "object") {
    throw invalidArguments("Generate PDF input must be an object.");
  }
  if (input.template_id !== "basic_document") {
    throw invalidArguments("Unsupported PDF template.");
  }
  if (!input.data || typeof input.data !== "object") {
    throw invalidArguments("PDF data must be an object.");
  }
  if (typeof input.data.title !== "string" || !input.data.title.trim()) {
    throw invalidArguments("PDF data.title must be a non-empty string.");
  }
  if (typeof input.data.content !== "string") {
    throw invalidArguments("PDF data.content must be a string.");
  }
  if (input.filename !== undefined && typeof input.filename !== "string") {
    throw invalidArguments("PDF filename must be a string.");
  }
}

function normalizePdfName(filename?: string) {
  const requestedName = String(filename || "basic-document").trim() || "basic-document";
  const safeName = requestedName
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .slice(0, 200);
  return safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`;
}

function invalidArguments(message: string) {
  return new AgentRuntimeError("INVALID_TOOL_ARGUMENTS", message);
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw new AgentRuntimeError("RUN_ABORTED", "The agent run was cancelled.", true);
  }
}
