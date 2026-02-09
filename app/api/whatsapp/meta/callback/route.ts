// app/api/whatsapp/meta/callback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { metaService } from '../../../../../lib/services/meta.service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const tenantId = searchParams.get('state'); // tenant_id viene en 'state'

    if (!code || !tenantId) {
      return NextResponse.redirect(
        `${frontendUrl}/start?whatsapp=error&message=missing_params`
      );
    }

    // 1. Intercambiar código por token
    const accessToken = await metaService.exchangeCodeForToken(code);

    // 2. Obtener phone_number_id
    const phoneNumberId = await metaService.getPhoneNumberId(accessToken);

    // 3. Guardar en base de datos
    const { error } = await supabase
      .from('whatsapp_connections')
      .upsert({
        tenant_id: tenantId,
        provider: 'meta',
        meta_token: accessToken,
        phone_number_id: phoneNumberId,
        status: 'connected',
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tenant_id'
      });

    if (error) {
      console.error('Error saving Meta connection:', error);
      throw error;
    }

    // 4. Redirigir al dashboard con éxito
    return NextResponse.redirect(
      `${frontendUrl}/start?whatsapp=connected`
    );

  } catch (error: any) {
    console.error('Error in Meta OAuth callback:', error);
    return NextResponse.redirect(
      `${frontendUrl}/start?whatsapp=error&message=${encodeURIComponent(error.message)}`
    );
  }
}