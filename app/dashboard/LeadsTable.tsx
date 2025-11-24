"use client";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../supabaseClient";
import {
  Search,
  Calendar,
  Download,
  MessageCircle,
  Mail,
  Globe,
  CheckCircle,
  Bot
} from "lucide-react";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status?: string;
  created_at?: string;
  sourceTable?: string;
  notes?: string;
  next_action?: string;
  calificacion?: string;
  etapa?: string;
  resumen_chat?: string;
};

export default function LeadsTable({
  leads,
  setLeads,
  session
}: {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  session: any;
}) {
  const [search, setSearch] = useState("");
  const [updatedRow, setUpdatedRow] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const filteredLeads = leads.filter((l) => {
    const query = search.toLowerCase();
    const matchesSearch =
      (l.name && l.name.toLowerCase().includes(query)) ||
      (l.email && l.email.toLowerCase().includes(query)) ||
      (l.phone && l.phone.toLowerCase().includes(query)) ||
      (l.status && l.status.toLowerCase().includes(query)) ||
      (l.sourceTable && l.sourceTable.toLowerCase().includes(query)) ||
      (l.next_action && l.next_action.toLowerCase().includes(query)) || 
      (l.notes && l.notes.toLowerCase().includes(query)) ||             
      (l.calificacion && l.calificacion.toLowerCase().includes(query)) || 
      (l.resumen_chat && l.resumen_chat.toLowerCase().includes(query));   

    const leadDate = l.created_at ? new Date(l.created_at) : null;
    const matchesDate =
      (!startDate || (leadDate && leadDate >= new Date(startDate))) &&
      (!endDate || (leadDate && leadDate <= new Date(endDate)));

    return matchesSearch && matchesDate;
  });

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", id);
    if (!error) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
      triggerUpdateAnimation(id);
    }
  };
  const updateNextAction = async (id: string, newAction: string) => {
    const { error } = await supabase.from("leads").update({ next_action: newAction }).eq("id", id);
    if (!error) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, next_action: newAction } : l)));
      triggerUpdateAnimation(id);
    }
  };
  const updateNote = async (id: string, newNote: string) => {
    const { error } = await supabase.from("leads").update({ notes: newNote }).eq("id", id);
    if (!error) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, notes: newNote } : l)));
      triggerUpdateAnimation(id);
    }
  };
  const triggerUpdateAnimation = (id: string) => {
      setUpdatedRow(id);
      setTimeout(() => setUpdatedRow(null), 2000);
  }

  const openWhatsApp = (phone: string | undefined) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
  };

  const exportExcel = () => {
    const dataToExport = filteredLeads.map(lead => ({
      Nombre: lead.name,
      Email: lead.email,
      Teléfono: lead.phone,
      Estado: lead.status,
      Accion_Pendiente: lead.next_action || "", 
      Opinion_Bot: lead.calificacion || "",
      Resumen_Bot: lead.resumen_chat || "",
      Calificacion_Manual: lead.notes || "",
      Fecha: lead.created_at ? new Date(lead.created_at).toLocaleDateString('es-ES') : "-",
      Origen: lead.sourceTable || "web"
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, "leads_efiteca.xlsx");
  };

  // Estilos
  const getStatusStyles = (status: string | undefined) => {
    const s = (status || "").toLowerCase();
    if (s.includes("nuevo")) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s.includes("seguimiento")) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (s.includes("vendido") || s.includes("convertido")) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s.includes("atendido")) return 'bg-purple-100 text-purple-700 border-purple-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const getActionStyles = (action: string | undefined) => {
    const a = (action || "").toLowerCase();
    if (a.includes("llamar") || a.includes("urgente")) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (a.includes("whatsapp") || a.includes("email")) return 'bg-sky-100 text-sky-700 border-sky-200';
    if (a.includes("esperando") || a.includes("recordatorio")) return 'bg-slate-100 text-slate-600 border-slate-200';
    if (a.includes("agendar") || a.includes("reunión")) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    return 'bg-gray-50 text-gray-500 border-gray-200'; 
  };

  const getRatingStyles = (note: string | undefined) => {
    const n = (note || "").toLowerCase();
    if (n.includes("caliente") || n.includes("alta")) return 'bg-rose-100 text-rose-700 border-rose-200';
    if (n.includes("interesado")) return 'bg-lime-100 text-lime-700 border-lime-200';
    if (n.includes("pendiente") || n.includes("validar")) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (n.includes("reasignar") || n.includes("revisar")) return 'bg-gray-100 text-gray-600 border-gray-200';
    return 'bg-gray-50 text-gray-500 border-gray-200'; 
  };

  const getBotBadgeStyle = (calif: string | undefined) => {
    const c = (calif || "").toUpperCase();
    if (c.includes("VIP") || c.includes("VIABLE") || c.includes("CALIENTE")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (c.includes("KO") || c.includes("NO")) return "bg-red-100 text-red-800 border-red-200";
    if (c.includes("REVISION") || c.includes("PENDIENTE")) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: `right 0.3rem center`,
    backgroundRepeat: `no-repeat`,
    backgroundSize: `1rem`,
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 mt-8 relative w-full overflow-hidden">
      
      {/* ESTILOS FORZADOS PARA LOS INPUTS DE FECHA */}
      <style jsx>{`
        .date-input-force-white {
          color-scheme: light !important;
          background-color: white !important;
          color: #374151 !important; /* gray-700 */
        }
        .date-input-force-white::-webkit-calendar-picker-indicator {
          filter: invert(0); 
          cursor: pointer;
        }
      `}</style>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
            <h2 className="text-xl font-bold text-[#112f46]">Gestión de Leads</h2>
            <p className="text-gray-500 text-xs mt-0.5">Administra tus oportunidades de venta</p>
        </div>
        
        {/* FILTROS */}
        <div className="flex flex-wrap items-center gap-3">
            
            {/* 1. BUSCADOR */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#112f46]" size={14} />
                <input
                    type="text"
                    placeholder="Buscar..."
                    className="bg-white border border-gray-300 focus:border-[#112f46] focus:ring-1 focus:ring-[#112f46] rounded-full pl-9 pr-4 py-1.5 w-48 text-xs text-[#112f46] font-semibold outline-none transition-all placeholder-gray-400 shadow-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* 2. FECHAS */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-300 shadow-sm overflow-hidden">
                <Calendar size={14} className="text-gray-500 shrink-0"/>
                <input 
                    type="date" 
                    className="date-input-force-white outline-none text-[10px] font-bold uppercase cursor-pointer placeholder-gray-500 bg-transparent border-none w-24" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                />
                <span className="text-gray-300 text-[10px]">|</span>
                <input 
                    type="date" 
                    className="date-input-force-white outline-none text-[10px] font-bold uppercase cursor-pointer placeholder-gray-500 bg-transparent border-none w-24" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                />
            </div>

            {/* 3. BOTÓN EXPORTAR (Color Azul Email: #0072C6) */}
            <button 
                onClick={exportExcel} 
                className="bg-[#0072C6] hover:bg-[#005a9e] text-white px-4 py-1.5 rounded-full shadow-md transition-all flex items-center gap-2 text-xs font-bold transform hover:scale-105"
            >
                <Download size={14} />
                Exportar
            </button>
        </div>
      </div>

      {/* TABLA */}
      <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="bg-[#112f46] text-white uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-2 py-4 text-center w-[70px]">Contactar</th>
              <th className="px-2 py-4 text-left w-[150px]">Nombre</th> 
              <th className="px-2 py-4 text-left w-[150px]">Email</th>
              <th className="px-2 py-4 text-left w-[100px]">Teléfono</th>
              <th className="px-2 py-4 text-left w-[130px]">Estado</th>
              <th className="px-2 py-4 text-left w-[130px]">Próxima Acción</th>
              <th className="px-2 py-4 text-left w-[100px]">🤖 Bot / IA</th>
              <th className="px-2 py-4 text-left w-[130px]">Calificación</th>
              <th className="px-2 py-4 text-left w-[85px]">Fecha</th>
              <th className="px-2 py-4 text-left w-[60px]">Origen</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-100">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead, i) => (
                <tr key={lead.id || i} className="hover:bg-slate-50/50 transition-colors duration-150 align-middle">
                  
                  {/* CONTACTAR */}
                  <td className="px-2 py-3 whitespace-nowrap text-center">
                    <div className="flex justify-center items-center gap-1.5">
                        <button onClick={() => openWhatsApp(lead.phone)} className="bg-[#25D366] hover:bg-[#1ebc57] text-white w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-transform hover:scale-110" title="WhatsApp"><MessageCircle size={15} strokeWidth={2.5} /></button>
                        <a href={`mailto:${lead.email}`} className="bg-[#0072C6] hover:bg-[#005a9e] text-white w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-transform hover:scale-110" title="Email"><Mail size={15} strokeWidth={2.5} /></a>
                    </div>
                  </td>

                  {/* NOMBRE */}
                  <td className="px-2 py-3 font-bold text-gray-800 text-[11px]">
                    <div className="truncate w-full" title={lead.name}>{lead.name || "-"}</div>
                  </td>
                  
                  {/* EMAIL */}
                  <td className="px-2 py-3 text-gray-600 text-[11px]">
                    <div className="truncate w-full" title={lead.email}>{lead.email}</div>
                  </td>
                  
                  {/* TELEFONO */}
                  <td className="px-2 py-3 text-gray-600 font-mono text-[11px] whitespace-nowrap">
                    {lead.phone}
                  </td>
                  
                  {/* ESTADO */}
                  <td className="px-2 py-3">
                        <select
                            value={lead.status || "new"}
                            onChange={(e) => updateStatus(lead.id, e.target.value)}
                            className={`appearance-none w-full pl-3 pr-6 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer outline-none shadow-sm transition-all uppercase tracking-wide truncate
                            ${getStatusStyles(lead.status)}`}
                            style={selectArrowStyle}
                        >
                            <option value="new">🔵 Nuevo</option>
                            <option value="seguimiento">🟡 Seguimiento</option>
                            <option value="convertido">🟢 Convertido</option>
                            <option value="no_interesado">⚪ No Interesado</option>
                        </select>
                  </td>

                  {/* PRÓXIMA ACCIÓN */}
                  <td className="px-2 py-3">
                        <select 
                            value={lead.next_action || ""}
                            onChange={(e) => updateNextAction(lead.id, e.target.value)}
                            className={`appearance-none w-full pl-3 pr-6 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer outline-none shadow-sm transition-all uppercase tracking-wide truncate
                            ${getActionStyles(lead.next_action)}`}
                            style={selectArrowStyle}
                        >
                            <option value="">-- Acción --</option>
                            <option value="Llamar hoy">📞 Llamar hoy</option>
                            <option value="Llamar esta semana">📅 Llamar sem.</option>
                            <option value="Enviar WhatsApp">💬 WhatsApp</option>
                            <option value="Responder email">📧 Email</option>
                            <option value="Enviar propuesta">📄 Propuesta</option>
                            <option value="Enviar demo / video">🎥 Demo/Video</option>
                            <option value="Agendar reunión">🤝 Reunión</option>
                            <option value="Reconfirmar interés">❓ Reconfirmar</option>
                            <option value="Esperando respuesta cliente">⏳ Esperando</option>
                            <option value="Enviar recordatorio">⏰ Recordatorio</option>
                        </select>
                  </td>

                  {/* BOT / IA */}
                  <td className="px-2 py-3">
                     {lead.calificacion ? (
                         <div className="flex items-center justify-center">
                            <div 
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-sm cursor-help transition-transform hover:scale-105 w-full justify-center ${getBotBadgeStyle(lead.calificacion)}`}
                                title={`Resumen IA: ${lead.resumen_chat || "Sin resumen disponible"}`}
                            >
                                <Bot size={13} />
                                <span className="text-[10px] font-extrabold uppercase tracking-wider truncate">
                                    {lead.calificacion}
                                </span>
                            </div>
                         </div>
                     ) : (
                         <div className="text-center text-gray-300 text-[10px]">-</div>
                     )}
                  </td>

                  {/* CALIFICACIÓN */}
                  <td className="px-2 py-3 relative">
                        <select 
                            value={lead.notes || ""}
                            onChange={(e) => updateNote(lead.id, e.target.value)}
                            className={`appearance-none w-full pl-3 pr-6 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer outline-none shadow-sm transition-all uppercase tracking-wide truncate
                            ${getRatingStyles(lead.notes)}`}
                            style={selectArrowStyle}
                        >
                            <option value="">-- Calif. --</option>
                            <option value="Lead caliente (prioridad alta)">🔥 Caliente</option>
                            <option value="Interesado, revisar condiciones">🧐 Interesado</option>
                            <option value="Pendiente validación de datos">📝 Validar</option>
                            <option value="Pendiente documentación">📂 Docs</option>
                            <option value="Revisar con comercial">💼 Revisar</option>
                            <option value="Reasignar a otro asesor">🔄 Reasignar</option>
                        </select>

                        {updatedRow === lead.id && (
                             <span className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
                                <CheckCircle className="text-emerald-500 w-3 h-3 animate-pulse" />
                             </span>
                        )}
                  </td>

                  {/* FECHA */}
                  <td className="px-2 py-3 text-[11px] text-gray-500 whitespace-nowrap">
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString('es-ES') : "-"}
                  </td>
                  
                  {/* ORIGEN */}
                  <td className="px-2 py-3 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1">
                      <Globe size={11} className="text-gray-400"/>
                      <span className="font-medium truncate max-w-[50px]">{lead.sourceTable || "web"}</span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-6 py-16 text-center text-gray-500 bg-gray-50/50">
                  <div className="flex flex-col items-center justify-center">
                    <Search size={32} className="text-gray-300 mb-3" />
                    <p className="font-medium text-gray-900">No hay resultados</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CONTADOR */}
      <div className="mt-4 flex justify-between items-center px-2 text-xs text-gray-500">
         <span>Total: <strong>{leads.length}</strong> leads</span>
         <span>Mostrando <strong>{filteredLeads.length}</strong></span>
      </div>
    </div>
  );
}