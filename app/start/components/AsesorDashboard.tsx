"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from '../MainLayout';
import { 
  Target, TrendingUp, Users, DollarSign, Clock, Calendar,
  CheckCircle2, AlertCircle, Phone, Mail, MessageSquare,
  BarChart3, Award, Star, Activity
} from 'lucide-react';

interface AsesorMetrics {
  totalLeads: number;
  nuevosLeads: number;
  contactados: number;
  enProceso: number;
  cerrados: number;
  perdidos: number;
  tasaConversion: number;
  comisiones: number;
  actividadReciente: Array<{
    id: string;
    tipo: 'llamada' | 'email' | 'whatsapp' | 'nota';
    descripcion: string;
    fecha: string;
    leadName: string;
  }>;
  leadsPrioritarios: Array<{
    id: string;
    name: string;
    status: string;
    score: number;
    lastContact: string;
  }>;
}

export default function AsesorDashboard() {
  const { user, isAsesor } = useAuth();
  const [metrics, setMetrics] = useState<AsesorMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAsesor && user?.team_member_id) {
      fetchAsesorMetrics();
    }
  }, [isAsesor, user]);

  const fetchAsesorMetrics = async () => {
    try {
      setLoading(true);
      
      // Obtener leads asignados al asesor
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', user?.team_member_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const leadsList = leads || [];
      
      // Calcular métricas
      const nuevos = leadsList.filter(l => l.status?.toUpperCase() === 'NUEVO').length;
      const contactados = leadsList.filter(l => 
        ['CONTACTADO', 'SEGUIMIENTO'].includes(l.status?.toUpperCase() || '')
      ).length;
      const enProceso = leadsList.filter(l => 
        ['DOCUMENTACIÓN', 'PRE-APROBADO', 'NEGOCIACIÓN'].includes(l.status?.toUpperCase() || '')
      ).length;
      const cerrados = leadsList.filter(l => 
        ['FIRMADO', 'CONVERTIDO', 'VENTA'].includes(l.status?.toUpperCase() || '')
      ).length;
      const perdidos = leadsList.filter(l => 
        ['PERDIDO', 'DESCARTADO'].includes(l.status?.toUpperCase() || '')
      ).length;
      
      const comisiones = cerrados > 0 
        ? leadsList
            .filter(l => ['FIRMADO', 'CONVERTIDO', 'VENTA'].includes(l.status?.toUpperCase() || ''))
            .reduce((sum, l) => sum + (l.commission || 0), 0)
        : 0;

      // Leads prioritarios (alto score, no cerrados)
      const prioritarios = leadsList
        .filter(l => 
          (l.score || 0) > 70 && 
          !['FIRMADO', 'CONVERTIDO', 'VENTA', 'PERDIDO', 'DESCARTADO'].includes(l.status?.toUpperCase() || '')
        )
        .slice(0, 5)
        .map(l => ({
          id: l.id,
          name: l.name || 'Sin nombre',
          status: l.status || 'NUEVO',
          score: l.score || 0,
          lastContact: l.updated_at || l.created_at
        }));

      setMetrics({
        totalLeads: leadsList.length,
        nuevosLeads: nuevos,
        contactados,
        enProceso,
        cerrados,
        perdidos,
        tasaConversion: leadsList.length > 0 ? Math.round((cerrados / leadsList.length) * 100) : 0,
        comisiones,
        actividadReciente: [], // Aquí podrías traer la actividad real
        leadsPrioritarios: prioritarios
      });
      
    } catch (err) {
      console.error('Error fetching asesor metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAsesor) {
    return null; // Solo para asesores
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        Cargando tu panel...
      </div>
    );
  }

  if (!metrics) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        Error al cargar métricas
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          margin: 0 
        }}>
          <Target color="#22d3ee" /> Mi Panel de Asesor
        </h2>
        <p style={{ color: '#94a3b8', marginTop: '6px' }}>
          Bienvenido {user?.nombre}. Aquí están tus leads y métricas.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <KpiCard 
          icon={<Users size={22} color="#22d3ee"/>} 
          label="Mis Leads" 
          value={metrics.totalLeads}
          sublabel={`${metrics.nuevosLeads} nuevos`}
        />
        <KpiCard 
          icon={<CheckCircle2 size={22} color="#10b981"/>} 
          label="Cerrados" 
          value={metrics.cerrados}
          highlight
        />
        <KpiCard 
          icon={<TrendingUp size={22} color="#f472b6"/>} 
          label="Mi Tasa de Cierre" 
          value={`${metrics.tasaConversion}%`}
        />
        <KpiCard 
          icon={<DollarSign size={22} color="#fbbf24"/>} 
          label="Mis Comisiones" 
          value={`$${metrics.comisiones.toLocaleString()}`}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Pipeline personal */}
        <div style={{
          background: 'rgba(13, 22, 45, 0.6)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px'
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            color: '#94a3b8', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <BarChart3 size={18} /> Tu Pipeline
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Nuevos', count: metrics.nuevosLeads, color: '#64748b' },
              { label: 'Contactados', count: metrics.contactados, color: '#22d3ee' },
              { label: 'En Proceso', count: metrics.enProceso, color: '#818cf8' },
              { label: 'Cerrados', count: metrics.cerrados, color: '#10b981' },
              { label: 'Perdidos', count: metrics.perdidos, color: '#ef4444' }
            ].map((item, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '12px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: item.color
                  }} />
                  <span style={{ color: '#cbd5e1' }}>{item.label}</span>
                </div>
                <span style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: item.count > 0 ? '#fff' : '#64748b' 
                }}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Leads Prioritarios */}
        <div style={{
          background: 'rgba(13, 22, 45, 0.6)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px'
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            color: '#94a3b8', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Star size={18} color="#fbbf24" /> Leads Prioritarios
          </h3>
          
          {metrics.leadsPrioritarios.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {metrics.leadsPrioritarios.map((lead) => (
                <div key={lead.id} style={{
                  padding: '14px',
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.2)',
                  borderRadius: '10px'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}>
                    <span style={{ color: '#fff', fontWeight: 500 }}>{lead.name}</span>
                    <span style={{ 
                      padding: '2px 8px',
                      background: 'rgba(251, 191, 36, 0.2)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#fbbf24',
                      fontWeight: 'bold'
                    }}>
                      Score: {lead.score}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#94a3b8'
                  }}>
                    <span>Estado: {lead.status}</span>
                    <span>Último contacto: {new Date(lead.lastContact).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
              <AlertCircle size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
              <p>No tienes leads prioritarios pendientes</p>
              <p style={{ fontSize: '13px', marginTop: '6px' }}>
                Los leads con score alto aparecerán aquí
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div style={{
        background: 'rgba(13, 22, 45, 0.6)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '20px',
        marginTop: '24px'
      }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          color: '#94a3b8', 
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Activity size={18} /> Acciones Rápidas
        </h3>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <ActionButton icon={Phone} label="Llamar Lead" color="#22d3ee" />
          <ActionButton icon={Mail} label="Enviar Email" color="#818cf8" />
          <ActionButton icon={MessageSquare} label="WhatsApp" color="#10b981" />
          <ActionButton icon={Calendar} label="Agendar Cita" color="#fbbf24" />
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sublabel, highlight = false }: any) {
  return (
    <div style={{ 
      background: highlight ? 'rgba(34, 211, 238, 0.1)' : 'rgba(13, 22, 45, 0.6)', 
      border: highlight ? '1px solid rgba(34, 211, 238, 0.3)' : '1px solid rgba(255,255,255,0.05)', 
      padding: '20px', 
      borderRadius: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff' }}>{value}</div>
          {sublabel && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{sublabel}</div>}
        </div>
        <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '13px', color: highlight ? '#22d3ee' : '#94a3b8', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, color }: { icon: any, label: string, color: string }) {
  return (
    <button style={{
      padding: '12px 20px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s'
    }}>
      <Icon size={18} color={color} />
      {label}
    </button>
  );
}