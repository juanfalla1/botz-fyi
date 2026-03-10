import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeE164(phoneRaw: string) {
  const v = String(phoneRaw || "").replace(/\s+/g, "").trim();
  if (!v) return "";
  const cleaned = v.replace(/[^+\d]/g, "");
  if (!/^\+\d{8,15}$/.test(cleaned)) return "";
  return cleaned;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const nombre = String(body?.nombre || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const telefono = normalizeE164(String(body?.telefono || ""));

    if (!nombre || !email || !telefono) {
      return NextResponse.json({ ok: false, error: "Datos incompletos o telefono invalido." }, { status: 400 });
    }

    const payload = {
      nombre,
      email,
      telefono,
      empresa: String(body?.empresa || "Lead web call Botz"),
      interes: String(body?.interes || "Llamada en vivo de agente"),
      source: "botz_web_live_call",
      trigger_now: true,
      requested_at: new Date().toISOString(),
    };

    const webhook = String(
      process.env.LIVE_CALL_WEBHOOK_URL ||
      process.env.NEXT_PUBLIC_LIVE_CALL_WEBHOOK_URL ||
      ""
    )
      .replace(/^POST\s+/i, "")
      .replace(/\s+/g, "")
      .trim();
    if (webhook) {
      if (!/^https?:\/\//i.test(webhook)) {
        return NextResponse.json({ ok: false, error: "LIVE_CALL_WEBHOOK_URL inválida (debe iniciar por http/https)." }, { status: 500 });
      }

      try {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const raw = await res.text().catch(() => "");
        const data = (() => {
          try {
            return raw ? JSON.parse(raw) : {};
          } catch {
            return { raw };
          }
        })();
        if (!res.ok || data?.ok === false || data?.success === false) {
          return NextResponse.json(
            {
              ok: false,
              error: String(data?.error || data?.message || `Webhook de llamada rechazó la solicitud (${res.status}).`),
              details: {
                status: res.status,
                webhook,
                response: data,
              },
            },
            { status: 502 }
          );
        }
        return NextResponse.json({ ok: true, mode: "webhook", data });
      } catch (webhookErr: any) {
        return NextResponse.json(
          {
            ok: false,
            error: `No se pudo conectar con LIVE_CALL_WEBHOOK_URL: ${String(webhookErr?.message || "error de red")}`,
            details: { webhook },
          },
          { status: 502 }
        );
      }
    }

    // Fallback: registrar lead si aun no hay integración de llamada en vivo.
    const origin = new URL(req.url).origin;
    const leadRes = await fetch(`${origin}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const leadData = await leadRes.json().catch(() => ({}));

    if (!leadRes.ok || leadData?.ok === false || leadData?.success === false) {
      return NextResponse.json({ ok: false, error: String(leadData?.error || leadData?.message || "No se pudo registrar la solicitud") }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      mode: "lead_fallback",
      warning: "LIVE_CALL_WEBHOOK_URL no configurada; solo se registro el lead.",
      data: leadData,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || "Error interno") }, { status: 500 });
  }
}
