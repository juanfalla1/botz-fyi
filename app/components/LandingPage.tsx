import React from "react";
import Header from "./Header";
import Funcionalidades from "./Funcionalidades";
import Beneficios from "./Beneficios";
import Vision from "./Vision";
import ArchitectureDiagram from "./ArchitectureDiagram";
import FlujoVisual from "./FlujoVisual";
// 🔹 Ajuste mínimo: usar el nombre real del archivo
import CasoExitoHook from "./CasoExitoHook";
import Demo from "./Demo";
// 🔹 Ajuste mínimo: usar el nombre real del archivo de contacto
import FormularioContacto from "./FormularioContacto";
import Footer from "./Footer";

export default function LandingPage() {
  return (
    <>
      <Header />
      <div className="bg-main-background" style={{ minHeight: "100vh", paddingTop: 100 }}>
        <div className="main-container">
          <Funcionalidades />
          <Beneficios />
          <Vision />
          <ArchitectureDiagram />
          <FlujoVisual />
          {/* 🔹 Ajuste de nombre */}
          <CasoExitoHook />
          <Demo />
          {/* 🔹 Ajuste de nombre */}
          <FormularioContacto />
        </div>
      </div>
      <Footer />
    </>
  );
}

