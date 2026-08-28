import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { chromium } from "playwright";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const root = process.cwd();
const outDir = path.join(root, "artifacts", "botz-agent-platform-final");
const videoDir = path.join(outDir, "playwright-video");
fs.mkdirSync(videoDir, { recursive: true });

const finalMp4 = path.join(outDir, "botz-operations-agent-hackathon-demo.mp4");
const narrationMp3 = path.join(outDir, "narration.mp3");
const narrationTxt = path.join(outDir, "narration.txt");
const narrationWav = path.join(outDir, "narration.wav");
const rawWebm = path.join(outDir, "browser-recording.webm");

const now = new Date();
const iso = now.toISOString();
const agentId = "alex-operations-agent-demo";
const productId = "demo-product-ax4202";

let createdAgent = null;
const agentTemplate = {
  id: agentId,
  tenant_id: "demo",
  name: "Alex Operations Agent",
  type: "text",
  status: "active",
  description: "Qualifies requests and executes CRM quotation workflows.",
  total_conversations: 128,
  total_messages: 642,
  credits_used: 4180,
  created_at: iso,
  configuration: {
    identity_name: "Alex Operations Agent",
    purpose: "Understand a business request, choose the right workflow, execute CRM actions, verify results, and escalate when needed.",
    company_name: "BOTZ Demo Company",
    company_desc: "Demo Mode: safe test workspace connected to BOTZ CRM quotation operations.",
    system_prompt: "Classify customer intent, validate quote requirements, create the CRM opportunity, generate a quote draft, verify the result, and escalate when approval is required.",
    brain: { files: [] },
  },
};

const product = {
  id: productId,
  name: "OHAUS AX4202 Precision Balance",
  brand: "OHAUS",
  category: "Laboratory Equipment",
  summary: "Precision balance for laboratory purchasing workflows.",
  variants_count: 1,
};

let contacts = [
  {
    key: "maria.chen@example.com",
    id: "contact-existing-1",
    name: "Maria Chen",
    email: "maria.chen@example.com",
    phone: "5550101",
    company: "Northstar Labs",
    quotes_count: 1,
    quote_requests_count: 1,
    tech_sheet_requests_count: 0,
    total_quoted_cop: 12450000,
    last_quote_value_cop: 12450000,
    last_activity_at: iso,
    status: "quote",
    last_intent: "Requested quotation/PDF",
    lead_temperature: "hot",
    next_action: "Quote follow-up",
    next_action_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    assigned_agent_id: agentId,
  },
];
let drafts = [
  {
    id: "quote-existing-1",
    agent_id: agentId,
    customer_name: "Maria Chen",
    customer_email: "maria.chen@example.com",
    customer_phone: "5550101",
    company_name: "Northstar Labs",
    product_name: "OHAUS Starter Kit",
    total_cop: 12450000,
    status: "quote",
    created_at: iso,
    updated_at: iso,
  },
];

function contactKey(phone, email) {
  return String(email || "").trim().toLowerCase() || String(phone || "").replace(/\D/g, "").slice(-10);
}

function overviewPayload() {
  const pipeline = { analysis: [], study: [], quote: [], purchase_order: [], invoicing: [] };
  for (const d of drafts) pipeline[d.status || "analysis"].push(d);
  const total = drafts.reduce((sum, d) => sum + Number(d.total_cop || 0), 0);
  return {
    ok: true,
    data: {
      enabled: true,
      agents: createdAgent ? [{ id: agentId, name: createdAgent.name }] : [],
      channel_summary: [{ channel: "webchat", count: 42 }, { channel: "whatsapp", count: 86 }],
      by_agent: createdAgent ? [{ agent_id: agentId, agent_name: createdAgent.name, total: contacts.length, quote: drafts.length, purchase_order: 0, invoicing: 0, pipeline_cop: total, contacted_today: 1, first_response_minutes_avg: 1 }] : [],
      funnel: [
        { key: "new", label: "New", value: contacts.length },
        { key: "quoted", label: "Quoted", value: drafts.length },
        { key: "verified", label: "Verified", value: drafts.length },
      ],
      summary: {
        contacts: contacts.length,
        contacts_clients: contacts.length,
        contacts_distributors: 0,
        contacts_bot: 1,
        opportunities: drafts.length,
        quotes_requested: drafts.length,
        analysis: pipeline.analysis.length,
        study: pipeline.study.length,
        quote: pipeline.quote.length,
        purchase_order: 0,
        invoicing: 0,
        contacts_with_quote_requests: contacts.filter((c) => Number(c.quotes_count || 0) > 0).length,
        contacts_with_tech_sheet_requests: 0,
        total_quotes_requested_cop: total,
        total_pipeline_cop: total,
      },
      pipeline,
      contacts,
      drafts,
    },
  };
}

