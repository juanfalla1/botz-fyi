// SCRIPT PARA ENVIAR EMAIL CAMPAIGN DESDE N8N
// ================================================

async function sendEmailCampaign() {
  const WEBHOOK_URL = 'https://n8nio-n8n-latest.onrender.com/webhook/botz-email-campaign';
  
  // Lista de contactos (cargar desde archivo)
  const contacts = [
    {
      email: "contacto@lanueva.com.co",
      name: "Contacto La Nueva",
      type: "corredor"
    },
    // ... más contactos
  ];

  try {
    console.log('🚀 Enviando campaña de email...');
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaign: "botz-demo-launch",
        contacts: contacts,
        batch: {
          size: 10, // Enviar en lotes de 10
          delay: 30000 // 30 segundos entre lotes
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Campaign iniciada:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error enviando campaña:', error);
    throw error;
  }
}

// Para usar en browser o Node.js
if (typeof window !== 'undefined') {
  // Browser
  window.sendEmailCampaign = sendEmailCampaign;
} else {
  // Node.js
  module.exports = { sendEmailCampaign };
}