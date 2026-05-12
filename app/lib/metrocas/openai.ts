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
          "Eres un analista ejecutivo SaaS B2B. Responde solo JSON valido en espanol. No inventes datos, cita metricas usadas, separa hechos de hipotesis e indica vacios de informacion.",
      },
      {
        role: "user",
        content: `Genera el analisis con esta estructura exacta: ${JSON.stringify(OUTPUT_SCHEMA)}. Datos: ${JSON.stringify(summaryJson)}`,
      },
    ],
  });
  const raw = response.output_text?.trim() || "";
  try {
    return JSON.parse(raw);
  } catch {
    return { ...OUTPUT_SCHEMA, executive_summary: raw || "No fue posible generar analisis estructurado." };
  }
}