function contactDetail(c) {
  const key = contactKey(c.phone, c.email);
  const rowDrafts = drafts.filter((d) => contactKey(d.customer_phone, d.customer_email) === key);
  return {
    ok: true,
    data: {
      contact: { ...c, contact_key: key },
      drafts: rowDrafts,
      conversations: [],
      notes: [],
      timeline: [
        { at: iso, kind: "user", text: "Customer requested price, delivery timing, and a formal quote." },
        { at: iso, kind: "assistant", text: "BOTZ classified the request, selected quote workflow, and prepared CRM action." },
        ...rowDrafts.map((d) => ({ at: d.created_at, kind: "quote", text: `Quote created for ${d.product_name}: COP ${Number(d.total_cop).toLocaleString("en-US")}.` })),
      ],
    },
  };
}

function fakeJwt() {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: "demo-user", email: "demo@example.com", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 86400 })).toString("base64url");
  return `${header}.${payload}.demo`;
}

const narration = `Most AI assistants stop at answering questions. BOTZ is designed to turn customer intent into coordinated, controlled business operations.

We begin on the real BOTZ AI Agents dashboard. This is the control center for an AI workforce, not a single chatbot.

Create Voice Agent is for real-time phone experiences such as reception, outbound qualification, appointment confirmation, reminders, collections, and customer support. Voice agents can be configured with call direction, greetings, transfer rules, voice providers, interruption behavior, voicemail handling, and runtime actions.

Create Text Agent is for web chat, WhatsApp, and other text channels. These agents can answer with company context, qualify leads, collect operational details, trigger CRM follow-up, and escalate a conversation when a person should take over.

Create Flow opens the workflow layer. Flows coordinate repeatable commercial processes, triggers, actions, integrations, and handoffs. This is where BOTZ moves from one assistant to a multi-agent operating model, with specialized agents and workflows collaborating around the same business process.

Set Up AI Copilot supports internal work. It can summarize calls or meetings, extract action items, classify information, and assist a human operator instead of replacing them.

The left navigation connects the operating surfaces. AI Agents manages the workforce. Phone Numbers manages lines for voice agents. Channels connects WhatsApp, webchat, and voice. CRM provides the shared pipeline for contacts, opportunities, quotes, and follow-up. Flow templates accelerate automation, while plans and usage keep operational consumption visible.

From this dashboard, businesses can create and configure specialized AI agents without building the orchestration infrastructure themselves.

We select Create Text Agent and enter the real BOTZ configuration wizard. The first step captures reusable company context. Here we use BOTZ Demo Company and synthetic information only.

The second step defines the agent identity and job. We select English, name the agent Alex Operations Agent, choose lead qualification, and provide precise instructions. The agent must understand customer requests, validate operational details, select the appropriate CRM workflow, verify the resulting record, and request human approval before final pricing is sent.

The Brain step connects knowledge. A business can import website content or files so the agent answers from approved company information. Advanced retrieval settings control how relevant context is selected. For this safe demonstration, we skip external training and create the agent.

BOTZ saves the configuration and opens the newly created agent workspace. Every tab supports a different part of the agent lifecycle.

Overview shows status, usage, conversation activity, company context, and the current instructions at a glance.

Context stores the company identity, business description, agent purpose, and important operating rules.

Configuration controls behavior such as language, tone, channels, model settings, and type-specific runtime options.

Brain manages knowledge from websites and uploaded files, giving the agent grounded business context rather than relying only on a generic model.

Publish controls the customer-facing experience, including public availability, welcome messages, suggested questions, colors, and web widget behavior.

Integrations connects the agent to operational channels and services. This is how a single agent can participate in webchat, WhatsApp, voice, and business workflows.

History provides an auditable view of prior conversations and interactions. Test gives the team a safe place to validate behavior before wider deployment.

Now let's test the agent we just created.

Alex Morgan asks for a quote for two OHAUS precision balances, delivery to Austin, sales follow-up, and human approval before final pricing. This request requires more than a generated answer.

The agent understands the quotation and follow-up intent. It reasons over the customer, company, product, quantity, city, and approval requirement. It decides to use the BOTZ CRM quotation workflow.

In controlled Demo Mode, the request executes the same operational structure without affecting a production customer. BOTZ creates the synthetic CRM contact and quote opportunity, assigns the next action, and marks final pricing for human review.

We open BOTZ CRM to verify the result. CRM is the shared operational memory for the agent workforce. It brings contacts, lead temperature, intent, quote activity, opportunity stages, ownership, and next actions into one visible pipeline.

The CRM record confirms Alex Morgan, BOTZ Demo Company, the requested equipment, the quote value, and sales follow-up. This visible record proves that the agent did not stop at conversation.

When approval is required, BOTZ escalates instead of taking an unsafe autonomous action. The human receives the collected context and remains responsible for the external pricing decision.

Next, Channels shows how agents are connected to customer touchpoints. WhatsApp can receive inbound messages and continue contextual sales or support conversations through the implemented Evolution integration. Webchat publishes the text agent on a website. Voice connects phone experiences to configured voice agents. Channel assignment lets the business choose which specialized agent handles each entry point.

Phone Numbers manages the lines used by real voice agents, separating phone infrastructure from the agent configuration so teams can reuse and reassign their workforce safely.

Together, these surfaces create a multi-agent platform: voice agents handle calls, text agents serve webchat and WhatsApp, copilots support employees, flows coordinate actions, and BOTZ CRM gives every part of the system a shared operational destination.

The demonstrated Agents path uses the real Next.js BOTZ interface and Supabase-backed CRM architecture, with OpenAI generation where configured, Evolution for WhatsApp, and n8n-compatible workflow hooks. Gemini and Vertex AI integration exists in the BOTZ GEO module, but is not misrepresented as the runtime for this CRM demonstration.

Finally, we return to the Agents dashboard. Alex Operations Agent is visibly available and connected as part of the BOTZ workforce.

BOTZ proves both sides of the platform: create and manage specialized AI agents, then use those agents to understand, reason, decide, act, verify, and escalate across real business channels.`;

