// CAMPAÑA PERSONALIZADA POR CIUDAD
// ===================================

const CAMPAIGN_BY_CITY = {
  "Bogotá": {
    subject: "🏢 Bogotá: ¿Quieres dominar el mercado hipotecario?",
    personalizarHTML: (html, ciudad) => {
      return html.replace(
        "para no perder leads",
        "para dominar Bogotá"
      ).replace(
        "Botz centraliza",
        "Botz Bogotá potencia"
      );
    },
    whatsapp_message: "Hola, soy asesor en Bogotá y manejo [X] leads/mes. ¿Cómo funciona Botz aquí?"
  },
  
  "Medellín": {
    subject: "🌄 Medellín: Transforma tu correduría hoy",
    personalizarHTML: (html, ciudad) => {
      return html.replace(
        "para no perder leads",
        "para liderar Medellín"
      ).replace(
        "Casos reales (España)",
        "Casos reales en Antioquia"
      );
    },
    whatsapp_message: "Hola, opero en Medellín con [X] cerrres/mes. ¿Botz funciona acá?"
  },
  
  "Cali": {
    subject: "🌴 Cali: Aumenta 40% tus ventas hipotecarias",
    personalizarHTML: (html, ciudad) => {
      return html.replace(
        "para no perder leads",
        "para revolucionar el Valle"
      ).replace(
        "implementado en EFITECA",
        "implementado en corredurías caleñas"
      );
    },
    whatsapp_message: "Hola, soy corredor en Cali. ¿Cómo me ayuda Botz?"
  }
};

// Función para personalizar por ciudad
function personalizeByCity(contact, htmlBase) {
  const cityName = extractCityFromWebsite(contact.web);
  const campaign = CAMPAIGN_BY_CITY[cityName] || CAMPAIGN_BY_CITY["Bogotá"];
  
  return {
    ...campaign,
    html: campaign.personalizarHTML(htmlBase, cityName),
    contact: {
      ...contact,
      city: cityName,
      whatsapp_message: campaign.whatsapp_message
    }
  };
}

// En tu n8n, después del nodo "Extract Emails", agrega:
// 1. Extraer ciudad del website
// 2. Personalizar según ciudad detectada
// 3. Usar plantilla específica