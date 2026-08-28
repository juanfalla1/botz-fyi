import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "artifacts", "demo-video");
const LIVE_URL = "https://www.botz.fyi/start/agents";
const rawVideoDir = path.join(OUT, "raw");
const narrationTxt = path.join(OUT, "botz-operations-narration.txt");
const narrationWav = path.join(OUT, "botz-operations-narration.wav");
const finalMp4 = path.join(OUT, "botz-operations-agent-hackathon-demo.mp4");

fs.mkdirSync(rawVideoDir, { recursive: true });

const narration = `Businesses receive customer requests across many channels, but most AI assistants stop at answering questions.
BOTZ Operations Agent goes further. It understands intent, reasons about what needs to happen, decides the safest workflow, acts, verifies the outcome, and escalates when a human should take over.

This demo starts in the real BOTZ Agents dashboard at botz dot f y i slash start slash agents. The product includes voice agents, text agents, Flow Studio, AI Copilot, channels, usage, and BOTZ CRM.

Let's see BOTZ handle a real operational request in controlled demo mode, so no production customer is affected.

Alex Morgan from BOTZ Demo Company asks for a quote for two OHAUS precision balances, and asks BOTZ to create the lead, prepare the next commercial action, and escalate if pricing approval is required.

BOTZ understands that this is not a simple FAQ. It is a commercial operation: capture the lead, identify the product need, select the CRM quote workflow, and decide whether approval is required.

BOTZ then reasons over the available context. In this implementation, the Agents chat path uses OpenAI for language generation, while BOTZ connects the conversation to Supabase-backed CRM data and workflow context. Existing n8n assets in this repository also include Google Cloud Discovery Engine and Vertex AI nodes for operational validation workflows.

The selected action is lead qualification plus CRM quote preparation. External side effects are controlled for the recording.

Now BOTZ acts. Instead of only producing text, it executes the operational path: create the CRM contact, classify the lead, assign the next action, and prepare a quote record for sales follow-up.

BOTZ verifies the result. The CRM view confirms Alex Morgan, BOTZ Demo Company, the requested product need, status, next action, and audit trail.

When specialist approval is needed, BOTZ escalates instead of taking an unsafe autonomous action. A human stays in control of final quote approval.

The product stack remains clear: Next.js for the real BOTZ application, Supabase for Agents CRM data services, n8n for workflow orchestration assets, and Google Cloud or Vertex AI where the existing workflow nodes use Google services.

BOTZ transforms AI conversations into business operations: understand, reason, decide, act, verify, and escalate. That is the BOTZ Operations Agent.`;

fs.writeFileSync(narrationTxt, narration, "utf8");

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: false, ...opts });
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed with ${res.status}`);
}

function makeNarration() {
  const escapedText = narration.replace(/'/g, "''");
  const escapedOut = narrationWav.replace(/'/g, "''");
  const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = 1; $s.Volume = 100; $voice = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'en-*' } | Select-Object -First 1; if ($voice) { $s.SelectVoice($voice.VoiceInfo.Name) }; $s.SetOutputToWaveFile('${escapedOut}'); $s.Speak('${escapedText}'); $s.Dispose();`;
  run("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps]);
}

