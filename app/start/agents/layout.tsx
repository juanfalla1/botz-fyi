"use client";

import { AgentsLayoutProvider } from "./AgentsLayoutProvider";

/**
 * ============================================================================
 * 🎯 LAYOUT ESPECÍFICO PARA /start/agents/*
 * ============================================================================
 * 
 * Este layout SOLO se aplica a rutas dentro de /start/agents/
 * 
 * Propósito:
 * - Usa AgentsLayoutProvider (minimalista) en lugar del AuthProvider pesado
 * - Evita que la lógica de MainLayout interfiera con el módulo independiente
 * - Elimina el "Safety timeout" de 15 segundos que rompe la autenticación
 * 
 * Cómo funciona:
 * - Next.js aplica PRIMERO este layout (más específico)
 * - Luego aplica /start/layout.tsx (menos específico)
 * - Resultado: AgentsLayoutProvider envuelve el contenido ANTES de que 
 *   AuthProvider de MainLayout lo toque
 * 
 * ============================================================================
 */

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AgentsLayoutProvider>
      {children}
    </AgentsLayoutProvider>
  );
}
