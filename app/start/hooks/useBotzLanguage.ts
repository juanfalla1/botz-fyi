"use client";

import { useEffect, useState } from "react";

export type BotzLanguage = "es" | "en";

function isBotzLanguage(value: unknown): value is BotzLanguage {
  return value === "es" || value === "en";
}

export default function useBotzLanguage(defaultLanguage: BotzLanguage = "es") {
  const [language, setLanguage] = useState<BotzLanguage>(defaultLanguage);

  useEffect(() => {
    const saved = localStorage.getItem("botz-language");
    if (isBotzLanguage(saved)) setLanguage(saved);

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (isBotzLanguage(detail)) setLanguage(detail);
    };

    window.addEventListener("botz-language-change", onChange);
    return () => window.removeEventListener("botz-language-change", onChange);
  }, []);

  return language;
}
