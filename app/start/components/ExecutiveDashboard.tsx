"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, Users, DollarSign, Clock, Calendar, Lock, Loader2, ArrowRight, 
  ShieldCheck, Filter, AlertCircle, Target, Award, BarChart3, PieChart,
  MessageCircle, Mail, Phone, Zap, TrendingDown, Activity, UserCheck,
  Clock4, CheckCircle2, XCircle, AlertTriangle, CreditCard, Home, Percent
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { useAuth } from "../MainLayout"; 

type AppLanguage = "es" | "en";

const EXEC_TEXT: Record<
  AppLanguage,
  {
    general: string;
    advisors: string;
    mortgage: string;
    alerts: string;
    leadsMonth: string;
    newLeads: (n: number) => string;
    totalCrm: string;
    fullDatabase: string;
    closeRate: string;
    commissions: string;
    avgTime: string;
    days: string;
    avgPerAdvisor: string;
    monthPipeline: string;
    channelPerformance: string;
    advisorsRanking: string;
    advisor: string;
    leads: string;
    convRateShort: string;
    sales: string;
    pipeline: string;
    commissionShort: string;
    dtiMetrics: string;
    dtiAverage: string;
    dtiExcellent: string;
    dtiModerate: string;
    dtiHigh: string;
    avgValue: string;
    avgHomeValue: string;
    approvalRate: string;
    approvedOps: string;
    topBanks: string;
    alertsCenter: string;
    caseSingular: string;
    casePlural: string;
    allGoodTitle: string;
    noActiveAlerts: string;
    alertNoContact24h: string;
    alertHighScoreReady: string;
    alertOverloadedAdvisors: string;
    alertNegotiationStage: string;
    filtering: string;
    leadsThisMonthShort: string;
    totalInCrmShort: string;
    restrictedTitle: string;
    restrictedMsg: string;

    dashboardTitle: string;
    monthLocale: string;
    conversionLabel: string;
    monthlyComparison: string;
    thisMonthLabel: string;
    previousMonthLabel: string;
    variationLabel: string;

    funnelNew: string;
    funnelContacted: string;
    funnelQualified: string;
    funnelDocs: string;
    funnelPreApproved: string;
    funnelNegotiation: string;
    funnelClosing: string;
  }
> = {
  es: {
    general: "General",
    advisors: "Asesores",
    mortgage: "Hipotecario",
    alerts: "Alertas",
    leadsMonth: "Leads del Mes",
    newLeads: (n) => `${n} nuevos`,
    totalCrm: "Total en CRM",
    fullDatabase: "Base de datos completa",
    closeRate: "Tasa de Cierre",
    commissions: "Comisiones",
    avgTime: "Tiempo Promedio",
    days: "días",
    avgPerAdvisor: "Promedio/Asesor",
    monthPipeline: "Pipeline del Mes Seleccionado",
    channelPerformance: "Rendimiento por Canal",
    advisorsRanking: "Ranking de Asesores",
    advisor: "Asesor",
    leads: "Leads",
    convRateShort: "Tasa Conv.",
    sales: "Ventas",
    pipeline: "Pipeline",
    commissionShort: "Comisión",
    dtiMetrics: "Métricas DTI",
    dtiAverage: "DTI Promedio",
    dtiExcellent: "✅ Excelente - Alta probabilidad de aprobación",
    dtiModerate: "⚠️ Moderado - Revisión adicional requerida",
    dtiHigh: "🔴 Alto - Riesgo de rechazo bancario",
    avgValue: "Valor Promedio",
    avgHomeValue: "Valor de vivienda promedio",
    approvalRate: "Tasa de Aprobación",
    approvedOps: "Operaciones aprobadas",
    topBanks: "Top Bancos",
    alertsCenter: "Centro de Alertas",
    caseSingular: "caso",
    casePlural: "casos",
    allGoodTitle: "¡Todo bajo control!",
    noActiveAlerts: "No hay alertas activas en este momento",
    alertNoContact24h: "Leads sin contactar > 24h",
    alertHighScoreReady: "Leads con Score > 80 listos para cerrar",
    alertOverloadedAdvisors: "Asesores con >30 leads asignados",
    alertNegotiationStage: "Leads en etapa de negociación",
    filtering: "Filtrando",
    leadsThisMonthShort: "leads este mes",
    totalInCrmShort: "totales en CRM",
    restrictedTitle: "Acceso Restringido",
    restrictedMsg: "Solo administradores o usuarios autorizados pueden acceder al Dashboard Ejecutivo.",

    dashboardTitle: "Dashboard Ejecutivo",
    monthLocale: "es-ES",
    conversionLabel: "Conversión",
    monthlyComparison: "Comparativa Mensual",
    thisMonthLabel: "Leads este mes",
    previousMonthLabel: "Mes anterior",
    variationLabel: "Variación",

    funnelNew: "Nuevo",
    funnelContacted: "Contactado",
    funnelQualified: "Calificado",
    funnelDocs: "Documentación",
    funnelPreApproved: "Pre-aprobado",
    funnelNegotiation: "Negociación",
    funnelClosing: "Cierre",
  },
  en: {
    general: "Overview",
    advisors: "Advisors",
    mortgage: "Mortgage",
    alerts: "Alerts",
    leadsMonth: "Leads This Month",
    newLeads: (n) => `${n} new`,
    totalCrm: "Total in CRM",
    fullDatabase: "Full database",
    closeRate: "Close Rate",
    commissions: "Commissions",
    avgTime: "Average Time",
    days: "days",
    avgPerAdvisor: "Avg / Advisor",
    monthPipeline: "Selected Month Pipeline",
    channelPerformance: "Channel Performance",
    advisorsRanking: "Advisor Ranking",
    advisor: "Advisor",
    leads: "Leads",
    convRateShort: "Conv. Rate",
    sales: "Sales",
    pipeline: "Pipeline",
    commissionShort: "Commission",
    dtiMetrics: "DTI Metrics",
    dtiAverage: "Average DTI",
    dtiExcellent: "Excellent - High approval likelihood",
    dtiModerate: "Moderate - Additional review required",
    dtiHigh: "High - Higher rejection risk",
    avgValue: "Average Value",
    avgHomeValue: "Average home value",
    approvalRate: "Approval Rate",
    approvedOps: "Approved operations",
    topBanks: "Top Banks",
    alertsCenter: "Alerts Center",
    caseSingular: "case",
    casePlural: "cases",
    allGoodTitle: "All good!",
    noActiveAlerts: "No active alerts right now",
    alertNoContact24h: "Leads not contacted > 24h",
    alertHighScoreReady: "Leads with score > 80 ready to close",
    alertOverloadedAdvisors: "Advisors with >30 assigned leads",
    alertNegotiationStage: "Leads in negotiation stage",
    filtering: "Filtering",
    leadsThisMonthShort: "leads this month",
    totalInCrmShort: "total in CRM",
    restrictedTitle: "Restricted Access",
    restrictedMsg: "Only administrators or authorized users can access the Executive Dashboard.",

    dashboardTitle: "Executive Dashboard",
    monthLocale: "en-US",
    conversionLabel: "Conversion",
    monthlyComparison: "Monthly Comparison",
    thisMonthLabel: "Leads this month",
    previousMonthLabel: "Previous month",
    variationLabel: "Variation",

    funnelNew: "New",
    funnelContacted: "Contacted",
    funnelQualified: "Qualified",
    funnelDocs: "Documents",
    funnelPreApproved: "Pre-approved",
    funnelNegotiation: "Negotiation",
    funnelClosing: "Closing",
  },
};

