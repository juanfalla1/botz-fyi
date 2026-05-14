import { colombiaChefAgentConfig } from "./config";
import { findByCategory, findByText, getPolicies, matchCategory, type ChefProduct } from "./retrieval";

function hasBlockedTopic(text: string): boolean {
  const t = text.toLowerCase();
  return colombiaChefAgentConfig.blockedTopics.some((word) => t.includes(word));
}

function formatProductLine(product: ChefProduct): string {
  const price = product.price || "No veo precio visible para ese producto en este momento.";
  const stockNote = product.availability_notes ? ` Disponibilidad: ${product.availability_notes}.` : "";
  return `${product.name}. Precio: ${price}. URL: ${product.url}.${stockNote}`.trim();
}

function needsSizeOrColor(question: string): boolean {
  const q = question.toLowerCase();
  return /(quiero|busco|recomienda|recomendacion|opciones)/.test(q) && !/(talla|color|presupuesto|uso)/.test(q);
}

export function answerColombiaChef(question: string): string {
  const text = String(question || "").trim();
  if (!text) {
    return "Hola, soy Asesor IA Colombia Chef. Que buscas hoy: chaqueta, pantalon, delantal, gorro, combo o accesorio?";
  }

  if (hasBlockedTopic(text)) {
    return "Ese tema no corresponde a Colombia Chef. Te puedo ayudar solo con uniformes, accesorios y promociones de colombiachef.com.";
  }

  if (/(politica|envio|envios|cambio|devolucion|devoluciones|faq)/i.test(text)) {
    const policies = getPolicies();
    if (!policies.length) return "No encuentro politicas cargadas en este momento.";
    return `Estas son las politicas oficiales de Colombia Chef: ${policies.join(" | ")}`;
  }

  if (/(promo|promos|oferta|descuento)/i.test(text)) {
    const promos = findByCategory("Promos", colombiaChefAgentConfig.maxRecommendations);
    if (!promos.length) return "No veo promociones visibles en este momento.";
    return promos.map(formatProductLine).join(" ");
  }

  const category = matchCategory(text);
  if (category) {
    if (needsSizeOrColor(text)) {
      return "Perfecto. Antes de recomendarte opciones, dime una cosa clave: talla, color, presupuesto o uso.";
    }
    const products = findByCategory(category, colombiaChefAgentConfig.maxRecommendations);
    if (!products.length) return `No encontre productos visibles para ${category} en este momento.`;
    return products.map(formatProductLine).join(" ");
  }

  const found = findByText(text, colombiaChefAgentConfig.maxRecommendations);
  if (!found.length) {
    return "No encontre coincidencias exactas. Dime si buscas chaquetas, pantalones, delantales, gorros, combos o accesorios.";
  }
  return found.map(formatProductLine).join(" ");
}