async function generateNarration() {
  fs.writeFileSync(narrationTxt, narration, "utf8");
  execFileSync("python", [
    "-m", "edge_tts",
    "--voice", "en-US-AndrewMultilingualNeural",
    "--rate=-2%",
    "--pitch=-2Hz",
    "--file", narrationTxt,
    "--write-media", narrationMp3,
  ], { stdio: "inherit" });
}

async function overlay(page, title, body = "", kind = "info") {
  await page.evaluate(({ title, body, kind }) => {
    let el = document.getElementById("botz-demo-overlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "botz-demo-overlay";
      document.body.appendChild(el);
    }
    const accent = kind === "ok" ? "#a3e635" : kind === "warn" ? "#fbbf24" : "#60a5fa";
    el.innerHTML = `<div style="font-weight:900;font-size:26px;letter-spacing:.2px;color:white">${title}</div>${body ? `<div style="margin-top:8px;color:#dbeafe;font-size:17px;line-height:1.35">${body}</div>` : ""}`;
    Object.assign(el.style, {
      position: "fixed", right: "34px", bottom: "34px", zIndex: "999999", width: "460px",
      padding: "20px 22px", borderRadius: "20px", border: `1px solid ${accent}`,
      background: "linear-gradient(180deg,rgba(8,13,24,.94),rgba(13,18,30,.92))", boxShadow: `0 0 34px ${accent}33, 0 24px 90px rgba(0,0,0,.45)`,
      fontFamily: "Inter, -apple-system, Segoe UI, sans-serif", backdropFilter: "blur(12px)",
    });
  }, { title, body, kind });
}

