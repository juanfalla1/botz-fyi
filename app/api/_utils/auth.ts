import { getAnonSupabase } from "@/app/api/_utils/supabase";

export function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

function parseCookieHeader(req: Request) {
  const raw = req.headers.get("cookie") || "";
  const map: Record<string, string> = {};
  raw.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx <= 0) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!key) return;
    map[key] = val;
  });
  return map;
}

function tokenFromCookieValue(rawValue: string) {
  const val = decodeURIComponent(String(rawValue || "").trim());
  if (!val) return "";

  if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(val)) {
    return val;
  }

  try {
    const parsed = JSON.parse(val);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.access_token === "string" && parsed.access_token) return parsed.access_token;
      if (typeof parsed?.currentSession?.access_token === "string" && parsed.currentSession.access_token) {
        return parsed.currentSession.access_token;
      }
    }
    if (Array.isArray(parsed) && typeof parsed[0] === "string" && parsed[0]) {
      return parsed[0];
    }
  } catch {
    // no-op
  }

  return "";
}

function getCookieAccessToken(req: Request) {
  const cookies = parseCookieHeader(req);
  const keys = Object.keys(cookies);

  const chunked: Record<string, Array<{ idx: number; value: string }>> = {};
  keys.forEach((k) => {
    const m = k.match(/^(.*auth-token)(?:\.(\d+))?$/);
    if (!m) return;
    const base = m[1];
    const idx = m[2] ? Number(m[2]) : 0;
    if (!chunked[base]) chunked[base] = [];
    chunked[base].push({ idx, value: cookies[k] || "" });
  });

  const bases = Object.keys(chunked);
  if (!bases.length) return "";

  for (const base of bases) {
    const parts = chunked[base].sort((a, b) => a.idx - b.idx);
    const combined = parts.map((p) => p.value).join("");
    const token = tokenFromCookieValue(combined);
    if (token) return token;
  }

  return "";
}

export async function getRequestUser(req: Request) {
  const token = getBearerToken(req) || getCookieAccessToken(req);
  if (!token) return { ok: false as const, token: "", user: null as any, error: "Unauthorized" };

  const anon = getAnonSupabase();
  if (!anon) return { ok: false as const, token, user: null as any, error: "Missing SUPABASE env (URL or ANON)" };

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return { ok: false as const, token, user: null as any, error: "Invalid session" };

  return { ok: true as const, token, user: data.user, error: null as string | null };
}
