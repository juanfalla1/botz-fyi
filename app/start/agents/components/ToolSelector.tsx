"use client";

import type { CSSProperties } from "react";
import { TOOL_REGISTRY, isRegisteredToolId } from "@/lib/agents/tool-registry";

type ToolSelectorProps = {
  selectedToolIds: string[];
  onChange: (toolIds: string[]) => void;
  language?: "es" | "en";
};

const categoryLabels: Record<string, { es: string; en: string }> = {
  business: { es: "Negocio", en: "Business" },
  documents: { es: "Documentos", en: "Documents" },
  channels: { es: "Canales", en: "Channels" },
  integrations: { es: "Integraciones", en: "Integrations" },
  crm: { es: "CRM", en: "CRM" },
};

export default function ToolSelector({ selectedToolIds, onChange, language = "es" }: ToolSelectorProps) {
  const selected = new Set(selectedToolIds);
  const unknownToolIds = selectedToolIds.filter((id) => !isRegisteredToolId(id));
  const groupedTools = TOOL_REGISTRY.reduce<Record<string, typeof TOOL_REGISTRY[number][]>>((groups, tool) => {
    (groups[tool.category] ||= []).push(tool);
    return groups;
  }, {});

  const toggleTool = (toolId: string, checked: boolean) => {
    const next = checked
      ? [...selectedToolIds, toolId]
      : selectedToolIds.filter((id) => id !== toolId);
    onChange(Array.from(new Set(next)));
  };

  const panel: CSSProperties = {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    backgroundColor: "#111318",
    padding: 14,
  };

  return (
    <section style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, backgroundColor: "#22262d", padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>
        {language === "en" ? "Authorized tools" : "Herramientas autorizadas"}
      </div>
      <div style={{ marginTop: 5, color: "#9ca3af", fontSize: 12, lineHeight: 1.5 }}>
        {language === "en"
          ? "Select which tools this agent may use. Phase 1 stores permissions only; tools are not executed yet."
          : "Selecciona las tools que este agente podra usar. La Fase 1 solo guarda permisos; todavia no ejecuta tools."}
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
        {Object.entries(groupedTools).map(([category, tools]) => (
          <div key={category} style={panel}>
            <div style={{ color: "#6b7280", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
              {categoryLabels[category]?.[language] || category}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {tools.map((tool) => (
                <label key={tool.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={selected.has(tool.id)}
                    onChange={(event) => toggleTool(tool.id, event.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <span>
                    <span style={{ display: "block", color: "#fff", fontSize: 13, fontWeight: 800 }}>{tool.name}</span>
                    <code style={{ display: "block", color: "#a3e635", fontSize: 11, marginTop: 2 }}>{tool.id}</code>
                    <span style={{ display: "block", color: "#9ca3af", fontSize: 12, lineHeight: 1.45, marginTop: 3 }}>{tool.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {unknownToolIds.length > 0 && (
        <div style={{ ...panel, marginTop: 12 }}>
          <div style={{ color: "#fbbf24", fontSize: 12, fontWeight: 900 }}>
            {language === "en" ? "Private or custom tools preserved" : "Tools privadas o custom preservadas"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {unknownToolIds.map((id) => (
              <code key={id} style={{ color: "#fff", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 999, padding: "4px 8px", fontSize: 11 }}>{id}</code>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