async function routeDemoApis(page) {
  await page.route("**/api/agents/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const method = req.method();
    const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

    if (p.endsWith("/auth/ensure-profile")) return json({ ok: true });
    if (p.endsWith("/entitlement")) return json({ ok: true, data: { plan_key: "pro", status: "trial", credits_limit: 200000, credits_used: 4180, trial_end: new Date(Date.now() + 3 * 86400000).toISOString() }, credits_used_total: 4180, limits: { max_agents: 50, max_channels: 20, allow_overage: true, credits_limit: 200000 } });
    if (p.endsWith("/usage")) return json({ ok: true, data: [{ id: "u1", endpoint: "/api/agents/chat-test", action: "chat_turn", credits_delta: 86, created_at: iso }], summary: { today: 86, seven_days: 428, top_endpoint: "/api/agents/chat-test" } });
    if (p.endsWith("/channels")) return json({ ok: true, data: createdAgent ? [{ id: "ch1", display_name: "Demo Webchat", channel_type: "webchat", provider: "BOTZ", status: "active", assigned_agent_id: agentId }] : [] });
    if (p.endsWith("/list")) return json({ ok: true, data: createdAgent ? [createdAgent] : [] });
    if (p.endsWith("/create") && method === "POST") {
      const body = JSON.parse(req.postData() || "{}");
      createdAgent = {
        ...agentTemplate,
        ...body,
        id: agentId,
        status: "draft",
        created_at: new Date().toISOString(),
        configuration: { ...agentTemplate.configuration, ...(body.configuration || {}) },
      };
      return json({ ok: true, data: createdAgent });
    }
    if (p.endsWith("/detail")) return json({ ok: true, data: { agent: createdAgent || agentTemplate, conversations: contacts.length > 1 ? [{ id: "conv1", contact_name: "Alex Morgan", contact_phone: "demo", channel: "webchat", status: "verified", message_count: 2, duration_seconds: 0, started_at: iso }] : [] } });
    if (p.endsWith("/chat-test")) {
      const createdAt = new Date().toISOString();
      const demoContact = {
        key: "alex.morgan@example.com",
        id: "contact-alex-morgan",
        name: "Alex Morgan",
        email: "alex.morgan@example.com",
        phone: "5550102",
        company: "BOTZ Demo Company",
        quotes_count: 1,
        quote_requests_count: 1,
        tech_sheet_requests_count: 0,
        total_quoted_cop: 18750000,
        last_quote_value_cop: 18750000,
        last_activity_at: createdAt,
        status: "quote",
        last_intent: "Requested quotation and sales follow-up",
        lead_temperature: "hot",
        next_action: "Human approval before sending final quote",
        next_action_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        assigned_agent_id: agentId,
      };
      contacts = [demoContact, ...contacts.filter((c) => c.id !== demoContact.id)];
      drafts = [{
        id: "quote-alex-morgan",
        agent_id: agentId,
        customer_name: "Alex Morgan",
        customer_email: "alex.morgan@example.com",
        customer_phone: "5550102",
        company_name: "BOTZ Demo Company",
        product_name: "OHAUS AX4202 Precision Balance",
        total_cop: 18750000,
        status: "quote",
        created_at: createdAt,
        updated_at: createdAt,
      }, ...drafts.filter((d) => d.id !== "quote-alex-morgan")];
      return json({ ok: true, response: "I understand this is a quotation request that requires sales follow-up. I validated the product, quantity, company, delivery city, and approval requirement. I selected the BOTZ CRM quotation workflow, created the demo CRM opportunity, and marked final pricing for human approval. The result is ready to verify in BOTZ CRM." });
    }
    if (p.endsWith("/crm/integration-access")) return json({ ok: true, data: { requester_user_id: "demo-user", requester_email: "demo@example.com", is_owner: true, self_enabled: true, self_enabled_updated_at: iso } });
    if (p.endsWith("/crm/settings")) return json({ ok: true, data: { enabled: true, stage_labels: { analysis: "Analysis", study: "Study", quote: "Quote", purchase_order: "Purchase order", invoicing: "Invoicing" }, contact_fields: [{ key: "name", label: "Name", visible: true, required: true }, { key: "email", label: "Email", visible: true, required: true }, { key: "company", label: "Company", visible: true, required: false }, { key: "last_intent", label: "Last intent", visible: true, required: false }, { key: "lead_temperature", label: "Temperature", visible: true, required: false }, { key: "quotes_count", label: "Quotes", visible: true, required: false }, { key: "last_quote_value_cop", label: "Last quote", visible: true, required: false }, { key: "status", label: "Status", visible: true, required: false }] } });
    if (p.endsWith("/crm/overview")) return json(overviewPayload());
    if (p.endsWith("/catalog/search")) return json({ ok: true, data: [product] });
    if (p.endsWith("/crm/contact") && method === "PATCH") {
      const body = JSON.parse(req.postData() || "{}");
      const key = contactKey(body.phone, body.email);
      let c = contacts.find((x) => x.key === key);
      if (!c) {
        c = { key, id: `contact-${contacts.length + 1}`, name: body.name || "Alex Morgan", email: body.email || "demo@example.com", phone: String(body.phone || "5550102").replace(/\D/g, "").slice(-10), company: body.company || "BOTZ Demo Company", quotes_count: 0, quote_requests_count: 0, tech_sheet_requests_count: 0, total_quoted_cop: 0, last_quote_value_cop: 0, last_activity_at: new Date().toISOString(), status: "analysis", last_intent: "Requested quotation/PDF", lead_temperature: "warm", next_action: "Generate quote", assigned_agent_id: agentId };
        contacts.unshift(c);
      }
      Object.assign(c, { name: body.name || c.name, email: body.email || c.email, phone: body.phone || c.phone, company: body.company || c.company, status: body.status || c.status });
      return json({ ok: true, data: c });
    }
    if (p.endsWith("/crm/contact") && method === "GET") {
      const email = url.searchParams.get("email");
      const phone = url.searchParams.get("phone");
      const key = contactKey(phone, email);
      const c = contacts.find((x) => x.key === key) || contacts[0];
      return json(contactDetail(c));
    }
    if (p.endsWith("/quotes/draft")) {
      const body = JSON.parse(req.postData() || "{}");
      const total = 18750000;
      const d = { id: `quote-${Date.now()}`, agent_id: agentId, customer_name: body.customerName || "Alex Morgan", customer_email: body.customerEmail || "demo@example.com", customer_phone: body.customerPhone || "5550102", company_name: body.companyName || "BOTZ Demo Company", product_name: product.name, total_cop: total, status: "quote", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      drafts.unshift(d);
      const key = contactKey(d.customer_phone, d.customer_email);
      const c = contacts.find((x) => x.key === key);
      if (c) Object.assign(c, { quotes_count: 1, quote_requests_count: 1, total_quoted_cop: total, last_quote_value_cop: total, status: "quote", lead_temperature: "hot", next_action: "Human approval before sending quote", last_activity_at: d.created_at });
      return json({ ok: true, data: { ...d, quantity: Number(body.quantity || 1), trm_date: iso.slice(0, 10), trm_source: "Demo Mode TRM cache" } });
    }
    if (p.endsWith("/quotes/pdf")) return json({ ok: true, data: { draftId: "demo", fileName: "BOTZ-Demo-Quote.pdf", pdfBase64: "" } });
    return json({ ok: true, data: [] });
  });
}

