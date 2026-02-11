// CONFIGURACIÓN AVANZADA - ANTI-SPAM
// ====================================

const CAMPAIGN_CONFIG = {
  // Límites diarios (Gmail Workspace)
  dailyLimit: 500,
  
  // Configuración de lotes
  batch: {
    size: 20,           // Correos por lote
    delay: 60000,       // 1 minuto entre lotes (60,000ms)
    randomDelay: true     // Añade aleatoriedad (+/- 30%)
  },
  
  // Horario de envío (mejor tasa de apertura)
  schedule: {
    startHour: 9,     // 9 AM
    endHour: 18,       // 6 PM
    timezone: "America/Bogota",
    skipWeekends: false // Enviar sábados también
  },
  
  // Personalización
  personalization: {
    useFirstName: true,
    useCity: true,
    useType: true
  }
};

// FUNCIÓN PARA ESPERAR ENTRE LOTES
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// FUNCIÓN PARA VERIFICAR HORARIO ÓPTIMO
function isOptimalTime(timezone = "America/Bogota") {
  const now = new Date();
  const options = { timeZone: timezone, hour: '2-digit', hour12: false };
  const currentHour = parseInt(now.toLocaleString('en-US', options));
  
  return currentHour >= 9 && currentHour <= 18;
}

// PERSONALIZAR EMAIL POR TIPO DE CONTACTO
function personalizeEmail(contact, htmlTemplate) {
  let personalized = htmlTemplate;
  
  // Reemplazar nombre
  if (contact.name && CAMPAIGN_CONFIG.personalization.useFirstName) {
    const firstName = contact.name.split(' ')[0];
    personalized = personalized.replace(
      /Hola(?:\s+\w+)?,?/gi, 
      `Hola ${firstName},`
    );
  }
  
  // Personalizar por tipo (corredor vs banco vs constructor)
  if (contact.type && CAMPAIGN_CONFIG.personalization.useType) {
    let customSection = '';
    
    switch(contact.type) {
      case 'corredor':
        customSection = `<p style="color:#00e1ff; font-weight:bold;">🏠 ESPECIAL PARA CORREDORES</p>`;
        break;
      case 'banco':
        customSection = `<p style="color:#00e1ff; font-weight:bold;">🏦 ESPECIAL PARA BANCOS</p>`;
        break;
      case 'constructor':
        customSection = `<p style="color:#00e1ff; font-weight:bold;">🏗️ ESPECIAL PARA CONSTRUCTORES</p>`;
        break;
    }
    
    // Insertar después del header
    personalized = personalized.replace(
      '</p>\n  </div>',
      '</p>\n  ' + customSection + '\n  </div>'
    );
  }
  
  return personalized;
}

// FUNCIÓN PRINCIPAL DE CAMPAÑA AVANZADA
async function sendAdvancedCampaign(contacts) {
  const results = {
    sent: 0,
    failed: 0,
    skipped: 0,
    details: []
  };
  
  // Validar horario
  if (!isOptimalTime()) {
    console.log('⏰ Horario no óptimo, programando para 9 AM...');
    // Aquí podrías programar para el siguiente horario óptimo
  }
  
  // Dividir en lotes
  for (let i = 0; i < contacts.length; i += CAMPAIGN_CONFIG.batch.size) {
    const batch = contacts.slice(i, i + CAMPAIGN_CONFIG.batch.size);
    
    console.log(`📧 Enviando lote ${Math.floor(i/CAMPAIGN_CONFIG.batch.size) + 1}/${Math.ceil(contacts.length/CAMPAIGN_CONFIG.batch.size)} (${batch.length} correos)`);
    
    for (const contact of batch) {
      try {
        const personalizedHtml = personalizeEmail(contact, HTML_TEMPLATE);
        
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: contact.email,
            subject: SUBJECT_LINE,
            html: personalizedHtml,
            contactId: contact.email
          })
        });
        
        if (response.ok) {
          results.sent++;
          results.details.push({
            email: contact.email,
            status: 'sent',
            timestamp: new Date().toISOString()
          });
        } else {
          results.failed++;
          results.details.push({
            email: contact.email,
            status: 'failed',
            error: response.statusText,
            timestamp: new Date().toISOString()
          });
        }
        
        // Pequeña espera entre correos (más natural)
        await wait(500 + Math.random() * 500);
        
      } catch (error) {
        results.failed++;
        results.details.push({
          email: contact.email,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Esperar entre lotes
    if (i + CAMPAIGN_CONFIG.batch.size < contacts.length) {
      let delay = CAMPAIGN_CONFIG.batch.delay;
      
      if (CAMPAIGN_CONFIG.batch.randomDelay) {
        delay = delay * (0.7 + Math.random() * 0.6); // +/- 30%
      }
      
      console.log(`⏳ Esperando ${Math.round(delay/1000)} segundos antes del siguiente lote...`);
      await wait(delay);
    }
    
    // Verificar límite diario
    if (results.sent >= CAMPAIGN_CONFIG.dailyLimit) {
      console.log(`🚫 Límite diario alcanzado (${CAMPAIGN_CONFIG.dailyLimit} correos)`);
      results.skipped = contacts.length - (i + CAMPAIGN_CONFIG.batch.size);
      break;
    }
  }
  
  return results;
}

module.exports = { 
  sendAdvancedCampaign, 
  CAMPAIGN_CONFIG,
  isOptimalTime 
};