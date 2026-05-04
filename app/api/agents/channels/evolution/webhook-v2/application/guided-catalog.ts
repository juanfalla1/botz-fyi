import type { GuidedBalanzaProfile } from "./guided-profiles";

type GuidedModelSpec = { model: string; capacity: string; resolution: string; delivery: string };

function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export const MARIANA_ESCALATION_LINK = "https://wa.me/573008265047";

export const GUIDED_BALANZA_CATALOG: Record<GuidedBalanzaProfile, Array<{ tier: string; models: GuidedModelSpec[] }>> = {
  balanza_oro_001: [
    { tier: "Linea esencial: soluciones confiables para empresas en crecimiento", models: [
      { model: "PX3202/E", capacity: "3200 g", resolution: "0,01 g", delivery: "stock" },
      { model: "PX1602/E", capacity: "1600 g", resolution: "0,01 g", delivery: "importacion a cuatro semanas" },
      { model: "PX4202/E", capacity: "4200 g", resolution: "0,01 g", delivery: "importacion a cuatro semanas" },
      { model: "PX6202/E", capacity: "6200 g", resolution: "0,01 g", delivery: "importacion a cuatro semanas" },
    ] },
    { tier: "Linea intermedia: mayor desempeno y funciones para empresas en expansion", models: [
      { model: "AX2202/E", capacity: "2200 g", resolution: "0,01 g", delivery: "importacion a cuatro semanas" },
      { model: "AX6202/E", capacity: "6200 g", resolution: "0,01 g", delivery: "importacion a cuatro semanas" },
    ] },
    { tier: "Linea avanzada: mayor rendimiento para empresas con alta demanda", models: [
      { model: "EXR2202", capacity: "2200 g", resolution: "0,01 g", delivery: "importacion a cuatro semanas" },
      { model: "EXR4202", capacity: "4200 g", resolution: "0,01 g", delivery: "importacion a cuatro semanas" },
      { model: "EXR6202", capacity: "6200 g", resolution: "0,01 g", delivery: "importacion a cuatro semanas" },
      { model: "EXR12202", capacity: "12200 g", resolution: "0,01 g", delivery: "importacion a cuatro semanas" },
    ] },
    { tier: "Linea premium: soluciones de alto nivel para empresas de gran escala", models: [
      { model: "EXP2202", capacity: "2200 g", resolution: "0,01 g", delivery: "importacion a cuatro semanas" },
      { model: "EXP4202", capacity: "4200 g", resolution: "0,01 g", delivery: "importacion a cuatro semanas" },
      { model: "EXP6202", capacity: "6200 g", resolution: "0,01 g", delivery: "importacion a cuatro semanas" },
      { model: "EXP12202", capacity: "12200 g", resolution: "0,01 g", delivery: "importacion a cuatro semanas" },
    ] },
  ],
  balanza_precision_001: [
    { tier: "Linea esencial: soluciones confiables para empresas en crecimiento", models: [
      { model: "PX323/E", capacity: "320 g", resolution: "0,001 g", delivery: "stock" },
      { model: "PX623/E", capacity: "620 g", resolution: "0,001 g", delivery: "stock" },
    ] },
    { tier: "Linea intermedia: mayor desempeno y funciones para empresas en expansion", models: [
      { model: "AX223/E", capacity: "220 g", resolution: "0,001 g", delivery: "importacion a cuatro semanas" },
      { model: "AX423/E", capacity: "420 g", resolution: "0,001 g", delivery: "importacion a cuatro semanas" },
      { model: "AX623/E", capacity: "620 g", resolution: "0,001 g", delivery: "importacion a cuatro semanas" },
    ] },
    { tier: "Linea avanzada: mayor rendimiento para empresas con alta demanda", models: [
      { model: "EXP223/AD", capacity: "220 g", resolution: "0,001 g", delivery: "importacion a cuatro semanas" },
      { model: "EXP423/AD", capacity: "420 g", resolution: "0,001 g", delivery: "importacion a cuatro semanas" },
      { model: "EXP623/AD", capacity: "620 g", resolution: "0,001 g", delivery: "importacion a cuatro semanas" },
    ] },
    { tier: "Linea premium: soluciones de alto nivel para empresas de gran escala", models: [
      { model: "EXP1203/AD", capacity: "1200 g", resolution: "0,001 g", delivery: "importacion a cuatro semanas" },
    ] },
  ],
  balanza_laboratorio_0001: [
    { tier: "Linea esencial: soluciones confiables para empresas en crecimiento", models: [
      { model: "PX224/E", capacity: "220 g", resolution: "0,001 g", delivery: "stock" },
    ] },
    { tier: "Linea intermedia: mayor desempeno y funciones para empresas en expansion", models: [
      { model: "AX224/E", capacity: "220 g", resolution: "0,0001 g", delivery: "stock" },
    ] },
    { tier: "Linea avanzada: mayor rendimiento para empresas con alta demanda", models: [
      { model: "EXP224/AD", capacity: "220 g", resolution: "0,0001 g", delivery: "importacion a cuatro semanas" },
      { model: "EXP324/AD", capacity: "320 g", resolution: "0,0001 g", delivery: "importacion a cuatro semanas" },
    ] },
  ],
  balanza_semimicro_00001: [
    { tier: "Linea esencial: soluciones confiables para empresas en crecimiento", models: [
      { model: "PX85", capacity: "82 g", resolution: "0,00001 g", delivery: "importacion a cuatro semanas" },
      { model: "PX225D", capacity: "220 g", resolution: "0,00001 g", delivery: "importacion a cuatro semanas" },
    ] },
    { tier: "Linea intermedia: mayor desempeno y funciones para empresas en expansion", models: [
      { model: "AX85", capacity: "82 g", resolution: "0,00001 g", delivery: "importacion a cuatro semanas" },
      { model: "AX125D", capacity: "82 g / 120 g", resolution: "0,00001 g", delivery: "importacion a cuatro semanas" },
      { model: "AX225D", capacity: "220 g", resolution: "0,00001 g", delivery: "importacion a cuatro semanas" },
    ] },
    { tier: "Linea avanzada: mayor rendimiento para empresas con alta demanda", models: [
      { model: "EXR125D", capacity: "82 g / 120 g", resolution: "0,00001 g", delivery: "importacion a cuatro semanas" },
      { model: "EXR225D", capacity: "120 g / 220 g", resolution: "0,00001 g", delivery: "importacion a cuatro semanas" },
    ] },
    { tier: "Linea premium: soluciones de alto nivel para empresas de gran escala", models: [
      { model: "EXP125D/AD", capacity: "82 g / 120 g", resolution: "0,00001 g", delivery: "importacion a cuatro semanas" },
      { model: "EXP225D/AD", capacity: "220 g", resolution: "0,00001 g", delivery: "importacion a cuatro semanas" },
    ] },
  ],
  balanza_industrial_portatil_conteo: [
    { tier: "Linea basica (uso industrial estandar)", models: [
      { model: "R31P3", capacity: "3000 g", resolution: "0,1 g", delivery: "stock" },
      { model: "R31P6", capacity: "6000 g", resolution: "0,2 g", delivery: "stock" },
      { model: "R31P15", capacity: "15000 g", resolution: "0,5 g", delivery: "stock" },
      { model: "R31P30", capacity: "30000 g", resolution: "1 g", delivery: "stock" },
    ] },
    { tier: "Linea basica (uso industrial estandar con conteo especial)", models: [
      { model: "RC31P3", capacity: "3000 g", resolution: "0,1 g", delivery: "stock" },
      { model: "RC31P6", capacity: "6000 g", resolution: "0,2 g", delivery: "stock" },
      { model: "RC31P15", capacity: "15000 g", resolution: "0,5 g", delivery: "stock" },
      { model: "RC31P30", capacity: "30000 g", resolution: "1 g", delivery: "stock" },
    ] },
    { tier: "Linea media (mayor precision)", models: [
      { model: "R71MD3", capacity: "3000 g", resolution: "0,05 g", delivery: "importacion a cuatro semanas" },
      { model: "R71MD6", capacity: "6000 g", resolution: "0,1 g", delivery: "importacion a cuatro semanas" },
      { model: "R71MD35", capacity: "35000 g", resolution: "0,5 g", delivery: "importacion a cuatro semanas" },
      { model: "R71MD60", capacity: "60000 g", resolution: "1 g", delivery: "importacion a cuatro semanas" },
    ] },
    { tier: "Linea alta (alta precision industrial)", models: [
      { model: "R71MHD3", capacity: "3000 g", resolution: "0,01 g", delivery: "stock" },
      { model: "R71MHD6", capacity: "6000 g", resolution: "0,02 g", delivery: "importacion a cuatro semanas" },
      { model: "R71MHD35", capacity: "35000 g", resolution: "0,1 g", delivery: "stock" },
    ] },
  ],
};

