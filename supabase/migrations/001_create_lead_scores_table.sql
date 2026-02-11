-- Tabla para almacenar lead scores y resultados de calculadora hipotecaria
CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  pais TEXT NOT NULL CHECK (pais IN ('colombia', 'espana')),
  
  -- Datos financieros del cálculo
  ingresos_mensuales NUMERIC NOT NULL,
  valor_propiedad NUMERIC NOT NULL,
  cuota_inicial NUMERIC NOT NULL,
  plazo_anios INTEGER NOT NULL,
  tasa_interes NUMERIC NOT NULL,
  dti NUMERIC NOT NULL, -- Debt-to-Income Ratio
  ltv NUMERIC NOT NULL, -- Loan-to-Value Ratio
  cuota_mensual NUMERIC NOT NULL,
  score_bancario INTEGER NOT NULL,
  ingresos_anuales NUMERIC NOT NULL,
  
  -- Datos adicionales del prospecto
  edad INTEGER,
  tipo_vivienda TEXT CHECK (tipo_vivienda IN ('primera', 'segunda', 'inversion')),
  tiene_creditos BOOLEAN DEFAULT NULL,
  
  -- Lead scoring
  lead_score INTEGER NOT NULL CHECK (lead_score >= 0 AND lead_score <= 100),
  categoria TEXT NOT NULL CHECK (categoria IN ('frio', 'templado', 'caliente')),
  accion_recomendada TEXT NOT NULL,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para optimización
  CONSTRAINT unique_lead_email UNIQUE (email, created_at::DATE)
);

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_lead_scores_email ON lead_scores(email);
CREATE INDEX idx_lead_scores_pais ON lead_scores(pais);
CREATE INDEX idx_lead_scores_categoria ON lead_scores(categoria);
CREATE INDEX idx_lead_scores_lead_score ON lead_scores(lead_score);
CREATE INDEX idx_lead_scores_created_at ON lead_scores(created_at);

-- Crear índice compuesto para consultas comunes
CREATE INDEX idx_lead_scores_categoria_score ON lead_scores(categoria, lead_score);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
CREATE TRIGGER update_lead_scores_updated_at 
    BEFORE UPDATE ON lead_scores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Política de seguridad RLS (Row Level Security)
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;

-- Política para permitir lecturas a usuarios autenticados
CREATE POLICY "Leer lead scores" ON lead_scores
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserciones (desde la API)
CREATE POLICY "Insertar lead scores" ON lead_scores
    FOR INSERT WITH CHECK (true);

-- Comentarios para documentación
COMMENT ON TABLE lead_scores IS 'Tabla para almacenar resultados de calculadora hipotecaria y lead scoring';
COMMENT ON COLUMN lead_scores.lead_score IS 'Puntuación del lead (0-100) basada en criterios financieros';
COMMENT ON COLUMN lead_scores.categoria IS 'Categoría del lead: frio (0-40), templado (41-70), caliente (71-100)';
COMMENT ON COLUMN lead_scores.accion_recomendada IS 'Acción recomendada basada en el score del lead';