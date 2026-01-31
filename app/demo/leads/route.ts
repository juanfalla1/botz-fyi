import { NextResponse } from "next/server";
import { supabase } from "../../../supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("leads")
    .select("name,email,phone,status")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