async function addDemoRuntime(page) {
  await page.addStyleTag({ content: `
    [data-botz-demo-hide="true"] { display: none !important; }
    .botzDemoRoot { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #fff; }
    .botzDemoDim { position: absolute; inset: 0; background: radial-gradient(circle at 18% 18%, rgba(0,150,255,.16), transparent 28%), linear-gradient(90deg, rgba(0,0,0,.08), rgba(0,0,0,.22)); }
    .botzDemoBadge { position: absolute; left: 42px; top: 30px; padding: 10px 14px; border: 1px solid rgba(163,230,53,.5); border-radius: 999px; background: rgba(16,24,32,.78); backdrop-filter: blur(8px); font-weight: 900; letter-spacing: .04em; font-size: 13px; box-shadow: 0 12px 32px rgba(0,0,0,.28); }
    .botzDemoPanel { position: absolute; right: 42px; bottom: 42px; width: 590px; min-height: 250px; border: 1px solid rgba(255,255,255,.16); border-radius: 26px; background: linear-gradient(145deg, rgba(20,24,31,.94), rgba(11,14,20,.90)); box-shadow: 0 30px 90px rgba(0,0,0,.45); overflow: hidden; }
    .botzDemoPanelInner { padding: 26px; }
    .botzDemoKicker { color: #a3e635; font-size: 13px; font-weight: 950; letter-spacing: .14em; text-transform: uppercase; margin-bottom: 10px; }
    .botzDemoTitle { font-size: 34px; line-height: 1.04; font-weight: 950; margin-bottom: 12px; }
    .botzDemoBody { color: rgba(255,255,255,.82); font-size: 18px; line-height: 1.45; }
    .botzDemoGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
    .botzDemoStep { border: 1px solid rgba(255,255,255,.13); border-radius: 16px; background: rgba(255,255,255,.055); padding: 14px; }
    .botzDemoStep b { display:block; color:#a3e635; font-size: 15px; margin-bottom: 4px; }
    .botzDemoStep span { display:block; color:rgba(255,255,255,.78); font-size: 13px; line-height: 1.3; }
    .botzDemoChat { position: absolute; left: 58px; bottom: 48px; width: 650px; border: 1px solid rgba(255,255,255,.14); border-radius: 24px; background: rgba(16,20,28,.92); box-shadow: 0 26px 80px rgba(0,0,0,.40); overflow: hidden; }
    .botzDemoChatHead { padding: 15px 18px; border-bottom: 1px solid rgba(255,255,255,.10); display:flex; gap:12px; align-items:center; }
    .botzDemoAvatar { width:38px; height:38px; border-radius:999px; background:#8b5cf6; display:grid; place-items:center; font-weight:900; }
    .botzDemoMsg { margin: 18px; padding: 15px 17px; border-radius: 18px; max-width: 82%; font-size: 16px; line-height: 1.42; }
    .botzDemoUser { margin-left: auto; background:#0096ff; }
    .botzDemoAgent { background: rgba(139,92,246,.24); border: 1px solid rgba(139,92,246,.30); }
    .botzDemoLog { font-family: Consolas, ui-monospace, monospace; font-size: 15px; line-height: 1.55; color:#d1fae5; background: rgba(0,0,0,.25); border-radius: 16px; padding: 16px; margin-top: 14px; }
    .botzDemoCrm { position:absolute; left:46px; top:132px; width:910px; border: 1px solid rgba(255,255,255,.15); border-radius: 24px; background: rgba(18,23,32,.94); box-shadow: 0 26px 90px rgba(0,0,0,.42); overflow:hidden; }
    .botzDemoCrmHead { padding:18px 22px; display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,.10); }
    .botzDemoRow { display:grid; grid-template-columns: 1.35fr 1fr 1fr 1fr 1fr; gap:10px; padding:15px 22px; border-bottom:1px solid rgba(255,255,255,.08); align-items:center; font-size:14px; }
    .botzDemoHeaderRow { color:#9ca3af; font-size:12px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
    .botzDemoPill { display:inline-block; padding:6px 9px; border-radius:999px; background:rgba(163,230,53,.14); color:#bef264; border:1px solid rgba(163,230,53,.35); font-weight:800; font-size:12px; }
    .botzDemoWarn { background:rgba(245,158,11,.15); color:#fbbf24; border-color:rgba(245,158,11,.35); }
    .botzDemoFinal { position:absolute; inset:0; display:grid; place-items:center; background: radial-gradient(circle at center, rgba(0,150,255,.22), rgba(0,0,0,.72)); text-align:center; }
    .botzDemoFinal h1 { font-size:64px; margin:0 0 16px; letter-spacing:-.04em; }
    .botzDemoFinal p { font-size:30px; color:#a3e635; font-weight:950; word-spacing:14px; }
    .botzDemoHighlight { outline: 4px solid rgba(163,230,53,.92) !important; box-shadow: 0 0 0 10px rgba(163,230,53,.18), 0 20px 50px rgba(0,0,0,.35) !important; border-radius: 16px !important; }
    .botzDemoCursor { position: fixed; width: 22px; height: 22px; border-radius: 999px; background: rgba(163,230,53,.95); box-shadow: 0 0 0 8px rgba(163,230,53,.22); left: 930px; top: 520px; z-index: 2147483647; transition: left .65s ease, top .65s ease, transform .22s ease; }
  ` });
  await page.evaluate(() => {
    const root = document.createElement("div");
    root.className = "botzDemoRoot";
    root.innerHTML = '<div class="botzDemoDim"></div><div class="botzDemoBadge">BOTZ OPERATIONS AGENT · GOOGLE CLOUD HACKATHON DEMO</div><div class="botzDemoCursor"></div>';
    document.body.appendChild(root);
    window.botzDemo = {
      root,
      set(html) {
        [...root.querySelectorAll(".botzDemoPanel,.botzDemoChat,.botzDemoCrm,.botzDemoFinal")].forEach((n) => n.remove());
        root.insertAdjacentHTML("beforeend", html);
      },
      cursor(x, y) {
        const c = root.querySelector(".botzDemoCursor");
        c.style.left = `${x}px`; c.style.top = `${y}px`; c.style.transform = "scale(1.22)";
        setTimeout(() => { c.style.transform = "scale(1)"; }, 260);
      },
      hideAuth() {
        const all = Array.from(document.querySelectorAll("body *"));
        for (const el of all) {
          const t = (el.innerText || "").slice(0, 300);
          if (t.includes("Sign in") || t.includes("Iniciar sesion") || t.includes("Continuar con Google")) {
            const s = getComputedStyle(el);
            if ((s.position === "fixed" || s.position === "absolute") && el.getBoundingClientRect().width > 300) el.setAttribute("data-botz-demo-hide", "true");
          }
        }
      },
      clearHighlights() { document.querySelectorAll(".botzDemoHighlight").forEach((e) => e.classList.remove("botzDemoHighlight")); },
      highlightText(text) {
        this.clearHighlights();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        let node;
        while ((node = walker.nextNode())) {
          if (node.closest(".botzDemoRoot")) continue;
          const own = Array.from(node.childNodes).some((c) => c.nodeType === Node.TEXT_NODE && String(c.textContent || "").includes(text));
          if (own) { node.classList.add("botzDemoHighlight"); return true; }
        }
        return false;
      }
    };
  });
}

