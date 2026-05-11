"use client";

import { useMemo, useState } from "react";

type Contact = {
  name: string;
  phone: string;
  email: string;
  company: string;
  assignedTo: string;
  city: string;
  origin: string;
  status: "Activo" | "Sin gestionar";
  bucket: "gestion" | "automatico";
};

const CONTACTS: Contact[] = [
  {
    name: "Johana Pineda",
    phone: "3004521880",
    email: "johana.pineda@quimicosoma.com",
    company: "Quimicos Oma S A",
    assignedTo: "Carolina Varon",
    city: "Bogota",
    origin: "WhatsApp",
    status: "Activo",
    bucket: "gestion",
  },
  {
    name: "Carlos Mendez",
    phone: "3116482277",
    email: "compras@berhlan.com",
    company: "BERHLAN DE COLOMBIA SAS",
    assignedTo: "Natalia Espinoza",
    city: "Medellin",
    origin: "Seguimiento",
    status: "Activo",
    bucket: "gestion",
  },
  {
    name: "Maria Paula Restrepo",
    phone: "3201458842",
    email: "mp.restrepo@naturalhealth.com",
    company: "Alimentos Nutricionales Natural Health S A S",
    assignedTo: "Carolina Varon",
    city: "Cali",
    origin: "Formulario web",
    status: "Sin gestionar",
    bucket: "gestion",
  },
  {
    name: "Nicolas Zapata",
    phone: "3015510092",
    email: "n.zapata@importarex.com",
    company: "IMPORTAREX SAS",
    assignedTo: "Mariana Rodriguez",
    city: "Barranquilla",
    origin: "Referido",
    status: "Activo",
    bucket: "gestion",
  },
  {
    name: "Paula Rincon",
    phone: "3158881207",
    email: "paula.rincon@quala.com.co",
    company: "QUALA SA",
    assignedTo: "Diana Marcela Rincon",
    city: "Bogota",
    origin: "Seguimiento",
    status: "Activo",
    bucket: "gestion",
  },
  {
    name: "Cliente WhatsApp 1",
    phone: "3200000101",
    email: "",
    company: "",
    assignedTo: "",
    city: "",
    origin: "WhatsApp",
    status: "Sin gestionar",
    bucket: "automatico",
  },
  {
    name: "Cliente WhatsApp 2",
    phone: "3200000102",
    email: "",
    company: "",
    assignedTo: "",
    city: "",
    origin: "WhatsApp",
    status: "Sin gestionar",
    bucket: "automatico",
  },
];

