import { AvanzaModuleCard } from "../../_components/AvanzaCrmShell";

export default function AvanzaDashboardPage() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <AvanzaModuleCard title="Panel de indicadores" subtitle="Analitica ejecutiva del periodo: desempeno comercial, conversion, tiempos de cierre y proyeccion de ingresos." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
        <AvanzaModuleCard title="Conversion por asesor" subtitle="Top 5 asesores por porcentaje de cierre y valor promedio de negocio." />
        <AvanzaModuleCard title="Tiempo promedio de cierre" subtitle="Dias promedio por etapa comercial y alertas de estancamiento por negocio." />
        <AvanzaModuleCard title="Cumplimiento SLA" subtitle="Cumplimiento de tiempos de respuesta por canal (WhatsApp, correo y llamadas)." />
        <AvanzaModuleCard title="Ingresos proyectados" subtitle="Proyeccion mensual de facturacion con comparativo contra meta comercial." />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10 }}>
        <AvanzaModuleCard title="Embudo del mes" subtitle="Distribucion de negocios por etapa con tasa de avance entre Analisis, Estudio, Cotizacion, Orden de compra y Facturacion." />
        <AvanzaModuleCard title="Alertas de gestion" subtitle="Negocios sin actividad, oportunidades proximas a vencimiento y tareas comerciales pendientes." />
      </div>
    </div>
  );
}
