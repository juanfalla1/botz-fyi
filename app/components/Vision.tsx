"use client";
import React from "react";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

const Vision = () => {
  const language = useBotzLanguage("en");
  const isEn = language === "en";

  return <section id="vision">
    <div className="content animate__animated animate__fadeIn">
      <h3>{isEn ? "Capabilities Overview" : "Vision General de Capacidades"}</h3>
      <p>
        {isEn
          ? "botz agents handle tasks currently done by humans using natural language, and notify users only when human intervention is required. They operate with clear guardrails and align with your business rules."
          : "Los agentes de botz manejan tareas actualmente realizadas por humanos usando lenguaje natural y notifican al usuario solo cuando se requiere intervencion humana. Operan bajo condiciones limite, alineandose con tus directrices empresariales."}
      </p>
      <p>
        {isEn
          ? "Our goal is to make agents a productivity catalyst, turning them into true multipliers of organizational efficiency."
          : "Nuestro proposito es que los agentes actuen como catalizadores de productividad, convirtiendose en verdaderos multiplicadores de eficiencia organizacional."}
      </p>
      <h4 style={{ color: "var(--primary)", marginTop: "2em" }}>{isEn ? "Core AI Capabilities" : "Funcionalidades Clave Impulsadas por IA"}</h4>
      <ul>
        <li>
          <strong>{isEn ? "Task Automation:" : "Automatizacion de Tareas:"}</strong> {isEn ? "Intelligent delegation with priorities, categories, predictive ETA and contextual responses." : "Delegacion inteligente con prioridad, categorias, ETA predictivo y respuestas contextuales."}
        </li>
        <li>
          <strong>{isEn ? "Predictive Task Management:" : "Gestion de Tareas Predictiva:"}</strong> {isEn ? "Outcome prediction, optimized timelines and smart resource allocation." : "Prediccion de resultados con cronogramas optimizados y asignacion inteligente de recursos."}
        </li>
        <li>
          <strong>{isEn ? "Workflow Optimization:" : "Optimizacion de Flujos de Trabajo:"}</strong> {isEn ? "Advanced machine learning to reduce errors and operating costs." : "Machine learning avanzado para reducir errores y ahorrar costos operativos."}
        </li>
        <li>
          <strong>{isEn ? "Continuous Learning:" : "Aprendizaje Continuo:"}</strong> {isEn ? "Adaptive design that improves over time without manual reprogramming." : "Diseno adaptativo que mejora con el tiempo sin necesidad de reprogramacion manual."}
        </li>
      </ul>
    </div>
  </section>
};

export default Vision;
