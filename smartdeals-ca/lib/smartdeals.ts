import { createClient } from "@supabase/supabase-js";

export type SmartDealProduct = {
  asin: string;
  title: string;
  affiliateUrl: string;
  productUrl: string;
  imageUrl: string;
  priceText: string;
  rating: number | null;
  salesSignal: string;
  opportunityScore: number | null;
  publishedAt: string | null;
};

const fallbackTrackingId = "bb1zca-20";

export function getTrackingId() {
  return process.env.AMAZON_ASSOCIATES_TRACKING_ID || fallbackTrackingId;
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://smartdeals.ca";
}

export function buildAmazonAffiliateUrl(asin: string) {
  return `https://www.amazon.ca/dp/${encodeURIComponent(asin)}?tag=${encodeURIComponent(getTrackingId())}`;
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
  if (!publishedUrls.length) return [];

  const { data: products, error } = await supabase
    .from("amazon_affiliate_products")
    .select("asin,title,affiliate_url,product_url,image_url,price_text,rating,sales_signal,opportunity_score")
    .in("affiliate_url", publishedUrls)
    .not("asin", "is", null)
    .not("image_url", "is", null);

  if (error || !products) return [];

  const publishMap = new Map((publications || []).map((row) => [row.affiliate_url, row.published_at || null]));
  const orderMap = new Map(publishedUrls.map((url, index) => [url, index]));

  return products
    .filter((product) => product.asin && product.title)
    .sort((a, b) => (orderMap.get(a.affiliate_url) ?? 9999) - (orderMap.get(b.affiliate_url) ?? 9999))
    .map((product) => ({
      asin: String(product.asin),
      title: String(product.title || "Amazon.ca find"),
      affiliateUrl: String(product.affiliate_url || buildAmazonAffiliateUrl(String(product.asin))),
      productUrl: String(product.product_url || `https://www.amazon.ca/dp/${product.asin}`),
      imageUrl: String(product.image_url || ""),
      priceText: String(product.price_text || "Check price"),
      rating: typeof product.rating === "number" ? product.rating : Number(product.rating) || null,
      salesSignal: String(product.sales_signal || ""),
      opportunityScore: typeof product.opportunity_score === "number" ? product.opportunity_score : Number(product.opportunity_score) || null,
      publishedAt: publishMap.get(product.affiliate_url) || null,
    }));
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
