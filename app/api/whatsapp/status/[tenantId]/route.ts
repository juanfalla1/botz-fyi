// app/api/whatsapp/status/[tenantId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { evolutionService } from '../../../../../lib/services/evolution.service';
import { metaService } from '../../../../../lib/services/meta.service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

export async function GET(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // 1. Buscar conexión en BD
    const { data, error } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return NextResponse.json({
        connected: false,
        provider: null,
        status: 'not_found'
      });
    }

    let currentStatus = data.status;

    // 2. Verificar estado real según proveedor
    if (data.provider === 'evolution' && data.instance_name) {
      currentStatus = await evolutionService.getStatus(data.instance_name);
      
      // Actualizar en BD si cambió
      if (currentStatus !== data.status) {
        await supabase
          .from('whatsapp_connections')
          .update({
            status: currentStatus,
            ...(currentStatus === 'connected' && !data.connected_at 
              ? { connected_at: new Date().toISOString() } 
              : {}),
            updated_at: new Date().toISOString()
          })
          .eq('tenant_id', tenantId);
      }
      
    } else if (data.provider === 'meta' && data.phone_number_id && data.meta_token) {
      currentStatus = await metaService.getStatus(data.phone_number_id, data.meta_token);
      
      // Actualizar en BD si cambió
      if (currentStatus !== data.status) {
        await supabase
          .from('whatsapp_connections')
          .update({
            status: currentStatus,
            updated_at: new Date().toISOString()
          })
          .eq('tenant_id', tenantId);
      }
    }

    return NextResponse.json({
      connected: currentStatus === 'connected',
      provider: data.provider,
      status: currentStatus,
      connected_at: data.connected_at,
      phone: data.phone
    });

  } catch (error: any) {
    console.error('Error in /api/whatsapp/status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}