export function guidedGroupsByMode(profile: GuidedBalanzaProfile, industrialMode: "conteo" | "estandar" | "" = "") {
  const groups = GUIDED_BALANZA_CATALOG[profile] || [];
  if (profile !== "balanza_industrial_portatil_conteo" || !industrialMode) return groups;
  return groups.filter((g: any) => {
    const tier = normalizeText(String(g?.tier || ""));
    const isConteoTier = /conteo\s+especial/.test(tier);
    const isStdTier = /uso\s+industrial\s+estandar/.test(tier) && !isConteoTier;
    if (industrialMode === "conteo") return !isStdTier;
    if (industrialMode === "estandar") return !isConteoTier;
    return true;
  });
}

export function buildGuidedBalanzaReplyWithMode(profile: GuidedBalanzaProfile, industrialMode: "conteo" | "estandar" | "" = ""): string {
  const groups = guidedGroupsByMode(profile, industrialMode);
  const intro = profile === "balanza_industrial_portatil_conteo"
    ? "Si, contamos con balanzas industriales portatiles para conteo que se ajustan a tu necesidad."
    : "Si, contamos con balanzas de precision que se ajustan a tu necesidad.";
  const estimated = profile === "balanza_industrial_portatil_conteo"
    ? "Valores estimados: desde $3.500.000 (segun gama y funcionalidad). Deseas continuar con la cotizacion"
    : "Valores estimados: desde $4.000.000 (segun gama y funcionalidad). Deseas continuar con la cotizacion";
  const tierToGama = (tier: string): string => {
    const t = normalizeText(String(tier || ""));
    if (/linea\s+esencial/.test(t)) return "esencial";
    if (/linea\s+intermedia/.test(t)) return "intermedia";
    if (/linea\s+avanzada/.test(t)) return "avanzada";
    if (/linea\s+premium/.test(t)) return "premium";
    if (/linea\s+basica/.test(t)) return "basica";
    if (/linea\s+media/.test(t)) return "media";
    if (/linea\s+alta/.test(t)) return "alta";
    return "";
  };
  let modelIndex = 1;
  return [
    intro,
    estimated,
    ...groups.flatMap((group) => [
      "",
      group.tier,
      ...group.models.map((m: any) => {
        const gama = tierToGama(String(group?.tier || ""));
        const gamaPart = gama ? ` | Gama: ${gama}` : "";
        return `${modelIndex++}) ${m.model} - ${m.capacity} x ${m.resolution} (${m.delivery})${gamaPart}`;
      }),
    ]),
    "",
    "Responde con numero que se encuentra al principio del modelo (ej.: 1).",
    "Para cotizar varias referencias (max. 3), escribe: cotizar opciones 5,6,13 (ejemplo).",
    "Tambien puedes responder solo con numeros: 5,6,13.",
    "Tambien puedes escribir: cotizar modelos PX6202/E, AX2202/E, EXP6202.",
    "Para una sola referencia con varias unidades: cotizar opcion 5 cantidad 3.",
    "Si tienes dudas, escribe 'asesor' para recibir acompanamiento especializado.",
  ].join("\n");
}
