-- Fix platform_admins RLS + grants for RPC usage

-- Make platform_admins self-readable (needed for is_platform_admin())
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins read" ON public.platform_admins;
CREATE POLICY "Platform admins read" ON public.platform_admins
FOR SELECT
USING (
  auth_user_id = auth.uid()
);

-- Keep insert/delete locked down: only allow via service role / SQL editor
DROP POLICY IF EXISTS "Platform admins insert" ON public.platform_admins;
CREATE POLICY "Platform admins insert" ON public.platform_admins
FOR INSERT
WITH CHECK (false);

DROP POLICY IF EXISTS "Platform admins delete" ON public.platform_admins;
CREATE POLICY "Platform admins delete" ON public.platform_admins
FOR DELETE
USING (false);

-- Ensure authenticated users can call the RPCs
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(uuid) TO authenticated;
