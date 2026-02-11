// EJECUTAR CAMPAÑA MANUALMENTE
// ====================================

// 1. Ejecutar búsqueda de prospectos
fetch('https://n8nio-n8n-latest.onrender.com/webhook/botz-wh-001', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: "start_search",
    query: "broker hipotecario bogotá colombia",
    maxPages: 3,
    batchSize: 20
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Búsqueda iniciada:', data);
  
  // 2. Después de 30 segundos, enviar emails
  setTimeout(() => {
    fetch('https://n8nio-n8n-latest.onrender.com/webhook/botz-wh-001', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "send_emails",
        campaign: "botz-demo-launch",
        batchSize: 10,
        delaySeconds: 60
      })
    })
    .then(res => res.json())
    .then(emailData => {
      console.log('✅ Emails enviados:', emailData);
    });
  }, 30000); // 30 segundos después
});

// 3. Verificar resultados
setInterval(() => {
  fetch('https://n8nio-n8n-latest.onrender.com/webhook/botz-wh-001', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: "check_status"
    })
  })
  .then(res => res.json())
  .then(status => {
    console.log('📊 Estado actual:', status);
  });
}, 120000); // Cada 2 minutos