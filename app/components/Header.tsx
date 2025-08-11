"use client";
import React, { useState } from "react";

function scrollTo(id: string) {
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

  return (
    <header id="header">
      <div className="header-container">
        <div className="logo-nav-container">
          <h1 className="glow" onClick={toTop} style={{ cursor: "pointer" }}>
            botz
          </h1>

          {/* Hamburguesa (solo móvil) */}
          <button
            className="hamburger"
            aria-label="Abrir menú"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className={`nav-container ${open ? "is-open" : ""}`}>
          <nav onClick={() => setOpen(false)}>
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#beneficios">Beneficios</a>
            <a href="#vision">Visión</a>

            <div className="dropdown">
              <a href="#">Procesos y Flujos con IA ▾</a>
              <div className="dropdown-content">
                <a
                  href="#arquitectura-agentes-ia"
                  onClick={(e) => { e.preventDefault(); scrollTo("arquitectura-agentes-ia"); }}
                >
                  🧠 Arquitectura de Nuestros Agentes IA
                </a>
                <a
                  href="#flujo-cognitivo-visual"
                  onClick={(e) => { e.preventDefault(); scrollTo("flujo-cognitivo-visual"); }}
                >
                  🧩 Flujo Cognitivo Visual
                </a>
              </div>
            </div>

            <div className="dropdown">
              <a href="#">Soluciones de Automatización ▾</a>
              <div className="dropdown-content">
                <a
                  href="#arquitectura-ecommerce-hook"
                  onClick={(e) => { e.preventDefault(); scrollTo("arquitectura-ecommerce-hook"); }}
                >
                  🛍️ Arquitectura Ecommerce HOOK
                </a>
                <a
                  href="#automatizaciones-n8n"
                  onClick={(e) => { e.preventDefault(); scrollTo("automatizaciones-n8n"); }}
                >
                  🤖 Automatizaciones con n8n
                </a>
                <a
                  href="#caso-de-exito-hotlead"
                  onClick={(e) => { e.preventDefault(); scrollTo("caso-de-exito-hotlead"); }}
                >
                  🚀 Solución con HotLead
                </a>
              </div>
            </div>

            <div className="dropdown">
              <a href="#">Casos de Éxito ▾</a>
              <div className="dropdown-content">
                <a
                  href="#caso-exito-hook"
                  onClick={(e) => { e.preventDefault(); scrollTo("caso-exito-hook"); }}
                >
                  🏆 Proyecto HOOK con IA
                </a>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
