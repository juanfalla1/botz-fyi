import type { Metadata } from "next";
import Link from "next/link";
import { cleanSearchQuery, searchProducts, smartDealCategories, type SmartDealProduct } from "@/lib/smartdeals";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchPageProps = {
  searchParams: Promise<{ q?: string }> | { q?: string };
};

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const resolved = await searchParams;
  const query = cleanSearchQuery(resolved.q || "");

  return {
    title: query ? `Search ${query}` : "Search Deals",
    description: query
      ? `Search Smart Deals Canada for Amazon.ca finds matching ${query}.`
      : "Search Smart Deals Canada for fresh Amazon.ca finds.",
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolved = await searchParams;
  const query = cleanSearchQuery(resolved.q || "");
  const products = query ? await searchProducts(query, 72) : [];

  return (
    <main className="site-shell">
      <div className="announcement">Canada Amazon finds updated automatically. Prices and availability are checked on Amazon.ca.</div>

      <header className="topbar" aria-label="Smart Deals navigation">
        <div className="topbar-inner">
          <Link className="brand" href="/">
            <span className="brand-logo-wrap" aria-hidden="true">
              <img className="brand-logo" src="/Smart%20Deals%20logo.png" alt="" />
            </span>
            <span>
              <strong>Smart Deals</strong>
              <small>Canada</small>
            </span>
          </Link>
          <nav className="nav-links" aria-label="Categories">
            <Link href="/">Home</Link>
            <a href="#results">Results</a>
          </nav>
        </div>
      </header>

      <section className="hero-wrap search-page-hero">
        <div className="category-bar" aria-label="Popular categories">
          {smartDealCategories.map((category) => (
            <Link key={category.slug} href={`/deals/${category.slug}`}>
              {category.label}
            </Link>
          ))}
        </div>

        <section className="visual-banner search-banner">
          <div>
            <p className="eyebrow">Smart search</p>
            <h1>{query ? `Results for “${query}”` : "Search Amazon.ca finds."}</h1>
            <p>Search products already validated by Smart Deals. If we do not have it yet, continue to Amazon.ca with the Smart Deals tag.</p>
            <form className="search-form light" action="/search">
              <input name="q" type="search" defaultValue={query} placeholder="Search camping lanterns, headphones, kitchen finds..." aria-label="Search Smart Deals products" />
              <button type="submit">Search</button>
            </form>
          </div>
          <div className="banner-art" aria-hidden="true">
            <span className="bag bag-blue">SD</span>
            <span className="bag bag-yellow">?</span>
            <span className="bag bag-white">ca</span>
          </div>
        </section>
      </section>

      <section id="results" className="content-section">
        <div className="section-heading">
          <p className="eyebrow">Search results</p>
          <h2>{query ? `${products.length} Smart Deals found` : "Start with a product search"}</h2>
          <p>Every product button sends shoppers directly to Amazon.ca with the Smart Deals associate tag.</p>
        </div>

        {products.length > 0 ? (
          <div className="deal-grid">
            {products.map((product, index) => <DealCard key={product.asin} product={product} priority={index < 3} />)}
          </div>
        ) : (
          <div className="empty-state">
            <span className="deal-badge">Amazon.ca fallback</span>
            <h2>{query ? "No saved product found yet" : "What are you shopping for?"}</h2>
            <p>{query ? "We can still send you to Amazon.ca search with the Smart Deals tag." : "Try searching for camping, headphones, kitchen, projector or beauty."}</p>
            {query ? <Link className="primary-action" href={`/go/search?q=${encodeURIComponent(query)}&source=site-search-empty`}>Search Amazon.ca</Link> : null}
          </div>
        )}
      </section>

      <footer className="footer">
        <p>As an Amazon Associate I earn from qualifying purchases.</p>
        <p>Prices and availability are controlled by Amazon.ca and can change at any time.</p>
      </footer>
    </main>
  );
}

function DealCard({ product, priority }: { product: SmartDealProduct; priority?: boolean }) {
  return (
    <article className="deal-card">
      <div className="card-topline">
        <span>{product.category || "Amazon.ca"} find</span>
        {product.salesSignal ? <small>{product.salesSignal}</small> : null}
      </div>
      <div className="product-stage">
        <img src={product.imageUrl} alt={product.title} loading={priority ? "eager" : "lazy"} />
      </div>
      <div className="deal-body">
        <ProductMeta product={product} compact />
        <h3 title={product.title}>{shortProductTitle(product.title)}</h3>
        <BuyLink product={product} source="site-search" />
      </div>
    </article>
  );
}

function ProductMeta({ product, compact = false }: { product: SmartDealProduct; compact?: boolean }) {
  const hasPrice = product.priceText && !/^check price$/i.test(product.priceText);

  return (
    <div className="product-meta">
      {hasPrice ? <strong>{product.priceText}</strong> : null}
      {product.rating ? <span>{product.rating} rating</span> : null}
      {product.salesSignal && !compact ? <span>{product.salesSignal}</span> : null}
    </div>
  );
}

function BuyLink({ product, source }: { product: SmartDealProduct; source: string }) {
  return (
    <Link className="buy-link" href={`/go/${product.asin}?source=${encodeURIComponent(source)}`}>
      Shop on Amazon.ca
    </Link>
  );
}

function shortProductTitle(title: string, maxWords = 7) {
  const cleaned = title
    .replace(/\bwith\b.*$/i, "")
    .replace(/\bfor\b.*$/i, "")
    .replace(/,.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = (cleaned || title).split(/\s+/).filter(Boolean);
  return words.length > maxWords ? `${words.slice(0, maxWords).join(" ")}...` : words.join(" ");
}
