import Link from "next/link";
import { listPublishedProducts, type SmartDealProduct } from "@/lib/smartdeals";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const products = await listPublishedProducts(72);
  const featured = products[0];
  const trending = products.slice(1, 5);
  const rest = products.slice(5);

  return (
    <main className="site-shell">
      <div className="announcement">Canada Amazon finds updated automatically. Prices and availability are checked on Amazon.ca.</div>

      <header className="topbar" aria-label="Smart Deals navigation">
        <div className="topbar-inner">
          <Link className="brand" href="/">
            <span className="brand-mark">SD</span>
            <span>
              <strong>Smart Deals</strong>
              <small>Canada</small>
            </span>
          </Link>
          <nav className="nav-links" aria-label="Categories">
            <a href="#deals">Today&apos;s Deals</a>
            <a href="#trending">Trending</a>
            <a href="#latest">Latest</a>
          </nav>
        </div>
      </header>

      <section className="hero-wrap">
        <div className="category-bar" aria-label="Popular categories">
          {['Electronics', 'Home', 'Beauty', 'Gaming', 'Kitchen', 'Gifts'].map((category) => <span key={category}>{category}</span>)}
        </div>

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Smart finds from Amazon.ca</p>
            <h1>Daily Canada deals picked for fast shoppers.</h1>
            <p className="hero-text">
              Discover products people are buying now. Every button sends you directly to Amazon.ca with the current product page.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#deals">Shop latest finds</a>
              <span className="trust-pill">Amazon.ca checkout</span>
            </div>
          </section>

          {featured ? <FeaturedProduct product={featured} /> : <EmptyHero />}
        </div>
      </section>

      <section id="deals" className="content-section">
        <div className="section-heading">
          <p className="eyebrow">Live storefront</p>
          <h2>Today&apos;s Smart Deals</h2>
          <p>Products appear here automatically after they are posted on Smart Deals.</p>
        </div>

        {trending.length > 0 ? (
          <div id="trending" className="trend-strip">
            {trending.map((product) => <MiniDeal key={product.asin} product={product} />)}
          </div>
        ) : null}

        {products.length > 0 ? (
          <div id="latest" className="deal-grid">
            {products.map((product, index) => <DealCard key={product.asin} product={product} priority={index < 3} />)}
          </div>
        ) : (
          <div className="empty-state">
            <h2>No products yet</h2>
            <p>Once the Instagram workflow publishes products, they will show up here automatically.</p>
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

function FeaturedProduct({ product }: { product: SmartDealProduct }) {
  return (
    <article className="featured-card">
      <span className="corner-label">Featured</span>
      <div className="product-stage large">
        <img src={product.imageUrl} alt={product.title} />
      </div>
      <div className="featured-copy">
        <span className="deal-badge">Latest Amazon.ca find</span>
        <h2>{product.title}</h2>
        <ProductMeta product={product} />
        <BuyLink product={product} source="hero" />
      </div>
    </article>
  );
}

function EmptyHero() {
  return (
    <div className="featured-card empty-featured">
      <div className="brand-mark big">SD</div>
      <h2>Storefront warming up</h2>
      <p>Published Amazon.ca products will populate this page automatically.</p>
    </div>
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
        <h3>{product.title}</h3>
        <ProductMeta product={product} compact />
        <BuyLink product={product} source="card" />
      </div>
    </article>
  );
}

function MiniDeal({ product }: { product: SmartDealProduct }) {
  return (
    <Link className="mini-deal" href={`/go/${product.asin}?source=trending`}>
      <img src={product.imageUrl} alt="" />
      <span>{product.title}</span>
    </Link>
  );
}

function ProductMeta({ product, compact = false }: { product: SmartDealProduct; compact?: boolean }) {
  return (
    <div className="product-meta">
      <strong>{product.priceText}</strong>
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
