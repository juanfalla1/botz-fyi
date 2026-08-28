export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  keyword: string;
  sections: Array<{ heading: string; content: string }>;
  faq: Array<{ q: string; a: string }>;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "como-elegir-modelos-ia-para-agentes-empresariales",
    title: "Como elegir modelos de IA para agentes empresariales",
    description:
      "Criterios practicos para combinar capacidad, velocidad, costo y control al construir agentes que ejecutan procesos reales.",
    date: "2026-08-10",
    readTime: "7 min",
    keyword: "modelos de IA",
    sections: [
      {
        heading: "El mejor modelo depende de la tarea",
        content:
          "Un agente empresarial no necesita usar el modelo mas grande para cada paso. Clasificar una solicitud, extraer datos, consultar conocimiento y planear una accion tienen exigencias distintas. Una arquitectura responsable asigna cada tarea al modelo adecuado y reserva mayor capacidad para decisiones complejas.",
      },
      {
        heading: "Evalua calidad, velocidad y control",
        content:
          "La seleccion debe basarse en pruebas con conversaciones, documentos y excepciones reales del negocio. Compara precision, latencia, costo por proceso, consistencia de formato, uso de herramientas y cumplimiento de reglas antes de llevar un modelo a produccion.",
      },
      {
        heading: "Disena para cambiar de modelo",
        content:
          "La tecnologia evoluciona rapido. Separa prompts, herramientas, datos y evaluaciones del proveedor para poder probar nuevas opciones sin reconstruir toda la operacion. El valor sostenible esta en el proceso, el contexto y la medicion, no en depender de un solo modelo.",
      },
    ],
    faq: [
      {
        q: "Debo usar siempre el modelo mas reciente?",
        a: "No. Debes usar el modelo que cumpla los criterios de calidad, velocidad, seguridad y costo de cada tarea.",
      },
      {
        q: "Como se valida un modelo antes de produccion?",
        a: "Con un conjunto de casos reales, resultados esperados, limites de autonomia y metricas repetibles para comparar alternativas.",
      },
    ],
  },
  {
    slug: "ia-hipotecaria-para-calificar-leads",
    title: "IA hipotecaria para calificar leads en menos tiempo",
    description:
      "Como usar IA para priorizar oportunidades hipotecarias, reducir tiempos de respuesta y mejorar conversion comercial.",
    date: "2026-02-25",
    readTime: "6 min",
    keyword: "ia hipotecaria",
    sections: [
      {
        heading: "El problema de calificar todo manualmente",
        content:
          "Cuando todos los leads entran al mismo embudo sin priorizacion, el equipo comercial pierde foco y tiempo. La IA hipotecaria ayuda a ordenar por urgencia, perfil y probabilidad de avance.",
      },
      {
        heading: "Como funciona un flujo practico",
        content:
          "Primero capturas datos desde WhatsApp, formularios y CRM. Luego aplicas reglas de negocio y scoring con IA para etiquetar el lead. Finalmente activas tareas, mensajes y alertas para el asesor correcto.",
      },
      {
        heading: "Metricas que debes mirar",
        content:
          "Respuesta inicial en minutos, porcentaje de leads contactados, tasa de calificacion y avance por etapa. Con estas metricas puedes mejorar prompts, reglas y tiempos de seguimiento cada semana.",
      },
    ],
    faq: [
      {
        q: "La IA reemplaza al asesor hipotecario?",
        a: "No. La IA asiste la operacion comercial para que el asesor se enfoque en cierre y negociacion.",
      },
      {
        q: "Cuanto tarda implementar un primer flujo?",
        a: "Un caso inicial puede salir en pocos dias si el alcance esta bien definido y con accesos listos.",
      },
    ],
  },
  {
    slug: "bot-whatsapp-hipotecario-mejores-practicas",
    title: "Bot de WhatsApp hipotecario: mejores practicas para convertir",
    description:
      "Guia simple para usar un bot hipotecario por WhatsApp con mensajes utiles, seguimiento automatico y mejor conversion.",
    date: "2026-02-25",
    readTime: "5 min",
    keyword: "bot hipotecario whatsapp",
    sections: [
      {
        heading: "Responde rapido y con contexto",
        content:
          "La primera respuesta define si el lead continua o abandona. Usa mensajes cortos, claros y orientados al siguiente paso. El bot debe capturar datos clave sin friccion.",
      },
      {
        heading: "Combina IA con reglas de negocio",
        content:
          "No todo debe quedar a texto libre. Mezcla preguntas guiadas, validaciones y criterios comerciales para que la salida sea util para ventas y para el CRM.",
      },
      {
        heading: "Automatiza seguimiento sin spam",
        content:
          "Programa recordatorios segun etapa e interes. Si no responde, aplica secuencias de seguimiento con limites y mensajes de valor. La calidad del contacto pesa mas que el volumen.",
      },
    ],
    faq: [
      {
        q: "Puedo conectar WhatsApp con mi CRM actual?",
        a: "Si. Lo ideal es integrar para que cada conversacion actualice estado, notas y proxima accion.",
      },
      {
        q: "Que KPI debo priorizar?",
        a: "Tiempo de primera respuesta, tasa de contacto efectivo y conversion a cita o estudio.",
      },
    ],
  },
  {
    slug: "agentes-ia-inmobiliaria-embudo-comercial",
    title: "Agentes IA para inmobiliaria: como ordenar tu embudo comercial",
    description:
      "Implementa agentes IA en inmobiliaria para captar, clasificar y seguir leads con un proceso comercial mas ordenado.",
    date: "2026-02-25",
    readTime: "7 min",
    keyword: "agentes ia inmobiliaria",
    sections: [
      {
        heading: "Define etapas simples y accionables",
        content:
          "Un embudo util no necesita veinte estados. Empieza con etapas claras: nuevo, contactado, calificado, en gestion y cerrado. Cada etapa debe tener una accion definida.",
      },
      {
        heading: "Asigna al asesor correcto automaticamente",
        content:
          "Con reglas por zona, tipo de cliente o nivel de urgencia, el agente IA enruta cada oportunidad al asesor mas adecuado y evita cuellos de botella.",
      },
      {
        heading: "Cierra el ciclo con analitica",
        content:
          "Sin medicion no hay mejora. Monitorea conversion por fuente, tiempo por etapa y motivos de perdida para ajustar mensajes, scripts y automatizaciones.",
      },
    ],
    faq: [
      {
        q: "Necesito cambiar todo mi stack para usar agentes IA?",
        a: "No. Puedes empezar con integraciones graduales sobre herramientas ya existentes.",
      },
      {
        q: "Sirve para equipos pequenos?",
        a: "Si. De hecho el mayor impacto suele verse cuando el equipo necesita priorizar mejor su tiempo.",
      },
    ],
  },
];

export function getPostBySlug(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
