"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FaWhatsapp,
  FaFacebook,
  FaInstagram,
  FaGoogle,
  FaTiktok,
  FaTelegram,
  FaShopify,
  FaSlack,
  FaMicrosoft,
} from "react-icons/fa6";
import {
  Bot,
  Zap,
  ArrowRight,
  CheckCircle2,
  Link2,
  Mail,
  Calendar,
  FolderOpen,
  RefreshCw,
  AlertTriangle,
  Users,
  ExternalLink,
  AlertCircle,
  Loader2,
  MessageSquare,
  FileText,
  X,
  Eye,
  Trash2,
  ChevronRight,
  Smartphone,
  QrCode,
  Key,
  LogOut,
  Download,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { WhatsAppConnectModal } from "./WhatsAppConnectModal";
import WhatsAppMetaConnectModal from "./WhatsAppMetaConnectModal";
import useBotzLanguage from "../hooks/useBotzLanguage";




interface Integration {
  id: string;
  channel_type: string;
  provider: string;
  status: 'connected' | 'disconnecting' | 'disconnected' | 'error';
  credentials?: any;
  last_activity?: string;
  config?: any;
  metadata?: any;
}

interface ChannelItem {
  id: string;
  name: string;
  icon?: React.ReactNode;
  color?: string;
  // Texto secundario (ej: correo conectado en Gmail)
  detail?: string;
  connected?: boolean;
  leadsToday?: number;
  lastEvent?: string;
  lastEventAt?: string;
  integrationId?: string;
  isLoading?: boolean;
  isDisconnecting?: boolean;
  disabled?: boolean;
  messages?: Array<{
    id: string;
    content: string;
    from: string;
    timestamp: string;
    type: 'incoming' | 'outgoing';
    attachments?: Array<{ name: string; type: string; url?: string }>;
  }>;
  emails?: Array<{
    id: string;
    subject: string;
    from: string;
    timestamp: string;
    hasAttachments: boolean;
    preview: string;
  }>;
}

interface ChannelEvent {
  id: string;
  channelId?: string;
  title: string;
  detail?: string;
  at?: string;
  status?: "ok" | "warn" | "error";
  type?: "message" | "email" | "lead" | "document" | "error" | "connection";
}

interface ChannelsViewProps {
  channels?: ChannelItem[];
  events?: ChannelEvent[];
  onConnect?: (connectorId: string) => void;
  onReconnect?: (connectorId: string) => void;
  onOpenMapping?: (connectorId: string) => void;
  onDisconnect?: (connectorId: string, integrationId: string) => void;
}

export default function ChannelsView({
  
  channels,
  events,
  onConnect,
  onReconnect,
  onOpenMapping,
  onDisconnect,
}: ChannelsViewProps) {
  console.log("CHANNELSVIEW_RENDER", new Date().toISOString());

  const language = useBotzLanguage();
  const copy = {
    es: {
      confirm: "Confirmar",
      close: "Cerrar",
      cancel: "Cancelar",
      processing: "Procesando...",
      areYouSure: "¿Estás seguro?",

      connect: "Conectar",
      disconnect: "Desconectar",
      reconnect: "Re-conectar",
      connectWhatsapp: "Conectar WhatsApp",

      view: "Ver:",
      connectedChannels: "Canales Conectados",
      viewMessages: "Ver Mensajes",
      viewEmails: "Ver Correos",
      connectedSyncing: "Conectado y sincronizando",
      disconnected: "Desconectado",

      trafficSources: "FUENTES DE TRÁFICO",
      loadingChannels: "Cargando canales...",
      comingSoon: "Próximamente",
      connecting: "Conectando...",
      disconnecting: "Desconectando...",
      connected: "Conectado",
      leadsToday: "Leads hoy:",
      leadsTodayUpper: "LEADS HOY",
      lastEventUpper: "ULTIMO EVENTO",
      availableConnectors: "CONECTORES DISPONIBLES",
      viewInCrm: "Ver en CRM",
      mapping: "Mapeo",
      syncActive: "✅ Sincronización activa",
      waitingConnection: "⏸️ Esperando conexión",
      leadsAutoCreated: "Los leads se crearán automáticamente en tu CRM",
      connectToStartShort: "Conecta para empezar a recibir información",
      openingCrm: "Abriendo CRM...",
      recentActivity: "Actividad Reciente",
      recentActivityDesc: "Eventos y sincronización de todos tus canales",
      refresh: "Actualizar",
      activeNow: "Activo ahora",
      reconnecting: "Reconectando...",
    
      statusLabel: "Estado",
      statusConnectedDesc: "Recibiendo eventos y creando/actualizando leads.",
      statusDisconnectedDesc: "Conecta para empezar a recibir y sincronizar información.",

      botzCoreDesc1: "Centraliza conversaciones, completa datos y ejecuta el cálculo hipotecario.",
      selectedSource: "Fuente seleccionada:",

      whatsappConvosHint: "Viendo conversaciones de WhatsApp. Los mensajes se procesan automáticamente para crear leads.",
      emailsHint: "Viendo correos electrónicos. Los adjuntos se guardan automáticamente en la documentación del lead.",

      noEmailsYetTitle: "No hay correos aún",
      noEmailsYetDesc: (channelName: string) => `Cuando recibas correos en ${channelName}, aparecerán aquí automáticamente.`,

      ecosystemTitle: "Ecosistema Digital",
      ecosystemDesc: "Conecta canales, correos y documentos para que Botz capture leads, complete datos y ejecute el cálculo hipotecario.",
      connectionCenter: "Centro de Conexiones",

      scanQrToContinue: "Escanea el código QR para continuar",
      deviceConnectedSynced: "Dispositivo conectado y sincronizado",
      connectionFailed: "Error en la conexión",

      whatsappBusiness: "WhatsApp Business",
      connectedBadge: "✓ Conectado",
      connectWhatsappHint: "Conecta tu número de WhatsApp para automatizar respuestas",
      activeSince: "Activo desde",
      today: "hoy",

      connectTypeChoice: "Elige el tipo de conexión:",
      whatsappBusinessMeta: "WhatsApp Business (Meta)",
      whatsappQrEvolution: "QR (Evolution)",
      confirmDisconnectWhatsapp: "¿Desconectar WhatsApp?",
      whatsappDisconnectedOk: "WhatsApp desconectado correctamente",
      whatsappDisconnectError: "Error al desconectar WhatsApp",
    },
    en: {
      confirm: "Confirm",
      close: "Close",
      cancel: "Cancel",
      processing: "Processing...",
      areYouSure: "Are you sure?",

      connect: "Connect",
      disconnect: "Disconnect",
      reconnect: "Reconnect",
      connectWhatsapp: "Connect WhatsApp",

      view: "View:",
      connectedChannels: "Connected Channels",
      viewMessages: "View Messages",
      viewEmails: "View Emails",
      connectedSyncing: "Connected and syncing",
      disconnected: "Disconnected",

      trafficSources: "TRAFFIC SOURCES",
      loadingChannels: "Loading channels...",
      comingSoon: "Coming soon",
      connecting: "Connecting...",
      disconnecting: "Disconnecting...",
      connected: "Connected",
      leadsToday: "Leads today:",
      leadsTodayUpper: "LEADS TODAY",
      lastEventUpper: "LAST EVENT",
      availableConnectors: "AVAILABLE CONNECTORS",
      viewInCrm: "View in CRM",
      mapping: "Mapping",
      syncActive: "✅ Sync active",
      waitingConnection: "⏸️ Waiting for connection",
      leadsAutoCreated: "Leads will be created automatically in your CRM",
      connectToStartShort: "Connect to start receiving information",
      openingCrm: "Opening CRM...",
      recentActivity: "Recent activity",
      recentActivityDesc: "Events and sync across all your channels",
      refresh: "Refresh",
      activeNow: "Active now",
      reconnecting: "Reconnecting...",
    
      statusLabel: "Status",
      statusConnectedDesc: "Receiving events and creating/updating leads.",
      statusDisconnectedDesc: "Connect to start receiving and syncing information.",

      botzCoreDesc1: "Centralizes conversations, completes data, and runs mortgage calculations.",
      selectedSource: "Selected source:",

      whatsappConvosHint: "Viewing WhatsApp conversations. Messages are processed automatically to create leads.",
      emailsHint: "Viewing emails. Attachments are saved automatically in the lead documentation.",

      noEmailsYetTitle: "No emails yet",
      noEmailsYetDesc: (channelName: string) => `When you receive emails in ${channelName}, they will appear here automatically.`,

      ecosystemTitle: "Digital Ecosystem",
      ecosystemDesc: "Connect channels, email, and documents so Botz can capture leads, complete data, and run mortgage calculations.",
      connectionCenter: "Connection Center",

      scanQrToContinue: "Scan the QR code to continue",
      deviceConnectedSynced: "Device connected and synced",
      connectionFailed: "Connection error",

      whatsappBusiness: "WhatsApp Business",
      connectedBadge: "✓ Connected",
      connectWhatsappHint: "Connect your WhatsApp number to automate replies",
      activeSince: "Active since",
      today: "today",

      connectTypeChoice: "Choose the connection type:",
      whatsappBusinessMeta: "WhatsApp Business (Meta)",
      whatsappQrEvolution: "QR (Evolution)",
      confirmDisconnectWhatsapp: "Disconnect WhatsApp?",
      whatsappDisconnectedOk: "WhatsApp disconnected successfully",
      whatsappDisconnectError: "Error disconnecting WhatsApp",
    },
  } as const;

  const t = copy[language];

  const describeError = (err: any) => {
    const message =
      err?.message ||
      err?.error_description ||
      err?.details ||
      err?.hint ||
      err?.code ||
      null;

    if (message) return String(message);

    try {
      const s = JSON.stringify(err);
      if (s && s !== "{}") return s;
    } catch {
      // ignore
    }

    return String(err || "Unknown error");
  };

  // Estado para conexiones reales
  const [userIntegrations, setUserIntegrations] = useState<Integration[]>([]);
  const [remoteEvents, setRemoteEvents] = useState<ChannelEvent[]>([]);
  const [connectBusy, setConnectBusy] = useState<string | null>(null);
  const [disconnectBusy, setDisconnectBusy] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [uiNotice, setUiNotice] = useState<{ type: "info" | "success" | "error"; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    
    
    open: boolean;
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
  }>({ open: false });
  const [oauthModal, setOauthModal] = useState<{
    open: boolean;
    title?: string;
    provider?: string;
    step?: "starting" | "waiting" | "connected" | "error";
    message?: string;
  }>({ open: false });
  const oauthPollRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'channels' | 'messages' | 'emails'>('channels');
const [waProvider, setWaProvider] = useState<"evolution" | "meta">("evolution");
  const [showMetaModal, setShowMetaModal] = useState(false);

  // Modal QR mejorado
  const [qrModal, setQrModal] = useState<{ 
    open: boolean; 
    title?: string; 
    connectorType?: string;
    qrDataUrl?: string; 
    instructions?: string[];
    steps?: Array<{ icon: React.ReactNode; text: string }>;
    status?: 'scanning' | 'connected' | 'error';
    connectionDetails?: any;
  }>({
    open: false,
    status: 'scanning',
  });

  const [selectedId, setSelectedId] = useState<string>("whatsapp");
  const [showMessages, setShowMessages] = useState<boolean>(false);
  const [showEmails, setShowEmails] = useState<boolean>(false);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsError, setEmailsError] = useState<string | null>(null);
  const [emailsByIntegration, setEmailsByIntegration] = useState<Record<string, ChannelItem["emails"]>>({});
  
  // 🔥 NUEVO: Estados para ver detalle y responder
  type EmailItem = NonNullable<ChannelItem["emails"]>[number];
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [replyModal, setReplyModal] = useState<{
    open: boolean;
    to: string;
    subject: string;
    body: string;
  }>({ open: false, to: "", subject: "", body: "" });
  const [sendingReply, setSendingReply] = useState(false);

  // WhatsApp states
  const [whatsappStatus, setWhatsappStatus] = useState<any>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');


  // ✅ FUNCIÓN ACTUALIZADA: Sincroniza emails desde Gmail y luego los lee
  const loadEmails = async (integrationId: string) => {
    try {
      setEmailsLoading(true);
      setEmailsError(null);

      const { data: { user } } = await supabase.auth.getUser();
const userId = user?.id;
const tenantId =
  (user?.user_metadata as any)?.tenant_id ||
  (user?.app_metadata as any)?.tenant_id ||
  null;

if (!userId) {
  setEmailsError("No hay usuario en sesión");
  return;
}

// 👇 NO bloquees la carga si falta tenantId (porque el SELECT actual no lo usa)
if (!tenantId) {
  console.warn("⚠️ Sesión sin tenant_id, cargando emails igual…", { userId, integrationId });
}


      // 🔥 PASO 1: Sincronizar emails desde Gmail (llamar al nuevo endpoint)
      console.log("📧 Sincronizando emails desde Gmail...");
      
     let syncData: any = null;

try {
  const syncRes = await fetch("/api/integrations/google/sync-gmail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenant_id: tenantId,
      user_id: userId,
      integration_id: integrationId,
    }),
  });

  const txt = await syncRes.text();
  try { syncData = txt ? JSON.parse(txt) : {}; } catch { syncData = { raw: txt }; }

  if (!syncRes.ok) {
    console.warn("⚠️ Sync falló, pero igual cargo emails existentes:", syncData);
    setEmailsError(`Sync falló: ${syncData?.error || syncData?.message || "Desconocido"}`);
    // ✅ NO return — seguimos a leer la BD
  } else {
    console.log("✅ Emails sincronizados:", syncData?.emails_saved ?? "ok");
  }
} catch (e: any) {
  console.warn("⚠️ Error llamando sync, pero igual cargo emails existentes:", e?.message || e);
  setEmailsError(`Sync error: ${e?.message || "Desconocido"}`);
  // ✅ NO return — seguimos a leer la BD
}

      // 🔥 PASO 2: Leer emails desde Supabase
      const { data, error } = await supabase
        .from("email_messages")
        .select("id, subject, from_email, snippet, received_at")
        .order("received_at", { ascending: false })
        .limit(50);

        console.log("Emails data:", data);
        console.log("Emails error:", error);

      console.log("📬 Emails en BD:", { tenantId, userId, integrationId, error, rows: data?.length });

      if (error) {
        setEmailsError(error.message);
        return;
      }

      const mapped: ChannelItem["emails"] = (data || []).map((r: any) => ({
        id: r.id,
        subject: r.subject || "(Sin asunto)",
        from: r.from_email || "-",
        timestamp: r.received_at ? new Date(r.received_at).toLocaleString() : "",
        hasAttachments: false,
        preview: r.snippet || "",
      }));

      setEmailsByIntegration((prev) => ({ ...prev, [integrationId]: mapped }));
      
      // 🎉 Notificar éxito
      pushNotice("success", `${mapped.length} correos cargados`);
      
    } catch (err: any) {
      console.error("💥 Error en loadEmails:", err);
      setEmailsError(err.message || "Error desconocido");
    } finally {
      setEmailsLoading(false);
    }
  };

  // 🔥 NUEVO: Función para enviar respuesta
  const handleSendReply = async () => {
    if (!replyModal.to || !replyModal.subject || !replyModal.body) {
      pushNotice("error", "Por favor completa todos los campos");
      return;
    }

    if (!selected.integrationId) {
      pushNotice("error", "No hay integración de Gmail");
      return;
    }

    try {
      setSendingReply(true);

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      const tenantId =
        (user?.user_metadata as any)?.tenant_id ||
        (user?.app_metadata as any)?.tenant_id ||
        null;

      const response = await fetch("/api/integrations/google/send-gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: userId,
          integration_id: selected.integrationId,
          to: replyModal.to,
          subject: replyModal.subject,
          body: replyModal.body,
        }),
      });

      const result = await response.json();
      console.log("📧 send-gmail response:", response.status, result);

      if (!response.ok) {
        // Si es problema de scopes, pedir reconectar
        if (result.gmail_status === 403 || (result.gmail_error && result.gmail_error.includes("scope"))) {
          pushNotice("error", "Gmail necesita permisos de envío. Desconecta y vuelve a conectar Gmail.");
          return;
        }
        const detail = result.gmail_error || result.details?.error?.message || result.error || "Error al enviar email";
        throw new Error(detail);
      }

      pushNotice("success", "✅ Email enviado correctamente");
      setReplyModal({ open: false, to: "", subject: "", body: "" });
      setSelectedEmail(null);

      // Recargar emails
      if (selected.integrationId) {
        loadEmails(selected.integrationId);
      }
    } catch (error: any) {
      console.error("❌ Error enviando email:", error);
      pushNotice("error", `Error: ${error.message}`);
    } finally {
      setSendingReply(false);
    }
  };



  // Mensajes/correos (se llenan desde integraciones reales)
  const demoMessages: ChannelItem["messages"] = [];

  const demoEmails: ChannelItem["emails"] = [];

  // Cargar integraciones del usuario
  const pushNotice = (type: "info" | "success" | "error", message: string) => {
    setUiNotice({ type, message });
  };

  useEffect(() => {
    if (!uiNotice) return;
    const t = window.setTimeout(() => setUiNotice(null), 4500);
    return () => window.clearTimeout(t);
  }, [uiNotice]);

  useEffect(() => {
    return () => {
      if (oauthPollRef.current) window.clearInterval(oauthPollRef.current);
      oauthPollRef.current = null;
    };
  }, []);
