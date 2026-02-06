"use client";
import React, { useState, useEffect } from 'react';
import Link from "next/link";
// Importamos Sparkles para el toque estelar visual
import { Sparkles } from "lucide-react";

const Header = () => {
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

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

            <button
              className={`hamburger ${open ? "active" : ""}`}
              aria-label="Abrir menú"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>

          {open && <div className="overlay" onClick={closeMenu} />}

          <div className={`nav-container ${open ? "is-open" : ""}`}>
            <nav id="main-nav">

              {/* NUESTRA PROPUESTA */}
              <div 
                className={`dropdown ${openDropdown === "propuesta" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("propuesta")}
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href="#"
                  onClick={(e) => handleDropdownClick(e, "propuesta")}
                >
                  Nuestra Propuesta {isMobile ? (openDropdown === "propuesta" ? "▴" : "▾") : ""}
                </a>
                <div className="dropdown-content">
                  <Link href="/#funcionalidades" onClick={closeMenu}>
                    ⚡ Funcionalidades
                  </Link>
                  <Link href="/#beneficios" onClick={closeMenu}>
                    🎯 Beneficios
                  </Link>
                  <Link href="/#vision" onClick={closeMenu}>
                    👁️ Visión
                  </Link>
                </div>
              </div>

              <div 
                className={`dropdown ${openDropdown === "nosotros" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("nosotros")}
                onMouseLeave={handleDropdownLeave}
              >
                <Link href="/sobre-nosotros" onClick={closeMenu}>
                  Sobre Nosotros
                </Link>
              </div>

              {/* SOLUCIONES DE AUTOMATIZACIÓN */}
              <div 
                className={`dropdown ${openDropdown === "auto" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("auto")}
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href="#"
                  onClick={(e) => handleDropdownClick(e, "auto")}
                >
                  Soluciones de Automatización {isMobile ? (openDropdown === "auto" ? "▴" : "▾") : ""}
                </a>
                <div className="dropdown-content">
                  <Link href="/#arquitectura-E-commerce-hook" onClick={closeMenu}>
                    🛍️ boty E-commerce con IA
                  </Link>
                  <Link href="/#automatizaciones-n8n" onClick={closeMenu}>
                    🤖 botzflow Automatización de Flujos
                  </Link>
                  <Link href="/#caso-de-exito-hotlead" onClick={closeMenu}>
                    🚀 hotLead Gestion de Leads 
                  </Link>
                </div>
              </div>

              {/* PROCESOS Y FLUJOS CON IA */}
              <div 
                className={`dropdown ${openDropdown === "ia" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("ia")}
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href="#"
                  onClick={(e) => handleDropdownClick(e, "ia")}
                >
                  Procesos y Flujos con IA {isMobile ? (openDropdown === "ia" ? "▴" : "▾") : ""}
                </a>
                <div className="dropdown-content">
                  <Link href="/#arquitectura-agentes-ia" onClick={closeMenu}>
                    🧠 Arquitectura Agentes IA
                  </Link>
                  <Link href="/#flujo-cognitivo-visual" onClick={closeMenu}>
                    🧩 Flujo Cognitivo Visual
                  </Link>
                </div>
              </div>

              {/* CASOS DE ÉXITO */}
              <div 
                className={`dropdown ${openDropdown === "exito" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("exito")}
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href="#"
                  onClick={(e) => handleDropdownClick(e, "exito")}
                >
                  Casos de Éxito {isMobile ? (openDropdown === "exito" ? "▴" : "▾") : ""}
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
                    🏆 E-commerce HOOK 
                  </a>
                </div>
              </div>

              {/* CONTÁCTENOS - MÓVIL */}
              <a
                href="#contacto"
                onClick={(e) => {
                  e.preventDefault();
                  smoothScrollTo("contacto");
                  closeMenu();
                }}
                className="contacto-link font-semibold text-cyan-400"
              >
                Contáctenos
              </a>

              {/* BOTÓN ESTELAR AJUSTADO */}
              <Link
                href="/start"
                className="stelar-btn-short"
                onClick={closeMenu}
              >
                <Sparkles size={14} style={{marginRight: '6px'}} /> Qualibotz
              </Link>
            </nav>
          </div>
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
        }

        .logo-nav-container { display: flex; justify-content: space-between; align-items: center; width: 100%; }

        .logo {
          font-size: 28px;
          font-weight: 800;
          color: #10b2cb;
          text-shadow: 0 0 10px rgba(16, 178, 203, 0.7);
          transition: all 0.3s ease;
        }

        .logo:hover { text-shadow: 0 0 15px rgba(16, 178, 203, 1); transform: scale(1.05); }

        .hamburger { display: none; flex-direction: column; justify-content: space-between; width: 40px; height: 30px; background: none; border: none; cursor: pointer; z-index: 9999; }
        .hamburger span { display: block; height: 4px; width: 100%; background: #10b2cb; border-radius: 2px; }

        .nav-container { display: flex; gap: 20px; }
        #main-nav { display: flex; align-items: center; gap: 5px; }

        /* UNIFICACIÓN DE TAMAÑO DE TÍTULOS */
        #main-nav a, 
        #main-nav :global(a) { 
          color: #fff; 
          text-decoration: none; 
          padding: 10px 15px; 
          border-radius: 6px; 
          transition: all 0.3s ease; 
          font-weight: 600; 
          font-size: 14px; /* Tamaño unificado para todos los títulos */
          white-space: nowrap;
        }
        
        #main-nav a:hover { background: rgba(255, 255, 255, 0.1); color: #10b2cb; }

        /* ESTILO COMPACTO PARA EL BOTÓN ESTELAR */
        .stelar-btn-short { 
          font-weight: 800 !important; 
          color: #fff !important; 
          background: linear-gradient(135deg, #10b2cb 0%, #2c6bed 100%) !important;
          padding: 8px 18px !important;
          border-radius: 50px !important;
          font-size: 12px !important; /* Ligeramente menor para compensar el peso visual del gradiente */
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          white-space: nowrap;
          box-shadow: 0 0 15px rgba(16, 178, 203, 0.4);
          margin-left: 10px;
        }
        .stelar-btn-short:hover { 
          transform: translateY(-2px);
          filter: brightness(1.1);
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
        }

        .contacto-link { display: none; }
        @media (max-width: 768px) { .contacto-link { display: block; } }
      `}</style>
    </>
  );
};

export default Header;