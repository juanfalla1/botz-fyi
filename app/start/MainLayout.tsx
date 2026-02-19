"use client";

import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import TextRotator from "../components/TextRotator";
import {
  BrainCircuit,
  Play,
  Calculator,
  Globe,
  Users,
  BarChart3,
  Settings,
  Zap,
  X,
  Filter,
  KanbanSquare,
  Plus,
  MoreHorizontal,
  Phone,
  MessageCircle,
  Calendar,
  Trash2,
  Inbox,
  Lock,
  Crown,
  Languages,
  Check,
  Sparkles,
  ChevronRight,
  LogOut,
  User,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Home,
  Bot,
  Building2,
 } from "lucide-react";
import { supabase } from "../supabaseClient"; // Ajusta la ruta según tu proyecto
// AuthModal is rendered once in start/page.tsx.
import ActionsDock from "./components/ActionsDock"; // Ajusta la ruta según tu estructura
import DemoTrialBanner from "../components/DemoTrialBanner"; // ✅ NUEVO: Banner de demo trial

// ============================================================================
// ✅ TIPOS Y CONFIGURACIÓN DE PLANES
// ============================================================================

// ✅ REGLA: si el usuario tiene cualquier plan (no "free"), se habilita TODO lo bloqueado.
const ALL_FEATURES: string[] = [
  "demo",
  "hipoteca",
  "channels",
  "agents",
  "n8n-config",
  "crm",
  "sla",
  "kanban",
];

// Planes disponibles y sus features habilitadas
const PLAN_FEATURES: Record<string, string[]> = {
  free: ["demo"],

  // ✅ Cualquier plan pagado: todo habilitado
  "Básico": ALL_FEATURES,
  "Basico": ALL_FEATURES,   // ✅ AGREGA ESTA LÍNEA
  Growth: ALL_FEATURES,
  "A la Medida": ALL_FEATURES,
  Enterprise: ALL_FEATURES,
  Administrator: ALL_FEATURES,
};

// Mapeo de features a planes mínimos requeridos (para mostrar en modal)
const FEATURE_MIN_PLAN: Record<string, string> = {
  demo: "free",
  hipoteca: "Growth",
  channels: "Básico",
  agents: "Básico",
  "n8n-config": "A la Medida",
  crm: "Growth",
  sla: "A la Medida",
  kanban: "Growth",
};


// Labels amigables para las features
const FEATURE_LABELS: Record<string, string> = {
  demo: "Operación en Vivo",
  hipoteca: "Motor Hipotecario",
  channels: "Gestión de Canales",
  agents: "Agentes IA",
  crm: "CRM en Vivo",
  kanban: "Tablero Kanban",
  sla: "Alertas SLA",
  "n8n-config": "Dashboard Ejecutivo",
};

type AppLanguage = "es" | "en";

type AppTheme = "dark" | "light";

const UI_TEXT: Record<AppLanguage, Record<string, string>> = {
  es: {
    liveOps: "Operación en Vivo",
    mortgageCalc: "Cálculo Hipotecario",
    channels: "Canales",
    agentsTab: "Agentes IA",
    execDashboard: "Dashboard Ejecutivo",
    crmLive: "CRM en Vivo",
    slaAlerts: "Alertas SLA",
    kanban: "Kanban",
    signIn: "Iniciar Sesión",
    loading: "Cargando...",
    connectedAs: "Conectado como",
    activeSince: "Activo desde",
    refreshState: "Refrescar estado",
    refreshing: "Actualizando...",
    updatePlan: "Actualizar Plan",
    viewPlan: "Ver mi Plan",
    logout: "Cerrar Sesión",
    language: "Idioma",
    planFree: "Plan Gratuito",
    freeShort: "Gratuito",
    planLabel: "Plan",

    // Hero / Landing
    heroBadge: "AUTOMATIZACIÓN INTELIGENTE + HIPOTECARIO",
    heroTitleLine1: "Convierte Más Leads en",
    heroTitleLine2: "Hipotecas Firmadas",
    heroSubtitle: "WhatsApp, Meta Ads, Instagram, Google y más. Automatiza tu atención al cliente, captura leads y calcula hipotecas con nuestra plataforma todo-en-uno.",
    heroPrimaryCta: "Probar Demo",
    heroSecondaryCta: "Adquiere tu mejor solución",
    realtimeConnection: "Conexión en tiempo real",
    statusActive: "ACTIVO",
    statChannels: "Canales",
    statAvailability: "Disponibilidad",
    statSmartCalc: "Cálculo Inteligente",
    plusMortgage: "+Hipoteca",
    backToHome: "Volver al Inicio",
    footerTagline: "Automatización Inteligente",
  },
  en: {
    liveOps: "Live Operations",
    mortgageCalc: "Mortgage Calculator",
    channels: "Channels",
    agentsTab: "AI Agents",
    execDashboard: "Executive Dashboard",
    crmLive: "Live CRM",
    slaAlerts: "SLA Alerts",
    kanban: "Kanban",
    signIn: "Sign In",
    loading: "Loading...",
    connectedAs: "Connected as",
    activeSince: "Active since",
    refreshState: "Refresh status",
    refreshing: "Refreshing...",
    updatePlan: "Upgrade Plan",
    viewPlan: "View my Plan",
    logout: "Sign Out",
    language: "Language",
    planFree: "Free Plan",
    freeShort: "Free",
    planLabel: "Plan",

    // Hero / Landing
    heroBadge: "SMART AUTOMATION + MORTGAGE",
    heroTitleLine1: "Turn More Leads Into",
    heroTitleLine2: "Signed Mortgages",
    heroSubtitle: "WhatsApp, Meta Ads, Instagram, Google and more. Automate customer support, capture leads, and run mortgage calculations with our all-in-one platform.",
    heroPrimaryCta: "Try Demo",
    heroSecondaryCta: "Get The Best Solution",
    realtimeConnection: "Real-time connection",
    statusActive: "ACTIVE",
    statChannels: "Channels",
    statAvailability: "Availability",
    statSmartCalc: "Smart Calculation",
    plusMortgage: "+Mortgage",
    backToHome: "Back to Home",
    footerTagline: "Smart Automation",
  },
};

// Lista de estados del CRM
const CRM_STATES = [
  "Prospecto Nuevo",
  "Contactado",
  "Interesado",
  "Documentación",
  "En Análisis",
  "Pre-Aprobado",
  "Buscando Inmueble",
  "En Trámite",
  "Firmado (Venta)",
  "Rechazado",
];

// ============================================================================
// ✅ CONTEXTO DE AUTENTICACIÓN Y SUSCRIPCIÓN
// ============================================================================

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  created_at: string;
  price?: string;
  billing_cycle?: string;
}

interface AuthContextType {
  user: any | null;
  accessToken: string | null;
  userPlan: string;
  subscription: SubscriptionData | null;
  loading: boolean;
  logout: () => Promise<void>;
  hasFeatureAccess: (featureId: string) => boolean;
  refreshSubscription: () => Promise<void>;
  enabledFeatures: string[];
  // ✅ NUEVO: Sistema de roles
  userRole: 'admin' | 'asesor' | null;
  isAdmin: boolean;
  isAsesor: boolean;
  isPlatformAdmin: boolean;
  teamMemberId: string | null;
  tenantId: string | null;
  // ✅ Platform Admin: selector de tenant (filtro de vista)
  platformTenantId: string | null;
  setPlatformTenantId: (tenantId: string | null) => void;
  // ✅ Permisos finos por usuario (team_members.permissions)
  permissions: Record<string, boolean>;
  hasPermission: (perm: string) => boolean;
  // ✅ NUEVO: Sincronización global
  triggerDataRefresh: () => void;
  dataRefreshKey: number;
  // ✅ NUEVO: Force re-render cuando subscription carga
  subscriptionUpdateKey: number;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  userPlan: "free",
  subscription: null,
  loading: true,
  logout: async () => {},
  hasFeatureAccess: () => false,
  refreshSubscription: async () => {},
  enabledFeatures: ["demo"],
  // ✅ NUEVO: Valores por defecto para roles
  userRole: null,
  isAdmin: false,
  isAsesor: false,
  isPlatformAdmin: false,
  teamMemberId: null,
  tenantId: null,
  platformTenantId: null,
  setPlatformTenantId: () => {},
  permissions: {},
  hasPermission: () => false,
  // ✅ NUEVO: Sincronización global
  triggerDataRefresh: () => {},
  dataRefreshKey: 0,
  // ✅ NUEVO: Force re-render cuando subscription carga
  subscriptionUpdateKey: 0,
});

export const useAuth = () => useContext(AuthContext);

