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

  useEffect(() => {
    fetch("/demo/leads")
      .then(res => res.json())
      .then(setLeads);
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>Demo Botz</h1>
      <p>Demo activa – mostrando leads en tiempo real</p>

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
