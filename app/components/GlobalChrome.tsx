"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Header from "./Header";
import CookieBanner from "./CookieBanner";

export default function GlobalChrome() {
  const pathname = usePathname();
  const isAvanzaCrm = String(pathname || "").startsWith("/avanza-crm");
  const isWidgetRoute = String(pathname || "").startsWith("/widget/");
  const hideGlobalChrome = isAvanzaCrm || isWidgetRoute;

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (hideGlobalChrome) {
      document.body.classList.add("avanza-crm-no-header");
    } else {
      document.body.classList.remove("avanza-crm-no-header");
    }
    return () => {
      document.body.classList.remove("avanza-crm-no-header");
    };
  }, [hideGlobalChrome]);

  if (hideGlobalChrome) return null;
  return (
    <>
      <Header />
      <CookieBanner />
    </>
  );
}
