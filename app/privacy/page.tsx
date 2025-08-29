export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">
          Política de Privacidad
        </h1>
        <p className="mb-4">
          En <strong>BOTZ</strong>, valoramos tu privacidad. Esta Política de
          Privacidad explica cómo recolectamos, usamos y protegemos tu
          información personal cuando visitas nuestro sitio web{" "}
          <a href="https://www.botz.fyi" className="text-cyan-400">
            https://www.botz.fyi
          </a>.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          Información que recolectamos
        </h2>
        <p>
          - Datos proporcionados en formularios (nombre, correo, teléfono).{" "}
          <br />
          - Datos de navegación y cookies para mejorar la experiencia del
          usuario.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          Cómo usamos tu información
        </h2>
        <p>
          Usamos tu información solo para: responder consultas, mejorar nuestros
          servicios y enviarte comunicaciones relacionadas con BOTZ. No
          compartimos tus datos con terceros sin tu consentimiento.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">Contacto</h2>
        <p>
          Si tienes preguntas sobre esta política, escríbenos a:{" "}
          <a href="mailto:info@botz.fyi" className="text-cyan-400">
            info@botz.fyi
          </a>{" "}
          o llámanos al{" "}
          <a href="tel:+14374351594" className="text-cyan-400">
            +1 (437) 435-1594
          </a>.
        </p>
      </div>
    </div>
  );
}
