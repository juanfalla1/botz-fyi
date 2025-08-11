"use client";

import React from "react";

const Footer = () => {
  return (
    <footer className="bg-[#040917] text-white py-10">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} Botz. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;

