"use client";

import { useState } from "react";
import s from "@/app/metrocas/ui/metrocas-theme.module.css";

export function MetrocasUploadCenter() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function doPreview() {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/metrocas/upload/preview", { method: "POST", body: form });
    if (res.status === 401) {
      setLoading(false);
      setMessage("Debes iniciar sesion antes de subir archivos. Entra por /start?auth=1 y vuelve a intentar.");
      return;
    }
    const json = await res.json();
    setPreview(json);
    setLoading(false);
  }

  async function doImport() {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/metrocas/upload", { method: "POST", body: form });
    if (res.status === 401) {
      setLoading(false);
      setMessage("Debes iniciar sesion antes de importar. Entra por /start?auth=1 y vuelve a intentar.");
      return;
    }
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    setLoading(false);
    if (!res.ok) {
      const validationDetails = json?.validation
        ? [
            ...(json.validation.criticalErrors || []),
            ...(json.validation.warnings || []),
          ].filter(Boolean).join(" | ")
        : "";
      setMessage(
        json?.details
          ? `${json.error}: ${json.details}`
          : validationDetails
            ? validationDetails
            : json?.error || "No se pudo importar",
      );
      return;
    }
    const datasetId = json?.dataset?.id;
    setMessage("Dataset importado. Redirigiendo a dashboard...");
    window.location.href = datasetId
      ? `/intelligence?dataset_id=${encodeURIComponent(datasetId)}`
      : "/intelligence";
  }

  return (
    <main className={`${s.metrocasRoot} ${s.lightSurface}`}>
      <div className={s.topNav}>
        <div className={`${s.container} ${s.topNavInner}`}>
          <div className={s.brand}>Metricas Upload Center</div>
          <div className={s.navActions}>
            <a href="/metricas" className={s.btnSecondary}>Volver al landing</a>
            <a href="/intelligence" className={s.btnPrimary}>Ir al dashboard</a>
          </div>
        </div>
      </div>
      <div className={s.container} style={{ padding: "22px 0 32px" }}>
        <div className={s.card}>
        <h1 className={s.sectionTitle}>Upload Center</h1>
        <p className={s.muted}>Sube el Excel mensual (31 hojas). El sistema detecta hojas, valida Macro, reconstruye Hoja8 si falta y procesa POS si existe.</p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className={s.input}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <div className={s.navActions} style={{ marginTop: 10 }}>
          <button onClick={doPreview} disabled={!file || loading} className={s.btnSecondary}>Preview</button>
          <button onClick={doImport} disabled={!file || loading} className={s.btnPrimary}>Confirmar importacion</button>
        </div>
        {message ? <p className={s.muted}>{message}</p> : null}

        {preview?.validation ? (
          <div className={s.grid2} style={{ marginTop: 12 }}>
            <div className={s.card}>
              <h3 className="font-semibold">Validacion del workbook</h3>
              <p className="mt-2">Valido: {String(preview.validation.valid)}</p>
              <p>Errores criticos: {(preview.validation.criticalErrors || []).join(" | ") || "Ninguno"}</p>
              <p>Advertencias: {(preview.validation.warnings || []).join(" | ") || "Ninguna"}</p>
            </div>
            <div className={s.card}>
              <h3 className="font-semibold">Preview</h3>
              <pre className={s.muted}>{JSON.stringify(preview.preview || [], null, 2)}</pre>
            </div>
          </div>
        ) : null}
        </div>
      </div>
    </main>
  );
}