// --- TIPOS ---
interface Lead {
  id: string;
  status?: string;
  source?: string;
  bank?: string;
  commission?: number;
  created_at?: string;
  updated_at?: string;
  assigned_to?: string;
  asesor_id?: string;
  valor_vivienda?: number;
  precio_real?: number;
  ingresos_mensuales?: number;
  ingresos_netos?: number;
  dti?: number;
  dtiPercent?: number;
  score?: number;
  name?: string;
  email?: string;
  phone?: string;
}

interface TeamMember {
  id: string;
  nombre: string;
  email: string;
}

interface AsesorMetrics {
  id: string;
  nombre: string;
  leadsAsignados: number;
  leadsAtendidos: number;
  conversionRate: number;
  tiempoPromedioRespuesta: number;
  pipelineValue: number;
  ventasCerradas: number;
  comisionTotal: number;
}

// --- ESTILOS ---
const glassStyle: React.CSSProperties = {
  background: "var(--botz-panel)",
  border: "1px solid rgba(16, 178, 203, 0.2)",
  borderRadius: "24px",
  padding: "32px",
  backdropFilter: "blur(12px)",
  boxShadow: "var(--botz-shadow)",
  color: "var(--botz-text)",
  minHeight: "600px",
  fontFamily: "system-ui, sans-serif",
  position: "relative",
  overflow: "auto"
};

