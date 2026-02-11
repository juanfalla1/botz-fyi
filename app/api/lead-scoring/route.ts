import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configuración con timeouts para evitar AbortError
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    global: {
      headers: { 'Connection': 'keep-alive' }
    }
  }
)

interface LeadScoreData {
  nombre: string
  email: string
  telefono?: string
  pais: 'colombia' | 'espana'
  ingresos_mensuales: number
  valor_propiedad: number
  cuota_inicial: number
  plazo_anios: number
  tasa_interes: number
  dti: number
  ltv: number
  cuota_mensual: number
  score_bancario: number
  ingresos_anuales: number
  edad?: number
  tipo_vivienda?: string
  tiene_creditos?: boolean
}

function calcularLeadScore(data: LeadScoreData): number {
  let score = 0
  
  // DTI (Debt-to-Income Ratio)
  if (data.dti < 20) score += 30
  else if (data.dti < 30) score += 20
  else if (data.dti < 40) score += 10
  else if (data.dti < 50) score += 5
  
  // LTV (Loan-to-Value Ratio)
  if (data.ltv < 60) score += 25
  else if (data.ltv < 70) score += 20
  else if (data.ltv < 80) score += 15
  else if (data.ltv < 90) score += 10
  
  // Score Bancario
  if (data.score_bancario >= 750) score += 25
  else if (data.score_bancario >= 700) score += 20
  else if (data.score_bancario >= 650) score += 15
  else if (data.score_bancario >= 600) score += 10
  else if (data.score_bancario >= 550) score += 5
  
  // Ingresos Anuales
  if (data.ingresos_anuales >= 60000000) score += 20 // $60M+ COP
  else if (data.ingresos_anuales >= 36000000) score += 15 // $36M+ COP
  else if (data.ingresos_anuales >= 24000000) score += 10 // $24M+ COP
  else if (data.ingresos_anuales >= 18000000) score += 5 // $18M+ COP
  
  // Cuota Inicial (Más alta = mejor)
  if (data.cuota_inicial >= data.valor_propiedad * 0.4) score += 15
  else if (data.cuota_inicial >= data.valor_propiedad * 0.3) score += 10
  else if (data.cuota_inicial >= data.valor_propiedad * 0.2) score += 5
  
  // Edad (Rango óptimo 25-45)
  if (data.edad && data.edad >= 25 && data.edad <= 45) score += 10
  else if (data.edad && data.edad >= 22 && data.edad <= 55) score += 5
  
  // Estabilidad Laboral (Asumimos que tiene ingresos estables)
  score += 5
  
  // Tipo de Vivienda (Primera vivienda es mejor señal)
  if (data.tipo_vivienda === 'primera') score += 10
  else if (data.tipo_vivienda === 'segunda') score += 5
  
  // Sin otros créditos (Mejor capacidad de pago)
  if (data.tiene_creditos === false) score += 10
  else if (data.tiene_creditos === true) score -= 5
  
  return Math.max(0, Math.min(100, score))
}

function getLeadCategory(score: number): 'frio' | 'templado' | 'caliente' {
  if (score <= 40) return 'frio'
  if (score <= 70) return 'templado'
  return 'caliente'
}

