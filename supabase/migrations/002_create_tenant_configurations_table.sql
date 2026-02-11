-- Estructura para configuración multi-tenant de emails y enlaces
CREATE TABLE IF NOT EXISTS tenant_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  
  -- Configuración SMTP
  smtp_host TEXT DEFAULT 'smtp.zohocloud.ca',
  smtp_port INTEGER DEFAULT 465,
  smtp_user TEXT NOT NULL,
  smtp_password TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  
  -- Configuración de enlaces y branding
  company_name TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  booking_url TEXT NOT NULL DEFAULT 'https://botz.zohobookings.ca/#/botz',
  whatsapp_url TEXT,
  phone TEXT,
  
  -- Configuración delead scoring
  enable_lead_scoring_emails BOOLEAN DEFAULT true,
  custom_email_templates JSONB,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Crear índices
CREATE INDEX idx_tenant_configurations_tenant_id ON tenant_configurations(tenant_id);
CREATE INDEX idx_tenant_configurations_active ON tenant_configurations(is_active);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_tenant_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenant_configurations_updated_at 
    BEFORE UPDATE ON tenant_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_tenant_config_updated_at();

-- Política de seguridad RLS
ALTER TABLE tenant_configurations ENABLE ROW LEVEL SECURITY;

-- Política para lectura (solo tu tenant o admin)
CREATE POLICY "Leer configuración tenant" ON tenant_configurations
    FOR SELECT USING (
        tenant_id = current_setting('app.current_tenant_id', true) 
        OR auth.role() = 'service_role'
    );

-- Política para inserción (solo service_role o el mismo tenant)
CREATE POLICY "Insertar configuración tenant" ON tenant_configurations
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' 
        OR tenant_id = current_setting('app.current_tenant_id', true)
    );

-- Política para actualización (solo service_role o el mismo tenant)
CREATE POLICY "Actualizar configuración tenant" ON tenant_configurations
    FOR UPDATE USING (
        auth.role() = 'service_role' 
        OR tenant_id = current_setting('app.current_tenant_id', true)
    );

-- Comentarios
COMMENT ON TABLE tenant_configurations IS 'Configuración multi-tenant para emails, branding y lead scoring';
COMMENT ON COLUMN tenant_configurations.booking_url IS 'URL de agenda de reuniones del cliente';
COMMENT ON COLUMN tenant_configurations.whatsapp_url IS 'URL de WhatsApp Business del cliente';
COMMENT ON COLUMN tenant_configurations.company_name IS 'Nombre de la empresa del cliente';
COMMENT ON COLUMN tenant_configurations.smtp_user IS 'Usuario SMTP del cliente';
COMMENT ON COLUMN tenant_configurations.custom_email_templates IS 'Plantillas de email personalizadas en formato JSON';