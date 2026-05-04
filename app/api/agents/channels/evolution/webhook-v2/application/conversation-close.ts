export function hasQuoteContext(memory: any): boolean {
  return Boolean(
    memory?.last_quote_draft_id ||
    memory?.last_quote_pdf_sent_at ||
    /(quote_generated|quote_recall|price_request)/.test(String(memory?.last_intent || ""))
  );
}

export function buildConversationCloseReply(hadQuoteContext: boolean): string {
  return hadQuoteContext
    ? "Perfecto, cerramos por ahora. Gracias por tu tiempo. Te estaremos enviando un recordatorio breve para saber como te parecio la cotizacion."
    : "Perfecto, cerramos por ahora. Gracias por tu tiempo. Si despues quieres retomar, te ayudo por este mismo WhatsApp.";
}
