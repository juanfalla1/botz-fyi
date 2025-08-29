"use client";

import React, { useState, useEffect } from "react";

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookiesAccepted");
    if (!accepted) {
      setVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookiesAccepted", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-[#0a0f1c] text-white px-6 py-4 shadow-lg z-50">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-sm text-gray-300 text-center md:text-left">
          Usamos cookies para mejorar tu experiencia en{" "}
          <strong>BOTZ</strong>. Al continuar navegando, aceptas nuestra{" "}
          <a href="/privacy" className="text-cyan-400 underline">
            Política de Privacidad
          </a>.
        </p>
        <button
          onClick={acceptCookies}
          className="bg-green-500 hover:bg-green-600 text-white text-sm px-5 py-2 rounded-lg font-semibold shadow-md transition"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
};

export default CookieBanner;