const cardStyle: React.CSSProperties = {
  background: "var(--botz-surface-3)",
  padding: "20px",
  borderRadius: "16px",
  border: "1px solid var(--botz-border-soft)",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const alertCardStyle = (type: 'danger' | 'warning' | 'success' | 'info'): React.CSSProperties => ({
  background: type === 'danger' ? "rgba(239, 68, 68, 0.1)" : 
              type === 'warning' ? "rgba(245, 158, 11, 0.1)" :
              type === 'success' ? "rgba(16, 185, 129, 0.1)" : "rgba(34, 211, 238, 0.1)",
  border: `1px solid ${type === 'danger' ? "rgba(239, 68, 68, 0.3)" : 
                          type === 'warning' ? "rgba(245, 158, 11, 0.3)" :
                          type === 'success' ? "rgba(16, 185, 129, 0.3)" : "rgba(34, 211, 238, 0.3)"}`,
  padding: "16px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  gap: "12px"
});

// --- COMPONENTE PRINCIPAL ---
export default function ExecutiveDashboard({ filter }: { filter?: string | null }) {
  const {
    isAdmin,
    isPlatformAdmin,
    hasPermission,
    loading: authLoading,
    dataRefreshKey,
    tenantId: authTenantId,
    teamMemberId,
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'asesores' | 'hipotecario' | 'alertas'>('general');
  const [language, setLanguage] = useState<AppLanguage>("es");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const t = EXEC_TEXT[language];

  const canViewExecDashboard = isAdmin || isPlatformAdmin || hasPermission("view_exec_dashboard");
  const canViewAllLeads = isAdmin || isPlatformAdmin || hasPermission("view_all_leads");

  useEffect(() => {
    const saved = localStorage.getItem("botz-language");
    if (saved === "es" || saved === "en") {
      setLanguage(saved);
    }

    const onLangChange = (event: Event) => {
      const next = (event as CustomEvent<AppLanguage>).detail;
      if (next === "es" || next === "en") {
        setLanguage(next);
      }
    };

    window.addEventListener("botz-language-change", onLangChange);
    return () => window.removeEventListener("botz-language-change", onLangChange);
  }, []);

  const getLeadValue = (lead: Lead) => {
    return Number((lead as any).valor_vivienda ?? (lead as any).precio_real ?? 0) || 0;
  };

  const getLeadDtiPercent = (lead: Lead) => {
    const raw = Number((lead as any).dtiPercent ?? (lead as any).dti ?? 0) || 0;
    if (raw > 0 && raw <= 1) return raw * 100;
    return raw;
  };

  useEffect(() => {
    if (canViewExecDashboard && !authLoading) {
      // Hacer fetch incluso sin tenantId inicial (se resolverá dentro del fetch)
      fetchRealData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, canViewExecDashboard, authLoading, selectedMonth, dataRefreshKey]);

  // Safety timeout: si loading no se resuelve en 30s, forzar false
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      console.warn('[ExecutiveDashboard] ⚠️ Safety timeout: forcing loading=false after 30s');
      setLoading(false);
    }, 30000);
    return () => clearTimeout(timer);
  }, [loading]);

  const fetchRealData = async () => {
    try {
        setLoading(true);
        setError("");
        console.log('Fetching data for month:', selectedMonth);

        // Resolver tenant_id: preferir AuthProvider (team_members), fallback a metadata
        const { data: { session } } = await supabase.auth.getSession();
        const tenantId = authTenantId || session?.user?.user_metadata?.tenant_id || session?.user?.app_metadata?.tenant_id || null;
        console.log('Tenant ID:', tenantId);

        // Platform admin: require explicit tenant selection to avoid cross-tenant leakage.
        if (isPlatformAdmin && !tenantId) {
          setError(language === "en" ? "Select a tenant to view the Executive Dashboard." : "Selecciona un cliente (tenant) para ver el Dashboard Ejecutivo.");
          return;
        }

        // If user can't view all leads, ensure we have a team member id to scope results.
        if (!canViewAllLeads && !teamMemberId) {
          setError(language === "en" ? "Your account is not linked to a team member yet." : "Tu cuenta aun no esta vinculada a un miembro del equipo.");
          return;
        }
        
        // Obtener leads con paginación y filtro por tenant
        let allLeadsData: Lead[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
            let query = supabase
                .from('leads')
                .select('*')
                .range(page * pageSize, (page + 1) * pageSize - 1);
            
            // Filtrar por tenant_id si existe (como hace KanbanBoard)
            if (tenantId) {
                query = query.eq('tenant_id', tenantId);
            }

            // Asesor / restricted access: only assigned leads (extra safety even if RLS is misconfigured)
            if (!canViewAllLeads && teamMemberId) {
              query = query.or(`asesor_id.eq.${teamMemberId},assigned_to.eq.${teamMemberId}`);
            }
            
            const { data: leadsPage, error: leadsError } = await query;
            
            if (leadsError) {
                console.error('Error fetching leads page', page, leadsError);
                throw leadsError;
            }
            
            if (leadsPage && leadsPage.length > 0) {
                allLeadsData = [...allLeadsData, ...leadsPage];
                page++;
                hasMore = leadsPage.length === pageSize;
                console.log(`Fetched page ${page}: ${leadsPage.length} leads. Total: ${allLeadsData.length}`);
            } else {
                hasMore = false;
            }
        }
        
        // Verificar duplicados por ID
        const uniqueIds = new Set(allLeadsData.map(l => l.id));
        if (uniqueIds.size !== allLeadsData.length) {
            console.warn('⚠️ Duplicados detectados:', allLeadsData.length - uniqueIds.size, 'leads duplicados');
            // Eliminar duplicados manteniendo el primero
            const seen = new Set();
            allLeadsData = allLeadsData.filter(l => {
                if (seen.has(l.id)) return false;
                seen.add(l.id);
                return true;
            });
            console.log('Después de eliminar duplicados:', allLeadsData.length);
        }
        
        let asesoresQuery = supabase
          .from('team_members')
          .select('id, nombre, email')
          .eq('activo', true);

        if (tenantId) asesoresQuery = asesoresQuery.eq('tenant_id', tenantId);

        // If user can't view tenant-wide leads, only show their own row.
        if (!canViewAllLeads && teamMemberId) {
          asesoresQuery = asesoresQuery.eq('id', teamMemberId);
        }

        const { data: asesores, error: asesoresError } = await asesoresQuery;

        if (asesoresError) throw asesoresError;

        console.log('Total leads fetched (filtered by tenant):', allLeadsData.length);
        
        setAllLeads(allLeadsData);
        
        const asesoresData: TeamMember[] = asesores || [];
        
        // Filtrar por mes seleccionado
        const [year, month] = selectedMonth.split('-').map(Number);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59);
        
        console.log('Filtering leads between:', monthStart, 'and', monthEnd);
        
        let leads = allLeadsData.filter(l => {
            if (!l.created_at) {
                console.log('Lead without created_at:', l.id);
                return false;
            }
            const leadDate = new Date(l.created_at);
            const isInRange = leadDate >= monthStart && leadDate <= monthEnd;
            if (isInRange) {
                console.log('Lead in range:', l.id, l.created_at);
            }
            return isInRange;
        });
        
        console.log('Leads after month filter:', leads.length);

        // Aplicar filtro si existe
        let filteredLeads = leads;
        if (filter) {
            filteredLeads = leads.filter(l => 
                l.source && l.source.toLowerCase().includes(filter.toLowerCase())
            );
        }

        const total = filteredLeads.length;
        
        // Calcular métricas por asesor (usa asesor_id con fallback a assigned_to)
        const asesoresMetrics: AsesorMetrics[] = asesoresData.map(asesor => {
            const asesorLeads = filteredLeads.filter(l => {
                return (l.asesor_id || l.assigned_to) === asesor.id;
            });
            const atendidos = asesorLeads.filter(l => {
                const s = l.status?.toUpperCase() || '';
                return s !== 'NUEVO' && s !== '';
            });
            const ventas = asesorLeads.filter(l => {
                const s = l.status?.toUpperCase() || '';
                return s === 'FIRMADO' || s === 'CONVERTIDO' || s === 'GANADA' || s === 'VENTA';
            });
            const pipeline = asesorLeads.filter(l => {
                const s = l.status?.toUpperCase() || '';
                return s !== 'FIRMADO' && s !== 'CONVERTIDO' && s !== 'PERDIDO' && s !== 'DESCARTADO';
            });
            
            return {
                id: asesor.id,
                nombre: asesor.nombre,
                leadsAsignados: asesorLeads.length,
                leadsAtendidos: atendidos.length,
                conversionRate: asesorLeads.length ? Math.round((ventas.length / asesorLeads.length) * 100) : 0,
                tiempoPromedioRespuesta: Math.floor(Math.random() * 24) + 1, // Simulado por ahora
                pipelineValue: pipeline.reduce((sum, l) => sum + getLeadValue(l), 0),
                ventasCerradas: ventas.length,
                comisionTotal: ventas.reduce((sum, l) => sum + (l.commission || 0), 0)
            };
        }).sort((a, b) => b.conversionRate - a.conversionRate);

        // Métricas generales
        const firmados = filteredLeads.filter(l => {
            const s = l.status?.toUpperCase() || '';
            return s === 'FIRMADO' || s === 'CONVERTIDO' || s === 'GANADA' || s === 'VENTA';
        });

        const comisionTotal = firmados.reduce((sum, l) => sum + (Number(l.commission) || 0), 0);
        
        // Pipeline por etapas
        const countByStatus = (status: string) => 
            filteredLeads.filter(l => l.status?.toUpperCase() === status.toUpperCase()).length;
        
        // Canal analysis
        const canalStats = calculateCanalStats(filteredLeads);
        
        // Métricas hipotecarias
        const hipotecas = filteredLeads.filter(l => getLeadValue(l) > 0 || getLeadDtiPercent(l) > 0);
        const dtiPromedio = hipotecas.length 
            ? Math.round(hipotecas.reduce((sum, l) => sum + getLeadDtiPercent(l), 0) / hipotecas.length) 
            : 0;
        const valorPromedio = hipotecas.length 
            ? Math.round(hipotecas.reduce((sum, l) => sum + getLeadValue(l), 0) / hipotecas.length) 
            : 0;

        const hipotecasAprobadas = hipotecas.filter(l => {
            const status = (l.status || '').toUpperCase();
            if (['FIRMADO', 'CONVERTIDO', 'GANADA', 'VENTA', 'PRE-APROBADO'].includes(status)) {
                return true;
            }
            const dti = getLeadDtiPercent(l);
            return dti > 0 && dti <= 40;
        }).length;
        
        // Alertas
        const alertas = generateAlertas(filteredLeads, asesoresMetrics);
        
        // Análisis temporal (últimos 30 días)
        const hoy = new Date();
        const treintaDiasAtras = new Date(hoy.getTime() - (30 * 24 * 60 * 60 * 1000));
        const leadsRecientes = filteredLeads.filter(l => {
            if (!l.created_at) return false;
            const fecha = new Date(l.created_at);
            return fecha >= treintaDiasAtras;
        });
        
        // Comparativa mes anterior
        const sesentaDiasAtras = new Date(hoy.getTime() - (60 * 24 * 60 * 60 * 1000));
        const leadsMesAnterior = filteredLeads.filter(l => {
            if (!l.created_at) return false;
            const fecha = new Date(l.created_at);
            return fecha >= sesentaDiasAtras && fecha < treintaDiasAtras;
        });

        const variacionLeads = leadsMesAnterior.length 
            ? Math.round(((leadsRecientes.length - leadsMesAnterior.length) / leadsMesAnterior.length) * 100)
            : 0;

        console.log('Setting metrics:', { total, totalGlobal: allLeadsData.length, totalFiltered: filteredLeads.length });
        
        setMetrics({
            general: {
                totalLeads: total,
                totalLeadsGlobal: allLeadsData.length, // Total sin filtro de mes
                leadsNuevos: countByStatus('NUEVO'),
                leadsRecientes: leadsRecientes.length,
                variacionLeads,
                tasaCierre: total ? Math.round((firmados.length / total) * 100) : 0,
                comisionTotal,
                tiempoPromedioCierre: 12,
                 promedioPorAsesor: Math.round(total / (asesoresData.length || 1))
             },
             asesores: asesoresMetrics,
            funnel: [
                { stageKey: "new", count: countByStatus('NUEVO') + countByStatus('Nuevo'), color: "#94a3b8", probabilidad: 100 },
                { stageKey: "contacted", count: countByStatus('CONTACTADO'), color: "#22d3ee", probabilidad: 65 },
                { stageKey: "qualified", count: countByStatus('CALIFICADO'), color: "#38bdf8", probabilidad: 45 },
                { stageKey: "docs", count: countByStatus('DOCUMENTACIÓN'), color: "#818cf8", probabilidad: 30 },
                { stageKey: "pre_approved", count: countByStatus('PRE-APROBADO'), color: "#a78bfa", probabilidad: 20 },
                { stageKey: "negotiation", count: countByStatus('NEGOCIACIÓN'), color: "#f472b6", probabilidad: 15 },
                { stageKey: "closing", count: firmados.length, color: "#10b981", probabilidad: 10 },
            ],
            canalStats,
            hipotecario: {
                totalHipotecas: hipotecas.length,
                dtiPromedio,
                valorPromedio,
                aprobacionRate: hipotecas.length ? Math.round((hipotecasAprobadas / hipotecas.length) * 100) : 0,
                bancos: getTop(filteredLeads, 'bank', 5)
            },
            alertas,
            comparativa: {
                esteMes: leadsRecientes.length,
                mesAnterior: leadsMesAnterior.length,
                crecimiento: variacionLeads
            }
        });
        
    } catch (err) {
        console.error("Error Supabase:", err);
        setError((err as any)?.message || (language === "en" ? "Failed to load dashboard." : "No se pudo cargar el dashboard."));
    } finally {
        setLoading(false);
    }
  };

  const calculateCanalStats = (leads: Lead[]) => {
    const canales: Record<string, { count: number; conversion: number; value: number }> = {};
    const unknownChannel = language === "en" ? "Unknown" : "Desconocido";
    
    leads.forEach(l => {
        const canal = l.source || unknownChannel;
        if (!canales[canal]) {
            canales[canal] = { count: 0, conversion: 0, value: 0 };
        }
        canales[canal].count++;
        if (['FIRMADO', 'CONVERTIDO', 'VENTA'].includes(l.status?.toUpperCase() || '')) {
            canales[canal].conversion++;
            canales[canal].value += l.commission || 0;
        }
    });
    
    return Object.entries(canales)
        .map(([name, stats]) => ({
            name,
            count: stats.count,
            conversionRate: stats.count ? Math.round((stats.conversion / stats.count) * 100) : 0,
            value: stats.value
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
  };

  const generateAlertas = (leads: Lead[], asesores: AsesorMetrics[]) => {
    const alertas: Array<{ type: 'danger' | 'warning' | 'success' | 'info'; message: string; count?: number }> = [];
    const hoy = new Date();
    
    // Leads sin contactar > 24h
    const sinContactar = leads.filter(l => {
        if (!l.created_at) return false;
        const horas = (hoy.getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60);
        const status = l.status?.toUpperCase() || '';
        return horas > 24 && (status === 'NUEVO' || status === '');
    });
    if (sinContactar.length > 0) {
        alertas.push({ type: 'danger', message: t.alertNoContact24h, count: sinContactar.length });
    }
    
    // Leads con alto score (oportunidad)
    const highScore = leads.filter(l => (l.score || 0) > 80 && !['FIRMADO', 'CONVERTIDO'].includes(l.status?.toUpperCase() || ''));
    if (highScore.length > 0) {
        alertas.push({ type: 'success', message: t.alertHighScoreReady, count: highScore.length });
    }
    
    // Asesores con carga alta
    const sobrecargados = asesores.filter(a => a.leadsAsignados > 30);
    if (sobrecargados.length > 0) {
        alertas.push({ type: 'warning', message: t.alertOverloadedAdvisors, count: sobrecargados.length });
    }
    
    // Oportunidades de cierre
    const enNegociacion = leads.filter(l => l.status?.toUpperCase() === 'NEGOCIACIÓN');
    if (enNegociacion.length > 0) {
        alertas.push({ type: 'info', message: t.alertNegotiationStage, count: enNegociacion.length });
    }
    
    return alertas;
  };

  const getTop = (leads: Lead[], field: keyof Lead, limit: number = 4) => {
    const counts: Record<string, number> = {};
    leads.forEach((l: any) => {
        const val = l[field] || (language === "en" ? "Unknown" : "Desconocido");
        counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
        .sort(([,a]:any, [,b]:any) => b - a)
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));
  };

  // --- VISTA DE AUTENTICACIÓN ---
  if (authLoading) {
    return (
      <div style={{ ...glassStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={50} color="#22d3ee" className="animate-spin" />
      </div>
    );
  }

  // --- VISTA DE ACCESO RESTRINGIDO ---
  if (!canViewExecDashboard) {
    return (
      <div style={{ ...glassStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: "380px", textAlign: "center" }}>
          <div style={{ marginBottom: "25px", display: "inline-flex", padding: "20px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "50%", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
            <Lock size={40} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "10px", color: "#fff" }}>{t.restrictedTitle}</h2>
          <p style={{ color: "#94a3b8", marginBottom: "30px", fontSize: "14px" }}>{t.restrictedMsg}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...glassStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: "520px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <AlertTriangle size={18} color="#f59e0b" />
            <div style={{ fontWeight: 800, color: "#fff" }}>{language === "en" ? "Executive Dashboard" : "Dashboard Ejecutivo"}</div>
          </div>
          <div style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.5 }}>{error}</div>
        </div>
      </div>
    );
  }

  // --- VISTA DE CARGA ---
  if (!metrics) return <div style={{ ...glassStyle, display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={50} color="#22d3ee" className="animate-spin" /></div>;

  // --- VISTA DEL DASHBOARD ---
  return (
    <div style={glassStyle}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
           <h2 style={{ fontSize: "26px", fontWeight: "800", display: "flex", alignItems: "center", gap: "12px", margin: 0 }}>
            <BarChart3 size={28} color="#22d3ee" /> {t.dashboardTitle}
           </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "6px", flexWrap: "wrap" }}>
            {/* Selector de Mes */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Calendar size={16} color="#22d3ee" />
              <select 
                value={selectedMonth}
                onChange={(e) => {
                  console.log('Month selected:', e.target.value);
                  setSelectedMonth(e.target.value);
                }}
                style={{
                  background: "rgba(13, 22, 45, 0.8)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "14px",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - i);
                  const year = date.getFullYear();
                  const month = date.getMonth() + 1;
                  const value = `${year}-${String(month).padStart(2, '0')}`;
                  const label = date.toLocaleDateString(t.monthLocale, { month: 'long', year: 'numeric' });
                  return <option key={value} value={value}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>;
                })}
              </select>
            </div>
            
            {filter ? (
              <span style={{color: "#22d3ee", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px"}}>
                <Filter size={14}/> {t.filtering}: <span style={{textTransform:"uppercase"}}>{filter}</span>
              </span>
            ) : (
              <span style={{ color: "#94a3b8", fontSize: "14px" }}>
                <strong style={{ color: "#fff" }}>{metrics.general.totalLeads}</strong> {t.leadsThisMonthShort} •
                <strong style={{ color: "#22d3ee" }}> {metrics.general.totalLeadsGlobal}</strong> {t.totalInCrmShort}
              </span>
            )}
          </div>
        </div>
        
        {/* TABS */}
        <div style={{ display: "flex", gap: "8px", background: "rgba(255,255,255,0.05)", padding: "6px", borderRadius: "12px" }}>
          {[
            { id: 'general', label: t.general, icon: PieChart },
            { id: 'asesores', label: t.advisors, icon: Users },
            { id: 'hipotecario', label: t.mortgage, icon: Home },
            { id: 'alertas', label: t.alerts, icon: AlertCircle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "none",
                background: activeTab === tab.id ? "rgba(34, 211, 238, 0.2)" : "transparent",
                color: activeTab === tab.id ? "#22d3ee" : "#94a3b8",
                fontWeight: activeTab === tab.id ? "bold" : "normal",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px"
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENIDO SEGÚN TAB */}
      {activeTab === 'general' && <GeneralTab metrics={metrics} t={t} />}
      {activeTab === 'asesores' && <AsesoresTab asesores={metrics.asesores} t={t} />}
      {activeTab === 'hipotecario' && <HipotecarioTab data={metrics.hipotecario} t={t} />}
      {activeTab === 'alertas' && <AlertasTab alertas={metrics.alertas} t={t} />}
    </div>
  );
}

// --- SUB-COMPONENTES ---

function GeneralTab({ metrics, t }: { metrics: any; t: (typeof EXEC_TEXT)[AppLanguage] }) {
  const stageLabel = (key: string) => {
    switch (String(key || "").toLowerCase()) {
      case "new":
        return t.funnelNew;
      case "contacted":
        return t.funnelContacted;
      case "qualified":
        return t.funnelQualified;
      case "docs":
        return t.funnelDocs;
      case "pre_approved":
        return t.funnelPreApproved;
      case "negotiation":
        return t.funnelNegotiation;
      case "closing":
        return t.funnelClosing;
      default:
        return key;
    }
  };

  return (
    <>
      {/* KPIs PRINCIPALES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <KpiCard 
          icon={<Users size={22} color="#22d3ee"/>} 
          label={t.leadsMonth} 
          value={metrics.general.totalLeads}
          sublabel={t.newLeads(metrics.general.leadsNuevos)}
        />
        <KpiCard 
          icon={<BarChart3 size={22} color="#3b82f6"/>} 
          label={t.totalCrm} 
          value={metrics.general.totalLeadsGlobal}
          sublabel={t.fullDatabase}
          highlight
        />
        <KpiCard 
          icon={<Target size={22} color="#f472b6"/>} 
          label={t.closeRate} 
          value={`${metrics.general.tasaCierre}%`}
          trend={metrics.general.variacionLeads}
        />
        <KpiCard 
          icon={<DollarSign size={22} color="#10b981"/>} 
          label={t.commissions} 
          value={`$${metrics.general.comisionTotal.toLocaleString()}`}
        />
        <KpiCard 
          icon={<Clock size={22} color="#fbbf24"/>} 
          label={t.avgTime} 
          value={`${metrics.general.tiempoPromedioCierre} ${t.days}`}
        />
        <KpiCard 
          icon={<UserCheck size={22} color="#a78bfa"/>} 
          label={t.avgPerAdvisor} 
          value={metrics.general.promedioPorAsesor}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
        {/* FUNNEL DETALLADO */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#94a3b8", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingDown size={18} /> {t.monthPipeline}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {metrics.funnel.map((item: any, i: number) => {
                const max = metrics.general.totalLeads || 1;
                const percent = Math.round((item.count / max) * 100);
                const prevItem = i > 0 ? metrics.funnel[i-1] : null;
                const conversion = prevItem && prevItem.count > 0 
                    ? Math.round((item.count / prevItem.count) * 100) 
                    : 100;
                
                return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", fontSize: "14px" }}>
                        <span style={{ width: "120px", color: "#cbd5e1", fontWeight: 500 }}>{stageLabel(item.stageKey || item.stage)}</span>
                        <div style={{ flexGrow: 1, background: "rgba(255,255,255,0.05)", height: "10px", borderRadius: "5px", margin: "0 12px", overflow: "hidden" }}>
                            <div style={{ width: `${percent}%`, background: item.color, height: "100%", borderRadius: "5px", transition: "width 0.5s ease" }}></div>
                        </div>
                        <span style={{ width: "40px", textAlign: "right", color: "#fff", fontWeight: "bold" }}>{item.count}</span>
                        {i > 0 && (
                            <span style={{ width: "50px", textAlign: "right", color: conversion > 50 ? "#10b981" : "#f59e0b", fontSize: "11px" }}>
                                {conversion}%
                            </span>
                        )}
                    </div>
                </div>
            )})}
          </div>
        </div>

        {/* CANALES */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#94a3b8", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Zap size={18} /> {t.channelPerformance}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {metrics.canalStats.map((canal: any, i: number) => (
                <div key={i} style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ color: "#cbd5e1", fontWeight: 500 }}>{canal.name}</span>
                        <span style={{ color: "#fff", fontWeight: "bold" }}>{canal.count}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ color: canal.conversionRate > 20 ? "#10b981" : "#94a3b8" }}>
                            {t.conversionLabel}: {canal.conversionRate}%
                        </span>
                        {canal.value > 0 && (
                            <span style={{ color: "#22d3ee" }}>
                                ${canal.value.toLocaleString()}
                            </span>
                        )}
                    </div>
                </div>
            ))}
          </div>
        </div>
      </div>

      {/* COMPARATIVA MENSUAL */}
      <div style={{ ...cardStyle, marginTop: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#94a3b8", marginBottom: "15px" }}>
            {t.monthlyComparison}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
            <div style={{ textAlign: "center", padding: "20px", background: "rgba(255,255,255,0.03)", borderRadius: "12px" }}>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: "#fff" }}>{metrics.comparativa.esteMes}</div>
                <div style={{ color: "#94a3b8", fontSize: "13px" }}>{t.thisMonthLabel}</div>
            </div>
            <div style={{ textAlign: "center", padding: "20px", background: "rgba(255,255,255,0.03)", borderRadius: "12px" }}>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: "#fff" }}>{metrics.comparativa.mesAnterior}</div>
                <div style={{ color: "#94a3b8", fontSize: "13px" }}>{t.previousMonthLabel}</div>
            </div>
            <div style={{ textAlign: "center", padding: "20px", background: metrics.comparativa.crecimiento >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", borderRadius: "12px", border: `1px solid ${metrics.comparativa.crecimiento >= 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}` }}>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: metrics.comparativa.crecimiento >= 0 ? "#10b981" : "#ef4444" }}>
                    {metrics.comparativa.crecimiento > 0 ? '+' : ''}{metrics.comparativa.crecimiento}%
                </div>
                <div style={{ color: "#94a3b8", fontSize: "13px" }}>{t.variationLabel}</div>
            </div>
        </div>
      </div>
    </>
  );
}

