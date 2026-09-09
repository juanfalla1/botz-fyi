import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { chromium } from "playwright";

const root = process.cwd();
const baseUrl = process.env.DEMO_BASE_URL || "https://www.botz.fyi";
const outDir = path.join(root, "artifacts", "botz-real-estate-demo");
const videoDir = path.join(outDir, "playwright-video");
const rawVideo = path.join(outDir, "browser-recording.webm");
const narrationText = path.join(outDir, "narration.txt");
const narrationAudio = path.join(outDir, "narration.mp3");
const finalVideo = path.join(root, "public", "botz-real-estate-operations-demo.mp4");

fs.mkdirSync(videoDir, { recursive: true });

const now = new Date();
const iso = now.toISOString();
const tenantId = "11111111-1111-4111-8111-111111111111";
const leadId = "22222222-2222-4222-8222-222222222222";
const advisorId = "33333333-3333-4333-8333-333333333333";

const leads = [
  {
    id: leadId,
    tenant_id: tenantId,
    user_id: "demo-user",
    name: "Elena Vargas",
    email: "elena.vargas@example.com",
    phone: "+34 612 840 319",
    source: "WhatsApp",
    origen: "WhatsApp",
    status: "CONTACTADO",
    next_action: "Enviar WhatsApp",
    calificacion: "Caliente",
    asesor_id: advisorId,
    assigned_to: advisorId,
    asesor_nombre: "Laura Martín",
    created_at: iso,
    updated_at: iso,
    resumen_chat: "Elena busca vivienda habitual en Madrid por 280.000 €. Aporta 70.000 €, declara ingresos netos de 4.800 € y solicita 210.000 € a 25 años. BOTZ detecta intención alta, documentación inicial disponible y recomienda avanzar a estudio hipotecario.",
    ultimo_mensaje_bot: "Tu perfil preliminar es viable. Prepararé el estudio y la lista de documentos para Laura.",
    ingresos_netos: 4800,
    precio_real: 280000,
    aportacion_real: 70000,
    cantidad_a_financiar: 210000,
    otras_cuotas: 180,
    deudas_existentes: 180,
    edad: 36,
    tipo_operacion: "habitual",
    modalidad_compra: "solo",
    vivienda_tipo: "Vivienda habitual",
    situacion_laboral: "Indefinido",
    tasa_interes: 3.2,
    plazo_anos: 25,
    cuota_estimada: 1018,
    dti: 25,
    ltv: 75,
    score: 88,
    aprobado: true,
    estado_operacion: "VIABLE",
    bank: "BBVA",
    commission: 8400,
  },
  ...[
    ["Marta Ruiz", "NUEVO", "Meta Ads", 195000, 72],
    ["Diego Santos", "DOCUMENTACIÓN", "Google", 325000, 81],
    ["Clara Moreno", "PRE-APROBADO", "Referido", 410000, 91],
    ["Javier Gil", "FIRMADO", "WhatsApp", 240000, 94],
    ["Lucía Torres", "CONTACTADO", "Web", 360000, 77],
  ].map(([name, status, source, price, score], index) => ({
    id: `44444444-4444-4444-8444-44444444444${index}`,
    tenant_id: tenantId,
    user_id: "demo-user",
    name,
    email: `${String(name).toLowerCase().replace(" ", ".")}@example.com`,
    phone: `+34 611 220 10${index}`,
    source,
    origen: source,
    status,
    next_action: status === "FIRMADO" ? "Finalizado" : "Llamar hoy",
    calificacion: Number(score) > 85 ? "Caliente" : "Tibio",
    asesor_id: advisorId,
    assigned_to: advisorId,
    asesor_nombre: "Laura Martín",
    created_at: new Date(now.getTime() - (index + 1) * 86400000).toISOString(),
    precio_real: Number(price),
    ingresos_netos: 3900 + index * 350,
    dti: 29 + index,
    score: Number(score),
    aprobado: String(status) === "PRE-APROBADO" || String(status) === "FIRMADO",
    commission: String(status) === "FIRMADO" ? 7200 : 0,
    bank: String(status) === "FIRMADO" ? "Santander" : null,
  })),
];

