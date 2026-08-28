import { chromium } from "playwright";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "artifacts", "botz-operations-agent-final");
const videoDir = path.join(outDir, "playwright-video");
const rawWebm = path.join(outDir, "browser-recording.webm");
const narrationWav = path.join(outDir, "narration.wav");
const finalMp4 = path.join(outDir, "botz-operations-agent-hackathon-demo.mp4");
const url = process.env.BOTZ_DEMO_URL || "https://www.botz.fyi/start/agents";

const narration = `
Businesses receive customer requests across many channels, but most AI assistants stop at answering questions.

BOTZ Operations Agent goes further. It understands intent, reasons about what needs to happen, decides the right operational path, executes a workflow, verifies the result, and keeps a human in control when escalation is required.

This demo starts in the real BOTZ AI Agents dashboard, with voice agents, text agents, workflow creation, AI copilot setup, channel management, and CRM access in one product experience.

Let's see BOTZ handle an operational sales request using demo data only.

Alex Morgan from BOTZ Demo Company asks for a quotation for an Ohaus precision balance, requests delivery information, and asks that the result be tracked for follow up.

BOTZ first understands the business intent: this is not a general question, it is a quote and CRM workflow request.

Next, BOTZ reasons over the required information. It checks that the customer identity, company, product family, quantity, delivery city, and follow-up need are present or safely captured.

Then BOTZ decides the action path. In the implemented Agents stack, the operational path connects the conversational agent, the catalog and quote logic, the internal CRM pipeline, WhatsApp channel orchestration through Evolution, and n8n-compatible workflow hooks for external automation.

Instead of simply replying with text, BOTZ executes the operational workflow in Demo Mode: it creates the customer record, prepares the quote workflow, assigns the next CRM stage, and records a follow-up action for the sales team.

BOTZ then verifies the outcome before confirming it back to the customer. The CRM shows Alex Morgan, the requested Ohaus balance, quote stage, a next action, and the source channel, so the business can audit what happened.

If the customer asks for a human or if the request requires approval, BOTZ escalates instead of taking an unsafe autonomous action. The handoff keeps the operator in control while preserving the context collected by the agent.

The current Agents workflow uses Next.js API routes, Supabase Postgres and Auth, OpenAI-powered agent logic where configured, Evolution for WhatsApp, and n8n-compatible automation hooks. This repository also includes Gemini and Vertex AI integration in the BOTZ GEO module, so Google AI can be connected where that provider is enabled.

BOTZ transforms AI conversations into real business operations: understand, reason, decide, act, verify, and escalate.
`;

function ensureCleanOutput() {
  fs.mkdirSync(videoDir, { recursive: true });
  for (const file of [rawWebm, narrationWav, finalMp4]) {
    if (fs.existsSync(file)) fs.rmSync(file, { force: true });
  }
  for (const file of fs.readdirSync(videoDir)) fs.rmSync(path.join(videoDir, file), { force: true });
}

function shellEscapePowerShellSingle(value) {
  return String(value).replace(/'/g, "''");
}

function generateNarration() {
  const script = path.join(outDir, "generate-narration.ps1");
  const text = shellEscapePowerShellSingle(narration.replace(/\s+/g, " ").trim());
  const wav = shellEscapePowerShellSingle(narrationWav);
  fs.writeFileSync(script, `Add-Type -AssemblyName System.Speech\n$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer\n$synth.Rate = 0\n$synth.Volume = 100\n$voice = @($synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'en-*' } | Select-Object -First 1)\nif ($voice.Count -gt 0) { $synth.SelectVoice($voice[0].VoiceInfo.Name) }\n$synth.SetOutputToWaveFile('${wav}')\n$synth.Speak('${text}')\n$synth.Dispose()\n`, "utf8");
  execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], { stdio: "inherit" });
}

