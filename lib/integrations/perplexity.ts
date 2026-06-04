export function hasPerplexityKey() {
  return Boolean(process.env.PERPLEXITY_API_KEY);
}

export async function queryPerplexity(prompt: string) {
  if (!hasPerplexityKey()) return { demo: true, text: `Demo Perplexity response for: ${prompt}` };
  return { demo: false, text: "Perplexity integration placeholder" };
}
