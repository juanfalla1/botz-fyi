-- Owner-controlled CRM access (integration-style enablement)

CREATE TABLE IF NOT EXISTS agent_crm_access (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_crm_access_enabled ON agent_crm_access(enabled);

CREATE OR REPLACE FUNCTION update_agent_crm_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_crm_access_updated_at ON agent_crm_access;
CREATE TRIGGER trg_agent_crm_access_updated_at
  BEFORE UPDATE ON agent_crm_access
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_crm_access_updated_at();
