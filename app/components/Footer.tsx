"use client";

import React from "react";
import { FaInstagram, FaLinkedin, FaWhatsapp, FaEnvelope } from "react-icons/fa";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

const Footer = () => {
  const language = useBotzLanguage("en");
  const isEn = language === "en";

  return (
    <footer id="contacto" className="bg-[#040917] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 text-center space-y-8">
        {/* Copyright */}
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} BOTZ. {isEn ? "All rights reserved." : "Todos los derechos reservados."}
        </p>

        {/* Contact details */}
        {/* Contact details */}
<div className="text-sm text-gray-300 space-y-1">

{/* Canada address */}
<p>📍 689 The Queensway, Toronto, Ontario, M8Y 1L1</p>

{/* Canada phone */}
<p>
  📞{" "}
  <a href="tel:+14374351594" className="hover:text-cyan-400">
    +1 (437) 435-1594
  </a>
</p>

{/* Email */}
<p>
  ✉️{" "}
  <a href="mailto:info@botz.fyi" className="hover:text-cyan-400">
    info@botz.fyi
  </a>
</p>

{/* Colombia address */}
<p>📍 Colombia, Bogotá, Calle 127A # C46-5</p>

{/* Colombia phone */}
<p>
  📞{" "}
  <a href="tel:+573154829949" className="hover:text-cyan-400">
    +57 (315) 482-9949
  </a>
</p>

</div>

            
        

        {/* Social media */}
        <div className="flex justify-center space-x-10 mt-6">
          <a
            href="https://www.instagram.com/botz.fyi"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <FaInstagram className="text-pink-500 text-4xl hover:scale-110 transition-transform" />
          </a>
          <a
            href="https://www.linkedin.com/company/botz-ai/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
          >
            <FaLinkedin className="text-blue-500 text-4xl hover:scale-110 transition-transform" />
          </a>
          <a
            href="https://wa.me/573154829949"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
          >
            <FaWhatsapp className="text-green-500 text-4xl hover:scale-110 transition-transform" />
          </a>
          <a href="mailto:info@botz.fyi" aria-label="Email">
            <FaEnvelope className="text-cyan-400 text-4xl hover:scale-110 transition-transform" />
          </a>
        </div>

        {/* Legal links */}
        <div className="flex justify-center space-x-6 text-sm text-gray-400 mt-6">
          <a href="/privacy" className="hover:text-cyan-400">
            {isEn ? "Privacy Policy" : "Politica de Privacidad"}
          </a>
          <a href="/terms" className="hover:text-cyan-400">
            {isEn ? "Terms and Conditions" : "Terminos y Condiciones"}
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;



