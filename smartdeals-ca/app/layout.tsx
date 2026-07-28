import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.smart-deals-canada.com"),
  title: {
    default: "SD Canada",
    template: "%s | SD Canada",
  },
  description: "Fresh Amazon.ca finds, Canada deals and trending products curated automatically by Smart Deals.",
  icons: {
    icon: "/Smart%20Deals%20logo.png",
    shortcut: "/Smart%20Deals%20logo.png",
    apple: "/Smart%20Deals%20logo.png",
  },
  openGraph: {
    title: "Smart Deals Canada",
    description: "Fresh Amazon.ca finds and Canada deals updated automatically.",
    url: "https://www.smart-deals-canada.com",
    siteName: "Smart Deals Canada",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var cartKey = 'sdc_smart_deals_cart';

              function readCart() {
                try { return JSON.parse(localStorage.getItem(cartKey) || '[]'); } catch (error) { return []; }
              }

              function writeCart(items) {
                localStorage.setItem(cartKey, JSON.stringify(items.slice(0, 30)));
                renderCart();
              }

              function renderCart() {
                var items = readCart();
                var existing = document.getElementById('sdc-cart-dock');
                if (!items.length) {
                  if (existing) existing.remove();
                  return;
                }

                if (!existing) {
                  existing = document.createElement('aside');
                  existing.id = 'sdc-cart-dock';
                  document.body.appendChild(existing);
                }

                existing.innerHTML = '<div class="sdc-cart-head"><strong>Smart Deals List</strong><button type="button" data-sdc-cart-close>×</button></div>' +
                  '<p>Save products here, then check out on Amazon.ca. No extra cost to you.</p>' +
                  '<div class="sdc-cart-items">' + items.map(function (item) {
                    return '<div class="sdc-cart-item">' +
                      '<img src="' + item.image.replace(/"/g, '&quot;') + '" alt="" />' +
                      '<div><strong>' + item.title.replace(/</g, '&lt;') + '</strong><span>' + item.price.replace(/</g, '&lt;') + '</span></div>' +
                      '<a href="/go/' + item.asin + '?source=cart" data-sdc-cart-buy>Check price</a>' +
                      '<button type="button" data-sdc-remove="' + item.asin + '">Remove</button>' +
                    '</div>';
                  }).join('') + '</div>' +
                  '<a class="sdc-cart-primary" href="/go/' + items[0].asin + '?source=cart-primary">Start with first deal on Amazon.ca</a>';
              }

              document.addEventListener('click', function (event) {
                var addButton = event.target && event.target.closest ? event.target.closest('[data-sdc-add-cart]') : null;
                if (addButton) {
                  var item = {
                    asin: addButton.getAttribute('data-asin') || '',
                    title: addButton.getAttribute('data-title') || 'Amazon.ca find',
                    price: addButton.getAttribute('data-price') || 'Check price',
                    image: addButton.getAttribute('data-image') || '',
                    addedAt: Date.now()
                  };
                  if (item.asin) {
                    var cart = readCart().filter(function (saved) { return saved.asin !== item.asin; });
                    cart.unshift(item);
                    writeCart(cart);
                    addButton.textContent = 'Added to list';
                    setTimeout(function () { addButton.textContent = 'Add to Smart Deals list'; }, 1500);
                  }
                  return;
                }

                var removeButton = event.target && event.target.closest ? event.target.closest('[data-sdc-remove]') : null;
                if (removeButton) {
                  writeCart(readCart().filter(function (saved) { return saved.asin !== removeButton.getAttribute('data-sdc-remove'); }));
                  return;
                }

                if (event.target && event.target.closest && event.target.closest('[data-sdc-cart-close]')) {
                  var dock = document.getElementById('sdc-cart-dock');
                  if (dock) dock.remove();
                  return;
                }

                var link = event.target && event.target.closest ? event.target.closest('a') : null;
                if (!link) return;
                var href = link.getAttribute('href') || '';
                if (!href.match(/^\/go\/[A-Za-z0-9]{10}/)) return;
                try {
                  var url = new URL(href, window.location.origin);
                  var record = {
                    asin: (url.pathname.split('/').pop() || '').toUpperCase(),
                    source: url.searchParams.get('source') || 'unknown',
                    timestamp: Date.now(),
                    path: window.location.pathname
                  };
                  localStorage.setItem('sdc_last_amazon_click', JSON.stringify(record));
                } catch (error) {}
              }, { capture: true });

              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', renderCart);
              } else {
                renderCart();
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
