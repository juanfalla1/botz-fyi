export function hasPerplexityKey() {
  return Boolean(process.env.PERPLEXITY_API_KEY);
}

export async function queryPerplexity(prompt: string) {
  void prompt;
  throw new Error("Legacy Perplexity adapter disabled. Use lib/geo/engines/providers/perplexity.provider.ts");
}
