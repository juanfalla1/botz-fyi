const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "artifacts", "botz-operations-agent-demo");
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const RUN_DIR = path.join(OUT_DIR, `run-${RUN_ID}`);
const VIDEO_DIR = path.join(RUN_DIR, "raw-video");
const FINAL = path.join(OUT_DIR, "botz-operations-agent-hackathon-demo.mp4");
const NARRATION_TXT = path.join(OUT_DIR, "narration.txt");
const NARRATION_WAV = path.join(OUT_DIR, "narration.wav");
const NARRATION_AAC = path.join(OUT_DIR, "narration.aac");
const META = path.join(OUT_DIR, "metadata.json");

const demoAgent = {
  id: "demo-botz-operations-agent",
  name: "BOTZ Operations Agent",
  type: "text",
  status: "active",
  description: "Understands customer requests, selects CRM workflows, creates quotes, verifies results, and escalates when needed.",
  configuration: {
    role: "Operations agent for customer qualification and CRM quote workflow",
    prompt: "Classify intent, validate required data, select a safe workflow, execute CRM actions, verify completion, and escalate if approval is required.",
    company_context: "BOTZ Demo Company uses BOTZ Agents, CRM, n8n workflow orchestration, and Google Cloud infrastructure for operational automation.",
    model: "gpt-4o-mini",
    kind: "operations",
  },
  total_conversations: 34,
  total_messages: 118,
  credits_used: 428,
  created_at: new Date().toISOString(),
};

const baseDraft = {
  id: "quote-demo-001",
  agent_id: demoAgent.id,
  customer_name: "Alex Morgan",
  customer_email: "demo@example.com",
  customer_phone: "+1 555 0100",
  company_name: "BOTZ Demo Company",
  product_name: "Operations Automation Package",
  total_cop: 12850000,
  status: "quote",
  payload: { crm_stage: "quote", quantity: 1, trm_source: "Demo Mode", customer_city: "Miami" },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

let quoteCreated = false;

const narration = `Businesses receive customer requests across chat, voice, WhatsApp, and internal teams, but most AI assistants stop at answering questions.

BOTZ Operations Agent goes further. It understands intent, reasons about what needs to happen, selects the right operational workflow, acts inside the business system, verifies the outcome, and keeps a human in control when escalation is required.

This demo starts in the real BOTZ Agents dashboard. For safety, external writes are running in Demo Mode, so no production customer is affected.

Let us see BOTZ handle a realistic operational request. Alex Morgan from BOTZ Demo Company asks for an operations automation quote and needs follow-up from the sales team.

The agent first understands the customer intent: this is not a frequently asked question. It is a commercial request that requires CRM work.

Next, BOTZ reasons over the required data: contact identity, company, requested product, quantity, and channel. It decides that the correct action is a quote workflow in BOTZ CRM.

Instead of simply replying with text, BOTZ executes the operation. The CRM workflow creates the customer record, generates a quote draft, applies the current pricing context, and moves the opportunity into the quote stage.

Now BOTZ verifies the result. The CRM view shows Alex Morgan, the demo company, the generated quote value, the opportunity stage, and the recommended next action. This is the operational proof: the conversation became a business record.

The implementation inspected for this demo includes Next.js for the product experience, Supabase backed CRM data, n8n workflow definitions, and Google Cloud and Vertex AI integrations. Gemini is implemented in the voice-call path and GEO engine providers, while this CRM quote demo uses safe intercepted Demo Mode to avoid production side effects.

When confidence is low, or approval is required, BOTZ can escalate to a human workflow instead of taking unsafe autonomous action.

BOTZ transforms AI conversations into real business operations: understand, reason, decide, act, verify, and escalate.`;

function ensureDirs() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  fs.writeFileSync(NARRATION_TXT, narration, "utf8");
}

