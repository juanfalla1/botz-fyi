"use client";

import React from "react";
import { FaInstagram, FaLinkedin, FaWhatsapp, FaEnvelope } from "react-icons/fa";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

const Footer = () => {
  const language = useBotzLanguage("en");
  const isEn = language === "en";

  const products = ["BOTZ Workforce", "BOTZ GEO", "BOTZ Voice", "BOTZ Flow", "BOTZ Intelligence"];
  const solutions = ["AI Sales", "AI Customer Support", "AI Operations", "Workflow Automation", "AI Agents"];

  return (
    <footer id="contacto" className="bg-[#040917] text-white">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <a href="/" className="text-4xl font-black tracking-tight text-[#10b2cb] no-underline drop-shadow-[0_0_12px_rgba(16,178,203,0.55)]">
              botz
            </a>
            <p className="mt-5 text-sm font-semibold text-cyan-300">
              Enterprise AI Workforce Platform
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {isEn
                ? "Helping companies deploy AI agents that automate sales, support and operations."
                : "Ayudamos a empresas a desplegar agentes de IA para ventas, soporte y operaciones."}
            </p>
            <div className="mt-6 flex items-center gap-5">
              <a href="https://www.instagram.com/botz.fyi" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <FaInstagram className="text-pink-500 text-3xl hover:scale-110 transition-transform" />
              </a>
              <a href="https://www.linkedin.com/company/botz-ai/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <FaLinkedin className="text-blue-500 text-3xl hover:scale-110 transition-transform" />
              </a>
              <a href="https://wa.me/573154829949" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <FaWhatsapp className="text-green-500 text-3xl hover:scale-110 transition-transform" />
              </a>
              <a href="mailto:info@botz.fyi" aria-label="Email">
                <FaEnvelope className="text-cyan-400 text-3xl hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>

          <FooterColumn title="Products" items={products} />
          <FooterColumn title="Solutions" items={solutions} />

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">Company</h3>
            <ul className="mt-5 space-y-3 text-sm text-slate-400">
              <li><a href="/sobre-nosotros" className="hover:text-cyan-400">{isEn ? "About" : "Sobre nosotros"}</a></li>
              <li><a href="#contacto" className="hover:text-cyan-400">{isEn ? "Contact" : "Contacto"}</a></li>
              <li><a href="/privacy" className="hover:text-cyan-400">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-cyan-400">Terms & Conditions</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">Contact</h3>
            <ul className="mt-5 space-y-3 text-sm text-slate-400">
              <li>Toronto, Canada</li>
              <li>Bogotá, Colombia</li>
              <li><a href="mailto:info@botz.fyi" className="hover:text-cyan-400">info@botz.fyi</a></li>
              <li><a href="tel:+14374351594" className="hover:text-cyan-400">Canada: +1 (437) 435-1594</a></li>
              <li><a href="tel:+573154829949" className="hover:text-cyan-400">Colombia: +57 (315) 482-9949</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-sm text-slate-500">© 2026 BOTZ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">{title}</h3>
      <ul className="mt-5 space-y-3 text-sm text-slate-400">
        {items.map((item) => (
          <li key={item}><span className="hover:text-cyan-400">{item}</span></li>
        ))}
      </ul>
    </div>
  );
}

export default Footer;


