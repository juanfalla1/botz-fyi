"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

// Definición de tipos para traducciones
export interface TranslationKeys {
  // Sidebar/Tabs
  channels: string;
  crm: string;
  metrics: string;
  hipoteca: string;
  kanban: string;
  sla: string;
  demo: string;
  
  // Estados de conexión
  connected: string;
  disconnected: string;
  connecting: string;
  disconnecting: string;
  
  // Botones de acción
  connect: string;
  disconnect: string;
  update: string;
  reply: string;
  send: string;
  save: string;
  cancel: string;
  back: string;
  next: string;
  view: string;
  
  // Mensajes y notificaciones
  success: string;
  error: string;
  warning: string;
  info: string;
  loading: string;
  
  // Estados de canales
  connectedStatus: string;
  disconnectedStatus: string;
  connectingStatus: string;
  leadsToday: string;
  lastEvent: string;
  comingSoon: string;
  
  // Canal específico
  whatsappPersonal: string;
  whatsappBusiness: string;
  gmail: string;
  outlook: string;
  metaAds: string;
  instagram: string;
  leadScoring: string;
  
  // Acciones específicas
  qrCode: string;
  apiKey: string;
  oauth: string;
  config: string;
  
  // Contenido
  welcomeTitle: string;
  welcomeMessage: string;
  integrationsTitle: string;
  connectedIntegrations: string;
  noConnections: string;
  
  // Formularios
  email: string;
  password: string;
  name: string;
  phone: string;
  message: string;
  subject: string;
  body: string;
  from: string;
  to: string;
  
  // Errores específicos
  noIntegrationsFound: string;
  connectionFailed: string;
  pleaseTryAgain: string;
  emailSentSuccessfully: string;
  emailSendFailed: string;
}

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: TranslationKeys;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Traducciones en español
const es: TranslationKeys = {
  // Sidebar/Tabs
  channels: "Canales",
  crm: "CRM",
  metrics: "Métricas",
  hipoteca: "Hipoteca",
  kanban: "Kanban",
  sla: "SLA",
  demo: "Demo",
  
  // Estados de conexión
  connected: "Conectado",
  disconnected: "Desconectado",
  connecting: "Conectando",
  disconnecting: "Desconectando",
  
  // Botones de acción
  connect: "Conectar",
  disconnect: "Desconectar",
  update: "Actualizar",
  reply: "Responder",
  send: "Enviar",
  save: "Guardar",
  cancel: "Cancelar",
  back: "Volver",
  next: "Siguiente",
  view: "Ver",
  
  // Mensajes y notificaciones
  success: "Éxito",
  error: "Error",
  warning: "Advertencia",
  info: "Información",
  loading: "Cargando",
  
  // Estados de canales
  connectedStatus: "✅ Conectado",
  disconnectedStatus: "Desconectado",
  connectingStatus: "Conectando...",
  leadsToday: "Leads hoy",
  lastEvent: "Último evento",
  comingSoon: "Próximamente",
  
  // Canal específico
  whatsappPersonal: "WhatsApp Personal (QR)",
  whatsappBusiness: "WhatsApp Business API",
  gmail: "Gmail / Google Workspace",
  outlook: "Outlook / Microsoft 365",
  metaAds: "Meta Ads",
  instagram: "Instagram",
  leadScoring: "Lead Scoring Hipotecario",
  
  // Acciones específicas
  qrCode: "Código QR",
  apiKey: "API Key",
  oauth: "OAuth",
  config: "Configurar",
  
  // Contenido
  welcomeTitle: "Centro de Integraciones",
  welcomeMessage: "Conecta WhatsApp, Gmail y más herramientas",
  integrationsTitle: "Canales Conectados",
  connectedIntegrations: "Integraciones Funcionales",
  noConnections: "No hay conexiones configuradas",
  
  // Formularios
  email: "Email",
  password: "Contraseña",
  name: "Nombre",
  phone: "Teléfono",
  message: "Mensaje",
  subject: "Asunto",
  body: "Cuerpo",
  from: "De",
  to: "Para",
  
  // Errores específicos
  noIntegrationsFound: "No se encontraron integraciones",
  connectionFailed: "Error de conexión",
  pleaseTryAgain: "Por favor intenta de nuevo",
  emailSentSuccessfully: "✅ Email enviado correctamente",
  emailSendFailed: "Error al enviar email",
};

// Traducciones en inglés
const en: TranslationKeys = {
  // Sidebar/Tabs
  channels: "Channels",
  crm: "CRM",
  metrics: "Metrics",
  hipoteca: "Mortgage",
  kanban: "Kanban",
  sla: "SLA",
  demo: "Demo",
  
  // Estados de conexión
  connected: "Connected",
  disconnected: "Disconnected",
  connecting: "Connecting",
  disconnecting: "Disconnecting",
  
  // Botones de acción
  connect: "Connect",
  disconnect: "Disconnect",
  update: "Update",
  reply: "Reply",
  send: "Send",
  save: "Save",
  cancel: "Cancel",
  back: "Back",
  next: "Next",
  view: "View",
  
  // Mensajes y notificaciones
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Info",
  loading: "Loading",
  
  // Estados de canales
  connectedStatus: "✅ Connected",
  disconnectedStatus: "Disconnected",
  connectingStatus: "Connecting...",
  leadsToday: "Leads today",
  lastEvent: "Last event",
  comingSoon: "Coming soon",
  
  // Canal específico
  whatsappPersonal: "WhatsApp Personal (QR)",
  whatsappBusiness: "WhatsApp Business API",
  gmail: "Gmail / Google Workspace",
  outlook: "Outlook / Microsoft 365",
  metaAds: "Meta Ads",
  instagram: "Instagram",
  leadScoring: "Lead Scoring",
  
  // Acciones específicas
  qrCode: "QR Code",
  apiKey: "API Key",
  oauth: "OAuth",
  config: "Configure",
  
  // Contenido
  welcomeTitle: "Integration Center",
  welcomeMessage: "Connect WhatsApp, Gmail and more tools",
  integrationsTitle: "Connected Channels",
  connectedIntegrations: "Functional Integrations",
  noConnections: "No connections configured",
  
  // Formularios
  email: "Email",
  password: "Password",
  name: "Name",
  phone: "Phone",
  message: "Message",
  subject: "Subject",
  body: "Body",
  from: "From",
  to: "To",
  
  // Errores específicos
  noIntegrationsFound: "No integrations found",
  connectionFailed: "Connection failed",
  pleaseTryAgain: "Please try again",
  emailSentSuccessfully: "✅ Email sent successfully",
  emailSendFailed: "Email send failed",
};

const translations: Record<string, TranslationKeys> = {
  es,
  en,
};

// Hook personalizado para traducciones
export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return context;
}

// Provider del contexto
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState('es');
  const [isLoading, setIsLoading] = useState(false);

  // Cargar idioma guardado en localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('botz-language');
    if (savedLang && ['es', 'en'].includes(savedLang)) {
      setLanguage(savedLang);
    }
  }, []);

  // Guardar idioma en localStorage cuando cambia
  const handleSetLanguage = (lang: string) => {
    setIsLoading(true);
    setLanguage(lang);
    localStorage.setItem('botz-language', lang);
    
    // Simular loading para feedback visual
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  const t = translations[language] || es;

  const contextValue: LanguageContextType = {
    language,
    setLanguage: handleSetLanguage,
    t,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export default LanguageContext;