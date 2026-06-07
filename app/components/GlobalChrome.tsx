"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Header from "./Header";
import CookieBanner from "./CookieBanner";

export default function GlobalChrome() {
  const pathname = usePathname();
  const isGeoHost = typeof window !== "undefined" && window.location.hostname === "geo.botz.fyi";
  const isAvanzaCrm = String(pathname || "").startsWith("/avanza-crm");
  const isWidgetRoute = String(pathname || "").startsWith("/widget/");
  const isMetrocas =
    String(pathname || "").startsWith("/metrocas") ||
    String(pathname || "").startsWith("/metricas") ||
    String(pathname || "").startsWith("/intelligence");
  const isStartApp = String(pathname || "").startsWith("/start");
  const isGeoEngine = String(pathname || "").startsWith("/geo");
  const hideGlobalChrome = isAvanzaCrm || isWidgetRoute || isMetrocas || isStartApp || isGeoEngine || isGeoHost;

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
