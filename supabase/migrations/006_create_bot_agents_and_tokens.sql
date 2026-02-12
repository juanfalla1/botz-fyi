-- Bot agents + webhook tokens (multi-tenant)

CREATE TABLE IF NOT EXISTS public.bot_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'webchat', 'form')),
  language TEXT NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
  system_prompt TEXT NOT NULL,
  config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_agents_tenant_id ON public.bot_agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bot_agents_active ON public.bot_agents(is_active);

CREATE OR REPLACE FUNCTION public.update_bot_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bot_agents_updated_at ON public.bot_agents;
CREATE TRIGGER update_bot_agents_updated_at
  BEFORE UPDATE ON public.bot_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_bot_agents_updated_at();

CREATE TABLE IF NOT EXISTS public.bot_webhook_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES public.bot_agents(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_webhook_tokens_tenant_id ON public.bot_webhook_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bot_webhook_tokens_agent_id ON public.bot_webhook_tokens(agent_id);
CREATE INDEX IF NOT EXISTS idx_bot_webhook_tokens_active ON public.bot_webhook_tokens(is_active);

ALTER TABLE public.bot_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_webhook_tokens ENABLE ROW LEVEL SECURITY;

-- Admin / platform-admin access policies
-- NOTE: relies on public.team_members(auth_user_id, tenant_id, role) and public.platform_admins(auth_user_id)

DROP POLICY IF EXISTS "bot_agents_select" ON public.bot_agents;
CREATE POLICY "bot_agents_select" ON public.bot_agents
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.auth_user_id = auth.uid()
        AND tm.tenant_id = bot_agents.tenant_id
        AND lower(tm.rol) IN ('admin','owner','super_admin','platform_admin')
    )
  );

DROP POLICY IF EXISTS "bot_agents_insert" ON public.bot_agents;
CREATE POLICY "bot_agents_insert" ON public.bot_agents
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.auth_user_id = auth.uid()
        AND tm.tenant_id = bot_agents.tenant_id
        AND lower(tm.rol) IN ('admin','owner')
    )
  );

DROP POLICY IF EXISTS "bot_agents_update" ON public.bot_agents;
CREATE POLICY "bot_agents_update" ON public.bot_agents
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.auth_user_id = auth.uid()
        AND tm.tenant_id = bot_agents.tenant_id
        AND lower(tm.rol) IN ('admin','owner')
    )
  );

DROP POLICY IF EXISTS "bot_agents_delete" ON public.bot_agents;
CREATE POLICY "bot_agents_delete" ON public.bot_agents
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.auth_user_id = auth.uid()
        AND tm.tenant_id = bot_agents.tenant_id
        AND lower(tm.rol) IN ('admin','owner')
    )
  );

DROP POLICY IF EXISTS "bot_tokens_select" ON public.bot_webhook_tokens;
CREATE POLICY "bot_tokens_select" ON public.bot_webhook_tokens
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.auth_user_id = auth.uid()
        AND tm.tenant_id = bot_webhook_tokens.tenant_id
        AND lower(tm.rol) IN ('admin','owner','super_admin','platform_admin')
    )
  );

DROP POLICY IF EXISTS "bot_tokens_insert" ON public.bot_webhook_tokens;
CREATE POLICY "bot_tokens_insert" ON public.bot_webhook_tokens
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.auth_user_id = auth.uid()
        AND tm.tenant_id = bot_webhook_tokens.tenant_id
        AND lower(tm.rol) IN ('admin','owner')
    )
  );

DROP POLICY IF EXISTS "bot_tokens_update" ON public.bot_webhook_tokens;
CREATE POLICY "bot_tokens_update" ON public.bot_webhook_tokens
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.auth_user_id = auth.uid()
        AND tm.tenant_id = bot_webhook_tokens.tenant_id
        AND lower(tm.rol) IN ('admin','owner')
    )
  );

DROP POLICY IF EXISTS "bot_tokens_delete" ON public.bot_webhook_tokens;
CREATE POLICY "bot_tokens_delete" ON public.bot_webhook_tokens
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.auth_user_id = auth.uid()
        AND tm.tenant_id = bot_webhook_tokens.tenant_id
        AND lower(tm.rol) IN ('admin','owner')
    )
  );

COMMENT ON TABLE public.bot_agents IS 'Agent configurations per tenant/channel.';
COMMENT ON TABLE public.bot_webhook_tokens IS 'Per-tenant inbound webhook tokens mapped to an agent.';
