-- Idempotency + traceability for WhatsApp processing

CREATE TABLE IF NOT EXISTS incoming_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_message_id TEXT NOT NULL,
  instance_name TEXT NULL,
  from_phone TEXT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  payload JSONB NULL,
  processed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_incoming_messages_provider_message
  ON incoming_messages(provider, provider_message_id);

CREATE INDEX IF NOT EXISTS idx_incoming_messages_created_at
  ON incoming_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS message_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'evolution',
  agent_id UUID NULL,
  owner_id UUID NULL,
  tenant_id UUID NULL,
  phone TEXT NULL,
  message_id TEXT NULL,
  intent TEXT NULL,
  category TEXT NULL,
  product TEXT NULL,
  action TEXT NULL,
  request_payload JSONB NULL,
  response_payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_audit_log_agent_created
  ON message_audit_log(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_audit_log_owner_created
  ON message_audit_log(owner_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_incoming_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_incoming_messages_updated_at ON incoming_messages;
CREATE TRIGGER trg_incoming_messages_updated_at
  BEFORE UPDATE ON incoming_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_incoming_messages_updated_at();
