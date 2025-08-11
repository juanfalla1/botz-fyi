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

  return (
    <header id="header">
      <div className="header-container">
        {/* Logo + hamburguesa */}
        <div className="logo-nav-container">
          <h1
            className="glow"
            onClick={toTop}
            // quita “rayita”/tap highlight en Android
            style={{ cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
          >
            botz
          </h1>

          {/* Botón hamburguesa (se muestra en móvil vía CSS) */}
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

        {/* Navegación (colapsable en móvil) */}
        <div className={`nav-container ${open ? "is-open" : ""}`}>
          <nav id="main-nav" onClick={() => setOpen(false)}>
            <a
              href="#funcionalidades"
              onClick={(e) => {
                e.preventDefault();
                smoothScrollTo("funcionalidades");
              }}
            >
              Funcionalidades
            </a>

            <a
              href="#beneficios"
              onClick={(e) => {
                e.preventDefault();
                smoothScrollTo("beneficios");
              }}
            >
              Beneficios
            </a>

            <a
              href="#vision"
              onClick={(e) => {
                e.preventDefault();
                smoothScrollTo("vision");
              }}
            >
              Visión
            </a>

            {/* Procesos y Flujos con IA */}
            <div className="dropdown">
              <a href="#">Procesos y Flujos con IA ▾</a>
              <div className="dropdown-content">
                <a
                  href="#arquitectura-agentes-ia"
                  onClick={(e) => {
                    e.preventDefault();
                    smoothScrollTo("arquitectura-agentes-ia");
                  }}
                >
                  🧠 Arquitectura de Nuestros Agentes IA
                </a>
                <a
                  href="#flujo-cognitivo-visual"
                  onClick={(e) => {
                    e.preventDefault();
                    smoothScrollTo("flujo-cognitivo-visual");
                  }}
                >
                  🧩 Flujo Cognitivo Visual
                </a>
              </div>
            </div>

            {/* Soluciones de Automatización */}
            <div className="dropdown">
              <a href="#">Soluciones de Automatización ▾</a>
              <div className="dropdown-content">
                <a
                  href="#arquitectura-ecommerce-hook"
                  onClick={(e) => {
                    e.preventDefault();
                    smoothScrollTo("arquitectura-ecommerce-hook");
                  }}
                >
                  🛍️ Arquitectura Ecommerce HOOK
                </a>
                <a
                  href="#automatizaciones-n8n"
                  onClick={(e) => {
                    e.preventDefault();
                    smoothScrollTo("automatizaciones-n8n");
                  }}
                >
                  🤖 Automatizaciones con n8n
                </a>
                <a
                  href="#caso-de-exito-hotlead"
                  onClick={(e) => {
                    e.preventDefault();
                    smoothScrollTo("caso-de-exito-hotlead");
                  }}
                >
                  🚀 Solución con HotLead
                </a>
              </div>
            </div>

            {/* Casos de Éxito */}
            <div className="dropdown">
              <a href="#">Casos de Éxito ▾</a>
              <div className="dropdown-content">
                <a
                  href="#caso-exito-hook"
                  onClick={(e) => {
                    e.preventDefault();
                    smoothScrollTo("caso-exito-hook");
                  }}
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
