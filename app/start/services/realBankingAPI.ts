// services/realBankingAPI.ts
// INTEGRACIÓN CON APIS BANCARIAS REALES

interface TasaResponse {
  banco: string;
  tipoVivienda: 'VIS' | 'No VIS';
  modalidad: 'Crédito Pesos' | 'Leasing Habitacional' | 'Crédito UVR';
  tasa: number;
  maxLTV: number;
  updatedAt: string;
}

interface ScoreResponse {
  userId: string;
  score: number;
  reportId: string;
  validUntil: string;
  riskLevel: 'Bajo' | 'Medio' | 'Alto';
}

// CACHE CON EXPIRACIÓN DE 6 HORAS
const CACHE_MAP = new Map<string, { data: any; timestamp: number }>();

async function cachedFetch(key: string, fetcher: () => Promise<any>, ttlHours = 6) {
  const cached = CACHE_MAP.get(key);
  const now = Date.now();
  const ttlMs = ttlHours * 60 * 60 * 1000;
  
  if (cached && (now - cached.timestamp) < ttlMs) {
    return cached.data;
  }
  
  const freshData = await fetcher();
  CACHE_MAP.set(key, { data: freshData, timestamp: now });
  return freshData;
}

// BANCOLOMBIA API
export async function getTasasBancolombia(): Promise<TasaResponse[]> {
  return cachedFetch('bancolombia_tasas', async () => {
    // Sandbox environment durante desarrollo
    const response = await fetch('https://api-sandbox.bancolombia.com/v1/mortgages/rates', {
      headers: {
        'Authorization': `Bearer ${process.env.BANCOLOMBIA_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Bancolombia API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return [
      {
        banco: 'Bancolombia',
        tipoVivienda: 'VIS',
        modalidad: 'Crédito Pesos',
        tasa: data.vis.tasa,
        maxLTV: data.vis.max_ltv,
        updatedAt: data.timestamp
      },
      {
        banco: 'Bancolombia', 
        tipoVivienda: 'No VIS',
        modalidad: 'Crédito Pesos',
        tasa: data.no_vis.tasa,
        maxLTV: data.no_vis.max_ltv,
        updatedAt: data.timestamp
      },
      {
        banco: 'Bancolombia',
        tipoVivienda: 'No VIS', 
        modalidad: 'Leasing Habitacional',
        tasa: data.leasing.tasa,
        maxLTV: data.leasing.max_ltv,
        updatedAt: data.timestamp
      }
    ];
  });
}

// DATA CREDIT API
export async function getScoreDatacredito(identificacion: string): Promise<ScoreResponse> {
  return cachedFetch(`datacredito_${identificacion}`, async () => {
    const response = await fetch('https://api.datacredito.com/v1/consult', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DATACREDITO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identificacion,
        tipoConsulta: 'score_completo',
        includeHistorial: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Datacrédito API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      userId: identificacion,
      score: data.score_hcp,
      reportId: data.numero_reporte,
      validUntil: data.fecha_vigencia,
      riskLevel: data.nivel_riesgo
    };
  }, 24); // Cache 24 horas para datos personales
}

// FALLBACK SYSTEM - CUANDO APIS FALLAN
export function getTasasFallback(banco: string): TasaResponse[] {
    const fallbackData: Record<string, TasaResponse[]> = {
    bancolombia: [
      { banco: 'Bancolombia', tipoVivienda: 'VIS', modalidad: 'Crédito Pesos', tasa: 13.2, maxLTV: 0.90, updatedAt: new Date().toISOString() },
      { banco: 'Bancolombia', tipoVivienda: 'No VIS', modalidad: 'Crédito Pesos', tasa: 13.8, maxLTV: 0.70, updatedAt: new Date().toISOString() },
      { banco: 'Bancolombia', tipoVivienda: 'No VIS', modalidad: 'Leasing Habitacional', tasa: 14.1, maxLTV: 0.75, updatedAt: new Date().toISOString() }
    ],
    davivienda: [
      { banco: 'Davivienda', tipoVivienda: 'VIS', modalidad: 'Crédito Pesos', tasa: 13.0, maxLTV: 0.90, updatedAt: new Date().toISOString() },
      { banco: 'Davivienda', tipoVivienda: 'No VIS', modalidad: 'Crédito Pesos', tasa: 13.7, maxLTV: 0.70, updatedAt: new Date().toISOString() }
    ]
  };
  
  return fallbackData[banco.toLowerCase() as keyof typeof fallbackData] || [];
}

// VALIDATION SYSTEM
export function validateTasasResponse(response: TasaResponse[]): boolean {
  return response.every(tasa => 
    tasa.tasa > 0 && tasa.tasa < 30 && // Tasas entre 0% y 30%
    tasa.maxLTV > 0 && tasa.maxLTV <= 1 && // LTV entre 0% y 100%
    tasa.banco && tasa.tipoVivienda && tasa.modalidad
  );
}