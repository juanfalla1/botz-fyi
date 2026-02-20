import { createClient } from "@supabase/supabase-js";

const urlToUse =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL_BOTZ ||
  "";

const keyToUse =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_BOTZ ||
  "";

/**
 * ✅ Cliente principal (login normal)
 * Importante: usamos un storageKey único para que NO se mezcle con Agents.
 */
export const supabase = createClient(urlToUse, keyToUse, {
  auth: {
    storageKey: "sb-botz-main-auth",
    persistSession: true,
    autoRefreshToken: true,
  },
});