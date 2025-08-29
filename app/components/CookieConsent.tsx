"use client";

import React, { useState, useEffect } from "react";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookiesConsent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleConsent = (choice: string) => {
    localStorage.setItem("cookiesConsent", choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-[#0a0f1c] text-white rounded-2xl shadow-lg max-w-lg w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-3">
          <h2 className="text-lg font-bold text-cyan-400">
            Gestionar el consentimiento de las cookies 🍪
          </h2>
          <button
            onClick={() => setVisible(false)}
            className="text-gray-400 hover:text-white text-xl"
          >
            &times;
          </button>
        </div>

        {/* Texto */}
        <p className="text-sm text-gray-300 leading-relaxed mb-6">
          En <strong>BOTZ</strong> utilizamos cookies para mejorar tu experiencia
          en nuestro sitio. Puedes aceptar o denegar tu consentimiento en este
          momento. Siempre podrás revisar nuestra política más adelante.
        </p>

        {/* Botones */}
        <div className="flex flex-col md:flex-row gap-3 justify-end">
          <button
            onClick={() => handleConsent("denied")}
            className="px-5 py-2 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 transition"
          >
            Denegar
          </button>
          <button
            onClick={() => handleConsent("accepted")}
            className="px-5 py-2 rounded-lg font-semibold bg-cyan-500 hover:bg-cyan-600 transition"
          >
            Aceptar
          </button>
        </div>

        {/* Links legales */}
        <div className="mt-4 text-xs text-gray-400 flex flex-wrap gap-4 justify-center">
          <a href="/privacy" className="hover:text-cyan-400 underline">
            Política de Privacidad
          </a>
          <a href="/terms" className="hover:text-cyan-400 underline">
            Términos y Condiciones
          </a>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