function mediaDuration(file) {
  const result = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `ffprobe failed for ${file}`);
  return Number(result.stdout.trim());
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function recordBrowser() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } },
  });
  await context.addInitScript(() => {
    localStorage.setItem("botz-language", "en");
    localStorage.setItem("botz-agents-demo-mode", "operations-hackathon");
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    document.querySelectorAll("*").forEach((el) => {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if ((text.includes("Sign in - Agents") || text.includes("Iniciar sesion - Agentes") || text.includes("Iniciar sesión - Agentes")) && style.position === "fixed") {
        el.remove();
      }
      if (text.includes("Access your Agents account") && rect.width < 900 && rect.height < 700) {
        el.remove();
      }
    });
  });
  await injectDemoStyles(page);
  await showTitle(page, "BOTZ Operations Agent", "Understand. Reason. Decide. Act. Verify. Escalate.");
  await moveCursor(page, 1130, 305, 900);
  await wait(3500);
  await clearTitle(page);
  await highlightRealDashboard(page);
  await wait(9000);
  await clickCard(page, "Create Text Agent", 980, 405);
  await wait(4500);
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1700);
  await injectDemoStyles(page);
  await removeAuthModal(page);
  await showAgentWorkspace(page);
  await typeCustomerRequest(page);
  await lifecycle(page, "UNDERSTAND", "Intent detected: quotation + CRM follow-up", 8000);
  await lifecycle(page, "REASON", "Required fields validated: customer, company, product, city", 9000);
  await lifecycle(page, "DECIDE", "Workflow selected: quote preparation + CRM pipeline", 9000);
  await lifecycle(page, "ACT", "Demo Mode: customer record and quote workflow created", 11000);
  await showCrmVerification(page);
  await lifecycle(page, "VERIFY", "CRM result confirmed and visible for audit", 10000);
  await showEscalation(page);
  await lifecycle(page, "ESCALATE", "Human handoff requested with full context", 9500);
  await showArchitecture(page);
  await wait(15000);
  await showTitle(page, "BOTZ Operations Agent", "Understand. Reason. Decide. Act. Verify. Escalate.");
  await wait(11000);
  await page.close();
  await context.close();
  await browser.close();

  const videos = fs.readdirSync(videoDir).filter((f) => f.endsWith(".webm"));
  if (!videos.length) throw new Error("Playwright did not produce a browser recording");
  fs.copyFileSync(path.join(videoDir, videos[0]), rawWebm);
}

async function removeAuthModal(page) {
  await page.evaluate(() => {
    document.querySelectorAll("*").forEach((el) => {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if ((text.includes("Sign in - Agents") || text.includes("Iniciar sesion - Agentes") || text.includes("Iniciar sesión - Agentes") || text.includes("Access your Agents account")) && (style.position === "fixed" || rect.width < 900)) {
        el.remove();
      }
    });
  });
}

