"use client";

import { AuthProvider } from "./MainLayout";

/**
 * ============================================================================
 * ✅ LAYOUT PARA /app/start
 * ============================================================================
 * 
 * Este archivo envuelve toda la página /start con el AuthProvider para
 * que el sistema de suscripciones funcione correctamente.
 * 
 * IMPORTANTE:
 * - Para /start/agents/*, se aplica PRIMERO /start/agents/layout.tsx
 *   que usa AgentsLayoutProvider (más específico)
 * - Luego se aplica este layout con AuthProvider
 * - Resultado: El módulo de Agentes tiene su propio proveedor sin 
 *   la interferencia del timeout de 15s
 * 
 * ============================================================================
 */
export default function StartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}