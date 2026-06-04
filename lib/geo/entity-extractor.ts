export function extractEntities(text: string) {
  const words = text.split(/\s+/).filter((w) => w.length > 4);
  return [...new Set(words)].slice(0, 12);
}
