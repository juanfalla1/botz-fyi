import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Missing phone parameter" },
        { status: 400 }
      );
    }

    // ✅ Trae el lead más reciente de Postgres (tabla public.leads)
    const { data, error } = await supabase
      .from("leads")
      .select(
        "phone, etapa, step, prev_step, estado_operacion, next_field, bloqueo_chat, can_generate_pdf, updated_at"
      )
      .eq("phone", phone)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Si no existe, devolvemos estado inicial
    if (!data) {
      return NextResponse.json({
        phone,
        etapa: "ASESOR_VIRTUAL",
        step: null,
        next_field: null,
        estado_operacion: null,
        bloqueo_chat: false,
        can_generate_pdf: false,
        updated_at: null,
      });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