const leadLogs = [
  { id: "log-1", lead_id: leadId, type: "system", text: "BOTZ calificó el perfil: score 88/100, DTI 25% y LTV 75%.", user_name: "BOTZ IA", created_at: iso },
  { id: "log-2", lead_id: leadId, type: "note", text: "Cliente envió nóminas y confirma visita el jueves.", user_name: "Laura Martín", created_at: new Date(now.getTime() - 3600000).toISOString() },
];

const narration = `Una consulta inmobiliaria puede comenzar en WhatsApp y terminar dispersa entre mensajes, hojas de cálculo y tareas manuales. BOTZ convierte ese recorrido en una operación visible de principio a fin.

En el CRM en vivo aparece Elena Vargas, un caso sintético captado por WhatsApp. El equipo ve en una sola fila su estado, próxima acción, prioridad y asesora responsable.

Al abrir el análisis BOTZ, la plataforma reúne la información comercial y financiera. Elena busca vivienda habitual por doscientos ochenta mil euros, aporta setenta mil y solicita doscientos diez mil. La inteligencia artificial resume la conversación, detecta intención alta y recomienda avanzar al estudio hipotecario.

La bitácora conserva cada decisión. Así, el asesor recibe contexto completo sin releer conversaciones ni reconstruir el caso.

En Kanban, la misma oportunidad avanza de Contactado a Documentación. El cambio queda sincronizado y mantiene un pipeline común para ventas, operaciones y dirección.

En Canales vemos el origen de la oportunidad. WhatsApp recoge los datos iniciales, BOTZ confirma el perfil y entrega el caso a Laura con una siguiente acción clara. La automatización acelera la respuesta, pero el equipo mantiene el control.

El Centro de Control permite configurar el CRM, los canales y la operación desde un mismo entorno. Alertas SLA prioriza los casos que requieren atención antes de perder una oportunidad.

El Dashboard Ejecutivo transforma la actividad en indicadores: volumen de leads, conversión, valor de pipeline, rendimiento por canal y salud hipotecaria.

Finalmente, el Cálculo Hipotecario recupera automáticamente el mismo lead. Con ingresos de cuatro mil ochocientos euros, una aportación del veinticinco por ciento y una financiación de doscientos diez mil, BOTZ muestra una cuota estimada, DTI, LTV y score global. El resultado preliminar es viable y queda listo para revisión humana.

Operación en Vivo completa el circuito mostrando cómo la automatización conecta conversación, CRM, análisis, seguimiento y financiación. BOTZ no sustituye al equipo: le entrega contexto, prioridad y próximos pasos para cerrar mejor y más rápido.`;

function fakeJwt() {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: "demo-user", email: "demo@example.com", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 86400 })).toString("base64url");
  return `${header}.${payload}.demo`;
}

const fakeUser = {
  id: "demo-user",
  aud: "authenticated",
  role: "authenticated",
  email: "demo@example.com",
  user_metadata: {
    full_name: "BOTZ Inmobiliaria Demo",
    tenant_id: tenantId,
    is_trial: true,
    trial_start: iso,
    trial_end: new Date(now.getTime() + 7 * 86400000).toISOString(),
  },
  app_metadata: { tenant_id: tenantId },
};

function json(route, body, headers = {}) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*", ...headers },
    body: JSON.stringify(body),
  });
}

