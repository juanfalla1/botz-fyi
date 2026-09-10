import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const work = path.join(root, "artifacts", "industry-demo-english");
const voice = "en-US-AndrewMultilingualNeural";

const demos = [
  {
    name: "real-estate",
    source: "botz-real-estate-operations-demo.mp4",
    output: "botz-real-estate-operations-demo-en.mp4",
    segments: [
      [0.5, "A real estate inquiry may begin on WhatsApp and become scattered across messages and manual tasks. BOTZ turns that journey into one visible operation."],
      [17.5, "In the live CRM, Elena Vargas appears as a synthetic WhatsApp lead. The team sees her status, priority, next action and assigned advisor in one place."],
      [34.5, "BOTZ combines commercial and financial context, detects strong purchase intent and recommends moving forward with mortgage analysis."],
      [50.5, "The same opportunity advances through the Kanban pipeline while every decision remains synchronized for sales and operations."],
      [67.5, "Channels preserve the WhatsApp conversation and hand the qualified case to an advisor with a clear next step."],
      [82.5, "The control center and SLA alerts prioritize cases that need attention before an opportunity is lost."],
      [96.5, "The executive dashboard turns activity into lead volume, conversion, pipeline value, channel performance and mortgage health."],
      [112.5, "Mortgage analysis recovers the same lead and calculates payment, debt-to-income ratio, loan-to-value ratio and global score for human review."],
      [130, "BOTZ connects conversation, CRM, analysis, follow-up and financing so the team can close faster with full context."],
    ],
  },
  {
    name: "health",
    source: "botz-demo-comercial.mp4",
    output: "botz-health-operations-demo-en.mp4",
    segments: [
      [0.5, "BOTZ brings the entire care operation into one institutional dashboard."],
      [9.5, "Assignments connect each case with the right professional, schedule and service status."],
      [19, "The professional directory keeps availability, specialties and workload visible."],
      [28.5, "Documentation centralizes files, validation status and pending requirements."],
      [38, "Authorizations make coverage, approved services and expiration dates easy to monitor."],
      [46.5, "Attendance records show delivered care and the operational evidence behind every visit."],
      [55.5, "Professional billing organizes services, amounts and approval status before payment."],
      [64.5, "Settlements close the cycle with a clear, auditable view for the administrative team."],
    ],
  },
  {
    name: "commerce",
    source: "botz-commerce-operations-demo.mp4",
    output: "botz-commerce-operations-demo-en.mp4",
    segments: [
      [0.5, "A customer starts a conversation with a specific product request."],
      [8.5, "BOTZ understands the need, clarifies context and prepares the next commercial action."],
      [18, "The agent reasons over the request and decides which operational tools to use."],
      [28, "Lead scoring identifies intent, urgency and the best path to conversion."],
      [40, "The dashboard keeps customer context and commercial signals visible to the team."],
      [52, "The qualified contact is created in CRM without manual data entry."],
      [63, "BOTZ searches the connected catalog and selects the products that match the request."],
      [73.5, "A complete quote is prepared with items, quantities and pricing."],
      [84, "Human approval remains available before the proposal moves to the customer."],
    ],
  },
];

fs.mkdirSync(work, { recursive: true });

for (const demo of demos) {
  const source = path.join(root, "public", demo.source);
  const output = path.join(root, "public", demo.output);
  if (!fs.existsSync(source)) throw new Error(`Missing source video: ${source}`);

  const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", source], { encoding: "utf8" }).trim());
  const inputs = [source];
  const filters = [];

  demo.segments.forEach(([start, text], index) => {
    const prefix = `${demo.name}-${String(index + 1).padStart(2, "0")}`;
    const textFile = path.join(work, `${prefix}.txt`);
    const rawAudio = path.join(work, `${prefix}-raw.mp3`);
    const fittedAudio = path.join(work, `${prefix}.m4a`);
    fs.writeFileSync(textFile, text, "utf8");
    execFileSync("python", ["-m", "edge_tts", "--voice", voice, "--rate=-4%", "--pitch=-2Hz", "--file", textFile, "--write-media", rawAudio], { stdio: "inherit" });

    const rawDuration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", rawAudio], { encoding: "utf8" }).trim());
    const nextStart = demo.segments[index + 1]?.[0] ?? duration;
    const available = Math.max(1, nextStart - start - 0.3);
    const tempo = Math.max(1, rawDuration / available);
    execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", rawAudio, "-af", `atempo=${tempo.toFixed(4)},apad=pad_dur=0.08`, "-c:a", "aac", "-b:a", "160k", fittedAudio], { stdio: "inherit" });

    inputs.push(fittedAudio);
    filters.push(`[${index + 1}:a]adelay=${Math.round(start * 1000)}:all=1,volume=1.08[a${index}]`);
  });

  const args = ["-y", "-hide_banner", "-loglevel", "error"];
  for (const input of inputs) args.push("-i", input);
  const labels = demo.segments.map((_, index) => `[a${index}]`).join("");
  args.push(
    "-filter_complex", `${filters.join(";")};${labels}amix=inputs=${demo.segments.length}:duration=longest:normalize=0,alimiter=limit=0.95[aout]`,
    "-map", "0:v:0", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
    "-t", duration.toFixed(3), "-movflags", "+faststart", output,
  );
  execFileSync("ffmpeg", args, { stdio: "inherit" });
  console.log(`Created public/${demo.output}`);
}
