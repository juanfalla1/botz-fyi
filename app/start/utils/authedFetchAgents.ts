import { supabaseAgents } from "@/app/start/agents/supabaseAgentsClient";

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

  const res1 = await fetch(input, { ...(init || {}), headers });
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

  const res2 = await fetch(input, { ...(init || {}), headers: headers2 });
  if (res2.status === 401) throw new AuthRequiredError();
  return res2;
}
