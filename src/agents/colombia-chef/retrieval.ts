import dataJson from "./data/colombiachef_bot_data.json";

export type ChefProduct = {
  name: string;
  category: string;
  subcategory: string;
  price: string;
  old_price: string;
  discount_price: string;
  is_promo: boolean;
  url: string;
  description: string;
  sizes: string[];
  colors: string[];
  sku: string;
  availability_notes: string;
  shipping_notes: string;
};

type DataFile = {
  business?: { policies?: string[] };
  products?: ChefProduct[];
};

let cached: DataFile | null = (dataJson as DataFile);

function normalize(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function loadChefData(): DataFile {
  return cached || { products: [] };
}

export function getPolicies(): string[] {
  return loadChefData().business?.policies || [];
}

export function matchCategory(text: string): string | null {
  const t = normalize(text);
  const categories: Record<string, string[]> = {
    Chaquetas: ["chaqueta", "chaquetas"],
    Pantalones: ["pantalon", "pantalones"],
    Delantales: ["delantal", "delantales", "peto", "petos"],
    Gorros: ["gorro", "gorros", "pirata", "champignon", "beisbol", "toca"],
    Combos: ["combo", "combos"],
    Accesorios: ["accesorio", "accesorios"],
    Promos: ["promo", "promos", "oferta", "descuento"],
  };
  for (const [category, terms] of Object.entries(categories)) {
    if (terms.some((term) => t.includes(term))) return category;
  }
  return null;
}

export function findByCategory(category: string, limit = 3): ChefProduct[] {
  return (loadChefData().products || []).filter((p) => p.category === category).slice(0, limit);
}

export function findByText(text: string, limit = 3): ChefProduct[] {
  const t = normalize(text);
  const tokens = t.split(/\s+/).filter((x) => x.length > 2);
  const scored = (loadChefData().products || [])
    .map((p) => {
      const hay = normalize([
        p.name,
        p.category,
        p.subcategory,
        p.description,
        p.colors.join(" "),
        p.sizes.join(" "),
      ].join(" "));
      let score = 0;
      for (const token of tokens) {
        if (hay.includes(token)) score += 1;
      }
      return { p, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.p);
}
