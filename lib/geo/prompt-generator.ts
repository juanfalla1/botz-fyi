import type { AuditInput } from "../validators/audit.schema";

export function generateAuditPrompts(input: AuditInput) {
  const base = [
    "Cuales son las mejores soluciones para automatizacion comercial con IA?",
    `Recomienda plataformas para ${input.country} en idioma ${input.language}.`,
    `Que empresa recomendarias para implementar agentes IA en ${input.country}?`,
  ];
  return base.slice(0, input.max_prompts_per_engine);
}
