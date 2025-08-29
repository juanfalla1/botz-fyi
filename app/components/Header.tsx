"use client";
import React, { useState, useEffect } from 'react';
import Link from "next/link";

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
                  Nuestra Propuesta {isMobile ? (openDropdown === "propuesta" ? "▴" : "▾") : "▾"}
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

              <Link href="/sobre-nosotros" onClick={closeMenu}>
                Sobre Nosotros
              </Link>

              {/* Dropdown 1 */}
              <div 
                className={`dropdown ${openDropdown === "ia" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("ia")}
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href="#"
                  onClick={(e) => handleDropdownClick(e, "ia")}
                >
                  Procesos y Flujos con IA {isMobile ? (openDropdown === "ia" ? "▴" : "▾") : "▾"}
                </a>
                <div className="dropdown-content">
                  <Link href="/#arquitectura-agentes-ia" onClick={closeMenu}>
                    🧠 Arquitectura de Nuestros Agentes IA
                  </Link>
                  <Link href="/#flujo-cognitivo-visual" onClick={closeMenu}>
                    🧩 Flujo Cognitivo Visual
                  </Link>
                </div>
              </div>

              {/* Dropdown 2 */}
              <div 
                className={`dropdown ${openDropdown === "auto" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("auto")}
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href="#"
                  onClick={(e) => handleDropdownClick(e, "auto")}
                >
                  Soluciones de Automatización {isMobile ? (openDropdown === "auto" ? "▴" : "▾") : "▾"}
                </a>
                <div className="dropdown-content">
                  <Link href="/#arquitectura-ecommerce-hook" onClick={closeMenu}>
                    🛍️ Arquitectura Ecommerce HOOK
                  </Link>
                  <Link href="/#automatizaciones-n8n" onClick={closeMenu}>
                    🤖 Automatizaciones con n8n
                  </Link>
                  <Link href="/#caso-de-exito-hotlead" onClick={closeMenu}>
                    🚀 Solución con HotLead
                  </Link>
                </div>
              </div>

              {/* Dropdown 3 */}
              <div 
                className={`dropdown ${openDropdown === "exito" ? "open" : ""}`}
                onMouseEnter={() => handleDropdownHover("exito")}
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href="#"
                  onClick={(e) => handleDropdownClick(e, "exito")}
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
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .header-container {
          display: flex;
          flex-wrap: nowrap;
          font-size: 12px;
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
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .logo:hover { text-shadow: 0 0 15px rgba(16, 178, 203, 1); transform: scale(1.05); }

        .hamburger { display: none; flex-direction: column; justify-content: space-between; width: 40px; height: 30px; background: none; border: none; cursor: pointer; z-index: 9999; position: relative; }
        .hamburger span { display: block; height: 4px; width: 100%; background: #10b2cb; border-radius: 2px; transition: all 0.3s ease; }
        .hamburger.active span:nth-child(1) { transform: rotate(45deg) translate(8px, 8px); }
        .hamburger.active span:nth-child(2) { opacity: 0; }
        .hamburger.active span:nth-child(3) { transform: rotate(-45deg) translate(8px, -8px); }

        .nav-container { display: flex; gap: 20px; }
        #main-nav { display: flex; align-items: center; gap: 5px; }

        #main-nav a { color: #fff; text-decoration: none; padding: 10px 15px; border-radius: 6px; transition: all 0.3s ease; font-weight: 600; font-size: 16px; }
        #main-nav a:hover { background: rgba(255, 255, 255, 0.1); color: #10b2cb; }
        #main-nav :global(a) {font-size:/* tamaño uniforme */ 16px;font-weight: 600;  /* grosor consistente */
}

        a.login-btn { font-weight: bold; color: #10b2cb !important; background: rgba(16, 178, 203, 0.1); }
        a.login-btn:hover { background: rgba(16, 178, 203, 0.2) !important; }

        .dropdown { position: relative; }
        .dropdown-content { display: none; position: absolute; background: #0d2537; min-width: 250px; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3); border-radius: 8px; overflow: hidden; z-index: 1000; top: 100%; left: 0; }
        .dropdown-content a { display: block; padding: 12px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); font-size: 12px; color: #fff; text-decoration: none; }
        .dropdown-content a:last-child { border-bottom: none; }
        .dropdown-content a:hover { background: rgba(255, 255, 255, 0.08); }

        @media (min-width: 769px) { .dropdown:hover .dropdown-content { display: block; } }
        .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 1500; }

        @media (max-width: 768px) {
          .hamburger { display: flex; }
          .nav-container { position: fixed; top: 0; right: -100%; width: 280px; height: 100vh; background: #112f46; flex-direction: column; align-items: flex-start; justify-content: flex-start; padding: 100px 0 30px 0; transition: right 0.4s ease-in-out; z-index: 2000; }
          .nav-container.is-open { right: 0; }
          #main-nav { flex-direction: column; width: 100%; gap: 0; }
          #main-nav a, .dropdown > a { display: block; width: 100%; text-align: left; padding: 15px 25px; border-bottom: 1px solid rgba(255, 255, 255, 0.15); border-radius: 0; }
          #main-nav a:last-child { border-bottom: none; }
          #main-nav a:hover { background: rgba(255, 255, 255, 0.08); }
          .dropdown { width: 100%; }
          .dropdown-content { display: none; position: static; flex-direction: column; background: #0d2537; width: 100%; box-shadow: none; border-radius: 0; }
          .dropdown.open .dropdown-content { display: flex !important; }
          .dropdown-content a { padding: 12px 45px; font-size: 15px; }
          .dropdown > a::after { content: " ▾"; float: right; }
          .dropdown.open > a::after { content: " ▴"; }
        }
      `}</style>
    </>
  );
};

export default Header;
