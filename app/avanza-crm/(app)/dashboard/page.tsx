const STAGES = [
  {
    title: "Analisis de necesidad",
    amount: "$ 0",
    deals: [
      { name: "Suministro bascula", company: "Prospecto nuevo", value: "$ 0" },
      { name: "Servicio de calibracion", company: "Cliente activo", value: "$ 0" },
    ],
  },
  {
    title: "Estudio",
    amount: "$ 0",
    deals: [
      { name: "Suministro balanza", company: "Laboratorio C&R", value: "$ 0" },
      { name: "Determinador de humedad", company: "Earth Essentials", value: "$ 0" },
    ],
  },
  {
    title: "Cotizacion",
    amount: "$ 0",
    deals: [
      { name: "Servicio metrologico", company: "Fisicoquimica Integral", value: "$ 0" },
      { name: "Suministro equipos", company: "Amtex", value: "$ 0" },
    ],
  },
  {
    title: "Orden de compra",
    amount: "$ 0",
    deals: [
      { name: "Servicio diagnostico", company: "Laboratorios Provet", value: "$ 0" },
      { name: "Suministro electrodos", company: "Merieux", value: "$ 0" },
    ],
  },
  {
    title: "Facturacion",
    amount: "$ 0",
    deals: [
      { name: "Suministro masas patron", company: "Yamit Rivera", value: "$ 0" },
      { name: "Servicio correctivo", company: "Henkel", value: "$ 0" },
    ],
  },
];

export default function AvanzaDashboardPage() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button style={{ background: "#ff7a00", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontWeight: 700 }}>Crear negocio</button>
          <input
            placeholder="Escribe la palabra"
            style={{ minWidth: 240, flex: "1 1 320px", borderRadius: 20, border: "1px solid #d8dee6", padding: "8px 12px" }}
          />
          <div style={{ marginLeft: "auto", color: "#374151", fontWeight: 700 }}>$ 0 | 0 Negocios</div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10, alignItems: "start" }}>
        {STAGES.map((stage) => (
          <section key={stage.title} style={{ background: "#eef1f6", border: "1px solid #d8dee6", borderRadius: 10, padding: 8, display: "grid", gap: 8 }}>
            <header style={{ borderRadius: 8, background: "#e7ebf3", padding: "10px 10px", border: "1px solid #d8dee6" }}>
              <div style={{ fontWeight: 800, color: "#2d3748", fontSize: 14 }}>{stage.title}</div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>{stage.amount}</div>
            </header>

            {stage.deals.map((deal) => (
              <article key={`${stage.title}-${deal.name}`} style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 8, padding: "8px 10px", display: "grid", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 12, color: "#2d3748" }}>{deal.name}</strong>
                  <span style={{ fontSize: 12, color: "#4b5563", whiteSpace: "nowrap" }}>{deal.value}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{deal.company}</div>
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
