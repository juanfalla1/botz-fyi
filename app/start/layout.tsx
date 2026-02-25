"use client";

import React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// IMPORTANT: do not import MainLayout/AuthProvider at module scope.
// That module initializes the main Supabase client (with detectSessionInUrl),
// and if it loads on /start/agents OAuth callbacks it can accidentally persist
// the session into the main app storage.
const AuthProvider = dynamic(() => import("./MainLayout").then((m) => m.AuthProvider), {
  ssr: false,
});

export default function StartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const scaledContent = <>{children}</>;

  // ✅ EXCEPCIÓN: /start/agents usa su propio login/sesión y NO debe pasar por el AuthProvider de hipotecas
  if (pathname?.startsWith("/start/agents")) {
    return <>{scaledContent}</>;
  }

  // ✅ Todo lo demás (hipoteca, CRM, etc.) queda igual
  return <AuthProvider>{scaledContent}</AuthProvider>;
}
