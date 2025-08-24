// app/components/NavBar.tsx
'use client';
import React from 'react';
import '../../styles/landing.css';

const NavBar = () => {
  return (
    <header className="header-container">
      <div className="logo-nav-container">
        <h1 className="glow">botz</h1>
        <nav className="nav-container">
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#beneficios">Beneficios</a>
          <a href="#vision">Visión</a>
          <a href="#arquitectura">Arquitectura IA</a>
          <a href="#demo">Demo</a>

          <div className="dropdown">
            <a href="#casos" className="dropdown-toggle">
              Casos de Éxito <i className="fas fa-caret-down"></i>
            </a>
            <div className="dropdown-menu">
              <a href="#bancos">Sector financiero</a>
              <a href="#retail">Retail</a>
              <a href="#salud">Salud</a>
            </div>
          </div>

          {/* ✅ Nueva pestaña para gestión de leads */}
          <a href="/dashboard">Gestión Leads en Línea</a>
        </nav>
      </div>
    </header>
  );
};

export default NavBar;
