import { getAnonSupabase } from "@/app/api/_utils/supabase";

export function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export async function getRequestUser(req: Request) {
  const token = getBearerToken(req);
  if (!token) return { ok: false as const, token: "", user: null as any, error: "Unauthorized" };

  const anon = getAnonSupabase();
  if (!anon) return { ok: false as const, token, user: null as any, error: "Missing SUPABASE env (URL or ANON)" };

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return { ok: false as const, token, user: null as any, error: "Invalid session" };

  return { ok: true as const, token, user: data.user, error: null as string | null };
}
