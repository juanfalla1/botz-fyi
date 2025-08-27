"use client";
import React, { useState, useEffect } from 'react';

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

  const toTop = () => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const closeMenu = () => {
    setOpen(false);
    setOpenDropdown(null);
  };

  return (
    <>
      <header id="header">
        <div className="header-container">
          <div className="logo-nav-container">
            <h1 className="logo glow" onClick={toTop}>
              botz
            </h1>

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
              <a
                href="#funcionalidades"
                onClick={(e) => {
                  e.preventDefault();
                  smoothScrollTo("funcionalidades");
                  closeMenu();
                }}
              >
                Funcionalidades
              </a>

              <a
                href="#beneficios"
                onClick={(e) => {
                  e.preventDefault();
                  smoothScrollTo("beneficios");
                  closeMenu();
                }}
              >
                Beneficios
              </a>

              <a
                href="#vision"
                onClick={(e) => {
                  e.preventDefault();
                  smoothScrollTo("vision");
                  closeMenu();
                }}
              >
                Visión
              </a>

              {/* Dropdown 1 */}
              <div className={`dropdown ${openDropdown === "ia" ? "open" : ""}`}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    isMobile ? toggleDropdown("ia") : null;
                  }}
                  onMouseEnter={!isMobile ? () => setOpenDropdown("ia") : undefined}
                >
                  Procesos y Flujos con IA {isMobile ? (openDropdown === "ia" ? "▴" : "▾") : "▾"}
                </a>
                <div className="dropdown-content">
                  <a
                    href="#arquitectura-agentes-ia"
                    onClick={(e) => {
                      e.preventDefault();
                      smoothScrollTo("arquitectura-agentes-ia");
                      closeMenu();
                    }}
                  >
                    🧠 Arquitectura de Nuestros Agentes IA
                  </a>
                  <a
                    href="#flujo-cognitivo-visual"
                    onClick={(e) => {
                      e.preventDefault();
                      smoothScrollTo("flujo-cognitivo-visual");
                      closeMenu();
                    }}
                  >
                    🧩 Flujo Cognitivo Visual
                  </a>
                </div>
              </div>

              {/* Dropdown 2 */}
              <div className={`dropdown ${openDropdown === "auto" ? "open" : ""}`}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    isMobile ? toggleDropdown("auto") : null;
                  }}
                  onMouseEnter={!isMobile ? () => setOpenDropdown("auto") : undefined}
                >
                  Soluciones de Automatización {isMobile ? (openDropdown === "auto" ? "▴" : "▾") : "▾"}
                </a>
                <div className="dropdown-content">
                  <a
                    href="#arquitectura-ecommerce-hook"
                    onClick={(e) => {
                      e.preventDefault();
                      smoothScrollTo("arquitectura-ecommerce-hook");
                      closeMenu();
                    }}
                  >
                    🛍️ Arquitectura Ecommerce HOOK
                  </a>
                  <a
                    href="#automatizaciones-n8n"
                    onClick={(e) => {
                      e.preventDefault();
                      smoothScrollTo("automatizaciones-n8n");
                      closeMenu();
                    }}
                  >
                    🤖 Automatizaciones con n8n
                  </a>
                  <a
                    href="#caso-de-exito-hotlead"
                    onClick={(e) => {
                      e.preventDefault();
                      smoothScrollTo("caso-de-exito-hotlead");
                      closeMenu();
                    }}
                  >
                    🚀 Solución con HotLead
                  </a>
                </div>
              </div>

              {/* Dropdown 3 */}
              <div className={`dropdown ${openDropdown === "exito" ? "open" : ""}`}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    isMobile ? toggleDropdown("exito") : null;
                  }}
                  onMouseEnter={!isMobile ? () => setOpenDropdown("exito") : undefined}
                >
                  Casos de Éxito {isMobile ? (openDropdown === "exito" ? "▴" : "▾") : "▾"}
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
                    🏆 Proyecto HOOK con IA
                  </a>
                </div>
              </div>

              {/* Login */}
              <a
                href="/dashboard"
                className="login-btn"
                onClick={closeMenu}
              >
                Login
              </a>
            </nav>
          </div>
        </div>
      </header>

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background: rgba(13, 37, 55, 0.95);
          position: relative;
          z-index: 1000;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .logo-nav-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .logo {
          font-size: 28px;
          font-weight: 800;
          color: #10b2cb;
          text-shadow: 0 0 10px rgba(16, 178, 203, 0.7);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .logo:hover {
          text-shadow: 0 0 15px rgba(16, 178, 203, 1);
          transform: scale(1.05);
        }

        /* Botón hamburguesa */
        .hamburger {
          display: none;
          flex-direction: column;
          justify-content: space-between;
          width: 40px;
          height: 30px;
          background: none;
          border: none;
          cursor: pointer;
          z-index: 9999;
          position: relative;
        }

        .hamburger span {
          display: block;
          height: 4px;
          width: 100%;
          background: #10b2cb;
          border-radius: 2px;
          transition: all 0.3s ease;
        }

        .hamburger.active span:nth-child(1) {
          transform: rotate(45deg) translate(8px, 8px);
        }

        .hamburger.active span:nth-child(2) {
          opacity: 0;
        }

        .hamburger.active span:nth-child(3) {
          transform: rotate(-45deg) translate(8px, -8px);
        }

        .nav-container {
          display: flex;
          gap: 20px;
        }

        #main-nav {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        #main-nav a {
          color: #fff;
          text-decoration: none;
          padding: 10px 15px;
          border-radius: 6px;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        #main-nav a:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #10b2cb;
        }

        a.login-btn {
          font-weight: bold;
          color: #10b2cb !important;
          background: rgba(16, 178, 203, 0.1);
        }

        a.login-btn:hover {
          background: rgba(16, 178, 203, 0.2) !important;
        }

        /* Dropdown */
        .dropdown {
          position: relative;
        }

        .dropdown-content {
          display: none;
          position: absolute;
          background: #0d2537;
          min-width: 250px;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          overflow: hidden;
          z-index: 1000;
          top: 100%;
          left: 0;
        }

        .dropdown-content a {
          display: block;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 15px;
          color: #fff;
          text-decoration: none;
        }

        .dropdown-content a:last-child {
          border-bottom: none;
        }

        .dropdown-content a:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        /* Hover para escritorio */
        @media (min-width: 769px) {
          .dropdown:hover .dropdown-content {
            display: block;
          }
        }

        /* Overlay */
        .overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          z-index: 1500;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
          .hamburger {
            display: flex;
          }

          .nav-container {
            position: fixed;
            top: 0;
            right: -100%;
            width: 280px;
            height: 100vh;
            background: #112f46;
            flex-direction: column;
            align-items: flex-start;
            justify-content: flex-start;
            padding: 100px 0 30px 0;
            transition: right 0.4s ease-in-out;
            z-index: 2000;
          }

          .nav-container.is-open {
            right: 0;
          }

          #main-nav {
            flex-direction: column;
            width: 100%;
            gap: 0;
          }

          #main-nav a,
          .dropdown > a {
            display: block;
            width: 100%;
            text-align: left;
            padding: 15px 25px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 0;
          }

          #main-nav a:last-child {
            border-bottom: none;
          }

          #main-nav a:hover {
            background: rgba(255, 255, 255, 0.08);
          }

          .dropdown {
            width: 100%;
          }

          .dropdown-content {
            display: none;
            position: static;
            flex-direction: column;
            background: #0d2537;
            width: 100%;
            box-shadow: none;
            border-radius: 0;
          }

          /* ESTA ES LA PARTE CLAVE QUE NECESITAS */
          .dropdown.open .dropdown-content {
            display: flex !important;
          }

          .dropdown-content a {
            padding: 12px 45px;
            font-size: 15px;
          }

          /* Flecha indicadora para dropdowns en móviles */
          .dropdown > a::after {
            content: " ▾";
            float: right;
          }
          
          .dropdown.open > a::after {
            content: " ▴";
          }
        }
      `}</style>
    </>
  );
};

export default Header;
