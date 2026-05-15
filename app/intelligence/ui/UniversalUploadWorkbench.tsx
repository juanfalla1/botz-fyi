"use client";

import { useState } from "react";
import s from "@/app/intelligence/ui/UniversalUploadWorkbench.module.css";

export function UniversalUploadWorkbench() {
  const [file, setFile] = useState<File | null>(null);
  const [workspaceId, setWorkspaceId] = useState("default");
  const [datasetId, setDatasetId] = useState("");
  const [uploadId, setUploadId] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [out, setOut] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [mappingDraft, setMappingDraft] = useState<Record<string, string>>({});
  const [fromMonth, setFromMonth] = useState("2026-01");
  const [toMonth, setToMonth] = useState("2026-02");
  const [insightMode, setInsightMode] = useState("ejecutivo");
  const [analysisSummary, setAnalysisSummary] = useState<any>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const [actionLoading, setActionLoading] = useState<string>("");
  const [actionMessage, setActionMessage] = useState("");
  const [lastAction, setLastAction] = useState("");
  const [lastActionAt, setLastActionAt] = useState("");
  const [actionTick, setActionTick] = useState(0);

  const markActionDone = (name: string, message: string) => {
    setLastAction(name);
    setLastActionAt(new Date().toLocaleTimeString("es-CO"));
    setActionMessage(message);
    setActionTick((v) => v + 1);
  };

  async function submitUpload() {
    if (!file) return;
    setLoading(true);
    setError("");
    const fd = new FormData();
    fd.set("file", file);
    fd.set("workspace_id", workspaceId || "default");
    try {
      const r = await fetch("/api/uploads", { method: "POST", body: fd });
      const txt = await r.text();
      let j: any = {};
      try {
        j = txt ? JSON.parse(txt) : {};
      } catch {
        j = { error: txt || "Respuesta no JSON" };
      }
      if (!r.ok) {
        setError(String(j?.details || j?.error || `Error HTTP ${r.status}`));
        setOut(j);
        setLoading(false);
        return;
      }
      setUploadId(j.upload_id || "");
      const dsId = String(j.dataset_id || "");
      setDatasetId(dsId);
      setProfile(j.profile || null);
      setMappingDraft(j?.semanticMap || {});
      setOut(j);
      setStep(2);
      if (dsId) {
        await runFullAnalysisFor(dsId);
      }
    } catch (e: any) {
      setError(e?.message || "No se pudo subir el archivo");
    } finally {
      setLoading(false);
    }
  }

  async function runFullAnalysisFor(dsId: string) {
    setActionLoading("full");
    setActionMessage("Generando analisis visual...");
    try {
      await fetch(`/api/datasets/${dsId}/map-schema`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping: mappingDraft }),
      });
      await fetch(`/api/datasets/${dsId}/build-model`, { method: "POST" });
      await fetch(`/api/analysis/variance?dataset_id=${encodeURIComponent(dsId)}&dimension=category&from_month=${encodeURIComponent(fromMonth)}&to_month=${encodeURIComponent(toMonth)}`);
      await fetch("/api/insights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset_id: dsId, mode: insightMode, from_month: fromMonth, to_month: toMonth }),
      });
      markActionDone("Analisis completo", "Analisis listo. Redirigiendo al dashboard...");
      window.location.href = `/intelligence/universal/${encodeURIComponent(dsId)}`;
    } catch (e: any) {
      setError(e?.message || "No se pudo generar analisis completo");
    } finally {
      setActionLoading("");
    }
  }

  async function buildModel() {
    if (!datasetId) return;
    setActionLoading("build");
    setActionMessage("");
    const r = await fetch(`/api/datasets/${datasetId}/build-model`, { method: "POST" });
    setOut(await r.json());
    markActionDone("Build model", "Modelo construido correctamente.");
    setStep(4);
    setActionLoading("");
  }

  async function fetchProfile() {
    if (!datasetId) return;
    setActionLoading("profile");
    setActionMessage("");
    const r = await fetch(`/api/datasets/${datasetId}/profile`);
    const j = await r.json();
    setProfile(j.profile || null);
    setMappingDraft(j.semanticMap || {});
    setOut(j);
    setStep(3);
    markActionDone("Refrescar perfilado", "Perfilado actualizado.");
    setActionLoading("");
  }

  async function saveMapping() {
    if (!datasetId) return;
    setActionLoading("mapping");
    setActionMessage("");
    const r = await fetch(`/api/datasets/${datasetId}/map-schema`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapping: mappingDraft }),
    });
    setOut(await r.json());
    setStep(4);
    markActionDone("Guardar mapeo", "Mapeo guardado.");
    setActionLoading("");
  }

  async function runVariance() {
    if (!datasetId) return;
    setActionLoading("variance");
    setActionMessage("");
    const r = await fetch(`/api/analysis/variance?dataset_id=${encodeURIComponent(datasetId)}&dimension=category&from_month=${encodeURIComponent(fromMonth)}&to_month=${encodeURIComponent(toMonth)}`);
    setOut(await r.json());
    setStep(5);
    markActionDone("Variance", "Analisis de variacion generado.");
    setActionLoading("");
  }

  async function runInsights() {
    if (!datasetId) return;
    setActionLoading("copilot");
    setActionMessage("");
    const r = await fetch("/api/insights/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset_id: datasetId, mode: insightMode, from_month: fromMonth, to_month: toMonth }),
    });
    const j = await r.json();
    setOut(j);
    setAnalysisSummary(j);
    setStep(5);
    markActionDone("Copiloto", "Copiloto generado con exito.");
    setActionLoading("");
  }

  async function runFullAnalysis() {
    if (!datasetId) return;
    await runFullAnalysisFor(datasetId);
  }

  async function runSqlDemo() {
    if (!datasetId) return;
    setActionLoading("sql");
    setActionMessage("");
    const r = await fetch("/api/sql/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset_id: datasetId, sql: "select month, sum(revenue) from facts_sales group by month" }),
    });
    setOut(await r.json());
    markActionDone("SQL demo", "Consulta SQL demo ejecutada.");
    setActionLoading("");
  }

  return (
    <main className={s.root}>
      <div className={s.container}>
        <div className={s.card}>
          <h2 className={s.title}>Metricas Intelligence - Universal Ingest v1</h2>
          <p className={s.sub}>Flujo: subir archivo, perfilar, mapear y analizar.</p>
          <div className={s.wizard} style={{ marginBottom: 10 }}>
            {[
              "1. Upload",
              "2. Perfilado",
              "3. Mapeo",
              "4. Modelo",
              "5. Analisis",
            ].map((x, i) => (
              <div key={x} className={`${s.step} ${step === i + 1 ? s.stepActive : ""}`}>{x}</div>
            ))}
          </div>
          <div className={s.row}>
            <input type="file" accept=".xlsx,.xls,.csv,.tsv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <input value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} placeholder="workspace_id" />
            <button className={s.btnPrimary} onClick={submitUpload} disabled={!file || loading}>{loading ? "Procesando..." : "Subir"}</button>
            {loading ? (
              <span className={s.robotBox}><span className={s.robot}>🤖</span> Robot analitico procesando archivo...</span>
            ) : null}
          </div>
          {error ? <p style={{ color: "#b91c1c", marginTop: 8, marginBottom: 0 }}>Error: {error}</p> : null}
          <div className={s.mono} style={{ marginTop: 8 }}>
            upload_id: {uploadId || "-"} | dataset_id: {datasetId || "-"}
          </div>
          <div className={s.note}>Este flujo carga y redirige automaticamente al dashboard visual con el dataset procesado.</div>
          <div className={s.row} style={{ marginTop: 8 }}>
            <button className={s.btn} onClick={fetchProfile} disabled={!datasetId || !!actionLoading}>Refrescar perfilado</button>
            <button className={s.btnPrimary} onClick={runFullAnalysis} disabled={!datasetId || loading || !!actionLoading}>{actionLoading === "full" ? "Procesando analisis..." : "Generar analisis completo"}</button>
            <button className={s.btn} onClick={() => setShowTechnical((v) => !v)}>{showTechnical ? "Ocultar detalle tecnico" : "Ver detalle tecnico"}</button>
          </div>
          {actionLoading && actionLoading !== "full" ? <p className={s.statusInfo}>Procesando accion: {actionLoading}...</p> : null}
          {actionMessage ? <p className={s.statusOk}>{actionMessage}</p> : null}
          {(lastAction || lastActionAt) ? (
            <div key={actionTick} className={`${s.actionBar} ${s.pulse}`}>
              <span className={s.pill}>Ultima accion: {lastAction || "-"}</span>
              <span className={s.pill}>Hora: {lastActionAt || "-"}</span>
            </div>
          ) : null}
        </div>

        {profile ? (
          <div className={s.card}>
            <h3 style={{ marginTop: 0 }}>Calidad del dataset</h3>
            <div className={s.kpiGrid}>
              <div className={s.kpi}><p className={s.kpiLabel}>Filas</p><p className={s.kpiValue}>{Number(profile.rowCount || 0).toLocaleString("es-CO")}</p></div>
              <div className={s.kpi}><p className={s.kpiLabel}>Columnas</p><p className={s.kpiValue}>{Number(profile.columnCount || 0).toLocaleString("es-CO")}</p></div>
              <div className={s.kpi}><p className={s.kpiLabel}>Fechas validas</p><p className={s.kpiValue}>{Number(profile.validDates || 0).toLocaleString("es-CO")}</p></div>
              <div className={s.kpi}><p className={s.kpiLabel}>Score calidad</p><p className={s.kpiValue}>{Number(profile.qualityScore || 0)}</p></div>
            </div>
          </div>
        ) : null}

        {showTechnical ? (
        <div className={s.grid}>
          <div className={s.card}>
            <h3 style={{ marginTop: 0 }}>Perfilado del dataset</h3>
            {showTechnical ? <pre className={s.mono}>{JSON.stringify(profile || {}, null, 2)}</pre> : <p>Archivo perfilado correctamente. Usa "Generar analisis completo" para ver resultados de negocio.</p>}
          </div>
          <div className={s.card}>
            <h3 style={{ marginTop: 0 }}>Siguientes acciones</h3>
            <div className={s.row}>
              <button className={s.btn} onClick={saveMapping} disabled={!datasetId || !!actionLoading}>{actionLoading === "mapping" ? "Guardando..." : lastAction === "Guardar mapeo" ? "Guardar mapeo ✓" : "Guardar mapeo"}</button>
              <button className={s.btn} onClick={buildModel} disabled={!datasetId || !!actionLoading}>{actionLoading === "build" ? "Construyendo..." : lastAction === "Build model" ? "Build model ✓" : "Build model"}</button>
              <button className={s.btn} onClick={runSqlDemo} disabled={!datasetId || !!actionLoading}>{actionLoading === "sql" ? "Consultando..." : lastAction === "SQL demo" ? "SQL demo ✓" : "SQL demo"}</button>
            </div>
            <div className={s.row} style={{ marginTop: 8 }}>
              <input className={s.input} value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} placeholder="from_month YYYY-MM" />
              <input className={s.input} value={toMonth} onChange={(e) => setToMonth(e.target.value)} placeholder="to_month YYYY-MM" />
              <select className={s.select} value={insightMode} onChange={(e) => setInsightMode(e.target.value)}>
                <option value="ejecutivo">Ejecutivo</option>
                <option value="analista">Analista</option>
                <option value="comercial">Comercial</option>
                <option value="inventario">Inventario</option>
              </select>
              <button className={s.btn} onClick={runVariance} disabled={!datasetId || !!actionLoading}>{actionLoading === "variance" ? "Analizando..." : lastAction === "Variance" ? "Variance ✓" : "Variance"}</button>
              <button className={s.btn} onClick={runInsights} disabled={!datasetId || !!actionLoading}>{actionLoading === "copilot" ? "Generando..." : lastAction === "Copiloto" ? "Copiloto ✓" : "Copiloto"}</button>
            </div>
            {(actionLoading || actionMessage) ? (
              <div className={s.inlineStatus}>
                {actionLoading ? `Procesando: ${actionLoading}...` : actionMessage}
              </div>
            ) : null}
            {showTechnical ? <pre className={s.mono} style={{ marginTop: 10 }}>{JSON.stringify(out || {}, null, 2)}</pre> : null}
          </div>
        </div>
        ) : null}

        {analysisSummary?.executive && showTechnical ? (
          <div className={s.card}>
            <h3 className={s.sectionTitle}>Resultado del analisis</h3>
            <p><strong>Resumen:</strong> {analysisSummary.executive}</p>
            <p><strong>Soporte numerico:</strong> ventas {Number(analysisSummary?.numeric_support?.total_sales || 0).toLocaleString("es-CO")}, ticket {Number(analysisSummary?.numeric_support?.avg_ticket || 0).toLocaleString("es-CO")}</p>
            <p><strong>Acciones:</strong> {Array.isArray(analysisSummary.actions) ? analysisSummary.actions.join(" | ") : "-"}</p>
          </div>
        ) : null}

        {showTechnical ? (
          <div className={s.card}>
            <h3 className={s.sectionTitle}>Paso 3: Mapeo semantico</h3>
            <div className={s.grid}>
              {Object.entries(mappingDraft || {}).map(([k, v]) => (
                <label className={s.field} key={k}>
                  <span>{k}</span>
                  <input className={s.input} value={String(v || "")} onChange={(e) => setMappingDraft((prev) => ({ ...prev, [k]: e.target.value }))} />
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