function AsesoresTab({ asesores, t }: { asesores: AsesorMetrics[]; t: (typeof EXEC_TEXT)[AppLanguage] }) {
  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#fff", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <Award size={22} color="#fbbf24" /> {t.advisorsRanking}
      </h3>
      
      <div style={{ overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <th style={{ textAlign: "left", padding: "12px", color: "#94a3b8", fontSize: "13px" }}>#</th>
              <th style={{ textAlign: "left", padding: "12px", color: "#94a3b8", fontSize: "13px" }}>{t.advisor}</th>
              <th style={{ textAlign: "center", padding: "12px", color: "#94a3b8", fontSize: "13px" }}>{t.leads}</th>
              <th style={{ textAlign: "center", padding: "12px", color: "#94a3b8", fontSize: "13px" }}>{t.convRateShort}</th>
              <th style={{ textAlign: "center", padding: "12px", color: "#94a3b8", fontSize: "13px" }}>{t.sales}</th>
              <th style={{ textAlign: "right", padding: "12px", color: "#94a3b8", fontSize: "13px" }}>{t.pipeline}</th>
              <th style={{ textAlign: "right", padding: "12px", color: "#94a3b8", fontSize: "13px" }}>{t.commissionShort}</th>
            </tr>
          </thead>
          <tbody>
            {asesores.map((asesor, i) => (
              <tr key={asesor.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "12px" }}>
                    {i === 0 ? <Award size={18} color="#fbbf24" /> : 
                     i === 1 ? <Award size={18} color="#94a3b8" /> :
                     i === 2 ? <Award size={18} color="#b45309" /> : 
                     <span style={{ color: "#64748b" }}>{i + 1}</span>}
                </td>
                <td style={{ padding: "12px", color: "#fff", fontWeight: 500 }}>{asesor.nombre}</td>
                <td style={{ textAlign: "center", padding: "12px", color: "#cbd5e1" }}>
                    {asesor.leadsAsignados} <span style={{ fontSize: "11px", color: "#64748b" }}>({asesor.leadsAtendidos})</span>
                </td>
                <td style={{ textAlign: "center", padding: "12px" }}>
                    <span style={{ 
                        color: asesor.conversionRate >= 30 ? "#10b981" : 
                               asesor.conversionRate >= 15 ? "#fbbf24" : "#ef4444",
                        fontWeight: "bold"
                    }}>
                        {asesor.conversionRate}%
                    </span>
                </td>
                <td style={{ textAlign: "center", padding: "12px", color: "#22d3ee", fontWeight: "bold" }}>
                    {asesor.ventasCerradas}
                </td>
                <td style={{ textAlign: "right", padding: "12px", color: "#94a3b8" }}>
                    ${asesor.pipelineValue.toLocaleString()}
                </td>
                <td style={{ textAlign: "right", padding: "12px", color: "#10b981", fontWeight: "bold" }}>
                    ${asesor.comisionTotal.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HipotecarioTab({ data, t }: { data: any; t: (typeof EXEC_TEXT)[AppLanguage] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
      <div style={cardStyle}>
        <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#94a3b8", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Percent size={18} /> {t.dtiMetrics}
        </h3>
        <div style={{ textAlign: "center", padding: "30px" }}>
          <div style={{ fontSize: "48px", fontWeight: "bold", color: data.dtiPromedio < 35 ? "#10b981" : data.dtiPromedio < 45 ? "#fbbf24" : "#ef4444" }}>
            {data.dtiPromedio}%
          </div>
          <div style={{ color: "#94a3b8", marginTop: "8px" }}>{t.dtiAverage}</div>
          <div style={{ marginTop: "16px", padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: "13px", color: "#cbd5e1" }}>
            {data.dtiPromedio < 35 ? t.dtiExcellent : data.dtiPromedio < 45 ? t.dtiModerate : t.dtiHigh}
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#94a3b8", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Home size={18} /> {t.avgValue}
        </h3>
        <div style={{ textAlign: "center", padding: "30px" }}>
          <div style={{ fontSize: "36px", fontWeight: "bold", color: "#22d3ee" }}>
            ${data.valorPromedio.toLocaleString()}
          </div>
          <div style={{ color: "#94a3b8", marginTop: "8px" }}>{t.avgHomeValue}</div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#94a3b8", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle2 size={18} /> {t.approvalRate}
        </h3>
        <div style={{ textAlign: "center", padding: "30px" }}>
          <div style={{ fontSize: "48px", fontWeight: "bold", color: data.aprobacionRate >= 60 ? "#10b981" : data.aprobacionRate >= 40 ? "#fbbf24" : "#ef4444" }}>
            {data.aprobacionRate}%
          </div>
          <div style={{ color: "#94a3b8", marginTop: "8px" }}>{t.approvedOps}</div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#94a3b8", marginBottom: "15px" }}>
          {t.topBanks}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {data.bancos.map((banco: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
              <span style={{ color: "#cbd5e1" }}>{banco.name}</span>
              <span style={{ color: "#22d3ee", fontWeight: "bold" }}>{banco.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertasTab({ alertas, t }: { alertas: any[]; t: (typeof EXEC_TEXT)[AppLanguage] }) {
  return (
    <div>
      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#fff", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <AlertCircle size={22} color="#f43f5e" /> {t.alertsCenter}
      </h3>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "16px" }}>
        {alertas.length > 0 ? alertas.map((alerta, i) => (
          <div key={i} style={alertCardStyle(alerta.type)}>
            <div style={{ 
              padding: "10px", 
              borderRadius: "8px", 
              background: alerta.type === 'danger' ? "rgba(239, 68, 68, 0.2)" :
                          alerta.type === 'warning' ? "rgba(245, 158, 11, 0.2)" :
                          alerta.type === 'success' ? "rgba(16, 185, 129, 0.2)" : "rgba(34, 211, 238, 0.2)"
            }}>
              {alerta.type === 'danger' && <AlertTriangle size={24} color="#ef4444" />}
              {alerta.type === 'warning' && <Clock4 size={24} color="#f59e0b" />}
              {alerta.type === 'success' && <CheckCircle2 size={24} color="#10b981" />}
              {alerta.type === 'info' && <Activity size={24} color="#22d3ee" />}
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: "15px" }}>
                {alerta.message}
              </div>
              {alerta.count && (
                <div style={{ color: "#94a3b8", fontSize: "24px", fontWeight: "bold", marginTop: "4px" }}>
                  {alerta.count} {alerta.count === 1 ? t.caseSingular : t.casePlural}
                </div>
              )}
            </div>
          </div>
        )) : (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: "16px" }} />
            <div style={{ fontSize: "18px", color: "#10b981" }}>{t.allGoodTitle}</div>
            <div style={{ fontSize: "14px" }}>{t.noActiveAlerts}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sublabel, trend, highlight = false }: any) {
  return (
    <div style={{ 
      background: highlight ? "rgba(34, 211, 238, 0.1)" : "rgba(13, 22, 45, 0.6)", 
      border: highlight ? "1px solid rgba(34, 211, 238, 0.3)" : "1px solid rgba(255,255,255,0.05)", 
      padding: "20px", 
      borderRadius: "16px", 
      display: "flex", 
      flexDirection: "column", 
      gap: "8px" 
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span style={{ fontSize: "28px", fontWeight: "bold", color: "#fff" }}>{value}</span>
          {trend !== undefined && (
            <span style={{ 
              marginLeft: "8px", 
              fontSize: "13px", 
              color: trend >= 0 ? "#10b981" : "#ef4444",
              fontWeight: "bold"
            }}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
        <div style={{ padding: "10px", background: "rgba(255,255,255,0.05)", borderRadius: "10px" }}>{icon}</div>
      </div>
      <div>
        <span style={{ fontSize: "13px", color: highlight ? "#22d3ee" : "#94a3b8", textTransform: "uppercase", fontWeight: 500 }}>{label}</span>
        {sublabel && <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "8px" }}>({sublabel})</span>}
      </div>
    </div>
  );
}
