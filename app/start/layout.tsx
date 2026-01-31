"use client";

import { AuthProvider } from "./MainLayout";

/**
 * ============================================================================
 * ✅ LAYOUT PARA /app/start
 * ============================================================================
 * 
 * Este archivo envuelve toda la página /start con el AuthProvider
 * para que el sistema de suscripciones funcione correctamente.
 * 
 * Sin este archivo, el useAuth() dentro de MainLayout y page.tsx 
 * no tienen acceso al contexto de autenticación.
 * 
 * IMPORTANTE: Coloca este archivo en /app/start/layout.tsx
 * ============================================================================
 */
export default function StartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}