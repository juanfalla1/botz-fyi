-- Create invite_tokens table to track invitation links
CREATE TABLE IF NOT EXISTS invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID NOT NULL REFERENCES admin_invites(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  used BOOLEAN DEFAULT FALSE,
  metadata JSONB
);

-- Create index for token lookup
CREATE INDEX idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX idx_invite_tokens_email ON invite_tokens(email);
CREATE INDEX idx_invite_tokens_used ON invite_tokens(used);

-- Enable RLS
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow service role and platform admins to view tokens
CREATE POLICY "Service role can manage invite tokens" ON invite_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);
