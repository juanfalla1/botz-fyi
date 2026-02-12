-- Support chat: platform admin access

-- Platform admins (application owner / devops)
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read/manage the list
DROP POLICY IF EXISTS "Platform admins read" ON public.platform_admins;
CREATE POLICY "Platform admins read" ON public.platform_admins
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Platform admins insert" ON public.platform_admins;
CREATE POLICY "Platform admins insert" ON public.platform_admins
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Platform admins delete" ON public.platform_admins;
CREATE POLICY "Platform admins delete" ON public.platform_admins
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.auth_user_id = auth.uid())
);

-- Helper: platform admin check
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.auth_user_id = auth.uid()
  );
$$;

-- Extend tenant admin: includes platform admin
CREATE OR REPLACE FUNCTION public.is_tenant_admin(tid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.auth_user_id = auth.uid()
      AND tm.tenant_id = tid
      AND tm.rol = 'admin'
      AND COALESCE(tm.activo, true) = true
  );
$$;

-- Policies: re-create to ensure platform admins can see all tenants

-- Tickets
DROP POLICY IF EXISTS "Support tickets read" ON public.support_tickets;
CREATE POLICY "Support tickets read" ON public.support_tickets
FOR SELECT
USING (
  created_by = auth.uid() OR public.is_tenant_admin(tenant_id)
);

DROP POLICY IF EXISTS "Support tickets create" ON public.support_tickets;
CREATE POLICY "Support tickets create" ON public.support_tickets
FOR INSERT
WITH CHECK (
  created_by = auth.uid() OR public.is_tenant_admin(tenant_id)
);

DROP POLICY IF EXISTS "Support tickets update" ON public.support_tickets;
CREATE POLICY "Support tickets update" ON public.support_tickets
FOR UPDATE
USING (public.is_tenant_admin(tenant_id))
WITH CHECK (public.is_tenant_admin(tenant_id));

-- Messages
DROP POLICY IF EXISTS "Support messages read" ON public.support_messages;
CREATE POLICY "Support messages read" ON public.support_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND (t.created_by = auth.uid() OR public.is_tenant_admin(t.tenant_id))
  )
);

DROP POLICY IF EXISTS "Support messages create" ON public.support_messages;
CREATE POLICY "Support messages create" ON public.support_messages
FOR INSERT
WITH CHECK (
  sender_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND (t.created_by = auth.uid() OR public.is_tenant_admin(t.tenant_id))
  )
);

COMMENT ON TABLE public.platform_admins IS 'Allowlisted platform admins (see all tenants support tickets)';
