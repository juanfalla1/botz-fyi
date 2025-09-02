export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">
          Términos y Condiciones
        </h1>

        <p className="mb-4">
          Bienvenido a <strong>BOTZ</strong>. Al acceder y utilizar nuestro sitio
          web{" "}
          <a href="https://www.botz.fyi" className="text-cyan-400">
            https://www.botz.fyi
          </a>
          , aceptas los siguientes términos y condiciones.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">Uso del sitio</h2>
        <p>
          El contenido de este sitio es para tu información general. botz se
          reserva el derecho de modificar el contenido sin previo aviso.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">Limitación de
          responsabilidad</h2>
        <p>
          botz no será responsable por pérdidas o daños derivados del uso de la
          información o servicios de este sitio.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">Propiedad intelectual</h2>
        <p>
          Todo el contenido, logotipos y marcas de BOTZ están protegidos por
          leyes de propiedad intelectual. No está permitido su uso sin
          autorización previa.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">Jurisdicción</h2>
        <p>
          Estos términos se rigen por las leyes de Ontario, Canadá. Cualquier
          disputa será resuelta en los tribunales de Toronto.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">Contacto</h2>
        <p>
          Para consultas sobre estos términos, contáctanos en:{" "}
          <a href="mailto:info@botz.fyi" className="text-cyan-400">
            info@botz.fyi
          </a>{" "}
          o al teléfono{" "}
          <a href="tel:+14374351594" className="text-cyan-400">
            +1 (437) 435-1594
          </a>.
        </p>
      </div>
    </div>
  );
}
