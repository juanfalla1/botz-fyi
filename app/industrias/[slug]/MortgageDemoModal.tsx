"use client";

import { useEffect, useReducer, useRef } from "react";
import {
  X,
  RotateCw,
  ArrowRight,
  FileText,
  AlertTriangle,
  Clock,
} from "lucide-react";
import styles from "./mortgageDemo.module.css";

type StepId =
  | "received"
  | "identity"
  | "extract"
  | "income"
  | "bank"
  | "compare"
  | "exception"
  | "missing"
  | "request"
  | "update"
  | "summary";

const timeline: Array<{ id: StepId; at: number; label: string; status: "done" | "exception" }> = [
  { id: "received", at: 0, label: "Expediente recibido", status: "done" },
  { id: "identity", at: 2, label: "Identidad analizada", status: "done" },
  { id: "extract", at: 4, label: "Datos extraídos", status: "done" },
  { id: "income", at: 7, label: "Ingresos analizados", status: "done" },
  { id: "bank", at: 10, label: "Estados bancarios analizados", status: "done" },
  { id: "compare", at: 13, label: "Información comparada", status: "done" },
  { id: "exception", at: 16, label: "Excepción detectada", status: "exception" },
  { id: "missing", at: 20, label: "Documento faltante identificado", status: "done" },
  { id: "request", at: 23, label: "Solicitud preparada", status: "done" },
  { id: "update", at: 26, label: "Expediente actualizado", status: "done" },
  { id: "summary", at: 29, label: "Resumen preparado", status: "done" },
];

const processingSteps: Array<{ id: string; after: StepId; label: string; exception?: boolean }> = [
  { id: "ident", after: "identity", label: "Analizando identificación…" },
  { id: "paystub", after: "extract", label: "Extrayendo datos del paystub…" },
  { id: "income", after: "income", label: "Verificando ingresos…" },
  { id: "bank", after: "bank", label: "Analizando estados bancarios…" },
  { id: "compare", after: "compare", label: "Comparando información…" },
  { id: "review", after: "exception", label: "Revisando documentación…" },
  { id: "req", after: "request", label: "Generando solicitud de documento…" },
  { id: "update", after: "update", label: "Actualizando expediente…" },
  { id: "summary", after: "summary", label: "Preparando resumen para asesor…" },
];

const documents: Array<{ label: string; pending?: boolean }> = [
  { label: "Identificación oficial" },
  { label: "Comprobante de ingresos" },
  { label: "Estados bancarios" },
  { label: "Declaración de impuestos" },
  { label: "Carta de empleo" },
  { label: "Comprobante de enganche" },
  { label: "Estado de cuenta reciente", pending: true },
];

const verificationChecks: Array<{ id: string; doneAfter: StepId; label: string; exception?: boolean; exceptionAfter?: StepId }> = [
  { id: "identity", doneAfter: "identity", label: "Identidad verificada" },
  { id: "income", doneAfter: "income", label: "Ingresos analizados" },
  { id: "assets", doneAfter: "bank", label: "Activos analizados" },
  { id: "docs", doneAfter: "compare", label: "Documentación revisada" },
  { id: "missing", doneAfter: "missing", label: "1 documento pendiente", exception: true, exceptionAfter: "missing" },
  { id: "exception", doneAfter: "exception", label: "1 excepción para revisión", exception: true, exceptionAfter: "exception" },
];

type Phase = "idle" | "running" | "exception" | "done";

type State = {
  phase: Phase;
  currentStep: StepId;
  progress: number;
};

type Action =
  | { type: "TICK"; step: StepId }
  | { type: "FINISH" }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "TICK": {
      const idx = timeline.findIndex((t) => t.id === action.step);
      const doneCount = idx + 1;
      const progress = Math.round((doneCount / timeline.length) * 92);
      const isException = timeline[idx]?.status === "exception";
      return {
        phase: isException ? "exception" : "running",
        currentStep: action.step,
        progress: Math.min(92, progress),
      };
    }
    case "FINISH":
      return { phase: "done", currentStep: "summary", progress: 92 };
    case "RESET":
      return { phase: "running", currentStep: "received", progress: 0 };
    default:
      return state;
  }
}

