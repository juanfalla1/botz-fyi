export function detectCompetitors(answerText: string, competitors: string[]) {
  return competitors
    .filter((c) => answerText.toLowerCase().includes(c.toLowerCase()))
    .map((name, index) => ({ competitor_name: name, mentioned: true, position: index + 1 }));
}