function getRecommendedAction(score: number, data: LeadScoreData): string {
  const category = getLeadCategory(score)
  
  if (category === 'caliente') {
    return 'LLAMADA INMEDIATA + Oferta especial de tasa preferencial'
  } else if (category === 'templado') {
    return 'Email personalizado + Seguimiento WhatsApp en 24h'
  } else {
    return 'Email informativo semanal + Guía de compra de vivienda'
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: LeadScoreData = await request.json()
    
    // Validar datos requeridos
    if (!data.nombre || !data.email || !data.pais) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, email, pais' },
        { status: 400 }
      )
    }
    
    // Calcular lead score
    const score = calcularLeadScore(data)
    const categoria = getLeadCategory(score)
    const accion_recomendada = getRecommendedAction(score, data)
    
    // Guardar en tabla leads existente usando campos que ya existen
    const leadData = {
      name: data.nombre,
      email: data.email,
      phone: data.telefono || null,
      // Campos existentes para datos hipotecarios
      precio_inmueble_eur: data.valor_propiedad,
      aportacion_eur: data.cuota_inicial,
      ingresos_total_eur: data.ingresos_mensuales,
      edad: data.edad || null,
      ltv: data.ltv,
      dti: data.dti,
      cuota_estimada: data.cuota_mensual,
      score: score, // Campo score ya existe
      plazo_anos: data.plazo_anios,
      tasa_interes: data.tasa_interes,
      // Campos adicionales para lead scoring
      status: "SCORE_CALCULADO",
      calificacion: categoria.toUpperCase(), // FRIO/TEMPLADO/CALIENTE
      next_action: accion_recomendada,
      origen: "Calculadora Hipoteca Botz"
    };

    const { data: savedLead, error } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
    
    if (error) {
      console.error('Error guardando lead score:', error)
      
      // Fallback: devolver resultado sin guardar en BD si hay problema de conexión
      return NextResponse.json({
        success: true,
        lead_score: score,
        categoria: categoria,
        accion_recomendada: accion_recomendada,
        fallback_mode: true,
        message: `Error guardando: ${error.message}`,
        lead_data: {
          nombre: data.nombre,
          email: data.email,
          pais: data.pais,
          score: score,
          categoria: categoria
        }
      })
    }
    
    // ✅ EMAIL AUTOMÁTICO PERSONALIZADO (Sistema Multi-Tenant)
    try {
      // Obtener configuración del tenant (por ahora usa tenant_id default)
      // En producción, esto vendría del contexto del usuario logueado
      const tenantId = savedLead[0]?.tenant_id || "0811c118-5a2f-40cb-907e-8979e0984096"; // Tu tenant_id actual
      
      // Obtener configuración completa del tenant (SMTP + branding + enlaces)
      const { data: tenantConfig, error: tenantError } = await supabase
        .from('tenant_configurations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single();

      let tenantConfigToSend = null;
      if (!tenantError && tenantConfig) {
        tenantConfigToSend = {
          smtp_user: tenantConfig.smtp_user,
          smtp_password: tenantConfig.smtp_password,
          smtp_host: tenantConfig.smtp_host,
          smtp_port: tenantConfig.smtp_port,
          from_name: tenantConfig.from_name,
          from_email: tenantConfig.from_email,
          // Nuevos campos para branding y enlaces
          company_name: tenantConfig.company_name,
          website: tenantConfig.website,
          logo_url: tenantConfig.logo_url,
          booking_url: tenantConfig.booking_url,
          whatsapp_url: tenantConfig.whatsapp_url,
          phone: tenantConfig.phone
        };
      } else {
        // Fallback: usar configuración por defecto del .env.local si no existe configuración del tenant
        console.warn('⚠️ No hay configuración para tenant, usando defaults');
        tenantConfigToSend = {
          smtp_user: process.env.ZOHO_USER,
          smtp_password: process.env.ZOHO_APP_PASSWORD,
          smtp_host: process.env.ZOHO_HOST,
          smtp_port: Number(process.env.ZOHO_PORT),
          from_name: "Botz Fintech",
          from_email: process.env.ZOHO_USER,
          company_name: "Botz Fintech",
          website: "https://botz.fyi",
          logo_url: null,
          booking_url: process.env.ONBOARDING_URL || "https://botz.zohobookings.ca/#/botz",
          whatsapp_url: null,
          phone: null
        };
      }

      // Enviar email usando el sistema multi-tenant existente
      const emailData = {
        type: "lead_scoring",
        nombre: data.nombre,
        email: data.email,
        score: score,
        categoria: categoria,
        accion_recomendada: accion_recomendada,
        tenant_config: tenantConfigToSend
      };

      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      });

      if (emailResponse.ok) {
        console.log('✅ Email de lead scoring enviado exitosamente');
      } else {
        console.error('❌ Error enviando email de lead scoring:', await emailResponse.text());
      }

    } catch (emailError) {
      console.error('❌ Error en proceso de email:', emailError);
    }

    console.log('✅ Lead guardado exitosamente en CRM:', {
      id: savedLead[0]?.id,
      email: data.email,
      score: score,
      categoria: categoria
    });
    
    return NextResponse.json({
      success: true,
      lead_score: score,
      categoria: categoria,
      accion_recomendada: accion_recomendada,
      lead_data: savedLead[0]
    })
    
  } catch (error) {
    console.error('Error en endpoint lead scoring:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}