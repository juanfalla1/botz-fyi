import { createClient } from "@supabase/supabase-js";

// Usamos las variables o cadenas vacías para que NO falle el build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

// Si no hay URL, usamos una falsa para que Vercel termine de construir sin error
const urlToUse = supabaseUrl || "https://placeholder.supabase.co";
const keyToUse = supabaseAnonKey || "placeholder-key";

if (!supabaseUrl) {
  console.warn("⚠️ Advertencia: Construyendo sin variables de Supabase.");
}

export const supabase = createClient(urlToUse, keyToUse);