async function routeSandbox(page) {
  await page.route("**/auth/v1/user", (route) => json(route, { ...fakeUser }));
  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split("/rest/v1/")[1]?.split("?")[0] || "";
    const method = request.method();
    const accept = request.headers().accept || "";
    const isSingle = accept.includes("application/vnd.pgrst.object");

    if (method === "OPTIONS") return route.fulfill({ status: 204, body: "" });
    if (table === "leads") {
      if (method === "PATCH") {
        const patch = JSON.parse(request.postData() || "{}");
        const idFilter = url.searchParams.get("id") || "";
        const id = idFilter.replace(/^eq\./, "");
        const lead = leads.find((item) => item.id === id) || leads[0];
        Object.assign(lead, patch);
        return json(route, accept.includes("return=representation") ? [lead] : []);
      }
      if (method === "DELETE") return json(route, []);
      const idFilter = (url.searchParams.get("id") || "").replace(/^eq\./, "");
      const rows = idFilter ? leads.filter((lead) => lead.id === idFilter) : leads;
      const headers = { "content-range": `0-${Math.max(0, rows.length - 1)}/${rows.length}` };
      if (method === "HEAD") return route.fulfill({ status: 200, headers, body: "" });
      return json(route, isSingle ? (rows[0] || null) : rows, headers);
    }
    if (table === "team_members") {
      const members = [{ id: advisorId, tenant_id: tenantId, nombre: "Laura Martín", name: "Laura Martín", email: "laura.martin@example.com", rol: "admin", activo: true }];
      if (method === "HEAD") return route.fulfill({ status: 200, headers: { "content-range": "0-0/1" }, body: "" });
      return json(route, isSingle ? members[0] : members);
    }
    if (table === "lead_logs") {
      if (method === "POST") return json(route, []);
      return json(route, leadLogs);
    }
    if (table === "integrations") {
      const integrations = [{ id: "wa-demo", user_id: "demo-user", tenant_id: tenantId, channel_type: "whatsapp", provider: "evolution", status: "connected", instance_name: "BOTZ Inmobiliaria", created_at: iso }];
      return json(route, isSingle ? integrations[0] : integrations);
    }
    if (table === "channel_activities") {
      return json(route, [{ id: "evt-1", integration_id: "wa-demo", type: "lead", content: "Elena Vargas calificada por BOTZ", metadata: { detail: "Score 88 · Estudio hipotecario listo" }, created_at: iso, integrations: { channel_type: "whatsapp", provider: "evolution" } }]);
    }
    if (table === "subscriptions") return json(route, isSingle ? { tenant_id: tenantId, plan: "Básico", status: "trialing" } : [{ tenant_id: tenantId, plan: "Básico", status: "trialing" }]);
    if (table === "user_configs" || table === "email_messages") return json(route, isSingle ? null : []);
    if (method === "HEAD") return route.fulfill({ status: 200, headers: { "content-range": "*/0" }, body: "" });
    return json(route, isSingle ? null : []);
  });

  await page.route("**/api/whatsapp/**", (route) => json(route, { connected: true, status: "connected", instance: "BOTZ Inmobiliaria" }));
  await page.route("**/api/integrations/**", (route) => json(route, { ok: true, data: [] }));
  await page.route("**/api/lead-scoring", (route) => json(route, { ok: true, lead_id: leadId }));
  await page.route("**/api/n8n", (route) => json(route, { ok: true, demo: true }));
  await page.route("**/api/upload-leads", (route) => json(route, { ok: true, demo: true }));
  await page.route("https://n8nio-n8n-latest.onrender.com/**", (route) => json(route, { ok: true, demo: true }));
}

async function overlay(page, title, body, tone = "blue") {
  await page.evaluate(({ title, body, tone }) => {
    let el = document.getElementById("botz-real-estate-overlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "botz-real-estate-overlay";
      document.body.appendChild(el);
    }
    const accent = tone === "green" ? "#34d399" : tone === "amber" ? "#fbbf24" : "#60a5fa";
    el.innerHTML = `<small style="display:block;color:${accent};font-weight:900;letter-spacing:.15em;margin-bottom:7px">BOTZ · CASO ELENA VARGAS</small><strong style="display:block;color:#fff;font-size:24px">${title}</strong><span style="display:block;color:#cbd5e1;font-size:15px;line-height:1.45;margin-top:7px">${body}</span>`;
    Object.assign(el.style, {
      position: "fixed", right: "30px", bottom: "28px", zIndex: "999999", width: "430px",
      padding: "18px 20px", border: `1px solid ${accent}`, borderRadius: "18px",
      background: "linear-gradient(180deg,rgba(5,10,21,.96),rgba(12,20,36,.94))",
      boxShadow: `0 0 32px ${accent}30,0 24px 80px rgba(0,0,0,.5)`, fontFamily: "Inter,Segoe UI,sans-serif",
    });
  }, { title, body, tone });
}

