"use client";

import React from "react";
import { Tab } from "../types";
import { supabase } from "./supabaseClient";

interface HeaderTabsProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export default function HeaderTabs({ active, onChange }: HeaderTabsProps) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "demo", label: "Demo" },
    { id: "chat", label: "Chat" },
    { id: "propuesta", label: "Propuesta" },
    { id: "crm", label: "CRM" }
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div
      style={{
        borderBottom: "1px solid rgba(230, 237, 243, 0.1)",
        background: "rgba(255, 255, 255, 0.03)"
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        {/* ================= TABS ================= */}
        <div style={{ display: "flex", gap: "8px" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              style={{
                padding: "16px 24px",
                background: "none",
                border: "none",
                color: active === tab.id ? "#58a6ff" : "#8b949e",
                borderBottom:
                  active === tab.id
                    ? "2px solid #58a6ff"
                    : "2px solid transparent",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: active === tab.id ? 600 : 400,
                transition: "all 0.2s ease"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
