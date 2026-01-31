"use client";

import { useRouter } from "next/navigation";
import { 
  Zap, Settings, Crown, User, X, MessageCircle, Sparkles, 
  Mail, Phone, Globe, Bell, Key, Edit, Save, XCircle,
  Info, HelpCircle, FileText, ExternalLink, ChevronRight
} from "lucide-react";
import { useState } from "react";

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
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  
  // Estados para modales
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Datos editables del usuario
  const [userData, setUserData] = useState({
    name: user?.user_metadata?.full_name || "",
    email: user?.email || "",
    phone: user?.user_metadata?.phone || "",
    notifications: true,
    newsletter: true,
  });

  if (!showDock) return null;

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    // Aquí puedes agregar lógica para cambiar tema de toda la app
    console.log(`Tema cambiado a: ${newTheme}`);
  };

  const handleSaveUserData = () => {
    console.log("Guardando datos:", userData);
    // Aquí iría la llamada a Supabase para actualizar
    alert("✅ Cambios guardados (en una app real, se conectaría a la base de datos)");
    setShowAccountModal(false);
  };

  // ============================================================================
  // ✅ MODAL DE CUENTA (EDITABLE)
  // ============================================================================
  const AccountModal = () => {
    if (!showAccountModal) return null;

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
          width: "90%",
          maxWidth: "500px",
          maxHeight: "90vh",
          overflow: "auto",
          border: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}>
          {/* Header */}
          <div style={{
            padding: "24px",
            borderBottom: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: theme === "light" ? "#1e293b" : "#fff" }}>
                Configuración de Cuenta
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "14px", color: theme === "light" ? "#64748b" : "#94a3b8" }}>
                Gestiona tu información y preferencias
              </p>
            </div>
            <button
              onClick={() => setShowAccountModal(false)}
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

          {/* Contenido */}
          <div style={{ padding: "24px" }}>
            {/* Información básica */}
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: theme === "light" ? "#1e293b" : "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <User size={16} /> Información Personal
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: theme === "light" ? "#475569" : "#cbd5e1" }}>
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={userData.name}
                    onChange={(e) => setUserData({...userData, name: e.target.value})}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: theme === "light" ? "#f8fafc" : "#0f172a",
                      border: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: theme === "light" ? "#1e293b" : "#fff",
                      fontSize: "14px",
                    }}
                    placeholder="Tu nombre"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: theme === "light" ? "#475569" : "#cbd5e1" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={userData.email}
                    disabled
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: theme === "light" ? "#f1f5f9" : "#1e293b",
                      border: theme === "light" ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.05)",
                      borderRadius: "8px",
                      color: theme === "light" ? "#94a3b8" : "#64748b",
                      fontSize: "14px",
                      cursor: "not-allowed",
                    }}
                  />
                  <p style={{ fontSize: "11px", marginTop: "4px", color: theme === "light" ? "#94a3b8" : "#64748b" }}>
                    El email no se puede cambiar
                  </p>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: theme === "light" ? "#475569" : "#cbd5e1" }}>
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={userData.phone}
                    onChange={(e) => setUserData({...userData, phone: e.target.value})}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: theme === "light" ? "#f8fafc" : "#0f172a",
                      border: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: theme === "light" ? "#1e293b" : "#fff",
                      fontSize: "14px",
                    }}
                    placeholder="+1 234 567 890"
                  />
                </div>
              </div>
            </div>

            {/* Preferencias */}
            <div style={{ marginBottom: "32px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: theme === "light" ? "#1e293b" : "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <Bell size={16} /> Preferencias
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "14px", color: theme === "light" ? "#1e293b" : "#fff" }}>Notificaciones por email</div>
                    <div style={{ fontSize: "12px", color: theme === "light" ? "#64748b" : "#94a3b8" }}>Recibe alertas importantes</div>
                  </div>
                  <button
                    onClick={() => setUserData({...userData, notifications: !userData.notifications})}
                    style={{
                      width: "44px",
                      height: "24px",
                      background: userData.notifications ? "#10b981" : "#94a3b8",
                      borderRadius: "12px",
                      border: "none",
                      position: "relative",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      position: "absolute",
                      top: "2px",
                      left: userData.notifications ? "22px" : "2px",
                      width: "20px",
                      height: "20px",
                      background: "#fff",
                      borderRadius: "50%",
                      transition: "left 0.2s",
                    }} />
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "14px", color: theme === "light" ? "#1e293b" : "#fff" }}>Boletín informativo</div>
                    <div style={{ fontSize: "12px", color: theme === "light" ? "#64748b" : "#94a3b8" }}>Novedades y consejos</div>
                  </div>
                  <button
                    onClick={() => setUserData({...userData, newsletter: !userData.newsletter})}
                    style={{
                      width: "44px",
                      height: "24px",
                      background: userData.newsletter ? "#10b981" : "#94a3b8",
                      borderRadius: "12px",
                      border: "none",
                      position: "relative",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      position: "absolute",
                      top: "2px",
                      left: userData.newsletter ? "22px" : "2px",
                      width: "20px",
                      height: "20px",
                      background: "#fff",
                      borderRadius: "50%",
                      transition: "left 0.2s",
                    }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  // Aquí iría la lógica de cambio de contraseña
                  alert("🔒 Enviando enlace para cambiar contraseña a tu email...");
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: theme === "light" ? "#f1f5f9" : "#0f172a",
                  border: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: theme === "light" ? "#475569" : "#94a3b8",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Key size={16} /> Cambiar Contraseña
              </button>
              
              <button
                onClick={handleSaveUserData}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#3b82f6",
                  border: "none",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Save size={16} /> Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // ✅ MODAL DE SOPORTE (MEJORADO)
  // ============================================================================
  const SupportModal = () => {
    if (!showSupportModal) return null;

    const supportChannels = [
      { icon: <Mail size={18} />, title: "Email", value: "soporte@botz.com", color: "#3b82f6" },
      { icon: <Phone size={18} />, title: "WhatsApp", value: "+1 234 567 890", color: "#10b981" },
      { icon: <Globe size={18} />, title: "Sitio Web", value: "botz.com/soporte", color: "#8b5cf6" },
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
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          background: theme === "light" ? "#ffffff" : "#1e293b",
          borderRadius: "20px",
          width: "90%",
          maxWidth: "500px",
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
              onClick={() => setShowSupportModal(false)}
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
            {/* Canales de contacto */}
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: theme === "light" ? "#1e293b" : "#fff" }}>
                📞 Contacto Directo
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {supportChannels.map((channel, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "16px",
                      background: theme === "light" ? "#f8fafc" : "#0f172a",
                      borderRadius: "12px",
                      border: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div style={{
                      background: `${channel.color}20`,
                      borderRadius: "10px",
                      padding: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <div style={{ color: channel.color }}>{channel.icon}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: theme === "light" ? "#1e293b" : "#fff" }}>
                        {channel.title}
                      </div>
                      <div style={{ fontSize: "13px", color: theme === "light" ? "#64748b" : "#94a3b8" }}>
                        {channel.value}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (channel.title === "Email") {
                          window.location.href = `mailto:${channel.value}`;
                        } else if (channel.title === "WhatsApp") {
                          window.open(`https://wa.me/${channel.value.replace(/\D/g, '')}`, '_blank');
                        } else {
                          window.open(`https://${channel.value}`, '_blank');
                        }
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: channel.color,
                        cursor: "pointer",
                        padding: "8px",
                      }}
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Horarios */}
            <div style={{
              background: theme === "light" ? "#fef3c7" : "rgba(245, 158, 11, 0.1)",
              border: theme === "light" ? "1px solid #fbbf24" : "1px solid rgba(245, 158, 11, 0.2)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "24px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Info size={16} color="#f59e0b" />
                <span style={{ fontSize: "14px", fontWeight: "600", color: theme === "light" ? "#92400e" : "#fbbf24" }}>
                  Horario de Atención
                </span>
              </div>
              <div style={{ fontSize: "13px", color: theme === "light" ? "#92400e" : "#fbbf24" }}>
                📅 Lunes a Viernes: 9:00 AM - 6:00 PM<br />
                ⏱️ Tiempo de respuesta: ≤ 2 horas<br />
                🚀 Soporte prioritario para planes Enterprise
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // ✅ MODAL DE AYUDA (MEJORADO)
  // ============================================================================
  const HelpModal = () => {
    if (!showHelpModal) return null;

    const helpSections = [
      {
        title: "🚀 Comenzando",
        items: ["Configurar canales", "Crear respuestas automáticas", "Importar contactos"]
      },
      {
        title: "📊 CRM Avanzado",
        items: ["Etiquetar prospectos", "Automatizar seguimientos", "Generar reportes"]
      },
      {
        title: "💰 Cálculos",
        items: ["Simular hipotecas", "Comparar opciones", "Exportar propuestas"]
      },
      {
        title: "⚙️ Configuración",
        items: ["Personalizar estados", "Configurar alertas", "Integrar APIs"]
      }
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
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          background: theme === "light" ? "#ffffff" : "#1e293b",
          borderRadius: "20px",
          width: "90%",
          maxWidth: "600px",
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
                <HelpCircle size={20} /> Centro de Ayuda
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "14px", color: theme === "light" ? "#64748b" : "#94a3b8" }}>
                Encuentra respuestas rápidas
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
                  placeholder="¿Qué necesitas ayuda?"
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
                }}>
                  Buscar
                </button>
              </div>
            </div>

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
                        {item}
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
                  onClick={() => window.open("https://docs.botz.com", "_blank")}
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
                  <span>📚 Documentación completa</span>
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => window.open("https://botz.com/tutoriales", "_blank")}
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
                  <span>🎥 Video tutoriales</span>
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => window.open("https://botz.com/faq", "_blank")}
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
                  <span>❓ Preguntas frecuentes</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // ✅ HANDLERS ACTUALIZADOS
  // ============================================================================
  const handleAccountClick = () => {
    if (!user) {
      onOpenAuth();
    } else {
      setShowAccountModal(true);
    }
  };

  const handleSupportClick = () => {
    setShowSupportModal(true);
  };

  const handleHelpClick = () => {
    setShowHelpModal(true);
  };

  // ============================================================================
  // ✅ RENDER PRINCIPAL
  // ============================================================================
  return (
    <>
      {/* Dock */}
      <div
        style={{
          position: "fixed",
          bottom: "30px",
          left: "50%",
          transform: "translateX(-50%)",
          background: theme === "light" 
            ? "rgba(248, 250, 252, 0.95)" 
            : "rgba(10, 15, 30, 0.95)",
          border: theme === "light"
            ? "1px solid #e2e8f0"
            : "1px solid rgba(255,255,255,0.15)",
          borderRadius: "50px",
          padding: "12px 24px",
          backdropFilter: "blur(20px)",
          boxShadow: theme === "light"
            ? "0 20px 60px rgba(0,0,0,0.1)"
            : "0 20px 60px rgba(0,0,0,0.5)",
          zIndex: 9998,
          display: "flex",
          alignItems: "center",
          gap: "20px",
          minWidth: "550px",
          justifyContent: "center",
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
          {/* Cuenta */}
          <button
            onClick={handleAccountClick}
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
                background: user 
                  ? "rgba(59, 130, 246, 0.2)" 
                  : "rgba(59, 130, 246, 0.1)",
                borderRadius: "12px",
                border: user
                  ? "1px solid rgba(59, 130, 246, 0.4)"
                  : "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              {user ? (
                <Settings size={18} color="#3b82f6" />
              ) : (
                <User size={18} color={theme === "light" ? "#475569" : "#94a3b8"} />
              )}
            </div>
            <span style={{ 
              fontSize: "10px", 
              color: theme === "light" ? "#475569" : "#8b949e",
              fontWeight: user ? "bold" : "normal"
            }}>
              {user ? "Cuenta" : "Login"}
            </span>
          </button>

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
              Planes
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
              {theme === "light" ? "Claro" : "Oscuro"}
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
              }}
            >
              <MessageCircle size={18} color="#10b981" />
            </div>
            <span style={{ fontSize: "10px", color: theme === "light" ? "#475569" : "#8b949e" }}>
              Soporte
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
              Ayuda
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
      <AccountModal />
      <SupportModal />
      <HelpModal />
    </>
  );
}