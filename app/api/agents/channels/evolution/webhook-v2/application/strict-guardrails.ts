export function applyStrictOfftopicGuardrail(args: {
  textNorm: string;
  awaiting: string;
  explicitModel: boolean;
  categoryIntent: boolean;
  technicalSpecIntent: boolean;
  wantsQuote: boolean;
  wantsSheet: boolean;
  isGreeting: boolean;
  isOptionOnlyReply: (text: string) => boolean;
  text: string;
  previousMemory?: Record<string, any>;
  strictMemory: Record<string, any>;
}): { strictReply: string } {
  const outOfScope = /\b(autos?|carros?|vehiculos?|motos?|bicicletas?|inmueble|casa|apartamento|hipoteca|pan|leche|carne|fruta|verdura|comida|almuerzo|cena|desayuno|restaurante|pizza|hamburguesa|helado)\b/.test(args.textNorm);
  const offTopicCandidate =
    outOfScope &&
    !args.awaiting &&
    !args.explicitModel &&
    !args.categoryIntent &&
    !args.technicalSpecIntent &&
    !args.wantsQuote &&
    !args.wantsSheet &&
    !args.isGreeting &&
    !args.isOptionOnlyReply(args.text);

  if (offTopicCandidate) {
    const count = Math.min(10, Number(args.previousMemory?.offtopic_count || 0) + 1);
    args.strictMemory.offtopic_count = count;
    args.strictMemory.awaiting_action = "none";
    if (count >= 3) {
      const mutedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      args.strictMemory.offtopic_muted_until = mutedUntil;
      return {
        strictReply: "Este canal es solo para cotizar balanzas y analizadores de humedad OHAUS. Pauso este chat 15 minutos por mensajes fuera de catálogo.",
      };
    }
    if (count === 2) {
      return {
        strictReply: "Solo manejo catálogo OHAUS de balanzas y analizadores de humedad. Responde 1) Balanzas 2) Humedad o escribe modelo (PX85, AX85, MB120).",
      };
    }
    return {
      strictReply: "No manejo ese tipo de producto. Solo te ayudo con balanzas y analizadores de humedad OHAUS. Responde 1) Balanzas 2) Humedad.",
    };
  }

  args.strictMemory.offtopic_count = 0;
  args.strictMemory.offtopic_muted_until = "";
  return { strictReply: "" };
}
