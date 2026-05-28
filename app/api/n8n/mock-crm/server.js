const express = require('express');

const app = express();
app.use(express.json());

const now = () => new Date().toISOString();
const events = [];

function pushEvent(type, payload) {
  events.push({
    at: now(),
    type,
    payload,
  });
}

const fakeContext = (contactId = 'ghl_abc123') => ({
  contact_id: contactId,
  conversation_id: `conv_${contactId}`,
  channel: 'WhatsApp',
  first_name: 'Maria',
  assigned_user_name: 'Alejandra',
  tags: ['bg-lead-nuevo', 'bg-arquetipo-generico'],
  archetype_detected: 'generico',
  archetype_confirmed: false,
  lead_frio_at: null,
  last_reactivation_at: null,
  intent_agenda: false,
  custom_fields: {
    objetivo_del_paciente: 'Bajar 8kg antes de vacaciones',
    modalidad_de_interes: 'Virtual',
    principal_objecion: null,
  },
  recent_messages: [
    { role: 'user', content: 'Hola, me regalas info?', timestamp: now() },
    { role: 'vita', content: 'Hola Maria, claro. Cuentame un poco mas.', timestamp: now() },
  ],
});

const makeLead = (id, archetype, messageNumber = 1) => ({
  contact_id: `ghl_${id}`,
  conversation_id: `conv_${id}`,
  channel: 'WhatsApp',
  first_name: 'Maria',
  assigned_user_name: 'Alejandra',
  tags: ['bg-lead-nuevo', `bg-arquetipo-${archetype}`],
  archetype_detected: archetype,
  archetype_confirmed: archetype !== 'generico',
  lead_frio_at: null,
  last_reactivation_at: null,
  intent_agenda: false,
  message_number: messageNumber,
  custom_fields: {
    objetivo_del_paciente: 'Bajar peso sosteniblemente',
    modalidad_de_interes: 'Virtual',
    principal_objecion: null,
  },
  recent_messages: [
    { role: 'user', content: 'Quiero bajar de peso', timestamp: now() },
    { role: 'vita', content: 'Claro, te explico como funciona la valoracion.', timestamp: now() },
  ],
  nurturing_messages_sent: messageNumber > 1 ? ['M1'] : [],
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'vita-crm-mock' });
});

app.get('/__debug/events', (_req, res) => {
  res.json({ count: events.length, events });
});

app.post('/__debug/reset', (_req, res) => {
  events.length = 0;
  res.json({ ok: true });
});

app.get('/api/contacts/:contact_id/context', (req, res) => {
  pushEvent('context_requested', { contact_id: req.params.contact_id });
  res.json(fakeContext(req.params.contact_id));
});

app.post('/api/contacts/:contact_id/messages', (req, res) => {
  const idempotencyKey = req.header('Idempotency-Key');
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Missing Idempotency-Key header' });
  }
  pushEvent('message_sent', {
    contact_id: req.params.contact_id,
    idempotency_key: idempotencyKey,
    body: req.body,
  });
  return res.status(200).json({
    success: true,
    contact_id: req.params.contact_id,
    idempotency_key: idempotencyKey,
    received: req.body,
    sent_at: now(),
  });
});

app.post('/api/contacts/:contact_id/tags', (req, res) => {
  pushEvent('tag_added', {
    contact_id: req.params.contact_id,
    tag: req.body && req.body.tag ? req.body.tag : null,
  });
  res.json({
    success: true,
    contact_id: req.params.contact_id,
    action: 'tag_added',
    tag: req.body && req.body.tag ? req.body.tag : null,
  });
});

app.patch('/api/contacts/:contact_id/fields', (req, res) => {
  pushEvent('fields_patched', {
    contact_id: req.params.contact_id,
    body: req.body,
  });
  res.json({
    success: true,
    contact_id: req.params.contact_id,
    patched_fields: req.body,
    updated_at: now(),
  });
});

app.post('/api/contacts/:contact_id/mark-cold', (req, res) => {
  pushEvent('mark_cold', { contact_id: req.params.contact_id });
  res.json({
    success: true,
    contact_id: req.params.contact_id,
    tags_added: ['bg-lead-frio'],
    tags_removed: ['bg-lead-nuevo'],
    lead_frio_at: now(),
    conversation_stage: 'lead_frio',
    waiting_for_response: false,
  });
});

app.post('/api/contacts/:contact_id/mark-reactivated', (req, res) => {
  pushEvent('mark_reactivated', { contact_id: req.params.contact_id });
  res.json({
    success: true,
    contact_id: req.params.contact_id,
    tags_added: ['bg-lead-nuevo'],
    tags_removed: ['bg-lead-frio'],
    reactivation_message_count: 0,
    nurturing_message_count: 0,
    updated_at: now(),
  });
});

app.get('/api/eligibility/inactivity', (req, res) => {
  const cadence = req.query.cadence;
  if (!['24h', '48h', '72h'].includes(cadence)) {
    return res.status(400).json({ error: 'cadence must be 24h|48h|72h' });
  }
  const messageNumber = cadence === '24h' ? 1 : cadence === '48h' ? 2 : 3;
  pushEvent('eligibility_inactivity_requested', { cadence });
  res.json({
    data: [
      makeLead(`inact_${cadence}_1`, 'generico', messageNumber),
      makeLead(`inact_${cadence}_2`, 'urgente_radical', messageNumber),
    ],
  });
});

app.get('/api/eligibility/inactivity/cold-transition', (_req, res) => {
  pushEvent('eligibility_cold_transition_requested', {});
  res.json({
    data: [
      {
        ...makeLead('cold_transition_1', 'frustrada_cronica', 3),
        action: 'cold',
      },
    ],
  });
});

app.get('/api/eligibility/reactivated-replied', (_req, res) => {
  pushEvent('eligibility_reactivated_replied_requested', {});
  res.json({
    data: [
      {
        contact_id: 'ghl_replied_1',
        conversation_id: 'conv_replied_1',
        channel: 'WhatsApp',
      },
    ],
  });
});

app.get('/api/eligibility/reactivation', (req, res) => {
  const cadence = req.query.cadence;
  if (!['60d', '65d', '70d'].includes(cadence)) {
    return res.status(400).json({ error: 'cadence must be 60d|65d|70d' });
  }
  const messageNumber = cadence === '60d' ? 1 : cadence === '65d' ? 2 : 3;
  pushEvent('eligibility_reactivation_requested', { cadence });
  res.json({
    data: [
      makeLead(`react_${cadence}_1`, 'determinada_intermitente', messageNumber),
      makeLead(`react_${cadence}_2`, 'frustrada_cronica', messageNumber),
    ],
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`vita-crm-mock listening on ${port}`);
});
