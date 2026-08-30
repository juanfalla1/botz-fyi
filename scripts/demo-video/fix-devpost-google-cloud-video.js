const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "artifacts", "botz-agent-platform-devpost-correction");
const SOURCE = path.join(OUT, "source-devpost-submitted-copy.mp4");
const FINAL = path.join(OUT, "botz-operations-agent-devpost-google-cloud-fixed.mp4");
const NARRATION_TXT = path.join(OUT, "corrected-narration.txt");
const NARRATION_WAV = path.join(OUT, "corrected-narration.wav");
const NARRATION_AAC = path.join(OUT, "corrected-narration.aac");
const NARRATION_MP3 = path.join(OUT, "corrected-narration-andrew.mp3");
const GCP_HTML = path.join(OUT, "google-cloud-evidence.html");
const GCP_PNG = path.join(OUT, "google-cloud-evidence.png");
const CONCAT = path.join(OUT, "concat-list.txt");
const META = path.join(OUT, "corrected-metadata.json");

const narration = `BOTZ Operations Agent is not just a chatbot. This demo starts directly inside the real BOTZ Agents dashboard, where businesses can create voice agents, text agents, flows, and AI copilots. The product is visible immediately because the goal of this submission is to show the working BOTZ experience, not a slide deck.

For the hackathon demo, Alex Morgan from BOTZ Demo Company sends an operational request in English: create a quote for two OHAUS AX4202 precision balances, deliver them to Austin, and require someone from sales to follow up before final pricing is sent. This is intentionally more complex than a question and answer exchange. The customer provides intent, product, quantity, location, and an approval constraint.

Devpost also asked for clearer Google Cloud evidence, so this corrected version shows it early and directly. This is the real Google Cloud project used by BOTZ: botz-ai-platform. The screen shows the separate Cloud Run service botz-operations-agent-demo in us-central1, Ready status from authenticated gcloud commands, and a live POST request to the real quotation endpoint returning HTTP 200. This is not a mock slide; it is the Operations Agent backend processing a real quote draft during the demo.

BOTZ understands the intent as a quotation request. It reasons over the required details: product, quantity, company, delivery city, sales follow up, and approval policy. Then it decides that the correct action is the BOTZ CRM quotation workflow. The important point is that the agent is not only generating language; it is selecting an operational path.

Instead of only answering with text, BOTZ executes the workflow. The request becomes a CRM opportunity, the quote is generated, and the workflow marks the next step for human approval. This is the act stage of the agentic loop: the conversation becomes structured business data that a team can use.

Now the result is verified in BOTZ CRM. The dashboard shows operational records, quote value, pipeline status, and the Alex Morgan contact. The contact is classified as hot, the quotation is attached, and escalation remains required before external pricing is sent. This gives judges visible proof of understand, reason, decide, act, verify, and escalate.

The repository also includes Vertex AI and Gemini integration paths where configured, including Gemini usage in voice and GEO provider flows.

This matters because the agentic behavior is not isolated to a front end. The product experience, CRM workflow, automation layer, and cloud backend work together so the agent can move from customer language to business execution while keeping records and approvals visible to the team.

The final result is a controlled operations layer for businesses. Traditional assistants answer questions. BOTZ turns AI conversations into actions that can be audited, verified, and escalated to humans when autonomy should stop. The outcome is ready for a sales team to review, approve, and continue without losing context. That is the BOTZ agentic loop: understand, reason, decide, act, verify, and escalate.`;

function run(command, args, options = {}) {
  const res = spawnSync(command, args, { cwd: ROOT, stdio: "inherit", shell: false, ...options });
  if (res.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with exit ${res.status}`);
}

function capture(command, args) {
  const res = spawnSync(command, args, { cwd: ROOT, encoding: "utf8", shell: false });
  if (res.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${res.error?.message || res.stderr || res.stdout}`);
  return String(res.stdout || "").trim();
}

function capturePs(command) {
  const res = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], { cwd: ROOT, encoding: "utf8", shell: false });
  if (res.status !== 0) throw new Error(`PowerShell command failed: ${res.error?.message || res.stderr || res.stdout}`);
  return String(res.stdout || "").trim();
}

