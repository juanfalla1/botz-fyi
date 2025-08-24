"use client";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../supabaseClient";
import { CheckCircle } from "lucide-react";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  interest?: string;
  status?: string;
  created_at?: string;
};

export default function LeadsTable({
  leads,
  setLeads,
}: {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
}) {
  const [search, setSearch] = useState("");
  const [updatedRow, setUpdatedRow] = useState<string | null>(null);

  const filteredLeads = leads.filter((l) => {
    const query = search.toLowerCase();
    return (
      l.name?.toLowerCase().includes(query) ||
      l.email?.toLowerCase().includes(query) ||
      l.phone?.toLowerCase().includes(query) ||
      l.company?.toLowerCase().includes(query) ||
      l.interest?.toLowerCase().includes(query) ||
      l.status?.toLowerCase().includes(query)
    );
  });

  // 🚀 Actualizar estado en Supabase
  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", id);

    if (!error) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
      setUpdatedRow(id);
      setTimeout(() => setUpdatedRow(null), 3000);
    }
  };

  // 📤 Exportar a Excel
  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredLeads);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, "leads.xlsx");
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 mt-6">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Buscar..."
          className="border rounded-lg px-3 py-2 w-2/3 focus:outline-none focus:ring-2 focus:ring-[#10b2cb]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={exportExcel}
          className="bg-[#10b2cb] text-white px-4 py-2 rounded-lg shadow hover:bg-[#0d8ca3]"
        >
          Exportar Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-lg text-sm">
          <thead className="bg-[#112f46] text-white uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-left">Interés</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead, i) => (
              <tr
                key={i}
                className={`${i % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-[#10b2cb]/10`}
              >
                <td className="px-4 py-2">{lead.name || "-"}</td>
                <td className="px-4 py-2">{lead.email || "-"}</td>
                <td className="px-4 py-2">{lead.phone || "-"}</td>
                <td className="px-4 py-2">{lead.company || "-"}</td>
                <td className="px-4 py-2">{lead.interest || "-"}</td>
                <td className="px-4 py-2 flex items-center gap-2">
                  <select
                    value={lead.status || "new"}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    className="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer"
                  >
                    <option value="new">Nuevo</option>
                    <option value="seguimiento">En seguimiento</option>
                    <option value="convertido">Convertido</option>
                  </select>
                  {updatedRow === lead.id && <CheckCircle className="text-green-500 w-5 h-5" />}
                </td>
                <td className="px-4 py-2">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


