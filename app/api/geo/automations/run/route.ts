import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { createAuditManual } from "@/lib/geo/repositories/audits.repo"
import { processAuditQueueForUser } from "@/lib/geo/services/audit-jobs.service"

function computeNextRun(frequency: "daily" | "weekly" | "monthly") {
  const date = new Date()
  if (frequency === "daily") date.setDate(date.getDate() + 1)
  if (frequency === "weekly") date.setDate(date.getDate() + 7)
  if (frequency === "monthly") date.setMonth(date.getMonth() + 1)
  return date.toISOString()
}

function normalizeEngine(engine: string) {
  const value = engine.toLowerCase().trim()
  if (value === "chatgpt") return "openai"
  if (value === "ai overviews" || value === "ai-overviews") return "ai_overviews"
  return value
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object") {
    const value = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    return [value.message, value.details, value.hint, value.code].filter(Boolean).map(String).join(" | ") || "Unknown error"
  }
  return String(error || "Unknown error")
}

function parseSummary(summary: unknown): Record<string, unknown> {
  if (!summary || typeof summary !== "string") return {}
  try {
    const parsed = JSON.parse(summary)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function numberFrom(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.isFinite(Number(value)) ? Number(value) : 0
}

function textFrom(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback
}

function scoreLabel(score: number | null) {
  if (score === null) return "Sin datos suficientes"
  if (score >= 75) return "Fuerte visibilidad IA"
  if (score >= 45) return "Visibilidad media"
  return "Visibilidad baja"
}

function scoreColor(score: number | null) {
  if (score === null) return "#64748b"
  if (score >= 75) return "#10b981"
  if (score >= 45) return "#f59e0b"
  return "#ef4444"
}

async function sendAutomationEmail(input: { to: string; automationName: string; projectName: string; score: number | null; auditId: string; baseUrl: string; summary: string | null; engines: string[]; nextRun: string }) {
  const mailUser = process.env.MAIL_USER || process.env.ZOHO_USER
  const zohoHost = process.env.ZOHO_HOST
  const zohoPort = Number(process.env.ZOHO_PORT || 465)
  const zohoUser = process.env.ZOHO_USER || mailUser
  const zohoPassword = process.env.ZOHO_APP_PASSWORD
  if (!zohoHost || !zohoUser || !zohoPassword || !mailUser) return { sent: false, reason: "EMAIL_NOT_CONFIGURED" }

  const transporter = nodemailer.createTransport({
    host: zohoHost,
    port: zohoPort,
    secure: zohoPort === 465,
    auth: { user: zohoUser, pass: zohoPassword },
  })

  const summary = parseSummary(input.summary)
  const semantic = summary.semantic_analysis && typeof summary.semantic_analysis === "object" ? summary.semantic_analysis as Record<string, unknown> : null
  const recommendations = Array.isArray(summary.recommendations) ? summary.recommendations as Array<Record<string, unknown>> : []
  const engineBreakdown = Array.isArray(summary.engine_breakdown) ? summary.engine_breakdown as Array<Record<string, unknown>> : []
  const promptsWon = numberFrom(summary.prompts_won)
  const promptsLost = numberFrom(summary.prompts_lost)
  const promptsTotal = promptsWon + promptsLost || engineBreakdown.reduce((sum, item) => sum + numberFrom(item.prompts_total), 0)
  const citations = numberFrom(summary.citations_count)
  const visibility = numberFrom(summary.ai_visibility)
  const executiveSummary = textFrom(semantic?.executive_summary, textFrom(summary.summary, "La automatización completó una nueva auditoría GEO. Revisa el detalle para ver prompts, motores, menciones y recomendaciones."))
  await transporter.sendMail({
    from: `"Botz GEO" <${mailUser}>`,
    to: input.to,
    subject: `Reporte Botz GEO: ${input.projectName} - Score ${input.score ?? "--"}`,
    html: `
      <div style="margin:0;padding:0;background:#06070b;color:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:720px;margin:0 auto;padding:28px;">
          <div style="border:1px solid #1f2937;background:#0b0d14;border-radius:20px;padding:28px;">
            <p style="margin:0 0 8px;color:#818cf8;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Botz GEO Automation Report</p>
            <h1 style="margin:0 0 8px;font-size:30px;line-height:1.2;color:#fff;">${input.projectName}</h1>
            <p style="margin:0;color:#94a3b8;">${input.baseUrl}</p>

            <div style="margin-top:24px;display:block;border-radius:18px;background:#111827;padding:22px;border:1px solid #263244;">
              <div style="display:inline-block;vertical-align:top;margin-right:28px;">
                <div style="width:116px;height:116px;border-radius:999px;border:10px solid ${scoreColor(input.score)};display:flex;align-items:center;justify-content:center;text-align:center;">
                  <div style="width:100%;padding-top:24px;">
                    <div style="font-size:34px;font-weight:800;color:${scoreColor(input.score)};">${input.score ?? "--"}</div>
                    <div style="font-size:12px;color:#94a3b8;">de 100</div>
                  </div>
                </div>
              </div>
              <div style="display:inline-block;vertical-align:top;max-width:470px;">
                <h2 style="margin:0 0 6px;font-size:20px;color:#fff;">${scoreLabel(input.score)}</h2>
                <p style="margin:0;color:#cbd5e1;line-height:1.55;">${executiveSummary}</p>
              </div>
            </div>

            <div style="margin-top:18px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
              <div style="background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:14px;"><div style="font-size:12px;color:#94a3b8;">Visibilidad IA</div><div style="font-size:24px;font-weight:800;color:#fff;">${visibility || "--"}%</div></div>
              <div style="background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:14px;"><div style="font-size:12px;color:#94a3b8;">Prompts ganados</div><div style="font-size:24px;font-weight:800;color:#fff;">${promptsTotal ? `${promptsWon}/${promptsTotal}` : "--"}</div></div>
              <div style="background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:14px;"><div style="font-size:12px;color:#94a3b8;">Citaciones</div><div style="font-size:24px;font-weight:800;color:#fff;">${citations || "--"}</div></div>
              <div style="background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:14px;"><div style="font-size:12px;color:#94a3b8;">Motores</div><div style="font-size:15px;font-weight:700;color:#fff;">${input.engines.join(", ") || "--"}</div></div>
            </div>

            ${recommendations.length > 0 ? `
              <div style="margin-top:24px;">
                <h3 style="margin:0 0 12px;font-size:18px;color:#fff;">Recomendaciones principales</h3>
                ${recommendations.slice(0, 3).map((rec) => `
                  <div style="margin-bottom:10px;background:#111827;border:1px solid #263244;border-radius:14px;padding:14px;">
                    <div style="font-weight:800;color:#fff;">${textFrom(rec.title ?? rec.action_item, "Recomendación")}</div>
                    <div style="margin-top:5px;color:#cbd5e1;line-height:1.45;">${textFrom(rec.description ?? rec.details, "")}</div>
                  </div>
                `).join("")}
              </div>
            ` : ""}

            <div style="margin-top:24px;border-top:1px solid #1f2937;padding-top:16px;color:#94a3b8;font-size:12px;line-height:1.5;">
              <div><strong style="color:#cbd5e1;">Automatización:</strong> ${input.automationName}</div>
              <div><strong style="color:#cbd5e1;">Audit ID:</strong> ${input.auditId}</div>
              <div><strong style="color:#cbd5e1;">Próxima ejecución:</strong> ${new Date(input.nextRun).toLocaleString("es-ES")}</div>
              <div style="margin-top:8px;">Este reporte se envía automáticamente desde Botz GEO. Para revisar el detalle completo, abre la app y entra a GEO Audits.</div>
            </div>
          </div>
        </div>
      </div>
    `,
  })
  return { sent: true }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const automationId = typeof body.id === "string" ? body.id : ""
  if (!automationId) return NextResponse.json({ error: "Automation id is required" }, { status: 400 })

  try {
    const { supabase, user } = await getGeoApiClient(req)
    const { data: automation, error: automationError } = await supabase
      .from("automations")
      .select("*")
      .eq("id", automationId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (automationError) throw automationError
    if (!automation) return NextResponse.json({ error: "Automation not found" }, { status: 404 })
    if (!automation.enabled) return NextResponse.json({ error: "Automation is paused" }, { status: 400 })
    if (!automation.project_id) return NextResponse.json({ error: "Automation has no project" }, { status: 400 })

    const config = (automation.config && typeof automation.config === "object" ? automation.config : {}) as Record<string, unknown>
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, company_name, website_url")
      .eq("id", automation.project_id)
      .eq("user_id", user.id)
      .maybeSingle()
    if (projectError) throw projectError
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const engines = Array.isArray(config.engines) && config.engines.length > 0 ? config.engines.map((item) => normalizeEngine(String(item))) : ["openai"]
    const created = await createAuditManual(supabase, user.id, project.id, project.website_url, 1, engines)
    const processed = await processAuditQueueForUser(supabase, user.id, 1)

    const { data: audit } = await supabase
      .from("geo_audits")
      .select("id, final_score, status, summary, completed_at")
      .eq("id", created.audit.id)
      .maybeSingle()
    const completed = processed.some((job) => job.job_id === created.job.id && job.status === "completed") || audit?.status === "completed"
    const failedJob = processed.find((job) => job.job_id === created.job.id && job.status === "failed")
    const finalScore = audit?.final_score === null || audit?.final_score === undefined ? null : numberFrom(audit.final_score)

    let emailStatus: Record<string, unknown> = { sent: false, reason: "NO_EMAIL" }
    const email = typeof config.email === "string" ? config.email : ""
    const nextRun = computeNextRun(automation.frequency as "daily" | "weekly" | "monthly")
    if (completed && email) {
      emailStatus = await sendAutomationEmail({
        to: email,
        automationName: automation.name,
        projectName: project.company_name,
        baseUrl: project.website_url,
        score: finalScore,
        auditId: created.audit.id,
        summary: typeof audit?.summary === "string" ? audit.summary : null,
        engines,
        nextRun,
      })
    }

    const nextConfig = {
      ...config,
      last_run: new Date().toISOString(),
      last_status: completed ? "completed" : failedJob ? "failed" : "queued",
      last_audit_id: created.audit.id,
      last_job_id: created.job.id,
      last_score: finalScore,
      last_error: failedJob?.error ?? null,
      last_email: emailStatus,
      next_run: nextRun,
      history: [
        { at: new Date().toISOString(), status: completed ? "completed" : failedJob ? "failed" : "queued", audit_id: created.audit.id, score: finalScore, email: emailStatus },
        ...(Array.isArray(config.history) ? config.history : []),
      ].slice(0, 20),
    }

    const { data: updated, error: updateError } = await supabase
      .from("automations")
      .update({ config: nextConfig })
      .eq("id", automation.id)
      .eq("user_id", user.id)
      .select("*")
      .single()
    if (updateError) throw updateError

    return NextResponse.json({ data: { automation: updated, audit, processed, email: emailStatus }, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 })
  }
}
