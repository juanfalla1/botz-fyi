-- Hardening no destructivo para concurrencia (30+ usuarios)
-- Solo agrega índices; no cambia lógica ni elimina datos.

DO $$
BEGIN
  -- team_members: búsquedas por tenant/estado
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_team_members_tenant_activo') THEN
    CREATE INDEX idx_team_members_tenant_activo ON team_members(tenant_id, activo);
  END IF;

  -- team_members: resolución por email
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_team_members_email_lower') THEN
    CREATE INDEX idx_team_members_email_lower ON team_members(lower(email));
  END IF;

  -- team_members: resolución por auth_user_id (si existe columna)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'team_members' AND column_name = 'auth_user_id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_team_members_auth_user_id') THEN
      CREATE INDEX idx_team_members_auth_user_id ON team_members(auth_user_id);
    END IF;
  END IF;

  -- team_members: resolución por user_id (si existe columna)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'team_members' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_team_members_user_id') THEN
      CREATE INDEX idx_team_members_user_id ON team_members(user_id);
    END IF;
  END IF;

  -- admin_invites: validación por id y listados recientes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admin_invites_status_created') THEN
    CREATE INDEX idx_admin_invites_status_created ON admin_invites(status, created_at DESC);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admin_invites_email_lower') THEN
    CREATE INDEX idx_admin_invites_email_lower ON admin_invites(lower(email));
  END IF;
END $$;

ANALYZE team_members;
ANALYZE admin_invites;
