import { crawlSite } from "../integrations/firecrawl";

export async function runCrawler(baseUrl: string, maxPages = 20) {
  return crawlSite(baseUrl, Math.min(maxPages, 20));
}
