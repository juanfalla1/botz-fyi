"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Header from "./Header";
import CookieBanner from "./CookieBanner";

export default function GlobalChrome() {
  const pathname = usePathname();
  const isAvanzaCrm = String(pathname || "").startsWith("/avanza-crm");
  const isWidgetRoute = String(pathname || "").startsWith("/widget/");
  const isMetrocas =
    String(pathname || "").startsWith("/metrocas") ||
    String(pathname || "").startsWith("/metricas") ||
    String(pathname || "").startsWith("/intelligence");
  const hideGlobalChrome = isAvanzaCrm || isWidgetRoute || isMetrocas;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.remove("avanza-crm-no-header");
    document.body.classList.remove("no-global-header");
    if (isAvanzaCrm) {
      document.body.classList.add("avanza-crm-no-header");
    } else if (hideGlobalChrome) {
      document.body.classList.add("no-global-header");
    } else {
      document.body.classList.remove("avanza-crm-no-header");
      document.body.classList.remove("no-global-header");
    }
    return () => {
      document.body.classList.remove("avanza-crm-no-header");
      document.body.classList.remove("no-global-header");
    };
  }, [hideGlobalChrome, isAvanzaCrm]);

  if (hideGlobalChrome) return null;
  return (
    <>
      <Header />
      <CookieBanner />
    </>
  );
}
