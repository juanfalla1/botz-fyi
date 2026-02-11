"use client";

import React, { useState } from "react";
import { FileText, Settings, ChevronRight } from "lucide-react";
import { supabase } from "./supabaseClient";

interface LeadScoringConfig {
  nombre: string;
  email: string;
  telefono?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  website: string;
  logo_url: string;
  booking_url: string;
  whatsapp_url: string;
  phone: string;
  enable_lead_scoring_emails: boolean;
}

export default function SimpleLeadScoringButton() {
  const [config, setConfig] = useState<Partial<LeadScoringConfig>>({
    smtp_host: "smtp.zohocloud.ca",
    smtp_port: 465,
    from_name: "",
    enable_lead_scoring_emails: true
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleConnect = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.user_metadata?.tenant_id || user?.id;

      if (!tenantId) {
        setMessage({ type: 'error', text: 'No se encontró tenant_id' });
        return;
      }

      // Guardar configuración simple
      const { error } = await supabase
        .from('tenant_configurations')
        .upsert({
          tenant_id: tenantId,
          ...config,
          company_name: config.from_name || "Mi Empresa",
          created_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id'
        });

      if (error) {
        throw error;
      }

      // Redirigir a settings completo
      window.location.href = "/settings";

    } catch (error: any) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: error.message || 'Error desconocido' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)",
      border: "2px solid rgba(245, 158, 11, 0.3)",
      borderRadius: "12px",
      padding: "20px",
      margin: "20px 0",
      maxWidth: "400px",
      textAlign: "center"
    }}>
      {/* Icono y título */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{
          width: "48px",
          height: "48px",
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 12px"
        }}>
          <FileText size={24} color="white" />
        </div>
        
        <h3 style={{
          color: "#fff",
          fontSize: "18px",
          fontWeight: "bold",
          margin: "12px 0 8px 0"
        }}>
          Lead Scoring Hipotecario
        </h3>
        
        <p style={{
          color: "#fbbf24",
          fontSize: "14px",
          margin: "0 0 16px 0",
          lineHeight: "1.4"
        }}>
          Configuración de emails y scoring automático para tu empresa
        </p>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div style={{
          background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "16px"
        }}>
          <p style={{
            color: message.type === 'success' ? '#22c55e' : '#ef4444',
            fontSize: "13px",
            margin: 0
          }}>
            {message.text}
          </p>
        </div>
      )}

      {/* Botón de configuración */}
      <button
        onClick={handleConnect}
        disabled={isSaving}
        style={{
          width: "100%",
          padding: "16px 24px",
          background: isSaving 
            ? 'rgba(245, 158, 11, 0.5)' 
            : 'linear-gradient(135deg, #f59e0b, #d97706)',
          border: "none",
          borderRadius: "8px",
          color: "#fff",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: isSaving ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          transition: "all 0.3s ease"
        }}
      >
        {isSaving ? (
          <div>Configurando...</div>
        ) : (
          <>
            <Settings size={20} />
            <span>Configurar Lead Scoring</span>
            <ChevronRight size={18} />
          </>
        )}
      </button>

      {/* Beneficios */}
      <div style={{
        marginTop: "20px",
        padding: "16px",
        background: "rgba(255, 255, 255, 0.05)",
        borderRadius: "8px"
      }}>
        <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "8px" }}>
          ✅ Email personalizado desde tu dominio
        </div>
        <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "8px" }}>
          ✅ Leads calificados automáticamente
        </div>
        <div style={{ color: "#94a3b8", fontSize: "12px" }}>
          ✅ Configuración multi-tenant lista
        </div>
      </div>
    </div>
  );
}