async function whatsappCase(page) {
  await page.evaluate(() => {
    document.getElementById("botz-real-estate-overlay")?.remove();
    const el = document.createElement("div");
    el.id = "botz-whatsapp-case";
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ffffff16;padding-bottom:13px"><div><b style="font-size:19px">Elena Vargas</b><small style="display:block;color:#86efac;margin-top:3px">WhatsApp · BOTZ activo</small></div><span style="color:#34d399;font-weight:800">Score 88</span></div><div style="display:grid;gap:10px;margin-top:14px"><p style="justify-self:start">Busco vivienda habitual en Madrid. Presupuesto 280.000 € y aporto 70.000 €.</p><p style="justify-self:end;background:#14532d">Perfecto, Elena. ¿Cuáles son tus ingresos netos y deudas mensuales?</p><p style="justify-self:start">4.800 € netos y una cuota de 180 €. Tengo nóminas listas.</p><p style="justify-self:end;background:#14532d">Perfil preliminar viable. Te asigno con Laura y preparo el estudio hipotecario.</p></div>`;
    Object.assign(el.style, { position: "fixed", left: "50%", top: "51%", transform: "translate(-50%,-50%)", zIndex: "999999", width: "620px", padding: "22px", borderRadius: "22px", border: "1px solid #34d39988", color: "white", background: "linear-gradient(180deg,#101a2b,#07111f)", boxShadow: "0 30px 100px #000b", fontFamily: "Inter,Segoe UI,sans-serif" });
    el.querySelectorAll("p").forEach((p) => Object.assign(p.style, { margin: "0", maxWidth: "78%", padding: "11px 13px", borderRadius: "12px", background: p.style.background || "#1e293b", color: "#e5e7eb", fontSize: "14px", lineHeight: "1.4" }));
    document.body.appendChild(el);
  });
}

async function openTab(page, label) {
  await page.mouse.move(35, 320);
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForTimeout(3500);
}

async function record() {
  const browser = await chromium.launch({ headless: true, args: ["--window-size=1920,1080"] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } } });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem("botz-language", "es");
    localStorage.setItem("botz-theme", "dark");
    localStorage.setItem("botz-start-mode", "true");
    localStorage.removeItem("botz_kanban_custom_columns_v1");
    localStorage.setItem("sb-botz-hipoteca-auth", JSON.stringify({ access_token: token, token_type: "bearer", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: "demo-refresh", user }));
  }, { token: fakeJwt(), user: fakeUser });
  const page = await context.newPage();
  await routeSandbox(page);
  page.on("pageerror", (error) => console.error("PAGE ERROR:", error.message));
  page.on("requestfailed", (request) => console.error("REQUEST FAILED:", request.url(), request.failure()?.errorText));
  page.on("response", (response) => {
    if (response.status() >= 400) console.error("HTTP ERROR:", response.status(), response.url());
  });
  page.on("console", (message) => {
    if (message.type() === "error") console.error("BROWSER ERROR:", message.text());
  });
  page.on("dialog", (dialog) => dialog.dismiss().catch(() => {}));
  await page.goto(`${baseUrl}/start?tab=crm`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(8000);

  if (process.argv.includes("--debug")) {
    console.log((await page.locator("body").innerText()).slice(0, 8000));
    await page.screenshot({ path: path.join(outDir, "debug-crm.png"), fullPage: true });
    await context.close();
    await browser.close();
    return;
  }

  await overlay(page, "CRM EN VIVO", "Una sola ficha conecta origen, estado, prioridad, asesora y próxima acción.", "green");
  await page.waitForTimeout(6000);
  const search = page.getByPlaceholder(/Buscar cliente o asesor/i).first();
  if (await search.count()) await search.fill("Elena Vargas");
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: /Ver Análisis Botz/i }).first().click();
  await page.waitForTimeout(3500);
  await overlay(page, "ANÁLISIS BOTZ", "280.000 € de vivienda · 70.000 € de aportación · perfil preliminar viable.", "green");
  await page.waitForTimeout(6000);
  await page.getByRole("button", { name: /IA Bot/i }).click();
  await overlay(page, "CONTEXTO RECUPERADO", "BOTZ resume intención, capacidad y documentos sin obligar al asesor a reconstruir la conversación.");
  await page.waitForTimeout(6500);
  await page.locator("button:has(svg.lucide-x)").last().click();
  await page.waitForTimeout(1500);

  await openTab(page, "Kanban");
  await overlay(page, "PIPELINE SINCRONIZADO", "El mismo caso avanza de Contactado a Documentación y deja trazabilidad.", "green");
  const card = page.getByText("Elena Vargas", { exact: true }).first();
  const target = page.getByText(/Documentación/, { exact: false }).first();
  if (await card.count() && await target.count()) await card.dragTo(target).catch(() => {});
  await page.waitForTimeout(6500);

  await openTab(page, "Canales");
  await whatsappCase(page);
  await page.waitForTimeout(9000);
  await page.evaluate(() => document.getElementById("botz-whatsapp-case")?.remove());

  await openTab(page, "Centro de Control");
  await overlay(page, "CENTRO DE CONTROL", "CRM, canales y reglas operativas administrados desde un mismo entorno.");
  await page.waitForTimeout(5500);
  const controlClose = page.locator("button:has(svg.lucide-x)").last();
  if (await controlClose.count()) await controlClose.click();

  await openTab(page, "Alertas SLA");
  await overlay(page, "ALERTAS SLA", "El equipo prioriza seguimientos y evita que una oportunidad se enfríe.", "amber");
  await page.waitForTimeout(5500);

  await openTab(page, "Dashboard Ejecutivo");
  await overlay(page, "VISIÓN EJECUTIVA", "Conversión, pipeline, canales y salud hipotecaria se calculan sobre la misma operación.", "green");
  await page.waitForTimeout(7500);

  await openTab(page, "Cálculo Hipotecario");
  await page.getByRole("button", { name: "Lead (Auto)", exact: true }).click();
  await page.waitForTimeout(2500);
  const select = page.locator("select:visible").first();
  await select.selectOption(leadId);
  if ((await select.inputValue()) !== leadId) throw new Error("No se pudo seleccionar el lead hipotecario de Elena Vargas");
  await page.waitForTimeout(5500);
  await overlay(page, "ESTUDIO HIPOTECARIO", "Score 88/100 · DTI 25% · LTV 75% · caso viable para revisión humana.", "green");
  await page.waitForTimeout(8500);

  await openTab(page, "Operación en Vivo");
  await overlay(page, "UNA OPERACIÓN, UN SOLO CONTEXTO", "WhatsApp, CRM, IA, Kanban y financiación conectados para que el equipo cierre mejor.", "green");
  await page.waitForTimeout(8500);

  const video = page.video();
  await context.close();
  await browser.close();
  fs.copyFileSync(await video.path(), rawVideo);
}

