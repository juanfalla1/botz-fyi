export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function queryGemini(prompt: string) {
  if (!hasGeminiKey()) return { demo: true, text: `Demo Gemini response for: ${prompt}` };
  return { demo: false, text: "Gemini integration placeholder" };
}
