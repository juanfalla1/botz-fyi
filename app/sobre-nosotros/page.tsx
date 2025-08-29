"use client";

export default function SobreNosotros() {
  return (
    <section className="text-gray-900">
      {/* HERO con video */}
      <div className="relative h-[70vh] flex items-center justify-center text-center overflow-hidden">
        {/* Video de fondo */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/fondo-animado.mp4" type="video/mp4" />
        </video>

        {/* Capa oscura encima del video */}
        <div className="absolute inset-0 bg-black/60"></div>

        {/* Contenido del Hero */}
        <div className="relative z-10 max-w-5xl px-6">
          <h1 className="text-9xl md:text-9xl font-extrabold mb-8"
          style={{ color:  "#00B4D8", textShadow: "4px 4px 8px rgba(0,0,0,0.8)" }}
          >
            Botz
          </h1>
          <p className="text-4xl md:text-4xl text-white leading-relaxed font-medium">
            Somos pioneros en la implementación de{" "}
            <strong>automatización inteligente y procesos innovadores</strong>{" "}
            con IA para ayudar a empresas a gestionar de forma eficiente{" "}
            <strong>datos, leads y operaciones digitales</strong>.
          </p>
        </div>
      </div>

      {/* BULLETS / VALORES */}
      <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8 text-center">
        <div>
          <h3 className="text-2xl font-bold text-cyan-600 mb-4">🚀 Innovación</h3>
          <p>
            Aplicamos IA y automatización de vanguardia para resolver problemas
            reales.
          </p>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-cyan-600 mb-4">🤝 Servicio</h3>
          <p>
            Somos aliados estratégicos, acompañando a nuestros clientes en cada
            paso.
          </p>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-cyan-600 mb-4">📊 Resultados</h3>
          <p>
            Optimizamos procesos y potenciamos la productividad de tu negocio.
          </p>
        </div>
      </div>

      {/* MISIÓN */}
      <div className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-cyan-600 mb-6">
          Nuestra Misión: Simplificar la Complejidad a través de la Tecnología
        </h2>
        <p className="text-lg text-gray-700 leading-relaxed">
          En <strong>Botz</strong>, creemos que el talento de las empresas debe
          centrarse en aportar valor estratégico, no en procesos manuales
          repetitivos. Por eso desarrollamos soluciones basadas en{" "}
          <strong>IA, n8n, Supabase y OpenAI</strong> que automatizan la gestión
          de datos, marketing y comunicación con clientes.
        </p>
      </div>

      {/* QUIÉNES SOMOS */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-cyan-600 mb-6">Quiénes Somos</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            <strong>Botz</strong> es una compañía de tecnología con alma de
            consultor. Nacimos para ayudar a las empresas a ser más ágiles,
            competitivas y productivas, creando soluciones de{" "}
            <strong>
              automatización de procesos, chatbots inteligentes y dashboards de
              datos
            </strong>
            . Nuestra visión es clara: que cada negocio pueda aprovechar la
            inteligencia artificial sin importar su tamaño o sector.
          </p>
        </div>
      </div>

      {/* HISTORIA */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-cyan-600 mb-6">Nuestra Historia</h2>
        <ul className="space-y-4 text-lg text-gray-700">
          <li>
            <strong>2024 – El Inicio:</strong> Nace Botz, con proyectos de IA y
            automatización en sectores como ecommerce y real estate.
          </li>
          <li>
            <strong>2025 – HotLead:</strong> Lanzamos HotLead, nuestra solución
            para la automatización de captación y gestión de leads.
          </li>
          <li>
            <strong>2025 – Ecommerce HOOK:</strong> Implementamos chatbot con IA,
            pasarela de pagos y automatización de ventas.
          </li>
          <li>
            <strong>Hoy:</strong> Expandimos nuestros servicios en España,
            Colombia y Canadá, aplicando IA y automatización a sectores como
            logística, banca y retail.
          </li>
        </ul>
      </div>

      {/* FILOSOFÍA */}
      <div className="bg-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-cyan-600 mb-12 text-center">
            Nuestra Filosofía: Los Pilares de Botz
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <h3 className="text-xl font-bold text-cyan-600 mb-2">Innovación</h3>
              <p>
                Aplicamos IA y automatización de vanguardia para resolver
                problemas reales.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-cyan-600 mb-2">Superación</h3>
              <p>
                Nos esforzamos por la máxima calidad, superando expectativas en
                cada proyecto.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-cyan-600 mb-2">Servicio</h3>
              <p>
                Somos aliados estratégicos de nuestros clientes, no solo
                proveedores.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-cyan-600 mb-2">Flexibilidad</h3>
              <p>
                Adaptamos nuestras soluciones a cada empresa y su contexto
                específico.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* EQUIPO */}
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-cyan-600 mb-6">
          El Equipo detrás de Botz
        </h2>
        <p className="text-lg text-gray-700 leading-relaxed">
          <strong>Juan Carlos García Falla</strong>, Fundador y Project Manager
          de Botz. Especialista en{" "}
          <strong>Scrum, ciberseguridad en la nube y automatización con IA</strong>.  
          Ha liderado proyectos de innovación tecnológica en{" "}
          <strong>España, Colombia y Canadá</strong>, implementando soluciones con
          OpenAI, n8n, Supabase y Next.js.
        </p>
      </div>
    </section>
  );
}


