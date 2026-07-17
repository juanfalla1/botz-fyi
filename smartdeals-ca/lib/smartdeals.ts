import { createClient } from "@supabase/supabase-js";

export type SmartDealProduct = {
  asin: string;
  title: string;
  category: string;
  affiliateUrl: string;
  productUrl: string;
  imageUrl: string;
  priceText: string;
  rating: number | null;
  reviewCount: number | null;
  specifications: { name: string; value: string }[];
  bullets: string[];
  instagramUrl: string;
  salesSignal: string;
  opportunityScore: number | null;
  publishedAt: string | null;
};

export const smartDealCategories = [
  { slug: "electronics", label: "Electronics" },
  { slug: "home", label: "Home" },
  { slug: "beauty", label: "Beauty" },
  { slug: "gaming", label: "Gaming" },
  { slug: "kitchen", label: "Kitchen" },
  { slug: "gifts", label: "Gifts" },
  { slug: "camping", label: "Camping" },
] as const;

export type SmartDealCategory = (typeof smartDealCategories)[number]["slug"];

const trackingId = "botzca-20";

export function getTrackingId() {
  return trackingId;
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://smartdeals.ca";
}

export function buildAmazonAffiliateUrl(asin: string) {
  return `https://www.amazon.ca/dp/${encodeURIComponent(asin)}?tag=${encodeURIComponent(getTrackingId())}`;
}

export function normalizeCategory(value: string): SmartDealCategory | null {
  const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return smartDealCategories.some((category) => category.slug === slug) ? (slug as SmartDealCategory) : null;
}

export function getCategoryLabel(slug: string) {
  return smartDealCategories.find((category) => category.slug === slug)?.label || "Smart Deals";
}

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, { auth: { persistSession: false } });
}

export async function listPublishedProducts(limit = 60): Promise<SmartDealProduct[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: publications } = await supabase
    .from("amazon_affiliate_publications")
    .select("affiliate_url,published_at")
    .eq("status", "posted")
    .order("published_at", { ascending: false })
    .limit(limit);

  const publishedUrls = [...new Set((publications || []).map((row) => row.affiliate_url).filter(Boolean))];
  if (!publishedUrls.length) return listLatestProducts(limit);

  const { data: products, error } = await supabase
    .from("amazon_affiliate_products")
    .select("asin,title,category,affiliate_url,product_url,image_url,price_text,rating,sales_signal,opportunity_score,scraper_response")
    .in("affiliate_url", publishedUrls)
    .not("asin", "is", null)
    .not("image_url", "is", null);

  if (error || !products || products.length === 0) return listLatestProducts(limit);

  const publishMap = new Map((publications || []).map((row) => [row.affiliate_url, row.published_at || null]));
  const orderMap = new Map(publishedUrls.map((url, index) => [url, index]));

  return products
    .filter((product) => product.asin && product.title)
    .filter((product) => isDisplayableProduct(product))
    .sort((a, b) => (orderMap.get(a.affiliate_url) ?? 9999) - (orderMap.get(b.affiliate_url) ?? 9999))
    .map((product) => ({
      asin: String(product.asin),
      title: String(product.title || "Amazon.ca find"),
      category: String(product.category || ""),
      affiliateUrl: String(product.affiliate_url || buildAmazonAffiliateUrl(String(product.asin))),
      productUrl: String(product.product_url || `https://www.amazon.ca/dp/${product.asin}`),
      imageUrl: String(product.image_url || ""),
      priceText: String(product.price_text || "Check price"),
      rating: typeof product.rating === "number" ? product.rating : Number(product.rating) || null,
      reviewCount: getReviewCount(product),
      specifications: getSpecifications(product),
      bullets: getBullets(product),
      instagramUrl: getInstagramUrl(product),
      salesSignal: String(product.sales_signal || ""),
      opportunityScore: typeof product.opportunity_score === "number" ? product.opportunity_score : Number(product.opportunity_score) || null,
      publishedAt: publishMap.get(product.affiliate_url) || null,
    }));
}

