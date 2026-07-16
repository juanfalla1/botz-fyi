import Link from "next/link";
import { listPublishedProducts, type SmartDealProduct } from "@/lib/smartdeals";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const products = await listPublishedProducts(72);
  const featured = products[0];
  const trending = products.slice(1, 5);
  const rest = products.slice(5);
  const productJsonLd = buildProductJsonLd(products);

  return (
    <main className="site-shell">
      {productJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      ) : null}
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
          {[
            ['Electronics', 'electronics deals'],
            ['Home', 'home deals'],
            ['Beauty', 'beauty deals'],
            ['Gaming', 'gaming deals'],
            ['Kitchen', 'kitchen deals'],
            ['Gifts', 'gift ideas'],
          ].map(([category, query]) => (
            <Link key={category} href={`/go/search?q=${encodeURIComponent(query)}&source=category`}>
              {category}
            </Link>
          ))}
        </div>

        <div className="hero-grid">
          <section className="hero-copy">
            <div className="hero-pattern" aria-hidden="true">
              <span className="floating-card card-one">5K+ bought</span>
              <span className="floating-card card-two">Canada pick</span>
              <span className="shopping-orb orb-one" />
              <span className="shopping-orb orb-two" />
            </div>
            <p className="eyebrow">Smart finds from Amazon.ca</p>
            <h1>Daily Canada deals picked for fast shoppers.</h1>
            <p className="hero-text">
              Discover products people are buying now. Every button sends you directly to Amazon.ca with the current product page.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#deals">Shop latest finds</a>
              <Link className="trust-pill" href="/go/search?q=amazon.ca%20deals&source=hero-pill">Amazon.ca checkout</Link>
            </div>
          </section>

          {featured ? <FeaturedProduct product={featured} /> : <EmptyHero />}
        </div>

        <section className="trust-row" aria-label="Smart Deals benefits">
          <a href="#latest"><strong>Auto-updated</strong><span>Products sync from the publishing workflow.</span></a>
          <Link href="/go/search?q=amazon.ca%20deals&source=trust-row"><strong>Amazon.ca checkout</strong><span>Buttons send shoppers directly to Amazon.</span></Link>
          <Link href="/go/search?q=canada%20deals&source=trust-row"><strong>Canada focused</strong><span>Built for Canadian Amazon shoppers.</span></Link>
        </section>
      </section>

      <section id="deals" className="content-section">
        <div className="section-heading">
          <p className="eyebrow">Live storefront</p>
          <h2>Today&apos;s Smart Deals</h2>
          <p>Products appear here automatically after they are posted on Smart Deals.</p>
        </div>

        <section className="visual-banner">
          <div>
            <p className="eyebrow">Shop smarter</p>
            <h2>Fresh finds, clean layout, direct Amazon.ca checkout.</h2>
          </div>
          <div className="banner-art" aria-hidden="true">
            <span className="bag bag-blue">SD</span>
            <span className="bag bag-yellow">%</span>
            <span className="bag bag-white">ca</span>
          </div>
        </section>

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
            <span className="deal-badge">Coming online</span>
            <h2>Products are syncing</h2>
            <p>Run the Smart Deals n8n workflow once and this storefront will fill with Amazon.ca products automatically.</p>
            <div className="empty-grid" aria-hidden="true">
              <span>Amazon.ca finds</span>
              <span>Auto-updated prices</span>
              <span>Tracked clicks</span>
            </div>
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
      <h2>Products are syncing</h2>
      <p>As soon as Supabase returns Amazon.ca products, this area becomes the featured deal.</p>
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
        <ProductMeta product={product} compact />
        <h3 title={product.title}>{shortProductTitle(product.title)}</h3>
        <BuyLink product={product} source="card" />
      </div>
    </article>
  );
}

function MiniDeal({ product }: { product: SmartDealProduct }) {
  return (
    <Link className="mini-deal" href={`/go/${product.asin}?source=trending`}>
      <img src={product.imageUrl} alt="" />
      <span>{shortProductTitle(product.title, 6)}</span>
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

function buildProductJsonLd(products: SmartDealProduct[]) {
  const items = products
    .map((product) => {
      const price = parseCadPrice(product.priceText);
      if (!price) return null;

      return {
        "@type": "Product",
        name: product.title,
        image: product.imageUrl,
        description: product.title,
        sku: product.asin,
        brand: {
          "@type": "Brand",
          name: "Amazon.ca",
        },
        offers: {
          "@type": "Offer",
          priceCurrency: "CAD",
          price,
          availability: "https://schema.org/InStock",
          url: `https://www.smart-deals-canada.com/go/${encodeURIComponent(product.asin)}?source=google-product-schema`,
        },
      };
    })
    .filter(Boolean);

  if (!items.length) return null;

  return {
    "@context": "https://schema.org",
    "@graph": items,
  };
}

function parseCadPrice(value: string) {
  const normalized = value.replace(/,/g, "");
  const match = normalized.match(/\$\s*(\d+(?:\.\d{1,2})?)/) || normalized.match(/\b(\d+(?:\.\d{1,2})?)\b/);
  return match?.[1] || "";
}
