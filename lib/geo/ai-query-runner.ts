import { queryGemini } from "../integrations/gemini";
import { queryOpenAi } from "../integrations/openai";
import { queryPerplexity } from "../integrations/perplexity";

export async function runAiQueries(prompts: string[], engines: Array<"openai" | "gemini" | "perplexity">) {
  const limitedPrompts = prompts.slice(0, 10);
  const results: Array<{ engine: string; prompt: string; text: string }> = [];
  for (const engine of engines.slice(0, 3)) {
    for (const prompt of limitedPrompts) {
      const res =
        engine === "openai"
          ? await queryOpenAi(prompt)
          : engine === "gemini"
            ? await queryGemini(prompt)
            : await queryPerplexity(prompt);
      results.push({ engine, prompt, text: res.text });
    }
  }
  return results;
}
