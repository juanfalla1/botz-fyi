-- Create admin_invites table for managing platform admin access
CREATE TABLE IF NOT EXISTS admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'developer', -- 'developer', 'guest', 'support'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'revoked'
  access_level TEXT NOT NULL DEFAULT 'full', -- 'full', 'readonly', 'limited'
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  UNIQUE(email)
);

-- Create index for faster lookups
CREATE INDEX idx_admin_invites_email ON admin_invites(email);
CREATE INDEX idx_admin_invites_status ON admin_invites(status);
CREATE INDEX idx_admin_invites_created_by ON admin_invites(created_by);

-- Enable RLS
ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view and manage invites
CREATE POLICY "Platform admins can view all invites" ON admin_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can create invites" ON admin_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can update invites" ON admin_invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can delete invites" ON admin_invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE auth_user_id = auth.uid()
    )
  );
