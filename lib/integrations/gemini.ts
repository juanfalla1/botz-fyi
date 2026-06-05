export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function queryGemini(prompt: string) {
  void prompt;
  throw new Error("Legacy Gemini adapter disabled. Use lib/geo/engines/providers/gemini.provider.ts");
}
