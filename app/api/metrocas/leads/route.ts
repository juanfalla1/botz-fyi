import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export async function POST(req: Request) {
  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
  const body = await req.json();

  const payload = {
    tenant_id: body.tenant_id || null,
    created_by: body.created_by || null,
    name: String(body.name || "").trim(),
    company: String(body.company || "").trim(),
    email: String(body.email || "").trim(),
    whatsapp: String(body.whatsapp || "").trim(),
    sector: String(body.sector || "").trim(),
    company_size: String(body.company_size || "").trim(),
    current_system: String(body.current_system || "").trim(),
    message: String(body.message || "").trim(),
    source: "metrocas_landing",
  };

  if (!payload.name || !payload.email) {
    return NextResponse.json({ error: "Nombre y email son obligatorios" }, { status: 400 });
  }

  const { data, error } = await svc.from("metrocas_leads").insert(payload).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
