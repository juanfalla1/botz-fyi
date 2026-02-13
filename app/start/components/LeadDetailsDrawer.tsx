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

type AppLanguage = "es" | "en";

const DRAWER_TEXT: Record<
  AppLanguage,
  {
    tabAnalysis: string;
    tabClosing: string;
    tabBot: string;
    tabLog: string;
    tabData: string;
    save: string;
    saving: string;
    calculating: string;
    runStudy: string;
    closingTitle: string;
    closingSubtitle: string;
    aiSummary: string;
    noChatHistory: string;
    writeNote: string;
    loading: string;
    system: string;
    createTask: string;
    viable: string;
    notViable: string;
    generatePdf: string;
    viewPdf: string;
    whatsapp: string;
    statusNew: string;
    statusContacted: string;
    statusDocs: string;
    statusPreApproved: string;
    statusSigned: string;
    statusDropped: string;
    noWorkSituation: string;

    statusLabel: string;
    statusViableLabel: string;
    statusNotViableLabel: string;
    statusPendingStudy: string;

    operationType: string;
    operationHabitual: string;
    operationSecondResidence: string;
    operationInvestment: string;
    modality: string;
    modalitySolo: string;
    modalityCouple: string;
    age: string;

    netIncomeMonth: string;
    propertyPrice: string;
    downPaymentSavings: string;
    otherMonthlyPayments: string;
    interestRatePct: string;
    termYears: string;

    closingStatusLabel: string;
    closingCommissionLabel: string;
    closingBankLabel: string;
    closingSourceLabel: string;
    selectPlaceholder: string;
    other: string;

    pdfFinancialStructure: string;
    pdfPriceLabel: string;
    pdfDownPaymentLabel: string;
    pdfMortgageLabel: string;
    pdfIncomeLabel: string;
    pdfNextSteps: string;
    pdfNextStepsViable1: string;
    pdfNextStepsViable2: string;
    pdfNextStepsNotViable1: string;
    pdfNextStepsNotViable2: string;
    pdfDisclaimer: string;

    pdfProfileData: string;
    pdfClientLabel: string;
    pdfPhoneLabel: string;
    pdfApplicantLabel: string;
    pdfOpTypeLabel: string;
    pdfAgeLabel: string;
    pdfApplicantSingle: string;
    pdfApplicantCouple: string;
    pdfOpTypePrimary: string;
    pdfOpTypeSecond: string;
    pdfOpTypeInvestment: string;
    pdfYearsShort: string;

    pdfEstimatedPayment: string;

    originWeb: string;
    sourceWeb: string;
    sourceReferral: string;

    waViable: (name: string, url: string) => string;
    waNotViable: (name: string, url: string) => string;
  }