function duration(file) {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file], { encoding: "utf8" }).trim());
}

function generateNarration() {
  fs.writeFileSync(narrationText, narration, "utf8");
  execFileSync("python", ["-m", "edge_tts", "--voice", "en-US-AndrewMultilingualNeural", "--rate=-2%", "--pitch=-2Hz", "--file", narrationText, "--write-media", narrationAudio], { stdio: "inherit" });
}

function mux() {
  const audioDuration = duration(narrationAudio);
  const videoDuration = duration(rawVideo);
  const tempo = audioDuration / videoDuration;
  execFileSync("ffmpeg", ["-y", "-i", rawVideo, "-i", narrationAudio, "-filter_complex", `[0:v]scale=1920:1080,fps=30,setpts=${tempo.toFixed(8)}*PTS,format=yuv420p[v]`, "-t", String(audioDuration), "-map", "[v]", "-map", "1:a:0", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", finalVideo], { stdio: "inherit" });
}

async function validateIndustryPage() {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${baseUrl}/industrias/inmobiliaria-construccion`, { waitUntil: "networkidle", timeout: 60000 });
    const section = page.locator("#real-estate-operations-demo");
    await section.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(outDir, `industry-${viewport.name}.png`) });
    const result = {
      viewport: viewport.name,
      section: await section.count(),
      videoSrc: await section.locator("video").getAttribute("src"),
      scrollWidth: await page.locator("body").evaluate((element) => element.scrollWidth),
      clientWidth: await page.locator("body").evaluate((element) => element.clientWidth),
    };
    if (result.section !== 1 || result.videoSrc !== "/botz-real-estate-operations-demo.mp4" || result.scrollWidth > result.clientWidth) {
      throw new Error(`Validación visual fallida: ${JSON.stringify(result)}`);
    }
    results.push(result);
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}

async function main() {
  if (process.argv.includes("--validate-page")) {
    await validateIndustryPage();
    return;
  }
  generateNarration();
  await record();
  if (process.argv.includes("--debug")) return;
  mux();
  console.log(JSON.stringify({ finalVideo, duration: duration(finalVideo), resolution: "1920x1080", size: fs.statSync(finalVideo).size }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
