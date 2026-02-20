-- Migration: Notetaker persistence for Botz agents

CREATE TABLE IF NOT EXISTS notetaker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL UNIQUE REFERENCES ai_agents(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sales_prompt TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notetaker_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES notetaker_profiles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google' CHECK (provider IN ('google')),
  integration_id UUID,
  calendar_id TEXT NOT NULL,
  calendar_name TEXT,
  calendar_email TEXT,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, calendar_id)
);

CREATE TABLE IF NOT EXISTS notetaker_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES notetaker_profiles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#a3e635',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, name)
);

CREATE TABLE IF NOT EXISTS notetaker_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES notetaker_profiles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'google_calendar')),
  external_id TEXT,
  title TEXT,
  meeting_url TEXT,
  host TEXT,
  starts_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  participants_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'recorded', 'cancelled')),
  folder_id UUID REFERENCES notetaker_folders(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notetaker_meetings_external_per_profile
  ON notetaker_meetings(profile_id, source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notetaker_profiles_created_by ON notetaker_profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_notetaker_calendars_profile ON notetaker_calendars(profile_id);
CREATE INDEX IF NOT EXISTS idx_notetaker_folders_profile ON notetaker_folders(profile_id);
CREATE INDEX IF NOT EXISTS idx_notetaker_meetings_profile ON notetaker_meetings(profile_id);
CREATE INDEX IF NOT EXISTS idx_notetaker_meetings_starts_at ON notetaker_meetings(starts_at);

CREATE OR REPLACE FUNCTION update_notetaker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notetaker_profiles_updated_at ON notetaker_profiles;
CREATE TRIGGER trg_notetaker_profiles_updated_at
  BEFORE UPDATE ON notetaker_profiles
  FOR EACH ROW EXECUTE FUNCTION update_notetaker_updated_at();

DROP TRIGGER IF EXISTS trg_notetaker_calendars_updated_at ON notetaker_calendars;
CREATE TRIGGER trg_notetaker_calendars_updated_at
  BEFORE UPDATE ON notetaker_calendars
  FOR EACH ROW EXECUTE FUNCTION update_notetaker_updated_at();

DROP TRIGGER IF EXISTS trg_notetaker_folders_updated_at ON notetaker_folders;
CREATE TRIGGER trg_notetaker_folders_updated_at
  BEFORE UPDATE ON notetaker_folders
  FOR EACH ROW EXECUTE FUNCTION update_notetaker_updated_at();

DROP TRIGGER IF EXISTS trg_notetaker_meetings_updated_at ON notetaker_meetings;
CREATE TRIGGER trg_notetaker_meetings_updated_at
  BEFORE UPDATE ON notetaker_meetings
  FOR EACH ROW EXECUTE FUNCTION update_notetaker_updated_at();

ALTER TABLE notetaker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notetaker_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE notetaker_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notetaker_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notetaker profiles select own" ON notetaker_profiles
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Notetaker profiles insert own" ON notetaker_profiles
  FOR INSERT WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Notetaker profiles update own" ON notetaker_profiles
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Notetaker calendars all own" ON notetaker_calendars
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Notetaker folders all own" ON notetaker_folders
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Notetaker meetings all own" ON notetaker_meetings
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid())
  );
