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
    <footer id="contacto" className="botz-footer">
      <div className="botz-footer-inner">
        <div className="botz-footer-grid">
          <div>
            <a href="/" className="botz-footer-logo">
              botz
            </a>
            <p className="botz-footer-platform">
              Enterprise AI Workforce Platform
            </p>
            <p className="botz-footer-description">
              {isEn
                ? "Helping companies deploy AI agents that automate sales, support and operations."
                : "Ayudamos a empresas a desplegar agentes de IA para ventas, soporte y operaciones."}
            </p>
            <div className="botz-footer-socials">
              <a href="https://www.instagram.com/botz.fyi" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <FaInstagram className="botz-social-icon botz-social-instagram" />
              </a>
              <a href="https://www.linkedin.com/company/botz-ai/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <FaLinkedin className="botz-social-icon botz-social-linkedin" />
              </a>
              <a href="https://wa.me/573154829949" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <FaWhatsapp className="botz-social-icon botz-social-whatsapp" />
              </a>
              <a href="mailto:info@botz.fyi" aria-label="Email">
                <FaEnvelope className="botz-social-icon botz-social-email" />
              </a>
            </div>
          </div>

          <FooterColumn title="Products" items={products} />
          <FooterColumn title="Solutions" items={solutions} />

          <div>
            <h3 className="botz-footer-title">Company</h3>
            <ul className="botz-footer-list">
              <li><a href="/sobre-nosotros">{isEn ? "About" : "Sobre nosotros"}</a></li>
              <li><a href="#contacto">{isEn ? "Contact" : "Contacto"}</a></li>
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms & Conditions</a></li>
            </ul>
          </div>

          <div>
            <h3 className="botz-footer-title">Contact</h3>
            <ul className="botz-footer-list">
              <li>Toronto, Canada</li>
              <li>Bogotá, Colombia</li>
              <li><a href="mailto:info@botz.fyi">info@botz.fyi</a></li>
              <li><a href="tel:+14374351594">Canada: +1 (437) 435-1594</a></li>
              <li><a href="tel:+573154829949">Colombia: +57 (315) 482-9949</a></li>
            </ul>
          </div>
        </div>

        <div className="botz-footer-bottom">
          <p>© 2026 BOTZ. All rights reserved.</p>
        </div>
      </div>

      <style jsx global>{`
        .botz-footer {
          background: #040917;
          color: #ffffff;
          border-top: 1px solid rgba(34, 211, 238, 0.12);
        }
        .botz-footer-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 56px 24px 28px;
        }
        .botz-footer-grid {
          display: grid;
          grid-template-columns: 1.25fr 0.85fr 1fr 0.9fr 1.2fr;
          gap: 42px;
          align-items: start;
          text-align: left;
        }
        .botz-footer-logo {
          display: inline-block;
          color: #10b2cb;
          font-size: 42px;
          font-weight: 900;
          line-height: 1;
          text-decoration: none;
          text-shadow: 0 0 12px rgba(16, 178, 203, 0.55);
        }
        .botz-footer-platform {
          margin: 22px 0 0;
          color: #67e8f9;
          font-size: 14px;
          font-weight: 800;
        }
        .botz-footer-description {
          margin: 12px 0 0;
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.65;
        }
        .botz-footer-socials {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-top: 24px;
        }
        .botz-footer-socials a {
          display: inline-flex;
          color: inherit;
          text-decoration: none;
        }
        .botz-social-icon {
          width: 30px;
          height: 30px;
          transition: transform 0.18s ease, filter 0.18s ease;
        }
        .botz-social-icon:hover {
          transform: scale(1.1);
          filter: brightness(1.15);
        }
        .botz-social-instagram { color: #ec4899; }
        .botz-social-linkedin { color: #3b82f6; }
        .botz-social-whatsapp { color: #22c55e; }
        .botz-social-email { color: #22d3ee; }
        .botz-footer-title {
          margin: 0;
          color: #67e8f9;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .botz-footer-list {
          list-style: none;
          padding: 0;
          margin: 20px 0 0;
          display: grid;
          gap: 12px;
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.35;
        }
        .botz-footer-list li {
          margin: 0;
          padding: 0;
        }
        .botz-footer-list a {
          color: #94a3b8;
          text-decoration: none;
          transition: color 0.16s ease;
        }
        .botz-footer-list a:hover {
          color: #22d3ee;
        }
        .botz-footer-bottom {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .botz-footer-bottom p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }
        @media (max-width: 1024px) {
          .botz-footer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .botz-footer-inner {
            padding: 44px 20px 26px;
          }
          .botz-footer-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
        }
      `}</style>
    </footer>
  );
};

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="botz-footer-title">{title}</h3>
      <ul className="botz-footer-list">
        {items.map((item) => (
          <li key={item}><span>{item}</span></li>
        ))}
      </ul>
    </div>
  );
}

export default Footer;
