"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import s from "@/app/metrocas/ui/metrocas-theme.module.css";

const problems = [
  "Las ventas bajan y nadie sabe por que",
  "Exceso de inventario y productos sin rotacion",
  "Clientes que dejan de comprar sin alertas",
  "Decisiones basadas en intuicion",
  "Reportes manuales en Excel",
  "Poca visibilidad de margenes",
  "Sin alertas oportunas",
];

export function MetrocasLanding() {
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState("");

  async function onLeadSubmit(formData: FormData) {
    setSending(true);
    setOk("");
    const body = Object.fromEntries(formData.entries());
    const res = await fetch("/api/metrocas/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setSending(false);
    setOk(res.ok ? "Listo. Te contactaremos con acceso onboarding." : "No se pudo enviar el formulario.");
  }

  return (
    <main className={s.metrocasRoot}>
      <nav className={s.topNav}>
        <div className={`${s.container} ${s.topNavInner}`}>
          <div className={s.brand}>Metricas Intelligence</div>
          <div className={s.navActions}>
            <a href="/start?auth=1" className={s.btnSecondary}>Iniciar sesion</a>
            <a href="/intelligence/upload" className={s.btnSecondary}>Subir mi Excel</a>
            <a href="/intelligence" className={s.btnPrimary}>Entrar al dashboard</a>
          </div>
        </div>
      </nav>

      <section className={`${s.container} ${s.hero}`}>
        <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className={s.title}>
          Entiende por que tus ventas suben o bajan con IA
        </motion.h1>
        <p className={s.subtitle}>
          Metricas analiza ventas, inventario, clientes y productos para detectar oportunidades, riesgos y acciones concretas para mejorar tu negocio.
        </p>
        <div className={s.navActions}>
          <a href="/intelligence" className={s.btnPrimary}>Comenzar analisis</a>
          <a href="/intelligence/upload" className={s.btnSecondary}>Subir mi Excel</a>
        </div>
      </section>

      <section className={`${s.container} ${s.section} ${s.grid2}`}>
        {problems.map((p) => <div key={p} className={s.card}>{p}</div>)}
      </section>

      <section className={`${s.container} ${s.section}`}>
        <h2 className={s.sectionTitle}>Como funciona</h2>
        <ol className={s.grid4}>
          {["Sube tu Excel o CSV", "Metricas limpia y organiza", "Calcula KPIs", "IA explica que pasa", "Dashboard + alertas"].map((step, i) => (
            <li key={step} className={s.card}><strong>{i + 1}.</strong> {step}</li>
          ))}
        </ol>
      </section>

      <section className={`${s.container} ${s.section}`}>
        <h2 className={s.sectionTitle}>Preview del dashboard</h2>
        <div className={s.grid4}>
          {["Ventas totales", "Crecimiento mensual", "Caida por categoria", "Productos estrella", "Sin rotacion", "Clientes en riesgo", "Stock critico", "Recomendaciones IA"].map((k) => (
            <div key={k} className={s.card}>{k}</div>
          ))}
        </div>
      </section>

      <section className={`${s.container} ${s.section}`}>
        <h2 className={s.sectionTitle}>Features principales</h2>
        <div className={s.grid3}>
          {["Analisis de ventas", "Analisis de inventario", "Analisis de clientes", "Analisis de productos", "IA estrategica", "Alertas inteligentes", "Prediccion de demanda", "Recompra", "Liquidacion", "Preparado para Odoo", "Preparado para CRM", "Preparado para WhatsApp"].map((f) => (
            <div key={f} className={s.card}>{f}</div>
          ))}
        </div>
      </section>

      <section className={`${s.container} ${s.section}`}>
        <h2 className={s.sectionTitle}>Ejemplos de insights</h2>
        <div className={s.muted}>
          <p>"Las ventas bajaron 22% por caida en la categoria Equipos Industriales."</p>
          <p>"El producto X tiene alta demanda pero bajo inventario."</p>
          <p>"El cliente Y redujo sus compras en 45%."</p>
          <p>"Se recomienda recompra inmediata del producto B."</p>
        </div>
      </section>

      <section className={`${s.container} ${s.section} ${s.lightSurface}`}>
        <div style={{ padding: 16, borderRadius: 14 }}>
        <h3 className={s.sectionTitle}>Convierte tus datos en decisiones inteligentes</h3>
        <div className={s.navActions}>
          <a href="/intelligence" className={s.btnPrimary}>Analizar mi negocio</a>
          <a href="/intelligence/upload" className={s.btnSecondary}>Subir Excel</a>
        </div>

        <form action={onLeadSubmit} className={s.form} style={{ marginTop: 12 }}>
          {[
            ["name", "Nombre"], ["company", "Empresa"], ["email", "Email"], ["whatsapp", "WhatsApp"],
            ["sector", "Sector"], ["company_size", "Tamano empresa"], ["current_system", "Sistema actual (Excel/Odoo/CRM/Otro)"],
          ].map(([name, label]) => <input key={name} name={name} required={name === "name" || name === "email"} placeholder={label} className={s.input} />)}
          <textarea name="message" placeholder="Mensaje" className={s.textarea} rows={4} />
          <button disabled={sending} className={`${s.btnPrimary} ${s.full}`}>{sending ? "Enviando..." : "Conectar mis datos"}</button>
          {ok ? <p className={`${s.full} ${s.muted}`}>{ok}</p> : null}
        </form>
        </div>
      </section>
    </main>
  );
}
