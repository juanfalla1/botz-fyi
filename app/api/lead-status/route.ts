import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

// 🔒 Normalizador ÚNICO de teléfono (Meta / Evolution / Wasapi)
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("+" as any) ? digits : `+${digits}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phoneParam = searchParams.get("phone");

    if (!phoneParam) {
      return NextResponse.json(
        { error: "Missing phone parameter" },
        { status: 400 }
      );
    }

    const phone = normalizePhone(phoneParam);

    if (!phone) {
      return NextResponse.json(
        { error: "Invalid phone format" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("leads")
      .select(
        `
        phone,
        etapa,
        step,
        prev_step,
        estado_operacion,
        next_field,
        bloqueo_chat,
        can_generate_pdf,
        updated_at
      `
      )
      .eq("phone", phone)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 🧠 Lead aún no existe → estado inicial controlado
    if (!data) {
      return NextResponse.json({
        phone,
        etapa: "ASESOR_VIRTUAL",
        step: null,
        prev_step: null,
        next_field: "precio_real",
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
