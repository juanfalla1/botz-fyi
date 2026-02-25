"use client";

import { useEffect, useState } from "react";

type Lead = {
  name: string;
  email: string;
  phone: string;
  status: string;
};

export default function DemoPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingSampleData, setUsingSampleData] = useState(false);

  const sampleLeads: Lead[] = [
    { name: "Ana Torres", email: "ana@ejemplo.com", phone: "+34 611 22 33 44", status: "calificado" },
    { name: "Carlos Vega", email: "carlos@ejemplo.com", phone: "+34 622 44 55 66", status: "en seguimiento" },
    { name: "Laura Mendez", email: "laura@ejemplo.com", phone: "+34 633 88 77 66", status: "nuevo" },
  ];

  useEffect(() => {
    fetch("/demo/leads")
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || "No se pudieron cargar los leads");
        }
        return res.json();
      })
      .then((data: Lead[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          setLeads(sampleLeads);
          setUsingSampleData(true);
          return;
        }
        setLeads(data);
      })
      .catch(() => {
        setLeads(sampleLeads);
        setUsingSampleData(true);
        setError("No se pudieron cargar leads reales. Se muestran datos de ejemplo.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>Demo Botz</h1>
      <p>Demo activa - mostrando leads en tiempo real</p>

      {loading && <p style={{ opacity: 0.75 }}>Cargando leads...</p>}
      {!loading && usingSampleData && (
        <p style={{ marginTop: 8, color: "#93c5fd" }}>
          {error || "No hay leads recientes. Se muestran datos de ejemplo para la demo."}
        </p>
      )}

      <table border={1} cellPadding={8} style={{ marginTop: 20 }}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l, i) => (
            <tr key={i}>
              <td>{l.name}</td>
              <td>{l.email}</td>
              <td>{l.phone}</td>
              <td>{l.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
