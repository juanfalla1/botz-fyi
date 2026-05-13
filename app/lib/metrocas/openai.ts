import OpenAI from "openai";

const OUTPUT_SCHEMA = {
  executive_summary: "",
  main_findings: [],
  strengths: [],
  weaknesses: [],
  sales_drop_explanations: [],
  growth_explanations: [],
  city_analysis: [],
  branch_analysis: [],
  customer_analysis: [],
  product_analysis: [],
  pos_analysis: [],
  quote_analysis: [],
  traffic_analysis: [],
  corrective_actions: [],
  work_plan_by_city: [],
  recommended_actions_30_days: [],
  recommended_actions_60_days: [],
  recommended_actions_90_days: [],
  highest_sales_days: [],
  weakest_sales_days: [],
  products_to_strengthen: [],
  risks_if_no_action: [],
  macro_coverage_check: [],
  priority_actions_top5: [],
  city_traffic_light: [],
  segment_variation_analysis: [],
  customer_variation_analysis: [],
  product_variation_analysis: [],
};

export async function generateExecutiveInsights(summaryJson: Record<string, unknown>) {
  if (!process.env.OPENAI_API_KEY) return OUTPUT_SCHEMA;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
        {
          role: "system",
          content:
          "Eres un analista ejecutivo SaaS B2B senior en revenue operations. Responde solo JSON valido en espanol. No inventes datos. Obligatorio: aterriza hallazgos con numeros concretos y nombra dias, ciudades, clientes, categorias, productos, sedes y franjas horarias cuando existan. Incluye que mejorar, como medirlo y que riesgo existe si no se ejecuta.",
        },
        {
          role: "user",
          content: `Genera el analisis con esta estructura exacta: ${JSON.stringify(OUTPUT_SCHEMA)}. Reglas: (1) En executive_summary usa formato: Que paso / Por que / Que hacer ya, con cifras concretas y numeracion legible. (2) Llena highest_sales_days y weakest_sales_days con fechas y ventas. (3) Llena products_to_strengthen con productos/categorias de baja rotacion o caida y la razon. (4) Llena risks_if_no_action con riesgos cuantificados. (5) En recommended_actions_30_days define acciones con KPI objetivo (recuperacion %, frecuencia, conversion, cobertura). (6) Completa quote_analysis, pos_analysis, traffic_analysis, customer_analysis y work_plan_by_city usando deepSummary y kpis; si no hay suficiente data en alguna, explica explicitamente la limitacion en ese bloque. (7) En macro_coverage_check refleja los bloques de deepSummary.commercialDynamics.macroCoverageMatrix con el mismo estado (ok/faltante_datos) y agrega una recomendacion concreta por bloque faltante. (8) Llena priority_actions_top5 con exactamente 5 acciones priorizadas; cada una debe incluir accion, owner_rol, horizonte_dias, kpi_objetivo y impacto_estimado_cop usando deepSummary.commercialDynamics.opportunityModel cuando exista. (9) Llena city_traffic_light usando deepSummary.commercialDynamics.opportunityModel.cityTrafficLight (color rojo/amarillo/verde) y recomendacion por ciudad. (10) Llena segment_variation_analysis, customer_variation_analysis y product_variation_analysis usando deepSummary.commercialDynamics.variationAnalysis con comparativo entre mes actual y mes previo (prev, curr, delta, deltaPct). (11) Responde JSON estricto RFC8259: no texto fuera del JSON, no comentarios, no comas finales, no separadores numericos con guion bajo (ej: usa 30000000, no 30_000_000). (12) Usa claves y textos consistentes en espanol claro; evita bloques ambiguos como 'EN BLANCO' sin explicar que es ciudad sin identificar. (13) No uses frases vagas; cada bloque debe citar al menos una cifra o entidad. Datos: ${JSON.stringify(summaryJson)}`,
        },
    ],
  });
  const raw = response.output_text?.trim() || "";
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const candidate = raw.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        // ignore
      }
    }
    return { ...OUTPUT_SCHEMA, executive_summary: raw || "No fue posible generar analisis estructurado." };
  }
}
