import { supabase } from "@/app/supabaseClient";

export class AuthRequiredError extends Error {
  code = "AUTH_REQUIRED" as const;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

async function getTokenOnce() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || "";
}

export async function getAccessTokenFresh() {
  let token = await getTokenOnce();
  if (token) return token;

  try {
    await supabase.auth.refreshSession();
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

  // If token expired, refresh and retry once.
  if (res1.status !== 401) return res1;

  try {
    await supabase.auth.refreshSession();
  } catch {
    // ignore
  }
  token = await getAccessTokenFresh();
  if (!token) throw new AuthRequiredError();

  const headers2 = new Headers(init?.headers || {});
  headers2.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...(init || {}), headers: headers2 });
}
