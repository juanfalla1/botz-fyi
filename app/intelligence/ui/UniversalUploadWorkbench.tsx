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

  async function submitUpload() {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("workspace_id", workspaceId || "default");
    const r = await fetch("/api/uploads", { method: "POST", body: fd });
    const j = await r.json();
    setLoading(false);
    setUploadId(j.upload_id || "");
    setDatasetId(j.dataset_id || "");
    setProfile(j.profile || null);
    setOut(j);
  }

  async function buildModel() {
    if (!datasetId) return;
    const r = await fetch(`/api/datasets/${datasetId}/build-model`, { method: "POST" });
    setOut(await r.json());
  }

  async function runVariance() {
    if (!datasetId) return;
    const r = await fetch(`/api/analysis/variance?dataset_id=${encodeURIComponent(datasetId)}&dimension=category&from_month=2026-01&to_month=2026-02`);
    setOut(await r.json());
  }

  return (
    <main className={s.root}>
      <div className={s.container}>
        <div className={s.card}>
          <h2 style={{ marginTop: 0 }}>Metricas Intelligence - Universal Ingest v1</h2>
          <p>Flujo: subir archivo, perfilar, mapear y analizar.</p>
          <div className={s.row}>
            <input type="file" accept=".xlsx,.xls,.csv,.tsv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <input value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} placeholder="workspace_id" />
            <button className={s.btnPrimary} onClick={submitUpload} disabled={!file || loading}>{loading ? "Procesando..." : "Subir"}</button>
          </div>
          <div className={s.mono} style={{ marginTop: 8 }}>
            upload_id: {uploadId || "-"} | dataset_id: {datasetId || "-"}
          </div>
        </div>

        <div className={s.grid}>
          <div className={s.card}>
            <h3 style={{ marginTop: 0 }}>Perfil</h3>
            <pre className={s.mono}>{JSON.stringify(profile || {}, null, 2)}</pre>
          </div>
          <div className={s.card}>
            <h3 style={{ marginTop: 0 }}>Acciones</h3>
            <div className={s.row}>
              <button className={s.btn} onClick={buildModel} disabled={!datasetId}>Build model</button>
              <button className={s.btn} onClick={runVariance} disabled={!datasetId}>Variance demo</button>
            </div>
            <pre className={s.mono} style={{ marginTop: 10 }}>{JSON.stringify(out || {}, null, 2)}</pre>
          </div>
        </div>
      </div>
    </main>
  );
}
