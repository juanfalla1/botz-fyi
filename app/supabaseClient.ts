import { createClient } from "@supabase/supabase-js";

// 1) variables de entorno
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const envKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// 2) fallback (para que no reviente el build)
const supabaseUrl = envUrl || "https://placeholder.supabase.co";
const supabaseKey = envKey || "placeholder-key";

// 3) cliente con manejo de errores de refresh token
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
