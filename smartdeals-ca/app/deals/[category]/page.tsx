import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategoryLabel,
  listProductsByCategory,
  normalizeCategory,
  smartDealCategories,
  type SmartDealProduct,
} from "@/lib/smartdeals";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CategoryPageProps = {
  params: Promise<{ category: string }> | { category: string };
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const resolved = await params;
  const category = normalizeCategory(resolved.category || "");
  if (!category) return { title: "Smart Deals" };

  const label = getCategoryLabel(category);
  return {
    title: `${label} Deals`,
    description: `Fresh Amazon.ca ${label.toLowerCase()} finds curated automatically by Smart Deals Canada.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const resolved = await params;
  const category = normalizeCategory(resolved.category || "");
  if (!category) notFound();

  const label = getCategoryLabel(category);
  const products = await listProductsByCategory(category, 72);

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
            <a href="#latest">Latest</a>
          </nav>
        </div>
      </header>

      <section className="hero-wrap category-page-hero">
        <div className="category-bar" aria-label="Popular categories">
          {smartDealCategories.map((item) => (
            <Link key={item.slug} className={item.slug === category ? "active" : ""} href={`/deals/${item.slug}`}>
              {item.label}
            </Link>
          ))}
        </div>

        <section className="visual-banner">
          <div>
            <p className="eyebrow">Amazon.ca category</p>
            <h1>{label} deals picked for Canada shoppers.</h1>
            <p>Fresh products are added automatically when the Smart Deals workflow validates this category.</p>
          </div>
          <div className="banner-art" aria-hidden="true">
            <span className="bag bag-blue">SD</span>
            <span className="bag bag-yellow">%</span>
            <span className="bag bag-white">ca</span>
          </div>
        </section>
      </section>

      <section id="latest" className="content-section">
        <div className="section-heading">
          <p className="eyebrow">Live category</p>
          <h2>{label} finds</h2>
          <p>Every button sends shoppers directly to Amazon.ca with the Smart Deals associate tag.</p>
        </div>

        {products.length > 0 ? (
          <div className="deal-grid">
            {products.map((product, index) => <DealCard key={product.asin} product={product} priority={index < 3} />)}
          </div>
        ) : (
          <div className="empty-state">
            <span className="deal-badge">Sync pending</span>
            <h2>No {label.toLowerCase()} products yet</h2>
            <p>Run the Smart Deals n8n workflow after adding category support. Products in this category will appear here automatically.</p>
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
        <span>Amazon.ca find</span>
        {product.salesSignal ? <small>{product.salesSignal}</small> : null}
      </div>
      <div className="product-stage">
        <img src={product.imageUrl} alt={product.title} loading={priority ? "eager" : "lazy"} />
      </div>
      <div className="deal-body">
        <ProductMeta product={product} compact />
        <h3 title={product.title}>{shortProductTitle(product.title)}</h3>
        <BuyLink product={product} source={`category-${product.category || "unknown"}`} />
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
