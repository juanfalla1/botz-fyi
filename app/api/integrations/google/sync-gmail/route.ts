import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertTenantAccess, getRequestUser } from "../../../_utils/guards";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // ✅ CAMBIO: Permitir tenant_id null
    const tenant_id = body?.tenant_id && String(body.tenant_id).trim() !== "" 
      ? String(body.tenant_id).trim() 
      : null;
    const user_id = String(body?.user_id || "").trim();
    const integration_id = String(body?.integration_id || "").trim();

    const { user, error: userErr } = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: userErr || "Unauthorized" }, { status: 401 });
    }

    // ✅ CAMBIO: Solo validar user_id e integration_id como obligatorios
    if (!isUuid(user_id) || !isUuid(integration_id)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_INPUT", details: "user_id o integration_id inválidos" },
        { status: 400 }
      );
    }

    // ✅ CAMBIO: Si tenant_id existe, validar que sea UUID válido
    if (tenant_id !== null && !isUuid(tenant_id)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_INPUT", details: "tenant_id debe ser UUID válido o null" },
        { status: 400 }
      );
    }

    const guard = await assertTenantAccess({ req, requestedTenantId: tenant_id });
    if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });

    if (user_id !== user.id && !guard.isPlatformAdmin) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json(
        { ok: false, error: "MISSING_SUPABASE_ENV" },
        { status: 500 }
      );
    }
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { ok: false, error: "MISSING_GOOGLE_ENV" },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // 1) Obtener la integración (sin filtrar por tenant_id del request)
    const { data: integ, error: integErr } = await supabase
      .from("integrations")
      .select("id, tenant_id, user_id, provider, channel_type, status, credentials")
      .eq("id", integration_id)
      .eq("user_id", user_id)
      .eq("provider", "google")
      .eq("channel_type", "gmail")
      .maybeSingle();

    if (integErr) {
      return NextResponse.json(
        { ok: false, error: "DB_READ_FAILED", details: integErr.message },
        { status: 500 }
      );
    }

    if (!integ) {
      return NextResponse.json(
        { ok: false, error: "NO_INTEGRATION_FOUND" },
        { status: 404 }
      );
    }

    if (!guard.isPlatformAdmin && String(integ.tenant_id || "") !== String(guard.tenantId || "")) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (integ.status !== "connected") {
      return NextResponse.json(
        { ok: false, error: "NOT_CONNECTED", status: integ.status },
        { status: 400 }
      );
    }

    // ✅ USAR EL tenant_id DE LA BD, no del request
    const db_tenant_id = integ.tenant_id;

    const creds = (integ.credentials || {}) as any;

    let access_token: string | null = creds.access_token || null;
    const refresh_token: string | null = creds.refresh_token || null;
    const expires_at = creds.expires_at ? Number(creds.expires_at) : null;
    const now = Math.floor(Date.now() / 1000);

    const mustRefresh =
      !access_token ||
      (expires_at && Number.isFinite(expires_at) && expires_at <= now + 60);

    // 2) Refrescar token si es necesario
    if (mustRefresh) {
      if (!refresh_token) {
        return NextResponse.json(
          { ok: false, error: "NO_REFRESH_TOKEN" },
          { status: 400 }
        );
      }

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const tokenJson = await tokenRes.json();

      if (!tokenRes.ok) {
        return NextResponse.json(
          { ok: false, error: "TOKEN_REFRESH_FAILED", details: tokenJson },
          { status: 401 }
        );
      }

      access_token = tokenJson.access_token;
      const expires_in = Number(tokenJson.expires_in || 3600);
      const new_expires_at = now + expires_in;

      // Actualizar token
      const newCreds = {
        ...creds,
        access_token,
        expires_at: new_expires_at,
        token_type: tokenJson.token_type || creds.token_type || "Bearer",
        scope: tokenJson.scope || creds.scope,
      };

      await supabase
        .from("integrations")
        .update({ credentials: newCreds, status: "connected" })
        .eq("id", integration_id);
    }

    // 3) Obtener mensajes de Gmail (últimos 50)
    const gmailRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&labelIds=INBOX",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const gmailJson = await gmailRes.json();

    if (!gmailRes.ok) {
      return NextResponse.json(
        { ok: false, error: "GMAIL_API_FAILED", details: gmailJson },
        { status: 502 }
      );
    }

    const messages = gmailJson.messages || [];
    const savedEmails: any[] = [];

    // 4) Por cada mensaje, obtener los detalles y guardarlo en Supabase
    for (const msg of messages.slice(0, 20)) {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          {
            headers: { Authorization: `Bearer ${access_token}` },
          }
        );

        const detail = await detailRes.json();

        if (!detailRes.ok) continue;

        // Extraer headers
        const headers = detail.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === "Subject")?.value || "(Sin asunto)";
        const from = headers.find((h: any) => h.name === "From")?.value || "";
        const to = headers.find((h: any) => h.name === "To")?.value || "";
        const date = headers.find((h: any) => h.name === "Date")?.value || "";

        // Extraer cuerpo (snippet o body)
        let bodyContent = detail.snippet || "";
        
        // Intentar obtener el body completo
        if (detail.payload?.parts) {
          const textPart = detail.payload.parts.find((p: any) => p.mimeType === "text/plain");
          if (textPart?.body?.data) {
            bodyContent = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          }
        } else if (detail.payload?.body?.data) {
          bodyContent = Buffer.from(detail.payload.body.data, 'base64').toString('utf-8');
        }

        // 5) Guardar en la tabla email_messages con las columnas correctas
        // ✅ Buscar duplicados usando el tenant_id de la BD
        let existingQuery = supabase
          .from("email_messages")
          .select("id")
          .eq("provider_message_id", msg.id)
          .eq("user_id", user_id);

        // Filtrar por tenant_id si existe en la BD
        if (db_tenant_id !== null) {
          existingQuery = existingQuery.eq("tenant_id", db_tenant_id);
        } else {
          existingQuery = existingQuery.is("tenant_id", null);
        }

        const { data: existing } = await existingQuery.maybeSingle();

        if (!existing) {
          const { data: inserted, error: insertErr } = await supabase
            .from("email_messages")
            .insert({
              tenant_id: db_tenant_id,
              user_id,
              integration_id,
              provider: "gmail",
              external_id: msg.id,  // ✅ AGREGAR: ID externo del mensaje
              provider_message_id: msg.id,
              thread_id: detail.threadId || null,
              provider_thread_id: detail.threadId || null,
              from_email: from,
              to_email: to,
              subject,
              snippet: detail.snippet || "",
              body_text: bodyContent,
              received_at: date ? new Date(date).toISOString() : new Date().toISOString(),
              sent_at: date ? new Date(date).toISOString() : new Date().toISOString(),
              has_attachments: false,
              raw: detail,
            })
            .select()
            .single();

          if (!insertErr && inserted) {
            savedEmails.push(inserted);
          } else if (insertErr) {
            console.error("Error insertando email:", insertErr);
          }
        }
      } catch (err) {
        console.error("Error procesando mensaje:", err);
        continue;
      }
    }

    // 6) Actualizar last_activity de la integración
    await supabase
      .from("integrations")
      .update({ last_activity: new Date().toISOString() })
      .eq("id", integration_id);

    return NextResponse.json({
      ok: true,
      tenant_id: db_tenant_id,  // ✅ Retornar el tenant_id de la BD
      user_id,
      integration_id,
      messages_found: messages.length,
      emails_saved: savedEmails.length,
      emails: savedEmails,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "UNEXPECTED_ERROR", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
