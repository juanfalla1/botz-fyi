"use client";
import React, { useState } from "react";

function smoothScrollTo(id: string) {
  if (typeof window === "undefined") return;
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function toTop() {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const Header: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  function toggleDropdown(name: string) {
    setOpenDropdown(openDropdown === name ? null : name);
  }

  return (
    <header id="header">
      <div className="header-container">
        {/* Logo */}
        <div className="logo-nav-container">
          <h1
            className="glow"
            onClick={toTop}
            style={{ cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
          >
            botz
          </h1>

          {/* Botón hamburguesa */}
          <button
            className="hamburger"
            aria-label="Abrir menú"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {/* Overlay */}
        {open && <div className="overlay" onClick={() => setOpen(false)} />}

        {/* Navegación */}
        <div className={`nav-container ${open ? "is-open" : ""}`}>
          <nav id="main-nav">
            <a
              href="#funcionalidades"
              onClick={(e) => {
                e.preventDefault();
                smoothScrollTo("funcionalidades");
                setOpen(false);
              }}
            >
              Funcionalidades
            </a>

            <a
              href="#beneficios"
              onClick={(e) => {
                e.preventDefault();
                smoothScrollTo("beneficios");
                setOpen(false);
              }}
            >
              Beneficios
            </a>

            <a
              href="#vision"
              onClick={(e) => {
                e.preventDefault();
                smoothScrollTo("vision");
                setOpen(false);
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
                  toggleDropdown("ia");
                }}
              >
                Procesos y Flujos con IA ▾
              </a>
              <div className="dropdown-content">
                <a
                  href="#arquitectura-agentes-ia"
                  onClick={(e) => {
                    e.preventDefault();
                    smoothScrollTo("arquitectura-agentes-ia");
                    setOpen(false);
                    setOpenDropdown(null);
                  }}
                >
                  🧠 Arquitectura de Nuestros Agentes IA
                </a>
                <a
                  href="#flujo-cognitivo-visual"
                  onClick={(e) => {
                    e.preventDefault();
                    smoothScrollTo("flujo-cognitivo-visual");
                    setOpen(false);
                    setOpenDropdown(null);
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
                  toggleDropdown("auto");
                }}
              >
                Soluciones de Automatización ▾
              </a>
              <div className="dropdown-content">
                <a
                  href="#arquitectura-ecommerce-hook"
                  onClick={(e) => {
                    e.preventDefault();
                    smoothScrollTo("arquitectura-ecommerce-hook");
                    setOpen(false);
                    setOpenDropdown(null);
                  }}
                >
                  🛍️ Arquitectura Ecommerce HOOK
                </a>
                <a
                  href="#automatizaciones-n8n"
                  onClick={(e) => {
                    e.preventDefault();
                    smoothScrollTo("automatizaciones-n8n");
                    setOpen(false);
                    setOpenDropdown(null);
                  }}
                >
                  🤖 Automatizaciones con n8n
                </a>
                <a
                  href="#caso-de-exito-hotlead"
                  onClick={(e) => {
                    e.preventDefault();
                    smoothScrollTo("caso-de-exito-hotlead");
                    setOpen(false);
                    setOpenDropdown(null);
                  }}
                >
                  🚀 Solución con HotLead
                </a>
              </div>
            </div>

            {/* Dropdown 3 */}
            <div className={`dropdown ${openDropdown === "casos" ? "open" : ""}`}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toggleDropdown("casos");
                }}
              >
                Casos de Éxito ▾
              </a>
              <div className="dropdown-content">
                <a
                  href="#caso-exito-hook"
                  onClick={(e) => {
                    e.preventDefault();
                    smoothScrollTo("caso-exito-hook");
                    setOpen(false);
                    setOpenDropdown(null);
                  }}
                >
                  🏆 Proyecto HOOK con IA
                </a>
              </div>
            </div>

            {/* Login */}
            <a
              href="/dashboard"
              style={{ fontWeight: "bold", color: "#10b2cb" }}
              onClick={() => setOpen(false)}
            >
              Login
            </a>
          </nav>
        </div>
      </div>

      {/* ====== ESTILOS ====== */}
      <style jsx>{`
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          position: relative;
          z-index: 1000;
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
          position: absolute;
          top: 15px;
          right: 20px;
          z-index: 9999;
          pointer-events: auto;
        }

        .hamburger span {
          display: block;
          height: 4px;
          width: 100%;
          background: #10b2cb;
          border-radius: 2px;
        }

        .nav-container {
          display: flex;
          gap: 20px;
        }

        /* Overlay */
        .overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          z-index: 1500;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
          .logo-nav-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            padding: 10px 20px;
          }

          .hamburger {
            display: flex !important;
            position: relative;
            margin-left: auto;
            width: 60px;
            gap: 5px;
          }

          .hamburger span {
            display: block;
            width: 100%;
            height: 3px;
            background: #10b2cb;
            border-radius: 2px;
          }

          .nav-container {
            position: fixed;
            top: 0;
            right: -100%;
            width: 70%;
            height: 100%;
            background: #112f46;
            flex-direction: column;
            align-items: flex-start;
            justify-content: flex-start;
            padding-top: 80px;
            transition: right 0.3s ease-in-out;
            z-index: 2000;
          }

          .nav-container.is-open {
            right: 0;
          }

          .nav-container a,
          .nav-container .dropdown > a {
            display: block;
            width: 100%;
            text-align: left;
            padding: 12px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
          }

          .nav-container a:last-child {
            border-bottom: none;
          }

          .nav-container a:hover {
            background: rgba(255, 255, 255, 0.08);
          }

          .dropdown {
            width: 100%;
          }

          .dropdown-content {
            display: none;
            flex-direction: column;
            background: #0d2537;
            width: 100%;
          }

          .dropdown.open .dropdown-content {
            display: flex;
          }

          @media (min-width: 769px) {
            .dropdown:hover .dropdown-content {
              display: flex;
            }
          }

          .dropdown-content a {
            padding: 10px 30px;
            font-size: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
        }
      `}</style>
    </header>
  );
};

export default Header;


