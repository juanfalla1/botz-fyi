import path from "node:path";

export const colombiaChefAgentConfig = {
  internalName: "colombia-chef-sales-bot",
  visibleName: "Asesor IA Colombia Chef",
  maxRecommendations: 3,
  blockedTopics: ["avanza", "ohaus", "balanza", "bascula", "bascula"],
  dataPaths: {
    json: path.join(process.cwd(), "src", "agents", "colombia-chef", "data", "colombiachef_bot_data.json"),
    report: path.join(process.cwd(), "src", "agents", "colombia-chef", "data", "colombiachef_bot_report.md"),
  },
} as const;

export type ColombiaChefAgentConfig = typeof colombiaChefAgentConfig;
