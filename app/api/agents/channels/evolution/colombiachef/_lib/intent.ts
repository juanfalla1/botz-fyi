export function isGreeting(text: string): boolean {
  return /^(hola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hey|hello)\b/i.test(
    String(text || "").trim()
  );
}

export function isPurchaseIntent(text: string): boolean {
  return /(comprar|compra|pedido|pedir|agregar al carrito|carrito|como pago|como hago el pedido|como lo compro|como comprar|quiero este|me gusta.*como compro|quiero llevar|finalizar compra|procede)/i.test(
    String(text || "")
  );
}

export function isMoreOptionsIntent(text: string): boolean {
  const t = String(text || "").trim();
  if (/^(otra|quiero otra|dame opciones|mas opciones|mas|otra opcion|otra referencia)$/i.test(t)) return true;
  return /(dame|quiero|si|sí|muestrame|mu[eé]strame)\s+.*(mas|m[aá]s)\s+opciones/i.test(t);
}

export function isMoreInCategoryIntent(text: string): boolean {
  return /(que|qué)\s+m[aá]s\s+.*(tienes|manejan|hay)/i.test(String(text || "").trim());
}

export function isCatalogScopeQuestion(text: string): boolean {
  return /(que venden|que manejan|que productos|que tienen|que ofrecen|catalogo|portafolio)/i.test(
    String(text || "")
  );
}

export function isUnsupportedRequest(text: string): boolean {
  return /(carne|pollo|res|cerdo|pescado|verdura|fruta|arroz|aceite|huevo|leche|queso)/i.test(
    String(text || "")
  );
}

export function isConfusionSignal(text: string): boolean {
  return /(no te entiendo|no entendi|no entend[ií]|no comprendo|no comprendi|no me queda claro|no se)/i.test(
    String(text || "")
  );
}