export default function MortgageDemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, dispatch] = useReducer(reducer, {
    phase: "idle",
    currentStep: "received",
    progress: 0,
  });
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    if (!open) return;

    const timers: Array<ReturnType<typeof setTimeout>> = [];

    for (const item of timeline) {
      timers.push(
        setTimeout(() => {
          dispatch({ type: "TICK", step: item.id });
        }, item.at * 1000),
      );
    }

    timers.push(
      setTimeout(() => {
        dispatch({ type: "FINISH" });
      }, 32000),
    );

    timersRef.current = timers;

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timersRef.current = [];
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      dispatch({ type: "RESET" });
    }
  }, [open]);

  if (!open) return null;

  const completedIds = new Set<StepId>();
  const currentIdx = timeline.findIndex((t) => t.id === state.currentStep);
  for (let i = 0; i <= currentIdx; i++) {
    completedIds.add(timeline[i].id);
  }

  const isDocPending = completedIds.has("missing");
  const showException = completedIds.has("exception");

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mortgage-demo-title"
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>

        <header className={styles.header}>
          <span className={styles.headerBadge}>
            <span className={styles.pulse} /> BOTZ en acción
          </span>
          <h2 id="mortgage-demo-title">BOTZ en acción</h2>
          <p>Mira cómo BOTZ procesa un expediente hipotecario de principio a fin.</p>
          <em>Demostración con datos ficticios</em>
        </header>

        <div className={styles.columns}>
          {/* COLUMNA 1 — DOCUMENTOS */}
          <section className={styles.column} aria-label="Documentos recibidos">
            <h3>Documentos recibidos</h3>
            <ul className={styles.documents}>
              {documents.map((doc) => (
                <li
                  key={doc.label}
                  className={doc.pending ? styles.docPending : ""}
                >
                  <span className={styles.docIcon}>
                    {doc.pending ? <Clock size={14} /> : <FileText size={14} />}
                  </span>
                  <span className={styles.docLabel}>
                    {doc.pending ? "○" : "✓"} {doc.label}
                    {doc.pending ? " — Pendiente" : ""}
                  </span>
                </li>
              ))}
            </ul>
            <div className={styles.docCount}>
              <span>6/7</span> documentos recibidos
            </div>
          </section>

          {/* COLUMNA 2 — PROCESANDO */}
          <section className={styles.column} aria-label="BOTZ procesando expediente">
            <h3>BOTZ procesando expediente</h3>
            <ol className={styles.processing}>
              {processingSteps.map((step) => {
                const done = completedIds.has(step.after);
                return (
                  <li
                    key={step.id}
                    className={`${done ? styles.done : ""} ${
                      step.after === state.currentStep && !done ? styles.active : ""
                    }`}
                  >
                    <span className={styles.processingMark}>
                      {done ? "✓" : <span className={styles.spinner} />}
                    </span>
                    {step.label}
                  </li>
                );
              })}
            </ol>

            {showException && (
              <div className={styles.exception} role="status">
                <AlertTriangle size={15} />
                <div>
                  <strong>Inconsistencia detectada</strong>
                  <p>El ingreso del último comprobante no coincide con el ingreso declarado.</p>
                </div>
              </div>
            )}
          </section>

          {/* COLUMNA 3 — EXPEDIENTE */}
          <section className={styles.column} aria-label="Expediente">
            <h3>Expediente #BOTZ-2841</h3>
            <dl className={styles.fileData}>
              <div><dt>Tipo</dt><dd>Hipoteca residencial</dd></div>
              <div><dt>Propiedad</dt><dd>$620,000</dd></div>
              <div><dt>Enganche</dt><dd>$125,000</dd></div>
              <div><dt>Ingreso declarado</dt><dd>$118,000</dd></div>
              <div><dt>DTI estimado</dt><dd>36%</dd></div>
              <div><dt>LTV estimado</dt><dd>78%</dd></div>
            </dl>

            <div className={styles.verification}>
              <h4>Resumen de verificación</h4>
              <div className={styles.progressBar}>
                <i style={{ "--demo-progress": `${state.progress}%` } as React.CSSProperties} />
              </div>
              <ul>
                {verificationChecks.map((check) => {
                  const done = completedIds.has(check.doneAfter);
                  const isException = check.exception && done;
                  return (
                    <li key={check.id} className={isException ? styles.except : done ? styles.ok : ""}>
                      <span>{done ? (check.exception ? "⚠" : "✓") : "•"}</span>
                      {check.label}
                    </li>
                  );
                })}
              </ul>
            </div>

            {state.phase === "done" ? (
              <div className={styles.result}>
                <strong className={styles.score}>92%</strong>
                <span>Expediente listo para revisión</span>
                <p>BOTZ completó 17 verificaciones y dejó solo 1 elemento para revisión humana.</p>
                <div className={styles.actions}>
                  <button type="button" className={styles.primary} onClick={() => dispatch({ type: "RESET" })}>
                    <RotateCw size={15} /> Repetir demo
                  </button>
                  <a className={styles.secondary} href="/#contacto">
                    Quiero automatizar este proceso <ArrowRight size={15} />
                  </a>
                </div>
              </div>
            ) : (
              <div className={styles.pendingState}>
                <span className={styles.spinnerLarge} />
                <span>Procesando expediente…</span>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}