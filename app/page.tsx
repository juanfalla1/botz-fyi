import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Funcionalidades from '@/components/Funcionalidades';
import Beneficios from '@/components/Beneficios';
import Vision from '@/components/Vision';
import ArchitectureDiagram from '@/components/ArchitectureDiagram';
import FlujoVisual from '@/components/FlujoVisual';
import FlujoEcommerce from '@/components/FlujoEcommerce';
import AutomatizacionN8N from '@/components/AutomatizacionN8N';
import Servicios from '@/components/Servicios';
import Footer from '@/components/Footer';
import ChatBot from '@/components/ChatBot';
import IntelligentFlowDemo from '@/components/IntelligentFlowDemo';
import HotLeadFlowDemo from '@/components/HotLeadFlowDemo';






import CasoExitoHook from '@/components/CasoExitoHook';

export default function Home() {
  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', paddingTop: 100 }}>
        <Hero />
        <Funcionalidades />
        <Beneficios />
        <Vision />

        <section id="arquitectura-agentes-ia">
          <ArchitectureDiagram />
        </section>

        <section id="flujo-cognitivo-visual">
          <FlujoVisual />
        </section>

        <section id="arquitectura-E-commerce-hook">
          <FlujoEcommerce />
        </section>

        <section id="automatizaciones-n8n">
          <AutomatizacionN8N />
        </section>

        <section id="caso-de-exito-hotlead">
          <HotLeadFlowDemo />
        </section>

        <section id="caso-de-exito-hook">
          <CasoExitoHook />
        </section>

        <section id="demo-compra-automatizada">
          <IntelligentFlowDemo />
        </section>

        <Servicios />

      
      </main>
      
      <ChatBot />
      <Footer />
    </>
  );
}