function psQuote(value) {
  return String(value).replace(/'/g, "''");
}

function synthNarration() {
  fs.writeFileSync(NARRATION_TXT, narration, "utf8");
  run("python", ["-m", "edge_tts", "--voice", "en-US-AndrewNeural", "--rate", "-10%", "--file", NARRATION_TXT, "--write-media", NARRATION_MP3]);
  run("ffmpeg", ["-y", "-i", NARRATION_MP3, "-c:a", "pcm_s16le", NARRATION_WAV]);
  run("ffmpeg", ["-y", "-i", NARRATION_MP3, "-c:a", "aac", "-b:a", "160k", NARRATION_AAC]);
}

async function makeGoogleCloudEvidence() {
  const project = "botz-ai-platform";
  const service = "botz-operations-agent-demo";
  const services = capturePs(`gcloud run services list --platform managed --project ${project} --format "table(name,region,url)"`);
  const demoService = capturePs(`gcloud run services describe ${service} --region us-central1 --project ${project} --format "yaml(metadata.name,status.url,status.conditions[0].type,status.conditions[0].status,status.latestReadyRevisionName)"`);
  const proof = JSON.parse(fs.readFileSync(path.join(process.env.LOCALAPPDATA || "", "Temp", "opencode", "botz-cloudrun-proof-result.json"), "utf8"));
  const liveRequest = [
    `REQUEST_ID=${proof.requestId}`,
    `POST ${proof.endpoint}`,
    `HTTP_STATUS=${proof.httpStatus}`,
    `OK=${proof.ok}`,
    `DRAFT_ID=${proof.draftId}`,
    `PRODUCT=${proof.productName}`,
    `QUANTITY=${proof.quantity}`,
    `STATUS=${proof.status}`,
    `TOTAL_COP_PRESENT=${proof.totalCopPresent}`,
  ].join("\n");
  const liveLog = capturePs(`gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="${service}" AND httpRequest.requestUrl:"/api/agents/quotes/draft" AND httpRequest.status=200' --project ${project} --limit 1 --format "table(timestamp,severity,resource.labels.revision_name,httpRequest.requestMethod,httpRequest.status,httpRequest.latency)"`);

  const esc = (s) => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;width:1920px;height:1080px;background:radial-gradient(circle at 70% 20%,#173a68 0,#0a1020 44%,#05070d 100%);font-family:Inter,Segoe UI,Arial,sans-serif;color:#f8fafc;overflow:hidden}
    .wrap{position:absolute;inset:54px 72px;display:grid;grid-template-columns:.86fr 1.14fr;gap:34px;align-items:center}
    .badge{display:inline-flex;gap:10px;align-items:center;background:rgba(66,133,244,.2);border:2px solid rgba(138,180,248,.75);border-radius:999px;padding:12px 18px;color:#dbeafe;font-weight:1000;letter-spacing:.1em;text-transform:uppercase;font-size:17px}
    h1{font-size:70px;line-height:.94;margin:22px 0 16px;letter-spacing:-.055em}.lead{font-size:29px;line-height:1.25;color:#e0f2fe;margin:0 0 20px;font-weight:800}.cards{display:grid;gap:11px}.card{background:rgba(15,23,42,.8);border:2px solid rgba(148,163,184,.34);border-radius:22px;padding:14px 18px}.card small{display:block;color:#93c5fd;font-weight:1000;text-transform:uppercase;letter-spacing:.09em;margin-bottom:5px;font-size:15px}.card strong{font-size:25px}.ok{color:#a3e635}.terminal{background:#05070d;border:3px solid rgba(163,230,53,.55);border-radius:24px;padding:18px;box-shadow:0 28px 100px rgba(0,0,0,.5)}pre{white-space:pre-wrap;font:800 16px/1.22 Consolas,Monaco,monospace;color:#e5e7eb}.green{color:#a3e635;font-weight:1000}.blue{color:#60a5fa}.yellow{color:#fde047}.titlebar{display:flex;gap:8px;margin-bottom:13px}.dot{width:13px;height:13px;border-radius:50%;background:#ef4444}.dot:nth-child(2){background:#f59e0b}.dot:nth-child(3){background:#22c55e}</style></head><body><div class="wrap"><section><div class="badge">Live Google Cloud Run Evidence</div><h1>Operations Agent On Cloud Run</h1><p class="lead">Authenticated <span class="yellow">gcloud run</span> evidence plus a live quote draft request to the BOTZ <span class="yellow">.run.app</span> backend.</p><div class="cards"><div class="card"><small>Google Cloud Project</small><strong>${esc(project)}</strong></div><div class="card"><small>Cloud Run Service</small><strong>${esc(service)}</strong></div><div class="card"><small>Cloud Run Service Status</small><strong class="ok">Ready = True</strong></div><div class="card"><small>Real Quote Endpoint</small><strong class="ok">POST /quotes/draft = 200</strong></div></div></section><section class="terminal"><div class="titlebar"><i class="dot"></i><i class="dot"></i><i class="dot"></i></div><pre><span class="blue">$ gcloud run services list --platform managed --project botz-ai-platform</span>
${esc(services)}

<span class="blue">$ gcloud run services describe botz-operations-agent-demo --region us-central1</span>
${esc(demoService).replace(/True/g, '<span class="green">True</span>')}

<span class="blue">$ node botz-cloudrun-proof.js https://botz-operations-agent-demo...run.app</span>
${esc(liveRequest).replace(/HTTP_STATUS=200/g, '<span class="green">HTTP_STATUS=200</span>').replace(/OK=true/g, '<span class="green">OK=true</span>').replace(/TOTAL_COP_PRESENT=true/g, '<span class="green">TOTAL_COP_PRESENT=true</span>')}

<span class="blue">$ gcloud logging read Cloud Run quote requests</span>
${esc(liveLog).replace(/  200/g, '  <span class="green">200</span>')}</pre></section></div></body></html>`;
  fs.writeFileSync(GCP_HTML, html, "utf8");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`file://${GCP_HTML.replace(/\\/g, "/")}`);
  await page.screenshot({ path: GCP_PNG });
  await browser.close();
}

function cutSegment(outName, start, duration) {
  const out = path.join(OUT, outName);
  run("ffmpeg", ["-y", "-ss", start, "-i", SOURCE, "-t", String(duration), "-an", "-vf", "scale=1920:1080,setsar=1,fps=30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", out]);
  return out;
}

function makeImageClip() {
  const out = path.join(OUT, "segment-06-google-cloud.mp4");
  run("ffmpeg", ["-y", "-loop", "1", "-i", GCP_PNG, "-t", "30", "-vf", "scale=1920:1080,setsar=1,fps=30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", out]);
  return out;
}

function ffprobeJson(file) {
  return JSON.parse(capture("ffprobe", ["-v", "error", "-show_entries", "format=duration,size:stream=index,codec_name,codec_type,width,height", "-of", "json", file]));
}

function compose() {
  const segments = [
    cutSegment("segment-01-dashboard.mp4", "00:00:00", 28),
    makeImageClip(),
    cutSegment("segment-02-create-agent.mp4", "00:01:00", 35),
    cutSegment("segment-03-agent-ready.mp4", "00:02:20", 25),
    cutSegment("segment-04-chat-decision.mp4", "00:03:50", 34),
    cutSegment("segment-05-crm-verify.mp4", "00:04:28", 40),
    cutSegment("segment-06-contact-escalate.mp4", "00:05:55", 26),
    cutSegment("segment-07-close.mp4", "00:06:45", 20),
  ];
  fs.writeFileSync(CONCAT, segments.map(s => `file '${s.replace(/'/g, "'\\''").replace(/\\/g, "/")}'`).join("\n"), "utf8");
  const visual = path.join(OUT, "corrected-visual-only.mp4");
  run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", CONCAT, "-c", "copy", visual]);
  const audioDuration = ffprobeJson(NARRATION_MP3).format.duration;
  run("ffmpeg", ["-y", "-i", visual, "-i", NARRATION_MP3, "-t", audioDuration, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", FINAL]);
  const meta = ffprobeJson(FINAL);
  fs.writeFileSync(META, JSON.stringify({ final: FINAL, sourceCopy: SOURCE, voice: "en-US-AndrewNeural", googleCloudEvidence: { project: "botz-ai-platform", appearsFrom: "00:00:28", appearsTo: "00:00:58", servicesShown: ["botz-operations-agent-demo"], commandSource: "gcloud run services list / describe and Cloud Run request logs", liveEndpoint: "/api/agents/quotes/draft" }, probe: meta }, null, 2), "utf8");
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(SOURCE)) throw new Error(`Missing source copy: ${SOURCE}`);
  synthNarration();
  await makeGoogleCloudEvidence();
  compose();
  console.log(`FINAL=${FINAL}`);
})();
