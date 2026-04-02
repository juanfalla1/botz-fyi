"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Header from "./Header";
import CookieBanner from "./CookieBanner";

export default function GlobalChrome() {
  const pathname = usePathname();
  const isAvanzaCrm = String(pathname || "").startsWith("/avanza-crm");

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isAvanzaCrm) {
      document.body.classList.add("avanza-crm-no-header");
    } else {
      document.body.classList.remove("avanza-crm-no-header");
    }
    return () => {
      document.body.classList.remove("avanza-crm-no-header");
    };
  }, [isAvanzaCrm]);

  if (isAvanzaCrm) return null;
  return (
    <>
      <Header />
      <CookieBanner />
    </>
  );
}
