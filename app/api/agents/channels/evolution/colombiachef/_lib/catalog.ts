import catalogJson from "@/src/agents/colombia-chef/data/colombiachef_bot_data.json";

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

let cached: CatalogData | null = (catalogJson as CatalogData);

function normalize(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function productFamilyKey(name: string): string {
  return normalize(name)
    .replace(/\bref\.?\s*[a-z0-9-]+\b/g, "")
    .replace(/[«»"'()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeByFamily(products: ColombiaChefProduct[], limit: number): ColombiaChefProduct[] {
  const unique: ColombiaChefProduct[] = [];
  const seen = new Set<string>();
  for (const p of products) {
    const key = productFamilyKey(p.name);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
    if (unique.length >= limit) break;
  }
  return unique;
}

export function loadCatalog(): CatalogData {
  return cached || { products: [] };
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
      if (query.includes("combo") && normalize(p.category) === "combos") score += 1;
      if (query.includes("chaqueta") && normalize(p.category) === "chaquetas") score += 1;
      if (query.includes("pantalon") && normalize(p.category) === "pantalones") score += 1;
      if (query.includes("delantal") && normalize(p.category) === "delantales") score += 1;
      if (query.includes("gorro") && normalize(p.category) === "gorros") score += 1;
      if (query.includes("accesorio") && normalize(p.category) === "accesorios") score += 1;
      return { p, score };
    })
    .filter((x) => {
      if (tokens.length >= 3) return x.score >= 2;
      return x.score >= 1;
    })
    .sort((a, b) => b.score - a.score);

  const ranked = scored.map((x) => x.p);
  return dedupeByFamily(ranked, limit);
}

export function findProductsByCategory(category: string, limit = 8): ColombiaChefProduct[] {
  const data = loadCatalog();
  const wanted = normalize(category);
  const keywords: Record<string, string[]> = {
    chaquetas: ["chaqueta"],
    pantalones: ["pantalon", "pant"],
    delantales: ["delantal", "peto"],
    gorros: ["gorro", "pirata", "champignon", "beisbol", "toca"],
    combos: ["combo"],
    accesorios: ["accesorio"],
    promos: ["promo", "oferta", "descuento"],
  };
  const k = keywords[wanted] || [];

  const scored = (data.products || [])
    .filter((p) => normalize(p.category) === wanted)
    .map((p) => {
      const hay = normalize(`${p.name} ${p.subcategory}`);
      let score = k.reduce((acc, term) => (hay.includes(term) ? acc + 1 : acc), 0);
      if (wanted === "accesorios") {
        const accessoryBoost = /(cuchillo|kit|funda|tabla|chaira|termometro|tula|limpion|bolsa)/.test(hay);
        const apparelPenalty = /(camiseta|chaleco|chaqueta|pantalon)/.test(hay);
        if (accessoryBoost) score += 2;
        if (apparelPenalty) score -= 2;
      }
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);

  const ranked = scored.map((x) => x.p);
  return dedupeByFamily(ranked, limit);
}

export function findProductByUrl(url: string): ColombiaChefProduct | null {
  const data = loadCatalog();
  const target = normalize(url);
  if (!target) return null;
  return (data.products || []).find((p) => normalize(p.url) === target) || null;
}
