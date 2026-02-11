import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tenant_id = body?.tenant_id && String(body.tenant_id).trim() !== "" 
      ? String(body.tenant_id).trim() 
      : null;
    const user_id = String(body?.user_id || "").trim();
    const integration_id = String(body?.integration_id || "").trim();
    const to = String(body?.to || "").trim();
    const subject = String(body?.subject || "").trim();
    const email_body = String(body?.body || "").trim();

    // Validar campos obligatorios
    if (!isUuid(user_id) || !isUuid(integration_id)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_INPUT", details: "user_id o integration_id inválidos" },
        { status: 400 }
      );
    }

    if (tenant_id !== null && !isUuid(tenant_id)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_INPUT", details: "tenant_id debe ser UUID válido o null" },
        { status: 400 }
      );
    }

    if (!to || !subject || !email_body) {
      return NextResponse.json(
        { ok: false, error: "INVALID_INPUT", details: "to, subject y body son obligatorios" },
        { status: 400 }
      );
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

    // 1) Obtener la integración
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

    if (integ.status !== "connected") {
      return NextResponse.json(
        { ok: false, error: "NOT_CONNECTED", status: integ.status },
        { status: 400 }
      );
    }

    const creds = (integ.credentials || {}) as any;
    let access_token: string | null = creds.access_token || null;
    const refresh_token: string | null = creds.refresh_token || null;
    const now = Math.floor(Date.now() / 1000);

    // expires_at puede ser Unix timestamp (number) o ISO string
    let expires_at: number | null = null;
    if (creds.expires_at) {
      const raw = creds.expires_at;
      if (typeof raw === "number") {
        expires_at = raw;
      } else if (typeof raw === "string") {
        const parsed = Date.parse(raw);
        expires_at = isNaN(parsed) ? null : Math.floor(parsed / 1000);
      }
    }
    // También revisar expires_in original de Google
    if (!expires_at && creds.expires_in) {
      expires_at = now + Number(creds.expires_in);
    }

    console.log("📧 SEND-GMAIL DEBUG:", {
      has_access_token: !!access_token,
      has_refresh_token: !!refresh_token,
      expires_at,
      now,
      expired: expires_at ? expires_at <= now + 60 : "unknown",
      scope: creds.scope,
    });

    const mustRefresh =
      !access_token ||
      (expires_at !== null && expires_at <= now + 60);

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

    // 2.5) Verificar que el token tenga scope de envío
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${access_token}`
    );
    const tokenInfo = await tokenInfoRes.json();
    console.log("📧 TOKEN SCOPES:", tokenInfo.scope);

    const hasMailScope = tokenInfo.scope && (
      tokenInfo.scope.includes("mail.google.com") ||
      tokenInfo.scope.includes("gmail.send") ||
      tokenInfo.scope.includes("gmail.modify")
    );

    if (tokenInfoRes.ok && tokenInfo.scope && !hasMailScope) {
      return NextResponse.json(
        {
          ok: false,
          error: "MISSING_SEND_SCOPE",
          gmail_error: "El token no tiene permiso para enviar emails. Desconecta Gmail y vuelve a conectar.",
          current_scopes: tokenInfo.scope,
        },
        { status: 403 }
      );
    }

    // 3) Construir el email en formato RFC 2822
    // Codificar subject en base64 para soportar tildes/ñ
    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;
    
    const emailLines = [
      `From: me`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      Buffer.from(email_body).toString("base64"),
    ];
    const rawEmail = emailLines.join("\r\n");
    
    // Convertir a base64url (sin padding, sin +, sin /)
    const base64Email = Buffer.from(rawEmail)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // 4) Enviar el email usando Gmail API
    const sendRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: base64Email,
        }),
      }
    );

    const sendJson = await sendRes.json();

    if (!sendRes.ok) {
      console.error("Gmail send error:", JSON.stringify(sendJson, null, 2));
      console.error("Gmail send status:", sendRes.status);
      console.error("Token usado (primeros 20 chars):", access_token?.substring(0, 20));
      return NextResponse.json(
        { 
          ok: false, 
          error: "GMAIL_SEND_FAILED", 
          details: sendJson,
          gmail_error: sendJson.error?.message || JSON.stringify(sendJson),
          gmail_status: sendRes.status,
        },
        { status: 502 }
      );
    }

    // 5) Actualizar last_activity
    await supabase
      .from("integrations")
      .update({ last_activity: new Date().toISOString() })
      .eq("id", integration_id);

    return NextResponse.json({
      ok: true,
      message_id: sendJson.id,
      thread_id: sendJson.threadId,
      to,
      subject,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "UNEXPECTED_ERROR", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}