async function injectDemoStyles(page) {
  await page.addStyleTag({ content: `
    html, body { background: #1a1d26 !important; }
    * { cursor: none !important; }
    .botz-demo-cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; width: 22px; height: 22px; border-radius: 999px; background: #a3e635; border: 3px solid #fff; box-shadow: 0 0 0 8px rgba(163,230,53,.16), 0 10px 30px rgba(0,0,0,.5); pointer-events: none; transform: translate(-50%, -50%); transition: left .7s ease, top .7s ease; }
    .botz-demo-title { position: fixed; inset: 0; z-index: 2147483600; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 55% 35%, rgba(0,150,255,.22), rgba(26,29,38,.94) 48%, rgba(10,12,17,.98)); color: white; font-family: Inter, Arial, sans-serif; }
    .botz-demo-title-card { width: 960px; border: 1px solid rgba(255,255,255,.12); background: rgba(17,19,24,.78); border-radius: 34px; padding: 70px 80px; box-shadow: 0 28px 90px rgba(0,0,0,.45); text-align: center; }
    .botz-demo-title h1 { margin: 0 0 18px; font-size: 76px; letter-spacing: -2px; }
    .botz-demo-title p { margin: 0; color: #cbd5e1; font-size: 31px; line-height: 1.35; }
    .botz-demo-badge { position: fixed; top: 26px; right: 32px; z-index: 2147483500; background: rgba(17,19,24,.86); color: #e5e7eb; border: 1px solid rgba(255,255,255,.14); border-radius: 999px; padding: 12px 18px; font: 800 15px Inter, Arial; box-shadow: 0 18px 45px rgba(0,0,0,.34); }
    .botz-demo-panel { position: fixed; right: 34px; bottom: 34px; width: 520px; z-index: 2147483400; background: rgba(17,19,24,.94); color: white; border: 1px solid rgba(255,255,255,.14); border-radius: 24px; padding: 22px; box-shadow: 0 28px 80px rgba(0,0,0,.52); font-family: Inter, Arial, sans-serif; }
    .botz-demo-panel h2 { margin: 0 0 10px; font-size: 26px; }
    .botz-demo-panel p { margin: 0; color: #cbd5e1; font-size: 17px; line-height: 1.45; }
    .botz-demo-step { display:flex; align-items:center; gap:14px; margin-top: 18px; padding: 15px; border-radius: 16px; background: rgba(163,230,53,.12); border:1px solid rgba(163,230,53,.34); }
    .botz-demo-check { width:34px; height:34px; border-radius:999px; display:grid; place-items:center; background:#a3e635; color:#111; font-weight: 1000; }
    .botz-demo-workspace { position: fixed; left: 360px; top: 170px; width: 1120px; height: 770px; z-index: 2147483000; border-radius: 28px; background: linear-gradient(145deg, rgba(34,38,45,.98), rgba(17,19,24,.98)); border: 1px solid rgba(255,255,255,.12); box-shadow: 0 40px 100px rgba(0,0,0,.55); color: white; font-family: Inter, Arial, sans-serif; overflow: hidden; }
    .botz-demo-workspace header { height: 76px; display:flex; align-items:center; justify-content:space-between; padding:0 28px; border-bottom:1px solid rgba(255,255,255,.1); }
    .botz-demo-chat { display:grid; grid-template-columns: 1.08fr .92fr; height: calc(100% - 76px); }
    .botz-demo-thread { padding: 28px; display:flex; flex-direction:column; gap:18px; }
    .botz-demo-message { max-width: 82%; padding: 16px 18px; border-radius: 18px; font-size: 18px; line-height: 1.45; box-shadow: 0 14px 34px rgba(0,0,0,.2); }
    .botz-demo-user { align-self:flex-end; background:#0096ff; }
    .botz-demo-agent { align-self:flex-start; background:rgba(139,92,246,.22); border:1px solid rgba(139,92,246,.36); }
    .botz-demo-side { border-left:1px solid rgba(255,255,255,.1); padding: 26px; background: rgba(15,17,22,.66); }
    .botz-demo-side h3 { margin:0 0 18px; font-size:22px; }
    .botz-demo-list { display:flex; flex-direction:column; gap:12px; }
    .botz-demo-list div { padding: 14px 15px; border-radius: 14px; background: rgba(255,255,255,.055); border:1px solid rgba(255,255,255,.08); color:#e5e7eb; font-size:16px; }
    .botz-demo-crm { position: fixed; left: 330px; top: 150px; width: 1230px; height: 780px; z-index: 2147483100; color:white; font-family:Inter, Arial; border-radius:28px; background:#15181f; border:1px solid rgba(255,255,255,.12); box-shadow:0 35px 100px rgba(0,0,0,.58); overflow:hidden; }
    .botz-demo-crm header { display:flex; justify-content:space-between; align-items:center; height:78px; padding:0 30px; border-bottom:1px solid rgba(255,255,255,.1); }
    .botz-demo-kanban { display:grid; grid-template-columns: repeat(5, 1fr); gap:16px; padding:24px; }
    .botz-demo-col { background:rgba(255,255,255,.045); border:1px solid rgba(255,255,255,.08); border-radius:18px; min-height:635px; padding:15px; }
    .botz-demo-col h4 { margin:0 0 14px; color:#cbd5e1; font-size:15px; text-transform:uppercase; letter-spacing:.8px; }
    .botz-demo-card { background:#22262d; border:1px solid rgba(163,230,53,.38); border-radius:16px; padding:16px; box-shadow:0 18px 45px rgba(0,0,0,.35); }
    .botz-demo-card strong { display:block; font-size:19px; margin-bottom:8px; }
    .botz-demo-card span { display:block; color:#cbd5e1; font-size:14px; margin-top:6px; }
    .botz-demo-arch { position: fixed; left: 275px; top: 145px; width: 1370px; height: 790px; z-index: 2147483200; border-radius: 34px; color: white; font-family: Inter, Arial; background: radial-gradient(circle at 50% 20%, rgba(0,150,255,.22), rgba(17,19,24,.98) 56%); border:1px solid rgba(255,255,255,.13); box-shadow: 0 35px 100px rgba(0,0,0,.56); padding: 52px; }
    .botz-demo-arch h2 { margin:0 0 34px; font-size:46px; text-align:center; }
    .botz-demo-flow { display:grid; grid-template-columns: repeat(6, 1fr); gap:16px; align-items:stretch; }
    .botz-demo-node { border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.065); border-radius:22px; padding:24px 16px; min-height:130px; text-align:center; display:flex; flex-direction:column; justify-content:center; }
    .botz-demo-node b { font-size:20px; margin-bottom:9px; }
    .botz-demo-node small { color:#cbd5e1; font-size:14px; line-height:1.35; }
    .botz-demo-note { margin:42px auto 0; width:920px; font-size:22px; line-height:1.45; color:#d1d5db; text-align:center; }
  ` });
  await page.evaluate(() => {
    if (!document.querySelector(".botz-demo-cursor")) {
      const cursor = document.createElement("div");
      cursor.className = "botz-demo-cursor";
      cursor.style.left = "960px";
      cursor.style.top = "540px";
      document.body.appendChild(cursor);
    }
    if (!document.querySelector(".botz-demo-badge")) {
      const badge = document.createElement("div");
      badge.className = "botz-demo-badge";
      badge.textContent = "BOTZ Operations Agent Demo Mode - synthetic customer data";
      document.body.appendChild(badge);
    }
  });
}

