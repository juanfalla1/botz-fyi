export default function NewAuditPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-3xl font-semibold">Crear GEO Audit</h1>
      <div className="geo-glass rounded-3xl p-6">
        <form className="grid gap-4 sm:grid-cols-2">
          <input placeholder="URL base" className="sm:col-span-2 rounded-xl border border-white/10 bg-[#112A3D]/70 px-4 py-3" />
          <input placeholder="Profundidad de crawl (max 3)" className="rounded-xl border border-white/10 bg-[#112A3D]/70 px-4 py-3" />
          <input placeholder="Pais" className="rounded-xl border border-white/10 bg-[#112A3D]/70 px-4 py-3" />
          <input placeholder="Idioma" className="rounded-xl border border-white/10 bg-[#112A3D]/70 px-4 py-3" />
          <input placeholder="Competidores (max 3)" className="sm:col-span-2 rounded-xl border border-white/10 bg-[#112A3D]/70 px-4 py-3" />
          <div className="sm:col-span-2 rounded-xl border border-white/10 bg-[#112A3D]/70 p-4 text-sm">
            <p>Motores a evaluar (max 3)</p>
            <div className="mt-2 flex gap-4 text-[#94A3B8]"><label><input type="checkbox" defaultChecked /> OpenAI</label><label><input type="checkbox" defaultChecked /> Gemini</label><label><input type="checkbox" defaultChecked /> Perplexity</label></div>
          </div>
          <button className="sm:col-span-2 rounded-xl bg-[#00B4D8] px-4 py-3 font-semibold text-[#07111F]">Iniciar auditoria</button>
        </form>
      </div>
    </div>
  );
}