useEffect(() => {
  (async () => {
    const { data, error } = await supabase.auth.getSession();
    console.log("SESSION_CHECK", {
      hasSession: !!data?.session,
      userId: data?.session?.user?.id || null,
      error: error?.message || null,
    });
  })();
}, []);

  useEffect(() => {
    loadUserIntegrations();
    loadRecentActivity();
    checkWhatsAppStatus();
  }, []);

  // -----------------------------
  // Helpers
  // -----------------------------
  const pickEmail = (row?: Integration | null) => {
    const c: any = (row as any)?.credentials || {};
    return (
      (row as any)?.email_address ||
      c?.emailAddress ||
      c?.email ||
      c?.email_address ||
      null
    );
  };

  // Si Gmail está conectado pero aún no tenemos email_address, lo “hidrata” desde /api/integrations/gmail/profile
  // y lo guarda en la tabla integrations para que se muestre en la UI.
  const hydrateGmailEmail = async (integrations: Integration[]) => {
    try {
      const gmail = integrations.find(
        (i) => i.channel_type === "gmail" && i.status === "connected"
      );
      if (!gmail) return;

      const currentEmail = pickEmail(gmail);
      if (currentEmail) return;

      const resp = await fetch("/api/integrations/gmail/profile", {
        credentials: "include",
      });
      const j = await resp.json();
      const email = j?.gmail_profile?.emailAddress || j?.emailAddress || null;
      if (!email) return;

      await supabase.from("integrations").update({ email_address: email }).eq("id", gmail.id);

      setUserIntegrations((prev) =>
        prev.map((x) => (x.id === gmail.id ? ({ ...x, email_address: email } as any) : x))
      );
    } catch (e) {
      console.warn("No se pudo hidratar email de Gmail:", e);
    }
  };

  const loadUserIntegrations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("No hay usuario autenticado");
        setLoading(false);
        return;
      }

      const { error: tableError } = await supabase
        .from('integrations')
        .select('id')
        .limit(1);

      if (tableError) {
        console.warn("Tabla integrations no accesible:", describeError(tableError), tableError);
        setUserIntegrations([]);
        setLoading(false);
        return;
      }

      const { data: integrations, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserIntegrations(integrations || []);

      // ✅ Asegura que Gmail muestre el correo real en UI
      hydrateGmailEmail(integrations || []);
      // 🔥 AÑADE ESTO AQUÍ:
      const gmail = (integrations || []).find((i: any) => {
  const p = String(i.provider || i.channel_type || "").toLowerCase();
  return (i.status === "connected") && (p === "gmail" || p === "google" || i.channel_type === "gmail");
});

if (gmail?.id) await loadEmails(gmail.id);

    } catch (error) {
      const msg = describeError(error);
      console.error("Error cargando integraciones:", msg, error);
      setConnectError(msg);
      pushNotice("error", msg);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const { error: tableError } = await supabase
        .from('channel_activities')
        .select('id')
        .limit(1);

      if (tableError) {
        console.warn("No se pudo cargar eventos remotos:", tableError);
        setRemoteEvents([]);
        return;
      }

      const { data: activities, error } = await supabase
        .from('channel_activities')
        .select(`
          *,
          integrations:integration_id (
            channel_type,
            provider
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedEvents: ChannelEvent[] = (activities || []).map((activity: any) => ({
        id: activity.id,
        channelId: activity.integrations?.channel_type || activity.integrations?.provider,
        title: activity.content || 'Sin título',
        detail: activity.metadata?.detail,
        at: new Date(activity.created_at).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit',
          day: '2-digit',
          month: 'short'
        }),
        status: activity.type === 'error' ? 'error' : 
                activity.type === 'lead' ? 'ok' : 'warn',
        type: activity.type as ChannelEvent['type']
      }));

      setRemoteEvents(formattedEvents);
   } catch (error: any) {
  console.error("Error cargando actividad:", error?.message || error);
  console.error("Detalle:", {
    name: error?.name,
    status: error?.status,
    response: error?.response,
    stack: error?.stack,
  });
  setRemoteEvents([]);
}

  };

  // WhatsApp Functions
  const checkWhatsAppStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tid = (user?.user_metadata as any)?.tenant_id || (user?.app_metadata as any)?.tenant_id;
      if (!tid) return;

      setTenantId(tid);

      const response = await fetch(`/api/whatsapp/status/${tid}`);
      const status = await response.json();
      setWhatsappStatus(status);
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
    }
  };

  const handleWhatsAppConnect = () => {
    // ✅ En WhatsApp ofrecemos 2 formas: QR (Evolution) o Business API (Meta)
    setConfirmModal({
      open: true,
      title: t.connectWhatsapp,
      description: t.connectTypeChoice,
      confirmText: t.whatsappBusinessMeta,
      cancelText: t.whatsappQrEvolution,
      onConfirm: () => {
        setConfirmModal({ open: false });
        setWaProvider("meta");
        setShowMetaModal(true);
      },
      onCancel: () => {
        setConfirmModal({ open: false });
        setWaProvider("evolution");
        setShowWhatsAppModal(true);
      },
    });
  };

  const handleWhatsAppDisconnect = async () => {
    if (!confirm(t.confirmDisconnectWhatsapp)) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tenantId = (user?.user_metadata as any)?.tenant_id || (user?.app_metadata as any)?.tenant_id;
      if (!tenantId) return;

      const response = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId })
      });

      if (response.ok) {
        await checkWhatsAppStatus();
        setUiNotice({ type: "success", message: t.whatsappDisconnectedOk });
      } else {
        setUiNotice({ type: "error", message: t.whatsappDisconnectError });
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      setUiNotice({ type: "error", message: t.whatsappDisconnectError });
    }
  };

  // Lista base de canales con datos demo
  const channelsBase: ChannelItem[] = useMemo(() => {
    const baseInput = channels && channels.length
      ? channels
      : [
          { 
            id: "whatsapp", 
            name: "WhatsApp", 
            icon: <FaWhatsapp />, 
            color: "#25D366", 
            connected: false, 
            leadsToday: 12, 
            lastEvent: "Mensaje entrante", 
            lastEventAt: undefined,
            messages: demoMessages,
          },
          { 
            id: "gmail", 
            name: "Gmail", 
            icon: <FaGoogle />, 
            color: "#EA4335", 
            connected: false, 
            leadsToday: 8, 
            lastEvent: "Email con adjuntos", 
            lastEventAt: undefined,
            emails: demoEmails,
          },
          { 
            id: "outlook", 
            name: "Outlook", 
            icon: <FaMicrosoft />,
            color: "#0078D4", 
            connected: false, 
            leadsToday: 0, 
            lastEvent: "Próximamente", 
            lastEventAt: undefined,
            disabled: true,
          },
          { 
            id: "meta", 
            name: "Meta Ads", 
            icon: <FaFacebook />, 
            color: "#1877F2", 
            connected: false, 
            leadsToday: 0, 
            lastEvent: "Próximamente", 
            lastEventAt: undefined,
            disabled: true,
          },
          { 
            id: "instagram", 
            name: "Instagram", 
            icon: <FaInstagram />, 
            color: "#E4405F", 
            connected: false, 
            leadsToday: 0, 
            lastEvent: "Próximamente", 
            lastEventAt: undefined,
            disabled: true,
          },
        ];

      // ✅ Aunque el padre pase channels, garantizamos que existan Gmail y WhatsApp Business
      // (porque esta pantalla es el "Centro de Conexiones" y deben aparecer siempre)
    const ids = new Set((baseInput || []).map((c) => c.id));
    const base: ChannelItem[] = [...(baseInput || [])];

    if (!ids.has("whatsapp_business")) {
      base.push({
        id: "whatsapp_business",
        name: "WhatsApp Business",
        icon: <FaWhatsapp />,
        color: "#22c55e",
        connected: false,
        leadsToday: 0,
        lastEvent: "API Cloud / Business",
        lastEventAt: undefined,
        messages: demoMessages,
      });
    }

    if (!ids.has("gmail")) {
      base.push({
        id: "gmail",
        name: "Gmail",
        icon: <FaGoogle />,
        color: "#EA4335",
        connected: false,
        leadsToday: 0,
        lastEvent: "Sincroniza correos",
        lastEventAt: undefined,
        emails: demoEmails,
      });
    }

    if (!ids.has("lead_scoring")) {
      base.push({
        id: "lead_scoring",
        name: "Lead Scoring Hipotecario",
        icon: <FileText />,
        color: "#f59e0b",
        connected: false,
        leadsToday: 0,
        lastEvent: "Configuración automática",
        lastEventAt: undefined,
      });
    }

const stripDynamic = (obj: any) => {
  if (!obj || typeof obj !== "object") return obj;
  const { params, searchParams, ...rest } = obj; // ✅ quita Promises de Next
  return rest;
};

    return base.map((channel) => {
      const channelSafe = stripDynamic(channel);

      // ✅ Mapeo flexible: en DB el provider puede variar (google, evolution, whatsapp_cloud, etc.)
      const integration = userIntegrations.find((i: Integration) => {
        const provider = String(i.provider || "");

        if (channel.id === "whatsapp") {
          // WhatsApp "personal" puede venir como evolution/whatsapp/whatsapp_qr
          return i.channel_type === "whatsapp" && ["evolution", "whatsapp", "whatsapp_qr"].includes(provider);
        }

        if (channel.id === "whatsapp_business") {
          // WhatsApp Business / Cloud
          return i.channel_type === "whatsapp_cloud" || provider === "whatsapp_cloud" || provider === "whatsapp_business";
        }

        if (channel.id === "gmail") {
          // Gmail suele guardarse con provider google
          return i.channel_type === "gmail" || provider === "google" || provider === "gmail";
        }

        // default
        return i.channel_type === channel.id || provider === channel.id;
      });
      
if (integration) {
  const isConnected = integration.status === 'connected';
  
  // Para Lead Scoring, mostrar estado diferente
  let detail = undefined;
  if (channel.id === "lead_scoring") {
    const hasEmailConfig = integration.credentials?.smtp_user && integration.config?.company_name;
    detail = hasEmailConfig ? 
      `Configurado para ${integration.config.company_name}` : 
      "Configuración pendiente";
  } else if (channel.id === "gmail") {
    detail = (pickEmail(integration) || undefined);
  }

  return {
    ...channelSafe,
    connected: isConnected,
    integrationId: integration.id,
    detail: detail,
    lastEvent: isConnected ? t.connectedSyncing : t.disconnected,
    lastEventAt: integration.last_activity
      ? new Date(integration.last_activity).toLocaleTimeString(language === "en" ? "en-US" : "es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "short",
        })
      : (isConnected ? t.activeNow : "."),
    emails: (channel.id === "gmail" && integration.id)
      ? (emailsByIntegration[integration.id] || [])
      : ([] as any),
  };
}

// ✅ Si NO hay integración, retorna el canal sin modificar
return channelSafe;

}); // ← Aquí cierra el .map()
    
}, [channels, userIntegrations, emailsByIntegration, language]);
  const selected = useMemo(() => {
    return channelsBase.find((c) => c.id === selectedId) || channelsBase[0];
  }, [channelsBase, selectedId]);

  // Conectores del broker
  const connectors = useMemo(
    () => [
      {
        id: "whatsapp_qr",
        title: "WhatsApp Personal (QR)",
        subtitle: "Conecta tu WhatsApp diario en 2 minutos",
        icon: <QrCode size={16} />,
        color: "#25D366",
        type: "qr",
      },
      {
        id: "whatsapp_business",
        title: "WhatsApp Business API",
        subtitle: "Solución profesional para brokers",
        icon: <Key size={16} />,
        color: "#22c55e",
        type: "api",
      },
      {
        id: "gmail",
        title: "Gmail / Google Workspace",
        subtitle: "Sincroniza correos y Google Drive",
        icon: <Mail size={16} />,
        color: "#ef4444",
        type: "oauth",
      },
      {
        id: "outlook",
        title: "Outlook / Microsoft 365",
        subtitle: "Próximamente",
        icon: <Mail size={16} />,
        color: "#3b82f6",
        type: "oauth",
        disabled: true,
      },
      {
        id: "google_ads",
        title: "Google Ads",
        subtitle: "Próximamente",
        icon: <FaGoogle size={16} />,
        color: "#4285F4",
        type: "oauth",
        disabled: true,
      },
      {
        id: "meta_ads",
        title: "Meta Business Suite",
        subtitle: "Próximamente",
        icon: <FaFacebook size={16} />,
        color: "#1877F2",
        type: "api",
        disabled: true,
      },
      {
        id: "lead_scoring",
        title: "Lead Scoring Hipotecario",
        subtitle: "Configuración de emails y scoring automático",
        icon: <FileText size={16} />,
        color: "#f59e0b",
        type: "config",
      },
    ]
  , []);

  // Función para conectar canales
  const handleConnect = async (connectorId: string, connectorName?: string) => {
    if (onConnect) {
      onConnect(connectorId);
      return;
    }

    try {
      setConnectBusy(connectorId);
      setConnectError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        pushNotice("error", "Por favor inicia sesión para conectar");
        setConnectError("Por favor inicia sesión para conectar");
        setConnectBusy(null);
        return;
      }
// --- GOOGLE/GMAIL: siempre abrir popup, NO salir de la página ---
      if (connectorId === 'google' || connectorId === 'gmail' || connectorId.includes('google') || connectorId.includes('gmail')) {
        const userId = user.id;
        const tid = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id || user.id;

        const authStart =
          `/api/integrations/google/start` +
          `?tenant_id=${encodeURIComponent(tid)}` +
          `&user_id=${encodeURIComponent(userId)}`;

        // Abrir popup en vez de salir de la página
        const popup = window.open(authStart, "botz-oauth", "width=520,height=720");

        // Vigilar cuando el popup cierre para refrescar integraciones
        const pollTimer = window.setInterval(() => {
          if (!popup || popup.closed) {
            window.clearInterval(pollTimer);
            // Refrescar integraciones al cerrar popup
            loadUserIntegrations();
            pushNotice("info", "Verificando conexión de Gmail...");
          }
        }, 1000);

        setConnectBusy(null);
        return;
      }

           // ✅ META: abre modal en vez de QR
      if (connectorId === "whatsapp_business") {
        // Si no hay tenantId aún, intenta resolverlo desde subscriptions
        let tid = tenantId;

        if (!tid) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("tenant_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

          tid = (sub as any)?.tenant_id || "";
          if (tid) setTenantId(tid);
        }

        if (!tid) {
          pushNotice("error", "No se encontró tenantId para conectar Meta");
          setConnectError("No se encontró tenantId para conectar Meta");
          setConnectBusy(null);
          return;
        }

        setShowMetaModal(true);
        setConnectBusy(null);
        return;
      }

      // Lead Scoring: redirigir a configuración completa
      if (connectorId === "lead_scoring") {
        window.location.href = "/settings";
        setConnectBusy(null);
        return;
      }
 
      // ---------------------------------------------------------

      // Aquí sigue el resto de tu lógica para otros conectores.
      const connector = connectors.find(c => c.id === connectorId);
      const channelType = connectorId.includes('whatsapp') ? 'whatsapp' : 
                         connectorId.includes('gmail') ? 'gmail' : 
                         connectorId.includes('outlook') ? 'outlook' : 
                         connectorId.includes('meta') ? 'meta' : connectorId;

      if (connector?.type === "qr") {
        const qrInstructions =
          language === "en"
            ? [
                "1. Open WhatsApp on your phone",
                "2. Tap the three dots ••• (Android) or Settings (iOS)",
                "3. Select 'Linked devices'",
                "4. Tap 'Link a device'",
                "5. Scan this QR code with your camera",
              ]
            : [
                "1. Abre WhatsApp en tu teléfono",
                "2. Toca los tres puntos ••• (Android) o Configuración (iOS)",
                "3. Selecciona 'Dispositivos vinculados'",
                "4. Pulsa 'Vincular un dispositivo'",
                "5. Escanea este código QR con la cámara",
              ];

        const qrSteps =
          language === "en"
            ? [
                { icon: <Smartphone size={18} />, text: "Open WhatsApp on your phone" },
                { icon: <QrCode size={18} />, text: "Go to Linked devices" },
                { icon: <CheckCircle2 size={18} />, text: "Scan the QR code" },
                { icon: <Bot size={18} />, text: "Done! Botz will sync automatically" },
              ]
            : [
                { icon: <Smartphone size={18} />, text: "Abre WhatsApp en tu móvil" },
                { icon: <QrCode size={18} />, text: "Ve a Dispositivos vinculados" },
                { icon: <CheckCircle2 size={18} />, text: "Escanea el código QR" },
                { icon: <Bot size={18} />, text: "¡Listo! Botz sincronizará automáticamente" },
              ];

        setQrModal({
          open: true,
          title: connectorName || "WhatsApp",
          connectorType: connectorId,
          qrDataUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=BOTZ_WHATSAPP_${Date.now()}_USER_${user.id}`,
          instructions: qrInstructions,
          steps: qrSteps,
          status: 'scanning',
          connectionDetails: {
            userId: user.id,
            connectorType: connectorId,
            timestamp: new Date().toISOString(),
          }
        });
        
        setTimeout(async () => {
          try {
            setQrModal(prev => ({ ...prev, status: 'connected' }));
            
            setTimeout(async () => {
              const { data: integration, error } = await supabase
                .from('integrations')
                .upsert(
                  {
                  user_id: user.id,
                  channel_type: channelType,
                  provider: connectorId,
                  credentials: { 
                    instanceName: `whatsapp_${Date.now()}`,
                    connectedAt: new Date().toISOString(),
                    phoneNumber: "Usuario WhatsApp"
                  },
                  status: 'connected',
                  last_activity: new Date().toISOString(),
                  metadata: {
                    connectionMethod: 'qr',
                    connectedAt: new Date().toISOString(),
                    deviceType: 'mobile'
                  }
                }, {
                  onConflict: 'user_id,channel_type,provider'
                })
                .select('id')
                .single();

              if (error) throw error;

              await supabase
                .from('channel_activities')
                .insert({
                  integration_id: integration?.id,
                  type: 'connection',
                  content: `${connectorName || channelType} conectado exitosamente`,
                  metadata: { 
                    status: 'connected', 
                    method: 'qr',
                    timestamp: new Date().toISOString()
                  }
                });

              await loadUserIntegrations();
              setQrModal({ open: false });
              
            }, 2000);

          } catch (error) {
            console.error("Error guardando integración:", error);
            setQrModal(prev => ({ ...prev, status: 'error' }));
          }
        }, 5000);

} else if (connector?.type === "config") {
        // ✅ Configuración directa (Lead Scoring)
        if (connectorId === "lead_scoring") {
          // Redirigir a la página de configuración de Lead Scoring
          window.location.href = "/settings";
          return;
        }
      } else if (connector?.type === "oauth") {
        // ✅ Conexión real (requiere backend OAuth). 
        // Este frontend pide al backend un authUrl y luego espera que el callback guarde la integración en Supabase.
        setOauthModal({
          open: true,
          title: connectorName || connector?.title || channelType,
          provider: connectorId,
          step: "starting",
          message: "Preparando autenticación...",
        });

        try {
// ✅ Gmail/Google: redirigir directo al endpoint real (NO usar oauth/start genérico)
if (
  connectorId === "gmail" ||
  connectorId.includes("gmail") ||
  connectorId.includes("google")
) {
  const userId = user?.id;
  const tenantId = user?.user_metadata?.tenant_id || user?.id; 

  if (!tenantId || !userId) {
     pushNotice("error", "Falta el ID de usuario o de organización.");
     setConnectBusy(null);
     return;
  }

  const authStart =
    `/api/integrations/google/start` +
    `?tenant_id=${encodeURIComponent(tenantId)}` +
    `&user_id=${encodeURIComponent(userId)}`;

  window.open(authStart, "botz-oauth", "width=520,height=720,noopener,noreferrer");
  setConnectBusy(null);
  return;
}

          const resp = await fetch("/api/integrations/oauth/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider: connectorId }),
          });

          if (!resp.ok) throw new Error(`oauth_start_failed_${resp.status}`);

          const json = await resp.json();
          const authUrl: string | undefined = json?.authUrl;

          if (!authUrl) throw new Error("oauth_missing_authUrl");

          const popup = window.open(
            authUrl,
            "botz-oauth",
            "width=520,height=720,noopener,noreferrer"
          );

          setOauthModal({
            open: true,
            title: connectorName || connector?.title || channelType,
            provider: connectorId,
            step: "waiting",
            message:
              "Completa el inicio de sesión en la ventana emergente. Volveremos aquí cuando termine.",
          });

          if (oauthPollRef.current) window.clearInterval(oauthPollRef.current);

          const startedAt = Date.now();
          oauthPollRef.current = window.setInterval(async () => {
            try {
              const { data: row, error: qErr } = await supabase
                .from("integrations")
                .select("id,status")
                .eq("user_id", user.id)
                .eq("channel_type", channelType)
                .eq("provider", connectorId)
                .order("last_activity", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (qErr) throw qErr;

              if (row?.status === "connected") {
                if (oauthPollRef.current) window.clearInterval(oauthPollRef.current);
                oauthPollRef.current = null;

                try {
                  popup?.close();
                } catch {}

                await loadUserIntegrations();

                setOauthModal({
                  open: true,
                  title: connectorName || connector?.title || channelType,
                  provider: connectorId,
                  step: "connected",
                  message: "Conectado exitosamente ✅",
                });

                pushNotice(
                  "success",
                  `${connectorName || connector?.title || channelType} conectado exitosamente`
                );

                window.setTimeout(() => setOauthModal({ open: false }), 1200);
              }

              if (Date.now() - startedAt > 75_000) {
                if (oauthPollRef.current) window.clearInterval(oauthPollRef.current);
                oauthPollRef.current = null;

                setOauthModal({
                  open: true,
                  title: connectorName || connector?.title || channelType,
                  provider: connectorId,
                  step: "error",
                  message:
                    "No pudimos confirmar la conexión aún. Si ya autorizaste, recarga la página o intenta de nuevo.",
                });
              }
            } catch (pollErr) {
              console.error("OAuth poll error:", pollErr);
            }
          }, 2000);
        } catch (err) {
          // ✅ Sin modo demo: si falla el inicio OAuth, lo reportamos y paramos.
          console.error("OAuth backend no disponible:", err);
          setConnectError("No se pudo iniciar OAuth. Revisa /api/integrations/oauth/start y el callback.");
          pushNotice("error", "No se pudo iniciar la conexión (OAuth)");
          setOauthModal({
            open: true,
            title: connectorName || channelType,
            provider: connectorId,
            step: "error",
            message: "No se pudo iniciar OAuth. Verifica variables GOOGLE/MICROSOFT en .env y endpoints /api/integrations.",
          });
          return;
        }
        } else {
        // Canal sin backend implementado - no simular conexión falsa
        pushNotice("info", `${connectorName || channelType} estará disponible próximamente`);
      }

    } catch (error: any) {
      setConnectError(error?.message || "Error conectando");
      setQrModal(prev => ({ ...prev, status: 'error' }));
    } finally {
      setConnectBusy(null);
    }
  };

  // Función para desconectar
  const handleDisconnect = async (connectorId: string, integrationId: string) => {
    // Si el padre maneja la desconexión, delega
    if (onDisconnect) {
      onDisconnect(connectorId, integrationId);
      return;
    }

    // Validación de sesión
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setConnectError("No hay usuario autenticado");
      pushNotice("error", "Debes iniciar sesión");
      return;
    }

    setConnectError(null);
    setDisconnectBusy(integrationId);

    // ✅ Confirmación con modal (sin confirm() del navegador)
    setConfirmModal({
      open: true,
      title: `Desconectar ${connectorId}`,
      description: "Se detendrá la sincronización. Podrás reconectar cuando quieras.",
      confirmText: "Sí, desconectar",
      cancelText: "Cancelar",
      onCancel: () => {
        setConfirmModal({ open: false });
        setDisconnectBusy(null);
      },
      onConfirm: async () => {
        setConfirmModal({ open: false });

        try {
          // 1) Marcar integración como desconectando
          const { error: updateError } = await supabase
            .from("integrations")
            .update({
              status: "disconnecting",
              last_activity: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", integrationId)
            .eq("user_id", user.id);

          if (updateError) throw updateError;

          // 2) Registrar actividad
          await supabase.from("channel_activities").insert({
            integration_id: integrationId,
            type: "connection",
            content: `${connectorId} desconectándose...`,
            metadata: { status: "disconnecting" },
          });

          // 3) (Opcional) Si tienes un endpoint real para desconectar en backend, llámalo aquí.
          //    Por ahora solo dejamos el estado y refrescamos UI.
          await loadUserIntegrations();
          pushNotice("success", `${connectorId} desconectado`);
        } catch (error) {
          console.error("Error al desconectar:", error);
          setConnectError("Error al desconectar");
          pushNotice("error", "Error al desconectar");
        } finally {
          setDisconnectBusy(null);
        }
      },
    });
  };

  const handleReconnect = async (connectorId: string, connectorName?: string) => {
    if (onReconnect) {
      onReconnect(connectorId);
      return;
    }
    await handleConnect(connectorId, connectorName);
  };

  const handleOpenMapping = (connectorId: string) => {
    if (onOpenMapping) {
      onOpenMapping(connectorId);
      return;
    }
    pushNotice("info", `Mapeo de datos para ${connectorId} (en desarrollo)`);
  };

  const feed: ChannelEvent[] = useMemo(() => {
    if (events && events.length) return events;
    return remoteEvents.length > 0 ? remoteEvents : [];
  }, [events, remoteEvents]);

  const inputCardStyle: React.CSSProperties = {
    background: "var(--botz-panel)",
    borderRadius: "16px",
    padding: "16px",
    border: "1px solid var(--botz-border)",
    boxShadow: "var(--botz-shadow-2)",
  };

  const miniBtn: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: "12px",
    border: "1px solid var(--botz-border)",
    background: "var(--botz-surface-3)",
    color: "var(--botz-text)",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
  };

  const getEventIcon = (type?: string) => {
    switch (type) {
      case "message": return <MessageSquare size={14} />;
      case "email": return <Mail size={14} />;
      case "lead": return <Users size={14} />;
      case "document": return <FileText size={14} />;
      case "connection": return <Link2 size={14} />;
      case "error": return <AlertCircle size={14} />;
      default: return <MessageSquare size={14} />;
    }
  };

  // Renderizar mensajes
  const renderMessages = () => (
    <div style={{ 
      ...inputCardStyle, 
      marginTop: "16px",
      animation: "slideIn 0.3s ease"
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "24px",
        paddingBottom: "16px",
        borderBottom: "1px solid rgba(255,255,255,0.1)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#25D366",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "24px"
          }}>
            <FaWhatsapp />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: "18px" }}>
              Mensajes de WhatsApp
            </div>
            <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}>
              {selected.messages?.length || 0} mensajes sincronizados • Última sincronización: Ahora
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            style={{
              ...miniBtn,
              background: "rgba(37, 211, 102, 0.15)",
              border: "1px solid rgba(37, 211, 102, 0.3)",
            }}
     onClick={async () => {
  const { data, error } = await supabase.rpc("whoami");
  console.log("WHOAMI", data, error);

  console.log("CLICK_ACTUALIZAR_EMAILS", selected.integrationId);
  pushNotice("info", "Actualizando correos...");
  const gmailId =
  selected.integrationId ||
  (userIntegrations || []).find((i: any) => {
    const p = String(i.provider || i.channel_type || "").toLowerCase();
    return i.status === "connected" && (p === "gmail" || p === "google" || i.channel_type === "gmail");
  })?.id;

if (gmailId) await loadEmails(gmailId);

}}
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
          <button
            onClick={() => setShowMessages(false)}
            style={{
              ...miniBtn,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <X size={16} /> Volver a canales
          </button>
        </div>
      </div>

      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "16px", 
        maxHeight: "500px", 
        overflowY: "auto",
        padding: "8px"
      }}>
        {selected.messages?.length ? selected.messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              padding: "16px",
              borderRadius: "16px",
              border: `1px solid ${msg.type === 'incoming' ? 'rgba(37, 211, 102, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`,
              background: msg.type === 'incoming' 
                ? 'linear-gradient(135deg, rgba(37, 211, 102, 0.1) 0%, rgba(37, 211, 102, 0.05) 100%)' 
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
              alignSelf: msg.type === 'incoming' ? 'flex-start' : 'flex-end',
              maxWidth: "75%",
              marginLeft: msg.type === 'incoming' ? "0" : "auto",
              marginRight: msg.type === 'incoming' ? "auto" : "0",
              position: "relative",
            }}
          >
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "10px",
              paddingBottom: "8px",
              borderBottom: "1px solid rgba(255,255,255,0.05)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: msg.type === 'incoming' ? "#25D366" : "#3b82f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "12px"
                }}>
                  {msg.type === 'incoming' ? "U" : "B"}
                </div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "13px" }}>
                  {msg.type === 'incoming' ? msg.from : "Botz"}
                </div>
              </div>
              <div style={{ 
                color: msg.type === 'incoming' ? "#25D366" : "#3b82f6", 
                fontSize: "12px",
                fontWeight: 600
              }}>
                {msg.timestamp}
              </div>
            </div>
            
            <div style={{ 
              color: "#e2e8f0", 
              fontSize: "14px", 
              lineHeight: 1.6,
              marginBottom: "12px"
            }}>
              {msg.content}
            </div>
            
            <div style={{ 
              display: "flex", 
              gap: "10px", 
              justifyContent: "flex-end",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              paddingTop: "10px"
            }}>
              {msg.type === 'incoming' && (
                <>
                  <button
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      background: "rgba(34, 197, 94, 0.1)",
                      color: "#22c55e",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                    onClick={() => pushNotice("info", `Crear lead desde: ${msg.from}`)}
                  >
                    <Users size={12} />
                    Crear Lead
                  </button>
                  <button
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      background: "rgba(59, 130, 246, 0.1)",
                      color: "#3b82f6",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                    onClick={() => pushNotice("info", `Responder a: ${msg.from}`)}
                  >
                    <MessageSquare size={12} />
                    Responder
                  </button>
                </>
              )}
              <button
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#94a3b8",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
                onClick={() => pushNotice("info", "Ver detalles del mensaje")}
              >
                <Eye size={12} />
                Detalles
              </button>
            </div>
          </div>
        )) : (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#64748b",
            fontSize: "14px",
            border: "2px dashed rgba(255,255,255,0.1)",
            borderRadius: "16px"
          }}>
            <MessageSquare size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
            <div style={{ fontWeight: 600, marginBottom: "8px" }}>No hay mensajes aún</div>
            <div>Cuando recibas mensajes en WhatsApp, aparecerán aquí automáticamente.</div>
          </div>
        )}
      </div>
    </div>
  );

  // Renderizar correos
  const renderEmails = () => (
    <div style={{ 
      ...inputCardStyle, 
      marginTop: "16px",
      animation: "slideIn 0.3s ease"
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "24px",
        paddingBottom: "16px",
        borderBottom: "1px solid rgba(255,255,255,0.1)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#EA4335",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "24px"
          }}>
            <Mail size={24} />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: "18px" }}>
              Correos de {selected.name}
            </div>
            <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}>
              {(emailsByIntegration[selected.integrationId || ""]?.length || 0)} correos sincronizados
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            style={{
              ...miniBtn,
              background: "rgba(234, 67, 53, 0.15)",
              border: "1px solid rgba(234, 67, 53, 0.3)",
            }}
            onClick={async () => {
  pushNotice("info", "Actualizando correos...");
  if (selected.integrationId) await loadEmails(selected.integrationId);
}}
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
          <button
            onClick={() => setShowEmails(false)}
            style={{
              ...miniBtn,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <X size={16} /> Volver a canales
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {(emailsByIntegration[selected.integrationId || ""]?.length)
  ? emailsByIntegration[selected.integrationId || ""]!.map((email) => (

          <div
            key={email.id}
            style={{
              padding: "16px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>{email.subject}</div>
                <div style={{ color: "#94a3b8", fontSize: "12px" }}>De: {email.from}</div>
              </div>
              <div style={{ color: "#94a3b8", fontSize: "12px" }}>{email.timestamp}</div>
            </div>
            <div style={{ color: "#cbd5e1", fontSize: "13px", marginBottom: "12px" }}>{email.preview}</div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {email.hasAttachments && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#60a5fa", fontSize: "12px" }}>
                  <FileText size={12} />
                  Con adjuntos
                </div>
              )}
              <button
                style={{
                  ...miniBtn,
                  padding: "6px 12px",
                  fontSize: "11px",
                  marginLeft: "auto",
                }}
                onClick={() => setSelectedEmail(email)}
              >
                <Eye size={12} /> Ver email
              </button>
            </div>
          </div>
        )) : (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#64748b",
            fontSize: "14px",
            border: "2px dashed rgba(255,255,255,0.1)",
            borderRadius: "16px"
          }}>
            <Mail size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
            <div style={{ fontWeight: 600, marginBottom: "8px" }}>{t.noEmailsYetTitle}</div>
            <div>{t.noEmailsYetDesc(selected.name)}</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "30px",
        animation: "fadeIn 0.5s ease",
      }}
    >
      {/* Avisos UI (sin alert) */}
      {uiNotice && (
        <div
          style={{
            width: "100%",
            background:
              uiNotice.type === "error"
                ? "rgba(239,68,68,0.12)"
                : uiNotice.type === "success"
                ? "rgba(34,197,94,0.12)"
                : "rgba(59,130,246,0.12)",
            border:
              uiNotice.type === "error"
                ? "1px solid rgba(239,68,68,0.35)"
                : uiNotice.type === "success"
                ? "1px solid rgba(34,197,94,0.35)"
                : "1px solid rgba(59,130,246,0.35)",
            color:
              uiNotice.type === "error"
                ? "#fecaca"
                : uiNotice.type === "success"
                ? "#bbf7d0"
                : "#bfdbfe",
            padding: "10px 12px",
            borderRadius: "12px",
            fontSize: "13px",
          }}
        >
          {uiNotice.message}
        </div>
      )}

      {/* Error de conexión */}
      {connectError && (
        <div
          style={{
            width: "100%",
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.35)",
            color: "#fecaca",
            padding: "10px 12px",
            borderRadius: "12px",
            marginBottom: "12px",
            fontSize: "13px",
          }}
        >
          {connectError}
        </div>
      )}

      {/* Modal Confirmación */}
      {confirmModal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "18px",
          }}
          onClick={() => {
            confirmModal.onCancel?.();
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 96vw)",
              background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
              border: "1px solid rgba(148,163,184,0.18)",
              borderRadius: "20px",
              boxShadow: "0 30px 80px rgba(0,0,0,0.75)",
              padding: "24px",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ color: "#e2e8f0", fontWeight: 800, fontSize: "18px" }}>
                {confirmModal.title || t.confirm}
              </div>
              <button
                onClick={() => confirmModal.onCancel?.()}
                style={{
                  background: "rgba(148,163,184,0.12)",
                  border: "1px solid rgba(148,163,184,0.22)",
                  color: "#e2e8f0",
                  borderRadius: "12px",
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                {t.close}
              </button>
            </div>

            <div style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.6, marginBottom: "18px" }}>
              {confirmModal.description || t.areYouSure}
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => confirmModal.onCancel?.()}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(148,163,184,0.22)",
                  color: "#e2e8f0",
                  borderRadius: "14px",
                  padding: "10px 14px",
                  cursor: "pointer",
                }}
              >
                {confirmModal.cancelText || t.cancel}
              </button>
              <button
                onClick={async () => {
                  await confirmModal.onConfirm?.();
                }}
                style={{
                  background: "linear-gradient(90deg, #ef4444 0%, #fb7185 100%)",
                  border: "none",
                  color: "#0b1220",
                  fontWeight: 800,
                  borderRadius: "14px",
                  padding: "10px 14px",
                  cursor: "pointer",
                }}
              >
                {confirmModal.confirmText || t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal OAuth */}
      {oauthModal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "18px",
          }}
          onClick={() => setOauthModal({ open: false })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 96vw)",
              background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
              border: "1px solid rgba(148,163,184,0.18)",
              borderRadius: "20px",
              boxShadow: "0 30px 80px rgba(0,0,0,0.75)",
              padding: "24px",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ color: "#e2e8f0", fontWeight: 800, fontSize: "18px" }}>
                {oauthModal.title || t.connect}
              </div>
              <button
                onClick={() => setOauthModal({ open: false })}
                style={{
                  background: "rgba(148,163,184,0.12)",
                  border: "1px solid rgba(148,163,184,0.22)",
                  color: "#e2e8f0",
                  borderRadius: "12px",
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                {t.close}
              </button>
            </div>
            <div style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.6 }}>
              {oauthModal.message || t.processing}
            </div>

            {oauthModal.step === "waiting" && (
              <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  onClick={async () => {
                    await loadUserIntegrations();
                    pushNotice("info", "Verificando conexión...");
                  }}
                  style={{
                    background: "linear-gradient(90deg, #22d3ee 0%, #60a5fa 100%)",
                    border: "none",
                    color: "#0b1220",
                    fontWeight: 800,
                    borderRadius: "14px",
                    padding: "10px 14px",
                    cursor: "pointer",
                  }}
                >
                  Ya autoricé
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal QR mejorado */}
      {qrModal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "18px",
          }}
          onClick={() => qrModal.status === 'scanning' && setQrModal({ open: false })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 96vw)",
              background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
              border: "1px solid rgba(148,163,184,0.18)",
              borderRadius: "20px",
              boxShadow: "0 30px 80px rgba(0,0,0,0.75)",
              padding: "24px",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <div style={{ color: "#e2e8f0", fontWeight: 800, fontSize: "20px", marginBottom: "4px" }}>
                  {qrModal.status === 'connected' ? '✅ Conectado exitosamente' : `Conectar: ${qrModal.title}`}
                </div>
                <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                  {qrModal.status === 'connected' 
                    ? 'Tu dispositivo está sincronizado con Botz' 
                    : 'Sigue estos pasos para conectar'}
                </div>
              </div>
              <button
                onClick={() => setQrModal({ open: false })}
                style={{
                  background: "rgba(148,163,184,0.10)",
                  border: "1px solid rgba(148,163,184,0.18)",
                  color: "#e2e8f0",
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(148,163,184,0.20)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(148,163,184,0.10)"}
              >
                <X size={18} />
              </button>
            </div>

            {qrModal.status === 'scanning' ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                  {qrModal.steps?.map((step, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px",
                        borderRadius: "12px",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "8px",
                        background: "rgba(37, 211, 102, 0.15)",
                        border: "1px solid rgba(37, 211, 102, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#25D366",
                        flexShrink: 0,
                      }}>
                        {step.icon}
                      </div>
                      <div style={{ color: "#e2e8f0", fontSize: "14px" }}>{step.text}</div>
                      <div style={{ marginLeft: "auto", color: "#94a3b8", fontSize: "12px" }}>
                        {index === 0 ? "Listo" : "Pendiente"}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <div style={{ 
                    background: "white", 
                    padding: "20px", 
                    borderRadius: "16px", 
                    display: "inline-block",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                  }}>
                    <img
                      src={qrModal.qrDataUrl}
                      alt="QR Code"
                      style={{ width: "220px", height: "220px", borderRadius: "8px" }}
                    />
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "16px" }}>
                    El código QR caduca en <span style={{ color: "#fbbf24", fontWeight: 600 }}>5 minutos</span>
                  </div>
                </div>

                <div style={{
                  background: "rgba(37, 211, 102, 0.08)",
                  border: "1px solid rgba(37, 211, 102, 0.2)",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "20px",
                }}>
                  <div style={{ color: "#25D366", fontWeight: 600, fontSize: "14px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Smartphone size={16} />
                    Instrucciones detalladas
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: "13px", lineHeight: 1.6 }}>
                    {qrModal.instructions?.map((instruction, idx) => (
                      <div key={idx} style={{ marginBottom: "6px" }}>{instruction}</div>
                    ))}
                  </div>
                </div>
              </>
            ) : qrModal.status === 'connected' ? (
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <div style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                  boxShadow: "0 0 30px rgba(34, 197, 94, 0.4)",
                }}>
                  <CheckCircle2 size={40} color="#fff" />
                </div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: "22px", marginBottom: "12px" }}>
                  ¡Conectado exitosamente!
                </div>
                <div style={{ color: "#cbd5e1", fontSize: "15px", marginBottom: "8px" }}>
                  Tu {qrModal.title} ahora está sincronizado con Botz
                </div>
                <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "30px" }}>
                  Los mensajes se procesarán automáticamente y crearán leads en tu CRM
                </div>
                <button
                  onClick={() => setQrModal({ open: false })}
                  style={{
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    border: "none",
                    color: "#fff",
                    padding: "14px 32px",
                    borderRadius: "12px",
                    fontWeight: 700,
                    fontSize: "15px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 10px 30px rgba(34, 197, 94, 0.3)",
                  }}
                >
                  <ChevronRight size={18} />
                  Continuar al dashboard
                </button>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#ef4444" }}>
                <AlertCircle size={48} style={{ marginBottom: "20px" }} />
                <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
                  Error de conexión
                </div>
                <div style={{ color: "#94a3b8", fontSize: "14px" }}>
                  No se pudo conectar. Intenta de nuevo.
                </div>
              </div>
            )}

            <div style={{
              marginTop: "20px",
              padding: "12px",
              borderRadius: "12px",
              background: qrModal.status === 'scanning' 
                ? "rgba(251, 191, 36, 0.08)" 
                : qrModal.status === 'connected'
                ? "rgba(34, 197, 94, 0.08)"
                : "rgba(239, 68, 68, 0.08)",
              border: qrModal.status === 'scanning'
                ? "1px solid rgba(251, 191, 36, 0.2)"
                : qrModal.status === 'connected'
                ? "1px solid rgba(34, 197, 94, 0.2)"
                : "1px solid rgba(239, 68, 68, 0.2)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}>
              <div style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: qrModal.status === 'scanning' 
                  ? "#fbbf24" 
                  : qrModal.status === 'connected'
                  ? "#22c55e"
                  : "#ef4444",
                animation: qrModal.status === 'scanning' ? "pulse 1.5s infinite" : "none",
              }} />
              <div style={{ color: qrModal.status === 'scanning' ? "#fbbf24" : 
                          qrModal.status === 'connected' ? "#22c55e" : "#ef4444", 
                          fontSize: "13px" }}>
                {qrModal.status === 'scanning' 
                  ? t.scanQrToContinue
                  : qrModal.status === 'connected'
                  ? t.deviceConnectedSynced
                  : t.connectionFailed}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <div
        style={{
          background: "rgba(10, 15, 30, 0.6)",
          borderRadius: "20px",
          padding: "24px",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#fff",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Zap color="#fbbf24" /> {t.ecosystemTitle}
          </h2>
          <p style={{ color: "#8b949e" }}>
            {t.ecosystemDesc}
          </p>
        </div>

        <div
          style={{
            background: "rgba(34, 197, 94, 0.1)",
            color: "#22c55e",
            padding: "10px 16px",
            borderRadius: "999px",
            fontWeight: "bold",
            border: "1px solid rgba(34, 197, 94, 0.2)",
          }}
        >
          {t.connectionCenter}
        </div>
      </div>

      {/* WHATSAPP CARD */}
      <div style={{
        background: "linear-gradient(135deg, rgba(37, 211, 102, 0.1) 0%, rgba(0, 100, 50, 0.1) 100%)",
        borderRadius: "20px",
        padding: "24px",
        border: "2px solid rgba(37, 211, 102, 0.3)",
        marginTop: "-10px",
        marginBottom: "20px"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "16px",
              background: "rgba(37, 211, 102, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(37, 211, 102, 0.3)"
            }}>
              <FaWhatsapp size={32} color="#25D366" />
            </div>
            <div>
              <h3 style={{
                fontSize: "20px",
                fontWeight: "800",
                color: "#fff",
                marginBottom: "6px",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                {t.whatsappBusiness}
                {whatsappStatus?.connected && (
                  <span style={{
                    background: "rgba(34, 197, 94, 0.2)",
                    color: "#22c55e",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: "700",
                    border: "1px solid rgba(34, 197, 94, 0.3)"
                  }}>
                    {t.connectedBadge}
                  </span>
                )}
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
                {whatsappStatus?.connected 
                  ? `${whatsappStatus.provider === 'meta' ? 'Meta Cloud API' : 'Evolution API'} • ${t.activeSince} ${whatsappStatus.connected_at ? new Date(whatsappStatus.connected_at).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES') : t.today}`
                  : t.connectWhatsappHint}
              </p>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "12px" }}>
            {whatsappStatus?.connected ? (
              <>
                <button
                  onClick={handleWhatsAppDisconnect}
                  style={{
                    padding: "12px 24px",
                    borderRadius: "12px",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    fontWeight: "700",
                    cursor: "pointer",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                >
                  <LogOut size={16} />
                  {t.disconnect}
                </button>
              </>
            ) : (
              <button
                onClick={handleWhatsAppConnect}
                style={{
                  padding: "14px 28px",
                  borderRadius: "12px",
                  border: "1px solid rgba(37, 211, 102, 0.4)",
                  background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                  color: "#fff",
                  fontWeight: "800",
                  cursor: "pointer",
                  fontSize: "15px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "all 0.3s",
                  boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(37, 211, 102, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 211, 102, 0.3)";
                }}
              >
                <QrCode size={18} />
                {t.connectWhatsapp}
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABS PARA CAMBIAR VISTA - VISIBLES Y CLARAS */}
      <div style={{ 
        background: "rgba(10, 15, 30, 0.6)", 
        borderRadius: "20px", 
        padding: "20px 24px",
        border: "1px solid rgba(255,255,255,0.1)",
        marginTop: "-10px",
        marginBottom: "20px"
      }}>
        <div style={{ 
          display: "flex", 
          gap: "12px", 
          flexWrap: "wrap",
          alignItems: "center" 
        }}>
          <span style={{ 
            color: "#94a3b8", 
            fontSize: "14px", 
            fontWeight: 600,
            marginRight: "10px" 
          }}>
            {t.view}
          </span>
          
          <button
            onClick={() => { 
              setSelectedTab('channels'); 
              setShowEmails(false); 
              setShowMessages(false); 
            }}
            style={{
              padding: "12px 24px",
              borderRadius: "12px",
              border: selectedTab === 'channels' ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.12)",
              background: selectedTab === 'channels' ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)",
              color: selectedTab === 'channels' ? "#3b82f6" : "#94a3b8",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "14px",
              transition: "all 0.2s",
              minWidth: "160px",
              justifyContent: "center"
            }}
          >
            <Link2 size={18} />
            {t.connectedChannels}
          </button>
          
          {selected.connected && selected.messages && (
            <button
              onClick={() => { 
                setSelectedTab('messages'); 
                setShowMessages(true); 
                setShowEmails(false); 
              }}
              style={{
                padding: "12px 24px",
                borderRadius: "12px",
                border: showMessages ? "2px solid #25D366" : "1px solid rgba(255,255,255,0.12)",
                background: showMessages ? "rgba(37, 211, 102, 0.2)" : "rgba(255,255,255,0.05)",
                color: showMessages ? "#25D366" : "#94a3b8",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
                transition: "all 0.2s",
                minWidth: "160px",
                justifyContent: "center"
              }}
            >
              <MessageSquare size={18} />
              {t.viewMessages}
              <span style={{
                background: "rgba(37, 211, 102, 0.3)",
                color: "#fff",
                fontSize: "12px",
                padding: "2px 8px",
                borderRadius: "10px",
                marginLeft: "8px"
              }}>
                {selected.messages?.length || 0}
              </span>
            </button>
          )}
          
          {selected.id === "gmail" && selected.connected && (
            <button
              onClick={async () => { 
                setSelectedTab('emails'); 
                setShowEmails(true); 
                setShowMessages(false); 
                if (selected.integrationId) await loadEmails(selected.integrationId);
              }}
              style={{
                padding: "12px 24px",
                borderRadius: "12px",
                border: showEmails ? "2px solid #EA4335" : "1px solid rgba(255,255,255,0.12)",
                background: showEmails ? "rgba(234, 67, 53, 0.2)" : "rgba(255,255,255,0.05)",
                color: showEmails ? "#EA4335" : "#94a3b8",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
                transition: "all 0.2s",
                minWidth: "160px",
                justifyContent: "center"
              }}
            >
              <Mail size={18} />
              {t.viewEmails}
              <span style={{
                background: "rgba(234, 67, 53, 0.3)",
                color: "#fff",
                fontSize: "12px",
                padding: "2px 8px",
                borderRadius: "10px",
                marginLeft: "8px"
              }}>
                {emailsByIntegration[selected.integrationId || ""]?.length || 0}
              </span>
            </button>
          )}
          
          <div style={{ 
            marginLeft: "auto", 
            padding: "8px 16px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <div style={{ 
              color: "#94a3b8", 
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: selected.connected ? "#22c55e" : "#f87171",
                animation: selected.connected ? "pulse 2s infinite" : "none"
              }} />
              {selected.connected ? t.connectedSyncing : t.disconnected}
            </div>
          </div>
        </div>
        
        {selectedTab !== 'channels' && (
          <div style={{
            marginTop: "12px",
            padding: "10px 16px",
            background: selectedTab === 'messages' 
              ? "rgba(37, 211, 102, 0.1)" 
              : "rgba(234, 67, 53, 0.1)",
            border: selectedTab === 'messages'
              ? "1px solid rgba(37, 211, 102, 0.2)"
              : "1px solid rgba(234, 67, 53, 0.2)",
            borderRadius: "10px",
            color: selectedTab === 'messages' ? "#25D366" : "#EA4335",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            {selectedTab === 'messages' ? (
              <>
                <MessageSquare size={16} />
                <span>{t.whatsappConvosHint}</span>
              </>
            ) : (
              <>
                <Mail size={16} />
                <span>{t.emailsHint}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mostrar mensajes o correos si están seleccionados */}
      {showMessages && selected.connected && renderMessages()}
      {showEmails && selected.connected && renderEmails()}

      {/* DIAGRAMA + PANEL (solo si no estamos viendo mensajes/correos) */}
      {!showMessages && !showEmails && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 80px 1fr",
            alignItems: "stretch",
            gap: "20px",
          }}
        >
          {/* IZQUIERDA: FUENTES */}
          <div style={{ ...inputCardStyle }}>
            <div style={{ color: "#94a3b8", fontWeight: 800, letterSpacing: "0.12em", fontSize: "12px", textAlign: "center", marginBottom: "16px" }}>
              {t.trafficSources}
            </div>

            {loading ? (
              <div style={{ 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                padding: "60px",
                color: "#94a3b8",
                fontSize: "14px",
                flexDirection: "column",
                gap: "16px"
              }}>
                <Loader2 size={32} className="animate-spin" />
                <span>{t.loadingChannels}</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {channelsBase.map((c) => {
                  const isActive = c.id === selectedId;
                  const isBusy = connectBusy === c.id;
                  const isDisconnecting = disconnectBusy === c.id;
                  const isDisabled = !!(c as any).disabled;
                  const integration = userIntegrations.find(i => i.id === c.integrationId);
                  
                  return (
                    <button
                      key={c.id}
                      onClick={() => !isBusy && !isDisconnecting && !isDisabled && setSelectedId(c.id)}
                      disabled={isBusy || isDisconnecting || isDisabled}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "14px 16px",
                        borderRadius: "16px",
                        border: isDisabled ? "1px solid rgba(255,255,255,0.05)" : isActive ? `1px solid ${c.color || "rgba(99,102,241,0.6)"}` : "1px solid rgba(255,255,255,0.10)",
                        background: isDisabled ? "rgba(255,255,255,0.02)" : isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                        color: isDisabled ? "#475569" : "#fff",
                        cursor: isDisabled ? "default" : isBusy || isDisconnecting ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        opacity: isDisabled ? 0.45 : isBusy || isDisconnecting ? 0.7 : 1,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => !isDisabled && !isBusy && !isDisconnecting && (e.currentTarget.style.background = isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)")}
                      onMouseLeave={(e) => !isDisabled && !isBusy && !isDisconnecting && (e.currentTarget.style.background = isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)")}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ fontSize: "22px", color: isDisabled ? "#475569" : c.color || "#fff" }}>
                          {isBusy ? <Loader2 size={22} className="animate-spin" /> : 
                           isDisconnecting ? <Loader2 size={22} className="animate-spin" /> : c.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "15px" }}>{c.name}</div>
                          <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>
                            {isDisabled ? t.comingSoon : `${c.lastEvent || "-"} • ${c.lastEventAt || "-"}`}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            padding: "6px 10px",
                            borderRadius: "999px",
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: isDisabled ? "rgba(100,116,139,0.1)" :
                                      isBusy ? "rgba(251,191,36,0.12)" : 
                                      isDisconnecting ? "rgba(251,191,36,0.12)" :
                                      c.connected ? "rgba(34,197,94,0.12)" : "rgba(248,113,113,0.10)",
                            color: isDisabled ? "#64748b" :
                                  isBusy ? "#fbbf24" : 
                                  isDisconnecting ? "#fbbf24" :
                                  c.connected ? "#22c55e" : "#f87171",
                          }}
                        >
                          {isDisabled ? t.comingSoon :
                           isBusy ? t.connecting : 
                           isDisconnecting ? t.disconnecting : 
                           c.connected ? t.connected : t.disconnected}
                        </div>
                        {!isDisabled && (
                        <div style={{ color: "#cbd5e1", fontSize: "12px" }}>
                          {t.leadsToday} <span style={{ color: "#fff", fontWeight: 800 }}>{c.leadsToday ?? 0}</span>
                        </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* CENTRO: FLECHAS */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "20px", alignItems: "center" }}>
            {[1, 2, 3].map((i) => (
              <ArrowRight key={i} color="rgba(255,255,255,0.5)" size={28} />
            ))}
          </div>

          {/* DERECHA: BOTZ CORE + CONECTORES */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Botz Core */}
            <div
              style={{
                background: "linear-gradient(135deg, #4f46e5, #9333ea)",
                borderRadius: "20px",
                padding: "24px",
                border: "1px solid rgba(255,255,255,0.15)",
                boxShadow: "0 20px 60px rgba(79,70,229,0.25)",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    boxShadow: "0 0 20px rgba(255,255,255,0.35)",
                  }}
                >
                  <Bot size={30} />
                </div>
                <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#fff", margin: 0 }}>Botz Core</h3>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", marginTop: "10px", marginBottom: 0 }}>
                  {t.botzCoreDesc1}<br />
                  <span style={{ opacity: 0.95 }}>
                    {t.selectedSource} <strong>{selected?.name}</strong>
                  </span>
                </p>
              </div>
            </div>

            {/* Panel rápido del canal seleccionado */}
            <div style={{ ...inputCardStyle }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 900, fontSize: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: selected?.color || "#fff", fontSize: "18px" }}>
                      {connectBusy === selected?.id ? <Loader2 size={18} className="animate-spin" /> : 
                       disconnectBusy === selected?.id ? <Loader2 size={18} className="animate-spin" /> : selected?.icon}
                    </span>
                    {selected?.name} · {t.statusLabel}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "6px" }}>
                    {selected?.connected ? t.statusConnectedDesc : t.statusDisconnectedDesc}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {selected.connected ? (
                    <>
                      <button
                        onClick={() => selected.integrationId && handleDisconnect(selected.id, selected.integrationId)}
                        disabled={disconnectBusy === selected?.id}
                        style={{
                          ...miniBtn,
                          background: disconnectBusy === selected?.id ? "rgba(251,191,36,0.15)" : "rgba(239,68,68,0.15)",
                          border: disconnectBusy === selected?.id ? "1px solid rgba(251,191,36,0.35)" : "1px solid rgba(239,68,68,0.35)",
                          cursor: disconnectBusy === selected?.id ? "not-allowed" : "pointer",
                        }}
                      >
                        {disconnectBusy === selected?.id ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            {t.disconnecting}
                          </>
                        ) : (
                          <>
                            <LogOut size={16} />
                            {t.disconnect}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleReconnect(selected.id, selected.name)}
                        disabled={connectBusy === selected?.id}
                        style={{
                          ...miniBtn,
                          background: connectBusy === selected?.id ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.06)",
                          border: connectBusy === selected?.id ? "1px solid rgba(251,191,36,0.35)" : "1px solid rgba(255,255,255,0.12)",
                          cursor: connectBusy === selected?.id ? "not-allowed" : "pointer",
                        }}
                      >
                        {connectBusy === selected?.id ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            {t.connecting}
                          </>
                        ) : (
                          <>
                            <RefreshCw size={16} />
                            {t.reconnect}
                          </>
                        )}
                      </button>
                       {selected.messages && (
                         <button
                          onClick={() => { 
                            setSelectedTab('messages'); 
                            setShowMessages(true); 
                            setShowEmails(false); 
                          }}
                          style={{
                            ...miniBtn,
                            background: "rgba(37, 211, 102, 0.15)",
                            border: "1px solid rgba(37, 211, 102, 0.3)",
                          }}
                         >
                           <MessageSquare size={16} />
                           {t.viewMessages}
                         </button>
                       )}
                     {selected.id === "gmail" && selected.connected && (
                        <button
                          onClick={async () => { 
                            setSelectedTab('emails'); 
                            setShowEmails(true); 
                            setShowMessages(false); 
                            if (selected.integrationId) await loadEmails(selected.integrationId);
                          }}
                          style={{
                            ...miniBtn,
                            background: "rgba(234, 67, 53, 0.15)",
                            border: "1px solid rgba(234, 67, 53, 0.3)",
                          }}
                        >
                          <Mail size={16} />
                          {t.viewEmails}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleConnect(selected.id, selected.name)}
                        disabled={connectBusy === selected?.id}
                        style={{
                          ...miniBtn,
                          background: connectBusy === selected?.id 
                            ? "rgba(251,191,36,0.15)" 
                            : "rgba(59,130,246,0.15)",
                          border: connectBusy === selected?.id 
                            ? "1px solid rgba(251,191,36,0.35)" 
                            : "1px solid rgba(59,130,246,0.35)",
                          cursor: connectBusy === selected?.id ? "not-allowed" : "pointer",
                        }}
                      >
                        {connectBusy === selected?.id ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            {t.connecting}
                          </>
                        ) : (
                          <>
                            <Link2 size={16} />
                            {t.connect}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenMapping(selected.id)}
                        style={{
                          ...miniBtn,
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        <FolderOpen size={16} />
                        {t.mapping}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Detalles del estado */}
              <div style={{ 
                marginTop: "16px", 
                padding: "16px", 
                borderRadius: "12px", 
                background: selected.connected 
                  ? "rgba(34,197,94,0.08)" 
                  : "rgba(148,163,184,0.08)",
                border: selected.connected 
                  ? "1px solid rgba(34,197,94,0.2)" 
                  : "1px solid rgba(148,163,184,0.2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <div style={{ 
                    color: selected.connected ? "#22c55e" : "#94a3b8", 
                    fontSize: "13px", 
                    fontWeight: 600 
                  }}>
                    {selected.connected ? t.syncActive : t.waitingConnection}
                  </div>
                  <div style={{ 
                    color: selected.connected ? "#bbf7d0" : "#cbd5e1", 
                    fontSize: "12px", 
                    marginTop: "4px" 
                  }}>
                    {selected.connected
                      ? t.leadsAutoCreated
                      : t.connectToStartShort}
                  </div>
                </div>
                {selected.connected && (
                  <button
                    onClick={() => pushNotice("info", t.openingCrm)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "10px",
                      background: "rgba(59,130,246,0.15)",
                      border: "1px solid rgba(59,130,246,0.3)",
                      color: "#3b82f6",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <ExternalLink size={14} />
                    {t.viewInCrm}
                  </button>
                )}
              </div>

              {/* Estadísticas */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr", 
                gap: "12px", 
                marginTop: "16px" 
              }}>
                <div style={{ 
                  padding: "12px", 
                  borderRadius: "10px", 
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}>
                  <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 600 }}>{t.leadsTodayUpper}</div>
                  <div style={{ color: "#fff", fontSize: "20px", fontWeight: 800, marginTop: "4px" }}>
                    {selected.leadsToday || 0}
                  </div>
                </div>
                <div style={{ 
                  padding: "12px", 
                  borderRadius: "10px", 
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}>
                  <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 600 }}>{t.lastEventUpper}</div>
                  <div style={{ color: "#fff", fontSize: "12px", fontWeight: 600, marginTop: "4px" }}>
                    {selected.lastEvent || "-"}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "2px" }}>
                    {selected.lastEventAt || "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* Conectores disponibles */}
            <div style={{ ...inputCardStyle }}>
              <div style={{ color: "#94a3b8", fontWeight: 800, letterSpacing: "0.12em", fontSize: "12px", textAlign: "center", marginBottom: "16px" }}>
                {t.availableConnectors}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {connectors
                  .filter(conn => conn.id.includes(selected.id) || 
                                  (selected.id === 'whatsapp' && conn.id.includes('whatsapp')) ||
                                  (selected.id === 'gmail' && (conn.id.includes('gmail') || conn.id === 'google_ads')) ||
                                  (selected.id === 'meta' && conn.id.includes('meta')))
                  .map((connector) => (
                    <button
                      key={connector.id}
                      onClick={() => {
  // Si está deshabilitado, no hacer nada
  if ((connector as any).disabled) return;

  const id = String(connector.id || "").toLowerCase();
  const title = String(connector.title || "").toLowerCase();

  // ✅ SOLO WhatsApp: decide si es Meta o Evolution
  if (id.includes("whatsapp")) {
    const isMeta =
      id.includes("meta") ||
      id.includes("business") ||
      id.includes("api") ||
      title.includes("business") ||
      title.includes("api");

    setWaProvider(isMeta ? "meta" : "evolution");

    if (isMeta) {
      setShowMetaModal(true);
    } else {
      setShowWhatsAppModal(true);
    }
    return;
  }

  // ✅ TODO lo demás (Gmail incluido) sigue igual
  handleConnect(connector.id, connector.title);
}}

                      disabled={connectBusy === connector.id || !!(connector as any).disabled}
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        borderRadius: "14px",
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: (connector as any).disabled
                          ? "rgba(255,255,255,0.02)"
                          : connectBusy === connector.id 
                            ? "rgba(251,191,36,0.10)" 
                            : "rgba(255,255,255,0.04)",
                        color: (connector as any).disabled ? "#64748b" : "#fff",
                        textAlign: "left",
                        cursor: (connector as any).disabled ? "default" : connectBusy === connector.id ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        opacity: (connector as any).disabled ? 0.5 : connectBusy === connector.id ? 0.7 : 1,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => !(connector as any).disabled && connectBusy !== connector.id && (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                      onMouseLeave={(e) => !(connector as any).disabled && connectBusy !== connector.id && (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    >
                      <div style={{ 
                        color: (connector as any).disabled ? "#475569" : connector.color, 
                        fontSize: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {connectBusy === connector.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          connector.icon
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                          {connector.title}
                          {(connector as any).disabled && (
                            <span style={{
                              fontSize: "10px",
                              fontWeight: 600,
                              background: "rgba(100, 116, 139, 0.2)",
                              color: "#94a3b8",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}>
                              {t.comingSoon}
                            </span>
                          )}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>{(connector as any).disabled ? "" : connector.subtitle}</div>
                      </div>
                      <div style={{ 
                        fontSize: "12px", 
                        fontWeight: 600, 
                        color: connector.color,
                        padding: "4px 10px",
                        borderRadius: "8px",
                        background: connectBusy === connector.id 
                          ? "rgba(251,191,36,0.15)" 
                          : "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)"
                      }}>
                        {connector.type === 'qr' ? 'QR' : 
                         connector.type === 'oauth' ? 'OAuth' : 'API'}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FEED DE EVENTOS (solo si no estamos viendo mensajes/correos) */}
      {!showMessages && !showEmails && (
        <div style={{ ...inputCardStyle }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Calendar size={18} />
                {t.recentActivity}
              </div>
              <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                {t.recentActivityDesc}
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={loadUserIntegrations}
                style={{
                  ...miniBtn,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <RefreshCw size={16} />
                {t.refresh}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {feed.length > 0 ? feed.map((event) => (
              <div
                key={event.id}
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div style={{ 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "10px", 
                  background: event.status === 'ok' 
                    ? "rgba(34,197,94,0.15)" 
                    : event.status === 'warn'
                    ? "rgba(251,191,36,0.15)"
                    : "rgba(239,68,68,0.15)",
                  border: event.status === 'ok'
                    ? "1px solid rgba(34,197,94,0.3)"
                    : event.status === 'warn'
                    ? "1px solid rgba(251,191,36,0.3)"
                    : "1px solid rgba(239,68,68,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: event.status === 'ok'
                    ? "#22c55e"
                    : event.status === 'warn'
                    ? "#fbbf24"
                    : "#ef4444",
                  flexShrink: 0,
                }}>
                  {getEventIcon(event.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>{event.title}</div>
                  <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>{event.detail}</div>
                </div>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px",
                  flexShrink: 0 
                }}>
                  <div style={{ 
                    color: "#94a3b8", 
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)"
                  }}>
                    {event.at}
                  </div>
                  {event.channelId && (
                    <div style={{ 
                      color: "#fff", 
                      fontSize: "12px",
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: "8px",
                      background: channelsBase.find(c => c.id === event.channelId)?.color 
                        ? `rgba(${parseInt(channelsBase.find(c => c.id === event.channelId)?.color?.slice(1,3) || '0', 16)}, ${parseInt(channelsBase.find(c => c.id === event.channelId)?.color?.slice(3,5) || '0', 16)}, ${parseInt(channelsBase.find(c => c.id === event.channelId)?.color?.slice(5,7) || '0', 16)}, 0.15)`
                        : "rgba(255,255,255,0.04)",
                      border: channelsBase.find(c => c.id === event.channelId)?.color 
                        ? `1px solid ${channelsBase.find(c => c.id === event.channelId)?.color}40`
                        : "1px solid rgba(255,255,255,0.08)"
                    }}>
                      {channelsBase.find(c => c.id === event.channelId)?.name || event.channelId}
                    </div>
                  )}
                </div>
              </div>
            )) : (
              <div style={{ 
                textAlign: "center", 
                padding: "40px 20px", 
                color: "#64748b", 
                fontSize: "14px",
                border: "2px dashed rgba(255,255,255,0.1)",
                borderRadius: "16px"
              }}>
                <Calendar size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
                <div style={{ fontWeight: 600, marginBottom: "8px" }}>No hay actividad aún</div>
                <div>Cuando conectes canales, verás aquí los eventos de sincronización.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estilos CSS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>

      {/* 🔥 MODAL: Detalle de Email */}
      {selectedEmail && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.2s",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedEmail(null);
            }
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: "24px",
              padding: "32px",
              maxWidth: "700px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#fff" }}>
                {selectedEmail.subject}
              </h3>
              <button
                onClick={() => setSelectedEmail(null)}
                style={{
                  ...miniBtn,
                  padding: "8px",
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "8px" }}>
                <strong>De:</strong> {selectedEmail.from}
              </div>
              <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                <strong>Fecha:</strong> {selectedEmail.timestamp}
              </div>
            </div>

            <div style={{ 
              background: "rgba(255,255,255,0.03)", 
              padding: "20px", 
              borderRadius: "12px", 
              marginBottom: "24px",
              color: "#cbd5e1",
              fontSize: "14px",
              lineHeight: "1.6"
            }}>
              {selectedEmail.preview}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  setReplyModal({
                    open: true,
                    to: selectedEmail.from,
                    subject: `Re: ${selectedEmail.subject}`,
                    body: "",
                  });
                  setSelectedEmail(null);
                }}
                style={{
                  ...miniBtn,
                  background: "#3b82f6",
                  color: "#fff",
                  flex: 1,
                }}
              >
                <Mail size={16} />
                Responder
              </button>
              <button
                onClick={() => setSelectedEmail(null)}
                style={{
                  ...miniBtn,
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff",
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 MODAL: Responder Email */}
      {replyModal.open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.2s",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setReplyModal({ open: false, to: "", subject: "", body: "" });
            }
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: "24px",
              padding: "32px",
              maxWidth: "600px",
              width: "90%",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
                Responder Email
              </h3>
              <button
                onClick={() => setReplyModal({ open: false, to: "", subject: "", body: "" })}
                style={{
                  ...miniBtn,
                  padding: "8px",
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "13px", marginBottom: "8px", fontWeight: 600 }}>
                  Para:
                </label>
                <input
                  type="email"
                  value={replyModal.to}
                  onChange={(e) => setReplyModal({ ...replyModal, to: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "13px", marginBottom: "8px", fontWeight: 600 }}>
                  Asunto:
                </label>
                <input
                  type="text"
                  value={replyModal.subject}
                  onChange={(e) => setReplyModal({ ...replyModal, subject: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "13px", marginBottom: "8px", fontWeight: 600 }}>
                  Mensaje:
                </label>
                <textarea
                  value={replyModal.body}
                  onChange={(e) => setReplyModal({ ...replyModal, body: e.target.value })}
                  rows={8}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  onClick={() => setReplyModal({ open: false, to: "", subject: "", body: "" })}
                  style={{
                    ...miniBtn,
                    background: "rgba(255,255,255,0.1)",
                    color: "#fff",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={sendingReply}
                  style={{
                    ...miniBtn,
                    background: sendingReply ? "rgba(59,130,246,0.5)" : "#3b82f6",
                    color: "#fff",
                  
                    cursor: sendingReply ? "not-allowed" : "pointer",
                  }}
                >
                  {sendingReply ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      Enviar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Connect Modal */}
      {showWhatsAppModal && (
        <WhatsAppConnectModal
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          tenantId={tenantId}
          onConnected={checkWhatsAppStatus}
        />
      )}
            {/* WhatsApp Meta Connect Modal */}
      {showMetaModal && (
        <WhatsAppMetaConnectModal
          isOpen={showMetaModal}
          onClose={() => setShowMetaModal(false)}
          tenantId={tenantId}
          onSaved={() => {
            setShowMetaModal(false);
            // opcional: refrescar para reflejar estado
            window.location.reload();
          }}
        />
      )}

    </div>
  );
}
