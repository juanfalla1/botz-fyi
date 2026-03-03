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

  return (
    <>
      <header id="header">
        <div className="header-container">
          <div className="logo-nav-container">
            {/* LOGO MANTENIDO EN LA ESQUINA IZQUIERDA */}
            <Link href="/" passHref>
              <h1 className="logo glow" style={{ cursor: "pointer" }}>
                botz
              </h1>
            </Link>

            {!inQualibotz && (
              <button
                className={`hamburger ${open ? "active" : ""}`}
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

          {!inQualibotz && open && <div className="overlay" onClick={closeMenu} />}

          {!inQualibotz && (
            <div className={`nav-container ${open ? "is-open" : ""}`}>
            <nav id="main-nav">

              {/* VALUE */}
              <div 
                className={`dropdown ${openDropdown === "propuesta" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("propuesta")}
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href="#"
                  onClick={(e) => handleDropdownClick(e, "propuesta")}
                >
                  {navCopy.ourValue} {isMobile ? (openDropdown === "propuesta" ? "▴" : "▾") : ""}
                </a>
                <div className="dropdown-content">
                  <Link href="/#funcionalidades" onClick={closeMenu}>
                    ⚡ {navCopy.capabilities}
                  </Link>
                  <Link href="/#beneficios" onClick={closeMenu}>
                    🎯 {navCopy.benefits}
                  </Link>
                  <Link href="/#vision" onClick={closeMenu}>
                    👁️ {navCopy.vision}
                  </Link>
                </div>
              </div>

              <div 
                className={`dropdown ${openDropdown === "nosotros" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("nosotros")}
                onMouseLeave={handleDropdownLeave}
              >
                <Link href="/sobre-nosotros" onClick={closeMenu}>
                  {navCopy.aboutUs}
                </Link>
              </div>

              {/* AUTOMATION */}
              <div 
                className={`dropdown ${openDropdown === "auto" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("auto")}
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href="#"
                  onClick={(e) => handleDropdownClick(e, "auto")}
                >
                  {navCopy.automationSolutions} {isMobile ? (openDropdown === "auto" ? "▴" : "▾") : ""}
                </a>
                <div className="dropdown-content">
                  <Link href="/#arquitectura-E-commerce-hook" onClick={closeMenu}>
                    🛍️ {navCopy.aiEcommerce}
                  </Link>
                  <Link href="/#automatizaciones-n8n" onClick={closeMenu}>
                    🤖 {navCopy.flowAutomation}
                  </Link>
                  <Link href="/#caso-de-exito-hotlead" onClick={closeMenu}>
                    🚀 {navCopy.leadMgmt}
                  </Link>
                </div>
              </div>

              {/* AI FLOWS */}
              <div 
                className={`dropdown ${openDropdown === "ia" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("ia")}
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href="#"
                  onClick={(e) => handleDropdownClick(e, "ia")}
                >
                  {navCopy.aiFlows} {isMobile ? (openDropdown === "ia" ? "▴" : "▾") : ""}
                </a>
                <div className="dropdown-content">
                  <Link href="/#arquitectura-agentes-ia" onClick={closeMenu}>
                    🧠 {navCopy.agentsArchitecture}
                  </Link>
                  <Link href="/#flujo-cognitivo-visual" onClick={closeMenu}>
                    🧩 {navCopy.visualFlow}
                  </Link>
                </div>
              </div>

              {/* CASE STUDIES */}
              <div 
                className={`dropdown ${openDropdown === "exito" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("exito")}
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href="#"
                  onClick={(e) => handleDropdownClick(e, "exito")}
                >
                  {navCopy.successStories} {isMobile ? (openDropdown === "exito" ? "▴" : "▾") : ""}
                </a>
                <div className="dropdown-content">
                  <a
                    href="#caso-exito-hook"
                    onClick={(e) => {
                      e.preventDefault();
                      smoothScrollTo("caso-exito-hook");
                      closeMenu();
                    }}
                  >
                     🏆 {navCopy.hookStory}
                  </a>
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
                className="contacto-link font-semibold text-cyan-400"
              >
                {navCopy.contact}
              </a>

              <div className="dropdown" data-botz-lang-switcher style={{ position: "relative" }}>
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
                      <span>Espanol</span>
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
                style={{
                  color: "#ffffff",
                  background: "linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)",
                  border: "1px solid rgba(34, 211, 238, 0.62)",
                  boxShadow: "0 8px 20px rgba(34, 211, 238, 0.26)",
                }}
              >
                {navCopy.signIn}
              </Link>

              <Link
                href="/start/agents?auth=signup"
                className="auth-signup-btn"
                onClick={closeMenu}
                style={{
                  color: "#ffffff",
                  background: "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%)",
                  border: "1px solid rgba(34, 211, 238, 0.68)",
                  boxShadow: "0 9px 24px rgba(34, 211, 238, 0.30)",
                }}
              >
                {navCopy.signUp}
              </Link>

              {/* BOTÓN ESTELAR AJUSTADO */}
              <Link
                href="/start"
                className="stelar-btn-short"
                onClick={closeMenu}
                style={{
                  color: "#ffffff",
                  background: "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%)",
                  border: "1px solid rgba(34, 211, 238, 0.58)",
                  boxShadow: "0 8px 24px rgba(14, 165, 233, 0.28)",
                }}
              >
                <Sparkles size={14} style={{marginRight: '6px'}} /> Qualibotz
              </Link>
            </nav>
            </div>
          )}
        </div>
      </header>

      <style jsx>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .header-container {
          display: flex;
          flex-wrap: nowrap;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background: rgba(13, 37, 55, 0.95);
          position: relative;
          z-index: 1000;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          max-width: 100%;
          overflow: visible;
          width: 100%;
          margin: 0;
        }

        .logo-nav-container { display: flex; justify-content: space-between; align-items: center; width: 100%; min-width: 0; }

        .logo {
          font-size: 28px;
          font-weight: 800;
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

        .hamburger { display: none; flex-direction: column; justify-content: space-between; width: 40px; height: 30px; background: none; border: none; cursor: pointer; z-index: 9999; }
        .hamburger span { display: block; height: 4px; width: 100%; background: #10b2cb; border-radius: 2px; }

        .nav-container { display: flex; gap: 12px; min-width: 0; flex: 1; justify-content: flex-end; }
        #main-nav { display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; min-width: 0; }

        /* UNIFICACIÓN DE TAMAÑO DE TÍTULOS */
        #main-nav a, 
        #main-nav :global(a) { 
          color: #fff; 
          text-decoration: none; 
          padding: 9px 10px; 
          border-radius: 6px; 
          transition: all 0.3s ease; 
          font-weight: 600; 
          font-size: 13px;
          white-space: nowrap;
        }
        
        #main-nav a:hover { background: rgba(255, 255, 255, 0.1); color: #10b2cb; }

        /* ESTILO COMPACTO PARA EL BOTÓN ESTELAR */
        .stelar-btn-short { 
          font-weight: 800 !important; 
          color: #fff !important; 
          background: linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%) !important;
          border: 1px solid rgba(34, 211, 238, 0.55) !important;
          padding: 8px 18px !important;
          border-radius: 50px !important;
          font-size: 13px !important;
          letter-spacing: 0.2px;
          display: flex;
          align-items: center;
          white-space: nowrap;
          box-shadow: 0 8px 24px rgba(14, 165, 233, 0.28);
          margin-left: 10px;
          transition: transform .22s ease, box-shadow .22s ease, filter .22s ease;
        }

        .auth-login-btn {
          font-weight: 800 !important;
          color: #ffffff !important;
          background: linear-gradient(135deg, #0891b2 0%, #22d3ee 100%) !important;
          border: 1px solid rgba(34, 211, 238, 0.6) !important;
          padding: 8px 14px !important;
          border-radius: 999px !important;
          font-size: 12px !important;
          letter-spacing: 0.2px;
          margin-left: 8px;
          box-shadow: 0 8px 20px rgba(34, 211, 238, 0.24);
          transition: transform .22s ease, box-shadow .22s ease, filter .22s ease;
        }
        .auth-login-btn:hover {
          filter: brightness(1.10);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 12px 30px rgba(34, 211, 238, 0.44), 0 0 0 1px rgba(34,211,238,0.42) inset;
        }

        .auth-signup-btn {
          font-weight: 900 !important;
          color: #ffffff !important;
          background: linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%) !important;
          border: 1px solid rgba(34, 211, 238, 0.65) !important;
          padding: 8px 16px !important;
          border-radius: 999px !important;
          font-size: 12px !important;
          letter-spacing: 0.2px;
          margin-left: 6px;
          box-shadow: 0 8px 22px rgba(34, 211, 238, 0.28);
          transition: transform .22s ease, box-shadow .22s ease, filter .22s ease;
        }
        .auth-signup-btn:hover {
          filter: brightness(1.10);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 12px 30px rgba(34, 211, 238, 0.46), 0 0 0 1px rgba(34,211,238,0.46) inset;
        }

        .lang-toggle {
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.07);
          color: #e2e8f0;
          border-radius: 10px;
          height: 30px;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          margin-left: 6px;
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
          transform: translateY(-2px);
          filter: brightness(1.10);
          box-shadow: 0 13px 32px rgba(34, 211, 238, 0.40), 0 0 0 1px rgba(34,211,238,0.40) inset;
        }

        @media (max-width: 1480px) {
          #main-nav a,
          #main-nav :global(a) {
            font-size: 12px;
            padding: 8px 9px;
          }
          .auth-login-btn,
          .auth-signup-btn,
          .stelar-btn-short {
            font-size: 11px !important;
            padding: 7px 10px !important;
          }
          .header-container { padding: 12px 14px; }
        }

        .dropdown { position: relative; }
        .dropdown-content { display: none; position: absolute; background: #0d2537; min-width: 250px; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3); border-radius: 8px; overflow: hidden; z-index: 1000; top: 100%; left: 0; border: 1px solid rgba(255,255,255,0.05); }
        .dropdown-content a { display: block; padding: 12px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); font-size: 13px; color: #fff; text-decoration: none; }
        .dropdown-content a:hover { background: rgba(255, 255, 255, 0.08); }

        @media (min-width: 769px) { .dropdown:hover .dropdown-content { display: block; } }
        .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 1500; }

        @media (max-width: 768px) {
          .hamburger { display: flex; }
          .nav-container { position: fixed; top: 0; right: -100%; width: 280px; height: 100vh; background: #112f46; flex-direction: column; padding: 100px 0 30px 0; transition: right 0.4s ease-in-out; z-index: 2000; }
          .nav-container.is-open { right: 0; }
          #main-nav { flex-direction: column; width: 100%; gap: 0; }
          #main-nav a { font-size: 16px; padding: 15px 25px; width: 100%; border-bottom: 1px solid rgba(255,255,255,0.1); }
          .dropdown-content { position: static; display: none; width: 100%; }
          .dropdown.open .dropdown-content { display: flex !important; flex-direction: column; }
          .stelar-btn-short { margin: 20px 25px; justify-content: center; font-size: 14px !important; }
          .auth-login-btn { margin: 14px 25px 0; justify-content: center; font-size: 14px !important; border-radius: 12px !important; }
          .auth-signup-btn { margin: 10px 25px 0; justify-content: center; font-size: 14px !important; border-radius: 12px !important; }
          .lang-toggle { margin: 12px 25px 0; width: calc(100% - 50px); height: 38px; border-radius: 10px; justify-content: center; }
          .lang-menu { left: 25px; right: 25px; top: calc(100% + 6px); min-width: auto; }
        }

        .contacto-link { display: none; }
        @media (max-width: 768px) { .contacto-link { display: block; } }
      `}</style>
    </>
  );
};

export default Header;
