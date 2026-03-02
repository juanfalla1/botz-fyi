"use client";
import "@/styles/sobreNosotros.css"; // ✅ Ruta corregida
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

export default function SobreNosotros() {
  const language = useBotzLanguage("en");
  const t = language === "en"
    ? {
        hero: "We are specialists in implementing",
        heroBold1: "intelligent automation and innovative processes",
        hero2: "with AI to help companies manage",
        heroBold2: "data, leads and digital operations",
        mission: "Our Mission",
        missionText:
          "At Botz, we believe company talent should focus on strategic value, not repetitive manual work. That is why we build solutions powered by AI, n8n, Supabase and OpenAI to automate data operations, marketing and customer communications.",
        who: "Who We Are",
        whoText:
          "Botz is a technology company with a consulting mindset. We help businesses become more agile, competitive and productive through process automation, intelligent chatbots and data dashboards. Our vision is clear: every business should be able to leverage AI, regardless of size or industry.",
        values: "Our Values",
        innovation: "Innovation",
        innovationText: "We apply cutting-edge AI and automation to solve real business problems.",
        service: "Service",
        serviceText: "We act as strategic partners, supporting clients at every step.",
        results: "Results",
        resultsText: "We optimize processes and increase business productivity.",
        history: "Our Story",
        historyText:
          "botz was founded to transform how companies run digital operations. Since day one, we have delivered solutions in finance, automotive, retail and technology by combining AI, automation and agile methods.",
        journey: "Track Record",
        journey1:
          "With over 20 years of combined experience, our team has led technology innovation and digital transformation projects across the Americas, Europe and Asia.",
        journey2:
          "We have supported organizations in financial services, automotive, technology and retail in countries such as Spain, Colombia, Canada, Brazil, Argentina and South Korea, deploying solutions that optimize processes, strengthen digital security and generate measurable financial growth.",
        journey3:
          "Our trajectory combines strategic vision with expertise in agile methodologies, cloud cybersecurity and intelligent automation to increase productivity, lower costs and maximize business profitability.",
        team: "Our Team",
        founderRole: "Founder & Project Manager",
        founderDesc:
          "With more than 10 years of experience leading innovation and digital transformation projects across industries, he has supported companies in Spain, Colombia and Canada in implementing solutions that optimize operations, strengthen security and improve productivity.",
        directorRole: "Director of Digital Transformation",
        directorDesc:
          "With more than 20 years of experience, she has led process automation initiatives and digital product development in the automotive, banking and technology sectors. Her leadership has driven projects in Brazil, Argentina, South Korea and Canada, improving efficiency, lowering costs and creating sustainable growth.",
      }
    : {
        hero: "Somos Especialistas en la implementacion de",
        heroBold1: "automatizacion inteligente y procesos innovadores",
        hero2: "con IA para ayudar a empresas a gestionar de forma eficiente",
        heroBold2: "datos, leads y operaciones digitales",
        mission: "Nuestra Mision",
        missionText:
          "En Botz, creemos que el talento de las empresas debe centrarse en aportar valor estrategico, no en procesos manuales repetitivos. Por eso desarrollamos soluciones basadas en IA, n8n, Supabase y OpenAI que automatizan la gestion de datos, marketing y comunicacion con clientes.",
        who: "Quienes Somos",
        whoText:
          "Botz es una compania de tecnologia con alma de consultor. Nacimos para ayudar a las empresas a ser mas agiles, competitivas y productivas, creando soluciones de automatizacion de procesos, chatbots inteligentes y dashboards de datos. Nuestra vision es clara: que cada negocio pueda aprovechar la inteligencia artificial sin importar su tamano o sector.",
        values: "Nuestros Valores",
        innovation: "Innovacion",
        innovationText: "Aplicamos IA y automatizacion de vanguardia para resolver problemas reales.",
        service: "Servicio",
        serviceText: "Somos aliados estrategicos, acompanando a nuestros clientes en cada paso.",
        results: "Resultados",
        resultsText: "Optimizamos procesos y potenciamos la productividad de tu negocio.",
        history: "Nuestra Historia",
        historyText:
          "botz nacio con el objetivo de transformar la manera en que las empresas gestionan sus procesos digitales. Desde su fundacion, hemos desarrollado soluciones en sectores como el financiero, automotriz, retail y tecnologia, integrando inteligencia artificial, automatizacion y metodologias agiles.",
        journey: "Trayectoria",
        journey1:
          "Con mas de 20 anos de experiencia acumulada, nuestro equipo ha liderado proyectos de innovacion tecnologica y transformacion digital en America, Europa y Asia.",
        journey2:
          "Hemos acompanado a organizaciones de sectores financiero, automotriz, tecnologico y retail en paises como Espana, Colombia, Canada, Brasil, Argentina y Corea del Sur, impulsando soluciones que optimizan procesos, fortalecen la seguridad digital y generan crecimiento financiero real.",
        journey3:
          "Nuestra trayectoria combina la vision estrategica con el dominio de metodologias agiles, ciberseguridad en la nube y automatizacion inteligente, aplicando tecnologias avanzadas para elevar la productividad, reducir costos y maximizar la rentabilidad empresarial.",
        team: "Nuestro Equipo",
        founderRole: "Fundador & Project Manager",
        founderDesc:
          "Con mas de 10 anos de experiencia liderando proyectos de innovacion tecnologica y transformacion digital en diferentes industrias, ha acompanado a empresas en Espana, Colombia y Canada en la implementacion de soluciones que optimizan procesos, fortalecen la seguridad y potencian la productividad empresarial.",
        directorRole: "Directora de Transformacion Digital",
        directorDesc:
          "Con mas de 20 anos de experiencia, ha liderado iniciativas de automatizacion de procesos y desarrollo de productos digitales en sectores automotriz, bancario y tecnologico. Su liderazgo ha impulsado proyectos en Brasil, Argentina, Corea del Sur y Canada, contribuyendo a mejorar la eficiencia, reducir costos y generar un crecimiento sostenible.",
      };

  return (
    <div>
      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">botz</h1>

          <p className="hero-subtitle">
            {t.hero} <strong>{t.heroBold1}</strong> {t.hero2} <strong>{t.heroBold2}</strong>.
          </p>
        </div>
      </section>

      <div className="container">
        {/* MISIÓN / QUIÉNES SOMOS */}
        <section className="section">
          <div className="grid-2cols">
            <div>
              <div className="content-card">
                <h2 className="content-title">{t.mission}</h2>
                <p className="content-text">{t.missionText}</p>
              </div>
              <div className="content-card" style={{ marginTop: "2rem" }}>
                <h2 className="content-title">{t.who}</h2>
                <p className="content-text">{t.whoText}</p>
              </div>
            </div>

            {/* VALORES */}
            <div className="content-card">
              <h2 className="content-title">{t.values}</h2>
              <div className="values-grid">
                <div className="value-card">
                  <div className="value-icon">
                    <i className="fas fa-rocket"></i>
                  </div>
                  <h3 className="value-title">{t.innovation}</h3>
                  <p className="value-description">{t.innovationText}</p>
                </div>
                <div className="value-card">
                  <div className="value-icon">
                    <i className="fas fa-handshake"></i>
                  </div>
                  <h3 className="value-title">{t.service}</h3>
                  <p className="value-description">{t.serviceText}</p>
                </div>
                <div className="value-card">
                  <div className="value-icon">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <h3 className="value-title">{t.results}</h3>
                  <p className="value-description">{t.resultsText}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HISTORIA */}
        <section className="section">
          <h2 className="section-title">{t.history}</h2>
          <div className="grid-2cols">
            <div className="content-card">
              <p className="content-text">{t.historyText}</p>
            </div>

            {/* 🔹 Ajuste aquí: Línea de Tiempo → Trayectoria */}
            <div className="content-card">
              <h3 className="content-title">{t.journey}</h3>
              <p className="content-text">{t.journey1}</p>
              <p className="content-text">{t.journey2}</p>
              <p className="content-text">{t.journey3}</p>
            </div>
          </div>
        </section>

        {/* EQUIPO */}
        <section className="section">
          <h2 className="section-title">{t.team}</h2>
          <div className="team-grid">
            <div className="team-card">
              <img
                src="/juan-carlos.png"
                alt="Juan Carlos García Falla"
                className="team-img"
              />
              <div className="team-content">
                <h3 className="team-name">Juan Carlos García Falla</h3>
                <p className="team-role">{t.founderRole}</p>
                <p className="team-description">{t.founderDesc}</p>
                <a
                  href="https://www.linkedin.com/in/juan-carlos-garc%C3%ADa-falla"
                  target="_blank"
                  className="team-link"
                >
                  <i className="fab fa-linkedin"></i> LinkedIn
                </a>
              </div>
            </div>

            <div className="team-card">
              <img
                src="/sandra.png"
                alt="Sandra Alvarado"
                className="team-img"
              />
              <div className="team-content">
                <h3 className="team-name">Sandra Alvarado</h3>
                <p className="team-role">{t.directorRole}</p>
                <p className="team-description">{t.directorDesc}</p>
                <a
                  href="https://www.linkedin.com/in/sandra-alvarado-78047740"
                  target="_blank"
                  className="team-link"
                >
                  <i className="fab fa-linkedin"></i> LinkedIn
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}









