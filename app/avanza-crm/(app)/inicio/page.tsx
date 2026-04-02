import { AvanzaModuleCard } from "../../_components/AvanzaCrmShell";

export default function AvanzaInicioPage() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <AvanzaModuleCard title="Indicadores gerenciales" subtitle="Vista ejecutiva: pipeline, conversion por asesor, valor proyectado y SLA." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
        <AvanzaModuleCard title="Negocios activos" subtitle="0" />
        <AvanzaModuleCard title="En cotizacion" subtitle="0" />
        <AvanzaModuleCard title="Orden de compra" subtitle="0" />
        <AvanzaModuleCard title="Facturacion" subtitle="0" />
      </div>
    </div>
  );
}
