-- Allow tenant subscription owner to manage agents/tokens
-- This is needed when the tenant admin user is not present in team_members.

-- bot_agents
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
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.tenant_id = bot_agents.tenant_id
        AND s.status IN ('active','trialing')
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
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.tenant_id = bot_agents.tenant_id
        AND s.status IN ('active','trialing')
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
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.tenant_id = bot_agents.tenant_id
        AND s.status IN ('active','trialing')
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
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.tenant_id = bot_agents.tenant_id
        AND s.status IN ('active','trialing')
    )
  );

-- bot_webhook_tokens
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
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.tenant_id = bot_webhook_tokens.tenant_id
        AND s.status IN ('active','trialing')
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
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.tenant_id = bot_webhook_tokens.tenant_id
        AND s.status IN ('active','trialing')
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
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.tenant_id = bot_webhook_tokens.tenant_id
        AND s.status IN ('active','trialing')
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
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.tenant_id = bot_webhook_tokens.tenant_id
        AND s.status IN ('active','trialing')
    )
  );
