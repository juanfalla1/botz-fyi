import { NextResponse } from "next/server";
import { processDataset, processExcelDataset, resolveTenant } from "@/app/api/metrocas/_shared";

export async function POST(req: Request) {
  try {
    const access = await resolveTenant(req);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

    const fileType = file.type || "text/csv";
    const fileName = file.name || "dataset.csv";
    const ext = fileName.toLowerCase();
    if (!(ext.endsWith(".csv") || ext.endsWith(".xlsx") || ext.endsWith(".xls"))) {
      return NextResponse.json({ error: "Formato no soportado. Usa CSV o Excel." }, { status: 400 });
    }
    if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
      const result = await processExcelDataset({
        tenantId: access.tenantId,
        createdBy: access.user.id,
        fileName,
        fileType,
        buffer: await file.arrayBuffer(),
      });
      if (!result.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "El archivo no cumple validaciones minimas",
            details: (result.validation?.criticalErrors || []).join(" | ") || "Revisa hoja Macro/Macro 2026",
            validation: result.validation,
          },
          { status: 400 },
        );
      }
      return NextResponse.json({ ok: true, dataset: result.dataset, validation: result.validation, dashboard: result.dashboard });
    }

    const csvText = await file.text();
    const result = await processDataset({
      tenantId: access.tenantId,
      createdBy: access.user.id,
      fileName,
      fileType,
      csvText,
    });

    if (!result.validation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: "CSV invalido",
          details: (result.validation?.criticalErrors || []).join(" | ") || "Faltan columnas criticas",
          validation: result.validation,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, dataset: result.dataset, validation: result.validation, dashboard: result.dashboard });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error interno al importar dataset",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
