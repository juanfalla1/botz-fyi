// WHATSAPP MESSAGING CAMPAIGN
// ==================================

const WHATSAPP_MESSAGES = {
  corredores: {
    template: `🏠 *¿Quieres vender más hipotecas?*

Botz Fintech - El único simulador para 6 países
🇨🇴 Colombia: VIS + subsidios
🇪🇸 España: Euríbor + IRPF  
🇺🇸 USA + Latam completo

💰 *RESULTADOS REALES:*
• 40% MÁS conversiones ✅
• 50% MENOS tiempo en cada lead ✅  
• CRM completo incluido ✅
• Dashboard analytics en tiempo real ✅

🔥 *OFERTA ESPECIAL:*
Primer mes GRATIS 🎁
Cancela cuando quieras

📆 *Agenda tu demo 15 min:*
[Calendar Link]

📞 *Escribenos ahora:*
[Tu WhatsApp]

🌐 *Website:* botz-fyi.com`,

    targets: [
      "573001234567",  // Reemplazar con números reales
      "573002345678",
      "573003456789"
      // Agregar 50+ números de corredores
    ]
  },

  constructores: {
    template: `🏗️ *¿Tus clientes pierden por financiación?*

¡No más! Con Botz Fintech ellos calculan su hipoteca DENTRO de tu showroom:

🎯 *VENTAJAS DIRECTAS:*
• 30% MÁS ventas confirmadas
• Experiencia premium para cliente  
• Simulador con tu branding
• Leads cualificados automáticamente

💼 *PLANES CONSTRUCTORES:*
• Small: $199/mes (hasta 3 proyectos)
• Pro: $499/mes (proyectos ilimitados)

🏆 *CASOS REALES:*
Constructora ABC: +45% ventas en 90 días

📅 *Demo 15 min GRATIS:*
[Calendar Link]

📞 *Whatsapp directo:*
[Tu WhatsApp]

🌐 botz-fyi.com/constructores`,

    targets: [
      "573001111111",
      "573002222222" 
      // Agregar 30+ números de constructores
    ]
  }
};

const SCHEDULE_STRATEGY = {
  day1: "10:00 AM - Corredores masivo",
  day1Afternoon: "2:00 PM - Seguimiento interesados", 
  day2: "10:00 AM - Constructores",
  day2Afternoon: "2:00 PM - Bancos (leads calificados)",
  day3: "10:00 AM - Follow-up corredores",
  day3Afternoon: "2:00 PM - Cierre constructores",
  day4: "10:00 AM - Ofertas especiales",
  day5: "10:00 AM - Último día oferta"
};

export { WHATSAPP_MESSAGES, SCHEDULE_STRATEGY };