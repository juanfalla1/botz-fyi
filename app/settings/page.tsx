"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Settings, Mail, Globe, Calendar, Phone, Save, CheckCircle, ArrowLeft } from "lucide-react";

interface TenantConfig {
  tenant_id: string;
  company_name: string;
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

export default function TenantSettings() {
  const [config, setConfig] = useState<Partial<TenantConfig>>({
    smtp_host: "smtp.zohocloud.ca",
    smtp_port: 465,
    from_name: "",
    enable_lead_scoring_emails: true
  });

  // Si viene de ChannelsView, puede haber un tenant_id preseleccionado
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tenantId = urlParams.get('tenant_id');
    if (tenantId) {
      // Cargar configuración específica del tenant si viene como parámetro
      console.log('Cargando configuración para tenant:', tenantId);
    }
  }, []);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadTenantConfig();
  }, []);

  const loadTenantConfig = async () => {
    setIsLoading(true);
    try {
      // Obtener tenant_id del usuario actual (esto debe venir del auth)
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.app_metadata?.tenant_id || "0811c118-5a2f-40cb-907e-8979e0984096";

      const { data: tenantConfig, error } = await supabase
        .from('tenant_configurations')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (tenantConfig && !error) {
        setConfig({
          ...tenantConfig,
          // No mostrar la contraseña por seguridad
          smtp_password: tenantConfig.smtp_password ? "••••••••" : ""
        });
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      setMessage({ type: 'error', text: 'Error cargando configuración' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.app_metadata?.tenant_id || "0811c118-5a2f-40cb-907e-8979e0984096";

      const configToSave = {
        ...config,
        tenant_id: tenantId,
        // Si la contraseña está enmascarada, no la actualizamos
        smtp_password: config.smtp_password === "••••••••" ? undefined : config.smtp_password
      };

      const { error } = await supabase
        .from('tenant_configurations')
        .upsert(configToSave, {
          onConflict: 'tenant_id'
        });

      if (error) {
        throw error;
      }

      setMessage({ type: 'success', text: '✅ Configuración guardada exitosamente' });
      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error('Error guardando configuración:', error);
      setMessage({ type: 'error', text: 'Error guardando configuración' });
    } finally {
      setIsSaving(false);
    }
  };

  const testEmailConfig = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          tenant_config: config,
          to: config.from_email || 'test@example.com',
          subject: '📧 Prueba de Configuración SMTP',
          html: `<h1>✅ Email de prueba enviado exitosamente</h1><p>Configuración SMTP funcionando correctamente para ${config.company_name}</p>`
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Email de prueba enviado exitosamente' });
      } else {
        throw new Error('Error enviando email de prueba');
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Error en configuración SMTP' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleInputChange = (field: keyof TenantConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a' }}>
        <div style={{ color: '#fff', fontSize: '18px' }}>Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Botón Volver a Canales */}
        <div style={{ marginBottom: '30px' }}>
          <button
            onClick={() => window.location.href = '/start'}
            style={{
              background: 'transparent',
              border: '1px solid #444',
              color: '#999',
              borderRadius: '8px',
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ArrowLeft size={16} />
            Volver a Canales
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
            <Settings size={32} color="#22d3ee" />
<h1 style={{ color: '#fff', fontSize: '32px', margin: 0, fontWeight: 'bold' }}>
              Configuración de Mi Cuenta
            </h1>
          </div>
<p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>
            Personaliza tu branding, emails y enlaces para el sistema de lead scoring
          </p>
        </div>

        {message && (
          <div style={{
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <p style={{ 
              color: message.type === 'success' ? '#22c55e' : '#ef4444', 
              margin: 0,
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {message.text}
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Configuración de Empresa y Branding */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '32px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <Globe size={24} color="#60a5fa" />
              <h2 style={{ color: '#fff', fontSize: '20px', margin: 0 }}>Empresa y Branding</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                  Nombre de la Empresa *
                </label>
                <input
                  type="text"
                  value={config.company_name || ''}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  placeholder="Inmobiliaria Pérez S.A."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                  Sitio Web
                </label>
                <input
                  type="url"
                  value={config.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://inmobiliaria-perez.com"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                  URL del Logo
                </label>
                <input
                  type="url"
                  value={config.logo_url || ''}
                  onChange={(e) => handleInputChange('logo_url', e.target.value)}
                  placeholder="https://inmobiliaria-perez.com/logo.png"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Configuración de Email SMTP */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '32px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <Mail size={24} color="#10b981" />
              <h2 style={{ color: '#fff', fontSize: '20px', margin: 0 }}>Configuración Email (SMTP)</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                    Servidor SMTP *
                  </label>
                  <input
                    type="text"
                    value={config.smtp_host || ''}
                    onChange={(e) => handleInputChange('smtp_host', e.target.value)}
                    placeholder="smtp.zohocloud.ca"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                    Puerto *
                  </label>
                  <input
                    type="number"
                    value={config.smtp_port || 465}
                    onChange={(e) => handleInputChange('smtp_port', parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                  Usuario SMTP *
                </label>
                <input
                  type="email"
                  value={config.smtp_user || ''}
                  onChange={(e) => handleInputChange('smtp_user', e.target.value)}
                  placeholder="contacto@inmobiliaria.com"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                  Contraseña SMTP *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={config.smtp_password || ''}
                    onChange={(e) => handleInputChange('smtp_password', e.target.value)}
                    placeholder="•••••••••"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                    Email From *
                  </label>
                  <input
                    type="email"
                    value={config.from_email || ''}
                    onChange={(e) => handleInputChange('from_email', e.target.value)}
                    placeholder="contacto@inmobiliaria.com"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                    Nombre From *
                  </label>
                  <input
                    type="text"
                    value={config.from_name || ''}
                    onChange={(e) => handleInputChange('from_name', e.target.value)}
                    placeholder="Inmobiliaria Pérez"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Configuración de Enlaces y Contacto */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '32px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <Calendar size={24} color="#8b5cf6" />
              <h2 style={{ color: '#fff', fontSize: '20px', margin: 0 }}>Enlaces y Contacto</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                  URL de Agenda de Reuniones *
                </label>
                <input
                  type="url"
                  value={config.booking_url || ''}
                  onChange={(e) => handleInputChange('booking_url', e.target.value)}
                  placeholder="https://inmobiliaria-perez.reservar.com/cita"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                  URL de WhatsApp
                </label>
                <input
                  type="url"
                  value={config.whatsapp_url || ''}
                  onChange={(e) => handleInputChange('whatsapp_url', e.target.value)}
                  placeholder="https://wa.me/573001112233"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  value={config.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+57 300 111 2233"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Configuración de Lead Scoring */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '32px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <CheckCircle size={24} color="#f59e0b" />
              <h2 style={{ color: '#fff', fontSize: '20px', margin: 0 }}>Configuración Lead Scoring</h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
              <input
                type="checkbox"
                checked={config.enable_lead_scoring_emails || false}
                onChange={(e) => handleInputChange('enable_lead_scoring_emails', e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              <label style={{ color: '#fff', fontSize: '14px', margin: 0, cursor: 'pointer' }}>
                Activar emails automáticos de Lead Scoring
              </label>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '12px', margin: '0' }}>
              Cuando activas esta opción, los usuarios que completen la calculadora hipotecaria recibirán emails personalizados automáticamente usando tu configuración.
            </p>
          </div>
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '40px' }}>
          <button
            onClick={testEmailConfig}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: isSaving ? 'not-allowed' : 'pointer'
            }}
          >
            <Mail size={16} />
            {isSaving ? 'Enviando...' : 'Probar Email'}
          </button>
          
          <button
            onClick={saveConfig}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: isSaving ? 'not-allowed' : 'pointer'
            }}
          >
            <Save size={16} />
            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}