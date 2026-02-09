// lib/services/meta.service.ts

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export class MetaService {
  
  /**
   * Generar URL de OAuth para que el cliente autorice
   */
  getAuthUrl(tenantId: string): string {
    if (!META_APP_ID || !APP_URL) {
      throw new Error('Missing META_APP_ID or NEXT_PUBLIC_APP_URL in env');
    }
    
    const redirectUri = `${APP_URL}/api/whatsapp/meta/callback`;
    
    return (
      `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${META_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=whatsapp_business_messaging,whatsapp_business_management&` +
      `response_type=code&` +
      `state=${tenantId}`
    );
  }
  
  /**
   * Intercambiar código de OAuth por access token
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    if (!META_APP_ID || !META_APP_SECRET || !APP_URL) {
      throw new Error('Missing Meta credentials in env');
    }
    
    const redirectUri = `${APP_URL}/api/whatsapp/meta/callback`;
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${META_APP_ID}&` +
      `client_secret=${META_APP_SECRET}&` +
      `code=${code}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Meta OAuth error: ${error}`);
    }
    
    const data = await response.json();
    return data.access_token;
  }
  
  /**
   * Obtener phone_number_id desde el token
   */
  async getPhoneNumberId(accessToken: string): Promise<string> {
    const response = await fetch(
      'https://graph.facebook.com/v18.0/me?fields=id',
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to get phone number ID from Meta');
    }
    
    const data = await response.json();
    return data.id;
  }
  
  /**
   * Enviar mensaje vía Meta API
   */
  async sendMessage(
    phoneNumberId: string, 
    accessToken: string, 
    toPhone: string, 
    message: string
  ): Promise<any> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toPhone.replace(/\D/g, ''),
          text: { body: message }
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Meta send message error: ${error}`);
    }
    
    return await response.json();
  }
  
  /**
   * Verificar si la conexión sigue activa
   */
  async getStatus(phoneNumberId: string, accessToken: string): Promise<'connected' | 'disconnected'> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      return response.ok ? 'connected' : 'disconnected';
    } catch (error) {
      console.error('Error checking Meta status:', error);
      return 'disconnected';
    }
  }
}

// Exportar instancia única
export const metaService = new MetaService();