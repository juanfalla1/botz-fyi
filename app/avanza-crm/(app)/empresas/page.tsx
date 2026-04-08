"use client";

import { useMemo, useState } from "react";

type Company = {
  name: string;
  nit: string;
  assignedTo: string;
  email: string;
  activity: string;
  origin: string;
  country: string;
};

const COMPANIES: Company[] = [
  { name: "Quimicos Oma S A", nit: "8300282135", assignedTo: "Carolina Varon", email: "servicioalcliente@quimicosoma.com", activity: "Quimicos", origin: "Seguimiento", country: "Colombia" },
  { name: "BERHLAN DE COLOMBIA SAS", nit: "9007427719", assignedTo: "Natalia Espinoza", email: "compras@berhlan.com", activity: "Manufactura", origin: "Seguimiento", country: "Colombia" },
  { name: "Alimentos Nutricionales Natural Health S A S", nit: "9001228756", assignedTo: "Carolina Varon", email: "compras@naturalhealth.com", activity: "Alimentos", origin: "Visita", country: "Colombia" },
  { name: "Lacteos el establo", nit: "901260516", assignedTo: "Mariana Rodriguez", email: "comprasmascastillo@gmail.com", activity: "Lacteos", origin: "WhatsApp marketing", country: "Colombia" },
  { name: "LABORATORIOS VETERLAND LTDA", nit: "8000027847", assignedTo: "Carolina Varon", email: "calidad@veterland.co", activity: "Laboratorio", origin: "Seguimiento", country: "Colombia" },
  { name: "IMPORTAREX SAS", nit: "8050316675", assignedTo: "Mariana Rodriguez", email: "info@importarex.com", activity: "Distribucion", origin: "Seguimiento", country: "Colombia" },
  { name: "PRODUCTOS QUIMICOS PANAMERICANOS S.A", nit: "8600421410", assignedTo: "Natalia Espinoza", email: "compras@panamericanos.com", activity: "Quimicos", origin: "Seguimiento", country: "Colombia" },
  { name: "ASEPSIS PRODUCTS DE COLOMBIA SAS", nit: "8605340453", assignedTo: "Carolina Varon", email: "contacto@asepsis.com", activity: "Salud", origin: "Seguimiento", country: "Colombia" },
  { name: "MINA EL CASTILLO S.A.S.", nit: "900926284", assignedTo: "Carmenza Vanegas", email: "compras@minaelcastillo.com", activity: "Mineria", origin: "Seguimiento", country: "Colombia" },
  { name: "INGREDION COLOMBIA S.A.", nit: "8903016903", assignedTo: "Carmenza Vanegas", email: "compras@ingredion.com", activity: "Alimentos", origin: "Visita", country: "Colombia" },
  { name: "COALICA S.A.S.", nit: "9007736863", assignedTo: "Natalia Espinoza", email: "compras@coalica.com", activity: "Industria", origin: "Seguimiento", country: "Colombia" },
  { name: "QUALA SA", nit: "8600744509", assignedTo: "Diana Marcela Rincon", email: "compras@quala.com.co", activity: "Consumo masivo", origin: "Referido", country: "Colombia" },
  { name: "AMTEX S.A.S", nit: "8909041387", assignedTo: "Natalia Espinoza", email: "compras@amtex.com", activity: "Textil", origin: "Seguimiento", country: "Colombia" },
  { name: "FUNGICOL Y CIA. S.A.S.", nit: "811006108", assignedTo: "Carmenza Vanegas", email: "compras@fungicol.com", activity: "Laboratorio", origin: "Seguimiento", country: "Colombia" },
  { name: "MCDPHARMA S.A.S", nit: "9006272218", assignedTo: "Natalia Espinoza", email: "compras@mcdpharma.com", activity: "Farmaceutico", origin: "Seguimiento", country: "Colombia" },
];

