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
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!(globalThis as any).pdfjsWorker?.WorkerMessageHandler) {
    const workerPath = "pdfjs-dist/legacy/build/pdf.worker.mjs";
    const worker = await import(workerPath);
    (globalThis as any).pdfjsWorker = { WorkerMessageHandler: worker.WorkerMessageHandler };
  }

  const task = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const doc = await task.promise;
  const chunks: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const text = await page.getTextContent();
    const pageText = (text.items || [])
      .map((item: any) => String(item?.str || ""))
      .join(" ")
      .trim();
    if (pageText) chunks.push(pageText);
  }

  return chunks.join("\n\n").trim();
}

async function extractPdfTextWithOcr(buffer: Buffer) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("OCR automatico no disponible (falta OPENAI_API_KEY)");
  }

  const [{ createRequire }, pdfjs, OpenAI] = await Promise.all([
    import("module"),
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("openai"),
  ]);
  const req = createRequire(import.meta.url);
  const openai = new OpenAI.default({ apiKey });

  if (!(globalThis as any).pdfjsWorker?.WorkerMessageHandler) {
    const workerPath = "pdfjs-dist/legacy/build/pdf.worker.mjs";
    const worker = await import(workerPath);
    (globalThis as any).pdfjsWorker = { WorkerMessageHandler: worker.WorkerMessageHandler };
  }

  const { createCanvas } = req("@napi-rs/canvas");

  const task = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const doc = await task.promise;
  const maxPages = Math.min(doc.numPages, 4);
  const out: string[] = [];

  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");
    await page.render({ canvas: canvas as any, canvasContext: ctx as any, viewport } as any).promise;
    const image64 = canvas.toBuffer("image/png").toString("base64");
    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 1800,
      messages: [
        {
          role: "system",
          content: "Extrae todo el texto legible de la imagen. Devuelve solo texto plano, sin markdown ni comentarios.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe fielmente todo el texto visible de esta pagina." },
            { type: "image_url", image_url: { url: `data:image/png;base64,${image64}` } },
          ],
        },
      ] as any,
    });
    const pageText = String(result.choices?.[0]?.message?.content || "").trim();
    if (pageText) out.push(pageText);
  }

  const joined = out.join("\n\n").trim();
  if (!joined) return "";
  if (doc.numPages > maxPages) {
    return `${joined}\n\n[OCR parcial: se procesaron ${maxPages} de ${doc.numPages} paginas]`;
  }
  return joined;
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
      content = await extractPdfText(buffer);
      if (!content) {
        try {
          content = await extractPdfTextWithOcr(buffer);
        } catch (e: any) {
          ocrErr = String(e?.message || "OCR fallido");
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
