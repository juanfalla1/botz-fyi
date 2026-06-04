export function hasFirecrawlKey() {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}

export async function crawlSite(baseUrl: string, maxPages = 20) {
  if (!hasFirecrawlKey()) {
    return {
      demo: true,
      pages: [{ url: baseUrl, title: "Home", description: "Demo crawled page", content: "Demo content" }],
    };
  }
  return { demo: false, pages: [] };
}
