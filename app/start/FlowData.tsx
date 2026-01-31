import React from "react";
import {
  ClipboardList,
  Database,
  Cpu,
  Mail,
  Calculator,
  CheckCircle2,
  TrendingUp,
  Shield,
  Share2,
  CalendarDays,
  FileText,
  Handshake
} from "lucide-react";
import {
  FaWhatsapp,
  FaFacebook,
  FaInstagram,
  FaGoogle,
  FaMeta,
  FaTiktok,
  FaTelegram,
  FaShopify
} from "react-icons/fa6";
import { FlowStep, Channel } from "./types";

export const FLOW: FlowStep[] = [
  {
    key: "form",
    title: "Formulario enviado",
    icon: <ClipboardList size={22} />,
    color: "#22d3ee",
    tooltip: "Recibo tus datos y abro tu caso como LEAD (todavía no eres cliente)."
  },
  {
    key: "registro",
    title: "Registro del lead",
    icon: <Database size={20} />,
    color: "#22d3ee",
    tooltip: "Guardo tu información para que nada se pierda y poder hacer seguimiento."
  },
  {
    key: "perfilado",
    title: "Entendemos tu necesidad",
    icon: <Cpu size={22} />,
    color: "#c084fc",
    tooltip: "Organizo lo que necesitas para guiarte con claridad (sin tecnicismos)."
  },
  {
    key: "correo",
    title: "Correo de bienvenida",
    icon: <Mail size={20} />,
    color: "#34d399",
    tooltip: "Te llega un correo con resumen y próximos pasos (el buzón se ilumina)."
  },
  {
    key: "whatsapp",
    title: "WhatsApp activado",
    icon: <FaWhatsapp size={20} />,
    color: "#34d399",
    tooltip: "Abrimos conversación para resolver dudas y avanzar. Puedes chatear aquí."
  },
  {
    key: "calculo_hipotecario",
    title: "Cálculo hipotecario",
    icon: <Calculator size={20} />,
    color: "#8b5cf6",
    tooltip: "Calculamos tu capacidad de endeudamiento y cuota estimada."
  },
  {
    key: "criterios_viabilidad",
    title: "Criterios de viabilidad",
    icon: <CheckCircle2 size={20} />,
    color: "#10b981",
    tooltip: "Evaluamos DTI, LTV y score crediticio."
  },
  {
    key: "calificacion_lead",
    title: "Cómo se califica el lead",
    icon: <TrendingUp size={20} />,
    color: "#f59e0b",
    tooltip: "Asignamos puntaje según perfil y documentación."
  },
  {
    key: "analisis_aprobacion",
    title: "Por qué se aprueba o no",
    icon: <Shield size={20} />,
    color: "#ef4444",
    tooltip: "Análisis final de aprobación basado en políticas."
  },
  {
    key: "seguimiento",
    title: "Seguimiento respetuoso",
    icon: <Share2 size={20} />,
    color: "#fbbf24",
    tooltip: "Si no respondes, te recuerdo con tacto (sin insistir)."
  },
  {
    key: "agenda",
    title: "Agendar reunión",
    icon: <CalendarDays size={20} />,
    color: "#fbbf24",
    tooltip: "Si hace falta, agendamos 15 min para cerrar claridad y tiempos."
  },
  {
    key: "propuesta",
    title: "Propuesta / plan",
    icon: <FileText size={20} />,
    color: "#60a5fa",
    tooltip: "Te preparo una propuesta simple: qué haremos, en cuánto tiempo y costo."
  },
  {
    key: "confirmacion",
    title: "Confirmación e inicio",
    icon: <Handshake size={20} />,
    color: "#60a5fa",
    tooltip: "Cuando dices 'listo', confirmamos y empezamos (ahí sí pasas a cliente)."
  }
];

export const CHANNELS: Channel[] = [
  { id: "whatsapp", name: "WhatsApp Business", icon: <FaWhatsapp size={24} />, color: "#25D366", active: true },
  { id: "meta", name: "Meta Ads", icon: <FaMeta size={24} />, color: "#0081FB", active: true },
  { id: "instagram", name: "Instagram", icon: <FaInstagram size={24} />, color: "#E4405F", active: true },
  { id: "facebook", name: "Facebook", icon: <FaFacebook size={24} />, color: "#1877F2", active: true },
  { id: "google", name: "Google Ads", icon: <FaGoogle size={24} />, color: "#4285F4", active: true },
  { id: "tiktok", name: "TikTok", icon: <FaTiktok size={24} />, color: "#000000", active: false },
  { id: "telegram", name: "Telegram", icon: <FaTelegram size={24} />, color: "#26A5E4", active: false },
  { id: "shopify", name: "Shopify", icon: <FaShopify size={24} />, color: "#7AB55C", active: false }
];