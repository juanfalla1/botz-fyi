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
  return /^(otra|quiero otra|dame opciones|mas opciones|mas|otra opcion|otra referencia)$/i.test(
    String(text || "").trim()
  );
}
