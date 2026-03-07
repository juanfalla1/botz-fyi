import { supabaseAgents } from "./supabaseAgentsClient";

export class AuthRequiredError extends Error {
  code = "AUTH_REQUIRED" as const;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

async function getTokenOnce() {
  const { data } = await supabaseAgents.auth.getSession();
  return data?.session?.access_token || "";
}

async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit, retries = 1) {
  let lastErr: any = null;
  for (let i = 0; i <= retries; i += 1) {
    try {
      return await fetch(input, init);
    } catch (e: any) {
      lastErr = e;
      const isLast = i >= retries;
      if (isLast) break;
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  const msg = String(lastErr?.message || "Failed to fetch");
  throw new Error(`No se pudo conectar con el servidor (${msg}). Revisa conexión, sesión y que el backend esté activo.`);
}

export async function getAccessTokenFresh() {
  let token = await getTokenOnce();
  if (token) return token;

  try {
    await supabaseAgents.auth.refreshSession();
  } catch {
    // ignore
  }

  token = await getTokenOnce();
  return token;
}

export async function authedFetch(input: RequestInfo | URL, init?: RequestInit) {
  let token = await getAccessTokenFresh();
  if (!token) throw new AuthRequiredError();

  const headers = new Headers(init?.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  const res1 = await fetchWithRetry(input, { ...(init || {}), headers }, 1);
  if (res1.status !== 401) return res1;

  // Token might be expired/stale even if present. Refresh and retry once.
  try {
    await supabaseAgents.auth.refreshSession();
  } catch {
    // ignore
  }

  token = await getAccessTokenFresh();
  if (!token) throw new AuthRequiredError();

  const headers2 = new Headers(init?.headers || {});
  headers2.set("Authorization", `Bearer ${token}`);

  const res2 = await fetchWithRetry(input, { ...(init || {}), headers: headers2 }, 1);
  if (res2.status === 401) throw new AuthRequiredError();
  return res2;
}
