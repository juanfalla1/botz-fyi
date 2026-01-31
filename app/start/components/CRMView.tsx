"use client";

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

export default function CRMView({ crm }: CRMViewProps) {
  // 🛡️ BLINDAJES
  const stage = crm?.stage ?? "Pendiente";
  const priority = crm?.priority ?? "MEDIA";
  const owner = crm?.owner ?? "Sin asignar";
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
      <h3 style={{ marginBottom: "16px" }}>Estado CRM</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        {/* ETAPA */}
        <div>
          <div style={{ fontSize: "12px", color: "#8b949e" }}>
            Etapa Actual
          </div>
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
          <div style={{ fontSize: "12px", color: "#8b949e" }}>
            Prioridad
          </div>
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
          <div style={{ fontSize: "12px", color: "#8b949e" }}>
            Responsable
          </div>
          <div style={{ fontSize: "14px", color: "#fff" }}>
            {owner}
          </div>
        </div>

        {/* ÚLTIMA ACTUALIZACIÓN */}
        <div>
          <div style={{ fontSize: "12px", color: "#8b949e" }}>
            Última actualización
          </div>
          <div style={{ fontSize: "14px", color: "#fff" }}>
            {lastUpdate}
          </div>
        </div>
      </div>
    </div>
  );
}