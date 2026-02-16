// app/api/whatsapp/connect/route.ts

import { NextRequest, NextResponse } from "next/server";
import { evolutionService } from "../../../../lib/services/evolution.service";
import { metaService } from "../../../../lib/services/meta.service";
import { assertTenantAccess } from "../../_utils/guards";
import { getServiceSupabase } from "../../_utils/supabase";

const supabase = getServiceSupabase();

function isCreate401(msg?: string) {
  return !!msg && msg.includes("/instance/create") && msg.includes('"status":401');
}

function isCreate400ForeignKey(msg?: string) {
  if (!msg) return false;
  const has400 = msg.includes("/instance/create") && msg.includes('"status":400');
  const hasFk =
    msg.includes("Setting_instanceId_fkey") ||
    msg.includes("Foreign key constraint violated") ||
    msg.includes("Setting_instanceId_fkey");
  return has400 && hasFk;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Missing SUPABASE env (URL or SERVICE_ROLE)" }, { status: 500 });
    }

    const body = await req.json();
    const tenant_id = String(body?.tenant_id || body?.tenantId || "").trim();

    if (!tenant_id) {
      return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
    }

    const guard = await assertTenantAccess({ req, requestedTenantId: tenant_id });
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    // ✅ Provider dinámico (por defecto: evolution QR)
    // Envía { provider: "meta" } para iniciar OAuth de Meta (WhatsApp Business API)
    const providerFromBody = String(
      body?.provider ?? body?.mode ?? body?.connection_type ?? ""
    )
      .toLowerCase()
      .trim();

    const provider = providerFromBody === "meta" ? "meta" : "evolution";

    if (provider === "evolution") {
      const tenantInstance = `tenant_${tenant_id}`;
      const defaultInstance = (process.env.EVOLUTION_DEFAULT_INSTANCE || "Botz").trim();

      let instanceToUse = tenantInstance;

      // 1) Si el tenantInstance ya está conectado
      const s1 = await evolutionService.getStatus(tenantInstance);
      if (s1 === "connected") {
        return NextResponse.json({
          success: true,
          provider: "evolution",
          connection_type: "already_connected",
          instance_id: tenantInstance,
        });
      }

      // 2) Si existe y está pending/connecting, intentamos QR
      try {
        console.log("[WhatsApp Connect] Intentando obtener QR para instancia:", tenantInstance);
        const qr = await evolutionService.getQRCode(tenantInstance);
        console.log("[WhatsApp Connect] QR obtenido:", qr ? "Sí (presente)" : "No (null/undefined)");

        await supabase.from("whatsapp_connections").upsert(
          {
            tenant_id,
            provider: "evolution",
            instance_name: tenantInstance,
            status: "pending",
            qr_code: qr,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id" }
        );

        return NextResponse.json({
          success: true,
          provider: "evolution",
          connection_type: "qr",
          instance_id: tenantInstance,
          qr_code: qr,
        });
      } catch (e: any) {
        console.log("[WhatsApp Connect] Error obteniendo QR (posiblemente instancia no existe):", e?.message);
        // si falló por instancia no existente, seguimos
      }

      // 3) Crear instancia tenant
      try {
        console.log("[WhatsApp Connect] Creando instancia:", instanceToUse);
        const createRes = await evolutionService.createInstance(instanceToUse);
        console.log("[WhatsApp Connect] Instancia creada, respuesta:", Object.keys(createRes || {}));

        // Guardar registro "pending"
        await supabase.from("whatsapp_connections").upsert(
          {
            tenant_id,
            provider: "evolution",
            instance_name: instanceToUse,
            status: "pending",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id" }
        );

        // extraer qr (depende de tu evolutionService)
        const qr = createRes?.qr_code || createRes?.qr || createRes?.qrcode || null;
        console.log("[WhatsApp Connect] QR extraído de createInstance:", qr ? "Sí" : "No");

        if (qr) {
          await supabase.from("whatsapp_connections").update(
            {
              qr_code: qr,
              updated_at: new Date().toISOString(),
            }
          ).eq("tenant_id", tenant_id);
        }

        return NextResponse.json({
          success: true,
          provider: "evolution",
          connection_type: "qr",
          instance_id: instanceToUse,
          qr_code: qr,
        });
      } catch (err: any) {
        const msg = err?.message || String(err);

        // ✅ Si error 401 en create, usamos defaultInstance (no tocamos tu lógica)
        if (isCreate401(msg) || isCreate400ForeignKey(msg)) {
          instanceToUse = defaultInstance;

          // Espera breve por si Evolution está creando settings
          await sleep(800);

          const createRes = await evolutionService.createInstance(instanceToUse);

          await supabase.from("whatsapp_connections").upsert(
            {
              tenant_id,
              provider: "evolution",
              instance_name: instanceToUse,
              status: "pending",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "tenant_id" }
          );

          const qr = createRes?.qr_code || createRes?.qr || createRes?.qrcode || null;

          if (qr) {
            await supabase.from("whatsapp_connections").update(
              {
                qr_code: qr,
                updated_at: new Date().toISOString(),
              }
            ).eq("tenant_id", tenant_id);
          }

          return NextResponse.json({
            success: true,
            provider: "evolution",
            connection_type: "qr",
            instance_id: instanceToUse,
            qr_code: qr,
          });
        }

        throw err;
      }
    }

    // ✅ Meta (WhatsApp Business API) - OAuth
    if (provider === "meta") {
      const authUrl = metaService.getAuthUrl(tenant_id);

      // (opcional) registrar que inició conexión meta
      await supabase.from("whatsapp_connections").upsert(
        {
          tenant_id,
          provider: "meta",
          instance_name: `meta_${tenant_id}`,
          status: "pending",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" }
      );

      return NextResponse.json({
        success: true,
        provider: "meta",
        connection_type: "oauth",
        auth_url: authUrl,
      });
    }

    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in /api/whatsapp/connect:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
