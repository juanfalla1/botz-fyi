"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Zap, Building2, Crown, ArrowRight, X as CloseIcon, ShieldCheck, Lock, CreditCard, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FaGoogle } from "react-icons/fa6"; 
import { supabase } from "../supabaseClient"; 

const STRIPE_LINK_BASIC =
  "https://buy.stripe.com/test_3cI4gs9E9e9S4RVgNEfrW01";

const STRIPE_LINK_GROWTH =
  "https://buy.stripe.com/test_fZu5kwg2x7Lu0BF2W0frW00";

function getStripeLinkByPlan(planName: string) {
  const p = (planName || "").toLowerCase();

  if (p.includes("growth")) return STRIPE_LINK_GROWTH;
  if (p.includes("básic") || p.includes("basico")) return STRIPE_LINK_BASIC;

  return "";
}

export default function PricingPage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(true);

  // --- ESTADOS PRINCIPALES ---
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<"register" | "checkout">("register");
  const [selectedPlan, setSelectedPlan] = useState("");

  // ✅ Normaliza el nombre del plan (UI) a una key estable para Stripe
  const getPlanKey = (planName: string) => {
    const s = String(planName || "").trim().toLowerCase();
    if (s === "basic" || s === "básico" || s === "basico" || s.includes("básico") || s.includes("basico")) return "basic";
    if (s === "growth" || s.includes("growth")) return "growth";
    return "";
  };
  const handlePayWithStripe = async (planName?: string) => {
    const planToPay = planName ?? selectedPlan;
    const planKey = getPlanKey(planToPay);
    if (!planKey) {
      alert("Selecciona un plan válido antes de pagar.");
      return;
    }

    setPaymentLoading(true);

    try {
      // 1. Obtener el usuario actual de Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert("Debes estar registrado para continuar con el pago.");
        setPaymentLoading(false);
        return;
      }

      // 2. Obtener o crear tenant_id
      let tenantId = user.user_metadata?.tenant_id;
      if (!tenantId) {
        tenantId = crypto.randomUUID();
        await supabase.auth.updateUser({
          data: { tenant_id: tenantId }
        });
      }

      // 3. Llamar a tu API dinámica (el archivo route.ts que me pasaste antes)
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // ✅ Mantengo planName por compatibilidad, pero el backend debe usar "plan"
          plan: planKey,
          planName: planToPay,
          billing: isAnnual ? "year" : "month",
          userId: user.id, // <--- ID vital para Supabase
          email: user.email,
          tenant_id: tenantId, // <--- tenant_id para n8n
        }),
      });

      const data = await response.json();

      if (data.url) {
        // 3. Redirigir a la sesión generada en tiempo real
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Error al crear la sesión de pago");
      }
    } catch (error: any) {
      console.error("Error en Stripe:", error);
      alert("No se pudo iniciar el pago: " + error.message);
    } finally {
      setPaymentLoading(false);
    }
  };


  // ✅ Modal bonito de éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ email: string; plan: string }>({ email: "", plan: "" });

  // Estados de carga
  const [registerLoading, setRegisterLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Campos formulario Registro
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Campos formulario Pago
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  // --- ESTADOS PARA EL MODAL "A LA MEDIDA" ---
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [salesSending, setSalesSending] = useState(false);
  const [salesSent, setSalesSent] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [salesForm, setSalesForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  // ✅ CONFIGURACIÓN CORREGIDA
  const CONFIG = {
    whatsappNumber: "573154829949",
    calendlyUrl: "https://botz.zohobookings.ca/#/botz",
    companyEmail: "info@botz.fyi",
    salesEmailEndpoint: "/api/send-email", // ← CORREGIDO
  };

  // DETECTAR SI EL USUARIO YA ESTÁ LOGUEADO
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("Usuario logueado:", session.user.email);
      }
    };
    checkUser();
  }, []);

  // Crear tenant_id para usuarios de Google
  useEffect(() => {
    const handleGoogleCallback = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.app_metadata?.provider === 'google' && !user.user_metadata?.tenant_id) {
        const tenantId = crypto.randomUUID();
        await supabase.auth.updateUser({
          data: { tenant_id: tenantId }
        });
        console.log('✅ tenant_id creado para usuario de Google:', tenantId);
      }
    };
    handleGoogleCallback();
  }, []);

  const handleOpenModal = async (planName: string) => {
    setSelectedPlan(planName);

    // ✅ Si ya está logueado, NO muestres modal viejo: manda directo a Stripe
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await handlePayWithStripe(planName);
      return;
    }

    // Si NO está logueado, abre SOLO el modal de registro/login
    setModalStep("register");
    setShowModal(true);
  };

  // ✅ ABRIR MODAL "A LA MEDIDA"
  const openSalesModal = async () => {
    setSalesError(null);
    setSalesSent(false);

    // Prefill si el usuario ya está logueado
    try {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      const metaName = (u?.user_metadata as any)?.full_name;
      setSalesForm((prev) => ({
        ...prev,
        name: prev.name || metaName || "",
        email: prev.email || u?.email || "",
      }));
    } catch {} 

    setShowSalesModal(true);
  };

  // ✅ CONSTRUIR MENSAJE PARA WHATSAPP
  const buildWhatsAppMessage = () => {
    const lines = [
      "🚀 *Solicitud Plan A la Medida (Botz)*",
      "",
      `Nombre: ${salesForm.name || "-"}`,
      `Email: ${salesForm.email || "-"}`,
      `Teléfono: ${salesForm.phone || "-"}`,
      `Empresa: ${salesForm.company || "-"}`,
      "",
      "Necesidades / Integraciones:",
      salesForm.message || "-",
    ];
    return lines.join("\n");
  };

  // ✅ ABRIR WHATSAPP CON EL MENSAJE
  const openWhatsAppNow = () => {
    const msg = buildWhatsAppMessage();
    const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // ✅ ENVIAR SOLICITUD POR CORREO (CORREGIDO)
  const sendSalesRequest = async () => {
    setSalesSending(true);
    setSalesError(null);
    setSalesSent(false);

    try {
      const res = await fetch(CONFIG.salesEmailEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sales_quote",
          name: salesForm.name,
          company: salesForm.company,
          phone: salesForm.phone,
          email: salesForm.email,
          message: salesForm.message,
        }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result?.error || "No se pudo enviar el correo");
      }

      // Mostrar éxito
      setSalesSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : (typeof err === "string" ? err : "Error enviando la solicitud");
      setSalesError(msg);
    } finally {
      setSalesSending(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);

    // Generar tenant_id único
    const tenantId = crypto.randomUUID();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, plan_intento: selectedPlan, tenant_id: tenantId } }
    });

    if (error) {
      alert("Error: " + error.message);
      setRegisterLoading(false);
    } else {
      setRegisterLoading(false);
      try {
        // ✅ Intentar iniciar sesión para obtener userId y pagar con Stripe
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          alert("Cuenta creada. Inicia sesión para continuar con el pago.");
          setShowModal(false);
          return;
        }

        setShowModal(false);
        await handlePayWithStripe(selectedPlan);
      } catch (err: any) {
        console.warn("Error post-registro:", err?.message || err);
        setShowModal(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });
    if (error) {
      alert("Error Google (revisa configuración en Supabase): " + error.message);
      setGoogleLoading(false);
    }
  };

  // ✅ Función para obtener precio del plan seleccionado
  const getPlanPrice = (plan?: string) => {
    const planToCheck = plan || selectedPlan;
    if (planToCheck === "Growth") {
      return isAnnual ? "199.00" : "249.00";
    } else if (planToCheck === "Básico") {
      return isAnnual ? "55.00" : "69.00";
    }
    return "0.00";
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentLoading(true);

    try {
      // 1. Obtener datos del usuario
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || email;
      const userName = user?.user_metadata?.full_name || name;

      // 2. Calcular precio actual
      const displayPrice = getPlanPrice();

      // 3. Según el plan, ejecutar acción correspondiente
      if (selectedPlan === "A la Medida") {
        // ✅ PLAN A LA MEDIDA: Abrir modal de contacto
        setShowModal(false);
        openSalesModal();
      } else {
        // ✅ PLAN BÁSICO O GROWTH: Enviar email de bienvenida
        await sendWelcomeEmail(userName, userEmail, selectedPlan);

        // Guardar en base de datos
        const { error: subError } = await supabase
  .from("subscriptions")
  .insert([{
    user_id: user?.id,
    plan: selectedPlan,
    price: displayPrice,
    billing_cycle: isAnnual ? "annual" : "monthly",
    status: "active",
    created_at: new Date().toISOString(),
  }])
  .select();

if (subError) {
  console.warn("No se pudo guardar la suscripción:", subError.message);
} else {
  try { localStorage.setItem("botz_force_sub_refresh", "1"); } catch {}
  try { await supabase.auth.refreshSession(); } catch {}
}
        setPaymentLoading(false);
        setShowModal(false);

        // Mostrar modal de éxito
        setSuccessInfo({ email: userEmail, plan: selectedPlan });
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error("Error en el proceso de pago:", error);
      alert("Hubo un error procesando tu pago. Por favor intenta de nuevo.");
      setPaymentLoading(false);
    }
  };

  // ✅ Función para enviar email de bienvenida
  const sendWelcomeEmail = async (userName: string, userEmail: string, plan: string) => {
    try {
      const response = await fetch("/api/send-email", { // Usar endpoint unificado
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "welcome",
          name: userName,
          email: userEmail,
          plan: plan,
          calendlyUrl: CONFIG.calendlyUrl,
        }),
      });

      if (!response.ok) {
        console.warn("Email no enviado, pero continuamos...");
      }
    } catch (error) {
      console.warn("Error enviando email:", error);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#fff", fontFamily: "sans-serif", paddingBottom: "60px" }}>
      
      {/* NAVBAR */}
      <nav style={{ padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div 
          onClick={() => router.push('/start')}
          style={{ fontSize: "20px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            <ArrowLeft size={18} color="#22d3ee" />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "12px", height: "12px", background: "#22d3ee", borderRadius: "50%", boxShadow: "0 0 10px #22d3ee" }}></div>
            Botz
          </div>
        </div>
      </nav>

      {/* HEADER */}
      <div style={{ textAlign: "center", padding: "60px 20px 40px" }}>
        <h1 style={{ fontSize: "42px", fontWeight: "800", marginBottom: "16px", background: "linear-gradient(90deg, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Automatiza tus leds.<br />Cierra más ventas.
        </h1>
        <p style={{ fontSize: "16px", color: "#64748b", maxWidth: "600px", margin: "0 auto 40px" }}>
          Deja que nuestra Inteligencia Artificial pre-califique a tus clientes, calcule hipotecas y organice tu agenda las 24 horas del día.
        </p>

        {/* TOGGLE MENSUAL / ANUAL */}
        <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.05)", padding: "4px", borderRadius: "30px", alignItems: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
          <button onClick={() => setIsAnnual(false)} style={{ padding: "8px 24px", borderRadius: "24px", border: "none", background: !isAnnual ? "#22d3ee" : "transparent", color: !isAnnual ? "#000" : "#94a3b8", fontWeight: "bold", cursor: "pointer", transition: "all 0.3s" }}>Mensual</button>
          <button onClick={() => setIsAnnual(true)} style={{ padding: "8px 24px", borderRadius: "24px", border: "none", background: isAnnual ? "#22d3ee" : "transparent", color: isAnnual ? "#000" : "#94a3b8", fontWeight: "bold", cursor: "pointer", transition: "all 0.3s", display: "flex", alignItems: "center", gap: "6px" }}>Anual <span style={{ fontSize: "10px", background: "#10b981", color: "#fff", padding: "2px 6px", borderRadius: "10px" }}>-20%</span></button>
        </div>
      </div>

      {/* GRID DE PRECIOS - 3 PLANES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px", maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
        
        {/* PLAN 1 - BÁSICO */}
        <PricingCard 
          title="Básico"
          price={isAnnual ? "55" : "69"}
          description="Para agentes que quieren captar leads y centralizar todo en un CRM. Tú haces el resto."
          icon={<Zap size={24} color="#facc15" />}
          features={[
            "Bot WhatsApp 24/7",
            "Captura de leads automática",
            "Integración CRM Botz",
            "Notificaciones por Email",
            "Hasta 100 Leads/mes",
            "Panel de Control"
          ]}
          missing={[
            "Motor Hipotecario",
            "Pre-scoring / Viabilidad",
            "Radar Bancario",
            "Generación de PDF",
            "Integraciones externas"
          ]}
          onBuy={() => handleOpenModal("Básico")} 
        />

        {/* PLAN 2 - GROWTH */}
        <PricingCard 
          title="Growth"
          price={isAnnual ? "199" : "249"}
          description="La suite completa. El bot captura, calcula hipotecas, analiza viabilidad y genera PDF. Tú solo cierras."
          icon={<Building2 size={24} color="#22d3ee" />}
          isPopular
          features={[
            "Todo lo del plan Básico",
            "Motor Hipotecario Completo",
            "Pre-scoring y Viabilidad Financiera",
            "Radar Bancario (Variable/Fijo)",
            "Generación de PDF con tu marca",
            "Hasta 1,000 Leads/mes",
            "Notificaciones Email + WhatsApp",
            "Soporte Prioritario"
          ]}
          missing={[
            "Integraciones externas (HubSpot, etc)",
            "Marca Blanca completa"
          ]}
          setupFee="497"
          onBuy={() => handleOpenModal("Growth")} 
        />

        {/* PLAN 3 - A LA MEDIDA */}
        <PricingCard 
          title="A la Medida"
          price="Custom"
          description="Conectamos el bot donde tú quieras. Tu CRM, tus bancos, tu marca. 100% personalizado."
          icon={<Crown size={24} color="#c084fc" />}
          features={[
            "Todo lo del plan Growth",
            "Integración con TU CRM (HubSpot, Sheets, etc)",
            "Motor ajustado a tus bancos",
            "Marca Blanca Total (tu logo, colores)",
            "Leads Ilimitados",
            "IA entrenada con tu contenido",
            "Flujos personalizados",
            "Soporte 24/7"
          ]}
          isEnterprise
          setupFee="1,997"
          onBuy={openSalesModal}
        />
      </div>

      {/* COMPARATIVA RÁPIDA */}
      <div style={{ maxWidth: "900px", margin: "60px auto 0", padding: "0 20px" }}>
        <div style={{ 
          background: "rgba(30, 41, 59, 0.5)", 
          border: "1px solid rgba(255,255,255,0.1)", 
          borderRadius: "16px", 
          padding: "24px",
          textAlign: "center"
        }}>
          <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px", color: "#fff" }}>
            ¿Cuál es la diferencia?
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", fontSize: "14px" }}>
            <div style={{ padding: "16px", background: "rgba(250, 204, 21, 0.1)", borderRadius: "12px", border: "1px solid rgba(250, 204, 21, 0.2)" }}>
              <div style={{ fontWeight: "bold", color: "#facc15", marginBottom: "8px" }}>Básico</div>
              <div style={{ color: "#94a3b8" }}>Capturas leads, <strong style={{ color: "#fff" }}>tú haces los cálculos</strong></div>
            </div>
            <div style={{ padding: "16px", background: "rgba(34, 211, 238, 0.1)", borderRadius: "12px", border: "1px solid rgba(34, 211, 238, 0.2)" }}>
              <div style={{ fontWeight: "bold", color: "#22d3ee", marginBottom: "8px" }}>Growth</div>
              <div style={{ color: "#94a3b8" }}>El bot <strong style={{ color: "#fff" }}>hace todo por ti</strong></div>
            </div>
            <div style={{ padding: "16px", background: "rgba(192, 132, 252, 0.1)", borderRadius: "12px", border: "1px solid rgba(192, 132, 252, 0.2)" }}>
              <div style={{ fontWeight: "bold", color: "#c084fc", marginBottom: "8px" }}>A la Medida</div>
              <div style={{ color: "#94a3b8" }}>Conectamos <strong style={{ color: "#fff" }}>donde tú quieras</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER TRUST */}
      <div style={{ textAlign: "center", marginTop: "80px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "40px" }}>
        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>TECNOLOGÍA DE CONFIANZA USADA POR</p>
        <div style={{ display: "flex", justifyContent: "center", gap: "40px", opacity: 0.4, filter: "grayscale(100%)" }}>
          <span style={{ fontSize: "20px", fontWeight: "bold" }}>RE/MAX</span>
          <span style={{ fontSize: "20px", fontWeight: "bold" }}>CENTURY 21</span>
          <span style={{ fontSize: "20px", fontWeight: "bold" }}>KELLER WILLIAMS</span>
        </div>
      </div>

      {/* MODAL DE REGISTRO Y PAGO */}
      <AnimatePresence>
        {showModal && (
          <div style={{ 
            position: "fixed", 
            inset: 0, 
            background: "rgba(0,0,0,0.85)", 
            backdropFilter: "blur(5px)", 
            zIndex: 100, 
            overflowY: "auto", 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "flex-start", 
            padding: "40px 20px" 
          }}>
            
            <motion.div 
              key={modalStep}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              style={{ 
                width: "100%", 
                maxWidth: modalStep === "register" ? "420px" : "900px", 
                background: modalStep === "register" ? "#1e293b" : "transparent",
                borderRadius: "24px", 
                border: modalStep === "register" ? "1px solid rgba(255,255,255,0.08)" : "none",
                position: "relative", 
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
                marginTop: "auto", 
                marginBottom: "auto"
              }}
            >
              <button 
                onClick={() => setShowModal(false)}
                style={{ position: "absolute", top: "15px", right: "15px", zIndex: 50, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <CloseIcon size={16} />
              </button>

              {modalStep === "register" && (
                <div style={{ padding: "40px" }}>
                    <div style={{ textAlign: "center", marginBottom: "30px" }}>
                        <div style={{ fontSize: "11px", color: "#22d3ee", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>PASO 1 DE 1</div>
                        <h2 style={{ fontSize: "28px", fontWeight: "bold", color: "#fff", margin: 0 }}>Crea tu cuenta</h2>
                        <p style={{ fontSize: "15px", color: "#94a3b8", marginTop: "8px" }}>Para contratar <strong style={{ color: "#fff" }}>Plan {selectedPlan}</strong></p>
                    </div>

                    <button onClick={handleGoogleLogin} disabled={googleLoading} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "#fff", color: "#000", fontWeight: "bold", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "24px" }}>
                        {googleLoading ? "Conectando..." : <><FaGoogle size={20} /> Continuar con Google</>}
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "24px" }}>
                        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }}></div>
                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>O CON TU CORREO</span>
                        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }}></div>
                    </div>

                    <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <input type="text" placeholder="Nombre Completo" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
                        <input type="email" placeholder="Correo Electrónico" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
                        <input type="password" placeholder="Crear Contraseña" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
                        <button type="submit" disabled={registerLoading} style={{ marginTop: "8px", width: "100%", padding: "16px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%)", color: "#fff", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}>{registerLoading ? "Cargando..." : "Continuar a Stripe →"}</button>
                    </form>
                </div>
              )}

              {modalStep === "checkout" && (
                <div style={{ padding: "40px", background: "#1e293b", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "#64748b", letterSpacing: "1px", marginBottom: "8px" }}>REDIRIGIENDO</div>
                    <h2 style={{ fontSize: "28px", fontWeight: "bold", color: "#fff", margin: 0 }}>Te llevamos a Stripe</h2>
                    <p style={{ fontSize: "15px", color: "#94a3b8", marginTop: "10px" }}>
                      Ya no usamos el formulario viejo. El pago se hace en Stripe Checkout.
                    </p>

                    <button
                      onClick={() => handlePayWithStripe(selectedPlan)}
                      disabled={paymentLoading}
                      style={{
                        marginTop: "18px",
                        width: "100%",
                        padding: "16px",
                        borderRadius: "12px",
                        background: "#22d3ee",
                        border: "none",
                        color: "#000",
                        fontWeight: "bold",
                        fontSize: "16px",
                        cursor: "pointer",
                        boxShadow: "0 4px 14px 0 rgba(34, 211, 238, 0.39)",
                      }}
                    >
                      {paymentLoading ? "Procesando..." : `Continuar a Stripe ($${getPlanPrice()})`}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✅ MODAL "A LA MEDIDA" */}
      <AnimatePresence>
        {showSalesModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(6px)",
              zIndex: 119,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "24px",
            }}
            onClick={() => setShowSalesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              style={{
                width: "100%",
                maxWidth: "640px",
                background: "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "18px",
                boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: "16px 18px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", color: "rgba(148,163,184,0.9)" }}>
                    Plan
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#e2e8f0" }}>
                    A la Medida · Cotizar
                  </div>
                </div>

                <button
                  onClick={() => setShowSalesModal(false)}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#e2e8f0",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              <div style={{ padding: "18px" }}>
                {!salesSent ? (
                  <>
                    <div style={{ color: "rgba(148,163,184,0.95)", marginBottom: "14px", lineHeight: 1.5 }}>
                      Cuéntame qué necesitas integrar y te lo confirmo por email. Si quieres, también puedes escribirme por WhatsApp con un clic.
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <input
                        value={salesForm.name}
                        onChange={(e) => setSalesForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Nombre"
                        style={salesInputStyle}
                      />

                      <input
                        value={salesForm.email}
                        onChange={(e) => setSalesForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="Email"
                        style={salesInputStyle}
                      />

                      <input
                        value={salesForm.phone}
                        onChange={(e) => setSalesForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="WhatsApp / Teléfono"
                        style={salesInputStyle}
                      />

                      <input
                        value={salesForm.company}
                        onChange={(e) => setSalesForm((p) => ({ ...p, company: e.target.value }))}
                        placeholder="Empresa"
                        style={salesInputStyle}
                      />
                    </div>

                    <textarea
                      value={salesForm.message}
                      onChange={(e) => setSalesForm((p) => ({ ...p, message: e.target.value }))}
                      placeholder="¿Qué quieres integrar? (CRM, bancos, WhatsApp, email, webhooks, etc.)"
                      rows={6}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(2,6,23,0.35)",
                        color: "#e2e8f0",
                        outline: "none",
                        resize: "vertical",
                        marginBottom: "12px",
                      }}
                    />

                    {salesError && (
                      <div style={{ marginTop: "10px", color: "#fb7185", fontSize: "13px" }}>
                        {salesError}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                      <button
                        onClick={() => setShowSalesModal(false)}
                        style={{
                          flex: 1,
                          padding: "12px 14px",
                          borderRadius: "12px",
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(255,255,255,0.04)",
                          color: "#e2e8f0",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        Cancelar
                      </button>

                      <button
                        onClick={openWhatsAppNow}
                        style={{
                          flex: 1,
                          padding: "12px 14px",
                          borderRadius: "12px",
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(34,197,94,0.12)",
                          color: "#d1fae5",
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        <span>Abrir WhatsApp</span>
                      </button>

                      <button
                        onClick={sendSalesRequest}
                        disabled={salesSending || !salesForm.message.trim()}
                        style={{
                          flex: 1.2,
                          padding: "12px 14px",
                          borderRadius: "12px",
                          border: "1px solid rgba(56,189,248,0.35)",
                          background: salesSending
                            ? "rgba(56,189,248,0.16)"
                            : "linear-gradient(90deg, rgba(34,211,238,0.22), rgba(56,189,248,0.12))",
                          color: "#e2e8f0",
                          cursor: salesSending ? "not-allowed" : "pointer",
                          fontWeight: 800,
                        }}
                      >
                        {salesSending ? "Enviando..." : "Enviar Solicitud"}
                      </button>
                    </div>

                    <div style={{ marginTop: "10px", fontSize: "12px", color: "rgba(148,163,184,0.85)" }}>
                      Se enviará por email a <b>{CONFIG.companyEmail}</b> (con copia al correo que ingresaste). Si prefieres, usa "Abrir WhatsApp".
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "22px", fontWeight: 900, color: "#e2e8f0", marginBottom: "12px" }}>
                      ¡Listo! ✅
                    </div>
                    <div style={{ color: "rgba(148,163,184,0.95)", lineHeight: 1.6, marginBottom: "20px" }}>
                      Te enviamos un correo con el resumen (y yo también lo recibí). Si quieres hablar de una, abre WhatsApp con un clic.
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={openWhatsAppNow}
                        style={{
                          flex: 1,
                          padding: "12px 14px",
                          borderRadius: "12px",
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(34,197,94,0.12)",
                          color: "#d1fae5",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Abrir WhatsApp ahora
                      </button>

                      <button
                        onClick={() => setShowSalesModal(false)}
                        style={{
                          flex: 1,
                          padding: "12px 14px",
                          borderRadius: "12px",
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(255,255,255,0.04)",
                          color: "#e2e8f0",
                          cursor: "pointer",
                          fontWeight: 800,
                        }}
                      >
                        Cerrar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✅ MODAL DE ÉXITO PARA PLANES BÁSICOS */}
      <AnimatePresence>
        {showSuccessModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(6px)",
              zIndex: 120,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "24px",
            }}
            onClick={() => setShowSuccessModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              style={{
                width: "100%",
                maxWidth: "520px",
                background: "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
                border: "1px solid rgba(56,189,248,0.22)",
                borderRadius: "18px",
                boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(34,197,94,0.22)" }}>
                    <Check size={18} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "16px" }}>¡Pago exitoso! 🎉</div>
                </div>

                <button
                  onClick={() => setShowSuccessModal(false)}
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#fff",
                  }}
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              <div style={{ padding: "18px" }}>
                <div style={{ color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
                  Te enviamos el correo de bienvenida a <b>{successInfo.email || "tu correo"}</b>.
                  <br />
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>
                    Plan: <b style={{ color: "#38bdf8" }}>{successInfo.plan || selectedPlan}</b>
                  </span>
                </div>

                <div style={{ marginTop: "14px", padding: "12px 12px", borderRadius: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontWeight: 700, marginBottom: "6px" }}>Siguiente paso</div>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "14px" }}>
                    Agenda tu sesión virtual para empezar las integraciones (WhatsApp, email, CRM y flujos).
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => {
                      try {
                        window.open(CONFIG.calendlyUrl, "_blank");
                      } finally {
                        setShowSuccessModal(false);
                      }
                    }}
                    style={{
                      flex: 1,
                      minWidth: "210px",
                      padding: "12px 14px",
                      borderRadius: "14px",
                      border: "1px solid rgba(56,189,248,0.35)",
                      background: "rgba(56,189,248,0.16)",
                      color: "#e0f2fe",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                    }}
                  >
                    Agendar sesión virtual
                  </button>

                  <button
                    onClick={() => setShowSuccessModal(false)}
                    style={{
                      flex: 1,
                      minWidth: "170px",
                      padding: "12px 14px",
                      borderRadius: "14px",
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Continuar
                  </button>
                </div>

                <div style={{ marginTop: "12px", fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>
                  * Si no ves el correo, revisa spam/promociones.
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Estilos
const inputStyle: React.CSSProperties = { 
  width: "100%", 
  padding: "14px", 
  borderRadius: "8px", 
  border: "1px solid rgba(255,255,255,0.1)", 
  background: "#0f172a", 
  color: "#fff", 
  outline: "none", 
  fontSize: "14px" 
};

const salesInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(2,6,23,0.35)",
  color: "#e2e8f0",
  outline: "none",
};

const labelStyle: React.CSSProperties = { 
  display: "block", 
  fontSize: "11px", 
  fontWeight: "bold", 
  color: "#94a3b8", 
  marginBottom: "8px", 
  textTransform: "uppercase", 
  letterSpacing: "0.5px" 
};

// Componente de Tarjeta de Precios con TypeScript
interface PricingCardProps {
  title: string;
  price: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  missing?: string[];
  isPopular?: boolean;
  isEnterprise?: boolean;
  setupFee?: string;
  onBuy: () => void;
}

function PricingCard({ title, price, description, icon, features, missing, isPopular, isEnterprise, setupFee, onBuy }: PricingCardProps) {
    return (
      <div style={{ 
        background: "rgba(30, 41, 59, 0.5)", 
        border: isPopular ? "2px solid #22d3ee" : "1px solid rgba(255,255,255,0.1)", 
        borderRadius: "24px", 
        padding: "32px",
        position: "relative",
        display: "flex", 
        flexDirection: "column",
        boxShadow: isPopular ? "0 0 40px rgba(34, 211, 238, 0.1)" : "none",
        transform: isPopular ? "scale(1.05)" : "scale(1)",
        zIndex: isPopular ? 10 : 1
      }}>
        {isPopular && <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "#22d3ee", color: "#000", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>MÁS VENDIDO</div>}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "12px" }}>{icon}</div>
          <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>{title}</h3>
        </div>
        <div style={{ marginBottom: "20px" }}>
          {isEnterprise ? (
            <div style={{ fontSize: "36px", fontWeight: "800", color: "#fff" }}>Cotizar</div>
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "36px", fontWeight: "800", color: "#fff" }}>${price}</span>
              <span style={{ color: "#64748b" }}>/mes</span>
            </div>
          )}
          <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "8px", lineHeight: "1.5" }}>{description}</p>
          
          {setupFee && (
            <div style={{ 
              marginTop: "12px", 
              padding: "8px 12px", 
              background: "rgba(255, 255, 255, 0.03)", 
              borderRadius: "8px", 
              border: "1px solid rgba(255, 255, 255, 0.06)",
              fontSize: "12px",
              color: "#94a3b8"
            }}>
              💼 {isEnterprise ? "Implementación desde" : "Setup inicial"}: <strong style={{ color: "#fff" }}>${setupFee}</strong> {!isEnterprise && "(único)"}
            </div>
          )}
        </div>
        <button 
          onClick={onBuy}
          style={{ 
            width: "100%", 
            padding: "14px", 
            borderRadius: "12px", 
            border: "none",
            background: isPopular ? "#22d3ee" : isEnterprise ? "#c084fc" : "rgba(255,255,255,0.1)",
            color: isPopular ? "#000" : "#fff",
            fontWeight: "bold", 
            fontSize: "14px", 
            cursor: "pointer", 
            marginBottom: "30px",
            transition: "all 0.2s",
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            gap: "8px"
          }}
        >
          {isEnterprise ? "Contactar Ventas" : "Empezar Ahora"} <ArrowRight size={16} />
        </button>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#fff", textTransform: "uppercase", letterSpacing: "1px" }}>QUE INCLUYE:</span>
          {features && features.map((feat: string, i: number) => (
            <div key={i} style={{ display: "flex", gap: "10px", fontSize: "14px", color: "#cbd5e1" }}>
              <Check size={18} color="#22c55e" style={{ flexShrink: 0 }} /> {feat}
            </div>
          ))}
          {missing && missing.map((feat: string, i: number) => (
            <div key={i} style={{ display: "flex", gap: "10px", fontSize: "14px", color: "#475569" }}>
              <X size={18} style={{ flexShrink: 0 }} /> {feat}
            </div>
          ))}
        </div>
      </div>
    );
}