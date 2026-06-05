export function hasOpenAiKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function queryOpenAi(prompt: string) {
  void prompt;
  throw new Error("Legacy OpenAI adapter disabled. Use lib/geo/engines/providers/openai.provider.ts");
}
