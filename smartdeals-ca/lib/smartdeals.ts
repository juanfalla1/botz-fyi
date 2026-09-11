export type SmartDealProduct = {
  asin: string;
  title: string;
  category: string;
  affiliateUrl: string;
  productUrl: string;
  imageUrl: string;
  galleryImages: string[];
  video: { available: boolean; source: string; poster: string; type: string; pageUrl: string };
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

const fallbackTrackingId = "botzca-20";

export function getTrackingId() {
  return (process.env.AMAZON_ASSOCIATES_TRACKING_ID || fallbackTrackingId).trim() || fallbackTrackingId;
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

export async function listPublishedProducts(_limit = 60): Promise<SmartDealProduct[]> {
  return [];
}

export async function listLatestProducts(_limit = 60): Promise<SmartDealProduct[]> {
  return [];
}

export async function listProductsByCategory(_category: SmartDealCategory, _limit = 72): Promise<SmartDealProduct[]> {
  return [];
}

export async function searchProducts(_query: string, _limit = 72): Promise<SmartDealProduct[]> {
  return [];
}

export function cleanSearchQuery(value: string) {
  return value.replace(/[^a-zA-Z0-9\s+.'-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function normalizeSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value.find((item) => typeof item === "string" && item.trim() !== "") ?? "";
  }

  return typeof value === "string" ? value : "";
}
