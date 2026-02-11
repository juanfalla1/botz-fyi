// EMAIL CAMPAIGN - LUNIDO DE VENTAS INMEDIATO
// ================================================

const EMAIL_TEMPLATES = {
  // 1. CORREDORES INMOBILIARIOS
  corredores: {
    subject: "Aumenta 40% tus conversiones hipotecarias 🏠",
    body: `
Estimado [NOMBRE],

¿Sientes que pierdes clientes en el proceso hipotecario?

Botz Fintech te ofrece lo que nadie más tiene:

🏆 SIMULADOR PARA 6 PAÍSES
✅ Colombia: VIS, subsidios, scoring real
✅ España: Euríbor + IRPF + edad máxima  
✅ USA, México, Chile, Perú, Argentina

🎯 LO QUE OBTIENES:
• 40% más conversiones (cálculos exactos)
• 50% menos tiempo en cada lead
• Dashboard completo con analytics
• Integración WhatsApp automática
• CRM con scoring avanzado

💰 INVERSIÓN:
$99/mes (plan estándar)
$299/mes (agencias con 5+ agentes)

🔥 OFERTA ESPECIAL:
Primer mes gratis + onboarding personalizado
Cancela cuando quieras, sin compromiso

✅ CASO DE ÉXITO: "De 15 a 25 cierres mensuales en 60 días"

¿Agendamos 15 minutos para demostración?
[CALENDAR LINK]

Atentamente,
[Tu Nombre]
CEO Botz Fintech
📱 [WhatsApp]
🌐 [Website]
    `,
    targets: [
      "gerencia@correduria.com.co",
      "contacto@inmobiliaria.es",
      "ventas@inmo.com.mx"
    ]
  },

  // 2. BANCOS - WHITE LABEL
  bancos: {
    subject: "Tecnología hipotecaria white-label para [BANCO] 🏦",
    body: `
Estimado Director [APELLIDO],

¿Quieres lanzar tu propio simulador hipotecario sin 2 años de desarrollo?

Botz Fintech ofrece tecnología lista para personalizar:

🚀 SOLUCIÓN WHITE-LABEL COMPLETA:
• Multi-país: 6 países con legal compliance
• Motor de scoring: DTI, LTV, credit scoring
• Dashboard analítico: KPIs en tiempo real
• Integraciones: WhatsApp, email, API banking
• Seguridad enterprise: Encriptación + GDPR

🏆 CLIENTES ACTUALES:
• 10+ corredores usando plataforma
• 5,000+ simulaciones mensuales
• 98% uptime performance

💰 MODELOS DE NEGOCIO:
• Licencia anual: $50k-200k
• Revenue share: 5-15% por conversión
• Custom development: $25k+ proyectos

🎯 ROI ESPERADO:
• Reducción 70% costs vs desarrollo interno
• Lanzamiento en 4 semanas (vs 18 meses)
• Soporte 24/7 y actualizaciones continuas

¿Agendamos 30 minutos con su equipo técnico?
Compartiremos demo + propuesta comercial.

Atentamente,
[Tu Nombre]
CEO Botz Fintech  
📞 +57 300 XXX XXXX
🌐 botz-fyi.com
    `,
    targets: [
      "digitaltransformation@bancolombia.com.co",
      "innovation@davivienda.com", 
      "fintech@bbva.com.co",
      "technology@bancodebogota.com.co"
    ]
  },

  // 3. CONSTRUCTORES INMOBILIARIOS
  constructores: {
    subject: "Simulador hipotecario para tus proyectos 🏗️",
    body: `
Hola [NOMBRE],

¿Tus clientes abandonan por problemas con financiación?

Con Botz Fintech ellos calculan su hipoteca DENTRO de tu showroom:

🏠 BENEFICIOS DIRECTOS:
• 30% más cierres (financiación resuelta)
• Experiencia cliente premium
• Menor dependencia de bancos externos
• Dashboard de leads en tiempo real

🎯 PARA TUS PROYECTOS:
• Simulador personalizado con tus tasas
• Integración con sistema de ventas
• Lead nurturing automatizado
• Reportes de conversión por proyecto

💰 PLANES:
• Constructor Small: $199/mes (hasta 3 proyectos)
• Constructor Pro: $499/mes (proyectos ilimitados)

🔥 CASOS REALES:
• Constructora ABC: +45% ventas en 90 días
• Desarrolladora XYZ: Reducción 60% tiempo venta

¿Quieres ver cómo funciona en tus proyectos?
15 minutos → demo personalizada con tu logo

[CALENDAR LINK]

Saludos,
[Tu Nombre]
Botz Fintech
📱 [WhatsApp para soporte]
    `,
    targets: [
      "ventas@constructora.com.co",
      "marketing@promotorinmobiliaria.es",
      "gerencia@desarrolladora.mx"
    ]
  }
};

// LISTA DE PROSPECTOS COLOMBIA (TOP 100)
const PROSPECTOS_COLOMBIA = {
  corredores: [
    "contacto@lanueva.com.co",
    "gerencia@inmobiliariavillarreal.co", 
    "ventas@casadelainmobiliaria.com.co",
    "info@inmobiliariamad.co",
    "servicios@remaxcolombia.com.co",
    "contacto@coldwellbanker.com.co",
    "ventas@cotemar.com.co",
    "gerencia@metropolitana.com.co",
    "info@invercasas.co",
    "contacto@propiedades.co"
  ],
  bancos: [
    "digitaltransformation@bancolombia.com.co",
    "innovation@davivienda.com",
    "fintech@bbva.com.co",
    "technology@bancodebogota.com.co",
    "partnerships@bancodeoccidente.com.co",
    "innovation@aviatur.com.co",
    "digital@scotiabank.com.co",
    "fintech@popular.com.co"
  ],
  constructores: [
    "ventas@conconcreto.com.co",
    "marketing@marval.com.co",
    "gerencia@puntoazul.com.co",
    "ventas@elmoran.com.co",
    "contacto@civilia.com.co",
    "negocios@proyectosa.com.co",
    "ventas@lanuevaconstructora.com.co",
    "comercial@coninsa.com.co"
  ]
};

// LISTA DE PROSPECTOS ESPAÑA (TOP 50)
const PROSPECTOS_ESPANA = {
  corredores: [
    "info@inmocredit.es",
    "gerencia@hipotecas.es",
    "contacto@tecnocasa.es",
    "ventas@bmcinmobiliaria.es",
    "info@altamirainmuebles.es",
    "contacto@donpiso.es",
    "gerencia@solvia-inmuebles.es"
  ],
  bancos: [
    "digital@santander.es",
    "innovation@bbva.es", 
    "technology@caixabank.es",
    "fintech@sabadell.es",
    "digital@bankinter.es"
  ],
  constructores: [
    "marketing@ ACSA.es",
    "ventas@neinor.com",
    "gerencia@sacyr.com",
    "contacto@grupoacs.com",
    "negocios@fadesa.es"
  ]
};

export { EMAIL_TEMPLATES, PROSPECTOS_COLOMBIA, PROSPECTOS_ESPANA };