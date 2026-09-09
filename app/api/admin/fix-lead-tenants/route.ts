import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getRequestUser, isPlatformAdmin } from "@/app/api/_utils/guards";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Handler para validar y corregir leads con tenant incorrecto
export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: authError || "Unauthorized" }, { status: 401 });
    }
    const admin = await isPlatformAdmin(user.id);
    if (!admin.isAdmin) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    console.log("🔍 [LEAD FIX] Iniciando validación de leads...");

    // ✅ Paso 1: Obtener todos los leads
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, tenant_id, user_id, asesor_id, created_by_email");

    if (leadsError) {
      console.error("❌ Error obteniendo leads:", leadsError);
      return NextResponse.json(
        { ok: false, error: "Error obteniendo leads" },
        { status: 500 }
      );
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { ok: true, message: "No hay leads para validar", fixed: 0, issues: [] },
        { status: 200 }
      );
    }

    console.log(`📋 [LEAD FIX] Total leads encontrados: ${leads.length}`);

    // ✅ Paso 2: Para cada lead, verificar el tenant correcto
    const issues: any[] = [];
    const fixes: any[] = [];

    for (const lead of leads) {
      let correctTenantId: string | null = null;

      // ✅ Opción A: Si tiene asesor_id, obtener el tenant del team_member
      if (lead.asesor_id) {
        const { data: teamMember, error: tmError } = await supabase
          .from("team_members")
          .select("tenant_id")
          .eq("id", lead.asesor_id)
          .maybeSingle();

        if (tmError) {
          console.warn(`⚠️ [LEAD FIX] Error buscando team_member ${lead.asesor_id}:`, tmError);
        } else if (teamMember?.tenant_id) {
          correctTenantId = teamMember.tenant_id;
        }
      }

      // ✅ Opción B: Si tiene created_by_email, buscar el tenant del asesor por email
      if (!correctTenantId && lead.created_by_email) {
        const { data: teamMember, error: tmError } = await supabase
          .from("team_members")
          .select("tenant_id")
          .eq("email", lead.created_by_email)
          .maybeSingle();

        if (tmError) {
          console.warn(`⚠️ [LEAD FIX] Error buscando team_member por email:`, tmError);
        } else if (teamMember?.tenant_id) {
          correctTenantId = teamMember.tenant_id;
        }
      }

      // ✅ Opción C: Si tiene user_id (auth), buscar suscripción del usuario
      if (!correctTenantId && lead.user_id) {
        const { data: sub, error: subError } = await supabase
          .from("subscriptions")
          .select("tenant_id")
          .eq("user_id", lead.user_id)
          .in("status", ["active", "trialing"])
          .maybeSingle();

        if (subError) {
          console.warn(`⚠️ [LEAD FIX] Error buscando suscripción:`, subError);
        } else if (sub?.tenant_id) {
          correctTenantId = sub.tenant_id;
        }
      }

      // ✅ Verificar si el tenant es incorrecto
      if (correctTenantId && lead.tenant_id !== correctTenantId) {
        issues.push({
          leadId: lead.id,
          currentTenant: lead.tenant_id,
          correctTenant: correctTenantId,
          asesorId: lead.asesor_id,
          email: lead.created_by_email,
        });
      }
    }

    console.log(`⚠️ [LEAD FIX] Leads con tenant incorrecto: ${issues.length}`);

    // ✅ Paso 3: Preguntar si corregir
    const { fix } = await req.json().catch(() => ({ fix: false }));

    if (!fix) {
      return NextResponse.json(
        {
          ok: true,
          message: "Validación completada. Usa ?fix=true para aplicar correcciones.",
          issues,
          totalLeads: leads.length,
          issuesFound: issues.length,
        },
        { status: 200 }
      );
    }

    // ✅ Paso 4: Corregir los leads
    for (const issue of issues) {
      const { error: updateError } = await supabase
        .from("leads")
        .update({ tenant_id: issue.correctTenant })
        .eq("id", issue.leadId);

      if (updateError) {
        console.error(
          `❌ [LEAD FIX] Error actualizando lead ${issue.leadId}:`,
          updateError
        );
      } else {
        console.log(
          `✅ [LEAD FIX] Lead ${issue.leadId} reasignado: ${issue.currentTenant} → ${issue.correctTenant}`
        );
        fixes.push(issue);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        message: `Se corrigieron ${fixes.length} leads`,
        fixed: fixes.length,
        issues,
        corrections: fixes,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ [LEAD FIX] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Error procesando leads" },
      { status: 500 }
    );
  }
}
