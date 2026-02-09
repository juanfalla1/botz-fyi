// app/api/whatsapp/connect/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { evolutionService } from "../../../../lib/services/evolution.service";
import { metaService } from "../../../../lib/services/meta.service";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

function isCreate401(msg?: string) {
  return !!msg && msg.includes("/instance/create") && msg.includes('"status":401');
}

// ✅ NUEVO: Evolution a veces devuelve 400 por FK, pero la instancia igual queda creada.
// El error típico trae "Setting_instanceId_fkey" o "Foreign key constraint violated".
function isCreate400SettingFk(msg?: string) {
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
    const body = await req.json();
    const { tenant_id } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
    }

    const provider = "evolution"; // o "meta"

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
          status: "connected",
        });
      }

      // 2) Intentar crear instancia tenant_<id>
      try {
        await evolutionService.createInstance(tenant_id);
      } catch (err: any) {
        const msg = err?.message || "";

        if (isCreate401(msg)) {
          // ✅ no puedes crear → usa instancia existente
          instanceToUse = defaultInstance;
        } else if (isCreate400SettingFk(msg)) {
          // ✅ FIX: no rompas el flujo; espera un poco y continúa.
          console.warn("Evolution createInstance 400 FK (continuando):", msg);
          await sleep(1200);
          // mantenemos instanceToUse = tenantInstance
        } else {
          throw err;
        }
      }

      // 3) Status real de la instancia elegida
      const s2 = await evolutionService.getStatus(instanceToUse);

      // ✅ si está connected, NO pidas QR
      if (s2 === "connected") {
        await supabase
          .from("whatsapp_connections")
          .upsert(
            {
              tenant_id,
              provider: "evolution",
              instance_name: instanceToUse,
              status: "connected",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "tenant_id" }
          );

        return NextResponse.json({
          success: true,
          provider: "evolution",
          connection_type: "already_connected",
          instance_id: instanceToUse,
          status: "connected",
        });
      }

      // 4) Si NO está conectado, pedir QR
      const qrCode = await evolutionService.getQRCode(instanceToUse);
      if (!qrCode) {
        return NextResponse.json(
          { error: "No QR available. Instance may already be connected or server did not return QR." },
          { status: 500 }
        );
      }

      const { error } = await supabase
        .from("whatsapp_connections")
        .upsert(
          {
            tenant_id,
            provider: "evolution",
            instance_name: instanceToUse,
            status: "pending",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id" }
        );

      if (error) throw error;

      return NextResponse.json({
        success: true,
        provider: "evolution",
        connection_type: "qr",
        qr_code: qrCode,
        instance_id: instanceToUse,
      });
    }

    // ✅ Meta (OAuth) (si lo vuelves a activar)
    if (provider === "meta") {
      const authUrl = metaService.getAuthUrl(tenant_id);
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
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
