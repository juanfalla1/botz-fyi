import { createClient } from "@supabase/supabase-js";

// 1. Buscamos las variables de entorno
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// 2. Si no existen, usamos valores "falsos" pero válidos como URL para que no explote
const supabaseUrl = envUrl || "https://placeholder.supabase.co";
const supabaseKey = envKey || "placeholder-key";

// 3. Creamos el cliente
export const supabase = createClient(supabaseUrl, supabaseKey);