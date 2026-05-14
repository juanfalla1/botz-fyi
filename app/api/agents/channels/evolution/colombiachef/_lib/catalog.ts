import fs from "node:fs";
import path from "node:path";

export type ColombiaChefProduct = {
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

type CatalogData = {
  business?: {
    name?: string;
    policies?: string[];
  };
  products?: ColombiaChefProduct[];
  stats?: {
    total_by_category?: Record<string, number>;
  };
};

let cached: CatalogData | null = null;

function normalize(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function loadCatalog(): CatalogData {
  if (cached) return cached;
  const file = process.env.COLOMBIACHEF_CATALOG_PATH || path.join(process.cwd(), "colombiachef_bot_data.json");
  const raw = fs.readFileSync(file, "utf-8");
  cached = JSON.parse(raw) as CatalogData;
  return cached;
}

export function categoryMatches(input: string): string | null {
  const text = normalize(input);
  const map: Record<string, string[]> = {
    Chaquetas: ["chaqueta", "chaquetas"],
    Pantalones: ["pantalon", "pantalones"],
    Delantales: ["delantal", "delantales", "peto", "petos"],
    Gorros: ["gorro", "gorros", "pirata", "champignon", "beisbol", "toca"],
    Combos: ["combo", "combos", "institucional"],
    Accesorios: ["accesorio", "accesorios"],
    Promos: ["promo", "promos", "oferta", "ofertas", "descuento"],
  };
  for (const [category, words] of Object.entries(map)) {
    if (words.some((word) => text.includes(word))) return category;
  }
  return null;
}

export function findProductsByText(input: string, limit = 5): ColombiaChefProduct[] {
  const data = loadCatalog();
  const products = data.products || [];
  const query = normalize(input);
  if (!query) return [];

  const tokens = query.split(/\s+/).filter((t) => t.length >= 3);
  const scored = products
    .map((p) => {
      const hay = normalize([p.name, p.category, p.subcategory, p.description, p.colors.join(" "), p.sizes.join(" ")].join(" "));
      let score = 0;
      for (const t of tokens) {
        if (hay.includes(t)) score += 1;
      }
      if (score === 0 && hay.includes(query)) score = 1;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.p);
}

export function findProductsByCategory(category: string, limit = 8): ColombiaChefProduct[] {
  const data = loadCatalog();
  return (data.products || []).filter((p) => p.category === category).slice(0, limit);
}
