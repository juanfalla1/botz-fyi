"use client";

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Deprecated route: keep for backward compatibility.
// Redirect users to the unified app entrypoint under /start.
export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planSelected = searchParams.get("plan");
  const nextPath = searchParams.get("next");

  useEffect(() => {
    if (planSelected) {
      router.replace(`/payment?plan=${encodeURIComponent(planSelected)}`);
      return;
    }

    const next = nextPath && nextPath.startsWith("/") ? nextPath : "/start";
    router.replace(`/start?auth=1&next=${encodeURIComponent(next)}`);
  }, [router, planSelected, nextPath]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
      Redirigiendo...
    </div>
  );
}
