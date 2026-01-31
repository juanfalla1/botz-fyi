"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./supabaseClient"; 
import { jsPDF } from "jspdf";
import { 
  X, FileText, User, Phone, Mail, Bot, Calculator, 
  DollarSign, TrendingUp, CheckCircle2, Loader2, Clock, Send, 
  ChevronDown, ChevronUp, Download, Wallet, CreditCard, Calendar,
  AlertTriangle, Save, Building, CheckCircle, Home, Users, FileDown, Share2
} from "lucide-react";
import { Lead } from "./LeadsTable"; 

const N8N_WEBHOOK_URL = "https://n8nio-n8n-latest.onrender.com/webhook/botz-wh-001"; 

interface LeadDetailsDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

type HistoryEvent = {
  id: string;
  type: string;
  text: string;
  created_at: string;
  user_name: string;
};

export default function LeadDetailsDrawer({ lead, isOpen, onClose }: LeadDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<"financial" | "chat" | "info" | "history" | "closing">("financial");
  const [mounted, setMounted] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  
  // --- ESTADOS BITÁCORA ---
  const [noteInput, setNoteInput] = useState("");
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // --- ESTADOS FINANCIEROS COMPLETOS ---
  const [tipoOperacion, setTipoOperacion] = useState("habitual");
  const [modalidadCompra, setModalidadCompra] = useState("solo");
  const [edad, setEdad] = useState("35");
  const [ingresos, setIngresos] = useState("0");
  const [presupuesto, setPresupuesto] = useState("0");
  const [ahorros, setAhorros] = useState("0");
  const [deudas, setDeudas] = useState("0");
  const [tasaInteres, setTasaInteres] = useState("3.5");
  const [plazoAnos, setPlazoAnos] = useState("30");

  // --- ESTADOS DE CIERRE ---
  const [closingStatus, setClosingStatus] = useState("");
  const [closingCommission, setClosingCommission] = useState("");
  const [closingBank, setClosingBank] = useState("");
  const [closingSource, setClosingSource] = useState("");
  const [savingClosing, setSavingClosing] = useState(false);
  const [closingMsg, setClosingMsg] = useState("");

  // --- RESULTADO SIMULACIÓN ---
  const [simResult, setSimResult] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (lead && isOpen) {
      fetchHistory();
      // @ts-ignore
      setTipoOperacion(lead.tipo_operacion || "habitual");
      // @ts-ignore
      setModalidadCompra(lead.modalidad_compra || "solo");
      setEdad(lead.edad ? String(lead.edad) : "35");
      setIngresos(lead.ingresos_netos ? String(lead.ingresos_netos) : "0");
      setPresupuesto(lead.precio_real ? String(lead.precio_real) : "0");
      setAhorros(lead.aportacion_real ? String(lead.aportacion_real) : "0");
      setDeudas(lead.otras_cuotas ? String(lead.otras_cuotas) : "0");
      // @ts-ignore
      setTasaInteres(lead.tasa_interes ? String(lead.tasa_interes) : "3.5");
      // @ts-ignore
      setPlazoAnos(lead.plazo_anos ? String(lead.plazo_anos) : "30");
      
      setClosingStatus(lead.status || "NUEVO");
      // @ts-ignore
      setClosingCommission(lead.commission ? String(lead.commission) : "");
      // @ts-ignore
      setClosingBank(lead.bank || "");
      // @ts-ignore
      setClosingSource(lead.source || "Web");

      setShowDocuments(false);
      setSimResult(null); 
      setPdfUrl(null);
      setClosingMsg("");
      setSaveMsg("");
    }
  }, [lead, isOpen]);

  const fetchHistory = async () => {
    if (!lead) return;
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('lead_logs').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false });
    if (!error && data) setHistory(data);
    setLoadingHistory(false);
  };

  const handleAddNote = async () => {
    if (!noteInput.trim() || !lead) return;
    const { error } = await supabase.from('lead_logs').insert([{
      lead_id: lead.id, type: 'note', text: noteInput, user_name: 'Broker'
    }]);
    if (error) alert("Error"); else { fetchHistory(); setNoteInput(""); }
  };

  // ✅ GUARDAR DATOS FINANCIEROS EN BD
  const handleSaveFinancialData = async () => {
    if (!lead) return;
    setIsSaving(true);
    setSaveMsg("");

    const { error } = await supabase
      .from('leads')
      .update({
        tipo_operacion: tipoOperacion,
        modalidad_compra: modalidadCompra,
        edad: parseInt(edad) || null,
        ingresos_netos: parseFloat(ingresos) || 0,
        precio_real: parseFloat(presupuesto) || 0,
        aportacion_real: parseFloat(ahorros) || 0,
        otras_cuotas: parseFloat(deudas) || 0,
        tasa_interes: parseFloat(tasaInteres) || 3.5,
        plazo_anos: parseInt(plazoAnos) || 30,
      })
      .eq('id', lead.id);

    setIsSaving(false);
    if (error) {
      setSaveMsg("Error");
      console.error(error);
    } else {
      setSaveMsg("✓ Guardado");
      setTimeout(() => setSaveMsg(""), 2000);
    }
  };

  const handleSaveClosing = async () => {
    if (!lead) return;
    setSavingClosing(true);
    setClosingMsg("");

    const { error } = await supabase
      .from('leads')
      .update({
        status: closingStatus,
        commission: closingCommission ? parseFloat(closingCommission) : 0,
        bank: closingBank,
        source: closingSource
      })
      .eq('id', lead.id);

    setSavingClosing(false);
    if (error) {
        setClosingMsg("Error al guardar.");
    } else {
        setClosingMsg("¡Guardado!");
        await supabase.from('lead_logs').insert([{
            lead_id: lead.id, type: 'system', text: `Cierre: ${closingStatus} | €${closingCommission}`, user_name: 'Sistema'
        }]);
        fetchHistory();
        setTimeout(() => setClosingMsg(""), 3000);
    }
  };

  // 🧮 CÁLCULO HIPOTECARIO
  const calculateMortgage = () => {
      const P = Number(String(presupuesto).replace(/\D/g, ""));
      const A = Number(String(ahorros).replace(/\D/g, ""));
      const I = Number(String(ingresos).replace(/\D/g, ""));
      const D = Number(String(deudas).replace(/\D/g, ""));
      
      const tasa = Number(tasaInteres) / 100 / 12; 
      const n = Number(plazoAnos) * 12;
      
      const montoFinanciar = P - A;
      const ltv = P > 0 ? (montoFinanciar / P) * 100 : 0;

      let cuota = 0;
      if (montoFinanciar > 0 && tasa > 0 && n > 0) {
          cuota = (montoFinanciar * tasa) / (1 - Math.pow(1 + tasa, -n));
      }

      const totalDeudas = cuota + D;
      const dti = I > 0 ? (totalDeudas / I) : 0;
      
      return { 
          cuota: Math.round(cuota), 
          dti: dti,
          dtiPercent: Math.round(dti * 100),
          ltv: Math.round(ltv),
          viable: dti <= 0.40 && ltv <= 80,
          financiacion: montoFinanciar,
          precioVivienda: P,
          aportacion: A,
          ingresos: I
      };
  };

  const handleRunSimulation = async () => {
    if(!lead) return;
    setIsSimulating(true);
    setSimResult(null);
    setPdfUrl(null);

    const resultado = calculateMortgage();
    
    setSimResult({
        estado_operacion: resultado.viable ? "VIABLE" : "NO_VIABLE",
        cuota: resultado.cuota,
        dti: resultado.dti,
        dtiPercent: resultado.dtiPercent,
        ltv: resultado.ltv,
        financiacion: resultado.financiacion,
        precioVivienda: resultado.precioVivienda,
        aportacion: resultado.aportacion,
        ingresos: resultado.ingresos
    });

    // Guardar en BD
    await supabase.from('leads').update({
      tipo_operacion: tipoOperacion,
      modalidad_compra: modalidadCompra,
      edad: parseInt(edad) || null,
      ingresos_netos: resultado.ingresos,
      precio_real: resultado.precioVivienda,
      aportacion_real: resultado.aportacion,
      otras_cuotas: parseFloat(deudas) || 0,
      tasa_interes: parseFloat(tasaInteres),
      plazo_anos: parseInt(plazoAnos),
      cuota_estimada: resultado.cuota,
      dti: resultado.dtiPercent,
      ltv: resultado.ltv,
      estado_operacion: resultado.viable ? "VIABLE" : "NO_VIABLE",
      ultimo_estudio_at: new Date().toISOString()
    }).eq('id', lead.id);

    // Log
    await supabase.from('lead_logs').insert([{
        lead_id: lead.id, 
        type: 'system', 
        text: `Estudio: ${resultado.viable ? "✅ VIABLE" : "❌ NO VIABLE"} | Cuota: €${resultado.cuota} | DTI: ${resultado.dtiPercent}% | LTV: ${resultado.ltv}%`, 
        user_name: 'Sistema'
    }]);
    fetchHistory();
    setIsSimulating(false);
  };

  // 📄 GENERAR PDF
  const generatePDF = async () => {
    if (!lead || !simResult) return;
    setGeneratingPdf(true);

    const doc = new jsPDF();
    const isViable = simResult.estado_operacion === "VIABLE";
    const green: [number, number, number] = [16, 185, 129];
    const red: [number, number, number] = [239, 68, 68];
    const primaryColor = isViable ? green : red;
    const fecha = new Date().toLocaleDateString('es-ES');

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("ESTUDIO DE VIABILIDAD PRELIMINAR", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${fecha}`, 105, 32, { align: "center" });

    // Resultado
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(20, 55, 170, 25, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(isViable ? "VIABLE" : "NO VIABLE", 105, 65, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(isViable 
      ? "Segun los datos, la operacion es financiable." 
      : "Con los datos actuales, presenta riesgo.", 
      105, 73, { align: "center" });

    // Datos Cliente
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL PERFIL", 20, 95);
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 98, 95, 98);
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    let y = 105;
    const datosCliente = [
      ["Cliente:", lead.name],
      ["Telefono:", lead.phone || "-"],
      ["Modalidad:", modalidadCompra === "solo" ? "Solo" : "Pareja"],
      ["Tipo:", tipoOperacion === "habitual" ? "Vivienda habitual" : tipoOperacion === "segunda" ? "2a Residencia" : "Inversion"],
      ["Edad:", `${edad} anos`]
    ];
    datosCliente.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(value), 50, y);
      y += 7;
    });

    // Datos Financieros
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("ESTRUCTURA FINANCIERA", 115, 95);
    doc.line(115, 98, 190, 98);
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    y = 105;
    const datosFinancieros = [
      ["Precio:", `${simResult.precioVivienda.toLocaleString()} EUR`],
      ["Aportacion:", `${simResult.aportacion.toLocaleString()} EUR`],
      ["Hipoteca:", `${simResult.financiacion.toLocaleString()} EUR`],
      ["Ingresos:", `${simResult.ingresos.toLocaleString()} EUR/mes`]
    ];
    datosFinancieros.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 115, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, 145, y);
      y += 7;
    });

    // KPIs
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, 145, 55, 30, 2, 2, 'F');
    doc.roundedRect(80, 145, 55, 30, 2, 2, 'F');
    doc.roundedRect(140, 145, 55, 30, 2, 2, 'F');

    // Cuota
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text("CUOTA ESTIMADA", 47, 152, { align: "center" });
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${simResult.cuota.toLocaleString()} EUR/mes`, 47, 167, { align: "center" });

    // DTI
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("TASA ENDEUDAMIENTO", 107, 152, { align: "center" });
    const dtiColor: [number, number, number] = simResult.dtiPercent <= 35 ? green : simResult.dtiPercent <= 40 ? [245, 158, 11] : red;
    doc.setTextColor(dtiColor[0], dtiColor[1], dtiColor[2]);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${simResult.dtiPercent}%`, 107, 167, { align: "center" });

    // LTV
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("FINANCIACION (LTV)", 167, 152, { align: "center" });
    const ltvColor: [number, number, number] = simResult.ltv <= 80 ? green : red;
    doc.setTextColor(ltvColor[0], ltvColor[1], ltvColor[2]);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${simResult.ltv}%`, 167, 167, { align: "center" });

    // Proximos Pasos
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(20, 185, 170, 30, 2, 2, 'S');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Proximos pasos", 25, 195);
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (isViable) {
      doc.text("Un asesor revisara tu caso y te contactara para explorar", 25, 205);
      doc.text("las mejores opciones de financiacion disponibles.", 25, 212);
    } else {
      doc.text("Te recomendamos aumentar la aportacion o reducir deudas.", 25, 205);
      doc.text("Contactanos para revisar alternativas.", 25, 212);
    }

    // Disclaimer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(6);
    doc.text("DISCLAIMER: Estudio preliminar basado en datos facilitados. No representa pre-aprobacion bancaria.", 20, 240);

    // Guardar PDF
    const pdfBlob = doc.output('blob');
    const fileName = `estudio_${lead.id}_${Date.now()}.pdf`;
    
    const { error } = await supabase.storage
      .from('estudios-pdf')
      .upload(fileName, pdfBlob, { contentType: 'application/pdf' });

    if (error) {
      console.error("Error subiendo PDF:", error);
      doc.save(`Estudio_${lead.name.replace(/\s/g, '_')}.pdf`);
    } else {
      const { data: urlData } = supabase.storage.from('estudios-pdf').getPublicUrl(fileName);
      setPdfUrl(urlData.publicUrl);
      
      await supabase.from('estudios_viabilidad').insert([{
        lead_id: lead.id,
        resultado: simResult.estado_operacion,
        cuota_estimada: simResult.cuota,
        dti: simResult.dtiPercent,
        ltv: simResult.ltv,
        pdf_url: urlData.publicUrl,
        datos_snapshot: { nombre: lead.name, telefono: lead.phone, tipo_operacion: tipoOperacion, modalidad_compra: modalidadCompra, edad, ingresos: simResult.ingresos, precio: simResult.precioVivienda, aportacion: simResult.aportacion }
      }]);
    }
    setGeneratingPdf(false);
  };

  // 📱 WHATSAPP
  const sendWhatsApp = () => {
    if (!lead || !pdfUrl) return;
    const mensaje = simResult.estado_operacion === "VIABLE"
      ? `Hola ${lead.name}! Hemos analizado tu hipoteca y tenemos buenas noticias: *tu operacion es viable*.\n\nVe tu estudio aqui:\n${pdfUrl}\n\nQuieres que un asesor te contacte?`
      : `Hola ${lead.name}, hemos analizado tu solicitud. Aunque presenta algunos retos, tenemos opciones.\n\nRevisa tu estudio:\n${pdfUrl}\n\nPodemos agendar una llamada?`;
    
    const url = `https://wa.me/${lead.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const formatCurrency = (val: string | number) => {
    if (!val || val === "0" || val === 0) return "€0";
    const num = typeof val === 'string' ? Number(val.replace(/\D/g, "")) : val;
    return `€${num.toLocaleString()}`;
  };

  if (!mounted || !lead) return null;

  const drawerContent = (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 99999 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", opacity: isOpen ? 1 : 0, transition: "opacity 0.3s", pointerEvents: isOpen ? "auto" : "none" }} />
      <div style={{ position: "absolute", top: 0, right: 0, height: "100%", width: "520px", background: "#0f172a", borderLeft: "1px solid #334155", transform: isOpen ? "translateX(0)" : "translateX(100%)", transition: "transform 0.3s ease", display: "flex", flexDirection: "column", boxShadow: "-10px 0 30px rgba(0,0,0,0.5)" }}>
        
        {/* HEADER */}
        <div style={{ padding: "24px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between" }}>
           <div style={{display: "flex", gap: "15px", alignItems: "center"}}>
             <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "white" }}>{lead.name.charAt(0).toUpperCase()}</div>
             <div>
               <h2 style={{ color: "white", fontSize: "18px", fontWeight: "bold", margin: 0 }}>{lead.name}</h2>
               <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", marginTop: "4px", display: "inline-block" }}>{lead.origen || "WEB"}</span>
             </div>
           </div>
           <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}><X /></button>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", borderBottom: "1px solid #1e293b", padding: "0 10px", overflowX: "auto" }}>
           <button onClick={() => setActiveTab("financial")} style={{ padding: "14px 12px", color: activeTab === "financial" ? "#34d399" : "#64748b", borderBottom: activeTab === "financial" ? "2px solid #34d399" : "2px solid transparent", fontWeight: "bold", cursor: "pointer", display: "flex", gap: "6px", fontSize: "12px", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",}}><Calculator size={14}/> Análisis</button>
           <button onClick={() => setActiveTab("closing")} style={{ padding: "14px 12px", color: activeTab === "closing" ? "#22d3ee" : "#64748b", borderBottom: activeTab === "closing" ? "2px solid #22d3ee" : "2px solid transparent", fontWeight: "bold", cursor: "pointer", display: "flex", gap: "6px", fontSize: "12px", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",}}><DollarSign size={14}/> Cierre</button>
           <button onClick={() => setActiveTab("chat")} style={{ padding: "14px 12px", color: activeTab === "chat" ? "#60a5fa" : "#64748b", borderBottom: activeTab === "chat" ? "2px solid #60a5fa" : "2px solid transparent", fontWeight: "bold", cursor: "pointer", display: "flex", gap: "6px", fontSize: "12px", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",}}><Bot size={14}/> IA Bot</button>
           <button onClick={() => setActiveTab("history")} style={{ padding: "14px 12px", color: activeTab === "history" ? "#fbbf24" : "#64748b", borderBottom: activeTab === "history" ? "2px solid #fbbf24" : "2px solid transparent", fontWeight: "bold", cursor: "pointer", display: "flex", gap: "6px", fontSize: "12px", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",}}><Clock size={14}/> Bitácora</button>
           <button onClick={() => setActiveTab("info")} style={{ padding: "14px 12px", color: activeTab === "info" ? "#c084fc" : "#64748b", borderBottom: activeTab === "info" ? "2px solid #c084fc" : "2px solid transparent", fontWeight: "bold", cursor: "pointer", display: "flex", gap: "6px", fontSize: "12px", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",}}><User size={14}/> Datos</button>
        </div>

        {/* CONTENIDO */}
        <div style={{ flex: 1, padding: "20px", overflowY: "auto", background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)" }}>
           
           {activeTab === "financial" && (
             <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                
                {/* STATUS */}
                <div style={{ 
                  background: lead.estado_operacion === "VIABLE" ? "rgba(16, 185, 129, 0.1)" : lead.estado_operacion === "NO_VIABLE" ? "rgba(239, 68, 68, 0.1)" : "rgba(100, 116, 139, 0.1)", 
                  border: `1px solid ${lead.estado_operacion === "VIABLE" ? "rgba(16, 185, 129, 0.3)" : lead.estado_operacion === "NO_VIABLE" ? "rgba(239, 68, 68, 0.3)" : "rgba(100, 116, 139, 0.3)"}`, 
                  borderRadius: "10px", padding: "14px" 
                }}>
                   <div style={{ display: "flex", alignItems: "center", gap: "8px", color: lead.estado_operacion === "VIABLE" ? "#34d399" : lead.estado_operacion === "NO_VIABLE" ? "#f87171" : "#94a3b8", fontWeight: "bold", fontSize: "11px", textTransform: "uppercase" }}><CheckCircle2 size={14} /> Estado</div>
                   <div style={{ color: "white", fontSize: "18px", fontWeight: "bold", marginTop: "6px" }}>
                      {lead.estado_operacion === "VIABLE" ? "✅ Viable" : lead.estado_operacion === "NO_VIABLE" ? "⚠️ No Viable" : "Pendiente de Estudio"}
                   </div>
                </div>

                {/* TIPO, MODALIDAD, EDAD */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                   <div style={{ background: "#1e293b", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", display: "flex", gap: "4px", marginBottom: "4px" }}><Home size={10}/> Tipo Operación</div>
                      <select value={tipoOperacion} onChange={(e) => setTipoOperacion(e.target.value)} style={{ background: "transparent", border: "none", color: "white", fontWeight: "bold", fontSize: "11px", width: "100%", outline: "none", cursor: "pointer" }}>
                        <option value="habitual" style={{background: "#1e293b"}}>Habitual</option>
                        <option value="segunda" style={{background: "#1e293b"}}>2ª Residencia</option>
                        <option value="inversion" style={{background: "#1e293b"}}>Inversión</option>
                      </select>
                   </div>
                   <div style={{ background: "#1e293b", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", display: "flex", gap: "4px", marginBottom: "4px" }}><Users size={10}/> Modalidad</div>
                      <select value={modalidadCompra} onChange={(e) => setModalidadCompra(e.target.value)} style={{ background: "transparent", border: "none", color: "white", fontWeight: "bold", fontSize: "11px", width: "100%", outline: "none", cursor: "pointer" }}>
                        <option value="solo" style={{background: "#1e293b"}}>Solo/a</option>
                        <option value="pareja" style={{background: "#1e293b"}}>Con pareja</option>
                      </select>
                   </div>
                   <div style={{ background: "#1e293b", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", display: "flex", gap: "4px", marginBottom: "4px" }}><Calendar size={10}/> Edad</div>
                      <input type="number" value={edad} onChange={(e) => setEdad(e.target.value)} style={{ background: "transparent", border: "none", color: "white", fontWeight: "bold", fontSize: "13px", width: "100%", outline: "none" }} />
                   </div>
                </div>
                
                {/* CAMPOS FINANCIEROS */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                   <div style={{ background: "#1e293b", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", display: "flex", gap: "4px", marginBottom: "4px" }}><DollarSign size={10}/> Ingresos Netos (Mes)</div>
                      <input type="text" value={ingresos} onChange={(e) => setIngresos(e.target.value)} style={{ background: "transparent", border: "none", color: "white", fontWeight: "bold", fontSize: "14px", width: "100%", outline: "none" }} />
                      <div style={{ fontSize: "9px", color: "#64748b" }}>{formatCurrency(ingresos)}</div>
                   </div>
                   <div style={{ background: "#1e293b", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", display: "flex", gap: "4px", marginBottom: "4px" }}><TrendingUp size={10}/> Precio Inmueble</div>
                      <input type="text" value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} style={{ background: "transparent", border: "none", color: "white", fontWeight: "bold", fontSize: "14px", width: "100%", outline: "none" }} />
                      <div style={{ fontSize: "9px", color: "#64748b" }}>{formatCurrency(presupuesto)}</div>
                   </div>
                   <div style={{ background: "#1e293b", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", display: "flex", gap: "4px", marginBottom: "4px" }}><Wallet size={10}/> Aportación (Ahorros)</div>
                      <input type="text" value={ahorros} onChange={(e) => setAhorros(e.target.value)} style={{ background: "transparent", border: "none", color: "white", fontWeight: "bold", fontSize: "14px", width: "100%", outline: "none" }} />
                      <div style={{ fontSize: "9px", color: "#64748b" }}>{formatCurrency(ahorros)}</div>
                   </div>
                   <div style={{ background: "#1e293b", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", display: "flex", gap: "4px", marginBottom: "4px" }}><CreditCard size={10}/> Otras Cuotas (Mes)</div>
                      <input type="text" value={deudas} onChange={(e) => setDeudas(e.target.value)} style={{ background: "transparent", border: "none", color: "white", fontWeight: "bold", fontSize: "14px", width: "100%", outline: "none" }} />
                      <div style={{ fontSize: "9px", color: "#64748b" }}>{formatCurrency(deudas)}</div>
                   </div>
                </div>

                {/* TASA Y PLAZO */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                   <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", marginBottom: "4px" }}>Tasa Interés (%)</div>
                      <input type="number" step="0.1" value={tasaInteres} onChange={(e) => setTasaInteres(e.target.value)} style={{ background: "transparent", border: "none", color: "#22d3ee", fontWeight: "bold", fontSize: "13px", width: "100%", outline: "none" }} />
                   </div>
                   <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", marginBottom: "4px" }}>Plazo (Años)</div>
                      <input type="number" value={plazoAnos} onChange={(e) => setPlazoAnos(e.target.value)} style={{ background: "transparent", border: "none", color: "#22d3ee", fontWeight: "bold", fontSize: "13px", width: "100%", outline: "none" }} />
                   </div>
                </div>

                {/* BOTONES */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={handleSaveFinancialData} disabled={isSaving} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #334155", background: "#1e293b", color: "white", fontWeight: "bold", cursor: isSaving ? "wait" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                     {isSaving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14} />} 
                     {saveMsg || "Guardar"}
                  </button>
                  <button onClick={handleRunSimulation} disabled={isSimulating} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: isSimulating ? "#334155" : "#2563eb", color: "white", fontWeight: "bold", cursor: isSimulating ? "wait" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                     {isSimulating ? <Loader2 size={14} className="animate-spin"/> : <Calculator size={14} />} 
                     {isSimulating ? "Calculando..." : "Correr Estudio"}
                  </button>
                </div>

                {/* RESULTADOS */}
                {simResult && (
                    <div style={{ background: simResult.estado_operacion === "VIABLE" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", border: `1px solid ${simResult.estado_operacion === "VIABLE" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`, borderRadius: "10px", padding: "14px" }}>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <h4 style={{ margin: 0, fontSize: "13px", color: simResult.estado_operacion === "VIABLE" ? "#34d399" : "#f87171", display: "flex", alignItems: "center", gap: "6px" }}>
                            {simResult.estado_operacion === "VIABLE" ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
                            {simResult.estado_operacion === "VIABLE" ? "VIABLE" : "NO VIABLE"}
                          </h4>
                        </div>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                            <div style={{ textAlign: "center", background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "8px" }}>
                                <span style={{ display: "block", fontSize: "9px", color: "#94a3b8", marginBottom: "2px" }}>CUOTA</span>
                                <span style={{ fontSize: "16px", fontWeight: "bold", color: "white" }}>€{simResult.cuota.toLocaleString()}</span>
                            </div>
                            <div style={{ textAlign: "center", background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "8px" }}>
                                <span style={{ display: "block", fontSize: "9px", color: "#94a3b8", marginBottom: "2px" }}>DTI</span>
                                <span style={{ fontSize: "16px", fontWeight: "bold", color: simResult.dtiPercent <= 35 ? "#34d399" : simResult.dtiPercent <= 40 ? "#fbbf24" : "#f87171" }}>{simResult.dtiPercent}%</span>
                            </div>
                            <div style={{ textAlign: "center", background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "8px" }}>
                                <span style={{ display: "block", fontSize: "9px", color: "#94a3b8", marginBottom: "2px" }}>LTV</span>
                                <span style={{ fontSize: "16px", fontWeight: "bold", color: simResult.ltv <= 80 ? "#34d399" : "#f87171" }}>{simResult.ltv}%</span>
                            </div>
                        </div>

                        {/* PDF Y WHATSAPP */}
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button onClick={generatePDF} disabled={generatingPdf} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#8b5cf6", color: "white", fontWeight: "bold", cursor: generatingPdf ? "wait" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                             {generatingPdf ? <Loader2 size={14} className="animate-spin"/> : <FileDown size={14} />} 
                             {generatingPdf ? "..." : "Generar PDF"}
                          </button>
                          {pdfUrl && (
                            <button onClick={sendWhatsApp} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#22c55e", color: "white", fontWeight: "bold", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                               <Share2 size={14} /> WhatsApp
                            </button>
                          )}
                        </div>

                        {pdfUrl && (
                          <div style={{ marginTop: "10px", padding: "8px", background: "rgba(139, 92, 246, 0.1)", borderRadius: "6px", fontSize: "10px", color: "#c4b5fd" }}>
                            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#c4b5fd" }}>📄 Ver PDF</a>
                          </div>
                        )}
                    </div>
                )}
             </div>
           )}

           {/* TAB CIERRE */}
           {activeTab === "closing" && (
             <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: "white" }}>
                <div style={{ background: "rgba(34, 211, 238, 0.05)", border: "1px solid rgba(34, 211, 238, 0.2)", padding: "14px", borderRadius: "10px" }}>
                   <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#22d3ee", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "6px" }}><CheckCircle size={16} /> Datos de Cierre</h3>
                   <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>Actualiza cuando el cliente avance.</p>
                </div>

                <div style={{ display: "grid", gap: "12px" }}>
                   <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#cbd5e1", marginBottom: "4px" }}>Estado</label>
                      <select value={closingStatus} onChange={(e) => setClosingStatus(e.target.value)} style={{ width: "100%", padding: "10px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "white", outline: "none", fontSize: "13px" }}>
                         <option value="Nuevo">🔵 Nuevo</option>
                         <option value="Contactado">🟡 Contactado</option>
                         <option value="Documentación">🟠 Documentación</option>
                         <option value="Pre-aprobado">🟣 Pre-aprobado</option>
                         <option value="Firmado">🟢 Firmado</option>
                         <option value="Caída">🔴 Caída</option>
                      </select>
                   </div>
                   <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#cbd5e1", marginBottom: "4px" }}>Comisión (€)</label>
                      <input type="number" placeholder="0" value={closingCommission} onChange={(e) => setClosingCommission(e.target.value)} style={{ width: "100%", padding: "10px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "white", outline: "none", fontSize: "13px" }} />
                   </div>
                   <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#cbd5e1", marginBottom: "4px" }}>Banco</label>
                      <select value={closingBank} onChange={(e) => setClosingBank(e.target.value)} style={{ width: "100%", padding: "10px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "white", outline: "none", fontSize: "13px" }}>
                         <option value="">-- Seleccionar --</option>
                         <option value="Santander">Santander</option>
                         <option value="BBVA">BBVA</option>
                         <option value="CaixaBank">CaixaBank</option>
                         <option value="Sabadell">Sabadell</option>
                         <option value="Bankinter">Bankinter</option>
                         <option value="ING">ING</option>
                         <option value="Otro">Otro</option>
                      </select>
                   </div>
                   <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#cbd5e1", marginBottom: "4px" }}>Fuente</label>
                      <select value={closingSource} onChange={(e) => setClosingSource(e.target.value)} style={{ width: "100%", padding: "10px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "white", outline: "none", fontSize: "13px" }}>
                         <option value="Web">🌐 Web</option>
                         <option value="Meta Ads">∞ Meta Ads</option>
                         <option value="WhatsApp">💬 WhatsApp</option>
                         <option value="Referido">👥 Referido</option>
                         <option value="Google">🔍 Google</option>
                      </select>
                   </div>
                </div>

                <button onClick={handleSaveClosing} disabled={savingClosing} style={{ background: "linear-gradient(90deg, #22d3ee, #0ea5e9)", border: "none", padding: "12px", borderRadius: "8px", color: "#0f172a", fontWeight: "bold", cursor: savingClosing ? "wait" : "pointer", display: "flex", justifyContent: "center", gap: "6px", fontSize: "13px" }}>
                   {savingClosing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                   {savingClosing ? "Guardando..." : "Guardar"}
                </button>

                {closingMsg && <div style={{ padding: "8px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.1)", color: "#34d399", fontSize: "11px", textAlign: "center" }}>{closingMsg}</div>}
             </div>
           )}

           {/* TAB CHAT */}
           {activeTab === "chat" && (
             <div style={{ background: "#1e293b", padding: "14px", borderRadius: "10px", color: "#cbd5e1", fontSize: "13px", lineHeight: "1.6" }}>
                <strong style={{ color: "#60a5fa", display: "block", marginBottom: "6px" }}>Resumen IA:</strong>
                {lead.resumen_chat || "Sin historial de chat."}
             </div>
           )}

           {/* TAB BITÁCORA */}
           {activeTab === "history" && (
             <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
               <div style={{ display: "flex", gap: "8px" }}>
                 <input type="text" placeholder="Escribe una nota..." value={noteInput} onChange={(e) => setNoteInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", padding: "10px", borderRadius: "8px", color: "white", outline: "none", fontSize: "12px" }} />
                 <button onClick={handleAddNote} style={{ background: "#3b82f6", border: "none", padding: "0 12px", borderRadius: "8px", color: "white", cursor: "pointer" }}><Send size={16} /></button>
               </div>
               <div style={{ position: "relative", paddingLeft: "16px", borderLeft: "2px solid #334155", marginLeft: "8px" }}>
                 {loadingHistory && <p style={{color:"#64748b", fontSize:"11px"}}>Cargando...</p>}
                 {!loadingHistory && history.map((item) => (
                   <div key={item.id} style={{ marginBottom: "20px", position: "relative" }}>
                      <div style={{ position: "absolute", left: "-23px", top: "0", width: "10px", height: "10px", borderRadius: "50%", background: item.type === "note" ? "#3b82f6" : "#fbbf24", border: "2px solid #0f172a" }}></div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                         <span style={{ fontSize: "11px", fontWeight: "bold", color: item.type === "note" ? "#60a5fa" : "#cbd5e1" }}>{item.user_name || "Sistema"}</span>
                         <span style={{ fontSize: "9px", color: "#64748b" }}>{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ background: item.type === "note" ? "rgba(59, 130, 246, 0.1)" : "#1e293b", padding: "10px", borderRadius: "6px", fontSize: "12px", color: "#cbd5e1" }}>{item.text}</div>
                   </div>
                 ))}
               </div>
             </div>
           )}

           {/* TAB INFO */}
           {activeTab === "info" && (
             <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px", color: "#cbd5e1", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}><Phone size={14}/> {lead.phone}</div>
                <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px", color: "#cbd5e1", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}><Mail size={14}/> {lead.email}</div>
                <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px", color: "#cbd5e1", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}><User size={14}/> {lead.situacion_laboral || "Sin situación laboral"}</div>
             </div>
           )}
        </div>

        {/* FOOTER */}
        <div style={{ background: "#1e293b", borderTop: "1px solid #334155" }}>
          <button onClick={() => setShowDocuments(!showDocuments)} style={{ width: "100%", background: "transparent", border: "none", padding: "12px", color: "white", fontWeight: "bold", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px" }}>
            <FileText size={14} /> Documentos {showDocuments ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
          </button>
          {showDocuments && (
            <div style={{ padding: "0 16px 16px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", padding: "8px", borderRadius: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ background: "#ef4444", padding: "4px", borderRadius: "4px" }}><FileText size={12} color="white"/></div>
                  <div><div style={{ color: "white", fontSize: "11px", fontWeight: "bold" }}>Viabilidad.pdf</div></div>
                </div>
                <Download size={14} style={{ color: "#94a3b8", cursor: "pointer" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}