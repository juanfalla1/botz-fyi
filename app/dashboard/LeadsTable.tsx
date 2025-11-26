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
  Bot,
  FileText,    
  UploadCloud, 
  Instagram,   
  Facebook     
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
  origen?: string; 
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
  const [statusFilter, setStatusFilter] = useState<string>("all"); 
  
  // 🔥 ESTADO PARA EL TOOLTIP DINÁMICO: Guarda qué tooltips deben aparecer arriba
  const [tooltipUp, setTooltipUp] = useState<Record<string, boolean>>({}); 

  // --- FUNCIÓN DE DETECCIÓN DE POSICIÓN ---
  const handleTooltipPosition = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, id: string) => {
      // 1. Obtener la posición del elemento (el badge)
      const element = e.currentTarget;
      const rect = element.getBoundingClientRect();
      
      // 2. Definir la altura requerida para el tooltip (ej: 200px)
      const requiredSpace = 200; 
      
      // 3. Comprobar si hay menos espacio ABAJO del requerido
      const isNearBottom = window.innerHeight - rect.bottom < requiredSpace;
      
      // 4. Actualizar el estado (true = mostrar arriba; false = mostrar abajo)
      setTooltipUp(prev => ({ ...prev, [id]: isNearBottom }));
  };

  // --- FUNCIÓN DE PLANTILLA (Excel Real .xlsx) ---
  const downloadTemplate = () => {
    const data = [
      ["Nombre", "Email", "Telefono", "Estado", "Origen", "Notas", "Resumen Bot"], 
      ["Juan Pérez", "juan@ejemplo.com", "5512345678", "nuevo", "instagram", "Interesado", "A-B-C"]
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 15 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");
    XLSX.writeFile(workbook, "plantilla_carga_leads.xlsx");
  };

  // --- FUNCIÓN DE CARGA (Conectada al API Route / Puente) ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", session?.user?.id || ""); 

    try {
      alert("📤 Subiendo archivo y procesando ventas...");
      const response = await fetch("/api/upload-leads", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("✅ Archivo cargado correctamente. Los leads aparecerán en breve.");
        window.location.reload(); 
      } else {
        const errorData = await response.json();
        alert(`❌ Error al procesar: ${errorData.error || "Error desconocido"}`);
      }
    } catch (error) {
      console.error("Error subiendo archivo:", error);
      alert("❌ Error de conexión con el servidor.");
    }
    event.target.value = ""; 
  };

  // --- FILTROS ---
  const filteredLeads = leads.filter((l) => {
    const query = search.toLowerCase();
    
    // FILTRO DE ESTADO GLOBAL
    const matchesStatus = statusFilter === "all" || 
                          (l.status && l.status.toLowerCase() === statusFilter.toLowerCase());

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

    // Se combinan todos los filtros
    return matchesSearch && matchesDate && matchesStatus;
  });

  // --- FUNCIONES DE ACTUALIZACIÓN (El guardado es automático al cambiar el select) ---
  const updateStatus = async (id: string, newStatus: string) => {
    // Evitar guardar si el valor es el placeholder 'nuevo' cuando realmente es nulo
    const statusToSave = newStatus === "nuevo" && !leads.find(l => l.id === id)?.status ? null : newStatus;

    const { error } = await supabase.from("leads").update({ status: statusToSave }).eq("id", id);
    if (error) {
      console.error("Error status:", error);
      alert("❌ No se pudo guardar. Verifica que el lead te pertenezca.");
    } else {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
      triggerUpdateAnimation(id);
    }
  };
  const updateNextAction = async (id: string, newAction: string) => {
    const { error } = await supabase.from("leads").update({ next_action: newAction }).eq("id", id);
    if (error) {
      console.error("Error action:", error);
      alert("❌ No se pudo guardar la acción.");
    } else {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, next_action: newAction } : l)));
      triggerUpdateAnimation(id);
    }
  };
  const updateNote = async (id: string, newNote: string) => {
    const { error } = await supabase.from("leads").update({ notes: newNote }).eq("id", id);
    if (error) {
      console.error("Error nota:", error);
      alert("❌ No se pudo guardar la nota.");
    } else {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, notes: newNote } : l)));
      triggerUpdateAnimation(id);
    }
  };
  const triggerUpdateAnimation = (id: string) => {
      setUpdatedRow(id);
      setTimeout(() => setUpdatedRow(null), 2000);
  }

  // --- HELPERS VISUALES ---
  const openWhatsApp = (phone: string | undefined) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
  };

  const getOriginIcon = (origin: string | undefined) => {
    const o = (origin || "").toLowerCase();
    if (o.includes("whatsapp")) return <MessageCircle size={14} className="text-green-500" />;
    if (o.includes("instagram")) return <Instagram size={14} className="text-pink-500" />;
    if (o.includes("facebook") || o.includes("meta")) return <Facebook size={14} className="text-blue-600" />;
    return <Globe size={14} className="text-gray-400" />;
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
      Origen: lead.origen || "web" 
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, "leads_efiteca.xlsx");
  };

  const getStatusStyles = (status: string | undefined) => {
    const s = (status || "").toLowerCase();
    if (s.includes("nuevo")) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s.includes("seguimiento")) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (s.includes("vendido") || s.includes("convertido")) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s.includes("no_interesado")) return 'bg-gray-100 text-gray-500 border-gray-200'; 
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
      
      <style jsx>{`
        .date-input-force-white {
          color-scheme: light !important;
          background-color: white !important;
          color: #374151 !important; 
        }
        .date-input-force-white::-webkit-calendar-picker-indicator {
          filter: invert(0); 
          cursor: pointer;
        }
        .tooltip-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .tooltip-scroll::-webkit-scrollbar-track {
          background: #333; 
        }
        .tooltip-scroll::-webkit-scrollbar-thumb {
          background: #666; 
          border-radius: 2px;
        }
      `}</style>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
            <h2 className="text-xl font-bold text-[#112f46]">Gestión de Leads</h2>
            <p className="text-gray-500 text-xs mt-0.5">Administra tus oportunidades de venta</p>
        </div>
        
        {/* FILTROS Y BOTONES (Usando filter-wrapper para forzar separación) */}
        <div className="filter-wrapper">
            
            {/* 1. BUSCADOR (filter-input-fix para redondeo) */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#112f46]" size={14} />
                <input
                    type="text"
                    placeholder="Buscar..."
                    className="bg-white border border-gray-300 focus:border-[#112f46] focus:ring-1 focus:ring-[#112f46] rounded-full pl-9 pr-4 py-1.5 w-48 text-xs text-[#112f46] font-semibold outline-none transition-all placeholder-gray-400 shadow-sm filter-input-fix"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* 2. FILTRO GLOBAL DE ESTADO (Restaurado py-1.5 y text-xs) */}
            <div className="relative">
                <select
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 focus:border-[#112f46] focus:ring-1 focus:ring-[#112f46] rounded-full pl-3 pr-8 py-1.5 w-36 text-xs text-[#112f46] font-bold outline-none cursor-pointer shadow-sm transition-all uppercase tracking-wide truncate filter-input-fix"
                    style={selectArrowStyle}
                >
                    <option value="all">⭐ TODOS</option> 
                    <option value="nuevo">🔵 NUEVO</option>
                    <option value="seguimiento">🟡 SEGUIMIENTO</option>
                    <option value="convertido">🟢 CONVERTIDO</option>
                    <option value="no_interesado">⚪ NO INTERESADO</option>
                </select>
            </div>

            {/* 3. FECHAS (Restaurado py-1.5 y font-normal, filter-input-fix para redondeo) */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 shadow-sm overflow-hidden filter-input-fix">
                <Calendar size={14} className="text-gray-500 shrink-0"/>
                <input 
                    type="date" 
                    className="date-input-force-white outline-none text-xs uppercase cursor-pointer bg-transparent text-gray-700 border-none w-24 font-normal" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    style={{ colorScheme: 'light' }}
                />
                <span className="text-gray-300 text-[10px]">|</span>
                <input 
                    type="date" 
                    className="date-input-force-white outline-none text-xs uppercase cursor-pointer bg-transparent text-gray-700 border-none w-24 font-normal" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    style={{ colorScheme: 'light' }}
                />
            </div>

            {/* --- BOTÓN PLANTILLA --- */}
            <button 
                onClick={downloadTemplate} 
                className="flex items-center justify-center gap-2 bg-[#0072C6] hover:bg-[#005a9e] text-white px-5 py-2 rounded-full shadow-md transition-all text-xs font-bold whitespace-nowrap min-w-[110px] hover:scale-105"
                title="Descargar plantilla Excel vacía"
            >
                <FileText size={16} />
                Plantilla
            </button>

            {/* --- BOTÓN CARGAR EXCEL --- */}
            <div className="relative">
              <input 
                type="file" 
                accept=".csv, .xlsx" 
                id="upload-excel" 
                className="hidden" 
                onChange={handleFileUpload}
              />
              <label 
                htmlFor="upload-excel"
                className="flex items-center justify-center gap-2 bg-[#0072C6] hover:bg-[#005a9e] text-white px-5 py-2 rounded-full shadow-md transition-all text-xs font-bold whitespace-nowrap min-w-[110px] cursor-pointer hover:scale-105"
                title="Subir archivo lleno"
              >
                  <UploadCloud size={16} />
                  Cargar
              </label>
            </div>

            {/* --- BOTÓN EXPORTAR --- */}
            <button 
                onClick={exportExcel} 
                className="flex items-center justify-center gap-2 bg-[#0072C6] hover:bg-[#005a9e] text-white px-5 py-2 rounded-full shadow-md transition-all text-xs font-bold whitespace-nowrap min-w-[110px] hover:scale-105"
            >
                <Download size={16} />
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
              {/* ANCHO CORREGIDO */}
              <th className="px-2 py-4 text-left w-[150px]">Próxima Acción</th> 
              {/* ANCHO CORREGIDO */}
              <th className="px-2 py-4 text-left w-[110px]">🤖 Bot / IA</th>     
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
                            // Usamos "nuevo" como fallback consistente
                            value={lead.status || "nuevo"} 
                            onChange={(e) => updateStatus(lead.id, e.target.value)}
                            className={`appearance-none w-full pl-3 pr-6 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer outline-none shadow-sm transition-all uppercase tracking-wide truncate
                            ${getStatusStyles(lead.status)}`}
                            style={selectArrowStyle}
                        >
                            <option value="nuevo">🔵 Nuevo</option>
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
                            <option value="Agendar reunión">🤝 Reunión</option>
                            <option value="Reconfirmar interés">❓ Reconfirmar</option>
                            <option value="Esperando respuesta cliente">⏳ Esperando</option>
                            <option value="Enviar recordatorio">⏰ Recordatorio</option>
                        </select>
                  </td>

                  {/* BOT / IA + TOOLTIP MEJORADO (POSICIÓN DINÁMICA) */}
                  <td className="px-2 py-3 overflow-visible relative">
                     {lead.calificacion ? (
                         <div 
                             className="flex items-center justify-center group"
                             onMouseOver={(e) => handleTooltipPosition(e, lead.id)} // 🔥 Detectar posición
                         >
                            {/* Badge */}
                            <div className={`flex items-center gap-1 px-3 py-1 rounded-full border shadow-sm cursor-help transition-all hover:scale-105 w-full justify-center ${getBotBadgeStyle(lead.calificacion)}`}>
                                <Bot size={14} />
                                <span className="text-[10px] font-black uppercase tracking-wider truncate">
                                    {lead.calificacion}
                                </span>
                            </div>
                            
                            {/* Tooltip con Posicionamiento Condicional */}
                            <div className={`hidden group-hover:block absolute left-1/2 transform -translate-x-1/2 min-w-[320px] w-max max-w-[400px] bg-[#0f172a] text-white p-0 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] z-[9999] border border-slate-600 ${tooltipUp[lead.id] ? 'bottom-[110%]' : 'top-[110%]'}`}>
                                
                                <div className="bg-slate-800 px-4 py-3 rounded-t-xl border-b border-slate-600 flex justify-between items-center">
                                    <span className="font-bold text-xs text-cyan-400 flex items-center gap-2 uppercase tracking-wide">
                                        <Bot size={14} /> Resumen del Chat
                                    </span>
                                </div>
                                <div className="p-4 bg-[#0f172a] rounded-b-xl">
                                    <div className="text-xs font-mono text-gray-200 bg-slate-900/50 px-4 py-3 rounded-lg border border-slate-700/50 w-full text-left shadow-inner leading-relaxed whitespace-pre-wrap">
                                        {lead.resumen_chat || "Sin datos"}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2 italic text-right pr-1">
                                        *Datos capturados vía WhatsApp
                                    </p>
                                </div>
                                
                                {/* Flecha Condicional */}
                                <div className={`absolute left-1/2 transform -translate-x-1/2 border-8 border-transparent ${tooltipUp[lead.id] ? 'top-full border-t-[#0f172a]' : 'bottom-full border-b-[#0f172a]'}`}></div>
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
                            <option value="Cliente no calificado para una solicitud">🔄 No viable</option>
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
                  
                  {/* ORIGEN (Icono Dinámico) */}
                  <td className="px-2 py-3 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1.5" title={lead.origen || "web"}>
                      {getOriginIcon(lead.origen)}
                      <span className="font-medium truncate max-w-[70px] capitalize">
                        {(lead.origen || "web").replace("Bot ", "")}
                      </span> 
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