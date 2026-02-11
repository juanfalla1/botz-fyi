-- Add auth_user_id column to team_members table
-- This migration connects team_members with Supabase Auth users

-- Add the column
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Create unique index for better performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_auth_user_id ON team_members(auth_user_id);

-- Add foreign key constraint to auth.users
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'team_members_auth_user_id_fkey'
    ) THEN
        -- Constraint already exists, do nothing
        NULL;
    ELSE
        -- Add the foreign key constraint
        ALTER TABLE team_members 
        ADD CONSTRAINT team_members_auth_user_id_fkey 
        FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN team_members.auth_user_id IS 'Reference to Supabase Auth user account';

-- For existing team members without auth_user_id, try to match by email
UPDATE team_members 
SET auth_user_id = (
    SELECT id FROM auth.users WHERE email = team_members.email AND deleted_at IS NULL LIMIT 1
)
WHERE auth_user_id IS NULL AND EXISTS (
    SELECT 1 FROM auth.users WHERE email = team_members.email AND deleted_at IS NULL
);