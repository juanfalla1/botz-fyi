"use client";

import { useEffect, useMemo, useState } from "react";
import s from "@/app/metrocas/ui/metrocas-theme.module.css";

export function MetrocasUploadCenter() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [loadingAction, setLoadingAction] = useState<"preview" | "import" | "">("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = new URLSearchParams(window.location.search).get("access_key") || "";
    setAccessKey(key);
  }, []);

  const withAccessKey = useMemo(
    () =>
      (path: string) =>
        accessKey ? `${path}${path.includes("?") ? "&" : "?"}access_key=${encodeURIComponent(accessKey)}` : path,
    [accessKey],
  );

  async function doPreview() {
    if (!file) return;
    setLoadingAction("preview");
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(withAccessKey("/api/metrocas/upload/preview"), { method: "POST", body: form });
    if (res.status === 401) {
      setLoading(false);
      setLoadingAction("");
      setMessage("Debes iniciar sesion antes de subir archivos. Entra por /login?next=/metricas y vuelve a intentar.");
      return;
    }
    const json = await res.json();
    setPreview(json);
    setLoading(false);
    setLoadingAction("");
  }

  async function doImport() {
    if (!file) return;
    setLoadingAction("import");
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(withAccessKey("/api/metrocas/upload"), { method: "POST", body: form });
    if (res.status === 401) {
      setLoading(false);
      setLoadingAction("");
      setMessage("Debes iniciar sesion antes de importar. Entra por /login?next=/metricas y vuelve a intentar.");
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
    setLoadingAction("");
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
      ? withAccessKey(`/intelligence?dataset_id=${encodeURIComponent(datasetId)}`)
      : withAccessKey("/intelligence");
  }

  return (
    <main className={`${s.metrocasRoot} ${s.lightSurface}`}>
      <div className={s.topNav}>
        <div className={`${s.container} ${s.topNavInner}`}>
          <div className={s.brand}>Metricas Upload Center</div>
          <div className={s.navActions}>
            <a href={withAccessKey("/metricas")} className={s.btnSecondary}>Volver al landing</a>
            <a href={withAccessKey("/intelligence")} className={s.btnPrimary}>Ir al dashboard</a>
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
          <button onClick={doPreview} disabled={!file || loading} className={s.btnSecondary}>
            {loading && loadingAction === "preview" ? (
              <span className={s.inlineLoader}><span className={s.spinner} /> Cargando preview...</span>
            ) : "Preview"}
          </button>
          <button onClick={doImport} disabled={!file || loading} className={s.btnPrimary}>
            {loading && loadingAction === "import" ? (
              <span className={s.inlineLoader}><span className={`${s.spinner} ${s.spinnerLg}`} /> Importando archivo...</span>
            ) : "Confirmar importacion"}
          </button>
        </div>
        {loading ? <p className={s.muted}><span className={s.inlineLoader}><span className={`${s.spinner} ${s.spinnerLg}`} /> Procesando Excel, por favor espera...</span></p> : null}
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
