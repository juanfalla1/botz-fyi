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
  Check,
  Sparkles,
  ChevronRight,
  LogOut,
  User,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Home,
} from "lucide-react";
import { supabase } from "../supabaseClient"; // Ajusta la ruta según tu proyecto
import AuthModal from "./AuthModal"; // ✅ AJUSTA ESTA RUTA si tu AuthModal está en otro lugar
import ActionsDock from "./components/ActionsDock"; // Ajusta la ruta según tu estructura

// ============================================================================
// ✅ TIPOS Y CONFIGURACIÓN DE PLANES
// ============================================================================

// ✅ REGLA: si el usuario tiene cualquier plan (no "free"), se habilita TODO lo bloqueado.
const ALL_FEATURES: string[] = [
  "demo",
  "hipoteca",
  "channels",
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
};

// Mapeo de features a planes mínimos requeridos (para mostrar en modal)
const FEATURE_MIN_PLAN: Record<string, string> = {
  demo: "free",
  hipoteca: "Growth",
  channels: "Básico",
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
  crm: "CRM en Vivo",
  kanban: "Tablero Kanban",
  sla: "Alertas SLA",
  "n8n-config": "Dashboard Ejecutivo",
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
  userPlan: string;
  subscription: SubscriptionData | null;
  loading: boolean;
  logout: () => Promise<void>;
  hasFeatureAccess: (featureId: string) => boolean;
  refreshSubscription: () => Promise<void>;
  enabledFeatures: string[];
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userPlan: "free",
  subscription: null,
  loading: true,
  logout: async () => {},
  hasFeatureAccess: () => false,
  refreshSubscription: async () => {},
  enabledFeatures: ["demo"],
});

export const useAuth = () => useContext(AuthContext);

