// app/api/whatsapp/status/[tenantId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { evolutionService } from '../../../../../lib/services/evolution.service';
import { metaService } from '../../../../../lib/services/meta.service';
import { assertTenantAccess } from '../../../_utils/guards';
import { getServiceSupabase } from '../../../_utils/supabase';

const supabase = getServiceSupabase();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    if (!supabase) {
      return NextResponse.json({ error: 'Missing SUPABASE env (URL or SERVICE_ROLE)' }, { status: 500 });
    }

    const guard = await assertTenantAccess({ req, requestedTenantId: tenantId });
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

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
