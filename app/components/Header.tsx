"use client";
import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
// Importamos Sparkles para el toque estelar visual
import { Sparkles, Settings, Languages } from "lucide-react";

const Header = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  type BotzLanguage = "es" | "en";
  const [botzLanguage, setBotzLanguage] = useState<BotzLanguage>("en");
  const [showLangMenu, setShowLangMenu] = useState(false);

  const inQualibotz = Boolean(pathname && pathname.startsWith("/start"));

  useEffect(() => {
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
  };

  // Close menu on route change (prevents stuck overlay)
  useEffect(() => {
    closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleDropdownClick = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    if (isMobile) {
      toggleDropdown(name);
    }
  };

  const handleDropdownHover = (name: string) => {
    if (!isMobile) {
      setOpenDropdown(name);
    }
  };

  const handleDropdownLeave = () => {
    if (!isMobile) {
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
    if (isMobile) {
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
        <div className="bz-header-container" style={{ maxWidth: "100%", width: "100%", margin: 0, padding: isMobile ? "10px 12px" : "12px 10px", display: isMobile ? "flex" : "grid", gridTemplateColumns: isMobile ? undefined : "auto minmax(0, 1fr)", columnGap: isMobile ? 0 : "8px", alignItems: "center", justifyContent: "space-between" }}>
          <div className="bz-logo-nav" style={{ width: "auto", display: "flex", alignItems: "center", columnGap: 10, flex: "0 0 auto", justifySelf: "start" }}>
            {/* LOGO MANTENIDO EN LA ESQUINA IZQUIERDA */}
            <Link href="/" passHref style={{ textDecoration: "none", borderBottom: "none", display: "inline-block" }}>
              <h1 className="logo glow" style={{ cursor: "pointer", textDecoration: "none", borderBottom: "none" }}>
                botz
              </h1>
            </Link>

            {!inQualibotz && (
              <button
                className={`bz-hamburger ${open ? "active" : ""}`}
                aria-label={navCopy.menuAria}
                aria-expanded={open}
                onClick={() => setOpen(!open)}
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

          {!inQualibotz && open && <div className="bz-overlay" onClick={closeMenu} />}

          {!inQualibotz && (
            <div
              className={`bz-nav-container ${open ? "is-open" : ""}`}
              style={{
                marginLeft: isMobile ? 0 : "auto",
                paddingLeft: isMobile ? 0 : "24px",
                display: isMobile ? undefined : "flex",
                justifyContent: isMobile ? undefined : "flex-end",
                width: isMobile ? "100%" : "100%",
                maxWidth: isMobile ? "100%" : "none",
                flex: isMobile ? undefined : "1 1 auto",
                transform: "none",
                transformOrigin: "center",
                minWidth: 0,
                marginTop: 0,
                alignItems: "center",
                justifySelf: isMobile ? "stretch" : "end",
              }}
            >
            <div className="bz-main-nav" role="navigation" aria-label="Main navigation" style={{ marginLeft: "auto", justifyContent: "space-between", gap: isMobile ? 0 : 6, display: "flex", alignItems: "center", flexWrap: "nowrap", whiteSpace: "nowrap", width: "100%" }}>

              <div className="bz-nav-links-group" style={{ marginLeft: 0 }}>

              {/* VALUE */}
              <div 
                className={`bz-dropdown ${openDropdown === "propuesta" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("propuesta")}
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href="#"
                  onClick={(e) => handleDropdownClick(e, "propuesta")}
                >
                  {navCopy.ourValue} {isMobile ? (openDropdown === "propuesta" ? "▴" : "▾") : ""}
                </a>
                <div className="bz-dropdown-content" style={getDropdownPanelStyle("propuesta")}>
                  <Link href="/#funcionalidades" onClick={closeMenu} style={submenuItemBaseStyle} onMouseEnter={handleSubmenuHoverEnter} onMouseLeave={handleSubmenuHoverLeave}>
                    ⚡ {navCopy.capabilities}
                  </Link>
                  <Link href="/#beneficios" onClick={closeMenu} style={submenuItemBaseStyle} onMouseEnter={handleSubmenuHoverEnter} onMouseLeave={handleSubmenuHoverLeave}>
                    🎯 {navCopy.benefits}
                  </Link>
                  <Link href="/#vision" onClick={closeMenu} style={submenuItemBaseStyle} onMouseEnter={handleSubmenuHoverEnter} onMouseLeave={handleSubmenuHoverLeave}>
                    👁️ {navCopy.vision}
                  </Link>
                  <a
                    href="#caso-exito-hook"
                    style={submenuItemBaseStyle}
                    onMouseEnter={handleSubmenuHoverEnter}
                    onMouseLeave={handleSubmenuHoverLeave}
                    onClick={(e) => {
                      e.preventDefault();
                      smoothScrollTo("caso-exito-hook");
                      closeMenu();
                    }}
                  >
                    🏆 {navCopy.successStories}
                  </a>
                </div>
              </div>

              <div 
                className={`bz-dropdown ${openDropdown === "nosotros" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("nosotros")}
                onMouseLeave={handleDropdownLeave}
              >
                <Link href="/sobre-nosotros" onClick={closeMenu}>
                  {navCopy.aboutUs}
                </Link>
              </div>

              {/* AUTOMATION */}
              <div 
                className={`bz-dropdown ${openDropdown === "auto" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("auto")}
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href="#"
                  onClick={(e) => handleDropdownClick(e, "auto")}
                >
                  {navCopy.automationSolutions} {isMobile ? (openDropdown === "auto" ? "▴" : "▾") : ""}
                </a>
                <div className="bz-dropdown-content" style={getDropdownPanelStyle("auto")}>
                  <Link href="/#arquitectura-E-commerce-hook" onClick={closeMenu} style={submenuItemBaseStyle} onMouseEnter={handleSubmenuHoverEnter} onMouseLeave={handleSubmenuHoverLeave}>
                    🛍️ {navCopy.aiEcommerce}
                  </Link>
                  <Link href="/#automatizaciones-n8n" onClick={closeMenu} style={submenuItemBaseStyle} onMouseEnter={handleSubmenuHoverEnter} onMouseLeave={handleSubmenuHoverLeave}>
                    🤖 {navCopy.flowAutomation}
                  </Link>
                  <Link href="/#caso-de-exito-hotlead" onClick={closeMenu} style={submenuItemBaseStyle} onMouseEnter={handleSubmenuHoverEnter} onMouseLeave={handleSubmenuHoverLeave}>
                    🚀 {navCopy.leadMgmt}
                  </Link>
                </div>
              </div>

              {/* AI FLOWS */}
              <div 
                className={`bz-dropdown ${openDropdown === "ia" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("ia")}
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href="#"
                  onClick={(e) => handleDropdownClick(e, "ia")}
                >
                  {navCopy.aiFlows} {isMobile ? (openDropdown === "ia" ? "▴" : "▾") : ""}
                </a>
                <div className="bz-dropdown-content" style={getDropdownPanelStyle("ia")}>
                  <Link href="/#arquitectura-agentes-ia" onClick={closeMenu} style={submenuItemBaseStyle} onMouseEnter={handleSubmenuHoverEnter} onMouseLeave={handleSubmenuHoverLeave}>
                    🧠 {navCopy.agentsArchitecture}
                  </Link>
                  <Link href="/#flujo-cognitivo-visual" onClick={closeMenu} style={submenuItemBaseStyle} onMouseEnter={handleSubmenuHoverEnter} onMouseLeave={handleSubmenuHoverLeave}>
                    🧩 {navCopy.visualFlow}
                  </Link>
                </div>
              </div>

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
                  padding: isMobile ? undefined : "6px 9px",
                  fontSize: isMobile ? undefined : "11px",
                  lineHeight: 1,
                  transition: "transform .12s ease, filter .12s ease, box-shadow .12s ease",
                }}
              >
                {navCopy.signIn}
              </Link>

              <Link
                href="/start/agents?auth=signup"
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
                  padding: isMobile ? undefined : "6px 9px",
                  fontSize: isMobile ? undefined : "11px",
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
                  padding: isMobile ? undefined : "6px 8px",
                  fontSize: isMobile ? undefined : "11px",
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

        .bz-hamburger { display: none; flex-direction: column; justify-content: space-between; width: 40px; height: 30px; background: none; border: none; cursor: pointer; z-index: 9999; }
        .bz-hamburger span { display: block; height: 4px; width: 100%; background: #10b2cb; border-radius: 2px; }

        .bz-nav-container { display: flex; gap: 12px; min-width: 0; flex: 1; justify-content: flex-end; margin-left: auto; padding-left: 0; }
        .bz-main-nav { display: flex; align-items: center; gap: 10px; flex-wrap: nowrap; min-width: 0; justify-content: space-between; margin-left: auto; width: 100%; }
        .bz-nav-links-group { display: flex; align-items: center; gap: 4px; min-width: 0; flex: 1 1 auto; }
        .bz-nav-cta-group { display: flex; align-items: center; gap: 3px; margin-left: 4px; flex-shrink: 0; }

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
            justify-content: space-between !important;
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
          .bz-header .bz-nav-links-group { flex: 1 1 auto !important; justify-content: center !important; }
          .bz-header .bz-nav-cta-group { flex: 0 0 auto !important; margin-left: 6px !important; }
          .bz-header .bz-main-nav a,
          .bz-header .bz-main-nav :global(a) {
            font-size: 15px !important;
            padding: 7px 7px !important;
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

        @media (max-width: 768px) {
          .bz-hamburger { display: flex; }
          .bz-nav-container { position: fixed; top: 0; right: -100%; width: 280px; height: 100vh; background: #112f46; flex-direction: column; padding: 100px 0 30px 0; transition: right 0.4s ease-in-out; z-index: 2000; }
          .bz-nav-container.is-open { right: 0; }
          .bz-main-nav { flex-direction: column; width: 100%; gap: 0; }
          .bz-nav-links-group, .bz-nav-cta-group { width: 100%; display: flex; flex-direction: column; align-items: stretch; gap: 0; margin-left: 0; }
          .bz-main-nav a { font-size: 16px; padding: 15px 25px; width: 100%; border-bottom: 1px solid rgba(255,255,255,0.1); }
          .bz-dropdown-content { position: static; display: none; width: 100%; }
          .bz-dropdown.open .bz-dropdown-content { display: flex !important; flex-direction: column; }
          .stelar-btn-short { margin: 20px 25px; justify-content: center; font-size: 14px !important; }
          .auth-login-btn { margin: 14px 25px 0; justify-content: center; font-size: 14px !important; border-radius: 12px !important; }
          .auth-signup-btn { margin: 10px 25px 0; justify-content: center; font-size: 14px !important; border-radius: 12px !important; }
          .lang-toggle { margin: 12px 25px 0; width: calc(100% - 50px); height: 38px; border-radius: 10px; justify-content: center; }
          .lang-menu { left: 25px; right: 25px; top: calc(100% + 6px); min-width: auto; }
        }

        .bz-contacto-link { display: none; }
        @media (max-width: 768px) { .bz-contacto-link { display: block; } }
      `}</style>
    </>
  );
};

export default Header;
