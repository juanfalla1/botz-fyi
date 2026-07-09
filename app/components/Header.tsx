"use client";
import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
// Importamos Sparkles para el toque estelar visual
import { Sparkles, Languages } from "lucide-react";

const Header = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  type BotzLanguage = "es" | "en";
  const [botzLanguage, setBotzLanguage] = useState<BotzLanguage>("es");
  const [showLangMenu, setShowLangMenu] = useState(false);

  const inQualibotz = Boolean(pathname && pathname.startsWith("/start"));

  useEffect(() => {
    setHydrated(true);
    try {
      const saved = window.localStorage.getItem("botz-language");
      if (saved === "es" || saved === "en") setBotzLanguage(saved);
    } catch {}

    const onLangChange = (event: Event) => {
      const next = (event as CustomEvent<BotzLanguage>).detail;
      if (next === "es" || next === "en") setBotzLanguage(next);
    };

    window.addEventListener("botz-language-change", onLangChange);
    return () => window.removeEventListener("botz-language-change", onLangChange);
  }, []);

  const isEn = botzLanguage === "en";
  const isMobileView = hydrated && isMobile;
  const navCopy = {
    menuAria: isEn ? "Open menu" : "Abrir menu",
    backToSite: isEn ? "Back to site" : "Volver al sitio",
    ourValue: isEn ? "Our Value" : "Nuestra Propuesta",
    capabilities: isEn ? "Capabilities" : "Funcionalidades",
    benefits: isEn ? "Benefits" : "Beneficios",
    vision: isEn ? "Vision" : "Vision",
    aboutUs: isEn ? "About Us" : "Sobre Nosotros",
    automationSolutions: isEn ? "Automation Solutions" : "Soluciones de Automatizacion",
    aiEcommerce: isEn ? "boty AI E-commerce" : "boty E-commerce con IA",
    flowAutomation: isEn ? "botzflow Process Automation" : "botzflow Automatizacion de Flujos",
    leadMgmt: isEn ? "hotLead Lead Management" : "hotLead Gestion de Leads",
    aiFlows: isEn ? "AI Processes & Flows" : "Procesos y Flujos con IA",
    agentsArchitecture: isEn ? "AI Agents Architecture" : "Arquitectura Agentes IA",
    visualFlow: isEn ? "Visual Cognitive Flow" : "Flujo Cognitivo Visual",
    successStories: isEn ? "Success Stories" : "Casos de Exito",
    hookStory: isEn ? "HOOK E-commerce" : "E-commerce HOOK",
    contact: isEn ? "Contact Us" : "Contactenos",
    signIn: isEn ? "Sign in" : "Iniciar sesion",
    signUp: isEn ? "Create account" : "Crear una cuenta",
  };

  const megaMenus = [
    {
      key: "platform",
      label: isEn ? "Platform" : "Plataforma",
      eyebrow: isEn ? "BOTZ platform" : "Plataforma BOTZ",
      title: isEn ? "Enterprise AI workforce for business execution." : "AI Workforce empresarial para ejecutar procesos del negocio.",
      items: [
        { label: isEn ? "AI Agents Architecture" : "Arquitectura de Agentes IA", desc: isEn ? "How BOTZ coordinates agents, context and actions." : "Como BOTZ coordina agentes, contexto y acciones.", href: "/#arquitectura-agentes-ia" },
        { label: isEn ? "Visual Cognitive Flow" : "Flujo Cognitivo Visual", desc: isEn ? "From signal intake to business outcome." : "De la senal inicial al resultado del negocio.", href: "/#flujo-cognitivo-visual" },
        { label: isEn ? "Intelligent Operations" : "Operaciones Inteligentes", desc: isEn ? "Revenue, support and automation connected in one layer." : "Ventas, soporte y automatizacion conectados en una capa.", href: "/#vision" },
      ],
    },
    {
      key: "products",
      label: isEn ? "Products" : "Productos",
      eyebrow: isEn ? "BOTZ ecosystem" : "Ecosistema BOTZ",
      title: isEn ? "Connected modules, not isolated services." : "Modulos conectados, no servicios aislados.",
      items: [
        { label: "Qualibotz", desc: isEn ? "Agent workspace and CRM experience." : "Workspace de agentes y experiencia CRM.", href: "/start" },
        { label: "BOTZ GEO", desc: isEn ? "AI visibility, audits and recommendation reports." : "Visibilidad IA, auditorias y reportes de recomendacion.", href: "/geo" },
        { label: "hotLead", desc: isEn ? "Lead intake, qualification and follow-up flows." : "Captura, calificacion y seguimiento de leads.", href: "/#caso-de-exito-hotlead" },
      ],
    },
    {
      key: "solutions",
      label: isEn ? "Solutions" : "Soluciones",
      eyebrow: isEn ? "Use BOTZ to execute" : "BOTZ para ejecutar",
      title: isEn ? "Automate complete business workflows with AI agents." : "Automatiza workflows completos con agentes de IA.",
      items: [
        { label: isEn ? "Sales automation" : "Automatizacion comercial", desc: isEn ? "Capture, qualify and move leads to action." : "Captura, califica y lleva leads a la accion.", href: "/#funcionalidades" },
        { label: isEn ? "Process automation" : "Automatizacion de procesos", desc: isEn ? "Connect teams, data and business systems." : "Conecta equipos, datos y sistemas del negocio.", href: "/#automatizaciones-n8n" },
        { label: isEn ? "E-commerce workflows" : "Workflows e-commerce", desc: isEn ? "Automated purchase and customer journeys." : "Compras y recorridos de cliente automatizados.", href: "/#arquitectura-E-commerce-hook" },
      ],
    },
    {
      key: "industries",
      label: isEn ? "Industries" : "Industrias",
      eyebrow: isEn ? "Built for real operations" : "Para operaciones reales",
      title: isEn ? "AI workflows for teams that need execution." : "Workflows IA para equipos que necesitan ejecucion.",
      items: [
        { label: isEn ? "Real Estate" : "Inmobiliaria", desc: isEn ? "AI agents for property leads and follow-up." : "Agentes IA para leads inmobiliarios y seguimiento.", href: "/agentes-ia-inmobiliaria" },
        { label: isEn ? "Mortgage & Finance" : "Hipotecario y finanzas", desc: isEn ? "Lead qualification and commercial tracking." : "Calificacion de leads y seguimiento comercial.", href: "/ia-hipotecaria" },
        { label: isEn ? "WhatsApp operations" : "Operaciones WhatsApp", desc: isEn ? "Customer intake and automated response flows." : "Ingreso de clientes y flujos de respuesta automatica.", href: "/bot-hipotecario-whatsapp" },
      ],
    },
    {
      key: "resources",
      label: isEn ? "Resources" : "Recursos",
      eyebrow: isEn ? "Learn and compare" : "Aprende y compara",
      title: isEn ? "Guides, cases and product paths for decision makers." : "Guias, casos y rutas de producto para decisores.",
      items: [
        { label: "Blog", desc: isEn ? "Articles and market education from BOTZ." : "Articulos y educacion de mercado de BOTZ.", href: "/blog" },
        { label: isEn ? "Success cases" : "Casos de exito", desc: isEn ? "Examples of BOTZ execution in action." : "Ejemplos de BOTZ ejecutando en accion.", href: "/#caso-de-exito-hook" },
        { label: isEn ? "Pricing" : "Precios", desc: isEn ? "Explore plans and entry points." : "Explora planes y puntos de entrada.", href: "/pricing" },
      ],
    },
    {
      key: "company",
      label: isEn ? "Company" : "Empresa",
      eyebrow: isEn ? "About BOTZ" : "Sobre BOTZ",
      title: isEn ? "A product company building enterprise AI operations." : "Una empresa de producto construyendo operaciones empresariales con IA.",
      items: [
        { label: isEn ? "About us" : "Sobre nosotros", desc: isEn ? "Who we are and how BOTZ works." : "Quienes somos y como trabaja BOTZ.", href: "/sobre-nosotros" },
        { label: isEn ? "Contact" : "Contacto", desc: isEn ? "Talk with the BOTZ team." : "Habla con el equipo BOTZ.", href: "#contacto" },
        { label: "Legal", desc: isEn ? "Privacy policy and terms." : "Politica de privacidad y terminos.", href: "/privacy" },
      ],
    },
  ];

  // Close language menu on outside click / escape
  useEffect(() => {
    if (!showLangMenu) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowLangMenu(false);
    };

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-botz-lang-switcher]")) return;
      setShowLangMenu(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("touchstart", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("touchstart", onPointerDown, true);
    };
  }, [showLangMenu]);

  const applyBotzLanguage = (next: BotzLanguage) => {
    setBotzLanguage(next);
    try {
      window.localStorage.setItem("botz-language", next);
      window.dispatchEvent(new CustomEvent("botz-language-change", { detail: next }));
    } catch {}
  };

  // Detectar si estamos en un dispositivo móvil
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  const smoothScrollTo = (id: string) => {
    if (typeof window === "undefined") return;
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const closeMenu = () => {
    setOpen(false);
    setOpenDropdown(null);
    setShowLangMenu(false);
  };

  const toggleMenu = () => {
    setOpen((current) => {
      setOpenDropdown(null);
      setShowLangMenu(false);
      return !current;
    });
  };

  // Close menu on route change (prevents stuck overlay)
  useEffect(() => {
    closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleDropdownClick = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    if (isMobileView) {
      toggleDropdown(name);
    }
  };

  const handleDropdownHover = (name: string) => {
    if (!isMobileView) {
      setOpenDropdown(name);
    }
  };

  const handleDropdownLeave = () => {
    if (!isMobileView) {
      setOpenDropdown(null);
    }
  };

  const handleMouseGlowMove = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    event.currentTarget.style.setProperty("--mx", `${x}px`);
    event.currentTarget.style.setProperty("--my", `${y}px`);
  };

  const handleMouseGlowLeave = (event: React.MouseEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--mx", "50%");
    event.currentTarget.style.setProperty("--my", "50%");
  };

  const handleCtaHoverEnter = (event: React.MouseEvent<HTMLElement>) => {
    event.currentTarget.style.transform = "translateY(-3px) scale(1.06)";
    event.currentTarget.style.filter = "brightness(1.26) saturate(1.2)";
    event.currentTarget.style.boxShadow = "0 20px 44px rgba(34, 211, 238, 0.82), 0 0 0 2px rgba(125, 211, 252, 0.85) inset";
  };

  const handleCtaHoverLeave = (event: React.MouseEvent<HTMLElement>) => {
    event.currentTarget.style.transform = "";
    event.currentTarget.style.filter = "";
    event.currentTarget.style.boxShadow = "";
  };

  const submenuItemBaseStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "12px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    borderLeft: "2px solid transparent",
    color: "#fff",
    textDecoration: "none",
    cursor: "pointer",
    transition: "background .12s ease, color .12s ease, box-shadow .12s ease, padding .12s ease, border-color .12s ease",
  };

  const handleSubmenuHoverEnter = (event: React.MouseEvent<HTMLElement>) => {
    const item = event.currentTarget;
    item.style.background = "rgba(34, 211, 238, 0.38)";
    item.style.color = "#e6fdff";
    item.style.boxShadow = "inset 0 0 0 1px rgba(34,211,238,0.65), 0 10px 24px rgba(34,211,238,0.32)";
    item.style.borderLeftColor = "#22d3ee";
    item.style.paddingLeft = "24px";
    item.style.textDecoration = "underline";
    item.style.textDecorationColor = "#67e8f9";
    item.style.textUnderlineOffset = "4px";
  };

  const handleSubmenuHoverLeave = (event: React.MouseEvent<HTMLElement>) => {
    const item = event.currentTarget;
    item.style.background = "";
    item.style.color = "";
    item.style.boxShadow = "";
    item.style.borderLeftColor = "transparent";
    item.style.paddingLeft = "20px";
    item.style.textDecoration = "none";
    item.style.textUnderlineOffset = "";
  };

  const getDropdownPanelStyle = (name: string): React.CSSProperties => {
    if (isMobileView) {
      return {
        position: "static",
        display: openDropdown === name ? "flex" : "none",
        flexDirection: "column",
        width: "100%",
      };
    }

    return {
      position: "absolute",
      top: "calc(100% + 8px)",
      left: 0,
      minWidth: "260px",
      background: "#0d2537",
      boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
      borderRadius: "8px",
      overflow: "hidden",
      zIndex: 3000,
      border: "1px solid rgba(255,255,255,0.05)",
      display: openDropdown === name ? "flex" : "none",
      flexDirection: "column",
    };
  };

  const getMegaMenuStyle = (name: string): React.CSSProperties => {
    if (isMobileView) {
      return {
        position: "static",
        display: openDropdown === name ? "grid" : "none",
        width: "100%",
        gridTemplateColumns: "1fr",
        gap: 8,
        margin: "6px 0 2px",
        padding: 8,
        border: "1px solid rgba(34, 211, 238, 0.12)",
        borderRadius: 16,
        background: "rgba(2, 6, 14, 0.38)",
        boxShadow: "none",
      };
    }

    return {
      position: "fixed",
      top: 86,
      left: "50vw",
      width: "min(920px, calc(100vw - 64px))",
      transform: "translateX(-50%)",
      display: openDropdown === name ? "grid" : "none",
      gridTemplateColumns: "minmax(240px, 300px) minmax(0, 1fr)",
      gap: 16,
      padding: 14,
      border: "1px solid rgba(34, 211, 238, 0.18)",
      borderRadius: 22,
      background: "linear-gradient(180deg, rgba(8, 18, 41, 0.98), rgba(5, 10, 24, 0.98))",
      boxShadow: "0 24px 80px rgba(0, 0, 0, 0.58)",
      zIndex: 4200,
      overflow: "hidden",
    };
  };

  return (
    <>
      <div
        className="bz-header"
        role="banner"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 4000,
          background: "rgba(11,19,36,0.97)",
          borderBottom: "1px solid rgba(148,163,184,0.2)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div className="bz-header-container" style={{ maxWidth: "100%", width: "100%", margin: 0, padding: isMobileView ? "10px 12px" : "12px 18px", display: isMobileView ? "flex" : "grid", gridTemplateColumns: isMobileView ? undefined : "auto minmax(0, 1fr)", columnGap: isMobileView ? 0 : "14px", alignItems: "center", justifyContent: "space-between" }}>
          <div className="bz-logo-nav" style={{ width: "auto", display: "flex", alignItems: "center", columnGap: 10, flex: "0 0 auto", justifySelf: "start" }}>
            {/* LOGO MANTENIDO EN LA ESQUINA IZQUIERDA */}
            <Link href="/" passHref style={{ textDecoration: "none", borderBottom: "none", display: "inline-block" }}>
              <h1 className="logo glow" style={{ cursor: "pointer", textDecoration: "none", borderBottom: "none", margin: 0, fontSize: "34px", fontWeight: 900, color: "#10b2cb", lineHeight: 1 }}>
                botz
              </h1>
            </Link>

            {!inQualibotz && (
              <button
                className={`bz-hamburger ${open ? "active" : ""}`}
                aria-label={navCopy.menuAria}
                aria-expanded={open}
                onClick={toggleMenu}
                style={{ visibility: hydrated ? "visible" : "hidden" }}
              >
                <span />
                <span />
                <span />
              </button>
            )}

            {inQualibotz && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Idioma (visible) */}
                <div data-botz-lang-switcher style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setShowLangMenu((v) => !v)}
                    aria-label={botzLanguage === "en" ? "Language" : "Idioma"}
                    aria-haspopup="menu"
                    aria-expanded={showLangMenu}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#cbd5e1",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 900,
                      letterSpacing: "0.02em",
                    }}
                  >
                    <Languages size={14} />
                    <span style={{ color: "#e2e8f0" }}>{botzLanguage === "en" ? "EN" : "ES"}</span>
                    <span style={{ opacity: 0.8, fontWeight: 900 }}>
                      {showLangMenu ? "▴" : "▾"}
                    </span>
                  </button>

                  {showLangMenu && (
                    <div
                      role="menu"
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "calc(100% + 8px)",
                        minWidth: "140px",
                        background: "#0b1220",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "12px",
                        boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
                        padding: "6px",
                        zIndex: 50,
                      }}
                    >
                      <button
                        role="menuitem"
                        type="button"
                        onClick={() => {
                          applyBotzLanguage("es");
                          setShowLangMenu(false);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          padding: "10px 10px",
                          borderRadius: "10px",
                          border: "1px solid rgba(255,255,255,0.06)",
                          background: botzLanguage === "es" ? "rgba(34, 211, 238, 0.10)" : "transparent",
                          color: "#e2e8f0",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: 800,
                          textAlign: "left",
                        }}
                      >
                        <span>Español</span>
                        <span style={{ color: botzLanguage === "es" ? "#22d3ee" : "#64748b" }}>ES</span>
                      </button>

                      <button
                        role="menuitem"
                        type="button"
                        onClick={() => {
                          applyBotzLanguage("en");
                          setShowLangMenu(false);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          padding: "10px 10px",
                          borderRadius: "10px",
                          border: "1px solid rgba(255,255,255,0.06)",
                          background: botzLanguage === "en" ? "rgba(34, 211, 238, 0.10)" : "transparent",
                          color: "#e2e8f0",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: 800,
                          textAlign: "left",
                          marginTop: "6px",
                        }}
                      >
                        <span>English</span>
                        <span style={{ color: botzLanguage === "en" ? "#22d3ee" : "#64748b" }}>EN</span>
                      </button>
                    </div>
                  )}
                </div>

                <Link
                  href="/"
                  onClick={closeMenu}
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#cbd5e1",
                    textDecoration: "none",
                    padding: "8px 10px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  {navCopy.backToSite}
                </Link>
              </div>
            )}
          </div>

          {!inQualibotz && hydrated && open && <div className="bz-overlay" onClick={closeMenu} />}

          {!inQualibotz && (
            <div
              className={`bz-nav-container ${open ? "is-open" : ""}`}
              style={{
                marginLeft: isMobileView ? 0 : "auto",
                paddingLeft: isMobileView ? 0 : "24px",
                display: isMobileView ? undefined : "flex",
                justifyContent: isMobileView ? undefined : "flex-end",
                width: isMobileView ? "100%" : "100%",
                maxWidth: isMobileView ? "100%" : "none",
                flex: isMobileView ? undefined : "1 1 auto",
                transform: "none",
                transformOrigin: "center",
                minWidth: 0,
                marginTop: 0,
                alignItems: "center",
                justifySelf: isMobileView ? "stretch" : "end",
                visibility: hydrated ? "visible" : "hidden",
                opacity: hydrated ? 1 : 0,
              }}
            >
            <div className="bz-main-nav" role="navigation" aria-label="Main navigation" style={{ marginLeft: "auto", justifyContent: isMobileView ? "flex-start" : "flex-end", gap: isMobileView ? 0 : 6, display: "flex", alignItems: "center", flexWrap: "nowrap", whiteSpace: "nowrap", width: "100%" }}>

              <div className="bz-nav-links-group" style={{ marginLeft: 0 }}>

              {megaMenus.map((menu) => (
                <div
                  key={menu.key}
                  className={`bz-mega-dropdown ${openDropdown === menu.key ? "open" : ""}`}
                  onMouseEnter={() => handleDropdownHover(menu.key)}
                  onMouseLeave={handleDropdownLeave}
                >
                  <a
                    href="#"
                    className="bz-mega-trigger"
                    onClick={(e) => handleDropdownClick(e, menu.key)}
                  >
                    {menu.label} {isMobileView ? (openDropdown === menu.key ? "▴" : "▾") : ""}
                  </a>
                  <div className="bz-mega-menu" style={getMegaMenuStyle(menu.key)}>
                    <div className="bz-mega-feature">
                      <span>{menu.eyebrow}</span>
                      <strong>{menu.title}</strong>
                    </div>
                    <div className="bz-mega-items">
                      {menu.items.map((item) => (
                        <Link key={item.label} href={item.href} onClick={closeMenu} className="bz-mega-link">
                          <span>{item.label}</span>
                          <small>{item.desc}</small>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* CONTACT - MOBILE */}
              <a
                href="#contacto"
                onClick={(e) => {
                  e.preventDefault();
                  smoothScrollTo("contacto");
                  closeMenu();
                }}
                className="bz-contacto-link font-semibold text-cyan-400"
              >
                {navCopy.contact}
              </a>

              </div>

              <div className="bz-nav-cta-group">

              <div className="bz-dropdown" data-botz-lang-switcher style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setShowLangMenu((v) => !v)}
                  aria-label={isEn ? "Language" : "Idioma"}
                  aria-haspopup="menu"
                  aria-expanded={showLangMenu}
                  className="lang-toggle"
                >
                  <span>{isEn ? "EN" : "ES"}</span>
                  <span style={{ opacity: 0.8, fontWeight: 900 }}>{showLangMenu ? "▴" : "▾"}</span>
                </button>

                {showLangMenu && (
                  <div role="menu" className="lang-menu">
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        applyBotzLanguage("es");
                        setShowLangMenu(false);
                      }}
                      className="lang-option"
                      style={{ background: botzLanguage === "es" ? "rgba(34, 211, 238, 0.10)" : "transparent" }}
                    >
                      <span>Español</span>
                      <span style={{ color: botzLanguage === "es" ? "#22d3ee" : "#64748b" }}>ES</span>
                    </button>

                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        applyBotzLanguage("en");
                        setShowLangMenu(false);
                      }}
                      className="lang-option"
                      style={{ background: botzLanguage === "en" ? "rgba(34, 211, 238, 0.10)" : "transparent", marginTop: 6 }}
                    >
                      <span>English</span>
                      <span style={{ color: botzLanguage === "en" ? "#22d3ee" : "#64748b" }}>EN</span>
                    </button>
                  </div>
                )}
              </div>

              <Link
                href="/start/agents?auth=login"
                className="auth-login-btn"
                onClick={closeMenu}
                onMouseMove={handleMouseGlowMove}
                onMouseEnter={handleCtaHoverEnter}
                onMouseLeave={(event) => {
                  handleMouseGlowLeave(event);
                  handleCtaHoverLeave(event);
                }}
                style={{
                  color: "#ffffff",
                  background: "linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)",
                  border: "1px solid rgba(34, 211, 238, 0.62)",
                  boxShadow: "0 8px 20px rgba(34, 211, 238, 0.26)",
                  padding: isMobileView ? undefined : "6px 9px",
                  fontSize: isMobileView ? undefined : "11px",
                  lineHeight: 1,
                  transition: "transform .12s ease, filter .12s ease, box-shadow .12s ease",
                }}
              >
                {navCopy.signIn}
              </Link>

              <Link
                href="/pricing"
                className="auth-signup-btn"
                onClick={closeMenu}
                onMouseMove={handleMouseGlowMove}
                onMouseEnter={handleCtaHoverEnter}
                onMouseLeave={(event) => {
                  handleMouseGlowLeave(event);
                  handleCtaHoverLeave(event);
                }}
                style={{
                  color: "#ffffff",
                  background: "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%)",
                  border: "1px solid rgba(34, 211, 238, 0.68)",
                  boxShadow: "0 9px 24px rgba(34, 211, 238, 0.30)",
                  padding: isMobileView ? undefined : "6px 9px",
                  fontSize: isMobileView ? undefined : "11px",
                  lineHeight: 1,
                  transition: "transform .12s ease, filter .12s ease, box-shadow .12s ease",
                }}
              >
                {navCopy.signUp}
              </Link>

              {/* BOTÓN ESTELAR AJUSTADO */}
              <Link
                href="/start"
                className="stelar-btn-short"
                onClick={closeMenu}
                onMouseMove={handleMouseGlowMove}
                onMouseEnter={handleCtaHoverEnter}
                onMouseLeave={(event) => {
                  handleMouseGlowLeave(event);
                  handleCtaHoverLeave(event);
                }}
                style={{
                  color: "#ffffff",
                  background: "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%)",
                  border: "1px solid rgba(34, 211, 238, 0.58)",
                  boxShadow: "0 8px 24px rgba(14, 165, 233, 0.28)",
                  padding: isMobileView ? undefined : "6px 8px",
                  fontSize: isMobileView ? undefined : "11px",
                  lineHeight: 1,
                  transition: "transform .12s ease, filter .12s ease, box-shadow .12s ease",
                }}
              >
                <Sparkles size={14} style={{marginRight: '6px'}} /> Qualibotz
              </Link>

              </div>
            </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .bz-header {
          position: sticky;
          top: 0;
          z-index: 1200;
          margin: 0;
          padding: 0;
          background: #05070d;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        }

        .bz-header-container {
          display: flex;
          flex-wrap: nowrap;
          justify-content: space-between;
          align-items: center;
          padding: 12px 26px;
          background: transparent;
          position: relative;
          z-index: 1000;
          border-radius: 0;
          box-shadow: none;
          max-width: 100%;
          overflow: visible;
          width: 100%;
          margin: 0;
          min-height: 72px;
        }

        .bz-logo-nav { display: flex; justify-content: space-between; align-items: center; width: 100%; min-width: 0; gap: 12px; }

        .logo {
          font-size: 34px;
          font-weight: 900;
          color: #10b2cb;
          text-shadow: 0 0 10px rgba(16, 178, 203, 0.7);
          transition: all 0.3s ease;
        }

        .logo:hover { text-shadow: 0 0 15px rgba(16, 178, 203, 1); transform: scale(1.05); }

        .settings-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 8px;
          color: #10b981;
          text-decoration: none;
          transition: all 0.3s ease;
          margin-left: 12px;
        }

        .settings-btn:hover {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.5);
          transform: translateY(-1px);
        }

        .bz-hamburger { position: relative; display: none; flex-direction: column; justify-content: space-between; width: 40px; height: 30px; background: none; border: none; cursor: pointer; z-index: 9999; }
        .bz-hamburger span { display: block; height: 4px; width: 100%; background: #10b2cb; border-radius: 2px; }

        .bz-nav-container { display: flex; gap: 12px; min-width: 0; flex: 1; justify-content: flex-end; margin-left: auto; padding-left: 0; }
        .bz-main-nav { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; min-width: 0; justify-content: flex-end; margin-left: auto; width: 100%; overflow: visible; }
        .bz-nav-links-group { display: flex; align-items: center; gap: 2px; min-width: 0; flex: 0 1 auto; overflow: visible; }
        .bz-nav-cta-group { display: flex; align-items: center; gap: 4px; margin-left: 4px; flex: 0 0 auto; }

        @media (min-width: 1025px) {
          .bz-header .bz-logo-nav {
            display: grid !important;
            grid-template-columns: auto 1fr !important;
            align-items: center !important;
            column-gap: 12px !important;
          }
          .bz-header .bz-nav-container {
            display: flex !important;
            justify-content: flex-end !important;
            align-items: center !important;
            width: auto !important;
            margin-left: auto !important;
            padding-left: 24px !important;
            margin-top: 0 !important;
          }
          .bz-header .bz-main-nav {
            display: flex !important;
            justify-content: flex-end !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            gap: 8px !important;
            margin-left: auto !important;
            width: 100% !important;
          }
        }

        /* UNIFICACIÓN DE TAMAÑO DE TÍTULOS */
        .bz-main-nav a, 
        .bz-main-nav :global(a) { 
          color: #fff; 
          text-decoration: none; 
          padding: 7px 8px; 
          border-radius: 6px; 
          transition: all 0.3s ease; 
          font-weight: 600; 
          font-size: 16px;
          white-space: nowrap;
        }

        @media (min-width: 1025px) {
          .bz-header .bz-main-nav { width: 100% !important; }
          .bz-header .bz-nav-links-group { flex: 0 1 auto !important; justify-content: flex-end !important; }
          .bz-header .bz-nav-cta-group { flex: 0 0 auto !important; margin-left: 6px !important; }
          .bz-header .bz-main-nav a,
          .bz-header .bz-main-nav :global(a) {
            font-size: 13px !important;
            padding: 6px 6px !important;
          }
          .bz-header .auth-login-btn,
          .bz-header .auth-signup-btn,
          .bz-header .stelar-btn-short {
            font-size: 11px !important;
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }
        }
        
        .bz-nav-links-group > a,
        .bz-nav-links-group > .bz-dropdown > a {
          position: relative;
        }
        .bz-nav-links-group > a::after,
        .bz-nav-links-group > .bz-dropdown > a::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -5px;
          width: 0;
          height: 2px;
          background: #22d3ee;
          transition: width 0.22s ease;
        }
        .bz-nav-links-group > a:hover::after,
        .bz-nav-links-group > .bz-dropdown > a:hover::after {
          width: 100%;
        }
        .bz-main-nav a:hover,
        .bz-dropdown > a:hover {
          background: rgba(34, 211, 238, 0.12);
          color: #67e8f9;
          text-shadow: 0 0 12px rgba(34, 211, 238, 0.35);
          box-shadow: 0 0 0 1px rgba(34,211,238,0.2) inset;
        }

        /* ESTILO COMPACTO PARA EL BOTÓN ESTELAR */
        @keyframes bzGlowPulse {
          0% { box-shadow: 0 8px 24px rgba(14, 165, 233, 0.28); }
          100% { box-shadow: 0 14px 34px rgba(34, 211, 238, 0.42); }
        }

        .stelar-btn-short { 
          font-weight: 800 !important; 
          color: #fff !important; 
          background: linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%) !important;
          border: 1px solid rgba(34, 211, 238, 0.45) !important;
          padding: 8px 12px !important;
          border-radius: 50px !important;
          font-size: 13px !important;
          letter-spacing: 0.2px;
          display: flex;
          align-items: center;
          white-space: nowrap;
          box-shadow: 0 8px 24px rgba(14, 165, 233, 0.28);
          margin-left: 0;
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease, background-position .22s ease, outline-color .18s ease;
          position: relative;
          overflow: hidden;
          isolation: isolate;
          cursor: pointer;
          background-size: 180% 180% !important;
          background-position: 0% 50% !important;
          outline: 1px solid rgba(34, 211, 238, 0.32);
        }
        .stelar-btn-short::before {
          content: "";
          position: absolute;
          width: 120px;
          height: 120px;
          left: calc(var(--mx, 50%) - 60px);
          top: calc(var(--my, 50%) - 60px);
          background: radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 65%);
          opacity: 0;
          transition: opacity .18s ease;
          pointer-events: none;
          z-index: 0;
        }
        .stelar-btn-short::after {
          content: "";
          position: absolute;
          top: -35%;
          left: -25%;
          width: 42%;
          height: 170%;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%);
          transform: translateX(-180%) rotate(12deg);
          transition: transform .35s ease;
          pointer-events: none;
          z-index: 0;
        }
        .stelar-btn-short > * { position: relative; z-index: 1; }

        .auth-login-btn {
          font-weight: 800 !important;
          color: #ffffff !important;
          background: linear-gradient(135deg, #0891b2 0%, #22d3ee 100%) !important;
          border: 1px solid rgba(34, 211, 238, 0.62) !important;
          padding: 8px 12px !important;
          border-radius: 999px !important;
          font-size: 13px !important;
          letter-spacing: 0.2px;
          margin-left: 0;
          box-shadow: 0 8px 20px rgba(34, 211, 238, 0.26);
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease, background-position .22s ease, outline-color .18s ease;
          will-change: transform;
          position: relative;
          overflow: hidden;
          isolation: isolate;
          cursor: pointer;
          background-size: 180% 180% !important;
          background-position: 0% 50% !important;
          outline: 1px solid rgba(34, 211, 238, 0.36);
        }
        .auth-login-btn::before {
          content: "";
          position: absolute;
          width: 120px;
          height: 120px;
          left: calc(var(--mx, 50%) - 60px);
          top: calc(var(--my, 50%) - 60px);
          background: radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 65%);
          opacity: 0;
          transition: opacity .18s ease;
          pointer-events: none;
          z-index: 0;
        }
        .auth-login-btn::after {
          content: "";
          position: absolute;
          top: -35%;
          left: -25%;
          width: 42%;
          height: 170%;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%);
          transform: translateX(-180%) rotate(12deg);
          transition: transform .35s ease;
          pointer-events: none;
          z-index: 0;
        }
        .auth-login-btn > * { position: relative; z-index: 1; }
        .auth-login-btn:hover {
          filter: brightness(1.18) saturate(1.18);
          transform: scale(1.02);
          box-shadow: 0 18px 40px rgba(34, 211, 238, 0.72), 0 0 0 1px rgba(34,211,238,0.78) inset;
          background-position: 100% 50% !important;
          outline-color: rgba(103, 232, 249, 0.9);
          animation: bzGlowPulse .75s ease-in-out infinite alternate;
        }
        .auth-login-btn:hover::before { opacity: 1; }
        .auth-login-btn:hover::after { transform: translateX(360%) rotate(12deg); }
        .auth-login-btn:active {
          transform: scale(0.97);
          filter: brightness(1.02);
          box-shadow: 0 4px 12px rgba(34, 211, 238, 0.36), 0 0 0 2px rgba(125, 211, 252, 0.75) inset;
        }

        .auth-signup-btn {
          font-weight: 900 !important;
          color: #ffffff !important;
          background: linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%) !important;
          border: 1px solid rgba(34, 211, 238, 0.65) !important;
          padding: 8px 14px !important;
          border-radius: 999px !important;
          font-size: 13px !important;
          letter-spacing: 0.2px;
          margin-left: 0;
          box-shadow: 0 8px 22px rgba(34, 211, 238, 0.28);
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease, background-position .22s ease, outline-color .18s ease;
          will-change: transform;
          position: relative;
          overflow: hidden;
          isolation: isolate;
          cursor: pointer;
          background-size: 180% 180% !important;
          background-position: 0% 50% !important;
          outline: 1px solid rgba(34, 211, 238, 0.36);
        }
        .auth-signup-btn::before {
          content: "";
          position: absolute;
          width: 120px;
          height: 120px;
          left: calc(var(--mx, 50%) - 60px);
          top: calc(var(--my, 50%) - 60px);
          background: radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 65%);
          opacity: 0;
          transition: opacity .18s ease;
          pointer-events: none;
          z-index: 0;
        }
        .auth-signup-btn::after {
          content: "";
          position: absolute;
          top: -35%;
          left: -25%;
          width: 42%;
          height: 170%;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%);
          transform: translateX(-180%) rotate(12deg);
          transition: transform .35s ease;
          pointer-events: none;
          z-index: 0;
        }
        .auth-signup-btn > * { position: relative; z-index: 1; }
        .auth-signup-btn:hover {
          filter: brightness(1.18) saturate(1.18);
          transform: scale(1.02);
          box-shadow: 0 18px 40px rgba(34, 211, 238, 0.74), 0 0 0 1px rgba(34,211,238,0.80) inset;
          background-position: 100% 50% !important;
          outline-color: rgba(103, 232, 249, 0.9);
          animation: bzGlowPulse .75s ease-in-out infinite alternate;
        }
        .auth-signup-btn:hover::before { opacity: 1; }
        .auth-signup-btn:hover::after { transform: translateX(360%) rotate(12deg); }
        .auth-signup-btn:active {
          transform: scale(0.97);
          filter: brightness(1.02);
          box-shadow: 0 4px 12px rgba(34, 211, 238, 0.36), 0 0 0 2px rgba(125, 211, 252, 0.75) inset;
        }

        .lang-toggle {
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.07);
          color: #e2e8f0;
          border-radius: 10px;
          height: 36px;
          padding: 0 14px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          margin-left: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          line-height: 1;
        }
        .lang-toggle:hover {
          color: #22d3ee;
          border-color: rgba(34, 211, 238, 0.5);
        }

        .lang-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          min-width: 140px;
          background: #0b1220;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          box-shadow: 0 18px 50px rgba(0,0,0,0.55);
          padding: 6px;
          z-index: 50;
        }

        .lang-option {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 10px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.06);
          color: #e2e8f0;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
          text-align: left;
        }
        .stelar-btn-short:hover { 
          transform: scale(1.02);
          filter: brightness(1.18) saturate(1.18);
          box-shadow: 0 18px 40px rgba(34, 211, 238, 0.72), 0 0 0 1px rgba(34,211,238,0.78) inset;
          background-position: 100% 50% !important;
          outline-color: rgba(103, 232, 249, 0.9);
          animation: bzGlowPulse .75s ease-in-out infinite alternate;
        }
        .stelar-btn-short:hover::before { opacity: 1; }
        .stelar-btn-short:hover::after { transform: translateX(360%) rotate(12deg); }
        .stelar-btn-short:active {
          transform: scale(0.97);
          filter: brightness(1.02);
          box-shadow: 0 4px 12px rgba(34, 211, 238, 0.36), 0 0 0 2px rgba(125, 211, 252, 0.75) inset;
        }

        @media (max-width: 1480px) {
          .bz-main-nav a,
          .bz-main-nav :global(a) {
            font-size: 13px;
            padding: 9px 10px;
          }
          .auth-login-btn,
          .auth-signup-btn,
          .stelar-btn-short {
            font-size: 12px !important;
            padding: 8px 12px !important;
          }
          .bz-header-container { padding: 10px 16px; }
          .logo { font-size: 30px; }
          .bz-nav-container { padding-left: 16px; }
        }

        @media (min-width: 769px) and (max-width: 1920px) {
          .bz-main-nav a,
          .bz-main-nav :global(a) {
            font-size: 15px;
            padding: 7px 6px;
          }
          .bz-nav-links-group { gap: 2px; }
          .bz-nav-cta-group { gap: 2px; margin-left: 4px; }
          .auth-login-btn,
          .auth-signup-btn,
          .stelar-btn-short {
            font-size: 11px !important;
            padding: 6px 7px !important;
          }
          .stelar-btn-short { margin-left: 0; }
          .auth-login-btn { margin-left: 0; }
          .auth-signup-btn { margin-left: 0; }
          .lang-toggle {
            height: 34px;
            padding: 0 12px;
            font-size: 14px;
            margin-left: 0;
          }
        }

        @media (min-width: 1200px) {
          .bz-header-container { padding-left: 22px; padding-right: 22px; }
          .bz-nav-container { max-width: calc(100% - 280px); }
          .bz-main-nav { gap: 14px; }
        }

        .bz-mega-dropdown {
          position: relative;
        }

        .bz-mega-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .bz-mega-menu {
          display: none;
          position: fixed;
          top: 86px;
          left: 50vw;
          width: min(920px, calc(100vw - 64px));
          transform: translateX(-50%);
          grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
          gap: 16px;
          padding: 14px;
          border: 1px solid rgba(34, 211, 238, 0.18);
          border-radius: 22px;
          background:
            radial-gradient(circle at 18% 12%, rgba(34, 211, 238, 0.16), transparent 16rem),
            linear-gradient(180deg, rgba(8, 18, 41, 0.98), rgba(5, 10, 24, 0.98));
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.58), inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(18px);
          z-index: 1300;
          overflow: hidden;
        }

        .bz-mega-feature {
          min-height: 148px;
          padding: 18px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 18px;
          background: linear-gradient(145deg, rgba(34, 211, 238, 0.14), rgba(255, 255, 255, 0.035));
          min-width: 0;
          overflow: hidden;
        }

        .bz-mega-feature span {
          display: block;
          margin-bottom: 14px;
          color: #67e8f9;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .bz-mega-feature strong {
          display: block;
          color: #f8fdff;
          font-size: 18px;
          line-height: 1.16;
          letter-spacing: -0.03em;
          max-width: 100%;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .bz-mega-items {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          min-width: 0;
        }

        .bz-main-nav .bz-mega-link,
        .bz-main-nav :global(.bz-mega-link) {
          display: grid !important;
          align-content: start;
          gap: 8px;
          min-height: 112px;
          padding: 13px !important;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.035);
          color: #ffffff;
          white-space: normal !important;
          box-shadow: none;
          min-width: 0;
          overflow: hidden;
        }

        .bz-main-nav .bz-mega-link::after,
        .bz-main-nav :global(.bz-mega-link)::after {
          display: none !important;
        }

        .bz-mega-link span {
          color: #f8fdff;
          font-size: 13px;
          font-weight: 900;
          line-height: 1.2;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .bz-mega-link small {
          color: rgba(226, 242, 255, 0.68);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.45;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .bz-main-nav .bz-mega-link:hover,
        .bz-main-nav :global(.bz-mega-link:hover) {
          transform: translateY(-2px);
          background: rgba(34, 211, 238, 0.10) !important;
          border-color: rgba(34, 211, 238, 0.36);
          color: #e6fdff !important;
          box-shadow: 0 16px 38px rgba(0, 0, 0, 0.28), inset 0 0 0 1px rgba(34, 211, 238, 0.16);
          text-decoration: none !important;
        }

        @media (min-width: 769px) {
          .bz-mega-dropdown:hover .bz-mega-menu,
          .bz-mega-dropdown.open .bz-mega-menu {
            display: grid;
          }
        }

        .bz-dropdown { position: relative; }
        .bz-dropdown-content { display: none; position: absolute; background: #0d2537; min-width: 250px; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3); border-radius: 8px; overflow: hidden; z-index: 1000; top: 100%; left: 0; border: 1px solid rgba(255,255,255,0.05); }
        .bz-dropdown-content a {
          display: block;
          width: 100%;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          border-left: 2px solid transparent;
          font-size: 13px;
          color: #fff;
          text-decoration: none;
          cursor: pointer;
          position: relative;
          transition: background .16s ease, color .16s ease, box-shadow .16s ease, padding .16s ease, border-color .16s ease;
        }
        .bz-dropdown-content a::after {
          content: "";
          position: absolute;
          left: 20px;
          right: 20px;
          bottom: 8px;
          height: 2px;
          background: linear-gradient(90deg, rgba(34,211,238,0.9), rgba(103,232,249,0.95));
          transform: scaleX(0);
          transform-origin: left;
          transition: transform .2s ease;
        }
        .bz-dropdown-content a:hover {
          background: rgba(34, 211, 238, 0.34) !important;
          color: #e6fdff !important;
          box-shadow: inset 0 0 0 1px rgba(34,211,238,0.58), 0 10px 24px rgba(34,211,238,0.28);
          border-left-color: #22d3ee;
          padding-left: 24px;
          text-decoration: underline;
          text-decoration-color: #67e8f9;
          text-underline-offset: 4px;
        }
        .bz-dropdown-content a:hover::after { transform: scaleX(1); }
        .bz-dropdown-content a:focus-visible {
          background: rgba(34, 211, 238, 0.34) !important;
          color: #e6fdff !important;
          box-shadow: inset 0 0 0 1px rgba(34,211,238,0.58), 0 10px 24px rgba(34,211,238,0.28);
          border-left-color: #22d3ee;
          padding-left: 24px;
          text-decoration: underline;
          text-decoration-color: #67e8f9;
          text-underline-offset: 4px;
          outline: none;
        }

        @media (min-width: 769px) { .bz-dropdown:hover .bz-dropdown-content { display: block; } }
        .bz-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 1500; }

        @media (max-width: 1024px) {
          .bz-hamburger { display: flex !important; }
          .bz-nav-container {
            position: fixed !important;
            top: 70px !important;
            left: 12px !important;
            right: 12px !important;
            width: auto !important;
            height: auto !important;
            max-height: calc(100dvh - 88px) !important;
            background: linear-gradient(180deg, rgba(8, 18, 35, 0.98), rgba(6, 22, 36, 0.98)) !important;
            flex-direction: column !important;
            padding: 10px !important;
            border: 1px solid rgba(34, 211, 238, 0.22) !important;
            border-radius: 22px !important;
            box-shadow: 0 24px 70px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255,255,255,0.06) !important;
            transform: translateY(-10px) scale(0.98) !important;
            opacity: 0 !important;
            pointer-events: none !important;
            transition: transform 0.22s ease, opacity 0.18s ease !important;
            z-index: 3900 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            overscroll-behavior: contain !important;
          }
          .bz-nav-container.is-open {
            transform: translateY(0) scale(1) !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }
          .bz-main-nav {
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            align-items: stretch !important;
            width: 100% !important;
            gap: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .bz-nav-links-group,
          .bz-nav-cta-group {
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
            gap: 0 !important;
            margin: 0 !important;
            flex: 0 0 auto !important;
          }
          .bz-nav-links-group {
            gap: 6px !important;
          }
          .bz-nav-links-group > .bz-dropdown > a,
          .bz-nav-links-group > .bz-mega-dropdown > a,
          .bz-nav-links-group > a {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            min-height: 46px !important;
            border: 1px solid rgba(148, 163, 184, 0.14) !important;
            border-radius: 14px !important;
            background: rgba(15, 35, 55, 0.74) !important;
            color: #f8fdff !important;
            font-size: 14px !important;
            font-weight: 850 !important;
            letter-spacing: 0.01em !important;
            line-height: 1.25 !important;
            padding: 0 14px !important;
            text-align: left !important;
          }
          .bz-main-nav a { width: 100% !important; border-bottom: 0 !important; }
          .bz-nav-links-group > .bz-mega-dropdown.open > a {
            border-color: rgba(34, 211, 238, 0.42) !important;
            background: rgba(34, 211, 238, 0.13) !important;
            color: #67e8f9 !important;
          }
          .bz-mega-menu {
            position: static !important;
            display: none !important;
            width: 100% !important;
            transform: none !important;
            grid-template-columns: 1fr !important;
            gap: 8px !important;
            margin: 6px 0 2px !important;
            padding: 8px !important;
            border: 1px solid rgba(34, 211, 238, 0.12) !important;
            border-radius: 16px !important;
            background: rgba(2, 6, 14, 0.38) !important;
            box-shadow: none !important;
          }
          .bz-mega-dropdown.open .bz-mega-menu { display: grid !important; }
          .bz-mega-feature { display: none !important; }
          .bz-mega-items { grid-template-columns: 1fr !important; gap: 6px !important; }
          .bz-main-nav .bz-mega-link {
            min-height: auto !important;
            padding: 10px 12px !important;
            border: 1px solid rgba(255,255,255,0.07) !important;
            border-radius: 12px !important;
            background: rgba(255,255,255,0.035) !important;
          }
          .bz-mega-link span {
            font-size: 12px !important;
            line-height: 1.2 !important;
          }
          .bz-mega-link small {
            display: block !important;
            margin-top: 3px !important;
            font-size: 10px !important;
            line-height: 1.3 !important;
            color: rgba(226, 242, 255, 0.62) !important;
          }
          .bz-dropdown-content { position: static !important; display: none !important; width: 100% !important; }
          .bz-dropdown.open .bz-dropdown-content { display: flex !important; flex-direction: column !important; }
          .bz-dropdown-content a { font-size: 15px !important; padding: 10px 24px !important; }
          .bz-nav-cta-group {
            gap: 8px !important;
            margin-top: 10px !important;
            padding-top: 10px !important;
            border-top: 1px solid rgba(148, 163, 184, 0.14) !important;
          }
          .stelar-btn-short,
          .auth-login-btn,
          .auth-signup-btn {
            min-height: 42px !important;
            margin: 0 !important;
            justify-content: center !important;
            font-size: 13px !important;
            border-radius: 12px !important;
            padding: 0 14px !important;
          }
          .lang-toggle { margin: 0 !important; width: 100% !important; height: 42px !important; border-radius: 12px !important; justify-content: center !important; }
          .lang-menu { left: 0 !important; right: 0 !important; top: calc(100% + 6px) !important; min-width: auto !important; }
        }

        @media (max-width: 420px) {
          .bz-nav-container {
            left: 8px !important;
            right: 8px !important;
            top: 66px !important;
            max-height: calc(100dvh - 78px) !important;
            padding: 8px !important;
            border-radius: 18px !important;
          }
          .bz-nav-links-group > .bz-dropdown > a,
          .bz-nav-links-group > .bz-mega-dropdown > a,
          .bz-nav-links-group > a {
            min-height: 42px !important;
            font-size: 13px !important;
            padding: 0 12px !important;
          }
          .bz-mega-link small {
            display: none !important;
          }
          .bz-main-nav .bz-mega-link {
            padding: 9px 11px !important;
          }
          .stelar-btn-short,
          .auth-login-btn,
          .auth-signup-btn,
          .lang-toggle {
            min-height: 40px !important;
            height: 40px !important;
            font-size: 12px !important;
          }
        }

        .bz-contacto-link { display: none; }
        @media (max-width: 768px) { .bz-contacto-link { display: block; } }
      `}</style>
    </>
  );
};

export default Header;