export default function AvanzaEmpresasPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Company | null>(null);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return COMPANIES;
    return COMPANIES.filter((c) => `${c.name} ${c.nit} ${c.assignedTo}`.toLowerCase().includes(term));
  }, [query]);

  if (selected) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "270px 1fr 220px", gap: 12 }}>
        <aside style={{ background: "#eef1f6", border: "1px solid #d8dee6", padding: 10, display: "grid", gap: 10, alignContent: "start" }}>
          <button onClick={() => setSelected(null)} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "8px 10px", textAlign: "left", fontWeight: 700, cursor: "pointer" }}>
            Lista de empresas
          </button>
          <div style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "8px 10px", fontWeight: 700 }}>Analisis</div>
          <div style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "8px 10px", fontWeight: 700 }}>MODIFICADO RECIENTEMENTE</div>
          <div style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "8px 10px", fontWeight: 700 }}>GOOGLE MAP</div>
          <div style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "8px 10px", fontWeight: 700 }}>ETIQUETAS</div>
        </aside>

        <section style={{ display: "grid", gap: 10 }}>
          <header style={{ background: "#fff", border: "1px solid #d8dee6", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 26 }}>🏢</span>
            <strong style={{ fontSize: 34 }}>{selected.name}</strong>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button style={{ border: "1px solid #bfc7d2", background: "#fff", borderRadius: 6, padding: "8px 12px" }}>Editar</button>
              <button style={{ border: "1px solid #bfc7d2", background: "#fff", borderRadius: 6, padding: "8px 12px" }}>Enviar correo</button>
              <button style={{ border: "1px solid #bfc7d2", background: "#fff", borderRadius: 6, padding: "8px 12px" }}>Mas</button>
            </div>
          </header>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10 }}>
            <section style={{ background: "#fff", border: "1px solid #d8dee6", padding: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", border: "1px solid #e5e7eb" }}>
                {[
                  ["Empresa", selected.name],
                  ["NIT", selected.nit],
                  ["Actividad del cliente", selected.activity],
                  ["Correo", selected.email],
                  ["Asignado a", selected.assignedTo],
                  ["Origen del cliente", selected.origin],
                  ["Pais", selected.country],
                ].map(([k, v]) => (
                  <>
                    <div key={`${k}-k`} style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb", color: "#6b7280" }}>{k}</div>
                    <div key={`${k}-v`} style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>{v}</div>
                  </>
                ))}
              </div>
            </section>

            <section style={{ display: "grid", gap: 10 }}>
              <div style={{ background: "#fff", border: "1px solid #d8dee6", padding: 12 }}>
                <div style={{ display: "flex", marginBottom: 8 }}><strong>Actividades</strong><button style={{ marginLeft: "auto", border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "4px 10px" }}>Agregar</button></div>
                <div style={{ border: "1px solid #e5e7eb", minHeight: 56, display: "grid", placeItems: "center", color: "#6b7280" }}>Actividades realizadas</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #d8dee6", padding: 12 }}>
                <strong>Actualizaciones</strong>
                <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
                  <div>{selected.assignedTo} actualizado hace 7 meses</div>
                  <div>Ultima modificacion por: {selected.assignedTo}</div>
                  <div>Ciudad: de Bogota para Cota</div>
                </div>
              </div>
            </section>
          </div>

          <section style={{ background: "#fff", border: "1px solid #d8dee6", padding: 12 }}>
            <strong>Comentarios</strong>
            <div style={{ marginTop: 8, border: "1px solid #e5e7eb", padding: 10 }}>
              <textarea placeholder="Agrega tu comentario aqui..." rows={3} style={{ width: "100%", border: "1px solid #d1d5db", padding: 8 }} />
              <div style={{ marginTop: 8, textAlign: "right" }}><button style={{ border: "none", background: "#22b8aa", color: "#fff", borderRadius: 6, padding: "8px 12px" }}>Publicar</button></div>
            </div>
          </section>
        </section>

        <aside style={{ background: "#22b8aa", color: "#fff", padding: 2 }}>
          <div style={{ background: "#fff", color: "#0f766e", padding: 12, display: "grid", gap: 10, fontWeight: 700 }}>
            {[
              "Empresa Resumen",
              "Empresa Detalles",
              "Comentarios",
              "Actualizaciones",
              "Contactos",
              "Negocios",
              "Cotizaciones",
              "Pedidos",
              "Actividades",
              "Correos",
              "Documentos",
              "Casos",
              "Productos",
            ].map((i) => (
              <span key={i}>{i}</span>
            ))}
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <section style={{ background: "#fff", border: "1px solid #d8dee6", padding: 10, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button style={{ border: "1px solid #bfc7d2", background: "#fff", borderRadius: 6, padding: "8px 12px" }}>Acciones</button>
          <button style={{ border: "1px solid #bfc7d2", background: "#fff", borderRadius: 6, padding: "8px 12px", fontWeight: 700 }}>+ Agregar empresa</button>
          <select style={{ marginLeft: "auto", border: "1px solid #bfc7d2", height: 34, minWidth: 240 }}>
            <option>asignado</option>
          </select>
          <div style={{ color: "#111827" }}>1 Para 50</div>
        </div>

        <div style={{ border: "1px solid #d8dee6" }}>
          <div style={{ display: "grid", gridTemplateColumns: "50px 1.4fr 1fr 1fr 140px", background: "#f3f4f6", fontWeight: 700, borderBottom: "1px solid #d8dee6" }}>
            <div style={{ padding: "8px 10px" }}> </div>
            <div style={{ padding: "8px 10px" }}>Empresa</div>
            <div style={{ padding: "8px 10px" }}>NIT</div>
            <div style={{ padding: "8px 10px" }}>Asignado a</div>
            <div style={{ padding: "8px 10px" }}> </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "50px 1.4fr 1fr 1fr 140px", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ padding: "8px 10px" }} />
            <div style={{ padding: "8px 10px" }}><input style={{ width: "100%", border: "1px solid #cbd5e1", padding: "6px 8px" }} /></div>
            <div style={{ padding: "8px 10px" }}><input style={{ width: "100%", border: "1px solid #cbd5e1", padding: "6px 8px" }} /></div>
            <div style={{ padding: "8px 10px" }}><input style={{ width: "100%", border: "1px solid #cbd5e1", padding: "6px 8px" }} /></div>
            <div style={{ padding: "8px 10px" }}><button style={{ border: "1px solid #bfc7d2", background: "#fff", borderRadius: 6, padding: "6px 12px" }}>Buscar</button></div>
          </div>

          {rows.map((row) => (
            <button key={row.nit} onClick={() => setSelected(row)} style={{ width: "100%", textAlign: "left", border: "none", background: "#fff", display: "grid", gridTemplateColumns: "50px 1.4fr 1fr 1fr 140px", borderBottom: "1px solid #e5e7eb", cursor: "pointer" }}>
              <div style={{ padding: "8px 10px" }}>☐</div>
              <div style={{ padding: "8px 10px", color: "#0f766e" }}>{row.name}</div>
              <div style={{ padding: "8px 10px" }}>{row.nit}</div>
              <div style={{ padding: "8px 10px" }}>{row.assignedTo}</div>
              <div style={{ padding: "8px 10px" }} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
