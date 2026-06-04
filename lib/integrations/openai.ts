export function hasOpenAiKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function queryOpenAi(prompt: string) {
  if (!hasOpenAiKey()) return { demo: true, text: `Demo OpenAI response for: ${prompt}` };
  return { demo: false, text: "OpenAI integration placeholder" };
}