> = {
  es: {
    tabAnalysis: "Análisis",
    tabClosing: "Cierre",
    tabBot: "IA Bot",
    tabLog: "Bitácora",
    tabData: "Datos",
    save: "Guardar",
    saving: "Guardando...",
    calculating: "Calculando...",
    runStudy: "Correr Estudio",
    closingTitle: "Datos de Cierre",
    closingSubtitle: "Actualiza cuando el cliente avance.",
    aiSummary: "Resumen IA:",
    noChatHistory: "Sin historial de chat.",
    writeNote: "Escribe una nota...",
    loading: "Cargando...",
    system: "Sistema",
    createTask: "Crear Tarea",
    viable: "VIABLE",
    notViable: "NO VIABLE",
    generatePdf: "Generar PDF",
    viewPdf: "📄 Ver PDF",
    whatsapp: "WhatsApp",
    statusNew: "Nuevo",
    statusContacted: "Contactado",
    statusDocs: "Documentación",
    statusPreApproved: "Pre-aprobado",
    statusSigned: "Firmado",
    statusDropped: "Caída",
    noWorkSituation: "Sin situación laboral",

    statusLabel: "Estado",
    statusViableLabel: "✅ Viable",
    statusNotViableLabel: "⚠️ No Viable",
    statusPendingStudy: "Pendiente de Estudio",

    operationType: "Tipo Operación",
    operationHabitual: "Habitual",
    operationSecondResidence: "2ª Residencia",
    operationInvestment: "Inversión",
    modality: "Modalidad",
    modalitySolo: "Solo/a",
    modalityCouple: "Con pareja",
    age: "Edad",

    netIncomeMonth: "Ingresos Netos (Mes)",
    propertyPrice: "Precio Inmueble",
    downPaymentSavings: "Aportación (Ahorros)",
    otherMonthlyPayments: "Otras Cuotas (Mes)",
    interestRatePct: "Tasa Interés (%)",
    termYears: "Plazo (Años)",

    closingStatusLabel: "Estado",
    closingCommissionLabel: "Comisión (€)",
    closingBankLabel: "Banco",
    closingSourceLabel: "Fuente",
    selectPlaceholder: "-- Seleccionar --",
    other: "Otro",

    pdfFinancialStructure: "ESTRUCTURA FINANCIERA",
    pdfPriceLabel: "Precio:",
    pdfDownPaymentLabel: "Aportación:",
    pdfMortgageLabel: "Hipoteca:",
    pdfIncomeLabel: "Ingresos:",
    pdfNextSteps: "Próximos pasos",
    pdfNextStepsViable1: "Un asesor revisará tu caso y te contactará para explorar",
    pdfNextStepsViable2: "las mejores opciones de financiación disponibles.",
    pdfNextStepsNotViable1: "Te recomendamos aumentar la aportación o reducir deudas.",
    pdfNextStepsNotViable2: "Contáctanos para revisar alternativas.",
    pdfDisclaimer: "DISCLAIMER: Estudio preliminar basado en datos facilitados. No representa pre-aprobación bancaria.",

    pdfProfileData: "DATOS DEL PERFIL",
    pdfClientLabel: "Cliente:",
    pdfPhoneLabel: "Teléfono:",
    pdfApplicantLabel: "Modalidad:",
    pdfOpTypeLabel: "Tipo:",
    pdfAgeLabel: "Edad:",
    pdfApplicantSingle: "Solo",
    pdfApplicantCouple: "Pareja",
    pdfOpTypePrimary: "Vivienda habitual",
    pdfOpTypeSecond: "2a Residencia",
    pdfOpTypeInvestment: "Inversión",
    pdfYearsShort: "años",

    pdfEstimatedPayment: "CUOTA ESTIMADA",

    originWeb: "WEB",
    sourceWeb: "Web",
    sourceReferral: "Referido",

    waViable: (name, url) =>
      `Hola ${name}! Hemos analizado tu hipoteca y tenemos buenas noticias: *tu operación es viable*.\n\nVe tu estudio aquí:\n${url}\n\n¿Quieres que un asesor te contacte?`,
    waNotViable: (name, url) =>
      `Hola ${name}, hemos analizado tu solicitud. Aunque presenta algunos retos, tenemos opciones.\n\nRevisa tu estudio:\n${url}\n\n¿Podemos agendar una llamada?`,
  },
  en: {
    tabAnalysis: "Analysis",
    tabClosing: "Closing",
    tabBot: "AI Bot",
    tabLog: "Log",
    tabData: "Details",
    save: "Save",
    saving: "Saving...",
    calculating: "Calculating...",
    runStudy: "Run Study",
    closingTitle: "Closing Data",
    closingSubtitle: "Update as the customer progresses.",
    aiSummary: "AI Summary:",
    noChatHistory: "No chat history.",
    writeNote: "Write a note...",
    loading: "Loading...",
    system: "System",
    createTask: "Create Task",
    viable: "VIABLE",
    notViable: "NOT VIABLE",
    generatePdf: "Generate PDF",
    viewPdf: "📄 View PDF",
    whatsapp: "WhatsApp",
    statusNew: "New",
    statusContacted: "Contacted",
    statusDocs: "Documents",
    statusPreApproved: "Pre-approved",
    statusSigned: "Signed",
    statusDropped: "Dropped",
    noWorkSituation: "No work situation",

    statusLabel: "Status",
    statusViableLabel: "✅ Viable",
    statusNotViableLabel: "⚠️ Not viable",
    statusPendingStudy: "Pending study",

    operationType: "Operation type",
    operationHabitual: "Primary residence",
    operationSecondResidence: "Second residence",
    operationInvestment: "Investment",
    modality: "Applicant",
    modalitySolo: "Single",
    modalityCouple: "With partner",
    age: "Age",

    netIncomeMonth: "Net income (month)",
    propertyPrice: "Property price",
    downPaymentSavings: "Down payment (savings)",
    otherMonthlyPayments: "Other payments (month)",
    interestRatePct: "Interest rate (%)",
    termYears: "Term (years)",

    closingStatusLabel: "Status",
    closingCommissionLabel: "Commission (EUR)",
    closingBankLabel: "Bank",
    closingSourceLabel: "Source",
    selectPlaceholder: "-- Select --",
    other: "Other",

    pdfFinancialStructure: "FINANCIAL STRUCTURE",
    pdfPriceLabel: "Price:",
    pdfDownPaymentLabel: "Down payment:",
    pdfMortgageLabel: "Mortgage:",
    pdfIncomeLabel: "Income:",
    pdfNextSteps: "Next steps",
    pdfNextStepsViable1: "An advisor will review your case and contact you to explore",
    pdfNextStepsViable2: "the best financing options available.",
    pdfNextStepsNotViable1: "We recommend increasing the down payment or reducing debts.",
    pdfNextStepsNotViable2: "Contact us to review alternatives.",
    pdfDisclaimer: "DISCLAIMER: Preliminary study based on provided data. This is not a bank pre-approval.",

    pdfProfileData: "PROFILE DATA",
    pdfClientLabel: "Client:",
    pdfPhoneLabel: "Phone:",
    pdfApplicantLabel: "Applicant:",
    pdfOpTypeLabel: "Type:",
    pdfAgeLabel: "Age:",
    pdfApplicantSingle: "Single",
    pdfApplicantCouple: "Couple",
    pdfOpTypePrimary: "Primary residence",
    pdfOpTypeSecond: "Second residence",
    pdfOpTypeInvestment: "Investment",
    pdfYearsShort: "years",

    pdfEstimatedPayment: "EST. PAYMENT",

    originWeb: "WEB",
    sourceWeb: "Web",
    sourceReferral: "Referral",

    waViable: (name, url) =>
      `Hi ${name}! We analyzed your mortgage and have good news: *your operation looks viable*.\n\nView your report here:\n${url}\n\nWould you like an advisor to contact you?`,
    waNotViable: (name, url) =>
      `Hi ${name}, we analyzed your request. Even though it has some challenges, we have options.\n\nReview your report:\n${url}\n\nCan we schedule a call?`,
  },
};

