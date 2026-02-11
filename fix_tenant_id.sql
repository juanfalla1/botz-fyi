-- Agregar campo tenant_id a team_members (si no existe)
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Verificar que todo esté bien
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'team_members';
