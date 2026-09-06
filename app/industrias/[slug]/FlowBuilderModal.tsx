"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ArrowLeft, ArrowRight, Check, Sparkles, Workflow } from "lucide-react";
import styles from "./flowBuilder.module.css";

type ProcessOption =
  | "Precalificación"
  | "Gestión de documentos"
  | "Solicitudes y expedientes"
  | "Renovaciones"
  | "Seguimiento a clientes"
  | "Onboarding"
  | "Otro";

type ChannelOption =
  | "WhatsApp"
  | "Sitio web"
  | "Email"
  | "Teléfono"
  | "Formulario"
  | "CRM"
  | "Otro";

type AutomationOption =
  | "Recopilar información"
  | "Precalificar solicitudes"
  | "Solicitar documentos"
  | "Validar información"
  | "Enviar recordatorios"
  | "Actualizar CRM"
  | "Asignar un asesor"
  | "Dar seguimiento automático";

const processOptions: ProcessOption[] = [
  "Precalificación",
  "Gestión de documentos",
  "Solicitudes y expedientes",
  "Renovaciones",
  "Seguimiento a clientes",
  "Onboarding",
  "Otro",
];

const channelOptions: ChannelOption[] = [
  "WhatsApp",
  "Sitio web",
  "Email",
  "Teléfono",
  "Formulario",
  "CRM",
  "Otro",
];

const automationOptions: AutomationOption[] = [
  "Recopilar información",
  "Precalificar solicitudes",
  "Solicitar documentos",
  "Validar información",
  "Enviar recordatorios",
  "Actualizar CRM",
  "Asignar un asesor",
  "Dar seguimiento automático",
];

const automationKeywords: Partial<Record<AutomationOption, string>> = {
  "Recopilar información": "Recopilación de información",
  "Precalificar solicitudes": "Precalificación",
  "Solicitar documentos": "Solicitud de documentos",
  "Validar información": "Validación",
  "Enviar recordatorios": "Recordatorios automáticos",
  "Actualizar CRM": "Actualización en CRM",
  "Asignar un asesor": "Asignación de asesor",
  "Dar seguimiento automático": "Seguimiento automático",
};

function buildFlow(
  process: ProcessOption,
  channel: ChannelOption,
  automations: AutomationOption[],
): string[] {
  const steps: string[] = [];

  // 1. Entrada (canal)
  steps.push(channel === "Otro" ? "Canal de entrada" : channel);

  // 2. Motor BOTZ AI (siempre presente, como capa de orquestación)
  steps.push("BOTZ AI");

  // 3. Proceso principal (si no es "Otro")
  if (process !== "Otro") {
    steps.push(process);
  }

  // 4. Automatizaciones seleccionadas, en orden determinístico
  if (automations.length > 0) {
    for (const auto of automationOptions) {
      if (automations.includes(auto)) {
        steps.push(automationKeywords[auto] || auto);
      }
    }
  }

  // 5. Cierre operativo si no se seleccionó un asesor/cierre de forma explícita
  const hasClosing =
    automations.includes("Asignar un asesor") ||
    automations.includes("Dar seguimiento automático");

  if (!hasClosing) {
    steps.push("Asesor");
  }

  return steps;
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function FlowBuilderModal({ open, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [process, setProcess] = useState<ProcessOption | null>(null);
  const [channel, setChannel] = useState<ChannelOption | null>(null);
  const [automations, setAutomations] = useState<AutomationOption[]>([]);

  const canContinue =
    (step === 1 && process !== null) ||
    (step === 2 && channel !== null) ||
    (step === 3 && automations.length > 0);

  const flow = useMemo(
    () =>
      process && channel ? buildFlow(process, channel, automations) : [],
    [process, channel, automations],
  );

  const reset = () => {
    setStep(1);
    setProcess(null);
    setChannel(null);
    setAutomations([]);
  };

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

  if (!open) return null;

  const toggleAutomation = (option: AutomationOption) => {
    setAutomations((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option],
    );
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Diseña tu flujo financiero"
      >
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <header className={styles.header}>
          <span className={styles.headerLogo}>
            <Workflow size={16} /> BOTZ FLOW
          </span>
          <h2>Diseña tu flujo financiero</h2>
          <p>
            Cuéntanos cómo funciona hoy tu operación y BOTZ construirá un flujo
            recomendado.
          </p>
        </header>

        {/* Progreso */}
        <nav className={styles.progress} aria-label="Progreso">
          {[
            { n: 1, label: "Proceso" },
            { n: 2, label: "Entrada" },
            { n: 3, label: "Automatización" },
            { n: 4, label: "Tu flujo" },
          ].map((item) => (
            <div
              key={item.n}
              className={`${styles.progressStep} ${
                step >= item.n ? styles.progressStepActive : ""
              } ${step === item.n ? styles.progressStepCurrent : ""}`}
            >
              <i>{step > item.n ? <Check size={12} /> : item.n}</i>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className={styles.body}>
          {step === 1 && (
            <section>
              <h3>¿Qué proceso quieres mejorar?</h3>
              <div className={styles.grid}>
                {processOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.option} ${
                      process === option ? styles.optionActive : ""
                    }`}
                    onClick={() => setProcess(option)}
                  >
                    {process === option && <Check size={15} />}
                    {option}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h3>¿Dónde comienza normalmente este proceso?</h3>
              <div className={styles.grid}>
                {channelOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.option} ${
                      channel === option ? styles.optionActive : ""
                    }`}
                    onClick={() => setChannel(option)}
                  >
                    {channel === option && <Check size={15} />}
                    {option}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h3>¿Qué parte quieres automatizar?</h3>
              <p className={styles.hint}>
                Selecciona todas las que apliquen.
              </p>
              <div className={styles.grid}>
                {automationOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.option} ${
                      automations.includes(option) ? styles.optionActive : ""
                    }`}
                    onClick={() => toggleAutomation(option)}
                  >
                    {automations.includes(option) && <Check size={15} />}
                    {option}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h3 className={styles.resultTitle}>Flujo BOTZ recomendado</h3>
              <div className={styles.flow}>
                {flow.map((node, index) => (
                  <div key={`${node}-${index}`} className={styles.flowRow}>
                    <span className={styles.flowNode}>
                      {index === 1 ? <Sparkles size={14} /> : null}
                      {node}
                    </span>
                    {index < flow.length - 1 && (
                      <i className={styles.flowArrow}>↓</i>
                    )}
                  </div>
                ))}
              </div>

              <p className={styles.resultNote}>
                Este flujo puede automatizarse con BOTZ.
              </p>

              <div className={styles.resultActions}>
                <button
                  type="button"
                  className={styles.implement}
                  onClick={() => {
                    // Preparado visualmente para una fase futura.
                    // Por ahora no se conecta a backend, CRM ni APIs.
                  }}
                >
                  Quiero implementar este flujo <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className={styles.reset}
                  onClick={reset}
                >
                  Volver a diseñar
                </button>
              </div>
            </section>
          )}
        </div>

        {step < 4 && (
          <footer className={styles.footer}>
            {step > 1 ? (
              <button
                type="button"
                className={styles.back}
                onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)}
              >
                <ArrowLeft size={15} /> Atrás
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              className={styles.next}
              disabled={!canContinue}
              onClick={() => setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4)}
            >
              Continuar <ArrowRight size={15} />
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}