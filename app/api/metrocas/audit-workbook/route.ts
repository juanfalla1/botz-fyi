import { NextResponse } from "next/server";
import { auditWorkbook } from "@/app/lib/metrocas/excel-engine";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    const report = auditWorkbook(await file.arrayBuffer(), file.name || "workbook.xlsx");
    return NextResponse.json({ ok: true, report });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: "No se pudo auditar workbook", details: error?.message || "Unknown error" }, { status: 500 });
  }
}
