import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let t: any;
  const timeout = new Promise<T>((_resolve, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
};

export async function POST(req: Request) {
  try {
    const supabase = getServiceSupabase();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Supabase service not configured" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const tenantId = String(body?.tenantId || "").trim();
    const advisorId = body?.advisorId ? String(body.advisorId) : null;
    const lead = body?.lead || {};

    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "tenantId requerido" }, { status: 400 });
    }

    // Validar que el usuario puede escribir en ese tenant
    const [{ data: tmRows }, { data: subRows }] = await Promise.all([
      supabase
        .from("team_members")
        .select("tenant_id")
        .eq("auth_user_id", userRes.user.id)
        .eq("tenant_id", tenantId)
        .or("activo.is.null,activo.eq.true"),
      supabase
        .from("subscriptions")
        .select("tenant_id")
        .eq("user_id", userRes.user.id)
        .eq("tenant_id", tenantId)
        .in("status", ["active", "trialing"]),
    ]);

    const allowed = (tmRows && tmRows.length > 0) || (subRows && subRows.length > 0);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "No autorizado para ese tenant" }, { status: 403 });
    }

    const payload: any = {
      name: String(lead?.name || "").trim(),
      email: String(lead?.email || "").trim() || null,
      phone: String(lead?.phone || "").trim(),
      status: String(lead?.status || "NUEVO").trim() || "NUEVO",
      next_action: String(lead?.next_action || "").trim(),
      calificacion: String(lead?.calificacion || "").trim(),
      origen: String(lead?.origen || "manual").trim() || "manual",
      tenant_id: tenantId,
      user_id: userRes.user.id,
    };

    if (advisorId) {
      const { data: tm } = await supabase
        .from("team_members")
        .select("id, tenant_id")
        .eq("id", advisorId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (tm?.id) {
        payload.asesor_id = advisorId;
        payload.assigned_to = advisorId;
      }
    }

    const insertPromise = supabase.from("leads").insert([payload]).select("*").single();
    const insertRes: any = await withTimeout(
      insertPromise as unknown as Promise<any>,
      12000,
      "insert lead"
    );

    if (insertRes?.error) {
      const msg = String(insertRes.error?.message || "");
      const isDuplicate =
        insertRes.error?.code === "23505" ||
        msg.includes("leads_tenant_phone_unique") ||
        msg.includes("leads_tenant_email_unique");

      if (isDuplicate) {
        const phone = payload.phone || "";
        const email = payload.email || "";

        let existing: any = null;
        if (phone && email) {
          const { data } = await supabase
            .from("leads")
            .select("*")
            .eq("tenant_id", tenantId)
            .or(`phone.eq.${phone},email.eq.${email}`)
            .maybeSingle();
          existing = data;
        } else if (phone) {
          const { data } = await supabase
            .from("leads")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("phone", phone)
            .maybeSingle();
          existing = data;
        } else if (email) {
          const { data } = await supabase
            .from("leads")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("email", email)
            .maybeSingle();
          existing = data;
        }

        if (!existing) {
          return NextResponse.json({ ok: false, error: "Lead duplicado" }, { status: 409 });
        }

        if (advisorId) {
          const assignedTo = String(existing.assigned_to || "");
          const asesorId = String(existing.asesor_id || "");
          const current = String(advisorId);
          const isMine = assignedTo === current || asesorId === current;
          const isUnassigned = !assignedTo && !asesorId;

          if (!isMine && !isUnassigned) {
            return NextResponse.json({ ok: false, assignedToOther: true }, { status: 409 });
          }

          if (isUnassigned) {
            const { data: updated } = await supabase
              .from("leads")
              .update({ assigned_to: advisorId, asesor_id: advisorId })
              .eq("id", existing.id)
              .select("*")
              .single();
            return NextResponse.json({ ok: true, existing: true, lead: updated || existing });
          }
        }

        return NextResponse.json({ ok: true, existing: true, lead: existing });
      }

      return NextResponse.json({ ok: false, error: insertRes.error?.message || "Error insert" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, lead: insertRes?.data || null });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}
