"use client";

import React, { useState, useEffect } from "react";

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const consent = localStorage.getItem("cookiesConsent");
    console.log("DEBUG cookiesConsent:", consent);
    if (consent !== "accepted") {
      setVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookiesConsent", "accepted");
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 w-full px-6 py-4 shadow-lg"
      style={{
        background: "#ffffff",
        color: "#111827",
        zIndex: 2147483647,
        borderTop: "4px solid #06b6d4",
      }}
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-sm text-gray-800 text-center md:text-left max-w-3xl">
          Usamos cookies para mejorar tu experiencia en{" "}
          <strong>BOTZ</strong>. Al continuar navegando, aceptas nuestra{" "}
          <a href="/privacy" className="text-cyan-600 underline">
            Política de Privacidad
          </a>.
        </p>
        <button
          onClick={acceptCookies}
          className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm px-5 py-2 rounded-lg font-semibold shadow-md transition"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
};

export default CookieBanner;



