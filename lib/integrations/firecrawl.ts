export function hasFirecrawlKey() {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}

export async function crawlSite(baseUrl: string, maxPages = 20) {
  void baseUrl;
  void maxPages;
  throw new Error("Legacy crawl adapter disabled. Use the GEO audit pipeline instead.");
}