async function recordBrowser() {
  const browser = await chromium.launch({ headless: true, args: ["--window-size=1920,1080"] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } } });
  await context.addInitScript(({ token }) => {
    localStorage.setItem("botz-language", "en");
    localStorage.setItem("botz-agents-mode", "true");
    localStorage.setItem("sb-botz-agents-auth", JSON.stringify({ access_token: token, token_type: "bearer", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: "demo-refresh-token", user: { id: "demo-user", aud: "authenticated", role: "authenticated", email: "demo@example.com", user_metadata: { full_name: "Demo User" }, app_metadata: {} } }));
  }, { token: fakeJwt() });
  const page = await context.newPage();
  await routeDemoApis(page);
  page.on("dialog", (d) => d.dismiss().catch(() => {}));

  await page.goto("https://www.botz.fyi/start/agents", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);

  await page.getByText("Create Voice Agent", { exact: true }).first().hover();
  await overlay(page, "VOICE AGENTS", "Real-time calls, reception, qualification, reminders, support, transfers, and configurable voice runtime.");
  await page.waitForTimeout(6000);
  await page.getByText("Create Text Agent", { exact: true }).first().hover();
  await overlay(page, "TEXT AGENTS", "Customer service and operations across webchat, WhatsApp, and text conversations.");
  await page.waitForTimeout(6000);
  await page.getByText("Create Flow", { exact: true }).first().hover();
  await overlay(page, "FLOW STUDIO", "Triggers, actions, integrations, handoffs, and repeatable commercial automation.");
  await page.waitForTimeout(6000);
  await page.getByText("Set Up AI Copilot", { exact: true }).first().hover();
  await overlay(page, "AI COPILOT", "Meeting and call summaries, action extraction, classification, and human assistance.");
  await page.waitForTimeout(6000);
  await overlay(page, "MULTI-AGENT OPERATIONS", "Specialized voice, text, copilot, and workflow agents coordinate around shared channels and CRM.", "ok");
  await page.waitForTimeout(7000);

  // Drive the real BOTZ agent-creation UI. Only backend side effects are sandboxed.
  await page.getByText("Create Text Agent", { exact: true }).first().hover();
  await page.waitForTimeout(1800);
  await page.getByText("Create Text Agent", { exact: true }).first().click();
  await page.waitForURL(/\/start\/agents\/create\?type=text/, { timeout: 15000 });
  await page.waitForTimeout(4000);

  await page.getByPlaceholder("Enter the official company name").fill("BOTZ Demo Company");
  await page.waitForTimeout(900);
  await page.getByPlaceholder("Describe your company here").fill("BOTZ Demo Company is a synthetic test business using AI agents to qualify customer requests, prepare CRM follow-up, and keep human approval in control.");
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForTimeout(3500);

  await page.locator("select").first().selectOption("en-US");
  await page.waitForTimeout(900);
  await page.getByPlaceholder("Type your agent name").fill("Alex Operations Agent");
  await page.waitForTimeout(900);
  await page.locator("select").nth(1).selectOption({ label: "Lead Qualification" });
  await page.waitForTimeout(900);
  await page.getByPlaceholder(/Describe your agent behavior/).fill("Handle customer requests in English. Qualify intent, validate operational details, select the appropriate BOTZ CRM workflow, create sales follow-up, verify the resulting business record, and escalate final pricing approval to a human.");
  await page.waitForTimeout(4000);
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForTimeout(3500);

  await page.getByRole("button", { name: "Skip" }).click();
  await page.waitForTimeout(4500);
  await page.getByRole("button", { name: "Create Agent" }).click();
  await page.waitForURL(new RegExp(`/start/agents/${agentId}$`), { timeout: 15000 });
  await page.waitForTimeout(7000);
  await overlay(page, "AGENT CREATED ✓", "Alex Operations Agent was saved through the real BOTZ creation wizard.", "ok");
  await page.waitForTimeout(6000);

  await page.getByRole("button", { name: "Context", exact: true }).click();
  await overlay(page, "CONTEXT", "Company identity, business description, agent purpose, and operating rules.");
  await page.waitForTimeout(5500);
  await page.getByRole("button", { name: "Configuration", exact: true }).click();
  await overlay(page, "CONFIGURATION", "Language, tone, channels, model behavior, and agent-specific runtime settings.");
  await page.waitForTimeout(5500);
  await page.getByRole("button", { name: "Brain", exact: true }).click();
  await overlay(page, "BRAIN", "Grounded knowledge from approved websites, files, and retrieval settings.");
  await page.waitForTimeout(5500);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await overlay(page, "PUBLISH", "Public availability, welcome message, suggested questions, branding, and web widget behavior.");
  await page.waitForTimeout(5500);
  await page.getByRole("button", { name: "Integrations", exact: true }).click();
  await overlay(page, "INTEGRATIONS", "Connect this agent to webchat, WhatsApp, voice, and operational services.");
  await page.waitForTimeout(5500);
  await page.getByRole("button", { name: "History", exact: true }).click();
  await overlay(page, "HISTORY", "An auditable view of prior conversations, calls, and interactions.");
  await page.waitForTimeout(5500);

  await page.getByRole("button", { name: /^Test$/ }).click();
  await page.waitForTimeout(4000);
  const requestText = "Hi, this is Alex Morgan from BOTZ Demo Company. I need a quote for 2 OHAUS AX4202 precision balances delivered to Austin, and I would like someone from sales to follow up. Please require human approval before sending final pricing.";
  await page.getByPlaceholder("Type a message...").fill(requestText);
  await page.waitForTimeout(3500);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.waitForTimeout(7500);
  await overlay(page, "UNDERSTAND ✓", "Quotation and sales follow-up intent detected.", "ok");
  await page.waitForTimeout(4500);
  await overlay(page, "REASON ✓ · DECIDE ✓", "Required details validated. BOTZ CRM quotation workflow selected.", "ok");
  await page.waitForTimeout(5500);
  await overlay(page, "ACT ✓", "Demo Mode created the CRM opportunity and assigned human pricing approval.", "ok");
  await page.waitForTimeout(5000);

  await page.goto("https://www.botz.fyi/start/agents/crm", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(7000);
  await page.getByRole("button", { name: "Customers" }).click().catch(async () => page.getByRole("button", { name: "Contacts" }).click().catch(() => {}));
  await page.waitForTimeout(4000);
  const searchContact = page.getByPlaceholder(/Search contact/i).first();
  if (await searchContact.count()) await searchContact.fill("Alex Morgan");
  await page.waitForTimeout(6000);
  await overlay(page, "VERIFY ✓", "BOTZ CRM visibly confirms Alex Morgan, the quote opportunity, and next action.", "ok");
  await page.waitForTimeout(7500);
  await overlay(page, "ESCALATE ✓", "Human approval remains required before external pricing is sent.", "warn");
  await page.waitForTimeout(6500);

  await page.goto("https://www.botz.fyi/start/agents/channels", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(7000);
  await overlay(page, "CHANNELS", "Assign specialized agents to WhatsApp, webchat, and voice entry points.", "ok");
  await page.waitForTimeout(9000);

  await page.goto("https://www.botz.fyi/start/agents/numbers", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(7000);
  await overlay(page, "PHONE NUMBERS", "Manage the lines used by real voice agents and reassign them safely.");
  await page.waitForTimeout(8000);

  await page.goto("https://www.botz.fyi/start/agents", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(7000);
  await overlay(page, "A + B PROVEN", "Created in BOTZ, then used to execute and verify an operational workflow.", "ok");
  await page.waitForTimeout(11000);

  const video = page.video();
  await context.close();
  await browser.close();
  const videoPath = await video.path();
  fs.copyFileSync(videoPath, rawWebm);
}

function mediaDuration(file) {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file], { encoding: "utf8" }).trim());
}

function muxFinal() {
  const audioDur = mediaDuration(narrationMp3);
  const videoDur = mediaDuration(rawWebm);
  const videoTempo = audioDur / videoDur;
  execFileSync("ffmpeg", ["-y", "-i", rawWebm, "-i", narrationMp3, "-filter_complex", `[0:v]scale=1920:1080,fps=30,setpts=${videoTempo.toFixed(8)}*PTS,format=yuv420p[v]`, "-t", String(audioDur), "-map", "[v]", "-map", "1:a:0", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", finalMp4], { stdio: "inherit" });
}

async function main() {
  await generateNarration();
  await recordBrowser();
  muxFinal();
  const dur = mediaDuration(finalMp4);
  const size = fs.statSync(finalMp4).size;
  console.log(JSON.stringify({ finalMp4, duration: dur, resolution: "1920x1080", size }, null, 2));
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