// ============================================================================
// ✅ PROVIDER DE AUTENTICACIÓN CON SUSCRIPCIÓN
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log("🚀 [Auth] AuthProvider montando...");
  const [user, setUser] = useState<any | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  
  // Log cuando loading cambia
  useEffect(() => {
    console.log("🔄 [Auth] loading cambió a:", loading);
  }, [loading]);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>(["demo"]);
  
  // ✅ NUEVO: Estados para sistema de roles
  const [userRole, setUserRole] = useState<'admin' | 'asesor' | null>(null);
  const [teamMemberId, setTeamMemberId] = useState<string | null>(null);
  const [tenantIdState, setTenantIdState] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [platformTenantId, setPlatformTenantIdState] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  // ✅ NUEVO: Sincronización global
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const [subscriptionUpdateKey, setSubscriptionUpdateKey] = useState(0);
  const triggerDataRefresh = useCallback(() => {
    console.log("🔄 [MainLayout] triggerDataRefresh ejecutado");
    setDataRefreshKey((prev) => {
      const newKey = prev + 1;
      console.log("🔄 [MainLayout] dataRefreshKey actualizado:", prev, "->", newKey);
      return newKey;
    });
    // Disparar evento global para que CRMFullView limpie su cache
    if (typeof window !== "undefined") {
      console.log("🔄 [MainLayout] Disparando evento botz-leads-refresh");
      window.dispatchEvent(new CustomEvent("botz-leads-refresh"));
    }
  }, []);

  // ✅ Función para aplicar suscripción encontrada al estado
  const applySubscription = useCallback((activeSub: any | null) => {
    if (activeSub) {
      console.log("✅ [SUB] Plan final:", activeSub.plan, "| Status:", activeSub.status);
      setSubscription(activeSub);
      const tenantPlan = activeSub.plan || "free";
      setUserPlan(tenantPlan);
      const planFeatures = PLAN_FEATURES[tenantPlan] || PLAN_FEATURES["free"];
      setEnabledFeatures(planFeatures);
      console.log("🎯 [SUB] Plan:", tenantPlan, "| Features:", planFeatures);
    } else {
      console.log("ℹ️ [SUB] No se encontró suscripción activa → plan free");
      setUserPlan("free");
      setSubscription(null);
      setEnabledFeatures(PLAN_FEATURES["free"]);
    }
    // ✅ CRÍTICO: Forzar re-render para que la UI se actualice con el plan
    setSubscriptionUpdateKey((prev) => {
      const newKey = prev + 1;
      console.log("🔄 [SUB] subscriptionUpdateKey actualizado:", prev, "->", newKey);
      return newKey;
    });
  }, []);

  const applyPlatformAdminAccess = useCallback(() => {
    setIsPlatformAdmin(true);
    setUserRole('admin');
    setTeamMemberId(null);
    setTenantIdState(null);
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('botz-platform-tenant');
      setPlatformTenantIdState(saved || null);
    }
    setSubscription({
      id: 'platform-admin',
      plan: 'Administrator',
      status: 'active',
      created_at: new Date().toISOString(),
    });
    setUserPlan('Administrator');
    setEnabledFeatures(ALL_FEATURES);
    setPermissions({
      platform_admin: true,
      view_all_leads: true,
      manage_team: true,
      manage_agents: true,
      manage_channels: true,
      view_exec_dashboard: true,
      view_sla: true,
    });
  }, []);

  const detectPlatformAdmin = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('is_platform_admin');
      if (!error) return Boolean(data);

      // Fallback: direct self-check (if RPC not available)
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return false;
      const { data: row, error: selErr } = await supabase
        .from('platform_admins')
        .select('auth_user_id')
        .eq('auth_user_id', uid)
        .maybeSingle();
      if (selErr) return false;
      return Boolean(row?.auth_user_id);
    } catch {
      return false;
    }
  }, []);

  // ✅ Función para obtener la suscripción activa del usuario
  // Recibe userId (auth) y opcionalmente tenantId (de team_members, sin RLS)
  const fetchUserSubscription = useCallback(async (userId: string, tenantId?: string | null) => {
    try {
      console.log("🔍 [SUB] Buscando suscripción | auth_user_id:", userId, "| tenant_id:", tenantId || "N/A");

      // ✅ NUEVO: Detectar si es un trial user desde auth.user_metadata
      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log("🔍 [SUB] Auth metadata:", {
        is_trial: authUser?.user_metadata?.is_trial,
        trial_end: authUser?.user_metadata?.trial_end,
        tenant_id: authUser?.user_metadata?.tenant_id,
      });
      
      if (authUser?.user_metadata?.is_trial) {
        console.log("✅ [SUB] Usuario es TRIAL - Habilitar TODAS las features");
        const trialSub = {
          id: `trial_${userId}`,
          user_id: userId,
          plan: "Básico",
          status: "trialing",
          trial_start: authUser.user_metadata.trial_start || new Date().toISOString(),
          trial_end: authUser.user_metadata.trial_end || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        };
        console.log("📦 [SUB] Trial subscription object:", trialSub);
        applySubscription(trialSub);
        return;
      }

      // ✅ CACHE: Intentar leer de localStorage primero
      const cacheKey = `botz-sub-${userId}`;
      const cachedSub = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
      if (cachedSub) {
        try {
          const parsed = JSON.parse(cachedSub);
          console.log("✅ [SUB] Cache HIT - plan:", parsed.plan);
          applySubscription(parsed);
          // Refrescar en background sin bloquear UI
          setTimeout(async () => {
            const { data: freshData } = await supabase
              .from("subscriptions")
              .select("*")
              .eq("user_id", userId)
              .in("status", ["active", "trialing"])
              .order("created_at", { ascending: false })
              .limit(1);
            if (freshData?.[0] && freshData[0].plan !== parsed.plan) {
              console.log("🔄 [SUB] Plan actualizado en background:", freshData[0].plan);
              applySubscription(freshData[0]);
              localStorage.setItem(cacheKey, JSON.stringify(freshData[0]));
            }
          }, 100);
          return;
        } catch (e) {
          console.warn("⚠️ [SUB] Cache corrupto, ignorando:", e);
        }
      }

      // ── PASO 1: Buscar suscripción directamente por user_id (funciona para admin) ──
      const { data: directData, error: directError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (directError) {
        console.error("❌ [SUB] Error buscando por user_id:", directError);
      }

      let activeSub = directData?.[0] ?? null;
      console.log("🔍 [SUB] Paso 1 (por user_id):", activeSub ? `ENCONTRADA - plan: ${activeSub.plan}` : "NO encontrada");

      // ✅ CACHE: Guardar en localStorage
      if (activeSub && typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(activeSub));
      }

      // ── PASO 2: Si no encontró por user_id Y tenemos tenant_id, buscar por tenant ──
      if (!activeSub && tenantId) {
        console.log("🏢 [SUB] Paso 2: Buscando por tenant_id:", tenantId);

        const { data: tenantSubData, error: tenantSubError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("tenant_id", tenantId)
          .in("status", ["active", "trialing"])
          .order("created_at", { ascending: false })
          .limit(1);

        if (tenantSubError) {
          console.error("❌ [SUB] Error buscando por tenant_id:", tenantSubError);
        }

        activeSub = tenantSubData?.[0] ?? null;
        console.log("🔍 [SUB] Paso 2 resultado:", activeSub ? `ENCONTRADA - plan: ${activeSub.plan}` : "NO encontrada");
      }

      // ── PASO 3: Si aún no encontró, intentar obtener tenant_id de team_members ──
      if (!activeSub && !tenantId) {
        console.log("🔄 [SUB] Paso 3: Buscando tenant_id en team_members...");

        // Buscar por auth_user_id (team_members NO tiene RLS)
        const { data: tmByAuth } = await supabase
          .from("team_members")
          .select("tenant_id, email, rol")
          .eq("auth_user_id", userId)
          .or("activo.is.null,activo.eq.true")
          .maybeSingle();

        let foundTenantId = tmByAuth?.tenant_id || null;

        if (!foundTenantId) {
          // Fallback: buscar por email
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser?.email) {
            const { data: tmByEmail } = await supabase
              .from("team_members")
              .select("id, tenant_id, auth_user_id")
              .eq("email", authUser.email)
              .or("activo.is.null,activo.eq.true")
              .maybeSingle();

            if (tmByEmail?.id && !tmByEmail?.auth_user_id) {
              try {
                await supabase
                  .from("team_members")
                  .update({ auth_user_id: userId })
                  .eq("id", tmByEmail.id)
                  .is("auth_user_id", null);
              } catch (e) {
                console.warn("⚠️ [SUB] No se pudo vincular auth_user_id al team_member:", e);
              }
            }

            foundTenantId = tmByEmail?.tenant_id || null;
          }
        }

        if (foundTenantId) {
          console.log("🏢 [SUB] tenant_id encontrado:", foundTenantId);
          const { data: tenantSubData } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("tenant_id", foundTenantId)
            .in("status", ["active", "trialing"])
            .order("created_at", { ascending: false })
            .limit(1);

          activeSub = tenantSubData?.[0] ?? null;
          console.log("🔍 [SUB] Paso 3 resultado:", activeSub ? `ENCONTRADA - plan: ${activeSub.plan}` : "NO encontrada");
        }
      }

      applySubscription(activeSub);
    } catch (error) {
      console.error("❌ [SUB] Error en fetchUserSubscription:", error);
      applySubscription(null);
    }
  }, [applySubscription]);

  // ✅ Función pública para refrescar la suscripción
  const refreshSubscription = useCallback(async () => {
    if (user?.id) {
      console.log("🔄 Refrescando suscripción...");
      await fetchUserSubscription(user.id);
    }
  }, [user?.id, fetchUserSubscription]);

  // ✅ Función para detectar rol del usuario Y retornar tenant_id
  const detectUserRole = async (authUserId: string, email: string): Promise<string | null> => {
    try {
      // Buscar primero por auth_user_id, luego por email
      let teamMember: any = null;

      // Intentar leer permissions si existe; fallback si la columna no existe.
      const trySelect = async (selectCols: string) => {
        const { data, error } = await supabase
          .from('team_members')
          .select(selectCols)
          .eq('auth_user_id', authUserId)
          .or('activo.is.null,activo.eq.true')
          .maybeSingle();
        if (error) return { data: null as any, error };
        return { data, error: null as any };
      };

      let tmByAuth: any = null;
      {
        const res = await trySelect('id, nombre, email, rol, tenant_id, auth_user_id, permissions');
        if (!res.error) tmByAuth = res.data;
        else {
          const res2 = await trySelect('id, nombre, email, rol, tenant_id, auth_user_id');
          tmByAuth = res2.data;
        }
      }

      teamMember = tmByAuth;

      if (!teamMember) {
        const trySelectByEmail = async (selectCols: string) => {
          const { data, error } = await supabase
            .from('team_members')
            .select(selectCols)
            .eq('email', email)
            .or('activo.is.null,activo.eq.true')
            .maybeSingle();
          if (error) return { data: null as any, error };
          return { data, error: null as any };
        };

        let tmByEmail: any = null;
        {
          const res = await trySelectByEmail('id, nombre, email, rol, tenant_id, auth_user_id, permissions');
          if (!res.error) tmByEmail = res.data;
          else {
            const res2 = await trySelectByEmail('id, nombre, email, rol, tenant_id, auth_user_id');
            tmByEmail = res2.data;
          }
        }

        // Autocuracion: si existe por email pero aun no esta vinculado, lo vinculamos.
        if (tmByEmail?.id && !tmByEmail?.auth_user_id) {
          try {
            await supabase
              .from('team_members')
              .update({ auth_user_id: authUserId })
              .eq('id', tmByEmail.id)
              .is('auth_user_id', null);
          } catch (e) {
            console.warn('⚠️ [ROL] No se pudo vincular auth_user_id al team_member:', e);
          }
        }

        teamMember = tmByEmail;
      }

      if (teamMember) {
        setUserRole(teamMember.rol === 'asesor' ? 'asesor' : 'admin');
        setTeamMemberId(teamMember.id);
        setTenantIdState(teamMember.tenant_id || null);
        setPermissions((teamMember as any)?.permissions && typeof (teamMember as any).permissions === 'object'
          ? (teamMember as any).permissions
          : {});
        console.log("👥 [ROL] Usuario:", teamMember.email, "| Rol:", teamMember.rol, "| tenant_id:", teamMember.tenant_id);
        return teamMember.tenant_id || null;
      } else {
        // ✅ Seguridad: si no existe en team_members, NO es admin.
        // Queda como asesor sin asignacion (sin acceso a datos) hasta activacion.
        setUserRole('asesor');
        setTeamMemberId(null);
        setPermissions({});
        // No borramos tenantId: puede venir desde user_metadata/app_metadata.
        console.warn("⚠️ [ROL] Usuario no encontrado en team_members; acceso limitado hasta activación");
        return null;
      }
    } catch (error) {
      console.error("❌ [ROL] Error detecting user role:", error);
      // ✅ Seguridad: ante error, NO elevamos privilegios.
      setUserRole('asesor');
      setTeamMemberId(null);
      setPermissions({});
      // No borramos tenantId: puede venir desde user_metadata/app_metadata.
      return null;
    }
  };

  // ✅ Verificar sesión al montar
  useEffect(() => {
    let alive = true;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;

    // Safety timeout: si loading no se resuelve en 15s, forzar false
    safetyTimer = setTimeout(() => {
      if (alive) {
        console.warn("⚠️ Safety timeout: forzando loading=false después de 15s");
        setLoading(false);
      }
    }, 15000);

    const checkSession = async () => {
      console.log("🔍 [Auth] checkSession iniciando...");
      try {
        let { data: { session } } = await supabase.auth.getSession();
        
        // ✅ SEGURIDAD: NO hay fallback de localStorage
        // Si Supabase no tiene sesión, el usuario debe hacer login nuevamente
        // Esto previene que dispositivos compartidos mantengan sesiones activas
        
        console.log("🔍 [Auth] getSession completado:", session ? "sesión encontrada" : "sin sesión");

        if (session?.access_token) {
          setAccessToken(session.access_token);
        }

        if (!alive) {
          console.log("🔍 [Auth] Componente desmontado, abortando");
          return;
        }

        if (session?.user) {
          console.log("👤 [Auth] Usuario logueado:", session.user.email);
          console.log("👤 Usuario logueado:", session.user.email);
          setUser(session.user);

          // ✅ Tenant desde metadata (registro/stripe/pricing)
          const metaTenantId =
            session.user.user_metadata?.tenant_id ||
            session.user.app_metadata?.tenant_id ||
            null;
          if (metaTenantId) {
            setTenantIdState(metaTenantId);
          }

          console.log("🔍 [Auth] Detectando plataforma admin...");
          const isPlat = await detectPlatformAdmin();
          console.log("🔍 [Auth] detectPlatformAdmin:", isPlat ? "es admin" : "no es admin");
          if (!alive) return;
          if (isPlat) {
            applyPlatformAdminAccess();
          } else {
            // ✅ ESTRATEGIA ROBUSTA: Leer team_member para detectar trial (más confiable que metadata)
           console.log("🔍 [Auth] Buscando team_member para detectar trial...");
           const { data: teamMemberData } = await supabase
             .from("team_members")
             .select("id, tenant_id, rol")
             .eq("email", session.user.email || '')
             .maybeSingle();

           if (teamMemberData) {
             console.log("✅ [Auth] Team member encontrado:", teamMemberData);
             setUserRole(teamMemberData.rol === 'asesor' ? 'asesor' : 'admin');
             setTeamMemberId(teamMemberData.id);
             setTenantIdState(teamMemberData.tenant_id || null);
             
             // ✅ Si tiene tenant_id (incluso si es demo), habilitar TODAS las features
             if (teamMemberData.tenant_id) {
               console.log("✅ [Auth] Tenant encontrado - Habilitar TODAS las features");
               const tenantSub = {
                 id: `tenant_${teamMemberData.tenant_id}`,
                 user_id: session.user.id,
                 plan: "Básico",
                 status: "trialing",
                 trial_start: new Date().toISOString(),
                 trial_end: session.user.user_metadata?.trial_end || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
               };
               console.log("📦 [Auth] Aplicando subscription:", tenantSub);
               applySubscription(tenantSub);
             } else {
               console.log("🔍 [Auth] Sin tenant_id, buscando subscription...");
               await fetchUserSubscription(session.user.id, teamMemberData.tenant_id);
             }
           } else {
             // ✅ ESTRATEGIA ROBUSTA: Leer team_member para detectar trial
             console.log("🔍 [Auth] Buscando team_member para detectar trial...");
             const { data: teamMemberData } = await supabase
               .from("team_members")
               .select("id, tenant_id, rol")
               .eq("email", session.user.email || '')
               .maybeSingle();

             if (teamMemberData && teamMemberData.tenant_id) {
               console.log("✅ [Auth] Team member con tenant encontrado - Habilitar TODAS las features");
               setUserRole(teamMemberData.rol === 'asesor' ? 'asesor' : 'admin');
               setTeamMemberId(teamMemberData.id);
               setTenantIdState(teamMemberData.tenant_id || null);
               
               // Aplicar subscription con todas las features
               const tenantSub = {
                 id: `tenant_${teamMemberData.tenant_id}`,
                 user_id: session.user.id,
                 plan: "Básico",
                 status: "trialing",
                 trial_start: new Date().toISOString(),
                 trial_end: session.user.user_metadata?.trial_end || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
               };
               applySubscription(tenantSub);
             } else {
               console.log("🔍 [Auth] Detectando rol de usuario normal...");
               const tenantId = await detectUserRole(session.user.id, session.user.email || '');
               console.log("🔍 [Auth] Rol detectado, tenantId:", tenantId);
               if (!alive) return;
               console.log("🔍 [Auth] Fetching suscripción...");
               await fetchUserSubscription(session.user.id, tenantId);
               console.log("🔍 [Auth] Suscripción cargada");
             }
           }
          }
        } else {
          console.log("👤 No hay sesión activa");
          setUser(null);
          setAccessToken(null);
          setUserPlan("free");
          setEnabledFeatures(PLAN_FEATURES["free"]);
          setUserRole(null);
          setTeamMemberId(null);
          setTenantIdState(null);
          setPlatformTenantIdState(null);
          setIsPlatformAdmin(false);
        }
      } catch (error: any) {
        console.error("❌ [Auth] Error en checkSession:", error?.message || error);
      } finally {
        console.log("🔍 [Auth] checkSession finally, alive:", alive);
        if (alive) setLoading(false);
      }
    };

    checkSession();

    const onForceRefresh = () => {
      if (alive) checkSession();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("botz-auth-refresh", onForceRefresh as any);
    }

    // ✅ Escuchar cambios de autenticación
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔔 Auth event:", event);

      // Manejar INITIAL_SESSION igual que SIGNED_IN
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") && session?.user) {
         if (!alive) return;
         console.log("✅ Auth event con sesión:", event, session.user.email);
         setUser(session.user);

         const metaTenantId =
           session.user.user_metadata?.tenant_id ||
           session.user.app_metadata?.tenant_id ||
           null;
          if (metaTenantId) {
            setTenantIdState(metaTenantId);
          }

          try {
            // ✅ VERIFICAR SI ES TRIAL USER PRIMERO
            if (session.user.user_metadata?.is_trial) {
              console.log("✅ [Auth Event] Es un TRIAL USER - Habilitar TODAS las features");
              setUserRole('admin');
              setTenantIdState(session.user.user_metadata?.tenant_id || null);
              
              // Aplicar subscription de trial
              const trialSub = {
                id: `trial_${session.user.id}`,
                user_id: session.user.id,
                plan: "Básico",
                status: "trialing",
                trial_start: session.user.user_metadata?.trial_start || new Date().toISOString(),
                trial_end: session.user.user_metadata?.trial_end || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
              };
              applySubscription(trialSub);
              setLoading(false);
            } else {
              const isPlat = await detectPlatformAdmin();
              if (!alive) return;
              if (isPlat) {
                applyPlatformAdminAccess();
                setLoading(false);
               } else {
                 const tenantId = await detectUserRole(session.user.id, session.user.email || '');
                 if (!alive) return;

                  try {
                    await fetchUserSubscription(session.user.id, tenantId);
                  } catch (e) {
                    console.error("Error en fetchUserSubscription:", e);
                  } finally {
                    if (alive) setLoading(false);
                  }

                  // Reintento corto por si RLS/metadata tardan en propagarse
                  if (delayTimer) clearTimeout(delayTimer);
                  delayTimer = setTimeout(async () => {
                    try {
                      if (!alive) return;
                      await fetchUserSubscription(session.user.id, tenantId);
                    } catch (e) {
                      console.error("Error en fetchUserSubscription (retry):", e);
                    }
                  }, 1500);
                }
            }
          } catch (e) {
            console.error("Error en auth handler:", e);
            if (alive) setLoading(false);
          }
      } else if (event === "SIGNED_OUT") {
        console.log("👋 Usuario cerró sesión");
        setUser(null);
        setAccessToken(null);
        setUserPlan("free");
        setSubscription(null);
        setEnabledFeatures(PLAN_FEATURES["free"]);
        setUserRole(null);
        setTeamMemberId(null);
        setTenantIdState(null);
        setPlatformTenantIdState(null);
        setIsPlatformAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      alive = false;
      authSubscription.unsubscribe();
      if (safetyTimer) clearTimeout(safetyTimer);
      if (delayTimer) clearTimeout(delayTimer);
      if (typeof window !== "undefined") {
        window.removeEventListener("botz-auth-refresh", onForceRefresh as any);
      }
    };
  }, [fetchUserSubscription]);

  // ✅ Fallback: si vienes de /pricing o no está activo Realtime, forzamos refresco de suscripción
  useEffect(() => {
    if (!user?.id) return;

    let alive = true;

    const maybeRefresh = async () => {
      if (!alive) return;
      try {
        const flag =
          typeof window !== "undefined"
            ? window.localStorage.getItem("botz_force_sub_refresh")
            : null;

        if (flag) {
          window.localStorage.removeItem("botz_force_sub_refresh");
          await fetchUserSubscription(user.id);
        }
      } catch {}
    };

    maybeRefresh();

    const onFocus = () => {
      maybeRefresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") maybeRefresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user?.id, fetchUserSubscription]);

  // ✅ Escuchar cambios en tiempo real en la tabla subscriptions
  useEffect(() => {
    if (!user?.id) return;

    console.log("📡 Configurando listener en tiempo real para subscriptions...");

    // Escuchar cambios por user_id (admin) Y todos los cambios en subscriptions
    // para capturar cambios de tenant (asesores)
    const channel = supabase
      .channel("subscription-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("🔔 Cambio detectado en subscriptions:", payload);
          // Refrescar la suscripción cuando hay cambios
          fetchUserSubscription(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchUserSubscription]);

  const logout = async () => {
    setUser(null);
    setAccessToken(null);
    setUserPlan("free");
    setSubscription(null);
    setEnabledFeatures(PLAN_FEATURES["free"]);
    setUserRole(null);
    setTeamMemberId(null);
    setTenantIdState(null);
    setPlatformTenantIdState(null);
    setIsPlatformAdmin(false);
    setPermissions({});

    try {
      // "local" evita depender de red para que el usuario "salga" al instante.
      await (supabase.auth as any).signOut({ scope: "local" });
    } catch {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
  };

  // ✅ Verificar si el usuario tiene acceso a una feature
  const hasFeatureAccess = useCallback(
    (featureId: string): boolean => {
      if (isPlatformAdmin) return true;
      const resolvedId = featureId === "control-center" ? "crm" : featureId;
      const hasAccess = enabledFeatures.includes(resolvedId);
      console.log(
        `🔐 Verificando acceso a "${resolvedId}":`,
        hasAccess,
        "| Features:",
        enabledFeatures
      );
      return hasAccess;
    },
    [enabledFeatures, isPlatformAdmin]
  );

  const setPlatformTenantId = useCallback(
    (nextTenantId: string | null) => {
      const next = nextTenantId || null;
      setPlatformTenantIdState(next);
      if (typeof window !== "undefined") {
        if (next) window.localStorage.setItem("botz-platform-tenant", next);
        else window.localStorage.removeItem("botz-platform-tenant");
      }
      triggerDataRefresh();
    },
    [triggerDataRefresh]
  );

  const effectiveTenantId = isPlatformAdmin ? platformTenantId : tenantIdState;

  const hasPermission = useCallback(
    (perm: string) => {
      if (!perm) return false;
      if (isPlatformAdmin) return true;
      return Boolean(permissions?.[perm]);
    },
    [permissions, isPlatformAdmin]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        userPlan,
        subscription,
        loading,
        logout,
        hasFeatureAccess,
        refreshSubscription,
        enabledFeatures,
        // ✅ NUEVO: Campos de rol
        userRole,
        isAdmin: userRole === 'admin',
        isAsesor: userRole === 'asesor',
        isPlatformAdmin,
        teamMemberId,
        tenantId: effectiveTenantId,
        platformTenantId,
        setPlatformTenantId,
        permissions,
        hasPermission,
        // ✅ NUEVO: Sincronización global
        triggerDataRefresh,
        dataRefreshKey,
        // ✅ NUEVO: Force re-render cuando subscription carga
        subscriptionUpdateKey,
      }}
    >
      {/* ✅ NUEVO: Banner de demo trial si el usuario está en trial */}
      {user && user.user_metadata?.is_trial && user.user_metadata?.trial_end && (
        <DemoTrialBanner 
          trialEndDate={user.user_metadata.trial_end}
          onClose={() => console.log("Banner cerrado")}
        />
      )}
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// ✅ INTERFACES
// ============================================================================
interface MainLayoutProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  showDock: boolean;
  setShowDock: (show: boolean) => void;
  channels: any[];
  children: React.ReactNode;
  botzProps?: any;
  globalFilter?: string | null;
  setGlobalFilter?: (filter: string | null) => void;
  crmData?: any[];
  onOpenAuth?: () => void; //
}

// ============================================================================
// ✅ ESTILOS
// ============================================================================
const glassStyle: React.CSSProperties = {
  background: "var(--botz-panel)",
  border: "1px solid var(--botz-border)",
  borderRadius: "24px",
  padding: "30px",
  backdropFilter: "blur(12px)",
  boxShadow: "var(--botz-shadow)",
};

// ============================================================================
// ✅ MODAL PARA FUNCIONALIDADES BLOQUEADAS - REDIRIGE A PRICING
// ============================================================================
const FeatureLockedModal = ({
  isOpen,
  onClose,
  featureName,
  requiredPlan,
}: {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  requiredPlan: string;
}) => {
  const router = useRouter();
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleGoToPricing = () => {
    onClose();
    router.push("/pricing");
  };

  // Features que incluye el plan requerido
  const planKey = String(requiredPlan || "").trim();
const normalizedPlan =
  planKey === "Basico" || planKey === "Básico" ? "Basico" : planKey;

const planFeatures = PLAN_FEATURES[normalizedPlan] || PLAN_FEATURES["free"] || [];


  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(10px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.3s ease",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.1)",
          width: "min(500px, 95vw)",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 25px 80px rgba(0,0,0,0.6)",
          animation: "scaleIn 0.3s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "30px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            background:
              "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Lock size={24} color="#fff" />
                </div>
                <div>
                  <span
                    style={{
                      background: "rgba(245, 158, 11, 0.2)",
                      color: "#f59e0b",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  >
                    FUNCIÓN PREMIUM
                  </span>
                </div>
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#fff",
                }}
              >
                Desbloquea "{featureName}"
              </h2>
              <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: "14px" }}>
                Esta función requiere el plan{" "}
                <strong style={{ color: "#22d3ee" }}>{requiredPlan}</strong> o
                superior
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#94a3b8",
                transition: "all 0.2s",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "30px" }}>
          {/* Beneficios del plan */}
          <div
            style={{
              background: "rgba(34, 211, 238, 0.05)",
              border: "1px solid rgba(34, 211, 238, 0.2)",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
                color: "#22d3ee",
                fontWeight: "bold",
              }}
            >
              <Sparkles size={18} />
              Plan {requiredPlan} incluye:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {planFeatures.map((feature, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    color: "#cbd5e1",
                  }}
                >
                  <Check size={14} color="#10b981" />
                  {FEATURE_LABELS[feature] || feature}
                </div>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "#94a3b8",
                fontWeight: "bold",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleGoToPricing}
              style={{
                flex: 2,
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                background:
                  "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)",
                color: "#000",
                fontWeight: "bold",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {user ? "Ver Planes y Actualizar" : "Iniciar Sesión / Registrarse"}
              <ChevronRight size={18} />
            </button>
          </div>

          {!user && (
            <p
              style={{
                textAlign: "center",
                marginTop: "16px",
                color: "#64748b",
                fontSize: "12px",
              }}
            >
              Crea una cuenta y elige tu plan para desbloquear esta función
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// ✅ HELPER PARA FORMATEAR NOMBRE DEL PLAN
// ============================================================================
const getPlanDisplayName = (plan: string): string => {
  if (plan === "Administrator" || plan === "Enterprise") {
    return "Administrator";
  }
  return plan;
};

// ============================================================================
// ✅ COMPONENTE DE PERFIL DE USUARIO CON INFO DE PLAN
// ============================================================================
const UserProfileBadge = ({
  expanded = true,
  onOpenAuth,
  language,
  onLanguageChange,
}: {
  expanded?: boolean;
  onOpenAuth?: () => void;
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
}) => {
  const {
    user,
    userPlan,
    subscription,
    logout,
    loading,
    refreshSubscription,
    isPlatformAdmin,
    platformTenantId,
    setPlatformTenantId,
  } = useAuth();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [platformTenantsLoading, setPlatformTenantsLoading] = useState(false);
  const [platformTenants, setPlatformTenants] = useState<any[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const text = UI_TEXT[language];

  useEffect(() => {
    if (!showMenu) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;

      setShowMenu(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("touchstart", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("touchstart", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showMenu]);

  useEffect(() => {
    if (!showMenu) return;
    if (!isPlatformAdmin) return;

    let alive = true;

    const load = async () => {
      try {
        setPlatformTenantsLoading(true);
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;

        const res = await fetch("/api/platform/tenants", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json();
        if (!alive) return;
        if (!res.ok) return;
        setPlatformTenants(j?.tenants || []);
      } finally {
        if (alive) setPlatformTenantsLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [showMenu, isPlatformAdmin]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSubscription();
    setTimeout(() => setRefreshing(false), 500);
  };

  if (loading) {
    return (
      <div style={{ padding: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
        <Loader2 size={16} style={{ color: "#64748b", animation: "spin 1s linear infinite" }} />
        {expanded && <span style={{ fontSize: "12px", color: "#64748b" }}>{text.loading}</span>}
      </div>
    );
  }

  if (!user) {
    return (
      <button
        // ✅ CAMBIO REAL: NO recarga, solo abre el modal (sin parpadeo)
        onClick={() => (onOpenAuth ? onOpenAuth() : router.push("/pricing"))}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: expanded ? "10px 16px" : "10px",
          borderRadius: "12px",
          border: "1px solid rgba(34, 211, 238, 0.3)",
          background: "rgba(34, 211, 238, 0.1)",
          color: "#22d3ee",
          fontWeight: "bold",
          fontSize: "13px",
          cursor: "pointer",
          transition: "all 0.2s",
          justifyContent: "center",
          width: "100%",
        }}
      >
          <User size={16} />
          {expanded && text.signIn}
      </button>
    );
  }

  const planColors: Record<string, string> = {
    free: "#64748b",
    Básico: "#facc15",
    Growth: "#22d3ee",
    "A la Medida": "#c084fc",
    Enterprise: "#c084fc",
    Administrator: "#c084fc",
  };

  const planColor = planColors[userPlan] || "#64748b";

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <button
        ref={triggerRef}
        onClick={() => setShowMenu((prev) => !prev)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "8px 12px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.05)",
          cursor: "pointer",
          transition: "all 0.2s",
          width: "100%",
          justifyContent: expanded ? "flex-start" : "center",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "10px",
            background: `linear-gradient(135deg, ${planColor} 0%, ${planColor}80 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000",
            fontWeight: "bold",
            fontSize: "14px",
            flexShrink: 0,
          }}
        >
          {user.email?.charAt(0).toUpperCase() || "U"}
        </div>
        {expanded && (
          <div style={{ textAlign: "left", overflow: "hidden" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "#fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.user_metadata?.full_name ||
                user.email?.split("@")[0] ||
                "Usuario"}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: planColor,
                fontWeight: "bold",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Crown size={10} />
              {userPlan === "free" ? text.planFree : `${text.planLabel} ${getPlanDisplayName(userPlan)}`}
            </div>
          </div>
        )}
      </button>

      {showMenu && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setShowMenu(false)} />
          <div
            ref={menuRef}
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginBottom: "12px",
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "14px",
              width: "200px",
              zIndex: 50,
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setShowMenu(false)}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.08)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              aria-label="Close menu"
            >
              <X size={14} color="#cbd5e1" />
            </button>

            {/* Info del usuario */}
            <div
              style={{
                paddingBottom: "12px",
                marginBottom: "12px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {text.connectedAs}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#fff",
                  fontWeight: "600",
                  marginBottom: "10px",
                  wordBreak: "break-all",
                }}
              >
                {user.email}
              </div>

              {/* Badge del plan */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  background: `${planColor}20`,
                  border: `1px solid ${planColor}40`,
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: planColor,
                }}
              >
                <Crown size={12} />
              {userPlan === "free" ? text.planFree : `${text.planLabel} ${getPlanDisplayName(userPlan)}`}
              </div>

              {subscription && (
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "6px" }}>
                  {text.activeSince}: {new Date(subscription.created_at).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Selector de idioma se movio al header (visible) */}

            {isPlatformAdmin && (
              <div style={{ padding: "8px 12px", marginBottom: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", color: "#94a3b8", fontSize: "12px" }}>
                  <Building2 size={14} /> {language === "en" ? "Tenant" : "Tenant"}
                </div>
                <select
                  value={platformTenantId || ""}
                  onChange={(e) => {
                    setPlatformTenantId(e.target.value || null);
                    setShowMenu(false);
                  }}
                  style={{
                    width: "100%",
                    background: "rgba(15,23,42,0.8)",
                    color: "#e2e8f0",
                    colorScheme: "dark",
                    border: "1px solid rgba(148,163,184,0.3)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "12px",
                    outline: "none",
                  }}
                >
                  <option value="" style={{ background: "#0b1220", color: "#e2e8f0" }}>
                    {platformTenantsLoading
                      ? (language === "en" ? "Loading..." : "Cargando...")
                      : (language === "en" ? "All tenants" : "Todos los tenants")}
                  </option>
                  {(platformTenants || []).map((t: any) => (
                    <option key={t.id} value={t.id} style={{ background: "#0b1220", color: "#e2e8f0" }}>
                      {`${t.empresa || "(sin empresa)"} · ${String(t.id).slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Botón refrescar suscripción */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "12px",
                marginBottom: "6px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(255,255,255,0.02)",
                color: "#94a3b8",
                fontSize: "13px",
                cursor: refreshing ? "wait" : "pointer",
                textAlign: "left",
                opacity: refreshing ? 0.6 : 1,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => !refreshing && (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
            >
              <RefreshCw size={16} style={{ flexShrink: 0, animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              {refreshing ? text.refreshing : text.refreshState}
            </button>

            {/* Botón ver/actualizar plan */}
            <button
              onClick={() => {
                setShowMenu(false);
                router.push("/pricing");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "12px",
                marginBottom: "6px",
                borderRadius: "10px",
                border: "1px solid rgba(34, 211, 238, 0.2)",
                background: "rgba(34, 211, 238, 0.05)",
                color: "#22d3ee",
                fontSize: "13px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(34, 211, 238, 0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(34, 211, 238, 0.05)")}
            >
              <Crown size={16} style={{ flexShrink: 0 }} />
              {userPlan === "free" ? text.updatePlan : text.viewPlan}
            </button>

            {/* Botón Admin Dashboard (solo para platform admins) */}
            {isPlatformAdmin && (
              <button
                onClick={() => {
                  setShowMenu(false);
                  router.push("/admin/invites");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(168, 85, 247, 0.2)",
                  background: "rgba(168, 85, 247, 0.05)",
                  color: "#a855f7",
                  fontSize: "13px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(168, 85, 247, 0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(168, 85, 247, 0.05)")}
              >
                <Settings size={16} style={{ flexShrink: 0 }} />
                Admin Dashboard
              </button>
            )}

            {/* Botón cerrar sesión */}
            <button
              onClick={async () => {
                setShowMenu(false);
                await logout();

                // Forzar reset completo de estado/UI (evita tener que recargar manualmente).
                if (typeof window !== "undefined") {
                  window.location.assign("/start");
                } else {
                  router.replace("/start");
                  router.refresh();
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                background: "rgba(239, 68, 68, 0.05)",
                color: "#ef4444",
                fontSize: "13px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)")}
            >
              <LogOut size={16} style={{ flexShrink: 0 }} />
              {text.logout}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// ✅ COMPONENTE KANBAN (Sin cambios)
// ============================================================================
const KanbanBoard = ({ realData }: { realData: any[] }) => {
  const initialStructure = [
    { id: 0, title: "📥 Por Asignar", color: "#64748b", cards: [], isLocked: true },
    { id: 101, title: "Contactado", color: "#3b82f6", cards: [] },
    { id: 102, title: "Documentación", color: "#f59e0b", cards: [] },
  ];

  const [columns, setColumns] = useState<any[]>(initialStructure);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCrmState, setSelectedCrmState] = useState(CRM_STATES[0]);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  useEffect(() => {
    if (realData && realData.length > 0) {
      setColumns((prevColumns) => {
        const newCols = prevColumns.map((col) => ({ ...col, cards: [] }));

        realData.forEach((lead) => {
          const targetCol = newCols.find(
            (col) => col.title.toLowerCase() === lead.status.toLowerCase()
          );

          if (targetCol) {
            targetCol.cards.push(lead);
          } else {
            newCols[0].cards.push(lead);
          }
        });
        return newCols;
      });
    }
  }, [realData]);

  const handleDragStart = (e: React.DragEvent, cardId: string, sourceColId: number) => {
    e.dataTransfer.setData("cardId", cardId.toString());
    e.dataTransfer.setData("sourceColId", sourceColId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, destColId: number) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("cardId");
    const sourceColId = parseInt(e.dataTransfer.getData("sourceColId"));

    if (sourceColId === destColId) return;

    const newColumns = [...columns];
    const sourceColIndex = newColumns.findIndex((col) => col.id === sourceColId);
    const destColIndex = newColumns.findIndex((col) => col.id === destColId);

    const cardIndex = newColumns[sourceColIndex].cards.findIndex(
      (c: any) => c.id.toString() === cardId
    );

    if (cardIndex > -1) {
      const [movedCard] = newColumns[sourceColIndex].cards.splice(cardIndex, 1);
      movedCard.status = newColumns[destColIndex].title;
      newColumns[destColIndex].cards.push(movedCard);
      setColumns(newColumns);
    }
  };

  const addColumn = () => {
    if (columns.some((col) => col.title === selectedCrmState)) {
      alert("Esta columna ya existe en el tablero.");
      return;
    }
    const newCol = {
      id: Date.now(),
      title: selectedCrmState,
      color: "#8b5cf6",
      cards: [],
    };
    setColumns([...columns, newCol]);
    setIsAdding(false);
  };

  const deleteColumn = (id: number) => {
    setColumns(columns.filter((col) => col.id !== id));
    setActiveMenuId(null);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        height: "calc(100vh - 220px)",
        width: "100%",
        overflow: "hidden",
      }}
      onClick={() => setActiveMenuId(null)}
    >
      {columns.map((col) => (
        <div
          key={col.id}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, col.id)}
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            background: "rgba(15, 23, 42, 0.6)",
            border:
              col.id === 0
                ? "1px dashed rgba(255,255,255,0.2)"
                : "1px solid rgba(255,255,255,0.05)",
            borderRadius: "16px",
            padding: "12px",
            transition: "background 0.2s",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              minHeight: "30px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
              {col.id === 0 ? (
                <Inbox size={14} color="#94a3b8" />
              ) : (
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: col.color,
                    flexShrink: 0,
                  }}
                />
              )}
              <span
                style={{
                  fontWeight: "bold",
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: col.id === 0 ? "#94a3b8" : "white",
                }}
              >
                {col.title}
              </span>
              <span
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  padding: "2px 6px",
                  fontSize: "10px",
                }}
              >
                {col.cards.length}
              </span>
            </div>

            {!col.isLocked && (
              <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
                <button
                  onClick={() => setActiveMenuId(activeMenuId === col.id ? null : col.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#475569",
                    padding: "4px",
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>

                {activeMenuId === col.id && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      background: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      padding: "4px",
                      zIndex: 50,
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                      minWidth: "120px",
                    }}
                  >
                    <button
                      onClick={() => deleteColumn(col.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        color: "#ef4444",
                        padding: "8px",
                        fontSize: "12px",
                        cursor: "pointer",
                        borderRadius: "4px",
                      }}
                    >
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              paddingRight: "4px",
            }}
          >
            {col.cards.length > 0 ? (
              col.cards.map((card: any) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, card.id, col.id)}
                  style={{
                    background: "rgba(30, 41, 59, 0.8)",
                    borderRadius: "12px",
                    padding: "12px",
                    border: "1px solid rgba(255,255,255,0.05)",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    cursor: "grab",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        background: "rgba(255,255,255,0.1)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {card.source || "CRM"}
                    </span>
                    <MoreHorizontal size={12} color="#94a3b8" />
                  </div>
                  <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "4px" }}>
                    {card.title || card.name}
                  </div>
                  <div style={{ color: "#10b981", fontSize: "13px", fontWeight: "bold", marginBottom: "12px" }}>
                    {card.amount || "$0"}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <div style={{ background: "rgba(59, 130, 246, 0.2)", padding: "4px", borderRadius: "6px" }}>
                        <Phone size={12} color="#3b82f6" />
                      </div>
                      <div style={{ background: "rgba(16, 185, 129, 0.2)", padding: "4px", borderRadius: "6px" }}>
                        <MessageCircle size={12} color="#10b981" />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#64748b", fontSize: "10px" }}>
                      <Calendar size={10} /> {card.date || "Hoy"}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  height: "100%",
                  border: "1px dashed rgba(255,255,255,0.05)",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.1)",
                  fontSize: "12px",
                  minHeight: "100px",
                }}
              >
                Vacío
              </div>
            )}
          </div>
        </div>
      ))}

      <div style={{ width: "50px", minWidth: "50px", display: "flex", flexDirection: "column" }}>
        <button
          onClick={() => setIsAdding(true)}
          style={{
            width: "100%",
            height: "50px",
            background: "rgba(255,255,255,0.05)",
            border: "1px dashed rgba(255,255,255,0.2)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          title="Crear nuevo estado"
        >
          <Plus size={20} color="#94a3b8" />
        </button>
      </div>

      {isAdding && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(5px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setIsAdding(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1e293b",
              padding: "24px",
              borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.1)",
              width: "350px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#fff" }}>
              Crear Columna
            </h3>

            <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px", display: "block" }}>
              Seleccionar Estado CRM:
            </label>
            <select
              value={selectedCrmState}
              onChange={(e) => setSelectedCrmState(e.target.value)}
              style={{
                width: "100%",
                background: "#0f172a",
                border: "1px solid #475569",
                borderRadius: "8px",
                color: "white",
                outline: "none",
                padding: "10px",
                marginBottom: "20px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {CRM_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setIsAdding(false)}
                style={{
                  background: "transparent",
                  border: "1px solid #475569",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={addColumn}
                style={{
                  background: "#3b82f6",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Crear Tablero
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ✅ COMPONENTE PRINCIPAL - MAIN LAYOUT
// ============================================================================
export default function MainLayout({
  activeTab,
  setActiveTab,
  showDock,
  setShowDock,
  channels,
  children,
  globalFilter,
  setGlobalFilter,
  crmData = [],
  onOpenAuth, // ✅ ya existía en props, ahora lo usamos
}: MainLayoutProps) {
  const router = useRouter();
  const { user, userPlan, hasFeatureAccess, loading, enabledFeatures, isAdmin, isPlatformAdmin, hasPermission, subscriptionUpdateKey } = useAuth();
  const [language, setLanguage] = useState<AppLanguage>("es");
  const [theme, setTheme] = useState<AppTheme>("dark");
  const text = UI_TEXT[language];
  
  // ✅ Log cuando subscription actualiza para debug
  useEffect(() => {
    console.log("🔄 [MainLayout] subscriptionUpdateKey cambió:", subscriptionUpdateKey);
  }, [subscriptionUpdateKey]);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("botz-language");
    if (savedLanguage === "es" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    }

    const savedTheme = localStorage.getItem("botz-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }

    const onThemeChange = (event: Event) => {
      const next = (event as CustomEvent<AppTheme>).detail;
      if (next === "dark" || next === "light") setTheme(next);
    };

    const onLanguageChange = (event: Event) => {
      const next = (event as CustomEvent<AppLanguage>).detail;
      if (next === "es" || next === "en") setLanguage(next);
    };

    window.addEventListener("botz-theme-change", onThemeChange);
    window.addEventListener("botz-language-change", onLanguageChange);
    return () => {
      window.removeEventListener("botz-theme-change", onThemeChange);
      window.removeEventListener("botz-language-change", onLanguageChange);
    };
  }, []);

  const handleLanguageChange = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    localStorage.setItem("botz-language", nextLanguage);
    window.dispatchEvent(new CustomEvent("botz-language-change", { detail: nextLanguage }));
  };

  const openAuth = () => {
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("botz-open-auth"));
      }
    } catch {
      // ignore
    }
    onOpenAuth?.();
  };

  // ✅ NUEVO: Solo mostrar Hero cuando estamos en "demo" (home)
  const showHeroSection = activeTab === "demo";

  // Estado para menú lateral
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const sidebarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Estado para modal de funcionalidades bloqueadas
  const [lockedModalOpen, setLockedModalOpen] = useState(false);
  const [lockedFeatureName, setLockedFeatureName] = useState("");
  const [lockedFeatureRequiredPlan, setLockedFeatureRequiredPlan] = useState("");

  // Manejo del hover del sidebar
  const handleSidebarMouseEnter = () => {
    if (sidebarTimeoutRef.current) {
      clearTimeout(sidebarTimeoutRef.current);
      sidebarTimeoutRef.current = null;
    }
    setIsSidebarExpanded(true);
  };

  const handleSidebarMouseLeave = () => {
    sidebarTimeoutRef.current = setTimeout(() => {
      setIsSidebarExpanded(false);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (sidebarTimeoutRef.current) {
        clearTimeout(sidebarTimeoutRef.current);
      }
    };
  }, []);

  // ✅ MANEJO DE CLICK EN TAB - Verifica acceso según plan
  const handleTabClick = (tabId: string, tabLabel: string) => {
    console.log(`🖱️ Click en tab: ${tabId} | Plan: ${userPlan} | Features habilitadas:`, enabledFeatures);

    const accessId = tabId === "control-center" ? "crm" : tabId;

    if (hasFeatureAccess(accessId)) {
      console.log(`✅ Acceso permitido a: ${tabId}`);
      setActiveTab(tabId);
    } else {
      console.log(`🚫 Acceso denegado a: ${tabId} - Requiere: ${FEATURE_MIN_PLAN[accessId]}`);
      setLockedFeatureName(tabLabel);
      setLockedFeatureRequiredPlan(FEATURE_MIN_PLAN[accessId] || "Growth");
      setLockedModalOpen(true);
    }
  };

  // Datos de ejemplo para Kanban
  const demoData =
    crmData.length > 0
      ? crmData
      : [
          { id: 1, title: "Juan Perez", status: "Contactado", amount: "$120,000", date: "2024-01-20", source: "Whatsapp" },
          { id: 2, title: "Maria Garcia", status: "Documentación", amount: "$350,000", date: "2024-01-18", source: "Meta Ads" },
          { id: 3, title: "Carlos Lopez", status: "Nuevo", amount: "$200,000", date: "2024-01-15", source: "Google" },
          { id: 4, title: "Ana Torres", status: "Sin Asignar", amount: "$0", date: "2024-01-21", source: "Instagram" },
          { id: 5, title: "Pedro Pascal", status: "Nuevo", amount: "$500,000", date: "2024-01-22", source: "Web" },
          { id: 6, title: "Luisa Lane", status: "Nuevo", amount: "$100,000", date: "2024-01-22", source: "Web" },
          { id: 7, title: "Bruce Wayne", status: "Nuevo", amount: "$990,000", date: "2024-01-22", source: "Web" },
          { id: 8, title: "Clark Kent", status: "Nuevo", amount: "$10,000", date: "2024-01-22", source: "Web" },
        ];

  // Tabs de navegación
  const navTabs = [
    { id: "demo", label: text.liveOps, icon: <Play size={18} /> },
    { id: "hipoteca", label: text.mortgageCalc, icon: <Calculator size={18} /> },
    { id: "channels", label: text.channels, icon: <Globe size={18} /> },
    { id: "control-center", label: language === "en" ? "Control Center" : "Centro de Control", icon: <Zap size={18} /> },
    ...(isPlatformAdmin
      ? [{ id: "tenants", label: language === "en" ? "Clients" : "Clientes", icon: <Building2 size={18} /> }]
      : []),
    ...(isAdmin || isPlatformAdmin || hasPermission("manage_agents")
      ? [{ id: "agents", label: (text as any).agentsTab || (language === "en" ? "AI Agents" : "Agentes IA"), icon: <Bot size={18} /> }]
      : []),
    { id: "n8n-config", label: text.execDashboard, icon: <Settings size={18} /> },
    { id: "crm", label: text.crmLive, icon: <Users size={18} /> },
    { id: "sla", label: text.slaAlerts, icon: <BarChart3 size={18} /> },
    { id: "kanban", label: text.kanban, icon: <KanbanSquare size={18} /> },
  ];

  return (
    <div
      data-botz-theme={theme}
      style={{
        backgroundColor: "var(--botz-bg)",
        minHeight: "100vh",
        color: "var(--botz-text)",
        fontFamily: "system-ui",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Estilos globales */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* Theme tokens (Start only) */
        [data-botz-theme="dark"] {
          color-scheme: dark;
          --botz-bg: #02040a;
          --botz-bg-elev: rgba(10, 15, 30, 0.95);
          --botz-surface: #1e293b;
          --botz-surface-2: #0f172a;
          --botz-surface-3: rgba(255,255,255,0.04);
          --botz-panel: rgba(10, 15, 30, 0.6);
          --botz-border: rgba(255,255,255,0.1);
          --botz-border-soft: rgba(255,255,255,0.08);
          --botz-border-strong: #334155;
          --botz-text: #e6edf3;
          --botz-muted: #94a3b8;
          --botz-muted-2: #64748b;
          --botz-shadow: 0 20px 60px rgba(0,0,0,0.5);
          --botz-shadow-2: 0 10px 25px rgba(0,0,0,0.45);
          --botz-hero-grad: linear-gradient(135deg, #02040a 0%, #0a2540 100%);
          --botz-hero-title-grad: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
        }
        [data-botz-theme="light"] {
          color-scheme: light;
          --botz-bg: #f4f7fb;
          --botz-bg-elev: rgba(255, 255, 255, 0.86);
          --botz-surface: #ffffff;
          --botz-surface-2: #f8fafc;
          --botz-surface-3: rgba(15,23,42,0.04);
          --botz-panel: rgba(255, 255, 255, 0.78);
          --botz-border: rgba(15,23,42,0.12);
          --botz-border-soft: rgba(15,23,42,0.10);
          --botz-border-strong: rgba(15,23,42,0.18);
          --botz-text: #0f172a;
          --botz-muted: #475569;
          --botz-muted-2: #64748b;
          --botz-shadow: 0 20px 60px rgba(15,23,42,0.16);
          --botz-shadow-2: 0 10px 25px rgba(15,23,42,0.12);
          --botz-hero-grad: radial-gradient(1200px 600px at 15% 10%, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0) 55%),
            radial-gradient(900px 500px at 75% 5%, rgba(139,92,246,0.10) 0%, rgba(139,92,246,0) 60%),
            linear-gradient(180deg, #ffffff 0%, #eef2ff 100%);
          --botz-hero-title-grad: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }

        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: var(--botz-surface-3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: var(--botz-border); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--botz-border-strong); }
        * { scrollbar-width: thin; scrollbar-color: var(--botz-border) var(--botz-surface-3); }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `,
        }}
      />

      {/* Modal de funcionalidades bloqueadas */}
      <FeatureLockedModal
        isOpen={lockedModalOpen}
        onClose={() => setLockedModalOpen(false)}
        featureName={lockedFeatureName}
        requiredPlan={lockedFeatureRequiredPlan}
      />

      {/* Dock (kept outside surface for fixed positioning) */}
      <ActionsDock
        showDock={showDock}
        setShowDock={setShowDock}
        user={user}
        onOpenAuth={openAuth}
      />

      <div className="botz-theme-surface" style={{ minHeight: "100vh" }}>

      {/* Menú lateral */}
        <div
          onMouseEnter={handleSidebarMouseEnter}
          onMouseLeave={handleSidebarMouseLeave}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            height: "100vh",
            width: isSidebarExpanded ? "240px" : "70px",
            background: "var(--botz-bg-elev)",
            borderRight: "1px solid var(--botz-border)",
            backdropFilter: "blur(20px)",
            zIndex: 100,
            transition: "width 0.3s ease",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
        {/* Logo */}
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid var(--botz-border)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              minHeight: "60px",
            }}
          >
          <div
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BrainCircuit size={22} color="#fff" />
          </div>
          <span
            style={{
              fontWeight: "bold",
              fontSize: "18px",
              opacity: isSidebarExpanded ? 1 : 0,
              transition: "opacity 0.2s ease",
              whiteSpace: "nowrap",
              color: "#fff",
            }}
          >
            Botz
          </span>
        </div>

        {/* Indicador de plan actual */}
        {isSidebarExpanded && user && (
          <div
            style={{
              margin: "12px",
              padding: "10px 12px",
              background: "rgba(34, 211, 238, 0.1)",
              border: "1px solid rgba(34, 211, 238, 0.2)",
              borderRadius: "10px",
              fontSize: "11px",
              color: "#22d3ee",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Crown size={14} />
            <span>
              {text.planLabel}: <strong>{userPlan === "free" ? text.freeShort : getPlanDisplayName(userPlan)}</strong>
            </span>
          </div>
        )}

        {/* Navegación */}
        <div
          style={{
            flex: 1,
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            overflowY: "auto",
          }}
        >
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isLocked = !hasFeatureAccess(tab.id);

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id, tab.label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: isSidebarExpanded ? "12px 16px" : "12px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: isActive
                    ? "linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)"
                    : "transparent",
                  color: isActive ? "#fff" : isLocked ? "#475569" : "#94a3b8",
                  justifyContent: isSidebarExpanded ? "flex-start" : "center",
                  position: "relative",
                  opacity: isLocked ? 0.6 : 1,
                }}
              >
                <div style={{ flexShrink: 0, color: isActive ? "#667eea" : isLocked ? "#475569" : "#94a3b8" }}>
                  {tab.icon}
                </div>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: isActive ? "600" : "400",
                    opacity: isSidebarExpanded ? 1 : 0,
                    width: isSidebarExpanded ? "auto" : 0,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    transition: "opacity 0.2s ease",
                  }}
                >
                  {tab.label}
                </span>

                {isLocked && isSidebarExpanded && (
                  <Lock size={12} color="#64748b" style={{ marginLeft: "auto" }} />
                )}

                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "3px",
                      height: "24px",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      borderRadius: "0 4px 4px 0",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer del sidebar con perfil */}
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Botón Dock */}
          <button
            onClick={() => setShowDock(!showDock)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: isSidebarExpanded ? "12px 16px" : "12px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: showDock ? "rgba(102, 126, 234, 0.1)" : "transparent",
              cursor: "pointer",
              width: "100%",
              justifyContent: isSidebarExpanded ? "flex-start" : "center",
              color: showDock ? "#667eea" : "#94a3b8",
              transition: "all 0.2s ease",
            }}
          >
            <Zap size={18} />
            <span
              style={{
                fontSize: "14px",
                opacity: isSidebarExpanded ? 1 : 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                transition: "opacity 0.2s ease",
              }}
            >
              {showDock ? "Ocultar Dock" : "Mostrar Dock"}
            </span>
          </button>

          {/* Perfil de usuario */}
          <UserProfileBadge
            expanded={isSidebarExpanded}
            onOpenAuth={openAuth}
            language={language}
            onLanguageChange={handleLanguageChange}
          />
        </div>
      </div>

      {/* Contenedor principal */}
      <div style={{ marginLeft: isSidebarExpanded ? "240px" : "70px", transition: "margin-left 0.3s ease" }}>
        {/* ✅ BARRA SUPERIOR COMPACTA - Solo cuando NO estás en demo/home */}
        {!showHeroSection && (
          <div
            style={{
              background: "rgba(10, 15, 30, 0.98)",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              padding: "16px 40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backdropFilter: "blur(10px)",
              position: "sticky",
              top: 0,
              zIndex: 50,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button
                onClick={() => setActiveTab("demo")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid var(--botz-border)",
                  background: "var(--botz-surface-3)",
                  color: "var(--botz-muted)",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
              >
                <ArrowLeft size={16} />
                {text.backToHome}
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 14px",
                  background: "rgba(102, 126, 234, 0.1)",
                  borderRadius: "10px",
                  border: "1px solid rgba(102, 126, 234, 0.2)",
                }}
              >
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#667eea", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: "13px", color: "#a5b4fc", fontWeight: "600" }}>
                  {navTabs.find((t) => t.id === activeTab)?.label || "Botz"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {user && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 12px",
                    background: "rgba(34, 211, 238, 0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#22d3ee",
                  }}
                >
                  <Crown size={14} />
                  {text.planLabel} {userPlan === "free" ? text.freeShort : getPlanDisplayName(userPlan)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hero Section - Solo mostrar cuando estás en Demo/Home */}
        {showHeroSection && (
          <div style={{ background: "var(--botz-hero-grad)", padding: "80px 40px 40px", borderBottom: "1px solid var(--botz-border)" }}>
            <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                    <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <BrainCircuit size={24} color="#fff" />
                    </div>
                    <span style={{ background: "rgba(102, 126, 234, 0.1)", color: "#667eea", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                      {text.heroBadge}
                    </span>
                  </div>
                  <h1 style={{ fontSize: "48px", fontWeight: "bold", margin: "0 0 20px 0", lineHeight: 1.2, color: "#fff" }}>
                    <div style={{ marginBottom: "8px" }}>
                      {language === "en" ? "More Leads" : "Más Leads"}
                    </div>
                    <TextRotator
                      words={[
                        "en Hipotecas Firmadas",
                        "con tu CRM Inteligente",
                        "con Cálculo Hipotecario",
                        "vía WhatsApp Automatizado",
                        "en Ventas Cerradas",
                        "desde tu Sitio Web",
                        "vía Meta Ads",
                        "con Automatización 24/7"
                      ]}
                      prefix=""
                      suffix=""
                      highlightColor="#a3e635"
                      typingSpeed={70}
                      deletingSpeed={35}
                      pauseDuration={2000}
                    />
                  </h1>
                  <p style={{ fontSize: "18px", color: "var(--botz-muted)", marginBottom: "30px", lineHeight: 1.6 }}>
                    {text.heroSubtitle}
                  </p>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <button
                      onClick={() => document.getElementById("demo-section")?.scrollIntoView({ behavior: "smooth" })}
                      style={{
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "#fff",
                        border: "none",
                        padding: "16px 32px",
                        borderRadius: "12px",
                        fontWeight: "bold",
                        fontSize: "16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      {text.heroPrimaryCta} <Play size={18} />
                    </button>
                    <button
                      onClick={() => router.push("/pricing")}
                      style={{
                        background: "var(--botz-surface)",
                        border: "1px solid var(--botz-border)",
                        color: "var(--botz-text)",
                        padding: "16px 32px",
                        borderRadius: "12px",
                        fontWeight: "bold",
                        fontSize: "16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <Calculator size={18} /> {text.heroSecondaryCta}
                    </button>
                  </div>
                </div>

                <div style={glassStyle}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
                    {channels.map((channel) => (
                      <div
                        key={channel.id}
                        style={{
                          background: "var(--botz-surface)",
                          border: `1px solid ${channel.active ? channel.color + "40" : "var(--botz-border)"}`,
                          borderRadius: "16px",
                          padding: "20px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "12px",
                          opacity: channel.active ? 1 : 0.4,
                        }}
                      >
                        <div style={{ color: channel.color }}>{channel.icon}</div>
                        <span style={{ fontSize: "12px", fontWeight: "bold", textAlign: "center", color: "var(--botz-text)" }}>{channel.name}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "var(--botz-surface-2)", border: "1px solid var(--botz-border)", borderRadius: "16px", padding: "20px", marginTop: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ fontSize: "14px", color: "var(--botz-muted)" }}>{text.realtimeConnection}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34d399", animation: "pulse 2s infinite" }} />
                        <span style={{ fontSize: "12px", color: "#34d399", fontWeight: "bold" }}>{text.statusActive}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--botz-text)" }}>9+</div>
                        <div style={{ fontSize: "12px", color: "var(--botz-muted)" }}>{text.statChannels}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--botz-text)" }}>24/7</div>
                        <div style={{ fontSize: "12px", color: "var(--botz-muted)" }}>{text.statAvailability}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--botz-text)" }}>
                          <Calculator size={20} style={{ display: "inline", marginRight: "8px" }} />
                          {text.plusMortgage}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--botz-muted)" }}>{text.statSmartCalc}</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Contenido Principal */}
        <div
          style={{
            padding: showHeroSection ? "40px" : "30px 40px",
            maxWidth: "100%",
            margin: "0 auto",
            overflowX: "hidden",
            minHeight: showHeroSection ? "auto" : "calc(100vh - 80px)",
          }}
          id="demo-section"
        >
          {children}
        </div>

        {/* Footer */}
        <div style={{ background: "var(--botz-bg-elev)", borderTop: "1px solid var(--botz-border)", padding: "40px", marginTop: "60px", color: "var(--botz-muted)", textAlign: "center", fontSize: "14px" }}>
          © {new Date().getFullYear()} Botz · {text.footerTagline}
        </div>
      </div>

      </div>
    </div>
  );
}

// ============================================================================
// ✅ EXPORTAR COMPONENTE KANBAN POR SEPARADO SI SE NECESITA
// ============================================================================
export { KanbanBoard };
