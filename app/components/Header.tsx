"use client";
import React from "react";

function scrollToSection(id: string) {
  if (typeof window !== "undefined") {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}

function scrollToTop() {
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

const Header = () => (
  <header>
    <div className="header-container">
      <div className="logo-nav-container">
        {/* ✅ Al hacer clic en "botz", sube al top */}
        <h1 className="glow" onClick={scrollToTop} style={{ cursor: "pointer" }}>
          botz
        </h1>

        <div className="nav-container">
          <nav>
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#beneficios">Beneficios</a>
            <a href="#vision">Visión</a>

            {/* Sección: Procesos y Flujos con IA */}
            <div className="dropdown">
              <a href="#">Procesos y Flujos con IA ▾</a>
              <div className="dropdown-content">
                <a
                  href="#arquitectura-agentes-ia"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("arquitectura-agentes-ia");
                  }}
                >
                  🧠 Arquitectura de Nuestros Agentes IA
                </a>
                <a
                  href="#flujo-cognitivo-visual"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("flujo-cognitivo-visual");
                  }}
                >
                  🧩 Flujo Cognitivo Visual
                </a>
              </div>
            </div>

            {/* ✅ Sección: Soluciones de Automatización */}
            <div className="dropdown">
              <a href="#">Soluciones de Automatización ▾</a>
              <div className="dropdown-content">
                <a
                  href="#arquitectura-ecommerce-hook"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("arquitectura-ecommerce-hook");
                  }}
                >
                  🛍️ Arquitectura Ecommerce HOOK
                </a>
                <a
                  href="#automatizaciones-n8n"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("automatizaciones-n8n");
                  }}
                >
                  🤖 Automatizaciones con n8n
                </a>
                <a
                  href="#caso-de-exito-hotlead"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("caso-de-exito-hotlead");
                  }}
                >
                  🚀 Solución con HotLead
                </a>
              </div>
            </div>

            {/* ✅ Nueva sección: Casos de Éxito */}
            <div className="dropdown">
              <a href="#">Casos de Éxito ▾</a>
              <div className="dropdown-content">
                <a
                  href="#caso-exito-hook"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("caso-exito-hook");
                  }}
                >
                  🏆 Proyecto HOOK con IA
                </a>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </div>
  </header>
);

export default Header;