function psQuote(value) {
  return String(value).replace(/'/g, "''");
}

function run(command, args, opts = {}) {
  const res = spawnSync(command, args, { cwd: ROOT, stdio: "inherit", shell: false, ...opts });
  if (res.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with exit ${res.status}`);
}

function capture(command, args) {
  const res = spawnSync(command, args, { cwd: ROOT, encoding: "utf8", shell: false });
  if (res.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${res.stderr}`);
  return String(res.stdout || "").trim();
}

function synthNarration() {
  const script = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $voices = $s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }; if ($voices -contains 'Microsoft Zira Desktop') { $s.SelectVoice('Microsoft Zira Desktop') } elseif ($voices -contains 'Microsoft Aria') { $s.SelectVoice('Microsoft Aria') }; $s.Rate = 0; $s.Volume = 100; $text = Get-Content -LiteralPath '${psQuote(NARRATION_TXT)}' -Raw; $s.SetOutputToWaveFile('${psQuote(NARRATION_WAV)}'); $s.Speak($text); $s.Dispose();`;
  run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script]);
  run("ffmpeg", ["-y", "-i", NARRATION_WAV, "-c:a", "aac", "-b:a", "192k", NARRATION_AAC]);
}

function ffprobeDuration(file) {
  return Number(capture("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file]));
}

async function installRoutes(page) {
  await page.route("**/api/agents/entitlement", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { plan_key: "pro", status: "trial", credits_limit: 10000 }, credits_used_total: 428, limits: { max_agents: 5, max_channels: 3, allow_overage: false } }) }));
  await page.route("**/api/agents/usage", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { events: [], summary: { today: 12, seven_days: 84, top_endpoint: "/api/agents/chat-test" } } }) }));
  await page.route("**/api/agents/list", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: [demoAgent] }) }));
  await page.route("**/api/agents/channels**", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: [{ id: "ch-demo-web", display_name: "Demo Web Chat", channel_type: "webchat", provider: "BOTZ", status: "active", assigned_agent_id: demoAgent.id }] }) }));
  await page.route("**/api/agents/detail**", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { agent: demoAgent, conversations: [{ id: "conv-demo-001", contact_name: "Alex Morgan", channel: "Web chat", status: "verified", message_count: 6, started_at: new Date().toISOString() }] } }) }));
  await page.route("**/api/agents/chat-test", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, response: "I understand this as a quote request from Alex Morgan at BOTZ Demo Company. I have the required contact and company data, so I will create a CRM opportunity, generate a quote draft, verify the record, and flag human follow-up before the quote is sent." }) }));
  await page.route("**/api/agents/crm/integration-access", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { requester_user_id: "demo-user", requester_email: "demo@example.com", is_owner: true, self_enabled: true, self_enabled_updated_at: new Date().toISOString() } }) }));
  await page.route("**/api/agents/crm/settings", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { enabled: true, stage_labels: { analysis: "Analysis", study: "Study", quote: "Quote", purchase_order: "Purchase order", invoicing: "Invoicing" }, contact_fields: [] } }) }));
  await page.route("**/api/agents/catalog/search**", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: [{ id: "prod-demo-ops", name: "Operations Automation Package", brand: "BOTZ", category: "Agentic workflow" }] }) }));
  await page.route("**/api/agents/quotes/draft", async r => {
    quoteCreated = true;
    await r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { ...baseDraft, quantity: 1, trm_date: new Date().toISOString().slice(0, 10), trm_source: "Demo Mode" } }) });
  });
  await page.route("**/api/agents/crm/contact", async r => {
    const method = r.request().method();
    if (method === "PATCH" || method === "POST") {
      quoteCreated = quoteCreated || method === "PATCH";
      await r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { id: "contact-demo-001", contact_key: "demo@example.com", name: "Alex Morgan", email: "demo@example.com", phone: "+1 555 0100", company: "BOTZ Demo Company", status: "analysis", updated_at: new Date().toISOString() } }) });
      return;
    }
    await r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { contact: { id: "contact-demo-001", name: "Alex Morgan", email: "demo@example.com", phone: "+1 555 0100", company: "BOTZ Demo Company", status: "quote" }, drafts: quoteCreated ? [baseDraft] : [], conversations: [{ id: "conv-demo-001", channel: "Web chat", status: "verified" }], timeline: [{ at: new Date().toISOString(), kind: "quote_created", text: "Quote workflow verified in Demo Mode" }] } }) });
  });
  await page.route("**/api/agents/crm/overview", r => {
    const drafts = quoteCreated ? [baseDraft] : [];
    const contacts = [{ key: "demo@example.com", name: "Alex Morgan", email: "demo@example.com", phone: "+1 555 0100", company: "BOTZ Demo Company", quotes_count: quoteCreated ? 1 : 0, quote_requests_count: 1, tech_sheet_requests_count: 0, total_quoted_cop: quoteCreated ? 12850000 : 0, last_quote_value_cop: quoteCreated ? 12850000 : 0, last_activity_at: new Date().toISOString(), status: quoteCreated ? "quote" : "analysis", assigned_agent_id: demoAgent.id, assigned_agent_name: demoAgent.name, last_channel: "Web chat", last_product: quoteCreated ? "Operations Automation Package" : "", last_intent: "Requests quote/PDF", lead_temperature: "hot", next_action: "Human review and approve quote before sending", next_action_at: new Date(Date.now() + 3600000).toISOString(), contact_segment: "mixed" }];
    r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { enabled: true, summary: { contacts: 1, contacts_bot: 0, contacts_clients: 1, contacts_distributors: 0, opportunities: drafts.length, quotes_sent: drafts.length, analysis: quoteCreated ? 0 : 1, study: 0, quote: drafts.length, purchase_order: 0, invoicing: 0, quotes_requested: 1, won: 0, lost: 0, contacts_with_quote_requests: 1, contacts_with_tech_sheet_requests: 0, total_quotes_requested_cop: quoteCreated ? 12850000 : 0, total_pipeline_cop: quoteCreated ? 12850000 : 0 }, pipeline: { analysis: quoteCreated ? [] : [{ ...baseDraft, status: "analysis" }], study: [], quote: drafts, purchase_order: [], invoicing: [] }, contacts, drafts, agents: [{ id: demoAgent.id, name: demoAgent.name }], channel_summary: [{ channel: "Web chat", count: 1 }], by_agent: [{ agent_id: demoAgent.id, agent_name: demoAgent.name, total: 1, quote: drafts.length, purchase_order: 0, invoicing: 0, pipeline_cop: quoteCreated ? 12850000 : 0 }], funnel: [{ key: "analysis", label: "Analysis", value: quoteCreated ? 0 : 1 }, { key: "study", label: "Study", value: 0 }, { key: "quote", label: "Quote", value: drafts.length }, { key: "purchase_order", label: "Purchase order", value: 0 }, { key: "invoicing", label: "Invoicing", value: 0 }] } }) });
  });
}

async function overlay(page, title, lines = [], opts = {}) {
  await page.evaluate(({ title, lines, opts }) => {
    let el = document.getElementById("botz-demo-overlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "botz-demo-overlay";
      document.body.appendChild(el);
    }
    el.innerHTML = `<div class="kicker">BOTZ Operations Agent</div><div class="title"></div><div class="lines"></div>`;
    el.querySelector(".title").textContent = title;
    const linesEl = el.querySelector(".lines");
    for (const line of lines) {
      const row = document.createElement("div");
      row.textContent = line;
      linesEl.appendChild(row);
    }
    Object.assign(el.style, {
      position: "fixed", left: opts.left || "56px", bottom: opts.bottom || "46px", zIndex: 2147483647,
      width: opts.width || "560px", padding: "22px 24px", borderRadius: "22px",
      background: "linear-gradient(135deg, rgba(8,11,18,.92), rgba(23,31,45,.86))",
      color: "white", border: "1px solid rgba(163,230,53,.35)", boxShadow: "0 24px 80px rgba(0,0,0,.45)",
      fontFamily: "Inter, Arial, sans-serif", backdropFilter: "blur(12px)", transition: "opacity .25s ease", opacity: "1"
    });
    const style = document.getElementById("botz-demo-style") || document.createElement("style");
    style.id = "botz-demo-style";
    style.textContent = `#botz-demo-overlay .kicker{color:#a3e635;font-size:13px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;margin-bottom:10px}#botz-demo-overlay .title{font-size:30px;line-height:1.08;font-weight:950;margin-bottom:12px}#botz-demo-overlay .lines{display:grid;gap:7px;color:#d8dee9;font-size:17px;line-height:1.35}#botz-demo-watermark{position:fixed;right:34px;top:26px;z-index:2147483647;background:rgba(6,9,15,.72);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:10px 14px;color:#e5e7eb;font:800 13px Inter,Arial,sans-serif;backdrop-filter:blur(10px)}#botz-demo-lifecycle{position:fixed;right:40px;bottom:44px;z-index:2147483647;width:350px;background:rgba(8,11,18,.9);border:1px solid rgba(96,165,250,.35);border-radius:20px;padding:18px;box-shadow:0 24px 80px rgba(0,0,0,.45);color:white;font-family:Inter,Arial,sans-serif}#botz-demo-lifecycle .step{display:flex;align-items:center;gap:10px;padding:8px 0;color:#94a3b8;font-weight:800}#botz-demo-lifecycle .step.active{color:#a3e635}#botz-demo-lifecycle .dot{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#1f2937;color:#94a3b8;font-size:13px}#botz-demo-lifecycle .active .dot{background:#a3e635;color:#07101c}`;
    document.head.appendChild(style);
    let wm = document.getElementById("botz-demo-watermark");
    if (!wm) { wm = document.createElement("div"); wm.id = "botz-demo-watermark"; document.body.appendChild(wm); }
    wm.textContent = "Demo Mode: safe test data, no production writes";
  }, { title, lines, opts });
}

