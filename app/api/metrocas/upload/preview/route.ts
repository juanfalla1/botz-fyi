import { NextResponse } from "next/server";
import { parseCsvText } from "@/app/api/metrocas/_shared";
import { validateColumns } from "@/app/lib/metrocas/analyzer";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  const ext = (file.name || "").toLowerCase();
  if (!ext.endsWith(".csv")) {
    return NextResponse.json({ error: "Preview MVP disponible para CSV." }, { status: 422 });
  }
  const parsed = parseCsvText(await file.text());
  const columns = Object.keys(parsed.data[0] || {});
  const validation = validateColumns(columns);
  return NextResponse.json({
    ok: true,
    columns,
    preview: parsed.data.slice(0, 12),
    validation,
    parseErrors: parsed.errors,
  });
}
