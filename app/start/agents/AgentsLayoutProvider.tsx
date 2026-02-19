"use client";

import React, { createContext, useContext, ReactNode } from "react";

/**
 * ============================================================================
 * 🔒 AGENTS LAYOUT PROVIDER
 * ============================================================================
 * 
 * Provider MINIMALISTA para el módulo independiente de Agentes.
 * NO incluye lógica de MainLayout que interfiera con la autenticación.
 * 
 * Propósito: Permitir que el módulo de Agentes tenga su propio contexto
 * sin los timeouts ni overhead de la plataforma principal de Botz.
 * 
 * ============================================================================
 */

interface AgentsContextType {
  dummy?: string;
}

const AgentsContext = createContext<AgentsContextType>({});

export function AgentsLayoutProvider({ children }: { children: ReactNode }) {
  // Este provider es essentially un "pass-through"
  // Solo existe para estructura/consistencia
  return (
    <AgentsContext.Provider value={{}}>
      {children}
    </AgentsContext.Provider>
  );
}

export function useAgentsContext() {
  return useContext(AgentsContext);
}