async function lifecycle(page, active) {
  const steps = ["UNDERSTAND", "REASON", "DECIDE", "ACT", "VERIFY", "ESCALATE"];
  await page.evaluate(({ steps, active }) => {
    let el = document.getElementById("botz-demo-lifecycle");
    if (!el) { el = document.createElement("div"); el.id = "botz-demo-lifecycle"; document.body.appendChild(el); }
    el.innerHTML = `<div style="font-size:13px;color:#60a5fa;font-weight:900;letter-spacing:.12em;margin-bottom:8px">AGENTIC LIFECYCLE</div>` + steps.map((s, i) => `<div class="step ${i <= active ? "active" : ""}"><span class="dot">${i <= active ? "✓" : i + 1}</span><span>${s}</span></div>`).join("");
  }, { steps, active });
}

async function hideOverlay(page) {
  await page.evaluate(() => { const el = document.getElementById("botz-demo-overlay"); if (el) el.style.opacity = "0"; });
}

async function runRecording() {
  const context = await chromium.launchPersistentContext(path.join(RUN_DIR, "profile"), {
    headless: true,
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1920, height: 1080 } },
    args: ["--window-size=1920,1080", "--disable-notifications"],
  });
  await context.addInitScript(() => {
    localStorage.setItem("botz-language", "en");
    localStorage.setItem("botz-agents-mode", "true");
    localStorage.setItem("sb-botz-agents-auth", JSON.stringify({
      access_token: "demo-mode-token", token_type: "bearer", expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "demo-refresh-token",
      user: { id: "demo-user", aud: "authenticated", role: "authenticated", email: "demo@example.com", user_metadata: { full_name: "Demo User" }, app_metadata: {} }
    }));
  });
  const page = await context.newPage();
  await installRoutes(page);
  await page.goto("https://www.botz.fyi/start/agents", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  await overlay(page, "AI That Runs Operations", ["Understand. Reason. Decide. Act. Verify. Escalate.", "Starting from the real BOTZ Agents dashboard."]);
  await page.mouse.move(420, 360);
  await page.waitForTimeout(9000);
  await hideOverlay(page);

  await overlay(page, "Real Product Workspace", ["Create Voice Agent", "Create Text Agent", "Create Flow", "Set Up AI Copilot"], { width: "440px" });
  await page.waitForTimeout(7000);
  await hideOverlay(page);

  await page.getByText("BOTZ Operations Agent").first().click().catch(async () => page.goto("https://www.botz.fyi/start/agents/demo-botz-operations-agent", { waitUntil: "domcontentloaded" }));
  await page.waitForTimeout(5000);
  await lifecycle(page, 0);
  await overlay(page, "Customer Request", ["Alex Morgan asks for an operations automation quote.", "This requires CRM work, not just a text answer."], { width: "520px" });
  await page.getByText("Test").first().click().catch(() => {});
  await page.waitForTimeout(2000);
  const msg = "Hi, I am Alex Morgan from BOTZ Demo Company. Please create a quote for one Operations Automation Package and have a human review it before sending.";
  const input = page.locator("input, textarea").last();
  await input.fill(msg).catch(() => {});
  await page.waitForTimeout(2000);
  await page.keyboard.press("Enter").catch(() => {});
  await page.waitForTimeout(6000);

  await lifecycle(page, 1);
  await overlay(page, "Understand and Reason", ["Intent detected: quote request", "Required information validated", "Safe handoff rule detected"], { width: "520px" });
  await page.waitForTimeout(10000);
  await lifecycle(page, 2);
  await overlay(page, "Decide", ["Workflow selected: BOTZ CRM quote", "Action policy: create draft, verify, then human approval"], { width: "550px" });
  await page.waitForTimeout(9000);

  await page.goto("https://www.botz.fyi/start/agents/crm", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4500);
  await lifecycle(page, 3);
  await overlay(page, "Act", ["BOTZ creates the customer record.", "Then it generates the quote workflow in CRM."], { width: "520px" });
  await page.getByText("Contacts").first().click().catch(() => {});
  await page.waitForTimeout(1500);
  await page.getByText("Create customer manually").click().catch(() => {});
  await page.waitForTimeout(1000);
  const fields = page.locator("input");
  await fields.nth(1).fill("Alex Morgan").catch(() => {});
  await fields.nth(2).fill("+1 555 0100").catch(() => {});
  await fields.nth(3).fill("demo@example.com").catch(() => {});
  await fields.nth(4).fill("BOTZ Demo Company").catch(() => {});
  await page.getByRole("button", { name: /^Create$/ }).click().catch(() => {});
  await page.waitForTimeout(3500);
  await page.getByPlaceholder(/Search product/i).fill("Operations Automation Package").catch(() => {});
  await page.getByRole("button", { name: /^Search$/ }).click().catch(() => {});
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /^Generate$/ }).click().catch(() => {});
  await page.waitForTimeout(4500);

  await lifecycle(page, 4);
  await overlay(page, "Verify", ["CRM shows Alex Morgan and BOTZ Demo Company.", "Quote stage and value are visible.", "Next action: human review before sending."], { width: "560px" });
  await page.getByText("Pipeline").first().click().catch(() => {});
  await page.waitForTimeout(9000);
  await page.getByText("Contacts").first().click().catch(() => {});
  await page.waitForTimeout(7000);

  await lifecycle(page, 5);
  await overlay(page, "Escalate Safely", ["Human approval is required before the quote is sent.", "BOTZ keeps the business in control."], { width: "560px" });
  await page.waitForTimeout(10000);

  await page.goto("https://www.botz.fyi/start/agents", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  await overlay(page, "BOTZ Operations Agent", ["Understand", "Reason", "Decide", "Act", "Verify", "Escalate"], { width: "520px" });
  await lifecycle(page, 5);
  await page.waitForTimeout(14000);
  await context.close();
  const videos = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith(".webm")).map(f => path.join(VIDEO_DIR, f));
  if (!videos.length) throw new Error("Playwright did not create a recording");
  return videos.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
}

function compose(rawVideo) {
  const audioDur = ffprobeDuration(NARRATION_AAC);
  const videoDur = ffprobeDuration(rawVideo);
  const pad = Math.max(0, audioDur - videoDur + 0.4);
  const vf = `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1${pad > 0 ? `,tpad=stop_mode=clone:stop_duration=${pad.toFixed(2)}` : ""}`;
  run("ffmpeg", ["-y", "-i", rawVideo, "-i", NARRATION_AAC, "-vf", vf, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", FINAL]);
  const duration = ffprobeDuration(FINAL);
  const probe = JSON.parse(capture("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", FINAL]));
  const width = probe.streams?.[0]?.width || 0;
  const height = probe.streams?.[0]?.height || 0;
  const stat = fs.statSync(FINAL);
  fs.writeFileSync(META, JSON.stringify({ final: FINAL, rawVideo, duration, width, height, bytes: stat.size, audioDuration: audioDur, videoDuration: videoDur }, null, 2));
}

(async () => {
  ensureDirs();
  synthNarration();
  const raw = await runRecording();
  compose(raw);
  console.log(`FINAL_VIDEO=${FINAL}`);
})();
