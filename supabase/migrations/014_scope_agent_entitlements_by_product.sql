-- Migration: Scope entitlements by product to avoid cross-product blocking

ALTER TABLE agent_entitlements
  ADD COLUMN IF NOT EXISTS product_key TEXT NOT NULL DEFAULT 'agents';

UPDATE agent_entitlements
SET product_key = 'agents'
WHERE product_key IS NULL OR btrim(product_key) = '';

-- Move PK from user_id -> (user_id, product_key)
ALTER TABLE agent_entitlements
  DROP CONSTRAINT IF EXISTS agent_entitlements_pkey;

ALTER TABLE agent_entitlements
  ADD CONSTRAINT agent_entitlements_pkey PRIMARY KEY (user_id, product_key);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_entitlements_user_product
  ON agent_entitlements(user_id, product_key);

CREATE INDEX IF NOT EXISTS idx_agent_entitlements_product_key
  ON agent_entitlements(product_key);