// ============================================================================
// ✅ PROVIDER DE AUTENTICACIÓN CON SUSCRIPCIÓN
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>(["demo"]);

  // ✅ Función para obtener la suscripción activa del usuario
  const fetchUserSubscription = useCallback(async (userId: string) => {
    try {
      console.log("🔍 Buscando suscripción para usuario:", userId);

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("❌ Error al buscar suscripción:", error);
        setUserPlan("free");
        setSubscription(null);
        setEnabledFeatures(PLAN_FEATURES["free"]);
        return;
      }

      if (data && data.length > 0) {
        const activeSub = data[0];
        console.log("✅ Suscripción encontrada:", activeSub);

        setSubscription(activeSub);
        setUserPlan(activeSub.plan);

        // Obtener features del plan
        const planFeatures =
          PLAN_FEATURES[activeSub.plan] || PLAN_FEATURES["free"];
        setEnabledFeatures(planFeatures);

        console.log("🎯 Plan activo:", activeSub.plan);
        console.log("🔓 Features habilitadas:", planFeatures);
      } else {
        console.log("ℹ️ No se encontró suscripción activa, usando plan free");
        setUserPlan("free");
        setSubscription(null);
        setEnabledFeatures(PLAN_FEATURES["free"]);
      }
    } catch (error) {
      console.error("❌ Error en fetchUserSubscription:", error);
      setUserPlan("free");
      setSubscription(null);
      setEnabledFeatures(PLAN_FEATURES["free"]);
    }
  }, []);

  // ✅ Función pública para refrescar la suscripción
  const refreshSubscription = useCallback(async () => {
    if (user?.id) {
      console.log("🔄 Refrescando suscripción...");
      await fetchUserSubscription(user.id);
    }
  }, [user?.id, fetchUserSubscription]);

  // ✅ Verificar sesión al montar
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          console.log("👤 Usuario logueado:", session.user.email);
          setUser(session.user);
          await fetchUserSubscription(session.user.id);
        } else {
          console.log("👤 No hay sesión activa");
          setUser(null);
          setUserPlan("free");
          setEnabledFeatures(PLAN_FEATURES["free"]);
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // ✅ Escuchar cambios de autenticación
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔔 Auth event:", event);

      if (event === "SIGNED_IN" && session?.user) {
        console.log("✅ Usuario inició sesión:", session.user.email);
        setUser(session.user);
        // Pequeño delay para asegurar que la DB se haya actualizado
        setTimeout(async () => {
          await fetchUserSubscription(session.user.id);
          setLoading(false);
        }, 500);
      } else if (event === "SIGNED_OUT") {
        console.log("👋 Usuario cerró sesión");
        setUser(null);
        setUserPlan("free");
        setSubscription(null);
        setEnabledFeatures(PLAN_FEATURES["free"]);
        setLoading(false);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // Refrescar suscripción cuando se refresca el token
        await fetchUserSubscription(session.user.id);
      }
    });

    return () => authSubscription.unsubscribe();
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

    const t = window.setInterval(maybeRefresh, 1500);

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(t);
    };
  }, [user?.id, fetchUserSubscription]);

  // ✅ Escuchar cambios en tiempo real en la tabla subscriptions
  useEffect(() => {
    if (!user?.id) return;

    console.log("📡 Configurando listener en tiempo real para subscriptions...");

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
    await supabase.auth.signOut();
    setUser(null);
    setUserPlan("free");
    setSubscription(null);
    setEnabledFeatures(PLAN_FEATURES["free"]);
  };

  // ✅ Verificar si el usuario tiene acceso a una feature
  const hasFeatureAccess = useCallback(
    (featureId: string): boolean => {
      const hasAccess = enabledFeatures.includes(featureId);
      console.log(
        `🔐 Verificando acceso a "${featureId}":`,
        hasAccess,
        "| Features:",
        enabledFeatures
      );
      return hasAccess;
    },
    [enabledFeatures]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        userPlan,
        subscription,
        loading,
        logout,
        hasFeatureAccess,
        refreshSubscription,
        enabledFeatures,
      }}
    >
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
  background: "rgba(10, 15, 30, 0.6)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "24px",
  padding: "30px",
  backdropFilter: "blur(12px)",
  boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
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
// ✅ COMPONENTE DE PERFIL DE USUARIO CON INFO DE PLAN
// ============================================================================
const UserProfileBadge = ({
  expanded = true,
  onOpenAuth,
}: {
  expanded?: boolean;
  onOpenAuth?: () => void;
}) => {
  const { user, userPlan, subscription, logout, loading, refreshSubscription } =
    useAuth();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSubscription();
    setTimeout(() => setRefreshing(false), 500);
  };

  if (loading) {
    return (
      <div style={{ padding: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
        <Loader2 size={16} style={{ color: "#64748b", animation: "spin 1s linear infinite" }} />
        {expanded && <span style={{ fontSize: "12px", color: "#64748b" }}>Cargando...</span>}
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
        {expanded && "Iniciar Sesión"}
      </button>
    );
  }

  const planColors: Record<string, string> = {
    free: "#64748b",
    Básico: "#facc15",
    Growth: "#22d3ee",
    "A la Medida": "#c084fc",
    Enterprise: "#c084fc",
  };

  const planColor = planColors[userPlan] || "#64748b";

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
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
              {userPlan === "free" ? "Plan Gratuito" : `Plan ${userPlan}`}
            </div>
          </div>
        )}
      </button>

      {showMenu && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setShowMenu(false)} />
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              marginBottom: "8px",
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              padding: "8px",
              minWidth: "220px",
              zIndex: 50,
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* Info del usuario */}
            <div
              style={{
                padding: "12px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                marginBottom: "8px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                Conectado como
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#fff",
                  fontWeight: "500",
                  marginBottom: "8px",
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
                {userPlan === "free" ? "Plan Gratuito" : `Plan ${userPlan}`}
              </div>

              {subscription && (
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "6px" }}>
                  Activo desde: {new Date(subscription.created_at).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Botón refrescar suscripción */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: "#94a3b8",
                fontSize: "13px",
                cursor: refreshing ? "wait" : "pointer",
                textAlign: "left",
                opacity: refreshing ? 0.5 : 1,
              }}
            >
              <RefreshCw size={16} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              {refreshing ? "Actualizando..." : "Refrescar estado"}
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
                padding: "10px 12px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: "#22d3ee",
                fontSize: "13px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Crown size={16} />
              {userPlan === "free" ? "Actualizar Plan" : "Ver mi Plan"}
            </button>

            {/* Botón cerrar sesión */}
            <button
              onClick={() => {
                setShowMenu(false);
                logout();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: "#ef4444",
                fontSize: "13px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <LogOut size={16} />
              Cerrar Sesión
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
  const { user, userPlan, hasFeatureAccess, loading, enabledFeatures } = useAuth();

  // ✅ NUEVO: estado del modal de auth (para abrir sin reload)
  const [authOpen, setAuthOpen] = useState(false);
  const openAuth = () => {
    setAuthOpen(true);
    onOpenAuth?.(); // por si alguien quiere enganchar algo externo
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

    if (hasFeatureAccess(tabId)) {
      console.log(`✅ Acceso permitido a: ${tabId}`);
      setActiveTab(tabId);
    } else {
      console.log(`🚫 Acceso denegado a: ${tabId} - Requiere: ${FEATURE_MIN_PLAN[tabId]}`);
      setLockedFeatureName(tabLabel);
      setLockedFeatureRequiredPlan(FEATURE_MIN_PLAN[tabId] || "Growth");
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
    { id: "demo", label: "Operación en Vivo", icon: <Play size={18} /> },
    { id: "hipoteca", label: "Cálculo Hipotecario", icon: <Calculator size={18} /> },
    { id: "channels", label: "Canales", icon: <Globe size={18} /> },
    { id: "n8n-config", label: "Dashboard Ejecutivo", icon: <Settings size={18} /> },
    { id: "crm", label: "CRM en Vivo", icon: <Users size={18} /> },
    { id: "sla", label: "Alertas SLA", icon: <BarChart3 size={18} /> },
    { id: "kanban", label: "Kanban", icon: <KanbanSquare size={18} /> },
  ];

  return (
    <div
      style={{
        backgroundColor: "#02040a",
        minHeight: "100vh",
        color: "#e6edf3",
        fontFamily: "system-ui",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Estilos globales */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) rgba(255,255,255,0.02); }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `,
        }}
      />

      {/* ✅ Modal Login (sin recarga) */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onLoggedIn={() => setAuthOpen(false)}
      />

      {/* Modal de funcionalidades bloqueadas */}
      <FeatureLockedModal
        isOpen={lockedModalOpen}
        onClose={() => setLockedModalOpen(false)}
        featureName={lockedFeatureName}
        requiredPlan={lockedFeatureRequiredPlan}
      />

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
          background: "rgba(10, 15, 30, 0.95)",
          borderRight: "1px solid rgba(255,255,255,0.1)",
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
            borderBottom: "1px solid rgba(255,255,255,0.1)",
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
              Plan: <strong>{userPlan === "free" ? "Gratuito" : userPlan}</strong>
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
          <UserProfileBadge expanded={isSidebarExpanded} onOpenAuth={openAuth} />
        </div>
      </div>

      {/* Contenedor principal */}
      <div style={{ marginLeft: isSidebarExpanded ? "240px" : "70px", transition: "margin-left 0.3s ease" }}>
        {/* Dock flotante */}
{/* Dock de Acciones */}
<ActionsDock 
  showDock={showDock}
  setShowDock={setShowDock}
  user={user}
  onOpenAuth={openAuth}
/>
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
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#94a3b8",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
              >
                <ArrowLeft size={16} />
                Volver al Inicio
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
                  Plan {userPlan === "free" ? "Gratuito" : userPlan}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hero Section - Solo mostrar cuando estás en Demo/Home */}
        {showHeroSection && (
          <div style={{ background: "linear-gradient(135deg, #02040a 0%, #0a2540 100%)", padding: "80px 40px 40px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                    <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <BrainCircuit size={24} color="#fff" />
                    </div>
                    <span style={{ background: "rgba(102, 126, 234, 0.1)", color: "#667eea", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                      AUTOMATIZACIÓN INTELIGENTE + HIPOTECARIO
                    </span>
                  </div>
                  <h1 style={{ fontSize: "48px", fontWeight: "bold", margin: "0 0 20px 0", lineHeight: 1.2, background: "linear-gradient(135deg, #fff 0%, #a5b4fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Convierte Más Leads en <br /> Hipotecas Firmadas
                  </h1>
                  <p style={{ fontSize: "18px", color: "#8b949e", marginBottom: "30px", lineHeight: 1.6 }}>
                    WhatsApp, Meta Ads, Instagram, Google y más. Automatiza tu atención al cliente, captura leads y calcula hipotecas con nuestra plataforma todo-en-uno.
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
                      Probar Demo <Play size={18} />
                    </button>
                    <button
                      onClick={() => router.push("/pricing")}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#fff",
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
                      <Calculator size={18} /> Adquiere tu mejor solucion 
                    </button>
                  </div>
                </div>

                <div style={glassStyle}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
                    {channels.map((channel) => (
                      <div
                        key={channel.id}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: `1px solid ${channel.active ? channel.color + "40" : "rgba(255,255,255,0.06)"}`,
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
                        <span style={{ fontSize: "12px", fontWeight: "bold", textAlign: "center" }}>{channel.name}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "20px", marginTop: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ fontSize: "14px", color: "#8b949e" }}>Conexión en tiempo real</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34d399", animation: "pulse 2s infinite" }} />
                        <span style={{ fontSize: "12px", color: "#34d399", fontWeight: "bold" }}>ACTIVO</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#fff" }}>9+</div>
                        <div style={{ fontSize: "12px", color: "#8b949e" }}>Canales</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#fff" }}>24/7</div>
                        <div style={{ fontSize: "12px", color: "#8b949e" }}>Disponibilidad</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#fff" }}>
                          <Calculator size={20} style={{ display: "inline", marginRight: "8px" }} />
                          +Hipoteca
                        </div>
                        <div style={{ fontSize: "12px", color: "#8b949e" }}>Cálculo Inteligente</div>
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
        <div style={{ background: "rgba(10, 15, 30, 0.95)", borderTop: "1px solid rgba(255,255,255,0.1)", padding: "40px", marginTop: "60px", color: "#8b949e", textAlign: "center", fontSize: "14px" }}>
          © {new Date().getFullYear()} Botz · Automatización Inteligente
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ✅ EXPORTAR COMPONENTE KANBAN POR SEPARADO SI SE NECESITA
// ============================================================================
export { KanbanBoard };