export default function AvanzaContactosPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [bucket, setBucket] = useState<"gestion" | "automatico">("gestion");

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    const scoped = CONTACTS.filter((c) => c.bucket === bucket);
    if (!term) return scoped;
    return scoped.filter((c) => `${c.name} ${c.phone} ${c.email} ${c.company}`.toLowerCase().includes(term));
  }, [bucket, query]);

  if (selected) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr 220px", gap: 12, paddingTop: 8 }}>
        <aside style={{ background: "#eef1f6", border: "1px solid #d8dee6", padding: 10, display: "grid", gap: 10, alignContent: "start" }}>
          <button onClick={() => setSelected(null)} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "8px 10px", textAlign: "left", fontWeight: 700, cursor: "pointer" }}>
            Lista de contactos
          </button>
          <div style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "8px 10px", fontWeight: 700 }}>Resumen</div>
          <div style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "8px 10px", fontWeight: 700 }}>Actividad reciente</div>
          <div style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "8px 10px", fontWeight: 700 }}>Etiquetas</div>
        </aside>

        <section style={{ display: "grid", gap: 10 }}>
          <header style={{ background: "#fff", border: "1px solid #d8dee6", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>👤</span>
            <strong style={{ fontSize: 20, lineHeight: 1.2 }}>{selected.name}</strong>
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
                  ["Nombre y apellido", selected.name],
                  ["Celular", selected.phone],
                  ["Correo", selected.email],
                  ["Empresa", selected.company],
                  ["Asignado a", selected.assignedTo],
                  ["Ciudad", selected.city],
                  ["Origen de contacto", selected.origin],
                  ["Estado", selected.status],
                ].map(([key, value]) => (
                  <div key={String(key)} style={{ display: "contents" }}>
                    <div style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb", color: "#6b7280" }}>{key}</div>
                    <div style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>{value}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ display: "grid", gap: 10 }}>
              <div style={{ background: "#fff", border: "1px solid #d8dee6", padding: 12 }}>
                <div style={{ display: "flex", marginBottom: 8 }}>
                  <strong>Actividades</strong>
                  <button style={{ marginLeft: "auto", border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "4px 10px" }}>Agregar</button>
                </div>
                <div style={{ border: "1px solid #e5e7eb", minHeight: 56, display: "grid", placeItems: "center", color: "#6b7280" }}>Sin actividades registradas</div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #d8dee6", padding: 12 }}>
                <strong>Actualizaciones</strong>
                <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
                  <div>{selected.assignedTo} actualizo este contacto hace 2 dias</div>
                  <div>Ultima actividad: llamada de seguimiento</div>
                  <div>Canal principal: {selected.origin}</div>
                </div>
              </div>
            </section>
          </div>

          <section style={{ background: "#fff", border: "1px solid #d8dee6", padding: 12 }}>
            <strong>Comentarios</strong>
            <div style={{ marginTop: 8, border: "1px solid #e5e7eb", padding: 10 }}>
              <textarea placeholder="Agrega tu comentario aqui..." rows={3} style={{ width: "100%", border: "1px solid #d1d5db", padding: 8 }} />
              <div style={{ marginTop: 8, textAlign: "right" }}>
                <button style={{ border: "none", background: "#22b8aa", color: "#fff", borderRadius: 6, padding: "8px 12px" }}>Publicar</button>
              </div>
            </div>
          </section>
        </section>

        <aside style={{ background: "#22b8aa", color: "#fff", padding: 2 }}>
          <div style={{ background: "#fff", color: "#0f766e", padding: 12, display: "grid", gap: 10, fontWeight: 700 }}>
            {[
              "Contacto Resumen",
              "Contacto Detalles",
              "Comentarios",
              "Actualizaciones",
              "Negocios",
              "Cotizaciones",
              "Actividades",
              "Correos",
              "Documentos",
              "Casos",
              "Productos",
            ].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10, paddingTop: 8 }}>
      <section style={{ background: "#fff", border: "1px solid #d8dee6", padding: 10, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setBucket("gestion")}
            style={{
              border: "1px solid #bfc7d2",
              background: bucket === "gestion" ? "#0f766e" : "#fff",
              color: bucket === "gestion" ? "#fff" : "#111827",
              borderRadius: 18,
              padding: "7px 12px",
              fontWeight: 700,
            }}
          >
            Contactos en gestion
          </button>
          <button
            onClick={() => setBucket("automatico")}
            style={{
              border: "1px solid #bfc7d2",
              background: bucket === "automatico" ? "#0f766e" : "#fff",
              color: bucket === "automatico" ? "#fff" : "#111827",
              borderRadius: 18,
              padding: "7px 12px",
              fontWeight: 700,
            }}
          >
            Contactos automaticos
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button style={{ border: "1px solid #bfc7d2", background: "#fff", borderRadius: 6, padding: "8px 12px" }}>Acciones</button>
          <button style={{ border: "1px solid #bfc7d2", background: "#fff", borderRadius: 6, padding: "8px 12px", fontWeight: 700 }}>+ Agregar contacto</button>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, celular, correo o empresa"
            style={{ marginLeft: "auto", border: "1px solid #bfc7d2", height: 34, minWidth: 280, padding: "0 10px" }}
          />
          <div style={{ color: "#111827" }}>1 Para {rows.length}</div>
        </div>

        <div style={{ border: "1px solid #d8dee6" }}>
          <div style={{ display: "grid", gridTemplateColumns: "50px 1.2fr 1fr 1.2fr 1fr 120px", background: "#f3f4f6", fontWeight: 700, borderBottom: "1px solid #d8dee6" }}>
            <div style={{ padding: "8px 10px" }}> </div>
            <div style={{ padding: "8px 10px" }}>Nombre</div>
            <div style={{ padding: "8px 10px" }}>Celular</div>
            <div style={{ padding: "8px 10px" }}>Correo</div>
            <div style={{ padding: "8px 10px" }}>Asignado a</div>
            <div style={{ padding: "8px 10px" }}>Estado</div>
          </div>

          {rows.map((row) => (
            <button
              key={row.phone}
              onClick={() => setSelected(row)}
              style={{ width: "100%", textAlign: "left", border: "none", background: "#fff", display: "grid", gridTemplateColumns: "50px 1.2fr 1fr 1.2fr 1fr 120px", borderBottom: "1px solid #e5e7eb", cursor: "pointer" }}
            >
              <div style={{ padding: "8px 10px" }}>☐</div>
              <div style={{ padding: "8px 10px", color: "#0f766e" }}>{row.name}</div>
              <div style={{ padding: "8px 10px" }}>{row.phone}</div>
              <div style={{ padding: "8px 10px" }}>{row.email}</div>
              <div style={{ padding: "8px 10px" }}>{row.assignedTo}</div>
              <div style={{ padding: "8px 10px" }}>{row.status}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
