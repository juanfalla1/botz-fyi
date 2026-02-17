#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// ✅ Cargar variables de entorno
const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ ERROR: Falta configurar variables de entorno");
  console.error("   Asegúrate que .env.local tenga:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixLeadTenants() {
  console.log("\n🔍 [LEAD TENANT FIX] Iniciando validación...\n");

  try {
    // ✅ Paso 1: Obtener todos los leads
    console.log("📋 Obteniendo leads...");
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select(
        "id, tenant_id, user_id, asesor_id, created_by_email, name, status"
      );

    if (leadsError) {
      console.error("❌ Error obteniendo leads:", leadsError.message);
      process.exit(1);
    }

    if (!leads || leads.length === 0) {
      console.log("✅ No hay leads en la base de datos\n");
      process.exit(0);
    }

    console.log(`✅ Leads encontrados: ${leads.length}\n`);

    // ✅ Paso 2: Validar tenant de cada lead
    console.log(
      "⏳ Validando tenant correcto para cada lead (esto puede tomar un momento)...\n"
    );

    const issues = [];
    let processed = 0;

    for (const lead of leads) {
      processed++;
      process.stdout.write(`\r   Procesando... ${processed}/${leads.length}`);

      let correctTenant = null;
      let foundBy = null;

      // ✅ Opción A: Si tiene asesor_id, obtener tenant del team_member
      if (lead.asesor_id) {
        const { data: teamMember } = await supabase
          .from("team_members")
          .select("tenant_id, email, nombre")
          .eq("id", lead.asesor_id)
          .maybeSingle();

        if (teamMember?.tenant_id) {
          correctTenant = teamMember.tenant_id;
          foundBy = `team_member (${teamMember.nombre || teamMember.email})`;
        }
      }

      // ✅ Opción B: Si tiene email, obtener tenant por email
      if (!correctTenant && lead.created_by_email) {
        const { data: teamMember } = await supabase
          .from("team_members")
          .select("tenant_id, nombre")
          .eq("email", lead.created_by_email)
          .maybeSingle();

        if (teamMember?.tenant_id) {
          correctTenant = teamMember.tenant_id;
          foundBy = `email (${lead.created_by_email})`;
        }
      }

      // ✅ Opción C: Si tiene user_id, obtener tenant de suscripción
      if (!correctTenant && lead.user_id) {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("tenant_id")
          .eq("user_id", lead.user_id)
          .in("status", ["active", "trialing"])
          .maybeSingle();

        if (subscription?.tenant_id) {
          correctTenant = subscription.tenant_id;
          foundBy = "subscription";
        }
      }

      // ✅ Verificar discrepancia
      if (
        correctTenant &&
        lead.tenant_id &&
        lead.tenant_id !== correctTenant
      ) {
        issues.push({
          leadId: lead.id,
          leadName: lead.name || "(sin nombre)",
          currentTenant: lead.tenant_id,
          correctTenant,
          asesorId: lead.asesor_id || "N/A",
          email: lead.created_by_email || "N/A",
          status: lead.status || "N/A",
          foundBy,
        });
      }
    }

    console.log("\r" + " ".repeat(50) + "\r"); // Limpiar línea

    // ✅ Paso 3: Mostrar resultados
    console.log("\n" + "=".repeat(80));
    console.log("📊 RESULTADOS DE VALIDACIÓN");
    console.log("=".repeat(80) + "\n");

    console.log(
      `Total de leads: ${leads.length}`
    );
    console.log(`Leads con tenant INCORRECTO: ${issues.length}`);
    console.log(`Leads CORRECTOS: ${leads.length - issues.length}\n`);

    if (issues.length === 0) {
      console.log("✅ ¡Excelente! Todos los leads están en el tenant correcto.\n");
      process.exit(0);
    }

    // ✅ Mostrar tabla de problemas
    console.log("⚠️  LEADS CON TENANT INCORRECTO:\n");
    console.table(
      issues.map((issue) => ({
        "Lead ID": issue.leadId,
        Nombre: issue.leadName,
        "Tenant Actual": issue.currentTenant?.substring(0, 8),
        "Tenant Correcto": issue.correctTenant?.substring(0, 8),
        Asesor: issue.asesorId?.substring(0, 8),
        Email: issue.email,
        Estado: issue.status,
      }))
    );

    // ✅ Paso 4: Preguntar si aplicar correcciones
    console.log("\n" + "=".repeat(80));
    console.log("⚡ SIGUIENTES PASOS");
    console.log("=".repeat(80) + "\n");

    console.log("Para APLICAR las correcciones automáticamente, ejecuta:\n");
    console.log(`  node fix-leads-tenants.mjs --fix\n`);

    console.log(
      "Esto reasignará todos los leads al tenant correcto automáticamente.\n"
    );

    // ✅ Verificar flag --fix
    if (process.argv.includes("--fix")) {
      console.log("🔧 [FIX MODE] Aplicando correcciones...\n");

      let fixed = 0;
      for (const issue of issues) {
        const { error: updateError } = await supabase
          .from("leads")
          .update({ tenant_id: issue.correctTenant })
          .eq("id", issue.leadId);

        if (updateError) {
          console.log(
            `❌ Error reasignando ${issue.leadId}: ${updateError.message}`
          );
        } else {
          console.log(
            `✅ Lead ${issue.leadId} → ${issue.correctTenant.substring(0, 8)}`
          );
          fixed++;
        }
      }

      console.log("\n" + "=".repeat(80));
      console.log(`✅ Se corrigieron ${fixed}/${issues.length} leads\n`);
      process.exit(0);
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error?.message || error);
    process.exit(1);
  }
}

fixLeadTenants();
