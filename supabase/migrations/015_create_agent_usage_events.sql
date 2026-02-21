-- Migration: granular usage events for agents product

CREATE TABLE IF NOT EXISTS agent_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_key TEXT NOT NULL DEFAULT 'agents',
  endpoint TEXT NOT NULL,
  action TEXT NOT NULL,
  credits_delta INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_usage_events_user_created
  ON agent_usage_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_usage_events_product_created
  ON agent_usage_events(product_key, created_at DESC);

ALTER TABLE agent_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage events" ON agent_usage_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own usage events" ON agent_usage_events
  FOR INSERT WITH CHECK (user_id = auth.uid());