function useUiLanguage(): AppLanguage {
  const [language, setLanguage] = useState<AppLanguage>("es");

  useEffect(() => {
    const saved = localStorage.getItem("botz-language");
    if (saved === "es" || saved === "en") setLanguage(saved);

    const onLangChange = (event: Event) => {
      const next = (event as CustomEvent<AppLanguage>).detail;
      if (next === "es" || next === "en") setLanguage(next);
    };

    window.addEventListener("botz-language-change", onLangChange);
    return () => window.removeEventListener("botz-language-change", onLangChange);
  }, []);

  return language;
}

export default function LeadDetailsDrawer({ lead, isOpen, onClose }: LeadDetailsDrawerProps) {
  const language = useUiLanguage();
  const t = DRAWER_TEXT[language];
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
  const [hipotecaSolicitada, setHipotecaSolicitada] = useState("");
  const [edad, setEdad] = useState("35");
  const [ingresos, setIngresos] = useState("0");
  const [presupuesto, setPresupuesto] = useState("0");
  const [ahorros, setAhorros] = useState("0");
  const [deudas, setDeudas] = useState("0");
  // Default aligned with mortgage ops spec (Spain): 2.60% if unknown
  const [tasaInteres, setTasaInteres] = useState("2.6");
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

  type MiniOption = { value: string; label: string };
  const MiniSelect = ({
    value,
    onChange,
    options,
    ariaLabel,
  }: {
    value: string;
    onChange: (next: string) => void;
    options: MiniOption[];
    ariaLabel: string;
  }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = React.useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (!open) return;

      const onDown = (e: MouseEvent) => {
        const el = wrapRef.current;
        if (!el) return;
        if (!el.contains(e.target as any)) setOpen(false);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };

      document.addEventListener("mousedown", onDown);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDown);
        document.removeEventListener("keydown", onKey);
      };
    }, [open]);

    const current = options.find((o) => o.value === value);

    return (
      <div ref={wrapRef} style={{ position: "relative" }}>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            color: "var(--botz-text)",
            fontWeight: "bold",
            fontSize: "11px",
            outline: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            padding: 0,
          }}
        >
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {current?.label || "-"}
          </span>
          <ChevronDown size={14} style={{ opacity: 0.9, flexShrink: 0 }} />
        </button>

        {open && (
          <div
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              background: "var(--botz-surface)",
              border: "1px solid var(--botz-border-strong)",
              borderRadius: "10px",
              boxShadow: "var(--botz-shadow-2)",
              overflow: "hidden",
              zIndex: 99999,
            }}
          >
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    background: selected ? "rgba(59, 130, 246, 0.14)" : "transparent",
                    color: "var(--botz-text)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: selected ? 700 : 500,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget.style.background = selected
                      ? "rgba(59, 130, 246, 0.18)"
                      : "rgba(255,255,255,0.06)");
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget.style.background = selected
                      ? "rgba(59, 130, 246, 0.14)"
                      : "transparent");
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (lead && isOpen) {
      fetchHistory();

      const normalizeOperationType = (raw: any): "habitual" | "segunda" | "inversion" => {
        const v = String(raw ?? "")
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        if (!v) return "habitual";
        if (v === "1" || v.includes("habitual") || v.includes("primary")) return "habitual";
        if (v === "2" || v.includes("segunda") || v.includes("2a") || v.includes("second")) return "segunda";
        if (v === "3" || v.includes("inversion") || v.includes("investment")) return "inversion";
        return "habitual";
      };

      // @ts-ignore
      setTipoOperacion(normalizeOperationType((lead as any).tipo_operacion));
      // @ts-ignore
      setModalidadCompra(lead.modalidad_compra || "solo");
      setEdad(lead.edad ? String(lead.edad) : "35");
      setIngresos(lead.ingresos_netos ? String(lead.ingresos_netos) : "0");
      setPresupuesto(lead.precio_real ? String(lead.precio_real) : "0");
      setAhorros(lead.aportacion_real ? String(lead.aportacion_real) : "0");
      // Requested financing is stored in DB as cantidad_a_financiar
      setHipotecaSolicitada((lead as any).cantidad_a_financiar ? String((lead as any).cantidad_a_financiar) : "");
      setDeudas(lead.otras_cuotas ? String(lead.otras_cuotas) : "0");
      // @ts-ignore
      setTasaInteres(lead.tasa_interes ? String(lead.tasa_interes) : "2.6");
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
      setHipotecaSolicitada((lead as any).cantidad_a_financiar ? String((lead as any).cantidad_a_financiar) : "");
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
        cantidad_a_financiar: hipotecaSolicitada
          ? parseFloat(String(hipotecaSolicitada).replace(/[^0-9.]/g, "")) || null
          : null,
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

      const requested = Number(String(hipotecaSolicitada || "").replace(/\D/g, "")) || 0;
      // If explicit requested financing exists, use it so CRM matches WhatsApp/PDF.
      const montoFinanciar = requested > 0 ? requested : (P - A);

      // LTV(Sol): requested financing / purchase price
      const ltvSol = P > 0 ? (montoFinanciar / P) * 100 : 0;

      // LTV(Op): financing needed to cover full operation (price + taxes/fees) - savings, always vs purchase price.
      // In n8n you use explicit taxes/fees if present; here we align with the fallback rule (Spain ~10%).
      const taxesFeesRate = 0.10;
      const costeTotal = P + (P * taxesFeesRate);
      const financiacionNecesaria = Math.max(0, costeTotal - A);
      const ltvOp = P > 0 ? (financiacionNecesaria / P) * 100 : 0;

      let cuota = 0;
      if (montoFinanciar > 0 && tasa > 0 && n > 0) {
          cuota = (montoFinanciar * tasa) / (1 - Math.pow(1 + tasa, -n));
      }

      const totalDeudas = cuota + D;
      const dti = I > 0 ? (totalDeudas / I) : 0;

      const edadNum = Number(String(edad).replace(/\D/g, "")) || 0;
      const ltvThreshold = edadNum > 0 && edadNum < 35 ? 95 : 90;
      const requiereRevision = ltvOp > ltvThreshold;
      
      return { 
          cuota: Math.round(cuota), 
          dti: dti,
          dtiPercent: Math.round(dti * 100),
          ltv: Math.round(ltvSol),
          ltvSol: Math.round(ltvSol),
          ltvOp: Math.round(ltvOp),
          requiereRevision,
          viable: dti <= 0.40 && ltvSol <= 80,
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
        ltvSol: resultado.ltvSol,
        ltvOp: resultado.ltvOp,
        requiereRevision: resultado.requiereRevision,
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
      cantidad_a_financiar: resultado.financiacion,
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
    doc.text(t.pdfProfileData, 20, 95);
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 98, 95, 98);
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    let y = 105;
    const datosCliente = [
      [t.pdfClientLabel, lead.name],
      [t.pdfPhoneLabel, lead.phone || "-"],
      [t.pdfApplicantLabel, modalidadCompra === "solo" ? t.pdfApplicantSingle : t.pdfApplicantCouple],
      [
        t.pdfOpTypeLabel,
        tipoOperacion === "habitual"
          ? t.pdfOpTypePrimary
          : tipoOperacion === "segunda"
            ? t.pdfOpTypeSecond
            : t.pdfOpTypeInvestment,
      ],
      [t.pdfAgeLabel, `${edad} ${t.pdfYearsShort}`],
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
    doc.text(t.pdfFinancialStructure, 115, 95);
    doc.line(115, 98, 190, 98);
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    y = 105;
    const datosFinancieros = [
      [t.pdfPriceLabel, `${simResult.precioVivienda.toLocaleString()} EUR`],
      [t.pdfDownPaymentLabel, `${simResult.aportacion.toLocaleString()} EUR`],
      [t.pdfMortgageLabel, `${simResult.financiacion.toLocaleString()} EUR`],
      [t.pdfIncomeLabel, `${simResult.ingresos.toLocaleString()} EUR/mes`]
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
    doc.text(t.pdfEstimatedPayment, 47, 152, { align: "center" });
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
    doc.text(t.pdfNextSteps, 25, 195);
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (isViable) {
      doc.text(t.pdfNextStepsViable1, 25, 205);
      doc.text(t.pdfNextStepsViable2, 25, 212);
    } else {
      doc.text(t.pdfNextStepsNotViable1, 25, 205);
      doc.text(t.pdfNextStepsNotViable2, 25, 212);
    }

    // Disclaimer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(6);
    doc.text(t.pdfDisclaimer, 20, 240);

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
    const mensaje =
      simResult.estado_operacion === "VIABLE"
        ? t.waViable(lead.name, pdfUrl)
        : t.waNotViable(lead.name, pdfUrl);
    
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
      <div style={{ position: "absolute", top: 0, right: 0, height: "100%", width: "520px", background: "var(--botz-surface-2)", borderLeft: "1px solid var(--botz-border-strong)", transform: isOpen ? "translateX(0)" : "translateX(100%)", transition: "transform 0.3s ease", display: "flex", flexDirection: "column", boxShadow: "-10px 0 30px rgba(0,0,0,0.35)" }}>
        
        {/* HEADER */}
        <div style={{ padding: "24px", borderBottom: "1px solid var(--botz-border)", display: "flex", justifyContent: "space-between" }}>
           <div style={{display: "flex", gap: "15px", alignItems: "center"}}>
               <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "white" }}>{lead.name.charAt(0).toUpperCase()}</div>
              <div>
                <h2 style={{ color: "var(--botz-text)", fontSize: "18px", fontWeight: "bold", margin: 0 }}>{lead.name}</h2>
                <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "var(--botz-surface-3)", color: "var(--botz-muted)", border: "1px solid var(--botz-border-strong)", marginTop: "4px", display: "inline-block" }}>{lead.origen || t.originWeb}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--botz-muted)", cursor: "pointer" }}><X /></button>
         </div>

        {/* TABS */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--botz-border)", padding: "0 10px", overflowX: "auto" }}>
           <button onClick={() => setActiveTab("financial")} style={{ padding: "14px 12px", color: activeTab === "financial" ? "#34d399" : "var(--botz-muted-2)", borderBottom: activeTab === "financial" ? "2px solid #34d399" : "2px solid transparent", fontWeight: "bold", cursor: "pointer", display: "flex", gap: "6px", fontSize: "12px", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",}}><Calculator size={14}/> {t.tabAnalysis}</button>
           <button onClick={() => setActiveTab("closing")} style={{ padding: "14px 12px", color: activeTab === "closing" ? "#22d3ee" : "var(--botz-muted-2)", borderBottom: activeTab === "closing" ? "2px solid #22d3ee" : "2px solid transparent", fontWeight: "bold", cursor: "pointer", display: "flex", gap: "6px", fontSize: "12px", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",}}><DollarSign size={14}/> {t.tabClosing}</button>
           <button onClick={() => setActiveTab("chat")} style={{ padding: "14px 12px", color: activeTab === "chat" ? "#60a5fa" : "var(--botz-muted-2)", borderBottom: activeTab === "chat" ? "2px solid #60a5fa" : "2px solid transparent", fontWeight: "bold", cursor: "pointer", display: "flex", gap: "6px", fontSize: "12px", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",}}><Bot size={14}/> {t.tabBot}</button>
           <button onClick={() => setActiveTab("history")} style={{ padding: "14px 12px", color: activeTab === "history" ? "#fbbf24" : "var(--botz-muted-2)", borderBottom: activeTab === "history" ? "2px solid #fbbf24" : "2px solid transparent", fontWeight: "bold", cursor: "pointer", display: "flex", gap: "6px", fontSize: "12px", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",}}><Clock size={14}/> {t.tabLog}</button>
           <button onClick={() => setActiveTab("info")} style={{ padding: "14px 12px", color: activeTab === "info" ? "#c084fc" : "var(--botz-muted-2)", borderBottom: activeTab === "info" ? "2px solid #c084fc" : "2px solid transparent", fontWeight: "bold", cursor: "pointer", display: "flex", gap: "6px", fontSize: "12px", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",}}><User size={14}/> {t.tabData}</button>
        </div>

        {/* CONTENIDO */}
        <div style={{ flex: 1, padding: "20px", overflowY: "auto", background: "linear-gradient(180deg, var(--botz-surface-2) 0%, var(--botz-bg) 100%)" }}>
           
           {activeTab === "financial" && (
             <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                
                {/* STATUS */}
                <div style={{ 
                  background: lead.estado_operacion === "VIABLE" ? "rgba(16, 185, 129, 0.1)" : lead.estado_operacion === "NO_VIABLE" ? "rgba(239, 68, 68, 0.1)" : "rgba(100, 116, 139, 0.1)", 
                  border: `1px solid ${lead.estado_operacion === "VIABLE" ? "rgba(16, 185, 129, 0.3)" : lead.estado_operacion === "NO_VIABLE" ? "rgba(239, 68, 68, 0.3)" : "rgba(100, 116, 139, 0.3)"}`, 
                  borderRadius: "10px", padding: "14px" 
                }}>
                   <div style={{ display: "flex", alignItems: "center", gap: "8px", color: lead.estado_operacion === "VIABLE" ? "#34d399" : lead.estado_operacion === "NO_VIABLE" ? "#f87171" : "#94a3b8", fontWeight: "bold", fontSize: "11px", textTransform: "uppercase" }}><CheckCircle2 size={14} /> {t.statusLabel}</div>
                   <div style={{ color: "var(--botz-text)", fontSize: "18px", fontWeight: "bold", marginTop: "6px" }}>
                      {lead.estado_operacion === "VIABLE" ? t.statusViableLabel : lead.estado_operacion === "NO_VIABLE" ? t.statusNotViableLabel : t.statusPendingStudy}
                   </div>
                </div>

                {/* TIPO, MODALIDAD, EDAD */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    <div style={{ background: "var(--botz-surface)", padding: "10px", borderRadius: "10px", border: "1px solid var(--botz-border-strong)" }}>
                        <div style={{ color: "var(--botz-muted)", fontSize: "10px", display: "flex", gap: "4px", marginBottom: "4px" }}><Home size={10}/> {t.operationType}</div>
                        <MiniSelect
                          ariaLabel={t.operationType}
                          value={tipoOperacion}
                          onChange={setTipoOperacion}
                          options={[
                            { value: "habitual", label: t.operationHabitual },
                            { value: "segunda", label: t.operationSecondResidence },
                            { value: "inversion", label: t.operationInvestment },
                          ]}
                        />
                    </div>
                    <div style={{ background: "var(--botz-surface)", padding: "10px", borderRadius: "10px", border: "1px solid var(--botz-border-strong)" }}>
                        <div style={{ color: "var(--botz-muted)", fontSize: "10px", display: "flex", gap: "4px", marginBottom: "4px" }}><Users size={10}/> {t.modality}</div>
                        <MiniSelect
                          ariaLabel={t.modality}
                          value={modalidadCompra}
                          onChange={setModalidadCompra}
                          options={[
                            { value: "solo", label: t.modalitySolo },
                            { value: "pareja", label: t.modalityCouple },
                          ]}
                        />
                    </div>
                   <div style={{ background: "var(--botz-surface)", padding: "10px", borderRadius: "10px", border: "1px solid var(--botz-border-strong)" }}>
                       <div style={{ color: "var(--botz-muted)", fontSize: "10px", display: "flex", gap: "4px", marginBottom: "4px" }}><Calendar size={10}/> {t.age}</div>
                       <input type="number" value={edad} onChange={(e) => setEdad(e.target.value)} style={{ background: "transparent", border: "none", color: "var(--botz-text)", fontWeight: "bold", fontSize: "13px", width: "100%", outline: "none" }} />
                    </div>
                </div>
                
                {/* CAMPOS FINANCIEROS */}
                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                   <div style={{ background: "#1e293b", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", display: "flex", gap: "4px", marginBottom: "4px" }}><DollarSign size={10}/> {t.netIncomeMonth}</div>
                      <input type="text" value={ingresos} onChange={(e) => setIngresos(e.target.value)} style={{ background: "transparent", border: "none", color: "white", fontWeight: "bold", fontSize: "14px", width: "100%", outline: "none" }} />
                      <div style={{ fontSize: "9px", color: "#64748b" }}>{formatCurrency(ingresos)}</div>
                   </div>
                   <div style={{ background: "#1e293b", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", display: "flex", gap: "4px", marginBottom: "4px" }}><TrendingUp size={10}/> {t.propertyPrice}</div>
                      <input type="text" value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} style={{ background: "transparent", border: "none", color: "white", fontWeight: "bold", fontSize: "14px", width: "100%", outline: "none" }} />
                      <div style={{ fontSize: "9px", color: "#64748b" }}>{formatCurrency(presupuesto)}</div>
                   </div>
                    <div style={{ background: "#1e293b", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                       <div style={{ color: "#94a3b8", fontSize: "10px", display: "flex", gap: "4px", marginBottom: "4px" }}><Wallet size={10}/> {t.downPaymentSavings}</div>
                       <input type="text" value={ahorros} onChange={(e) => setAhorros(e.target.value)} style={{ background: "transparent", border: "none", color: "white", fontWeight: "bold", fontSize: "14px", width: "100%", outline: "none" }} />
                       <div style={{ fontSize: "9px", color: "#64748b" }}>{formatCurrency(ahorros)}</div>
                    </div>

                    <div style={{ background: "#1e293b", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", display: "flex", gap: "4px", marginBottom: "4px" }}>
                        <Building size={10}/> {language === "en" ? "Requested mortgage" : "Hipoteca solicitada"}
                      </div>
                      <input
                        type="text"
                        value={hipotecaSolicitada}
                        onChange={(e) => setHipotecaSolicitada(e.target.value)}
                        placeholder={language === "en" ? "e.g. 120000" : "ej: 120000"}
                        style={{ background: "transparent", border: "none", color: "white", fontWeight: "bold", fontSize: "14px", width: "100%", outline: "none" }}
                      />
                      <div style={{ fontSize: "9px", color: "#64748b" }}>{formatCurrency(hipotecaSolicitada)}</div>
                    </div>
                   <div style={{ background: "#1e293b", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", display: "flex", gap: "4px", marginBottom: "4px" }}><CreditCard size={10}/> {t.otherMonthlyPayments}</div>
                      <input type="text" value={deudas} onChange={(e) => setDeudas(e.target.value)} style={{ background: "transparent", border: "none", color: "white", fontWeight: "bold", fontSize: "14px", width: "100%", outline: "none" }} />
                      <div style={{ fontSize: "9px", color: "#64748b" }}>{formatCurrency(deudas)}</div>
                   </div>
                </div>

                {/* TASA Y PLAZO */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                   <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", marginBottom: "4px" }}>{t.interestRatePct}</div>
                      <input type="number" step="0.1" value={tasaInteres} onChange={(e) => setTasaInteres(e.target.value)} style={{ background: "transparent", border: "none", color: "#22d3ee", fontWeight: "bold", fontSize: "13px", width: "100%", outline: "none" }} />
                   </div>
                   <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: "10px", borderRadius: "10px", border: "1px solid #334155" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", marginBottom: "4px" }}>{t.termYears}</div>
                      <input type="number" value={plazoAnos} onChange={(e) => setPlazoAnos(e.target.value)} style={{ background: "transparent", border: "none", color: "#22d3ee", fontWeight: "bold", fontSize: "13px", width: "100%", outline: "none" }} />
                   </div>
                </div>

                {/* BOTONES */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={handleSaveFinancialData} disabled={isSaving} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #334155", background: "#1e293b", color: "white", fontWeight: "bold", cursor: isSaving ? "wait" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                     {isSaving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14} />} 
                     {saveMsg || t.save}
                  </button>
                  <button onClick={handleRunSimulation} disabled={isSimulating} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: isSimulating ? "#334155" : "#2563eb", color: "white", fontWeight: "bold", cursor: isSimulating ? "wait" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                     {isSimulating ? <Loader2 size={14} className="animate-spin"/> : <Calculator size={14} />} 
                     {isSimulating ? t.calculating : t.runStudy}
                  </button>
                </div>

                {/* RESULTADOS */}
                {simResult && (
                    <div style={{
                      background:
                        simResult.estado_operacion === "VIABLE"
                          ? (simResult.requiereRevision ? "rgba(245, 158, 11, 0.10)" : "rgba(16, 185, 129, 0.1)")
                          : "rgba(239, 68, 68, 0.1)",
                      border: `1px solid ${
                        simResult.estado_operacion === "VIABLE"
                          ? (simResult.requiereRevision ? "rgba(245, 158, 11, 0.30)" : "rgba(16, 185, 129, 0.3)")
                          : "rgba(239, 68, 68, 0.3)"
                      }`,
                      borderRadius: "10px",
                      padding: "14px",
                    }}>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <h4 style={{ margin: 0, fontSize: "13px", color: simResult.estado_operacion === "VIABLE" ? "#34d399" : "#f87171", display: "flex", alignItems: "center", gap: "6px" }}>
                            {simResult.estado_operacion === "VIABLE"
                              ? (simResult.requiereRevision ? <AlertTriangle size={16}/> : <CheckCircle size={16}/> )
                              : <AlertTriangle size={16}/>}
                             {simResult.estado_operacion === "VIABLE"
                               ? (simResult.requiereRevision
                                 ? (language === "en" ? "REQUIRES REVIEW" : "REQUIERE REVISIÓN")
                                 : t.viable)
                               : t.notViable}
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

                        {simResult.requiereRevision && (
                          <div style={{ marginTop: "10px", fontSize: "11px", color: "#fbbf24" }}>
                            {language === "en"
                              ? `Operation LTV ~${simResult.ltvOp}% exceeds standard threshold.`
                              : `LTV de operacion ~${simResult.ltvOp}% supera el umbral estandar.`}
                          </div>
                        )}

                        {/* PDF Y WHATSAPP */}
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button onClick={generatePDF} disabled={generatingPdf} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#8b5cf6", color: "white", fontWeight: "bold", cursor: generatingPdf ? "wait" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                             {generatingPdf ? <Loader2 size={14} className="animate-spin"/> : <FileDown size={14} />} 
                             {generatingPdf ? "..." : t.generatePdf}
                          </button>
                          {pdfUrl && (
                            <button onClick={sendWhatsApp} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#22c55e", color: "white", fontWeight: "bold", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                               <Share2 size={14} /> {t.whatsapp}
                            </button>
                          )}
                        </div>

                        {pdfUrl && (
                          <div style={{ marginTop: "10px", padding: "8px", background: "rgba(139, 92, 246, 0.1)", borderRadius: "6px", fontSize: "10px", color: "#c4b5fd" }}>
                             <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#c4b5fd" }}>{t.viewPdf}</a>
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
                    <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#22d3ee", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "6px" }}><CheckCircle size={16} /> {t.closingTitle}</h3>
                    <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>{t.closingSubtitle}</p>
                </div>

                <div style={{ display: "grid", gap: "12px" }}>
                   <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#cbd5e1", marginBottom: "4px" }}>{t.closingStatusLabel}</label>
                      <select value={closingStatus} onChange={(e) => setClosingStatus(e.target.value)} style={{ width: "100%", padding: "10px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "white", outline: "none", fontSize: "13px" }}>
                         <option value="Nuevo">🔵 {t.statusNew}</option>
                         <option value="Contactado">🟡 {t.statusContacted}</option>
                         <option value="Documentación">🟠 {t.statusDocs}</option>
                         <option value="Pre-aprobado">🟣 {t.statusPreApproved}</option>
                         <option value="Firmado">🟢 {t.statusSigned}</option>
                         <option value="Caída">🔴 {t.statusDropped}</option>
                       </select>
                   </div>
                   <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#cbd5e1", marginBottom: "4px" }}>{t.closingCommissionLabel}</label>
                      <input type="number" placeholder="0" value={closingCommission} onChange={(e) => setClosingCommission(e.target.value)} style={{ width: "100%", padding: "10px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "white", outline: "none", fontSize: "13px" }} />
                   </div>
                   <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#cbd5e1", marginBottom: "4px" }}>{t.closingBankLabel}</label>
                      <select value={closingBank} onChange={(e) => setClosingBank(e.target.value)} style={{ width: "100%", padding: "10px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "white", outline: "none", fontSize: "13px" }}>
                         <option value="">{t.selectPlaceholder}</option>
                         <option value="Santander">Santander</option>
                         <option value="BBVA">BBVA</option>
                         <option value="CaixaBank">CaixaBank</option>
                         <option value="Sabadell">Sabadell</option>
                         <option value="Bankinter">Bankinter</option>
                         <option value="ING">ING</option>
                         <option value="Otro">{t.other}</option>
                      </select>
                   </div>
                   <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#cbd5e1", marginBottom: "4px" }}>{t.closingSourceLabel}</label>
                      <select value={closingSource} onChange={(e) => setClosingSource(e.target.value)} style={{ width: "100%", padding: "10px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "white", outline: "none", fontSize: "13px" }}>
                         <option value="Web">🌐 {t.sourceWeb}</option>
                         <option value="Meta Ads">∞ Meta Ads</option>
                         <option value="WhatsApp">💬 WhatsApp</option>
                         <option value="Referido">👥 {t.sourceReferral}</option>
                         <option value="Google">🔍 Google</option>
                      </select>
                   </div>
                </div>

                <button onClick={handleSaveClosing} disabled={savingClosing} style={{ background: "linear-gradient(90deg, #22d3ee, #0ea5e9)", border: "none", padding: "12px", borderRadius: "8px", color: "#0f172a", fontWeight: "bold", cursor: savingClosing ? "wait" : "pointer", display: "flex", justifyContent: "center", gap: "6px", fontSize: "13px" }}>
                   {savingClosing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                   {savingClosing ? t.saving : t.save}
                </button>

                {closingMsg && <div style={{ padding: "8px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.1)", color: "#34d399", fontSize: "11px", textAlign: "center" }}>{closingMsg}</div>}
             </div>
           )}

           {/* TAB CHAT */}
           {activeTab === "chat" && (
             <div style={{ background: "#1e293b", padding: "14px", borderRadius: "10px", color: "#cbd5e1", fontSize: "13px", lineHeight: "1.6" }}>
                 <strong style={{ color: "#60a5fa", display: "block", marginBottom: "6px" }}>{t.aiSummary}</strong>
                 {lead.resumen_chat || t.noChatHistory}
             </div>
           )}

           {/* TAB BITÁCORA */}
           {activeTab === "history" && (
             <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
               <div style={{ display: "flex", gap: "8px" }}>
                  <input type="text" placeholder={t.writeNote} value={noteInput} onChange={(e) => setNoteInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", padding: "10px", borderRadius: "8px", color: "white", outline: "none", fontSize: "12px" }} />
                 <button onClick={handleAddNote} style={{ background: "#3b82f6", border: "none", padding: "0 12px", borderRadius: "8px", color: "white", cursor: "pointer" }}><Send size={16} /></button>
               </div>
               <div style={{ position: "relative", paddingLeft: "16px", borderLeft: "2px solid #334155", marginLeft: "8px" }}>
                  {loadingHistory && <p style={{color:"#64748b", fontSize:"11px"}}>{t.loading}</p>}
                 {!loadingHistory && history.map((item) => (
                   <div key={item.id} style={{ marginBottom: "20px", position: "relative" }}>
                      <div style={{ position: "absolute", left: "-23px", top: "0", width: "10px", height: "10px", borderRadius: "50%", background: item.type === "note" ? "#3b82f6" : "#fbbf24", border: "2px solid #0f172a" }}></div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "bold", color: item.type === "note" ? "#60a5fa" : "#cbd5e1" }}>{item.user_name || t.system}</span>
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
                <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px", color: "#cbd5e1", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}><User size={14}/> {lead.situacion_laboral || t.noWorkSituation}</div>
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
