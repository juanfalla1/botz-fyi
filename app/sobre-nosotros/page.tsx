"use client";
import "@/styles/sobreNosotros.css"; // ✅ Ruta corregida

export default function SobreNosotros() {
  return (
    <div>
      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">botz</h1>

          <p className="hero-subtitle">
            Somos pioneros en la implementación de{" "}
            <strong>automatización inteligente y procesos innovadores</strong>{" "}
            con IA para ayudar a empresas a gestionar de forma eficiente{" "}
            <strong>datos, leads y operaciones digitales</strong>.
          </p>
        </div>
      </section>

      <div className="container">
        {/* MISIÓN / QUIÉNES SOMOS */}
        <section className="section">
          <div className="grid-2cols">
            <div>
              <div className="content-card">
                <h2 className="content-title">Nuestra Misión</h2>
                <p className="content-text">
                  En <strong>botz</strong>, creemos que el talento de las
                  empresas debe centrarse en aportar valor estratégico, no en
                  procesos manuales repetitivos. Por eso desarrollamos soluciones
                  basadas en <strong>IA, n8n, Supabase y OpenAI</strong> que
                  automatizan la gestión de datos, marketing y comunicación con
                  clientes.
                </p>
              </div>
              <div className="content-card" style={{ marginTop: "2rem" }}>
                <h2 className="content-title">Quiénes Somos</h2>
                <p className="content-text">
                  <strong>botz</strong> es una compañía de tecnología con alma
                  de consultor. Nacimos para ayudar a las empresas a ser más
                  ágiles, competitivas y productivas, creando soluciones de{" "}
                  <strong>
                    automatización de procesos, chatbots inteligentes y
                    dashboards de datos
                  </strong>
                  . Nuestra visión es clara: que cada negocio pueda aprovechar
                  la inteligencia artificial sin importar su tamaño o sector.
                </p>
              </div>
            </div>

            {/* VALORES */}
            <div className="content-card">
              <h2 className="content-title">Nuestros Valores</h2>
              <div className="values-grid">
                <div className="value-card">
                  <div className="value-icon">
                    <i className="fas fa-rocket"></i>
                  </div>
                  <h3 className="value-title">Innovación</h3>
                  <p className="value-description">
                    Aplicamos IA y automatización de vanguardia para resolver
                    problemas reales.
                  </p>
                </div>
                <div className="value-card">
                  <div className="value-icon">
                    <i className="fas fa-handshake"></i>
                  </div>
                  <h3 className="value-title">Servicio</h3>
                  <p className="value-description">
                    Somos aliados estratégicos, acompañando a nuestros clientes
                    en cada paso.
                  </p>
                </div>
                <div className="value-card">
                  <div className="value-icon">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <h3 className="value-title">Resultados</h3>
                  <p className="value-description">
                    Optimizamos procesos y potenciamos la productividad de tu
                    negocio.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HISTORIA */}
        <section className="section">
          <h2 className="section-title">Nuestra Historia</h2>
          <div className="grid-2cols">
            <div className="content-card">
              <p className="content-text">
                botz nació con el objetivo de transformar la manera en que las
                empresas gestionan sus procesos digitales. Desde su fundación,
                hemos desarrollado soluciones en sectores como el financiero,
                automotriz, retail y tecnología, integrando inteligencia
                artificial, automatización y metodologías ágiles.
              </p>
            </div>

            {/* 🔹 Ajuste aquí: Línea de Tiempo → Trayectoria */}
            <div className="content-card">
              <h3 className="content-title">Trayectoria</h3>
              <p className="content-text">
                Con más de 20 años de experiencia acumulada, nuestro equipo ha
                liderado proyectos de innovación tecnológica y transformación
                digital en América, Europa y Asia.
              </p>
              <p className="content-text">
                Hemos acompañado a organizaciones de sectores financiero,
                automotriz, tecnológico y retail en países como España, Colombia,
                Canadá, Brasil, Argentina y Corea del Sur, impulsando soluciones
                que optimizan procesos, fortalecen la seguridad digital y generan
                crecimiento financiero real.
              </p>
              <p className="content-text">
                Nuestra trayectoria combina la visión estratégica con el dominio
                de metodologías ágiles, ciberseguridad en la nube y
                automatización inteligente, aplicando tecnologías avanzadas para
                elevar la productividad, reducir costos y maximizar la
                rentabilidad empresarial.
              </p>
            </div>
          </div>
        </section>

        {/* EQUIPO */}
        <section className="section">
          <h2 className="section-title">Nuestro Equipo</h2>
          <div className="team-grid">
            <div className="team-card">
              <img
                src="/juan-carlos.png"
                alt="Juan Carlos García Falla"
                className="team-img"
              />
              <div className="team-content">
                <h3 className="team-name">Juan Carlos García Falla</h3>
                <p className="team-role">Fundador & Project Manager</p>
                <p className="team-description">
                  Con más de 10 años de experiencia liderando proyectos de
                  innovación tecnológica y transformación digital en diferentes
                  industrias, ha acompañado a empresas en España, Colombia y
                  Canadá en la implementación de soluciones que optimizan
                  procesos, fortalecen la seguridad y potencian la productividad
                  empresarial.
                </p>
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
                <p className="team-role">Directora de Transformación Digital</p>
                <p className="team-description">
                  Con más de 20 años de experiencia, ha liderado iniciativas de
                  automatización de procesos y desarrollo de productos digitales
                  en sectores automotriz, bancario y tecnológico. Su liderazgo
                  ha impulsado proyectos en Brasil, Argentina, Corea del Sur y
                  Canadá, contribuyendo a mejorar la eficiencia, reducir costos
                  y generar un crecimiento sostenible.
                </p>
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










