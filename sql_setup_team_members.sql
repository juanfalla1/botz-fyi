-- SQL SIMPLE para crear tabla team_members
-- Ejecuta esto en Supabase → SQL Editor

-- 1. Crear la tabla
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefono TEXT,
    rol TEXT NOT NULL DEFAULT 'asesor',
    tenant_id UUID,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Desactivar RLS temporalmente (para que funcione inmediatamente)
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;

-- 3. Agregar campo assigned_to a leads (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE leads ADD COLUMN assigned_to UUID;
    END IF;
END $$;

-- Listo! Ahora prueba crear un asesor
SELECT 'Tabla creada correctamente' as mensaje;