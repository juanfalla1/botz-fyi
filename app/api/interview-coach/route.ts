import { NextResponse } from "next/server";
import OpenAI from "openai";
import mammoth from "mammoth";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const transcription = await maybeHandleAudioTranscription(req);
    if (transcription) {
      return NextResponse.json({ transcript: transcription });
    }

    const input = await parseInterviewCoachRequest(req);
    const question = input.question;
    const profile = input.profile;
    const jobDescription = input.jobDescription;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const defaultProfile = `
Juan Carlos has over 10 years of experience leading technology, product, automation, CRM, and AI agent projects.
He has worked as Product Owner, Product Manager, and Project Manager.
He uses Scrum, Agile delivery, roadmaps, backlogs, stakeholder management, automation workflows, CRM systems, and Botz as his AI automation platform.
`;

    const finalProfile =
      profile && typeof profile === "string" && profile.trim()
        ? profile
        : defaultProfile;

    const finalJobDescription =
      jobDescription && typeof jobDescription === "string" && jobDescription.trim()
        ? jobDescription
        : "No specific job description provided.";

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `
You are Botz Interview Coach.

Help the user answer interview questions in real time.

Return ONLY valid JSON with this structure:
{
  "matchScore": 0,
  "matchedStrengths": [""],
  "gaps": [""],
  "tailoredPitch": "",
  "spanishMeaning": "",
  "suggestedAnswer": "",
  "shortAnswer": ""
}

Rules:
- Translate the interview question into simple Spanish.
- Suggest a professional answer in English.
- Use the provided CV/profile as the main source of truth and align the answer to the job description.
- If the question asks for "your experience", "tell me about yourself", or a summary, focus the answer on the CV/profile details.
- Use simple English, easy to say in an interview.
- Make the suggested answer natural, confident, and professional.
- Keep the short answer very short.
- Do not invent experience that is not supported by the profile.
- "matchScore" must be an integer from 0 to 100 based on CV vs job description fit.
- "matchedStrengths" must include 3-6 concrete matching points.
- "gaps" must include 2-5 honest gaps or weaker areas. Do not hallucinate.
- "tailoredPitch" must be a short pitch aligned to the role and truthful.
          `,
        },
        {
          role: "user",
          content: `
CV / PROFILE:
${finalProfile}

JOB DESCRIPTION:
${finalJobDescription}

INTERVIEW QUESTION:
${question}
          `,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No response generated" },
        { status: 500 }
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Invalid model response format" },
        { status: 500 }
      );
    }

    const data = parsed as Partial<{
      matchScore: number;
      matchedStrengths: string[];
      gaps: string[];
      tailoredPitch: string;
      spanishMeaning: string;
      suggestedAnswer: string;
      shortAnswer: string;
    }>;

    return NextResponse.json({
      matchScore: typeof data.matchScore === "number" ? Math.max(0, Math.min(100, Math.round(data.matchScore))) : 0,
      matchedStrengths: Array.isArray(data.matchedStrengths)
        ? data.matchedStrengths.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [],
      gaps: Array.isArray(data.gaps)
        ? data.gaps.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [],
      tailoredPitch: typeof data.tailoredPitch === "string" ? data.tailoredPitch : "",
      spanishMeaning: typeof data.spanishMeaning === "string" ? data.spanishMeaning : "",
      suggestedAnswer: typeof data.suggestedAnswer === "string" ? data.suggestedAnswer : "",
      shortAnswer: typeof data.shortAnswer === "string" ? data.shortAnswer : "",
    });
  } catch (error) {
    console.error("Interview Coach error:", error);
    const message = error instanceof Error ? error.message : "Something went wrong";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

async function maybeHandleAudioTranscription(req: Request): Promise<string | null> {
  const contentType = String(req.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) {
    return null;
  }

  const requestClone = req.clone();
  const formData = await requestClone.formData();
  const mode = String(formData.get("mode") || "");
  if (mode !== "transcribe") {
    return null;
  }

  const audioFile = formData.get("audioFile");
  if (!(audioFile instanceof File)) {
    throw new Error("Audio file is required for transcription");
  }

  const transcript = await transcribeAudioFile(audioFile);
  return transcript.trim();
}

async function parseInterviewCoachRequest(req: Request): Promise<{ question: string; profile: string; jobDescription: string }> {
  const contentType = String(req.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const question = String(formData.get("question") || "");
    const profile = String(formData.get("profile") || "");
    const jobDescription = String(formData.get("jobDescription") || "");
    const cvFile = formData.get("cvFile");
    const jdFile = formData.get("jdFile");

    let extractedProfile = "";
    let extractedJd = "";
    if (cvFile instanceof File) {
      extractedProfile = await extractCvTextFromFile(cvFile);
      if (!profile.trim() && !extractedProfile.trim()) {
        throw new Error("Could not extract text from attached CV file. Please paste your CV text manually.");
      }
    }

    if (jdFile instanceof File) {
      extractedJd = await extractCvTextFromFile(jdFile);
      if (!jobDescription.trim() && !extractedJd.trim()) {
        throw new Error("Could not extract text from attached JD file. Please paste the job description text manually.");
      }
    }

    return {
      question,
      profile: profile.trim() || extractedProfile,
      jobDescription: jobDescription.trim() || extractedJd,
    };
  }

  if (contentType.includes("application/json")) {
    const payload = (await req.json()) as { question?: unknown; profile?: unknown; jobDescription?: unknown };
    return {
      question: typeof payload.question === "string" ? payload.question : "",
      profile: typeof payload.profile === "string" ? payload.profile : "",
      jobDescription: typeof payload.jobDescription === "string" ? payload.jobDescription : "",
    };
  }

  const raw = await req.text();
  try {
    const payload = JSON.parse(raw) as { question?: unknown; profile?: unknown; jobDescription?: unknown };
    return {
      question: typeof payload.question === "string" ? payload.question : "",
      profile: typeof payload.profile === "string" ? payload.profile : "",
      jobDescription: typeof payload.jobDescription === "string" ? payload.jobDescription : "",
    };
  } catch {
    return { question: "", profile: "", jobDescription: "" };
  }
}

async function extractCvTextFromFile(file: File): Promise<string> {
  const ext = getExtension(file.name, file.type || "");
  const mime = String(file.type || "").toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  const isText = ext === "txt" || ext === "md" || ext === "json" || ext === "csv" || mime.startsWith("text/");
  const isPdf = ext === "pdf" || mime === "application/pdf";
  const isDocx = ext === "docx" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (isText) {
    return String(await file.text()).trim();
  }

  if (isPdf) {
    const mod: any = await import("pdf-parse");
    const parser = new mod.PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      const text = String(parsed?.text || "").trim();
      if (text) return text;
    } finally {
      try {
        await parser.destroy();
      } catch {}
    }

    const ocrText = await extractPdfTextWithOcr(buffer);
    return ocrText;
  }

  if (isDocx) {
    const parsed = await mammoth.extractRawText({ buffer });
    return String(parsed?.value || "").trim();
  }

  return "";
}

async function transcribeAudioFile(file: File): Promise<string> {
  const transcription = await client.audio.transcriptions.create({
    model: "gpt-4o-mini-transcribe",
    language: "en",
    file,
  });

  return String(transcription.text || "");
}

async function extractPdfTextWithOcr(buffer: Buffer): Promise<string> {
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Extract all readable text from this CV PDF. Return plain text only.",
          },
          {
            type: "input_file",
            filename: "cv.pdf",
            file_data: `data:application/pdf;base64,${buffer.toString("base64")}`,
          },
        ],
      },
    ],
  });

  return String(response.output_text || "").trim();
}

function getExtension(name: string, mime = ""): string {
  const n = String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[.\s]+$/g, "");
  const i = n.lastIndexOf(".");
  const ext = i >= 0 ? n.slice(i + 1) : "";
  if (ext) return ext;

  const m = String(mime || "").toLowerCase();
  if (m === "application/pdf") return "pdf";
  if (m === "application/msword") return "doc";
  if (m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (m === "text/plain") return "txt";
  if (m === "text/markdown") return "md";
  if (m === "application/json") return "json";
  if (m === "text/csv") return "csv";
  return "";
}
