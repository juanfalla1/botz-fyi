"use client";

import { useEffect, useState } from "react";
import { X, ArrowRight, Send, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import styles from "./industryContactForm.module.css";

type FormContext = {
  industry: string;
  use_case: string;
  source_page: string;
  source_cta: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  context: FormContext;
  subtitle?: string;
};

type Status = "idle" | "sending" | "success" | "error";

export default function IndustryContactForm({ open, onClose, context, subtitle }: Props) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

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

  const reset = () => {
    setNombre("");
    setEmail("");
    setEmpresa("");
    setTelefono("");
    setMensaje("");
    setStatus("idle");
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError(null);

    try {
      const response = await fetch("/api/industries-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          email,
          empresa,
          telefono,
          mensaje,
          industry: context.industry,
          use_case: context.use_case,
          source_page: context.source_page,
          source_cta: context.source_cta,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus("error");
        setError(data?.error === "RATE_LIMITED" ? "Demasiados intentos. Intenta más tarde." : null);
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setError(null);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="industry-contact-title"
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>

        {status === "success" ? (
          <div className={styles.successWrap}>
            <CheckCircle2 size={40} className={styles.successIcon} />
            <h2 id="industry-contact-title">Gracias.</h2>
            <p>Recibimos tu solicitud y te contactaremos pronto.</p>
            <button type="button" className={styles.primaryBtn} onClick={reset}>
              Enviar otra solicitud
            </button>
          </div>
        ) : (
          <>
            <header className={styles.header}>
              <span className={styles.headerBadge}>
                <Sparkles size={13} /> BOTZ
              </span>
              <h2 id="industry-contact-title">Cuéntanos qué quieres automatizar</h2>
              <p>
                {subtitle ||
                  "Cuéntanos brevemente cómo funciona hoy tu operación y te mostramos cómo BOTZ puede ayudarte."}
              </p>
            </header>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="ic-name">Nombre</label>
                <input
                  id="ic-name"
                  type="text"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  maxLength={120}
                  placeholder="Tu nombre"
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="ic-email">Correo</label>
                <input
                  id="ic-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={200}
                  placeholder="tucorreo@empresa.com"
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="ic-company">Empresa</label>
                <input
                  id="ic-company"
                  type="text"
                  value={empresa}
                  onChange={(event) => setEmpresa(event.target.value)}
                  maxLength={160}
                  placeholder="Nombre de tu empresa"
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="ic-phone">WhatsApp / Teléfono</label>
                <input
                  id="ic-phone"
                  type="tel"
                  value={telefono}
                  onChange={(event) => setTelefono(event.target.value)}
                  maxLength={60}
                  placeholder="+57 300 000 0000"
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="ic-message">Qué quieres mejorar o automatizar</label>
                <textarea
                  id="ic-message"
                  value={mensaje}
                  onChange={(event) => setMensaje(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="Cuéntanos brevemente tu proceso actual…"
                  required
                />
              </div>

              {status === "error" && (
                <div className={styles.errorBox} role="alert">
                  <AlertCircle size={16} />
                  <span>
                    {error || "Hubo un problema al enviar tu solicitud. Intenta nuevamente."}
                  </span>
                </div>
              )}

              <button type="submit" className={styles.primaryBtn} disabled={status === "sending"}>
                {status === "sending" ? (
                  <>
                    <span className={styles.spinner} /> Enviando…
                  </>
                ) : (
                  <>
                    Quiero hablar con BOTZ <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}