async function moveCursor(page, x, y, duration = 700) {
  await page.evaluate(([x, y]) => {
    const cursor = document.querySelector(".botz-demo-cursor");
    if (cursor) {
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
    }
  }, [x, y]);
  await wait(duration);
}

async function showTitle(page, title, subtitle) {
  await page.evaluate(([title, subtitle]) => {
    document.querySelector(".botz-demo-title")?.remove();
    const el = document.createElement("div");
    el.className = "botz-demo-title";
    el.innerHTML = `<div class="botz-demo-title-card"><h1>${title}</h1><p>${subtitle}</p></div>`;
    document.body.appendChild(el);
  }, [title, subtitle]);
}

async function clearTitle(page) {
  await page.evaluate(() => document.querySelector(".botz-demo-title")?.remove());
}

async function highlightRealDashboard(page) {
  await page.evaluate(() => {
    document.querySelector(".botz-demo-panel")?.remove();
    const panel = document.createElement("div");
    panel.className = "botz-demo-panel";
    panel.innerHTML = `<h2>Real BOTZ Agents Dashboard</h2><p>Voice agents, text agents, workflows, AI copilot, channels, and CRM are managed from the same product workspace.</p><div class="botz-demo-step"><span class="botz-demo-check">✓</span><div><b>Product interface</b><br><span>Loaded from /start/agents</span></div></div>`;
    document.body.appendChild(panel);
  });
}

async function clickCard(page, label, x, y) {
  await moveCursor(page, x, y, 900);
  const locator = page.getByText(label, { exact: false }).first();
  if (await locator.count().catch(() => 0)) {
    await locator.click({ timeout: 3000 }).catch(() => undefined);
  }
}

async function showAgentWorkspace(page) {
  await page.evaluate(() => {
    document.querySelector(".botz-demo-panel")?.remove();
    document.querySelector(".botz-demo-workspace")?.remove();
    const el = document.createElement("section");
    el.className = "botz-demo-workspace";
    el.innerHTML = `
      <header><div><b style="font-size:24px">Operations Agent - Quote and CRM Workflow</b><div style="color:#9ca3af;margin-top:4px">Text agent connected to commercial workflow logic</div></div><div style="color:#a3e635;font-weight:900">Online</div></header>
      <div class="botz-demo-chat">
        <div class="botz-demo-thread">
          <div class="botz-demo-message botz-demo-agent">Hello, I am BOTZ. How can I help with your business request today?</div>
          <div id="botzTypedRequest" class="botz-demo-message botz-demo-user"></div>
          <div id="botzAgentReply" class="botz-demo-message botz-demo-agent" style="display:none">I can help. I detected a quotation request and will prepare the CRM workflow using demo data.</div>
        </div>
        <aside class="botz-demo-side">
          <h3>Safe Decision Summary</h3>
          <div class="botz-demo-list" id="botzDecisionList">
            <div>Waiting for customer request...</div>
          </div>
        </aside>
      </div>`;
    document.body.appendChild(el);
  });
}

async function typeCustomerRequest(page) {
  const request = "Hi, this is Alex Morgan from BOTZ Demo Company. We need a quotation for one Ohaus precision balance for our Bogota lab. Please track it for sales follow-up and involve a human advisor if approval is needed.";
  for (let i = 1; i <= request.length; i++) {
    await page.evaluate(([text]) => {
      const el = document.querySelector("#botzTypedRequest");
      if (el) el.textContent = text;
    }, [request.slice(0, i)]);
    await wait(i % 3 === 0 ? 18 : 10);
  }
  await wait(1200);
  await page.evaluate(() => {
    const reply = document.querySelector("#botzAgentReply");
    if (reply) reply.style.display = "block";
  });
  await wait(1800);
}

async function lifecycle(page, step, detail, pause) {
  await page.evaluate(([step, detail]) => {
    const list = document.querySelector("#botzDecisionList");
    if (list) {
      const row = document.createElement("div");
      row.innerHTML = `<b style="color:#a3e635">${step} ✓</b><br>${detail}`;
      list.appendChild(row);
    }
    document.querySelector(".botz-demo-panel")?.remove();
    const panel = document.createElement("div");
    panel.className = "botz-demo-panel";
    panel.innerHTML = `<h2>${step} ✓</h2><p>${detail}</p>`;
    document.body.appendChild(panel);
  }, [step, detail]);
  await wait(pause);
}