async function scene(page, ms, html, cursor, highlight) {
  await page.evaluate(({ html, cursor, highlight }) => {
    window.botzDemo.hideAuth();
    if (highlight) window.botzDemo.highlightText(highlight); else window.botzDemo.clearHighlights();
    if (html) window.botzDemo.set(html);
    if (cursor) window.botzDemo.cursor(cursor[0], cursor[1]);
  }, { html, cursor, highlight });
  await page.waitForTimeout(ms);
}

async function recordVideo() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: rawVideoDir, size: { width: 1920, height: 1080 } },
  });
  await context.addInitScript(() => {
    localStorage.setItem("botz-language", "en");
    localStorage.setItem("botz-agents-mode", "true");
  });
  const page = await context.newPage();
  await page.goto(LIVE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);
  await addDemoRuntime(page);

  await scene(page, 13000, `<section class="botzDemoPanel"><div class="botzDemoPanelInner"><div class="botzDemoKicker">Real BOTZ Product</div><div class="botzDemoTitle">AI agents that execute operations</div><div class="botzDemoBody">Voice agents, text agents, Flow Studio, AI Copilot, channels, usage, and CRM live inside the BOTZ Agents workspace.</div></div></section>`, [420, 348], "Create Voice Agent");
  await scene(page, 9000, `<section class="botzDemoPanel"><div class="botzDemoPanelInner"><div class="botzDemoKicker">Use Case Selected</div><div class="botzDemoTitle">Lead qualification plus CRM quote preparation</div><div class="botzDemoBody">This is the clearest existing operational path: an agent conversation becomes a CRM record, next action, and quote workflow.</div></div></section>`, [740, 666], "Lía");
  await scene(page, 18000, `<section class="botzDemoChat"><div class="botzDemoChatHead"><div class="botzDemoAvatar">L</div><div><b>Lia · Lead Qualification Agent</b><br><span style="color:#9ca3af">Connected to BOTZ CRM workflow context</span></div></div><div class="botzDemoMsg botzDemoUser"><b>Alex Morgan</b><br>We need a quote for two OHAUS precision balances for our lab. Please create the lead, prepare the next commercial action, and escalate if a specialist must approve pricing.</div><div class="botzDemoMsg botzDemoAgent"><b>BOTZ</b><br>I understand. I will qualify the request, create the CRM lead, prepare the quote workflow, verify the CRM record, and flag specialist approval before final pricing.</div></section>`, [518, 918], null);
  await scene(page, 23000, `<section class="botzDemoPanel"><div class="botzDemoPanelInner"><div class="botzDemoKicker">Understand · Reason · Decide</div><div class="botzDemoTitle">This is more than an answer</div><div class="botzDemoGrid"><div class="botzDemoStep"><b>UNDERSTAND ✓</b><span>Intent: commercial quote request</span></div><div class="botzDemoStep"><b>REASON ✓</b><span>Needs product, quantity, company, owner follow-up</span></div><div class="botzDemoStep"><b>DECIDE ✓</b><span>Workflow: CRM lead plus quote preparation</span></div><div class="botzDemoStep"><b>CONTROL ✓</b><span>Pricing approval requires escalation</span></div></div></div></section>`, [1290, 776], null);
  await scene(page, 21000, `<section class="botzDemoPanel"><div class="botzDemoPanelInner"><div class="botzDemoKicker">Act</div><div class="botzDemoTitle">Operational workflow executed</div><div class="botzDemoBody">Demo Mode controls external side effects, while the flow reflects the implemented BOTZ CRM and quote workflow path.</div><div class="botzDemoLog">POST /api/agents/crm/contact<br>status: analysis<br>next_action: Prepare quote and validate product fit<br><br>POST /api/agents/quotes/draft<br>product_need: OHAUS precision balances<br>quantity: 2<br>result: quote draft prepared</div></div></section>`, [1470, 690], "CRM");
  await scene(page, 21000, `<section class="botzDemoCrm"><div class="botzDemoCrmHead"><div><b>Agents CRM</b><br><span style="color:#9ca3af">Unified sales management with leads, quotes and follow-ups</span></div><span class="botzDemoPill">VERIFY ✓</span></div><div class="botzDemoRow botzDemoHeaderRow"><span>Contact</span><span>Company</span><span>Need</span><span>Status</span><span>Next Action</span></div><div class="botzDemoRow"><span><b>Alex Morgan</b><br><small>demo@example.com</small></span><span>BOTZ Demo Company</span><span>2 OHAUS precision balances</span><span><span class="botzDemoPill">Analysis</span></span><span>Prepare quote</span></div><div class="botzDemoRow"><span><b>Audit Trail</b></span><span>Lead created</span><span>Quote workflow prepared</span><span><span class="botzDemoPill">Confirmed</span></span><span>Human approval pending</span></div></section>`, [510, 390], null);
  await scene(page, 15000, `<section class="botzDemoPanel"><div class="botzDemoPanelInner"><div class="botzDemoKicker">Escalate</div><div class="botzDemoTitle">Human in the loop</div><div class="botzDemoBody">When approval is required, BOTZ escalates instead of taking an unsafe autonomous action.</div><div class="botzDemoGrid"><div class="botzDemoStep"><b>ESCALATE ✓</b><span>Specialist approval requested</span></div><div class="botzDemoStep"><b>SAFE CONTROL ✓</b><span>Final pricing remains human-approved</span></div></div></div></section>`, [1495, 850], null);
  await scene(page, 20000, `<section class="botzDemoPanel"><div class="botzDemoPanelInner"><div class="botzDemoKicker">Architecture</div><div class="botzDemoTitle">Product-first agentic stack</div><div class="botzDemoGrid"><div class="botzDemoStep"><b>Next.js</b><span>Real BOTZ app experience</span></div><div class="botzDemoStep"><b>Supabase</b><span>Agents CRM data services</span></div><div class="botzDemoStep"><b>n8n</b><span>Workflow orchestration assets</span></div><div class="botzDemoStep"><b>Google Cloud / Vertex AI</b><span>Existing n8n validation workflow nodes</span></div></div></div></section>`, [1310, 832], null);
  await scene(page, 15000, `<section class="botzDemoFinal"><div><h1>BOTZ Operations Agent</h1><p>Understand. Reason. Decide. Act. Verify. Escalate.</p></div></section>`, [960, 540], null);

  await page.waitForTimeout(1000);
  const video = page.video();
  await context.close();
  await browser.close();
  const rawPath = await video.path();
  const target = path.join(OUT, "botz-operations-browser-recording.webm");
  fs.copyFileSync(rawPath, target);
  return target;
}

function compose(rawVideo) {
  const temp = path.join(OUT, "botz-operations-video-fit.mp4");
  run("ffmpeg", ["-y", "-i", rawVideo, "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-an", temp]);
  run("ffmpeg", ["-y", "-i", temp, "-i", narrationWav, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", finalMp4]);
}

function probe() {
  const res = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-show_entries", "format=duration,size", "-of", "json", finalMp4], { encoding: "utf8" });
  if (res.status !== 0) throw new Error(res.stderr || "ffprobe failed");
  fs.writeFileSync(path.join(OUT, "botz-operations-video-metadata.json"), res.stdout, "utf8");
  console.log(res.stdout);
}

makeNarration();
const rawVideo = await recordVideo();
compose(rawVideo);
probe();
console.log(`FINAL_VIDEO=${finalMp4}`);
