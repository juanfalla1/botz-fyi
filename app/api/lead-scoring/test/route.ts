import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Test simple de conexión a Supabase
    const { data, error } = await supabase
      .from('lead_scores')
      .select('count(*)')
      .limit(1)

    if (error) {
      return NextResponse.json({
        status: 'error',
        supabase: 'disconnected',
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'success',
      supabase: 'connected',
      message: 'API de lead scoring funcionando correctamente',
      environment: process.env.NODE_ENV
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      supabase: 'unknown',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}