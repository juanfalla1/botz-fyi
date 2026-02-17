-- Índices para mejorar rendimiento de queries en la tabla leads
-- Ejecutar en Supabase SQL Editor

-- Verificar si los índices ya existen antes de crearlos
DO $$
BEGIN
  -- Índice en tenant_id (crítico para RLS y filtros por tenant)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_tenant_id') THEN
    CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
  END IF;

  -- Índice en created_at para ordenamiento y filtros de fecha
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_created_at') THEN
    CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
  END IF;

  -- Índice en asesor_id para filtros por asesor
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_asesor_id') THEN
    CREATE INDEX idx_leads_asesor_id ON leads(asesor_id);
  END IF;

  -- Índice en assigned_to para filtros por asignación
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_assigned_to') THEN
    CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
  END IF;

  -- Índice en status para filtros por estado
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_status') THEN
    CREATE INDEX idx_leads_status ON leads(status);
  END IF;

  -- Índice compuesto: tenant_id + created_at (para queries con ORDER BY created_at)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_tenant_created') THEN
    CREATE INDEX idx_leads_tenant_created ON leads(tenant_id, created_at DESC);
  END IF;

  -- Índice compuesto: tenant_id + asesor_id (para filtros de asesor dentro de un tenant)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_tenant_asesor') THEN
    CREATE INDEX idx_leads_tenant_asesor ON leads(tenant_id, asesor_id);
  END IF;

  -- Índice compuesto: tenant_id + assigned_to (para filtros de asignación dentro de un tenant)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_tenant_assigned') THEN
    CREATE INDEX idx_leads_tenant_assigned ON leads(tenant_id, assigned_to);
  END IF;

  -- Índice en user_id
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_user_id') THEN
    CREATE INDEX idx_leads_user_id ON leads(user_id);
  END IF;

END $$;

-- Actualizar estadísticas de la tabla para que el planner use los nuevos índices
ANALYZE leads;
