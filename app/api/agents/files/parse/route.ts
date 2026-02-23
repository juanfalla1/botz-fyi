import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import mammoth from "mammoth";

export const runtime = "nodejs";

function getExt(name: string, mime = "") {
  const n = String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[.\s]+$/g, "");
  const i = n.lastIndexOf(".");
  const ext = i >= 0 ? n.slice(i + 1) : "";
  if (ext) return ext;

  const m = String(mime || "").toLowerCase();
  if (m === "application/pdf") return "pdf";
  if (m === "text/plain") return "txt";
  if (m === "text/markdown") return "md";
  if (m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  return "";
}

function looksLikePdf(buffer: Buffer) {
  if (!buffer || buffer.length < 4) return false;
  return buffer.subarray(0, 4).toString("utf8") === "%PDF";
}

async function extractPdfText(buffer: Buffer) {
  const mod = await import("pdf-parse");
  const parser = new (mod as any).PDFParse({ data: buffer });
  try {
    const parsed = await parser.getText();
    return String(parsed?.text || "").trim();
  } finally {
    try { await parser.destroy(); } catch {}
  }
}

async function extractPdfTextWithOcr(buffer: Buffer) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("OCR automatico no disponible (falta OPENAI_API_KEY)");
  }

  const OpenAI = await import("openai");
  const openai = new OpenAI.default({ apiKey });
  const base64 = buffer.toString("base64");
  const response = await (openai as any).responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Extrae el texto del PDF en espanol. Devuelve solo texto plano, sin markdown.",
          },
          {
            type: "input_file",
            filename: "documento.pdf",
            file_data: `data:application/pdf;base64,${base64}`,
          },
        ],
      },
    ],
  });

  const text = String((response as any)?.output_text || "").trim();
  return text;
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: "Falta archivo" }, { status: 400 });
    }

    const ext = getExt(file.name, file.type || "");
    const mime = String(file.type || "").toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    const isPdf = ext === "pdf" || mime === "application/pdf" || looksLikePdf(buffer);
    const isTxt = ext === "txt" || mime === "text/plain";
    const isMd = ext === "md" || mime === "text/markdown";
    const isDocx = ext === "docx" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    let content = "";
    let ocrErr = "";

    if (isTxt || isMd) {
      content = buffer.toString("utf8");
    } else if (isPdf) {
      let parseErr = "";
      try {
        content = await extractPdfText(buffer);
      } catch (e: any) {
        parseErr = String(e?.message || "PDF parse fallido");
      }

      if (!content) {
        try {
          content = await extractPdfTextWithOcr(buffer);
        } catch (e: any) {
          const ocrMsg = String(e?.message || "OCR fallido");
          ocrErr = parseErr ? `${parseErr}. ${ocrMsg}` : ocrMsg;
        }
      }
    } else if (isDocx) {
      const parsed = await mammoth.extractRawText({ buffer });
      content = String(parsed?.value || "").trim();
    } else if (ext === "doc") {
      return NextResponse.json({ ok: false, error: "Formato .doc no soportado. Convierte a .docx" }, { status: 400 });
    } else {
      return NextResponse.json({ ok: false, error: "Formato no soportado para extracción" }, { status: 400 });
    }

    if (!content) {
      const hint = ext === "pdf"
        ? `No se pudo extraer texto del PDF. ${ocrErr ? `OCR automatico fallo: ${ocrErr}` : "Si es escaneado (imagen), conviertelo con OCR antes de subirlo."}`
        : "No se pudo extraer texto del archivo";
      return NextResponse.json({ ok: false, error: hint }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        name: file.name,
        type: file.type || "application/octet-stream",
        content,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error parseando archivo" }, { status: 500 });
  }
}
