import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const urlToUse = supabaseUrl || "https://placeholder.supabase.co";
const keyToUse = supabaseAnonKey || "placeholder-key";

if (!supabaseUrl) console.warn("⚠️ Build Warning: Usando credenciales placeholder.");

export const supabase = createClient(urlToUse, keyToUse);