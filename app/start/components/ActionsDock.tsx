"use client";

import { useRouter } from "next/navigation";
import { 
  Zap, Crown, User, X, MessageCircle, Sparkles, 
  
  HelpCircle, FileText, ExternalLink, ChevronRight
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "../MainLayout";

type AppLanguage = "es" | "en";

const DOCK_TEXT: Record<
  AppLanguage,
  {
    account: string;
    login: string;
    plans: string;
    support: string;
    help: string;
    themeLight: string;
    themeDark: string;

    ticketStatusOpen: string;
    ticketStatusAnswered: string;
    ticketStatusClosed: string;
    ticketStatusLabel: string;
    markAttended: string;
    closeTicket: string;
    reopenTicket: string;
    attendedSystemMsg: string;
    supportHours: string;
    weekdaysHours: string;
    responseTime: string;
    enterpriseSupport: string;
    helpGettingStarted: string;
    helpAdvancedCrm: string;
    helpCalculations: string;
    helpSettings: string;
    helpGettingStartedItems: string[];
    helpAdvancedCrmItems: string[];
    helpCalculationsItems: string[];
    helpSettingsItems: string[];
    supportPlaceholder: string;

    helpCenterTitle: string;
    helpCenterSubtitle: string;
    helpSearchPlaceholder: string;
    helpSearchButton: string;
    helpNoResults: string;

    helpMortgageSpain: string;
    helpMortgageColombia: string;
    helpMortgageSpainItems: string[];
    helpMortgageColombiaItems: string[];
  }
> = {
  es: {
    account: "Cuenta",
    login: "Login",
    plans: "Planes",
    support: "Soporte",
    help: "Ayuda",
    themeLight: "Claro",
    themeDark: "Oscuro",

    ticketStatusOpen: "abierto",
    ticketStatusAnswered: "atendido",
    ticketStatusClosed: "cerrado",
    ticketStatusLabel: "Estado",
    markAttended: "Marcar atendido",
    closeTicket: "Cerrar",
    reopenTicket: "Reabrir",
    attendedSystemMsg: "Ticket marcado como atendido. Si necesitas algo mas, responde por aqui.",
    supportHours: "Horario de Atención",
    weekdaysHours: "📅 Lunes a Viernes: 9:00 AM - 6:00 PM",
    responseTime: "⏱️ Tiempo de respuesta: ≤ 2 horas",
    enterpriseSupport: "🚀 Soporte prioritario para planes Enterprise",
    helpGettingStarted: "🚀 Comenzando",
    helpAdvancedCrm: "📊 CRM Avanzado",
    helpCalculations: "💰 Cálculos",
    helpSettings: "⚙️ Configuración",
    helpGettingStartedItems: ["Configurar canales", "Crear respuestas automáticas", "Importar contactos"],
    helpAdvancedCrmItems: ["Etiquetar prospectos", "Automatizar seguimientos", "Generar reportes"],
    helpCalculationsItems: ["Simular hipotecas", "Comparar opciones", "Exportar propuestas"],
    helpSettingsItems: ["Personalizar estados", "Configurar alertas", "Integrar APIs"],
    supportPlaceholder: "¿En qué necesitas ayuda?",

    helpCenterTitle: "Centro de Ayuda",
    helpCenterSubtitle: "Encuentra respuestas rápidas",
    helpSearchPlaceholder: "Busca: DTI, LTV, entrada, gastos, tasa...",
    helpSearchButton: "Buscar",
    helpNoResults: "No se encontraron resultados.",

    helpMortgageSpain: "🏠 Hipotecas (España)",
    helpMortgageColombia: "🏠 Hipotecas (Colombia)",
    helpMortgageSpainItems: ["DTI: qué es y cómo se calcula", "LTV y entrada mínima", "Gastos (impuestos/notaría)", "Fijo vs variable (Euríbor + diferencial)", "Cómo mejorar aprobación"],
    helpMortgageColombiaItems: ["Capacidad de pago y endeudamiento", "VIS / No VIS y subsidios", "Gastos de cierre", "Tasa fija vs UVR", "Cómo mejorar aprobación"],
  },
  en: {
    account: "Account",
    login: "Login",
    plans: "Plans",
    support: "Support",
    help: "Help",
    themeLight: "Light",
    themeDark: "Dark",

    ticketStatusOpen: "open",
    ticketStatusAnswered: "answered",
    ticketStatusClosed: "closed",
    ticketStatusLabel: "Status",
    markAttended: "Mark as handled",
    closeTicket: "Close",
    reopenTicket: "Reopen",
    attendedSystemMsg: "Ticket marked as handled. If you need anything else, reply here.",
    supportHours: "Support Hours",
    weekdaysHours: "📅 Monday to Friday: 9:00 AM - 6:00 PM",
    responseTime: "⏱️ Response time: ≤ 2 hours",
    enterpriseSupport: "🚀 Priority support for Enterprise plans",
    helpGettingStarted: "🚀 Getting Started",
    helpAdvancedCrm: "📊 Advanced CRM",
    helpCalculations: "💰 Calculations",
    helpSettings: "⚙️ Settings",
    helpGettingStartedItems: ["Set up channels", "Create auto replies", "Import contacts"],
    helpAdvancedCrmItems: ["Tag prospects", "Automate follow-ups", "Generate reports"],
    helpCalculationsItems: ["Simulate mortgages", "Compare options", "Export proposals"],
    helpSettingsItems: ["Customize stages", "Configure alerts", "Integrate APIs"],
    supportPlaceholder: "What do you need help with?",

    helpCenterTitle: "Help Center",
    helpCenterSubtitle: "Find quick answers",
    helpSearchPlaceholder: "Search: DTI, LTV, down payment, fees, rate...",
    helpSearchButton: "Search",
    helpNoResults: "No results found.",

    helpMortgageSpain: "🏠 Mortgages (Spain)",
    helpMortgageColombia: "🏠 Mortgages (Colombia)",
    helpMortgageSpainItems: ["DTI: what it is and how to calculate", "LTV and minimum down payment", "Closing costs (taxes/fees)", "Fixed vs variable (Euribor + spread)", "How to improve approval"],
    helpMortgageColombiaItems: ["Affordability and debt ratio", "VIS / Non-VIS and subsidies", "Closing costs", "Fixed rate vs UVR", "How to improve approval"],
  },
};

interface ActionsDockProps {
  showDock: boolean;
  setShowDock: (show: boolean) => void;
  user: any;
  onOpenAuth: () => void;
}

export default function ActionsDock({ 
  showDock, 
  setShowDock, 
  user, 
  onOpenAuth 
}: ActionsDockProps) {
  const router = useRouter();
  const { tenantId, isAdmin, isPlatformAdmin, user: authUser } = useAuth();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [language, setLanguage] = useState<AppLanguage>("es");
  const t = DOCK_TEXT[language];

  const [supportOpenCount, setSupportOpenCount] = useState(0);
  const [supportTenantEffective, setSupportTenantEffective] = useState<string | null>(tenantId || null);
  const knownSupportIdsRef = useRef<Set<string>>(new Set());
  const toastTimerRef = useRef<any>(null);
  const [supportToast, setSupportToast] = useState<string | null>(null);

  const effectiveUser = user || authUser;
  const myUserId = effectiveUser?.id as string | undefined;

  // Estados para modales
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("botz-language");
    if (saved === "es" || saved === "en") setLanguage(saved);

    const savedTheme = localStorage.getItem("botz-theme");
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);

    const onLangChange = (event: Event) => {
      const next = (event as CustomEvent<AppLanguage>).detail;
      if (next === "es" || next === "en") setLanguage(next);
    };

    const onThemeChange = (event: Event) => {
      const next = (event as CustomEvent<"dark" | "light">).detail;
      if (next === "dark" || next === "light") setTheme(next);
    };

    window.addEventListener("botz-language-change", onLangChange);
    window.addEventListener("botz-theme-change", onThemeChange);
    return () => {
      window.removeEventListener("botz-language-change", onLangChange);
      window.removeEventListener("botz-theme-change", onThemeChange);
    };
  }, []);

  // Resolve tenant for support notifications (admin)
  useEffect(() => {
    setSupportTenantEffective(tenantId || null);
  }, [tenantId]);

  useEffect(() => {
    const run = async () => {
      if (isPlatformAdmin) return;
      if (!isAdmin) return;
      if (supportTenantEffective) return;
      if (!myUserId) return;

      try {
          const { data: tmByAuth } = await supabase
          .from("team_members")
          .select("tenant_id")
          .eq("auth_user_id", myUserId)
          .or("activo.is.null,activo.eq.true")
          .maybeSingle();

        const found = (tmByAuth as any)?.tenant_id || null;
        if (found) setSupportTenantEffective(found);
      } catch {
        // ignore
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isPlatformAdmin, myUserId, supportTenantEffective]);

  // Admin badge + toast for new tickets
  useEffect(() => {
    if (!isAdmin) return;
    if (!myUserId) return;
    // If platform admin, tenant can be null; we still poll (RLS will decide)

    let alive = true;

    const showToast = (text: string) => {
      setSupportToast(text);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setSupportToast(null), 6000);
    };

    const poll = async () => {
      try {
        const base = supabase
          .from("support_tickets")
          .select("id, status, updated_at, last_message_at")
          .order("updated_at", { ascending: false })
          .limit(50);

        const { data, error } = supportTenantEffective
          ? await base.eq("tenant_id", supportTenantEffective)
          : await base;

        if (error) throw error;
        if (!alive) return;

        const list = (data || []) as any[];
        const openCount = list.filter((t) => String(t.status || "").toLowerCase() === "open").length;
        setSupportOpenCount(openCount);

        // New ticket detection
        const known = knownSupportIdsRef.current;
        const newOnes = list.filter((t) => t?.id && !known.has(String(t.id)));
        list.forEach((t) => t?.id && known.add(String(t.id)));

        // Notify only when modal is closed
        if (!showSupportModal && newOnes.length > 0) {
          const id = String(newOnes[0].id).slice(0, 8);
          showToast(language === "en" ? `New support ticket #${id}` : `Nuevo ticket de soporte #${id}`);
        }
      } catch {
        // ignore
      }
    };

    poll();
    const timer = setInterval(poll, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, myUserId, supportTenantEffective, showSupportModal, language]);
  
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("botz-theme", newTheme);
    window.dispatchEvent(new CustomEvent("botz-theme-change", { detail: newTheme }));
  };

  // ============================================================================
  // ✅ MODAL DE SOPORTE (MEJORADO)
  // ============================================================================
  type DockText = (typeof DOCK_TEXT)["es"];

  type SupportModalProps = {
    open: boolean;
    onClose: () => void;
    user: any;
    tenantId: string | null;
    isAdmin: boolean;
    isPlatformAdmin: boolean;
    theme: "dark" | "light";
    language: AppLanguage;
    t: DockText;
  };

  // Memoized component type to avoid state resets on parent re-render
  const SupportModal = useMemo(() => {
    return function SupportModalInner({
      open,
      onClose,
      user,
      tenantId,
      isAdmin,
      isPlatformAdmin,
      theme,
      language,
      t,
    }: SupportModalProps) {

    type SupportTicket = {
      id: string;
      tenant_id?: string;
      created_by: string;
      subject: string | null;
      status: string;
      updated_at: string;
      last_message_at: string | null;
    };

    type SupportMessage = {
      id: string;
      ticket_id: string;
      sender_role: string;
      body: string;
      created_at: string;
    };

    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [loadingChat, setLoadingChat] = useState(false);
    const [errorChat, setErrorChat] = useState<string | null>(null);

    const [tenantEffective, setTenantEffective] = useState<string | null>(tenantId || null);

    const myUserId = user?.id as string | undefined;

    useEffect(() => {
      setTenantEffective(tenantId || null);
    }, [tenantId]);

    // Fallback: try to resolve tenant_id from team_members
    useEffect(() => {
      const run = async () => {
        if (isPlatformAdmin) return;
        if (tenantEffective || !myUserId) return;
        try {
          const { data: tmByAuth } = await supabase
            .from("team_members")
            .select("tenant_id")
            .eq("auth_user_id", myUserId)
            .or("activo.is.null,activo.eq.true")
            .maybeSingle();

          const found = (tmByAuth as any)?.tenant_id || null;
          if (found) setTenantEffective(found);
        } catch {
          // ignore
        }
      };
      run();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantEffective, myUserId, isPlatformAdmin]);

    const notifySupportTicketByEmail = async (ticketId: string, messagePreview: string) => {
      try {
        const res = await fetch("/api/support-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketId,
            ticketShort: String(ticketId).slice(0, 8),
            fromEmail: user?.email || undefined,
            fromName: user?.user_metadata?.full_name || user?.user_metadata?.name || undefined,
            messagePreview,
          }),
        });
        // Ignore failures; chat must still work.
        if (!res.ok) {
          // no-op
        }
      } catch {
        // no-op
      }
    };

    const resolveTicketTenant = (ticketId: string): string | null => {
      const tk = tickets.find((t) => t.id === ticketId);
      return (tk as any)?.tenant_id || tenantEffective || null;
    };

    const fetchTickets = async () => {
      if (!myUserId) return;
      const baseQuery = supabase
        .from("support_tickets")
        .select("id, tenant_id, created_by, subject, status, updated_at, last_message_at")
        .order("updated_at", { ascending: false })
        .limit(50);

      // Platform admins: see everything (RLS should allow via is_tenant_admin + is_platform_admin)
      if (isPlatformAdmin) {
        const { data, error } = await baseQuery;
        if (error) throw error;
        const list = (data || []) as any as SupportTicket[];
        setTickets(list);
        if (!activeTicketId && list.length > 0) setActiveTicketId(list[0].id);
        return;
      }

      // Tenant admins: scoped to their tenant_id if known
      const scoped = tenantEffective ? baseQuery.eq("tenant_id", tenantEffective) : baseQuery;

      // Non-admin (advisor): own tickets only
      // Admin with no tenantEffective: show own tickets (best-effort)
      const { data, error } = isAdmin
        ? tenantEffective
          ? await scoped
          : await scoped.eq("created_by", myUserId).limit(10)
        : await scoped.eq("created_by", myUserId).limit(10);

      if (error) throw error;
      const list = (data || []) as any as SupportTicket[];
      setTickets(list);
      if (!activeTicketId && list.length > 0) setActiveTicketId(list[0].id);
    };

    const fetchMessages = async (ticketId: string) => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("id, ticket_id, sender_role, body, created_at")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      setMessages((data || []) as any as SupportMessage[]);
    };

    const activeTicket = activeTicketId ? tickets.find((tk) => tk.id === activeTicketId) || null : null;
    const statusLabel = (statusRaw: string | null | undefined) => {
      const s = String(statusRaw || "").toLowerCase();
      if (s === "answered" || s === "atendido") return t.ticketStatusAnswered;
      if (s === "closed" || s === "cerrado") return t.ticketStatusClosed;
      return t.ticketStatusOpen;
    };

    const updateTicketStatus = async (ticketId: string, nextStatus: string, addMessage?: string) => {
      if (!myUserId) throw new Error("Support chat not configured (missing user)");
      setLoadingChat(true);
      setErrorChat(null);
      try {
        const ticketTenant = resolveTicketTenant(ticketId);
        const updBase = supabase
          .from("support_tickets")
          .update({ status: nextStatus })
          .eq("id", ticketId);

        const { error: updError } = isPlatformAdmin || !ticketTenant
          ? await updBase
          : await updBase.eq("tenant_id", ticketTenant);
        if (updError) throw updError;

        if (addMessage) {
          if (!ticketTenant) throw new Error("Support chat not configured (missing tenant)");
          const { error: msgError } = await supabase.from("support_messages").insert({
            tenant_id: ticketTenant,
            ticket_id: ticketId,
            sender_user_id: myUserId,
            sender_role: "admin",
            body: addMessage,
          });
          if (msgError) throw msgError;
        }

        await fetchTickets();
        await fetchMessages(ticketId);
      } catch (e: any) {
        setErrorChat(e?.message || String(e));
      } finally {
        setLoadingChat(false);
      }
    };

    const ensureTicket = async (): Promise<{ ticketId: string; createdNew: boolean }> => {
      if (activeTicketId) return { ticketId: activeTicketId, createdNew: false };

      // Platform admins should respond to existing tickets (no creation from inbox)
      if (isPlatformAdmin) {
        throw new Error(language === "en" ? "Select a ticket" : "Selecciona un ticket");
      }

      // For non-admin users: reuse latest open ticket if exists
      if (!isAdmin) {
        const openExisting = tickets.find((tk) => String(tk.status || "").toLowerCase() === "open");
        if (openExisting?.id) {
          setActiveTicketId(openExisting.id);
          return { ticketId: openExisting.id, createdNew: false };
        }
      }
      if (!tenantEffective || !myUserId) throw new Error("Support chat not configured (missing tenant/user)");

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          tenant_id: tenantEffective,
          created_by: myUserId,
          subject: "Support",
          status: "open",
        })
        .select("id")
        .single();

      if (error) throw error;
      const id = (data as any)?.id as string;
      setActiveTicketId(id);
      return { ticketId: id, createdNew: true };
    };

    const sendMessage = async () => {
      if (!draft.trim()) return;
      setLoadingChat(true);
      setErrorChat(null);
      try {
        const { ticketId, createdNew } = await ensureTicket();
        if (!myUserId) throw new Error("Support chat not configured (missing user)");

        const body = draft.trim();
        setDraft("");

        const messageTenant = isPlatformAdmin ? resolveTicketTenant(ticketId) : (tenantEffective || resolveTicketTenant(ticketId));
        if (!messageTenant) throw new Error("Support chat not configured (missing tenant)");

        const { error } = await supabase.from("support_messages").insert({
          tenant_id: messageTenant,
          ticket_id: ticketId,
          sender_user_id: myUserId,
          sender_role: isAdmin ? "admin" : "user",
          body,
        });
        if (error) throw error;

        if (isAdmin) {
          // When admin responds, mark as handled/answered
          const base = supabase
            .from("support_tickets")
            .update({ status: "answered" })
            .eq("id", ticketId);

          if (isPlatformAdmin) {
            await base;
          } else if (tenantEffective) {
            await base.eq("tenant_id", tenantEffective);
          } else {
            await base;
          }
        } else {
          // Notify internal inbox by email when a new ticket is created
          if (createdNew) {
            await notifySupportTicketByEmail(ticketId, body);
          }
        }

        await fetchMessages(ticketId);
        await fetchTickets();
      } catch (e: any) {
        setErrorChat(e?.message || String(e));
      } finally {
        setLoadingChat(false);
      }
    };

    useEffect(() => {
      let timer: any;
      const run = async () => {
        try {
          setErrorChat(null);
          await fetchTickets();
        } catch (e: any) {
          setErrorChat(e?.message || String(e));
        }
      };
      if (open) {
        run();
        timer = setInterval(run, 30000);
      }
      return () => timer && clearInterval(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantEffective, myUserId, isAdmin, isPlatformAdmin, open]);

    // For non-admin: auto-select latest open ticket when list updates
    useEffect(() => {
      if (!open) return;
      if (isAdmin) return;
      if (activeTicketId) return;
      const openExisting = tickets.find((tk) => String(tk.status || "").toLowerCase() === "open");
      if (openExisting?.id) setActiveTicketId(openExisting.id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tickets, isAdmin, open]);

    useEffect(() => {
      if (!activeTicketId) return;
      if (!open) return;
      fetchMessages(activeTicketId).catch((e: any) => setErrorChat(e?.message || String(e)));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTicketId, open]);

    if (!open) return null;

    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(5px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          background: theme === "light" ? "#ffffff" : "#1e293b",
          borderRadius: "20px",
          width: isAdmin ? "min(96vw, 920px)" : "min(92vw, 560px)",
          maxHeight: "90vh",
          overflow: "auto",
          border: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}>
          <div style={{
            padding: "24px",
            borderBottom: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: theme === "light" ? "#1e293b" : "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <MessageCircle size={20} /> Soporte
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "14px", color: theme === "light" ? "#64748b" : "#94a3b8" }}>
                Estamos aquí para ayudarte
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: theme === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)",
                border: "none",
                borderRadius: "10px",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: theme === "light" ? "#64748b" : "#94a3b8",
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ padding: "24px" }}>
            <div style={{
                display: "grid",
                gridTemplateColumns: isAdmin ? "minmax(180px, 240px) minmax(0, 1fr)" : "minmax(0, 1fr)",
                gap: "12px",
              }}>
                {isAdmin && (
                  <div style={{
                    border: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "12px",
                    background: theme === "light" ? "#f8fafc" : "rgba(255,255,255,0.04)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      padding: "10px 12px",
                      borderBottom: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: theme === "light" ? "#334155" : "#cbd5e1",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}>
                      Tickets
                    </div>
                    <div style={{ maxHeight: "340px", overflow: "auto" }}>
                      {tickets.map((tk) => (
                        <button
                          key={tk.id}
                          onClick={() => setActiveTicketId(tk.id)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 12px",
                            background: tk.id === activeTicketId ? (theme === "light" ? "#e2e8f0" : "rgba(34, 211, 238, 0.14)") : "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: theme === "light" ? "#0f172a" : "#e2e8f0",
                          }}
                        >
                          <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "2px" }}>
                            {tk.subject || "Support"}
                            <span style={{ marginLeft: "8px", fontSize: "10px", opacity: 0.75 }}>
                              #{String(tk.id).slice(0, 8)}
                            </span>
                          </div>
                          <div style={{ fontSize: "10px", opacity: 0.8 }}>
                            {statusLabel(tk.status)}
                          </div>
                        </button>
                      ))}
                      {tickets.length === 0 && (
                        <div style={{ padding: "12px", fontSize: "12px", opacity: 0.85, color: theme === "light" ? "#475569" : "#94a3b8", lineHeight: 1.35 }}>
                          {language === "en" ? "No tickets" : "Sin tickets"}
                          {isAdmin && (
                            <div style={{ marginTop: "8px", fontSize: "11px", opacity: 0.9 }}>
                              {isPlatformAdmin
                                ? (language === "en"
                                  ? "Platform admin should see all tenants once platform_admins + RPC are working."
                                  : "El platform admin deberia ver todos los tenants cuando platform_admins + el RPC funcionen.")
                                : (language === "en"
                                  ? "If you expected advisor tickets, verify you (admin) and the advisor share the same tenant_id in team_members."
                                  : "Si esperabas tickets del asesor, verifica que tu (admin) y el asesor tengan el mismo tenant_id en team_members.")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{
                  border: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  background: theme === "light" ? "#f8fafc" : "rgba(255,255,255,0.04)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "380px",
                }}>
                  <div style={{
                    padding: "10px 12px",
                    borderBottom: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: theme === "light" ? "#334155" : "#cbd5e1", minWidth: 0 }}>
                      Soporte tecnico
                      {activeTicketId && (
                        <span style={{ marginLeft: "8px", fontSize: "11px", opacity: 0.75, fontWeight: 700 }}>
                          #{String(activeTicketId).slice(0, 8)}
                        </span>
                      )}
                      {activeTicket && (
                        <span style={{ marginLeft: "10px", fontSize: "11px", opacity: 0.75, fontWeight: 700 }}>
                          {t.ticketStatusLabel}: {statusLabel(activeTicket.status)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {isAdmin && activeTicketId && (
                        <>
                          <button
                            onClick={() => updateTicketStatus(activeTicketId, "answered", t.attendedSystemMsg)}
                            disabled={loadingChat}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "10px",
                              border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.12)" : "1px solid rgba(255,255,255,0.12)",
                              background: theme === "light" ? "#ffffff" : "rgba(255,255,255,0.06)",
                              color: theme === "light" ? "#0f172a" : "#e2e8f0",
                              fontSize: "11px",
                              fontWeight: 800,
                              cursor: loadingChat ? "not-allowed" : "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.markAttended}
                          </button>
                          <button
                            onClick={() => updateTicketStatus(activeTicketId, "closed")}
                            disabled={loadingChat}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "10px",
                              border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.12)" : "1px solid rgba(255,255,255,0.12)",
                              background: theme === "light" ? "#ffffff" : "rgba(255,255,255,0.06)",
                              color: theme === "light" ? "#0f172a" : "#e2e8f0",
                              fontSize: "11px",
                              fontWeight: 800,
                              cursor: loadingChat ? "not-allowed" : "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.closeTicket}
                          </button>
                          <button
                            onClick={() => updateTicketStatus(activeTicketId, "open")}
                            disabled={loadingChat}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "10px",
                              border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.12)" : "1px solid rgba(255,255,255,0.12)",
                              background: theme === "light" ? "#ffffff" : "rgba(255,255,255,0.06)",
                              color: theme === "light" ? "#0f172a" : "#e2e8f0",
                              fontSize: "11px",
                              fontWeight: 800,
                              cursor: loadingChat ? "not-allowed" : "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.reopenTicket}
                          </button>
                        </>
                      )}
                      {errorChat && (
                        <div style={{ fontSize: "11px", color: "#ef4444" }}>{errorChat}</div>
                      )}
                    </div>
                  </div>

                  {(!myUserId || (!tenantEffective && !isPlatformAdmin) || (isPlatformAdmin && !activeTicketId)) && (
                    <div style={{
                      padding: "10px 12px",
                      borderBottom: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
                      background: theme === "light" ? "#fff7ed" : "rgba(249, 115, 22, 0.08)",
                      color: theme === "light" ? "#9a3412" : "#fdba74",
                      fontSize: "12px",
                      lineHeight: 1.35,
                    }}>
                      {!myUserId
                        ? "Inicia sesion para usar el chat de soporte."
                        : isPlatformAdmin
                          ? (language === "en" ? "Select a ticket on the left to respond." : "Selecciona un ticket a la izquierda para responder.")
                          : "No se detecto tenant_id. Agrega tu usuario a team_members con rol admin y tenant_id para habilitar soporte."}
                    </div>
                  )}

                  <div style={{ flex: 1, padding: "12px", overflow: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {messages.map((m) => {
                      const mine = (isAdmin ? m.sender_role === "admin" : m.sender_role === "user");
                      return (
                        <div key={m.id} style={{
                          display: "flex",
                          justifyContent: mine ? "flex-end" : "flex-start",
                        }}>
                          <div style={{
                            maxWidth: "80%",
                            padding: "10px 12px",
                            borderRadius: "12px",
                            background: mine ? "rgba(34, 211, 238, 0.18)" : (theme === "light" ? "#ffffff" : "rgba(255,255,255,0.06)"),
                            border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.08)" : "1px solid rgba(255,255,255,0.08)",
                            color: theme === "light" ? "#0f172a" : "#e2e8f0",
                            fontSize: "13px",
                            lineHeight: 1.35,
                            whiteSpace: "pre-wrap",
                          }}>
                            {m.body}
                          </div>
                        </div>
                      );
                    })}
                    {messages.length === 0 && (
                      <div style={{ fontSize: "12px", opacity: 0.8, color: theme === "light" ? "#475569" : "#94a3b8" }}>
                        Escribe tu mensaje para iniciar soporte.
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "12px", borderTop: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)", display: "flex", gap: "8px" }}>
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Escribe tu mensaje..."
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.14)" : "1px solid rgba(255,255,255,0.1)",
                        background: theme === "light" ? "#ffffff" : "rgba(0,0,0,0.35)",
                        color: theme === "light" ? "#0f172a" : "#fff",
                        outline: "none",
                        fontSize: "13px",
                      }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={
                        loadingChat ||
                        !myUserId ||
                        (!isPlatformAdmin && !tenantEffective) ||
                        (isPlatformAdmin && !activeTicketId)
                      }
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "none",
                        background: loadingChat ? "rgba(34, 211, 238, 0.25)" : "#22d3ee",
                        color: "#001018",
                        fontWeight: 800,
                        cursor: loadingChat ? "not-allowed" : "pointer",
                        fontSize: "13px",
                        flexShrink: 0,
                        minWidth: "76px",
                      }}
                    >
                      {loadingChat ? "..." : "Enviar"}
                    </button>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    );
  };
  }, []);

  // ============================================================================
  // ✅ MODAL DE AYUDA (MEJORADO)
  // ============================================================================
  const HelpModal = () => {
    if (!showHelpModal) return null;

    type FaqItem = {
      country: "ES" | "CO";
      q: string;
      a: string;
      tags: string[];
    };

    const [helpQuery, setHelpQuery] = useState("");
    const [expandedQ, setExpandedQ] = useState<string | null>(null);
    const [showItpModal, setShowItpModal] = useState(false);
    const [showColCostsModal, setShowColCostsModal] = useState(false);
    const [showDocsModal, setShowDocsModal] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const [showGlossaryModal, setShowGlossaryModal] = useState(false);
    const [itpSearch, setItpSearch] = useState("");
    const [colCity, setColCity] = useState<"Bogota" | "Medellin" | "Cali" | "Barranquilla" | "Valencia" | "Other">("Bogota");

    const FAQS: FaqItem[] = language === "en" ? [
      {
        country: "ES",
        q: "How do you calculate DTI (Spain)?",
        a: "DTI = (monthly debts + mortgage payment estimate) / monthly net income. Banks typically prefer <= 35% (some accept higher if the profile is strong).",
        tags: ["dti", "ratio", "income", "approval"],
      },
      {
        country: "ES",
        q: "What is LTV and why does the down payment matter?",
        a: "LTV = mortgage amount / home price. A higher down payment lowers LTV and improves approval and rate. Example: 200k home, 160k mortgage => 80% LTV.",
        tags: ["ltv", "down payment", "entry", "approval"],
      },
      {
        country: "ES",
        q: "What cash do I need besides the down payment (Spain)?",
        a: "Commonly: down payment (often 20%) + taxes/fees (often ~10%). The exact % depends on the region and property type.",
        tags: ["cash", "fees", "taxes", "notary"],
      },
      {
        country: "ES",
        q: "Fixed vs variable (Euribor + spread): what changes?",
        a: "Fixed keeps the rate stable. Variable uses Euribor + spread and changes when Euribor updates, so your monthly payment can go up or down.",
        tags: ["euribor", "spread", "fixed", "variable"],
      },
      {
        country: "ES",
        q: "How can I improve approval quickly?",
        a: "Lower monthly debts, increase down payment, shorten term, improve income stability, and keep documentation complete (payroll, taxes, bank statements).",
        tags: ["improve", "approval", "documents"],
      },

      {
        country: "CO",
        q: "How is affordability calculated (Colombia)?",
        a: "A common rule is that total monthly debt should stay within a safe ratio of income. Lower debt and higher income increase your maximum affordable payment.",
        tags: ["affordability", "income", "debt"],
      },
      {
        country: "CO",
        q: "VIS vs Non-VIS: why does it matter?",
        a: "VIS can have specific benefits and may qualify for subsidies. It can change the required down payment and improve eligibility depending on your profile.",
        tags: ["vis", "subsidy", "eligibility"],
      },
      {
        country: "CO",
        q: "What closing costs should I consider (Colombia)?",
        a: "Besides the down payment: appraisal, notary/registration, and other fees. The % varies by city and loan type.",
        tags: ["closing costs", "fees", "notary"],
      },
      {
        country: "CO",
        q: "Fixed rate vs UVR: what is the difference?",
        a: "Fixed keeps payments more predictable. UVR is inflation-indexed and can change over time; it may start lower but can rise with inflation.",
        tags: ["uvr", "fixed", "inflation"],
      },
      {
        country: "CO",
        q: "How can I improve approval (Colombia)?",
        a: "Improve credit score, increase job tenure, reduce debts, increase down payment, and keep documentation ready. Subsidy eligibility can also help.",
        tags: ["credit score", "job tenure", "improve"],
      },
    ] : [
      {
        country: "ES",
        q: "¿Como se calcula el DTI (Espana)?",
        a: "DTI = (deudas mensuales + cuota estimada de hipoteca) / ingresos netos mensuales. Normalmente los bancos prefieren <= 35% (algunos aceptan mas con buen perfil).",
        tags: ["dti", "ratio", "ingresos", "aprobacion"],
      },
      {
        country: "ES",
        q: "¿Que es el LTV y como influye la entrada minima?",
        a: "LTV = hipoteca / valor vivienda. A mas entrada, menor LTV: mejora aprobacion y tasa. Ej: vivienda 200k, hipoteca 160k => 80% LTV.",
        tags: ["ltv", "entrada", "minima", "aprobacion"],
      },
      {
        country: "ES",
        q: "¿Que dinero necesito ademas de la entrada (Espana)?",
        a: "Normalmente: entrada (a menudo 20%) + impuestos y gastos (a menudo ~10%). El % exacto depende de comunidad y tipo de vivienda.",
        tags: ["cash to close", "gastos", "impuestos", "notaria"],
      },
      {
        country: "ES",
        q: "Fijo vs variable (Euribor + diferencial): ¿que cambia?",
        a: "Fijo mantiene la tasa estable. Variable = Euribor + diferencial y cambia cuando cambia el Euribor, por eso la cuota puede subir o bajar.",
        tags: ["euribor", "diferencial", "fijo", "variable"],
      },
      {
        country: "ES",
        q: "¿Como mejorar la aprobacion rapido?",
        a: "Baja deudas, sube entrada, reduce plazo, mejora estabilidad de ingresos y lleva documentacion completa (nomina, renta, extractos).",
        tags: ["mejorar", "aprobacion", "documentos"],
      },

      {
        country: "CO",
        q: "¿Como se calcula la capacidad de pago (Colombia)?",
        a: "Una regla comun: el total de deudas mensuales debe quedar dentro de un ratio seguro sobre tus ingresos. Menos deudas y mas ingresos aumentan tu cuota maxima.",
        tags: ["capacidad", "ingresos", "deudas"],
      },
      {
        country: "CO",
        q: "VIS vs No VIS: ¿por que importa?",
        a: "VIS puede tener beneficios y puede calificar a subsidios. Puede cambiar la entrada requerida y mejorar viabilidad segun el perfil.",
        tags: ["vis", "subsidio", "viabilidad"],
      },
      {
        country: "CO",
        q: "¿Que gastos adicionales considerar (Colombia)?",
        a: "Ademas de la entrada: avaluo, notaria/registro y otros costos. El % varia por ciudad y tipo de credito.",
        tags: ["gastos", "cierre", "notaria"],
      },
      {
        country: "CO",
        q: "Tasa fija vs UVR: ¿cual es la diferencia?",
        a: "Fija mantiene cuotas mas predecibles. UVR se indexa a inflacion y puede variar; puede iniciar mas baja pero subir con inflacion.",
        tags: ["uvr", "fija", "inflacion"],
      },
      {
        country: "CO",
        q: "¿Como mejorar aprobacion (Colombia)?",
        a: "Mejora score, aumenta antiguedad laboral, reduce deudas, aumenta entrada y ten documentos listos. Calificar a subsidio tambien puede ayudar.",
        tags: ["score", "antiguedad", "mejorar"],
      },
    ];

    const disclaimer =
      language === "en"
        ? "Although many cases are similar, each transaction has its own details. This is a general orientation and a human manager will review your specific case."
        : "Aunque muchos casos son parecidos, cada operación tiene particularidades. Esto es una orientación general y un gestor humano revisará tu caso concreto.";

    const ITP_ROWS: { region: string; rate: number }[] = [
      { region: "Andalucía", rate: 2 },
      { region: "Aragón", rate: 2 },
      { region: "Asturias", rate: 2 },
      { region: "Islas Baleares", rate: 3 },
      { region: "Canarias", rate: 3 },
      { region: "Cantabria", rate: 3 },
      { region: "Castilla y León", rate: 4 },
      { region: "Castilla - La Mancha", rate: 5 },
      { region: "Cataluña", rate: 5 },
      { region: "Extremadura", rate: 5 },
      { region: "Galicia", rate: 6 },
      { region: "Madrid", rate: 6 },
      { region: "Murcia", rate: 7 },
      { region: "La Rioja", rate: 8 },
      { region: "Comunidad Valenciana", rate: 8 },
      { region: "Navarra", rate: 8 },
      { region: "País Vasco", rate: 9 },
      { region: "Ceuta", rate: 9 },
      { region: "Melilla", rate: 9 },
    ];

    const CO_COSTS: Record<string, { totalPct: [number, number]; appraisalCop: [number, number]; note: string }> = {
      Bogota: {
        totalPct: [3.0, 6.0],
        appraisalCop: [600000, 1200000],
        note:
          language === "en"
            ? "Typical large-city range. VIS/subsidies can reduce cash required depending on your profile."
            : "Rango típico en ciudad grande. VIS/subsidios pueden reducir el cash requerido según tu perfil.",
      },
      Medellin: {
        totalPct: [3.0, 6.0],
        appraisalCop: [550000, 1100000],
        note:
          language === "en"
            ? "Costs vary by lender and property type."
            : "Los costos varían por banco y tipo de vivienda.",
      },
      Cali: {
        totalPct: [3.0, 6.0],
        appraisalCop: [500000, 1000000],
        note:
          language === "en" ? "Use as reference, your case may differ." : "Úsalo como referencia, tu caso puede variar.",
      },
      Barranquilla: {
        totalPct: [3.0, 6.0],
        appraisalCop: [450000, 950000],
        note:
          language === "en" ? "We will confirm with your bank." : "Lo confirmamos con tu banco.",
      },
      Valencia: {
        totalPct: [3.0, 6.0],
        appraisalCop: [450000, 950000],
        note:
          language === "en" ? "Reference range for major cities." : "Rango de referencia para ciudades principales.",
      },
      Other: {
        totalPct: [3.0, 6.5],
        appraisalCop: [400000, 1200000],
        note:
          language === "en" ? "For other cities, we use an estimated range." : "Para otras ciudades usamos un rango estimado.",
      },
    };

    const ItpModal = () => {
      if (!showItpModal) return null;

      const q = normalizeText(itpSearch);
      const rows = q
        ? ITP_ROWS.filter((r) => normalizeText(r.region).includes(q))
        : ITP_ROWS;

      return (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(5px)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px",
        }}>
          <div style={{
            background: theme === "light" ? "#ffffff" : "#0b1220",
            borderRadius: "18px",
            width: "min(92vw, 760px)",
            maxHeight: "90vh",
            overflow: "hidden",
            border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.14)" : "1px solid rgba(255,255,255,0.10)",
            boxShadow: theme === "light" ? "0 24px 60px rgba(15, 23, 42, 0.22)" : "0 30px 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{
              padding: "16px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.08)",
            }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 900, color: theme === "light" ? "#0f172a" : "#e2e8f0" }}>
                  {language === "en" ? "Spain: ITP by region (used home purchase)" : "España: Tabla ITP por CCAA (vivienda usada)"}
                </div>
                <div style={{ fontSize: "12px", marginTop: "4px", color: theme === "light" ? "#475569" : "#94a3b8" }}>
                  {disclaimer}
                </div>
              </div>
              <button
                onClick={() => setShowItpModal(false)}
                style={{
                  background: theme === "light" ? "rgba(15, 23, 42, 0.06)" : "rgba(255,255,255,0.06)",
                  border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.10)",
                  color: theme === "light" ? "#334155" : "#cbd5e1",
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "16px 18px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "12px",
                border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.10)",
                background: theme === "light" ? "#f8fafc" : "rgba(255,255,255,0.04)",
              }}>
                <input
                  value={itpSearch}
                  onChange={(e) => setItpSearch(e.target.value)}
                  placeholder={language === "en" ? "Search region..." : "Buscar comunidad..."}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: "13px",
                    color: theme === "light" ? "#0f172a" : "#e2e8f0",
                  }}
                />
                <div style={{
                  fontSize: "11px",
                  fontWeight: 900,
                  color: theme === "light" ? "#64748b" : "#94a3b8",
                }}>
                  {rows.length}/{ITP_ROWS.length}
                </div>
              </div>

              <div style={{
                marginTop: "12px",
                borderRadius: "12px",
                overflow: "hidden",
                border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.10)",
              }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px",
                  padding: "10px 12px",
                  background: theme === "light" ? "#eef2ff" : "rgba(99, 102, 241, 0.14)",
                  color: theme === "light" ? "#1e293b" : "#e2e8f0",
                  fontSize: "12px",
                  fontWeight: 900,
                }}>
                  <div>{language === "en" ? "Region" : "Comunidad"}</div>
                  <div style={{ textAlign: "right" }}>{language === "en" ? "ITP" : "ITP"}</div>
                </div>
                <div style={{ maxHeight: "50vh", overflow: "auto", background: theme === "light" ? "#ffffff" : "rgba(255,255,255,0.02)" }}>
                  {rows.map((r) => (
                    <div
                      key={r.region}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 120px",
                        padding: "10px 12px",
                        borderTop: theme === "light" ? "1px solid rgba(15, 23, 42, 0.06)" : "1px solid rgba(255,255,255,0.06)",
                        fontSize: "13px",
                        color: theme === "light" ? "#0f172a" : "#e2e8f0",
                      }}
                    >
                      <div>{r.region}</div>
                      <div style={{ textAlign: "right", fontWeight: 900 }}>{r.rate}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: "12px", fontSize: "12px", color: theme === "light" ? "#475569" : "#94a3b8" }}>
                {language === "en"
                  ? "These values are a quick reference for used-home purchase. Tax rules can change and may have exceptions by profile." 
                  : "Estos valores son una referencia rápida para compraventa de vivienda usada. La normativa puede cambiar y puede haber excepciones por perfil."}
              </div>
            </div>
          </div>
        </div>
      );
    };

    const ColombiaCostsModal = () => {
      if (!showColCostsModal) return null;

      const current = CO_COSTS[colCity];
      const formatCop = (n: number) =>
        new Intl.NumberFormat(language === "en" ? "en-US" : "es-CO", { maximumFractionDigits: 0 }).format(n);

      return (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(5px)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px",
        }}>
          <div style={{
            background: theme === "light" ? "#ffffff" : "#0b1220",
            borderRadius: "18px",
            width: "min(92vw, 760px)",
            maxHeight: "90vh",
            overflow: "hidden",
            border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.14)" : "1px solid rgba(255,255,255,0.10)",
            boxShadow: theme === "light" ? "0 24px 60px rgba(15, 23, 42, 0.22)" : "0 30px 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{
              padding: "16px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.08)",
            }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 900, color: theme === "light" ? "#0f172a" : "#e2e8f0" }}>
                  {language === "en" ? "Colombia: closing costs estimate" : "Colombia: Gastos de cierre (estimado)"}
                </div>
                <div style={{ fontSize: "12px", marginTop: "4px", color: theme === "light" ? "#475569" : "#94a3b8" }}>
                  {disclaimer}
                </div>
              </div>
              <button
                onClick={() => setShowColCostsModal(false)}
                style={{
                  background: theme === "light" ? "rgba(15, 23, 42, 0.06)" : "rgba(255,255,255,0.06)",
                  border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.10)",
                  color: theme === "light" ? "#334155" : "#cbd5e1",
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
                <div style={{ fontSize: "12px", fontWeight: 900, color: theme === "light" ? "#64748b" : "#94a3b8" }}>
                  {language === "en" ? "City" : "Ciudad"}
                </div>
                <select
                  value={colCity}
                  onChange={(e) => setColCity(e.target.value as any)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "12px",
                    border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.14)" : "1px solid rgba(255,255,255,0.10)",
                    background: theme === "light" ? "#ffffff" : "rgba(255,255,255,0.04)",
                    color: theme === "light" ? "#0f172a" : "#e2e8f0",
                    outline: "none",
                    fontSize: "13px",
                    fontWeight: 800,
                  }}
                >
                  <option value="Bogota">Bogotá</option>
                  <option value="Medellin">Medellín</option>
                  <option value="Cali">Cali</option>
                  <option value="Barranquilla">Barranquilla</option>
                  <option value="Valencia">Valencia</option>
                  <option value="Other">{language === "en" ? "Other" : "Otra"}</option>
                </select>
              </div>

              <div style={{
                borderRadius: "14px",
                border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.10)",
                background: theme === "light" ? "#f8fafc" : "rgba(255,255,255,0.04)",
                padding: "14px 14px",
              }}>
                <div style={{ fontSize: "13px", fontWeight: 900, color: theme === "light" ? "#0f172a" : "#e2e8f0" }}>
                  {language === "en" ? "Estimated closing costs" : "Gastos de cierre estimados"}
                </div>
                <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{
                    borderRadius: "12px",
                    padding: "12px",
                    background: theme === "light" ? "#ffffff" : "rgba(0,0,0,0.25)",
                    border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.08)" : "1px solid rgba(255,255,255,0.08)",
                  }}>
                    <div style={{ fontSize: "11px", fontWeight: 900, color: theme === "light" ? "#64748b" : "#94a3b8" }}>
                      {language === "en" ? "TOTAL (reference)" : "TOTAL (referencia)"}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: theme === "light" ? "#0f172a" : "#e2e8f0", marginTop: "4px" }}>
                      {current.totalPct[0]}% - {current.totalPct[1]}%
                    </div>
                    <div style={{ fontSize: "12px", color: theme === "light" ? "#475569" : "#cbd5e1", marginTop: "6px" }}>
                      {language === "en" ? "Of home price (approx.)" : "Del valor de la vivienda (aprox.)"}
                    </div>
                  </div>

                  <div style={{
                    borderRadius: "12px",
                    padding: "12px",
                    background: theme === "light" ? "#ffffff" : "rgba(0,0,0,0.25)",
                    border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.08)" : "1px solid rgba(255,255,255,0.08)",
                  }}>
                    <div style={{ fontSize: "11px", fontWeight: 900, color: theme === "light" ? "#64748b" : "#94a3b8" }}>
                      {language === "en" ? "APPRAISAL (typical)" : "AVALÚO (típico)"}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: theme === "light" ? "#0f172a" : "#e2e8f0", marginTop: "4px" }}>
                      COP {formatCop(current.appraisalCop[0])} - {formatCop(current.appraisalCop[1])}
                    </div>
                    <div style={{ fontSize: "12px", color: theme === "light" ? "#475569" : "#cbd5e1", marginTop: "6px" }}>
                      {language === "en" ? "Range depends on property and lender" : "Depende del inmueble y del banco"}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "10px", fontSize: "12px", color: theme === "light" ? "#475569" : "#cbd5e1", lineHeight: 1.4 }}>
                  {current.note}
                </div>
              </div>

              <div style={{ marginTop: "12px", fontSize: "12px", color: theme === "light" ? "#475569" : "#94a3b8" }}>
                {language === "en"
                  ? "Tip: VIS, subsidies, and your credit score can change the required cash and eligibility." 
                  : "Tip: VIS, subsidios y tu score pueden cambiar el cash requerido y la viabilidad."}
              </div>
            </div>
          </div>
        </div>
      );
    };

    const DocsChecklistModal = () => {
      if (!showDocsModal) return null;

      const esTitle = language === "en" ? "Documents checklist" : "Checklist de documentos";

      const ES_DOCS = language === "en"
        ? [
            "ID (DNI/NIE) and residency status",
            "Last 2-3 payslips",
            "Employment contract / work history",
            "Latest income tax return (Renta)",
            "Bank statements (3-6 months)",
            "Existing loans / debts details",
            "Savings proof (down payment)",
            "Property details (listing, deposit contract if any)",
          ]
        : [
            "Identificacion (DNI/NIE) y situacion de residencia",
            "Ultimas 2-3 nominas",
            "Contrato de trabajo / vida laboral",
            "Ultima declaracion de la Renta",
            "Extractos bancarios (3-6 meses)",
            "Detalles de otros prestamos/deudas",
            "Justificante de ahorros (entrada)",
            "Datos de la vivienda (anuncio, arras si existe)",
          ];

      const CO_DOCS = language === "en"
        ? [
            "ID (cedula)",
            "Job certificate / job tenure",
            "Payslips / proof of income",
            "Bank statements",
            "Credit score / credit report (if available)",
            "Existing debts details",
            "Savings proof (down payment)",
            "VIS/Non-VIS info and subsidy eligibility (if applicable)",
            "Property details (city, type, price)",
          ]
        : [
            "Documento de identidad (cedula)",
            "Certificacion laboral / antiguedad",
            "Soportes de ingresos",
            "Extractos bancarios",
            "Score/reporte crediticio (si lo tienes)",
            "Detalle de deudas vigentes",
            "Soporte de ahorros (entrada)",
            "VIS/No VIS y subsidio (si aplica)",
            "Datos de la vivienda (ciudad, tipo, valor)",
          ];

      const Box = ({ title, items }: { title: string; items: string[] }) => (
        <div style={{
          borderRadius: "14px",
          border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.10)",
          background: theme === "light" ? "#f8fafc" : "rgba(255,255,255,0.04)",
          padding: "14px",
        }}>
          <div style={{ fontSize: "13px", fontWeight: 900, color: theme === "light" ? "#0f172a" : "#e2e8f0", marginBottom: "10px" }}>
            {title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {items.map((it) => (
              <div key={it} style={{ display: "flex", gap: "10px", fontSize: "13px", color: theme === "light" ? "#334155" : "#cbd5e1", lineHeight: 1.35 }}>
                <span style={{ color: "#22c55e", fontWeight: 900 }}>✓</span>
                <span>{it}</span>
              </div>
            ))}
          </div>
        </div>
      );

      return (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(5px)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px",
        }}>
          <div style={{
            background: theme === "light" ? "#ffffff" : "#0b1220",
            borderRadius: "18px",
            width: "min(92vw, 820px)",
            maxHeight: "90vh",
            overflow: "hidden",
            border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.14)" : "1px solid rgba(255,255,255,0.10)",
            boxShadow: theme === "light" ? "0 24px 60px rgba(15, 23, 42, 0.22)" : "0 30px 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{
              padding: "16px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.08)",
            }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 900, color: theme === "light" ? "#0f172a" : "#e2e8f0" }}>{esTitle}</div>
                <div style={{ fontSize: "12px", marginTop: "4px", color: theme === "light" ? "#475569" : "#94a3b8" }}>{disclaimer}</div>
              </div>
              <button
                onClick={() => setShowDocsModal(false)}
                style={{
                  background: theme === "light" ? "rgba(15, 23, 42, 0.06)" : "rgba(255,255,255,0.06)",
                  border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.10)",
                  color: theme === "light" ? "#334155" : "#cbd5e1",
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Box title={language === "en" ? "Spain" : "España"} items={ES_DOCS} />
              <Box title={language === "en" ? "Colombia" : "Colombia"} items={CO_DOCS} />
            </div>
          </div>
        </div>
      );
    };

    const TimelineModal = () => {
      if (!showTimelineModal) return null;
      const title = language === "en" ? "Mortgage process (3-6 weeks)" : "Proceso hipotecario (3-6 semanas)";
      const steps = language === "en"
        ? [
            { t: "1) Profile", d: "Income, debts, savings, and objective." },
            { t: "2) Pre-check", d: "DTI/LTV estimate and bank fit." },
            { t: "3) Documentation", d: "Collect documents and verify." },
            { t: "4) Appraisal", d: "Bank appraisal and final LTV." },
            { t: "5) Offer (FEIN / approval)", d: "Review conditions and sign." },
            { t: "6) Notary & closing", d: "Final signature and disbursement." },
          ]
        : [
            { t: "1) Perfil", d: "Ingresos, deudas, ahorros y objetivo." },
            { t: "2) Pre-analisis", d: "Estimacion DTI/LTV y encaje bancario." },
            { t: "3) Documentacion", d: "Recolectar y validar documentos." },
            { t: "4) Tasacion", d: "Tasacion bancaria y LTV final." },
            { t: "5) Oferta (FEIN / aprobacion)", d: "Revisar condiciones y firmar." },
            { t: "6) Notaria y cierre", d: "Firma final y desembolso." },
          ];

      return (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(5px)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px",
        }}>
          <div style={{
            background: theme === "light" ? "#ffffff" : "#0b1220",
            borderRadius: "18px",
            width: "min(92vw, 760px)",
            maxHeight: "90vh",
            overflow: "hidden",
            border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.14)" : "1px solid rgba(255,255,255,0.10)",
            boxShadow: theme === "light" ? "0 24px 60px rgba(15, 23, 42, 0.22)" : "0 30px 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{
              padding: "16px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.08)",
            }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 900, color: theme === "light" ? "#0f172a" : "#e2e8f0" }}>{title}</div>
                <div style={{ fontSize: "12px", marginTop: "4px", color: theme === "light" ? "#475569" : "#94a3b8" }}>{disclaimer}</div>
              </div>
              <button
                onClick={() => setShowTimelineModal(false)}
                style={{
                  background: theme === "light" ? "rgba(15, 23, 42, 0.06)" : "rgba(255,255,255,0.06)",
                  border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.10)",
                  color: theme === "light" ? "#334155" : "#cbd5e1",
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {steps.map((s) => (
                <div key={s.t} style={{
                  borderRadius: "14px",
                  border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.10)",
                  background: theme === "light" ? "#f8fafc" : "rgba(255,255,255,0.04)",
                  padding: "12px 14px",
                }}>
                  <div style={{ fontSize: "13px", fontWeight: 900, color: theme === "light" ? "#0f172a" : "#e2e8f0" }}>{s.t}</div>
                  <div style={{ marginTop: "4px", fontSize: "13px", color: theme === "light" ? "#334155" : "#cbd5e1" }}>{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    };

    const GlossaryModal = () => {
      if (!showGlossaryModal) return null;
      const title = language === "en" ? "Quick glossary" : "Glosario rapido";
      const items = language === "en"
        ? [
            { k: "DTI", v: "Debt-to-income: debts + mortgage payment vs income." },
            { k: "LTV", v: "Loan-to-value: mortgage amount vs home price." },
            { k: "Cash to close", v: "Down payment + fees/taxes needed to close." },
            { k: "TIN/TAE", v: "TIN = nominal rate; TAE = includes costs to compare offers." },
            { k: "FEIN", v: "Bank binding offer in Spain." },
            { k: "Euribor", v: "Reference index for variable mortgages in Spain." },
            { k: "VIS", v: "Social housing category in Colombia; can relate to subsidies." },
            { k: "UVR", v: "Inflation-indexed unit in Colombia (payments can vary)." },
          ]
        : [
            { k: "DTI", v: "Endeudamiento: deudas + cuota vs ingresos." },
            { k: "LTV", v: "Financiacion: hipoteca vs valor vivienda." },
            { k: "Cash to close", v: "Entrada + gastos/impuestos para cerrar." },
            { k: "TIN/TAE", v: "TIN = interes nominal; TAE = incluye costos para comparar." },
            { k: "FEIN", v: "Oferta vinculante del banco en Espana." },
            { k: "Euribor", v: "Indice de referencia de hipotecas variables en Espana." },
            { k: "VIS", v: "Vivienda de Interes Social en Colombia; puede aplicar a subsidios." },
            { k: "UVR", v: "Unidad indexada a inflacion en Colombia (cuotas pueden variar)." },
          ];

      return (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(5px)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px",
        }}>
          <div style={{
            background: theme === "light" ? "#ffffff" : "#0b1220",
            borderRadius: "18px",
            width: "min(92vw, 760px)",
            maxHeight: "90vh",
            overflow: "hidden",
            border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.14)" : "1px solid rgba(255,255,255,0.10)",
            boxShadow: theme === "light" ? "0 24px 60px rgba(15, 23, 42, 0.22)" : "0 30px 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{
              padding: "16px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.08)",
            }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 900, color: theme === "light" ? "#0f172a" : "#e2e8f0" }}>{title}</div>
                <div style={{ fontSize: "12px", marginTop: "4px", color: theme === "light" ? "#475569" : "#94a3b8" }}>{disclaimer}</div>
              </div>
              <button
                onClick={() => setShowGlossaryModal(false)}
                style={{
                  background: theme === "light" ? "rgba(15, 23, 42, 0.06)" : "rgba(255,255,255,0.06)",
                  border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.10)",
                  color: theme === "light" ? "#334155" : "#cbd5e1",
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {items.map((it) => (
                <div key={it.k} style={{
                  borderRadius: "14px",
                  border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.10)" : "1px solid rgba(255,255,255,0.10)",
                  background: theme === "light" ? "#f8fafc" : "rgba(255,255,255,0.04)",
                  padding: "12px 14px",
                }}>
                  <div style={{ fontSize: "12px", fontWeight: 900, color: theme === "light" ? "#0f172a" : "#e2e8f0", marginBottom: "6px" }}>{it.k}</div>
                  <div style={{ fontSize: "13px", color: theme === "light" ? "#334155" : "#cbd5e1", lineHeight: 1.45 }}>{it.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    };

      const helpSections = [
        { title: t.helpMortgageSpain, items: t.helpMortgageSpainItems },
        { title: t.helpMortgageColombia, items: t.helpMortgageColombiaItems },
      ];

    const normalizeText = (s: string) =>
      String(s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const normalizedQuery = normalizeText(helpQuery);
    const stop = new Set(["y", "de", "la", "el", "los", "las", "que", "como", "cual", "cuales", "un", "una", "para", "por", "en", "a"]);
    const tokens = normalizedQuery
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && !stop.has(t));

    const results = tokens.length > 0
      ? FAQS
          .map((f) => {
            const hay = normalizeText(`${f.q} ${f.a} ${(f.tags || []).join(" ")}`);
            const matches = tokens.reduce((acc, tok) => (hay.includes(tok) ? acc + 1 : acc), 0);
            return { f, matches };
          })
          .filter(({ matches }) => matches >= (tokens.length >= 2 ? 2 : 1))
          .sort((a, b) => b.matches - a.matches)
          .map(({ f }) => f)
      : [];

    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(5px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
          <div style={{
           background: theme === "light" ? "#ffffff" : "#1e293b",
           borderRadius: "20px",
           width: "min(92vw, 820px)",
           maxHeight: "90vh",
           overflow: "auto",
           border: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
           boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
         }}>
          <div style={{
            padding: "24px",
            borderBottom: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: theme === "light" ? "#1e293b" : "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <HelpCircle size={20} /> {t.helpCenterTitle}
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "14px", color: theme === "light" ? "#64748b" : "#94a3b8" }}>
                {t.helpCenterSubtitle}
              </p>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              style={{
                background: theme === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)",
                border: "none",
                borderRadius: "10px",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: theme === "light" ? "#64748b" : "#94a3b8",
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ padding: "24px" }}>
            {/* Búsqueda rápida */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                background: theme === "light" ? "#f8fafc" : "#0f172a",
                borderRadius: "12px",
                border: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
              }}>
                <input
                  type="text"
                  value={helpQuery}
                  onChange={(e) => setHelpQuery(e.target.value)}
                  placeholder={t.helpSearchPlaceholder}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: theme === "light" ? "#1e293b" : "#fff",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
                <button style={{
                  background: "#3b82f6",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  color: "#fff",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
                onClick={() => {
                  // no-op; search is live
                }}>
                  {t.helpSearchButton}
                </button>
              </div>
            </div>

            {normalizedQuery && (
              <div style={{ marginBottom: "24px" }}>
                {results.length === 0 ? (
                  <div style={{
                    padding: "14px 16px",
                    borderRadius: "12px",
                    border: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
                    background: theme === "light" ? "#f8fafc" : "#0f172a",
                    color: theme === "light" ? "#475569" : "#cbd5e1",
                    fontSize: "13px",
                  }}>
                    {t.helpNoResults}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {results.map((f) => {
                      const key = `${f.country}-${f.q}`;
                      const expanded = expandedQ === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setExpandedQ(expanded ? null : key)}
                          style={{
                            textAlign: "left",
                            borderRadius: "12px",
                            border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.12)" : "1px solid rgba(255,255,255,0.1)",
                            background: theme === "light" ? "#ffffff" : "rgba(255,255,255,0.04)",
                            padding: "12px 14px",
                            cursor: "pointer",
                            color: theme === "light" ? "#0f172a" : "#e2e8f0",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{
                              fontSize: "11px",
                              fontWeight: 900,
                              letterSpacing: "0.08em",
                              padding: "4px 8px",
                              borderRadius: "999px",
                              background: f.country === "ES" ? "rgba(59, 130, 246, 0.15)" : "rgba(16, 185, 129, 0.15)",
                              color: f.country === "ES" ? "#60a5fa" : "#34d399",
                            }}>
                              {f.country}
                            </span>
                            <div style={{ fontSize: "14px", fontWeight: 800, lineHeight: 1.25, flex: 1 }}>
                              {f.q}
                            </div>
                            <ChevronRight size={16} style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                          </div>
                          {expanded && (
                            <div style={{ marginTop: "10px", fontSize: "13px", lineHeight: 1.5, color: theme === "light" ? "#334155" : "#cbd5e1" }}>
                              {f.a}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Secciones de ayuda */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {helpSections.map((section, index) => (
                <div
                  key={index}
                  style={{
                    background: theme === "light" ? "#f8fafc" : "#0f172a",
                    borderRadius: "12px",
                    padding: "16px",
                    border: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <h3 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "12px", color: theme === "light" ? "#1e293b" : "#fff" }}>
                    {section.title}
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: "16px" }}>
                    {section.items.map((item, idx) => (
                      <li key={idx} style={{ 
                        fontSize: "13px", 
                        marginBottom: "6px", 
                        color: theme === "light" ? "#475569" : "#cbd5e1",
                        listStyleType: "none",
                        position: "relative",
                      }}>
                        <span style={{ position: "absolute", left: "-12px" }}>•</span>
                        <button
                          onClick={() => {
                            setHelpQuery(item);
                            setExpandedQ(null);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            color: "inherit",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          {item}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Enlaces útiles */}
            <div style={{
              background: theme === "light" ? "#ecfdf5" : "rgba(16, 185, 129, 0.1)",
              border: theme === "light" ? "1px solid #10b981" : "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: "12px",
              padding: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <ExternalLink size={16} color="#10b981" />
                <span style={{ fontSize: "14px", fontWeight: "600", color: theme === "light" ? "#065f46" : "#34d399" }}>
                  Recursos Adicionales
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  onClick={() => setShowItpModal(true)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "transparent",
                    border: "none",
                    color: theme === "light" ? "#047857" : "#34d399",
                    fontSize: "13px",
                    cursor: "pointer",
                    padding: "8px 0",
                  }}
                >
                  <span>🧾 Tabla ITP (España)</span>
                  <ChevronRight size={14} />
                </button>

                <button
                  onClick={() => setShowColCostsModal(true)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "transparent",
                    border: "none",
                    color: theme === "light" ? "#047857" : "#34d399",
                    fontSize: "13px",
                    cursor: "pointer",
                    padding: "8px 0",
                  }}
                >
                  <span>🧮 Gastos de cierre (Colombia)</span>
                  <ChevronRight size={14} />
                </button>

                <button
                  onClick={() => setShowDocsModal(true)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "transparent",
                    border: "none",
                    color: theme === "light" ? "#047857" : "#34d399",
                    fontSize: "13px",
                    cursor: "pointer",
                    padding: "8px 0",
                  }}
                >
                  <span>🗂️ Checklist de documentos</span>
                  <ChevronRight size={14} />
                </button>

                <button
                  onClick={() => setShowTimelineModal(true)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "transparent",
                    border: "none",
                    color: theme === "light" ? "#047857" : "#34d399",
                    fontSize: "13px",
                    cursor: "pointer",
                    padding: "8px 0",
                  }}
                >
                  <span>🗺️ Pasos del proceso (3-6 semanas)</span>
                  <ChevronRight size={14} />
                </button>

                <button
                  onClick={() => setShowGlossaryModal(true)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "transparent",
                    border: "none",
                    color: theme === "light" ? "#047857" : "#34d399",
                    fontSize: "13px",
                    cursor: "pointer",
                    padding: "8px 0",
                  }}
                >
                  <span>📖 Glosario rápido</span>
                  <ChevronRight size={14} />
                </button>

                {/* External links removed (placeholders) */}
              </div>
            </div>

            <div style={{ marginTop: "18px", fontSize: "12px", color: theme === "light" ? "#64748b" : "#94a3b8", lineHeight: 1.45 }}>
              {disclaimer}
            </div>
          </div>
        </div>

        <ItpModal />
        <ColombiaCostsModal />
        <DocsChecklistModal />
        <TimelineModal />
        <GlossaryModal />
      </div>
    );
  };

  // ============================================================================
  // ✅ HANDLERS ACTUALIZADOS
  // ============================================================================
  const handleSupportClick = () => {
    setShowSupportModal(true);
  };

  const handleHelpClick = () => {
    setShowHelpModal(true);
  };

  // ============================================================================
  // ✅ RENDER PRINCIPAL
  // ============================================================================
  if (!showDock) return null;

  return (
    <>
      {/* Dock */}
      <div
        className="botz-actions-dock"
        style={{
          position: "fixed",
          bottom: "30px",
          left: "50%",
          transform: "translateX(-50%)",
          background: theme === "light" 
            ? "rgba(255, 255, 255, 0.92)" 
            : "rgba(10, 15, 30, 0.95)",
          border: theme === "light"
            ? "1px solid rgba(15, 23, 42, 0.18)"
            : "1px solid rgba(255,255,255,0.15)",
          borderRadius: "50px",
          padding: "12px 24px",
          backdropFilter: "blur(20px)",
          boxShadow: theme === "light"
            ? "0 16px 50px rgba(15, 23, 42, 0.18)"
            : "0 20px 60px rgba(0,0,0,0.5)",
          zIndex: 9998,
          display: "flex",
          alignItems: "center",
          gap: "20px",
          width: "min(92vw, 760px)",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Zap size={16} color={theme === "light" ? "#f59e0b" : "#fbbf24"} />
          <span style={{ 
            fontSize: "12px", 
            fontWeight: "bold", 
            color: theme === "light" ? "#475569" : "#fbbf24" 
          }}>
            Acciones Rápidas:
          </span>
        </div>
        
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {/* Login (only when logged out) */}
          {!user && (
            <button
              onClick={onOpenAuth}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer",
                background: "none",
                border: "none",
                padding: 0,
              }}
            >
              <div
                style={{
                  padding: "8px",
                  background: "rgba(59, 130, 246, 0.1)",
                  borderRadius: "12px",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                }}
              >
                <User size={18} color={theme === "light" ? "#475569" : "#94a3b8"} />
              </div>
              <span
                style={{
                  fontSize: "10px",
                  color: theme === "light" ? "#475569" : "#8b949e",
                }}
              >
                {t.login}
              </span>
            </button>
          )}

          {/* Planes */}
          <button
            onClick={() => router.push("/pricing")}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            <div
              style={{
                padding: "8px",
                background: "rgba(245, 158, 11, 0.1)",
                borderRadius: "12px",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <Crown size={18} color="#f59e0b" />
            </div>
            <span style={{ fontSize: "10px", color: theme === "light" ? "#475569" : "#8b949e" }}>
              {t.plans}
            </span>
          </button>

          {/* Tema */}
          <button
            onClick={toggleTheme}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            <div
              style={{
                padding: "8px",
                background: theme === "light"
                  ? "rgba(245, 158, 11, 0.2)"
                  : "rgba(148, 163, 184, 0.1)",
                borderRadius: "12px",
                border: theme === "light"
                  ? "1px solid rgba(245, 158, 11, 0.4)"
                  : "1px solid rgba(148, 163, 184, 0.3)",
              }}
            >
              <Zap size={18} color={theme === "light" ? "#f59e0b" : "#94a3b8"} />
            </div>
            <span style={{ 
              fontSize: "10px", 
              color: theme === "light" ? "#f59e0b" : "#8b949e",
              fontWeight: theme === "light" ? "bold" : "normal"
            }}>
              {theme === "light" ? t.themeLight : t.themeDark}
            </span>
          </button>

          {/* Soporte */}
          <button
            onClick={handleSupportClick}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            <div
              style={{
                padding: "8px",
                background: "rgba(16, 185, 129, 0.1)",
                borderRadius: "12px",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                position: "relative",
              }}
            >
              <MessageCircle size={18} color="#10b981" />

              {isAdmin && supportOpenCount > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                    minWidth: "18px",
                    height: "18px",
                    padding: "0 5px",
                    borderRadius: "999px",
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: theme === "light" ? "2px solid rgba(255,255,255,0.95)" : "2px solid rgba(10, 15, 30, 0.95)",
                  }}
                >
                  {supportOpenCount > 99 ? "99+" : supportOpenCount}
                </div>
              )}
            </div>
            <span style={{ fontSize: "10px", color: theme === "light" ? "#475569" : "#8b949e" }}>
              {t.support}
            </span>
          </button>

          {/* Ayuda */}
          <button
            onClick={handleHelpClick}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            <div
              style={{
                padding: "8px",
                background: "rgba(139, 92, 246, 0.1)",
                borderRadius: "12px",
                border: "1px solid rgba(139, 92, 246, 0.3)",
              }}
            >
              <Sparkles size={18} color="#8b5cf6" />
            </div>
            <span style={{ fontSize: "10px", color: theme === "light" ? "#475569" : "#8b949e" }}>
              {t.help}
            </span>
          </button>
        </div>

        <button
          onClick={() => setShowDock(false)}
          style={{
            background: theme === "light" 
              ? "rgba(0,0,0,0.05)" 
              : "rgba(255,255,255,0.05)",
            border: theme === "light"
              ? "1px solid #e2e8f0"
              : "1px solid rgba(255,255,255,0.1)",
            color: theme === "light" ? "#475569" : "#8b949e",
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            marginLeft: "10px",
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Modales */}
      <SupportModal
        open={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        user={effectiveUser}
        tenantId={tenantId}
        isAdmin={isAdmin}
        isPlatformAdmin={isPlatformAdmin}
        theme={theme}
        language={language}
        t={t}
      />
      <HelpModal />

      {supportToast && (
        <div
          style={{
            position: "fixed",
            right: "18px",
            bottom: "110px",
            zIndex: 10000,
            background: theme === "light" ? "rgba(255,255,255,0.95)" : "rgba(10, 15, 30, 0.95)",
            border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.16)" : "1px solid rgba(255,255,255,0.12)",
            boxShadow: theme === "light" ? "0 16px 40px rgba(15, 23, 42, 0.18)" : "0 16px 40px rgba(0,0,0,0.55)",
            borderRadius: "14px",
            padding: "12px 14px",
            color: theme === "light" ? "#0f172a" : "#e2e8f0",
            maxWidth: "320px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <div style={{ marginTop: "2px" }}>
            <MessageCircle size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: "13px", lineHeight: 1.3, fontWeight: 700 }}>{supportToast}</div>
          <button
            onClick={() => setSupportToast(null)}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: theme === "light" ? "#64748b" : "#94a3b8",
              padding: 0,
            }}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
