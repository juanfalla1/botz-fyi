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

function normalizeLoose(value: string): string {
  return normalize(value).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function findExactProductByName(input: string): ColombiaChefProduct | null {
  const data = loadCatalog();
  const products = data.products || [];
  const q = normalizeLoose(input);
  if (!q || q.length < 6) return null;

  let best: { p: ColombiaChefProduct; score: number } | null = null;
  for (const p of products) {
    const n = normalizeLoose(p.name);
    let score = 0;
    if (n === q) score = 100;
    else if (n.includes(q)) score = 70;
    else if (q.includes(n) && n.length >= 8) score = 50;
    if (!score) continue;
    if (!best || score > best.score) best = { p, score };
  }
  return best?.p || null;
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

function accessoryType(name: string): string {
  const n = normalize(name);
  if (n.includes("kit")) return "kit";
  if (n.includes("cuchillo")) return "cuchillo";
  if (n.includes("chaira")) return "chaira";
  if (n.includes("funda")) return "funda";
  if (n.includes("tabla")) return "tabla";
  if (n.includes("termometro")) return "termometro";
  if (n.includes("tula")) return "tula";
  if (n.includes("limpion")) return "limpion";
  if (n.includes("calzado")) return "calzado";
  if (n.includes("bolsa")) return "bolsa";
  return "otro";
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
  const queryLoose = normalizeLoose(input);
  if (!query) return [];

  const tokens = query.split(/\s+/).filter((t) => t.length >= 2);
  const scored = products
    .map((p) => {
      const hay = normalize([p.name, p.category, p.subcategory, p.description, p.colors.join(" "), p.sizes.join(" ")].join(" "));
      const nameLoose = normalizeLoose(p.name);
      let score = 0;
      let overlap = 0;
      if (nameLoose === queryLoose) score += 100;
      else if (nameLoose.includes(queryLoose) && queryLoose.length >= 6) score += 30;
      for (const t of tokens) {
        if (hay.includes(t)) {
          overlap += 1;
          score += t.length >= 4 ? 2 : 1;
        }
      }
      const overlapRatio = tokens.length ? overlap / tokens.length : 0;
      if (overlapRatio >= 0.75) score += 6;
      else if (overlapRatio <= 0.34 && tokens.length >= 3) score -= 4;
      if (query.length >= 8 && hay.includes(query)) score += 4;
      if (score === 0 && hay.includes(query)) score = 1;
      if (query.includes("combo") && normalize(p.category) === "combos") score += 1;
      if (query.includes("chaqueta") && normalize(p.category) === "chaquetas") score += 1;
      if (query.includes("pantalon") && normalize(p.category) === "pantalones") score += 1;
      if (query.includes("delantal") && normalize(p.category) === "delantales") score += 1;
      if (query.includes("gorro") && normalize(p.category) === "gorros") score += 1;
      if (query.includes("accesorio") && normalize(p.category) === "accesorios") score += 1;
      if (/\btalla\s*l\b|\bl\b/.test(query) && p.sizes.map((s) => normalize(s)).includes("l")) score += 1;
      if (/\bblanco\b/.test(query) && p.colors.map((c) => normalize(c)).includes("blanco")) score += 1;
      if (/\bnegro\b/.test(query) && p.colors.map((c) => normalize(c)).includes("negro")) score += 1;
      return { p, score, overlapRatio };
    })
    .filter((x) => {
      if (tokens.length >= 4) return x.score >= 3 && x.overlapRatio >= 0.45;
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
  const deduped = dedupeByFamily(ranked, limit * 3);
  if (wanted !== "accesorios") return deduped.slice(0, limit);

  const picked: ColombiaChefProduct[] = [];
  const seenTypes = new Set<string>();
  for (const p of deduped) {
    const t = accessoryType(p.name);
    if (seenTypes.has(t) && t !== "otro") continue;
    seenTypes.add(t);
    picked.push(p);
    if (picked.length >= limit) break;
  }
  return picked;
}

export function findProductByUrl(url: string): ColombiaChefProduct | null {
  const data = loadCatalog();
  const target = normalize(url);
  if (!target) return null;
  return (data.products || []).find((p) => normalize(p.url) === target) || null;
}
