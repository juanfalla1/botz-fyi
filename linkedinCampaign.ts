// LINKEDIN SALES CAMPAIGN
// ============================

const LINKEDIN_STRATEGY = {
  // 1. CONECTAR CON 200 DECISION MAKERS
  targetProfiles: [
    {
      title: "Director de Transformación Digital",
      companies: ["Bancolombia", "Davivienda", "BBVA Colombia", "Banco de Bogotá"],
      industry: "Banking",
      size: "1000-5000 employees"
    },
    {
      title: "Gerente Comercial", 
      companies: ["RE/MAX", "Coldwell Banker", "Century 21", "La Inmobiliaria"],
      industry: "Real Estate",
      size: "50-500 employees"
    },
    {
      title: "Director de Ventas",
      companies: ["Conconcreto", "Marval", "Punto Azul", "El Morán"],
      industry: "Construction",
      size: "100-1000 employees"
    },
    {
      title: "Ministro de Vivienda",
      companies: ["Gobierno Colombia", "Gobierno España", "UN Hábitat"],
      industry: "Government",
      organization: "Public Sector"
    }
  ],

  // 2. MENSAJES PERSONALIZADOS
  messageTemplates: {
    bancoDigitalDirector: `Hola [NOMBRE],

Vi tu perfil de Director de Transformación Digital en [EMPRESA] y me pareció increíble tu experiencia con proyectos FinTech.

Desarrollamos Botz Fintech, una plataforma hipotecaria white-list con tecnología única:
🏆 Motor multi-país (Colombia+España+5 más)
🔧 Ready para implementar en 4 semanas
📊 Analytics enterprise + scoring avanzado
🔒 Seguridad GDPR + SOX compliance

Algunos bancos ya están evaluando nuestra tecnología para mejorar su experiencia cliente.

¿Tendrías 15 minutos la próxima semana para explorar cómo podría beneficiar a [EMPRESA]?

[Calendar Link]

Saludos cordiales,`,

    corredorGerente: `Hola [NOMBRE],

Vi tu trayectoria en el sector inmobiliario y me pareció muy interesante tu rol en [EMPRESA].

Quería compartirte una herramienta que está ayudando a corredores a aumentar 40% sus conversiones:

🏠 Botz Fintech - Simulador hipotecario para 6 países
✅ Legal compliance Colombia y España  
✅ CRM completo con scoring avanzado
✅ Integración WhatsApp automática
✅ Dashboard analytics en tiempo real

Varios de tus competidores ya lo están usando con excelentes resultados.

Tengo un caso de éxito impresionante que creo te va a interesar.

¿Podemos conversar 15 minutos esta semana?

[Calendar Link]

Atentamente,`,

    constructorDirector: `Hola [NOMBRE],

Vi tus proyectos en [EMPRESA] y me pareció muy interesante la calidad de tus desarrollos.

Una pregunta: ¿Tus clientes a veces abandonan por problemas con financiación?

Con Botz Fintech ellos calculan su hipoteca DENTRO de tu showroom:
🎯 30% más ventas confirmadas
🏆 Experiencia premium para cliente  
📊 Dashboard de leads en tiempo real
🎨 Simulador personalizado con tu marca

Constructoras como Conconcreto y Marval ya están viendo +45% en ventas.

¿Te gustaría ver cómo funcionaría con tus proyectos?

Demo personalizada 15 minutos:
[Calendar Link]

Saludos,`
  },

  // 3. CONTENT STRATEGY (POSTS DIARIOS)
  dailyPosts: [
    {
      day: "Monday",
      content: `🏠 ¿Conoces la diferencia entre VIS y No VIS en Colombia? 🤔

Te lo explico en 30 segundos:
• VIS: ≤135 SMMLV (subsidios + mejores tasas)
• No VIS: >135 SMMLV (más requisitos)

Con Botz Fintech calculamos AMBOS tipos con las tasas reales del mercado.

¿Quieres probarlo? Link en comentarios 👇

#FinTech #Hipotecas #Colombia #Inmuebles`,
      hashtags: ["FinTech", "Hipotecas", "Colombia", "Inmuebles", "RealEstate"]
    },
    {
      day: "Tuesday", 
      content: `🇪🇸 Euríbor + Diferencial = Tu tasa hipotecaria

El Euríbor actual: 3.50%
Diferencial promedio: 1.0%
Tasa final: 4.50%

Pero... ¿sabías que con buen score puedes negociar hasta -0.5%?

Con Botz Fintech te mostramos exactamente tu poder de negociación 💪

Demo gratis en comments 👇

#HipotecasEspaña #Euribor #FinTech #Inmuebles`,
      hashtags: ["HipotecasEspaña", "Euribor", "FinTech", "Inmuebles"]
    }
  ]
};

const AUTOMATION_SCHEDULE = {
  connections: "10/day (Maximum LinkedIn)",
  messages: "20/day",
  posts: "1/day",
  followUps: "5/day",
  timeSlots: [
    "9:00 AM - 11:00 AM",
    "2:00 PM - 4:00 PM", 
    "6:00 PM - 8:00 PM"
  ]
};

export { LINKEDIN_STRATEGY, AUTOMATION_SCHEDULE };