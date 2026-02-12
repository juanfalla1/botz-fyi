"use client";

import React, { useEffect, useState } from "react";

interface CRMData {
  stage?: string;
  // CAMBIO: Ahora aceptamos cualquier string para evitar el conflicto de tipos
  priority?: string; 
  owner?: string;
  lastUpdate?: string;
}

interface CRMViewProps {
  crm?: CRMData;
}

type AppLanguage = "es" | "en";

const CRM_TEXT: Record<
  AppLanguage,
  {
    crmStatus: string;
    currentStage: string;
    priority: string;
    owner: string;
    lastUpdate: string;
    pending: string;
    unassigned: string;
  }
> = {
  es: {
    crmStatus: "Estado CRM",
    currentStage: "Etapa Actual",
    priority: "Prioridad",
    owner: "Responsable",
    lastUpdate: "Última actualización",
    pending: "Pendiente",
    unassigned: "Sin asignar",
  },
  en: {
    crmStatus: "CRM Status",
    currentStage: "Current Stage",
    priority: "Priority",
    owner: "Owner",
    lastUpdate: "Last update",
    pending: "Pending",
    unassigned: "Unassigned",
  },
};

export default function CRMView({ crm }: CRMViewProps) {
  const [language, setLanguage] = useState<AppLanguage>("es");
  const t = CRM_TEXT[language];

  useEffect(() => {
    const saved = localStorage.getItem("botz-language");
    if (saved === "es" || saved === "en") {
      setLanguage(saved);
    }

    const onLangChange = (event: Event) => {
      const next = (event as CustomEvent<AppLanguage>).detail;
      if (next === "es" || next === "en") {
        setLanguage(next);
      }
    };

    window.addEventListener("botz-language-change", onLangChange);
    return () => window.removeEventListener("botz-language-change", onLangChange);
  }, []);

  // 🛡️ BLINDAJES
  const stage = crm?.stage ?? t.pending;
  const priority = crm?.priority ?? "MEDIA";
  const owner = crm?.owner ?? t.unassigned;
  const lastUpdate = crm?.lastUpdate ?? "--";

  // LÓGICA DE COLOR (Hacemos el match seguro)
  // Convertimos a mayúsculas por si llega "Alta" en vez de "ALTA"
  const p = priority.toUpperCase();
  
  let priorityColor = "#9ca3af"; // Color por defecto (Gris) para desconocidos
  
  if (p === "ALTA") priorityColor = "#22c55e";      // Verde
  else if (p === "MEDIA") priorityColor = "#facc15"; // Amarillo
  else if (p === "BAJA") priorityColor = "#f87171";  // Rojo (según tu código original)
  // Nota: Tu código original ponía rojo para BAJA y para cualquier otra cosa. 
  // Si prefieres eso, cambia la linea 'let priorityColor' inicial por "#f87171".

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: "20px",
        padding: "20px",
        marginTop: "24px",
      }}
    >
      <h3 style={{ marginBottom: "16px" }}>{t.crmStatus}</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        {/* ETAPA */}
        <div>
          <div style={{ fontSize: "12px", color: "#8b949e" }}>{t.currentStage}</div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              color: "#fff",
            }}
          >
            {stage}
          </div>
        </div>

        {/* PRIORIDAD */}
        <div>
          <div style={{ fontSize: "12px", color: "#8b949e" }}>{t.priority}</div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              color: priorityColor,
            }}
          >
            {priority}
          </div>
        </div>

        {/* RESPONSABLE */}
        <div>
          <div style={{ fontSize: "12px", color: "#8b949e" }}>{t.owner}</div>
          <div style={{ fontSize: "14px", color: "#fff" }}>
            {owner}
          </div>
        </div>

        {/* ÚLTIMA ACTUALIZACIÓN */}
        <div>
          <div style={{ fontSize: "12px", color: "#8b949e" }}>{t.lastUpdate}</div>
          <div style={{ fontSize: "14px", color: "#fff" }}>
            {lastUpdate}
          </div>
        </div>
      </div>
    </div>
  );
}