export async function listLatestProducts(limit = 60): Promise<SmartDealProduct[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: products, error } = await supabase
    .from("amazon_affiliate_products")
    .select("asin,title,category,affiliate_url,product_url,image_url,price_text,rating,sales_signal,opportunity_score,scraper_response,last_scraped_at")
    .not("asin", "is", null)
    .not("image_url", "is", null)
    .order("last_scraped_at", { ascending: false })
    .limit(limit);

  if (error || !products) return [];

  return products
    .filter((product) => product.asin && product.title)
    .filter((product) => isDisplayableProduct(product))
    .map((product) => ({
      asin: String(product.asin),
      title: String(product.title || "Amazon.ca find"),
      category: String(product.category || ""),
      affiliateUrl: String(product.affiliate_url || buildAmazonAffiliateUrl(String(product.asin))),
      productUrl: String(product.product_url || `https://www.amazon.ca/dp/${product.asin}`),
      imageUrl: String(product.image_url || ""),
      priceText: String(product.price_text || "Check price"),
      rating: typeof product.rating === "number" ? product.rating : Number(product.rating) || null,
      reviewCount: getReviewCount(product),
      specifications: getSpecifications(product),
      bullets: getBullets(product),
      instagramUrl: getInstagramUrl(product),
      salesSignal: String(product.sales_signal || ""),
      opportunityScore: typeof product.opportunity_score === "number" ? product.opportunity_score : Number(product.opportunity_score) || null,
      publishedAt: product.last_scraped_at ? String(product.last_scraped_at) : null,
    }));
}

export async function listProductsByCategory(category: SmartDealCategory, limit = 72): Promise<SmartDealProduct[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: products, error } = await supabase
    .from("amazon_affiliate_products")
    .select("asin,title,category,affiliate_url,product_url,image_url,price_text,rating,sales_signal,opportunity_score,scraper_response,last_scraped_at")
    .eq("category", category)
    .not("asin", "is", null)
    .not("image_url", "is", null)
    .order("last_scraped_at", { ascending: false })
    .limit(limit);

  if (error || !products) return [];

  return products
    .filter((product) => product.asin && product.title)
    .filter((product) => isDisplayableProduct(product))
    .map((product) => ({
      asin: String(product.asin),
      title: String(product.title || "Amazon.ca find"),
      category: String(product.category || category),
      affiliateUrl: String(product.affiliate_url || buildAmazonAffiliateUrl(String(product.asin))),
      productUrl: String(product.product_url || `https://www.amazon.ca/dp/${product.asin}`),
      imageUrl: String(product.image_url || ""),
      priceText: String(product.price_text || "Check price"),
      rating: typeof product.rating === "number" ? product.rating : Number(product.rating) || null,
      reviewCount: getReviewCount(product),
      specifications: getSpecifications(product),
      bullets: getBullets(product),
      instagramUrl: getInstagramUrl(product),
      salesSignal: String(product.sales_signal || ""),
      opportunityScore: typeof product.opportunity_score === "number" ? product.opportunity_score : Number(product.opportunity_score) || null,
      publishedAt: product.last_scraped_at ? String(product.last_scraped_at) : null,
    }));
}

