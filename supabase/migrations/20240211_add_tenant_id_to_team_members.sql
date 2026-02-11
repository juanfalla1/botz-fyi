-- Add tenant_id column to team_members table
-- This migration adds the tenant_id column to support multi-tenant architecture

-- First, add the column without a NOT NULL constraint
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Add foreign key constraint to reference tenants table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'team_members_tenant_id_fkey'
    ) THEN
        -- Constraint already exists, do nothing
        NULL;
    ELSE
        -- Add the foreign key constraint if tenants table exists
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'tenants'
        ) THEN
            ALTER TABLE team_members 
            ADD CONSTRAINT team_members_tenant_id_fkey 
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_team_members_tenant_id ON team_members(tenant_id);

-- Update existing records to set a default tenant_id if needed
-- This is a fallback - in production, existing records should be properly assigned
UPDATE team_members 
SET tenant_id = (
    SELECT COALESCE(
        (SELECT MIN(id) FROM tenants LIMIT 1),
        '00000000-0000-0000-0000-000000000000'::uuid
    )
)
WHERE tenant_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN team_members.tenant_id IS 'Tenant ID for multi-tenant architecture';