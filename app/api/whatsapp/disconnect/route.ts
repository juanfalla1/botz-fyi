// app/api/whatsapp/disconnect/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { evolutionService } from '../../../../lib/services/evolution.service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenant_id } = body;

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'tenant_id is required' },
        { status: 400 }
      );
    }

    // 1. Buscar conexión actual
    const { data, error: fetchError } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single();

    if (fetchError || !data) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // 2. Desconectar según proveedor
    if (data.provider === 'evolution' && data.instance_name) {
      try {
        await evolutionService.disconnect(data.instance_name);
      } catch (error) {
        console.error('Error disconnecting Evolution instance:', error);
        // Continuar aunque falle (la instancia puede no existir)
      }
    }
    // Meta API no requiere desconexión activa (token se revoca desde Meta Business Manager)

    // 3. Actualizar estado en BD
    const { error: updateError } = await supabase
      .from('whatsapp_connections')
      .update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenant_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp disconnected successfully'
    });

  } catch (error: any) {
    console.error('Error in /api/whatsapp/disconnect:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}