"use client";

import React from "react";
import CookieBanner from "./CookieBanner";
import CookieConsent from "./CookieConsent";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {/* Modal inicial de consentimiento */}
      <CookieConsent />
      {/* Banner recordatorio */}
      <CookieBanner />
    </>
  );
}
