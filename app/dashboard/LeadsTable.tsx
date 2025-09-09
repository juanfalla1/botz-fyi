"use client";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../supabaseClient";
import { CheckCircle, Search, Calendar, Download } from "lucide-react";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  interest?: string;
  status?: string;
  created_at?: string;
  sourceTable?: string; // 👈 agregado para mostrar origen
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
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // 🔎 Filtro texto + fechas
  const filteredLeads = leads.filter((l) => {
    const query = search.toLowerCase();
    const matchesSearch =
      l.name?.toLowerCase().includes(query) ||
      l.email?.toLowerCase().includes(query) ||
      l.phone?.toLowerCase().includes(query) ||
      l.company?.toLowerCase().includes(query) ||
      l.interest?.toLowerCase().includes(query) ||
      l.status?.toLowerCase().includes(query) ||
      l.sourceTable?.toLowerCase().includes(query); // 👈 ahora también busca por origen

    const leadDate = l.created_at ? new Date(l.created_at) : null;
    const matchesDate =
      (!startDate || (leadDate && leadDate >= new Date(startDate))) &&
      (!endDate || (leadDate && leadDate <= new Date(endDate)));

    return matchesSearch && matchesDate;
  });

  // 🚀 Actualizar estado en Supabase (ojo: por ahora solo actualiza en tabla "leads")
  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", id);

    if (!error) {
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
      );
      setUpdatedRow(id);
      setTimeout(() => setUpdatedRow(null), 3000);
    }
  };

  // 📤 Exportar a Excel (solo lo filtrado)
  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredLeads);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, "leads.xlsx");
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 mt-12">
      {/* Header con título y botón de exportar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-xl font-bold text-[#112f46] mb-2 md:mb-0">Gestión de Leads</h2>
        <button
          onClick={exportExcel}
          className="bg-[#10b2cb] text-white px-4 py-2 rounded-lg shadow hover:bg-[#0d8ca3] flex items-center gap-2 self-end md:self-auto"
        >
          <Download size={16} />
          Exportar Excel
        </button>
      </div>

      {/* 🔎 Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar leads..."
            className="border rounded-lg pl-10 pr-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-[#10b2cb]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Fechas */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="date"
              className="border rounded-lg pl-10 pr-3 py-2 w-44 focus:outline-none focus:ring-2 focus:ring-[#10b2cb]"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <span className="text-gray-600">a</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="date"
              className="border rounded-lg pl-10 pr-3 py-2 w-44 focus:outline-none focus:ring-2 focus:ring-[#10b2cb]"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-[#112f46] text-white uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-left">Interés</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Origen</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead, i) => (
                <tr
                  key={i}
                  className={`${
                    i % 2 === 0 ? "bg-gray-50" : "bg-white"
                  } hover:bg-[#10b2cb]/10 transition-colors`}
                >
                  <td className="px-4 py-3 border-t border-gray-200">{lead.name || "-"}</td>
                  <td className="px-4 py-3 border-t border-gray-200">{lead.email || "-"}</td>
                  <td className="px-4 py-3 border-t border-gray-200">{lead.phone || "-"}</td>
                  <td className="px-4 py-3 border-t border-gray-200">{lead.company || "-"}</td>
                  <td className="px-4 py-3 border-t border-gray-200">{lead.interest || "-"}</td>
                  <td className="px-4 py-3 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <select
                        value={lead.status || "new"}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        className="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#10b2cb]"
                      >
                        <option value="new" className="text-blue-600">Nuevo</option>
                        <option value="seguimiento" className="text-yellow-600">En seguimiento</option>
                        <option value="convertido" className="text-green-600">Convertido</option>
                        <option value="atendido" className="text-purple-600">Atendido</option> {/* 👈 agregado */}
                      </select>
                      {updatedRow === lead.id && <CheckCircle className="text-green-500 w-4 h-4" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-t border-gray-200">
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3 border-t border-gray-200">{lead.sourceTable || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-500 border-t border-gray-200">
                  No se encontraron leads que coincidan con los filtros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Contador */}
      <div className="mt-4 text-sm text-gray-600">
        Mostrando {filteredLeads.length} de {leads.length} leads
      </div>
    </div>
  );
}