export async function searchProducts(query: string, limit = 72): Promise<SmartDealProduct[]> {
  const supabase = getSupabaseAdmin();
  const term = cleanSearchQuery(query);
  if (!supabase || !term) return [];

  const escaped = escapeIlike(term);
  const category = normalizeCategory(term);
  const filters = [`title.ilike.%${escaped}%`, `sales_signal.ilike.%${escaped}%`];
  if (category) filters.push(`category.eq.${category}`);

  const { data: products, error } = await supabase
    .from("amazon_affiliate_products")
    .select("asin,title,category,affiliate_url,product_url,image_url,price_text,rating,sales_signal,opportunity_score,scraper_response,last_scraped_at")
    .or(filters.join(","))
    .not("asin", "is", null)
    .not("image_url", "is", null)
    .order("last_scraped_at", { ascending: false })
    .limit(limit);

  if (error || !products) return [];

  return products
    .filter((product) => product.asin && product.title)
    .filter((product) => isDisplayableProduct(product))
    .map((product) => ({
      asin: String(product.asin),
      title: String(product.title || "Amazon.ca find"),
      category: String(product.category || ""),
      affiliateUrl: String(product.affiliate_url || buildAmazonAffiliateUrl(String(product.asin))),
      productUrl: String(product.product_url || `https://www.amazon.ca/dp/${product.asin}`),
      imageUrl: String(product.image_url || ""),
      priceText: String(product.price_text || "Check price"),
      rating: typeof product.rating === "number" ? product.rating : Number(product.rating) || null,
      reviewCount: getReviewCount(product),
      specifications: getSpecifications(product),
      bullets: getBullets(product),
      instagramUrl: getInstagramUrl(product),
      salesSignal: String(product.sales_signal || ""),
      opportunityScore: typeof product.opportunity_score === "number" ? product.opportunity_score : Number(product.opportunity_score) || null,
      publishedAt: product.last_scraped_at ? String(product.last_scraped_at) : null,
    }));
}

export function cleanSearchQuery(value: string) {
  return value.replace(/[^a-zA-Z0-9\s+.'-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function isDisplayableProduct(product: {
  asin?: unknown;
  affiliate_url?: unknown;
  product_url?: unknown;
  price_text?: unknown;
}) {
  const asin = String(product.asin || "").toUpperCase();
  const priceText = String(product.price_text || "");
  const urls = [product.affiliate_url, product.product_url].map((value) => String(value || ""));

  if (!parseCadPrice(priceText)) return false;
  return urls.every((url) => !url || extractAsin(url) === asin);
}

function parseCadPrice(value: string) {
  const normalized = value.replace(/,/g, "");
  const match = normalized.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  return match?.[1] || "";
}

function extractAsin(value: string) {
  const match = value.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?#]|$)/i);
  return match?.[1]?.toUpperCase() || "";
}

function getReviewCount(product: { scraper_response?: unknown }) {
  const response = product.scraper_response && typeof product.scraper_response === "object"
    ? product.scraper_response as { review_count?: unknown; reviewCount?: unknown }
    : null;
  const value = response?.review_count ?? response?.reviewCount;
  const count = typeof value === "number" ? value : Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(count) && count > 0 ? Math.round(count) : null;
}

function getScraperResponse(product: { scraper_response?: unknown }) {
  return product.scraper_response && typeof product.scraper_response === "object"
    ? product.scraper_response as { specifications?: unknown; bullets?: unknown; instagram_url?: unknown; instagram_reel_url?: unknown; instagram_permalink?: unknown }
    : null;
}

function getSpecifications(product: { scraper_response?: unknown }) {
  const specs = getScraperResponse(product)?.specifications;
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) return [];

  return Object.entries(specs)
    .map(([name, value]) => ({ name: String(name || "").trim(), value: String(value || "").trim() }))
    .filter((item) => item.name && item.value)
    .slice(0, 6);
}

function getBullets(product: { scraper_response?: unknown }) {
  const bullets = getScraperResponse(product)?.bullets;
  if (!Array.isArray(bullets)) return [];

  return bullets
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

function getInstagramUrl(product: { scraper_response?: unknown }) {
  const response = getScraperResponse(product);
  const value = response?.instagram_reel_url ?? response?.instagram_permalink ?? response?.instagram_url;
  const url = String(value || "").trim();
  return /^https:\/\/(www\.)?instagram\.com\//i.test(url) ? url : "";
}

function escapeIlike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function getProductByAsin(asin: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data } = await supabase
    .from("amazon_affiliate_products")
    .select("id,asin,affiliate_url,title")
    .eq("asin", asin)
    .maybeSingle();

  return data || null;
}
