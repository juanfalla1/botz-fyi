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
  language: "es" | "en";
};

type Status = "idle" | "sending" | "success" | "error";

const copy = {
  es: {
    close: "Cerrar",
    thanks: "Gracias.",
    received: "Recibimos tu solicitud y te contactaremos pronto.",
    another: "Enviar otra solicitud",
    title: "Cuéntanos qué quieres automatizar",
    defaultSubtitle: "Cuéntanos brevemente cómo funciona hoy tu operación y te mostramos cómo BOTZ puede ayudarte.",
    subtitles: {
      "expediente-financiero": "Cuéntanos qué proceso financiero quieres automatizar.",
      "operacion-comercial": "Cuéntanos qué parte de tu operación comercial quieres escalar.",
      "operaciones-restaurante": "Cuéntanos qué parte de tu operación quieres automatizar.",
      "atencion-y-operaciones": "Cuéntanos qué proceso de atención quieres mejorar.",
      "atencion-y-ventas": "Cuéntanos qué parte de ventas, pedidos o soporte quieres automatizar.",
      "operacion-inmobiliaria": "Cuéntanos qué parte de tu operación inmobiliaria quieres automatizar.",
    },
    name: "Nombre",
    namePlaceholder: "Tu nombre",
    email: "Correo",
    company: "Empresa",
    companyPlaceholder: "Nombre de tu empresa",
    phone: "WhatsApp / Teléfono",
    message: "Qué quieres mejorar o automatizar",
    messagePlaceholder: "Cuéntanos brevemente tu proceso actual…",
    rateLimited: "Demasiados intentos. Intenta más tarde.",
    error: "Hubo un problema al enviar tu solicitud. Intenta nuevamente.",
    sending: "Enviando…",
    submit: "Quiero hablar con BOTZ",
  },
  en: {
    close: "Close",
    thanks: "Thank you.",
    received: "We received your request and will contact you soon.",
    another: "Send another request",
    title: "Tell us what you want to automate",
    defaultSubtitle: "Tell us briefly how your operation works today and we'll show you how BOTZ can help.",
    subtitles: {
      "expediente-financiero": "Tell us which financial process you want to automate.",
      "operacion-comercial": "Tell us which part of your commercial operation you want to scale.",
      "operaciones-restaurante": "Tell us which part of your operation you want to automate.",
      "atencion-y-operaciones": "Tell us which customer care process you want to improve.",
      "atencion-y-ventas": "Tell us which part of sales, orders or support you want to automate.",
      "operacion-inmobiliaria": "Tell us which part of your real estate operation you want to automate.",
    },
    name: "Name",
    namePlaceholder: "Your name",
    email: "Email",
    company: "Company",
    companyPlaceholder: "Your company name",
    phone: "WhatsApp / Phone",
    message: "What do you want to improve or automate?",
    messagePlaceholder: "Briefly describe your current process…",
    rateLimited: "Too many attempts. Please try again later.",
    error: "There was a problem sending your request. Please try again.",
    sending: "Sending…",
    submit: "I want to talk to BOTZ",
  },
} as const;

export default function IndustryContactForm({ open, onClose, context, language }: Props) {
  const t = language === "en" ? copy.en : copy.es;
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
        setError(data?.error === "RATE_LIMITED" ? t.rateLimited : null);
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
        <button type="button" className={styles.close} onClick={onClose} aria-label={t.close}>
          <X size={18} />
        </button>

        {status === "success" ? (
          <div className={styles.successWrap}>
            <CheckCircle2 size={40} className={styles.successIcon} />
            <h2 id="industry-contact-title">{t.thanks}</h2>
            <p>{t.received}</p>
            <button type="button" className={styles.primaryBtn} onClick={reset}>
              {t.another}
            </button>
          </div>
        ) : (
          <>
            <header className={styles.header}>
              <span className={styles.headerBadge}>
                <Sparkles size={13} /> BOTZ
              </span>
              <h2 id="industry-contact-title">{t.title}</h2>
              <p>
                {t.subtitles[context.use_case as keyof typeof t.subtitles] || t.defaultSubtitle}
              </p>
            </header>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="ic-name">{t.name}</label>
                <input
                  id="ic-name"
                  type="text"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  maxLength={120}
                  placeholder={t.namePlaceholder}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="ic-email">{t.email}</label>
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
                <label htmlFor="ic-company">{t.company}</label>
                <input
                  id="ic-company"
                  type="text"
                  value={empresa}
                  onChange={(event) => setEmpresa(event.target.value)}
                  maxLength={160}
                  placeholder={t.companyPlaceholder}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="ic-phone">{t.phone}</label>
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
                <label htmlFor="ic-message">{t.message}</label>
                <textarea
                  id="ic-message"
                  value={mensaje}
                  onChange={(event) => setMensaje(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder={t.messagePlaceholder}
                  required
                />
              </div>

              {status === "error" && (
                <div className={styles.errorBox} role="alert">
                  <AlertCircle size={16} />
                  <span>
                    {error || t.error}
                  </span>
                </div>
              )}

              <button type="submit" className={styles.primaryBtn} disabled={status === "sending"}>
                {status === "sending" ? (
                  <>
                    <span className={styles.spinner} /> {t.sending}
                  </>
                ) : (
                  <>
                    {t.submit} <ArrowRight size={16} />
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
