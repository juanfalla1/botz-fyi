-- Migration: Agent tool entitlements (separate from mortgage plans)

CREATE TABLE IF NOT EXISTS agent_entitlements (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  plan_key TEXT NOT NULL CHECK (plan_key IN ('pro', 'scale', 'prime')),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'blocked')),

  credits_limit INTEGER NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 0,

  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_entitlements_status ON agent_entitlements(status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_agent_entitlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_agent_entitlements_updated_at ON agent_entitlements;
CREATE TRIGGER update_agent_entitlements_updated_at
  BEFORE UPDATE ON agent_entitlements
  FOR EACH ROW EXECUTE FUNCTION update_agent_entitlements_updated_at();

ALTER TABLE agent_entitlements ENABLE ROW LEVEL SECURITY;

-- Users can manage their own entitlement row
CREATE POLICY "Users can view own agent entitlement" ON agent_entitlements
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own agent entitlement" ON agent_entitlements
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own agent entitlement" ON agent_entitlements
  FOR UPDATE USING (user_id = auth.uid());
