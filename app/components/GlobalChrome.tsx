"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import CookieBanner from "./CookieBanner";

export default function GlobalChrome() {
  const pathname = usePathname();
  const isAvanzaCrm = String(pathname || "").startsWith("/avanza-crm");
  if (isAvanzaCrm) return null;
  return (
    <>
      <Header />
      <CookieBanner />
    </>
  );
}