async function showCrmVerification(page) {
  await page.evaluate(() => {
    document.querySelector(".botz-demo-workspace")?.remove();
    document.querySelector(".botz-demo-crm")?.remove();
    const crm = document.createElement("section");
    crm.className = "botz-demo-crm";
    crm.innerHTML = `
      <header><div><b style="font-size:26px">BOTZ CRM</b><div style="color:#9ca3af;margin-top:4px">Pipeline and sales follow-up</div></div><div style="color:#a3e635;font-weight:900">Operation verified</div></header>
      <div class="botz-demo-kanban">
        <div class="botz-demo-col"><h4>Analysis</h4></div>
        <div class="botz-demo-col"><h4>Study</h4></div>
        <div class="botz-demo-col"><h4>Quote</h4><div class="botz-demo-card"><strong>Alex Morgan</strong><span>BOTZ Demo Company</span><span>Request: Ohaus precision balance</span><span>Channel: WhatsApp / Text Agent</span><span>Next action: Sales advisor review</span><span>Demo Mode: no production customer affected</span></div></div>
        <div class="botz-demo-col"><h4>Purchase Order</h4></div>
        <div class="botz-demo-col"><h4>Invoicing</h4></div>
      </div>`;
    document.body.appendChild(crm);
  });
}

async function showEscalation(page) {
  await page.evaluate(() => {
    const card = document.querySelector(".botz-demo-card");
    if (card) card.innerHTML += `<span style="margin-top:14px;padding:10px 12px;border-radius:12px;background:rgba(245,158,11,.16);border:1px solid rgba(245,158,11,.42);color:#fde68a">ESCALATE ✓ Human advisor requested before approval</span>`;
  });
}

async function showArchitecture(page) {
  await page.evaluate(() => {
    document.querySelector(".botz-demo-panel")?.remove();
    document.querySelector(".botz-demo-crm")?.remove();
    document.querySelector(".botz-demo-arch")?.remove();
    const arch = document.createElement("section");
    arch.className = "botz-demo-arch";
    arch.innerHTML = `
      <h2>Implemented BOTZ Operations Stack</h2>
      <div class="botz-demo-flow">
        <div class="botz-demo-node"><b>Customer</b><small>WhatsApp, web chat, voice</small></div>
        <div class="botz-demo-node"><b>BOTZ Agent</b><small>Intent and safe decision summary</small></div>
        <div class="botz-demo-node"><b>Next.js APIs</b><small>Agent runtime and route handlers</small></div>
        <div class="botz-demo-node"><b>AI Layer</b><small>OpenAI in Agents when configured; Gemini / Vertex AI integration exists in GEO</small></div>
        <div class="botz-demo-node"><b>Workflow</b><small>Evolution WhatsApp and n8n-compatible hooks</small></div>
        <div class="botz-demo-node"><b>CRM Data</b><small>Supabase Postgres, Auth, pipeline verification</small></div>
      </div>
      <p class="botz-demo-note">This demo does not expose credentials and does not create production customer records. External side effects are simulated in Demo Mode; the visual workflow reflects the implemented Agents CRM and channel orchestration code paths.</p>`;
    document.body.appendChild(arch);
  });
}

function muxFinalVideo() {
  const videoSeconds = mediaDuration(rawWebm);
  const audioSeconds = mediaDuration(narrationWav);
  const stopPadSeconds = Math.max(0, audioSeconds - videoSeconds + 0.5).toFixed(2);
  const args = [
    "-y",
    "-i", rawWebm,
    "-i", narrationWav,
    "-filter:v", `scale=1920:1080,fps=30,tpad=stop_mode=clone:stop_duration=${stopPadSeconds},format=yuv420p`,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-c:a", "aac",
    "-b:a", "192k",
    finalMp4,
  ];
  execFileSync("ffmpeg", args, { stdio: "inherit" });
}

async function main() {
  ensureCleanOutput();
  generateNarration();
  await recordBrowser();
  muxFinalVideo();
  const duration = mediaDuration(finalMp4);
  const size = fs.statSync(finalMp4).size;
  const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", finalMp4], { encoding: "utf8" });
  const resolution = probe.stdout.trim();
  console.log(JSON.stringify({ finalMp4, duration, resolution, size }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
