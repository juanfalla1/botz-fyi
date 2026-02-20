"use client";

import React from "react";
import { supabaseAgents } from "./supabaseAgentsClient";

/**
 * Provider del layout de /start/agents
 * (solo envuelve children; si luego necesitas context, lo metemos aquí)
 */
export function AgentsLayoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

/**
 * Auth helpers SOLO para el módulo de Agents (supabaseAgents)
 * Esto NO toca el login principal si tu supabaseAgentsClient usa storageKey distinto.
 */
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

export async function authedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const token = await getAccessTokenFresh();
  if (!token) throw new AuthRequiredError();

  const headers = new Headers(init?.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) throw new AuthRequiredError();
  return res;
}