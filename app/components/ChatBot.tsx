"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    chatwootSettings?: {
      position: "right";
      type: "standard";
      launcherTitle: string;
    };
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void;
    };
    __botzCrmWidgetLoaded?: boolean;
  }
}

const CHATWOOT_SCRIPT_ID = "botz-crm-chatwoot-sdk";

const ChatBot = () => {
  useEffect(() => {
    if (typeof window === "undefined" || window.__botzCrmWidgetLoaded) return;

    const BASE_URL = "https://crm.botz.fyi";
    window.chatwootSettings = { position: "right", type: "standard", launcherTitle: "" };

    const existingScript = document.getElementById(CHATWOOT_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      window.__botzCrmWidgetLoaded = true;
      return;
    }

    const script = document.createElement("script");
    const firstScript = document.getElementsByTagName("script")[0];

    script.id = CHATWOOT_SCRIPT_ID;
    script.src = `${BASE_URL}/packs/js/sdk.js`;
    script.defer = true;
    script.async = true;

    script.onload = function () {
      window.chatwootSDK?.run({
        websiteToken: "2Y9aAFNsLn4iPMJLDVgpq4sM",
        baseUrl: BASE_URL,
      });
      window.__botzCrmWidgetLoaded = true;
    };

    firstScript.parentNode?.insertBefore(script, firstScript);
  }, []);

  return null;
};

export default ChatBot;
