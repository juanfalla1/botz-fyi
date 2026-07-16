import express from 'express';
import { chromium } from 'playwright';

const app = express();
const port = process.env.PORT || 8080;
const extractTimeoutMs = Number(process.env.EXTRACT_TIMEOUT_MS || 30000);

app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/discover', async (req, res) => {
  const { limit = 24, sources = defaultDiscoverySources() } = req.body || {};
  const sourceUrls = Array.isArray(sources) && sources.length ? sources : defaultDiscoverySources();
  const maxProducts = Math.max(1, Math.min(Number(limit) || 24, 80));
  const perSourceLimit = Math.max(4, Math.ceil(maxProducts / Math.max(sourceUrls.length, 1)));

  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      locale: 'en-CA',
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    });

    const products = [];
    const seenAsins = new Set();

    for (const sourceUrl of sourceUrls) {
      if (!isAmazonCanadaUrl(sourceUrl)) continue;

      const page = await context.newPage();
      page.setDefaultTimeout(extractTimeoutMs);
      let addedFromSource = 0;

      try {
        await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: extractTimeoutMs });
        await page.waitForTimeout(1500);

        const pageProducts = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="/dp/"], a[href*="/gp/product/"]'));

          return links.map(link => {
            const href = link.href || '';
            const card = link.closest('[data-asin], .zg-grid-general-faceout, .s-result-item, li') || link;
            const title =
              card.querySelector('img')?.getAttribute('alt') ||
              card.querySelector('h2, .p13n-sc-truncate, .a-size-base-plus, .a-size-medium')?.textContent?.trim() ||
              link.textContent?.trim() ||
              '';
            const image = card.querySelector('img')?.getAttribute('src') || '';

            return { href, title, image };
          });
        });

        for (const product of pageProducts) {
          const asin = extractAsin(product.href);
          const title = cleanWhitespace(product.title);
          if (!asin || seenAsins.has(asin) || !title || !product.image || isExcludedDiscoveryTitle(title)) continue;
          seenAsins.add(asin);
          products.push({
            asin,
            product_url: `https://www.amazon.ca/dp/${asin}`,
            source_url: sourceUrl,
            title,
            image_url: product.image || '',
          });
          addedFromSource += 1;

          if (addedFromSource >= perSourceLimit) break;
        }
      } catch {
        // Keep discovery resilient. Amazon may throttle or change markup on any page.
      } finally {
        await page.close();
      }
    }

    return res.json({ products: products.slice(0, maxProducts), count: Math.min(products.length, maxProducts), sources: sourceUrls });
  } catch (error) {
    return res.status(422).json({ error: 'Unable to discover products' });
  } finally {
    if (browser) await browser.close();
  }
});

app.post('/extract', async (req, res) => {
  const { url, debug } = req.body || {};
  const debugMode = isDebugMode(debug);
  const validation = validateAmazonCanadaUrl(url);

  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      locale: 'en-CA',
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(extractTimeoutMs);
    const networkMediaRequests = [];

    if (debugMode) {
      await page.addInitScript(() => {
        window.__videoDebugHooks = {
          fetchRequests: [],
          xhrRequests: [],
          mediaSourceEvents: [],
        };

        const matchesVideoSignal = value =>
          /mp4|m3u8|videoplayback|playback|manifest|dash|hls/i.test(String(value || ''));

        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
          if (matchesVideoSignal(url)) {
            window.__videoDebugHooks.fetchRequests.push({ url, timestamp: Date.now() });
          }
          return originalFetch(...args);
        };

        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function captureOpen(method, url, ...rest) {
          this.__videoDebugUrl = url;
          this.__videoDebugMethod = method;
          return originalOpen.call(this, method, url, ...rest);
        };

        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function captureSend(...args) {
          if (matchesVideoSignal(this.__videoDebugUrl)) {
            window.__videoDebugHooks.xhrRequests.push({
              method: this.__videoDebugMethod || '',
              url: this.__videoDebugUrl || '',
              timestamp: Date.now(),
            });
          }
          return originalSend.apply(this, args);
        };

        if (window.MediaSource) {
          const originalAddSourceBuffer = MediaSource.prototype.addSourceBuffer;
          MediaSource.prototype.addSourceBuffer = function captureSourceBuffer(mimeType) {
            window.__videoDebugHooks.mediaSourceEvents.push({
              event: 'addSourceBuffer',
              mimeType,
              timestamp: Date.now(),
            });
            return originalAddSourceBuffer.call(this, mimeType);
          };
        }
      });

      page.on('request', request => {
        const requestUrl = request.url();
        const resourceType = request.resourceType();

        if (resourceType === 'media' || isVideoSignalUrl(requestUrl)) {
          networkMediaRequests.push({
            url: requestUrl,
            resourceType,
            method: request.method(),
          });
        }
      });
    }

    await page.goto(validation.url.href, {
      waitUntil: 'domcontentloaded',
      timeout: extractTimeoutMs,
    });

    const resolvedUrl = page.url();

    if (!isAmazonCanadaUrl(resolvedUrl)) {
      return res.status(400).json({
        error: 'url must resolve to amazon.ca',
        resolved_url: resolvedUrl,
      });
    }

    if (debugMode) {
      await page.waitForTimeout(15000);
      await clickVideoThumbnail(page);
      await page.waitForTimeout(5000);
    }

    const data = await page.evaluate(({ debug }) => {
      const text = selector => document.querySelector(selector)?.textContent?.trim() || '';
      const attr = (selector, name) => document.querySelector(selector)?.getAttribute(name) || '';

      const title = text('#productTitle') || attr('meta[property="og:title"]', 'content');
      const price =
        text('.a-price .a-offscreen') ||
        text('#priceblock_ourprice') ||
        text('#priceblock_dealprice') ||
        text('#corePriceDisplay_desktop_feature_div .a-offscreen');
      const rating =
        attr('#acrPopover', 'title') ||
        text('.a-icon-alt') ||
        text('[data-hook="rating-out-of-text"]');
      const salesSignal =
        text('#socialProofingAsinFaceout_feature_div') ||
        text('#social-proofing-faceout-title-tk_bought') ||
        text('[data-csa-c-content-id="social-proofing-faceout-title-tk_bought"]') ||
        Array.from(document.querySelectorAll('span, div'))
          .map(element => element.textContent?.trim() || '')
          .find(value => /bought in past month/i.test(value)) ||
        '';

      const imageCandidates = [
        attr('#landingImage', 'src'),
        attr('meta[property="og:image"]', 'content'),
        ...Array.from(document.querySelectorAll('#altImages img'))
          .map(img => img.getAttribute('src') || '')
          .filter(Boolean),
      ];

      const images = [...new Set(imageCandidates.filter(Boolean))];
      const canonical = attr('link[rel="canonical"]', 'href');
      const videoElement = document.querySelector('video');
      const videoSource =
        videoElement?.currentSrc ||
        videoElement?.src ||
        document.querySelector('video source')?.getAttribute('src') ||
        '';
      const videoPoster = videoElement?.poster || '';

      const scriptText = Array.from(document.scripts)
        .map(script => script.textContent || '')
        .join('\n');
      const scriptVideoSource =
        videoSource ||
        scriptText.match(/https?:\/\/[^"'\s]+\.(?:mp4|m3u8)(?:\?[^"'\s]*)?/i)?.[0] ||
        '';
      const scriptVideoPoster =
        videoPoster ||
        scriptText.match(/https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s]*)?/i)?.[0] ||
        '';

      const collectVideoDebug = () => {
        const videoUrlPattern = /https?:\/\/[^"'\s]*(?:mp4|m3u8|videoplayback|playback|manifest|dash|hls)[^"'\s]*/gi;
        const interestingScriptPattern = /\.mp4|\.m3u8|playback|video/i;
        const matchesVideoSignal = value =>
          /mp4|m3u8|videoplayback|playback|manifest|dash|hls/i.test(String(value || ''));
        const toAttrs = element =>
          Array.from(element.attributes || {}).reduce((attrs, attribute) => {
            attrs[attribute.name] = attribute.value;
            return attrs;
          }, {});

        const scripts = Array.from(document.scripts).map((script, index) => ({
          index,
          type: script.type || '',
          src: script.src || '',
          text: script.textContent || '',
        }));

        const scriptMatches = scripts
          .filter(script => script.src || interestingScriptPattern.test(script.text))
          .map(script => ({
            index: script.index,
            type: script.type,
            src: script.src,
            urls: [...new Set(script.text.match(videoUrlPattern) || [])],
            snippet: script.text.slice(0, 1000),
          }))
          .slice(0, 50);

        const jsonLdMatches = scripts
          .filter(script => script.type === 'application/ld+json')
          .map(script => ({
            index: script.index,
            urls: [...new Set(script.text.match(videoUrlPattern) || [])],
            snippet: script.text.slice(0, 1000),
          }))
          .filter(match => match.urls.length || /video|contentUrl|thumbnailUrl|embedUrl/i.test(match.snippet))
          .slice(0, 25);

        const performanceEntries = performance
          .getEntries()
          .filter(entry => matchesVideoSignal(entry.name) || entry.initiatorType === 'video')
          .map(entry => ({
            name: entry.name,
            entryType: entry.entryType,
            initiatorType: entry.initiatorType || '',
            duration: entry.duration,
            transferSize: entry.transferSize || 0,
          }))
          .slice(0, 100);

        const hooks = window.__videoDebugHooks || {
          fetchRequests: [],
          xhrRequests: [],
          mediaSourceEvents: [],
        };

        return {
          videoTags: Array.from(document.querySelectorAll('video')).map((video, index) => ({
            index,
            attrs: toAttrs(video),
            currentSrc: video.currentSrc || '',
            src: video.src || '',
            poster: video.poster || '',
            sourceCount: video.querySelectorAll('source').length,
          })),
          sourceTags: Array.from(document.querySelectorAll('source')).map((source, index) => ({
            index,
            attrs: toAttrs(source),
            src: source.src || source.getAttribute('src') || '',
            type: source.type || source.getAttribute('type') || '',
          })),
          scriptMatches,
          jsonLdMatches,
          performanceEntries,
          fetchRequests: hooks.fetchRequests || [],
          xhrRequests: hooks.xhrRequests || [],
          mediaSourceEvents: hooks.mediaSourceEvents || [],
        };
      };

      return {
        title,
        price,
        rating,
        salesSignal,
        images,
        canonical,
        video: {
          poster: scriptVideoPoster,
          source: scriptVideoSource,
        },
        videoDebug: debug ? collectVideoDebug() : undefined,
      };
    }, { debug: debugMode });

    const asin = extractAsin(resolvedUrl) || extractAsin(data.canonical || '') || extractAsin(validation.url.href);
    const productUrl = asin ? `https://www.amazon.ca/dp/${asin}` : resolvedUrl;
    const videoDebug = {
      ...emptyVideoDebug(),
      ...(data.videoDebug || {}),
      networkMediaRequests: uniqueByUrl(networkMediaRequests),
    };
    const video = extractMp4FromVideoTags(videoDebug.videoTags);
    const response = {
      asin: asin || '',
      title: data.title || '',
      price: data.price || '',
      rating: normalizeRating(data.rating),
      sales_signal: data.salesSignal || '',
      bought_past_month: parseBoughtPastMonth(data.salesSignal),
      images: data.images || [],
      video,
      product_url: productUrl,
      input_url: validation.url.href,
    };

    if (debugMode) {
      response.video_debug = videoDebug;
    }

    return res.json(response);
  } catch (error) {
    const timedOut = /timeout/i.test(error?.message || '');
    return res.status(timedOut ? 504 : 422).json({
      error: timedOut ? 'Extraction timed out' : 'Unable to extract product data',
    });
  } finally {
    if (browser) await browser.close();
  }
});

app.post('/creative', async (req, res) => {
  const {
    title = '',
    price = '',
    rating = '',
    sales_signal: salesSignal = '',
    image_url: imageUrl = '',
    brand = 'Smart Deals',
  } = req.body || {};

  if (!title || !imageUrl) {
    return res.status(400).json({ error: 'title and image_url are required' });
  }

  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    await page.setContent(buildCreativeHtml({ title, price, rating, salesSignal, imageUrl, brand }), {
      waitUntil: 'networkidle',
      timeout: extractTimeoutMs,
    });

    const buffer = await page.screenshot({ type: 'jpeg', quality: 92, fullPage: false });
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(buffer);
  } catch (error) {
    return res.status(422).json({ error: 'Unable to generate creative' });
  } finally {
    if (browser) await browser.close();
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  console.log(`amazon-product-scraper listening on port ${port}`);
});

function validateAmazonCanadaUrl(value) {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'url is required' };
  }

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const isAmazonCanada = host === 'amazon.ca' || host === 'www.amazon.ca';
    const isAmazonShortLink = host === 'amzn.to';

    if (!isAmazonCanada && !isAmazonShortLink) {
      return { valid: false, error: 'url must be from amazon.ca or amzn.to' };
    }

    return { valid: true, url: parsed };
  } catch {
    return { valid: false, error: 'url must be a valid URL' };
  }
}

function defaultDiscoverySources() {
  return [
    'https://www.amazon.ca/Best-Sellers-Electronics/zgbs/electronics',
    'https://www.amazon.ca/Best-Sellers-Video-Games/zgbs/videogames',
    'https://www.amazon.ca/Best-Sellers-Home-Kitchen/zgbs/kitchen',
    'https://www.amazon.ca/Best-Sellers-Beauty/zgbs/beauty',
    'https://www.amazon.ca/Best-Sellers-Toys-Games/zgbs/toys',
    'https://www.amazon.ca/Best-Sellers-Tools-Home-Improvement/zgbs/hi',
    'https://www.amazon.ca/Best-Sellers-Sports-Outdoors/zgbs/sports',
    'https://www.amazon.ca/Best-Sellers-Office-Products/zgbs/office-products',
    'https://www.amazon.ca/Best-Sellers-Health-Personal-Care/zgbs/hpc',
    'https://www.amazon.ca/Best-Sellers-Patio-Lawn-Garden/zgbs/lawn-garden',
    'https://www.amazon.ca/gp/movers-and-shakers/electronics',
    'https://www.amazon.ca/gp/movers-and-shakers/videogames',
    'https://www.amazon.ca/gp/movers-and-shakers/kitchen',
    'https://www.amazon.ca/gp/movers-and-shakers/home',
    'https://www.amazon.ca/gp/goldbox',
  ];
}

function buildCreativeHtml({ title, price, rating, salesSignal, imageUrl, brand }) {
  const safeTitle = escapeHtml(shortenProductTitle(title));
  const safePrice = escapeHtml(price || 'Check price');
  const safeRating = escapeHtml(formatRatingLabel(rating));
  const safeSalesSignal = escapeHtml(formatSalesSignal(salesSignal));
  const safeImageUrl = escapeHtml(imageUrl);
  const safeBrand = escapeHtml(brand || 'Smart Deals');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      width: 1080px;
      height: 1350px;
      margin: 0;
      font-family: Inter, Arial, sans-serif;
      background:
        radial-gradient(circle at 18% 12%, rgba(29, 78, 216, 0.55), transparent 28%),
        radial-gradient(circle at 88% 22%, rgba(14, 165, 233, 0.35), transparent 30%),
        linear-gradient(145deg, #06111f 0%, #0b1220 48%, #111827 100%);
      color: #f8fafc;
      overflow: hidden;
    }
    .wrap { width: 100%; height: 100%; padding: 64px; position: relative; }
    .top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 34px; }
    .brand { display: flex; align-items: center; gap: 18px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
    .logo {
      width: 74px; height: 74px; border-radius: 22px;
      display: grid; place-items: center;
      background: linear-gradient(135deg, #0ea5e9, #1d4ed8 55%, #020617);
      box-shadow: 0 20px 55px rgba(14, 165, 233, 0.35);
      font-size: 29px; font-weight: 950;
    }
    .badge {
      color: #0f172a; background: #facc15; border-radius: 999px;
      padding: 15px 24px; font-weight: 900; font-size: 24px;
      box-shadow: 0 12px 30px rgba(250, 204, 21, 0.26);
    }
    .deal { display: grid; grid-template-columns: 1fr 320px; gap: 30px; align-items: stretch; }
    .card {
      background: rgba(255,255,255,0.95);
      border-radius: 54px;
      padding: 40px;
      min-height: 620px;
      display: grid;
      place-items: center;
      box-shadow: 0 34px 120px rgba(0,0,0,0.42);
      border: 1px solid rgba(255,255,255,0.6);
    }
    .product { max-width: 660px; max-height: 540px; object-fit: contain; filter: drop-shadow(0 28px 35px rgba(15,23,42,0.18)); }
    .side {
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 36px 0 28px;
    }
    .label { color: #93c5fd; font-size: 27px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.09em; }
    .price { color: #facc15; font-size: 86px; font-weight: 950; letter-spacing: -0.065em; line-height: 0.92; margin-top: 14px; }
    .ctaBig {
      color: #020617; background: #f8fafc; border-radius: 999px;
      padding: 22px 28px; font-size: 31px; font-weight: 950; text-align: center;
      box-shadow: 0 18px 55px rgba(248,250,252,0.18);
    }
    .copy { margin-top: 38px; }
    h1 { margin: 0; font-size: 64px; line-height: 0.96; letter-spacing: -0.058em; max-width: 950px; }
    .meta { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 24px; }
    .pill {
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.09);
      border-radius: 999px;
      padding: 13px 18px;
      font-size: 24px;
      font-weight: 750;
      color: #dbeafe;
    }
    .footer {
      position: absolute; left: 64px; right: 64px; bottom: 54px;
      display: flex; align-items: center; justify-content: space-between;
      font-size: 27px; color: #cbd5e1;
    }
    .bio { color: #f8fafc; font-size: 30px; font-weight: 950; }
    .disclaimer { opacity: 0.82; font-size: 20px; max-width: 470px; }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="top">
      <div class="brand"><div class="logo">SD</div><div>${safeBrand}</div></div>
      <div class="badge">Amazon.ca Find</div>
    </section>
    <section class="deal">
      <div class="card"><img class="product" src="${safeImageUrl}" /></div>
      <aside class="side">
        <div>
          <div class="label">Today&apos;s price</div>
          <div class="price">${safePrice}</div>
        </div>
        <div class="ctaBig">Shop link in bio</div>
      </aside>
    </section>
    <section class="copy">
      <h1>${safeTitle}</h1>
      <div class="meta">
        <div class="pill">${safeRating}</div>
        ${safeSalesSignal ? `<div class="pill">${safeSalesSignal}</div>` : ''}
      </div>
    </section>
    <section class="footer">
      <div class="disclaimer">As an Amazon Associate I earn from qualifying purchases. #ad</div>
      <div class="bio">smart-deals-canada.com</div>
    </section>
  </main>
</body>
</html>`;
}

function shortenProductTitle(value) {
  const title = cleanWhitespace(value)
    .replace(/\bwith\b.*$/i, '')
    .replace(/\bfor\b.*$/i, '')
    .replace(/,.*$/, '')
    .trim();
  const words = (title || cleanWhitespace(value)).split(/\s+/).filter(Boolean);
  return words.slice(0, 8).join(' ') || 'Amazon.ca Deal';
}

function formatRatingLabel(value) {
  const match = String(value || '').match(/\d+(?:\.\d+)?/);
  return match ? `${match[0]} star rating` : 'Amazon.ca find';
}

function formatSalesSignal(value) {
  return String(value || '').split('{')[0].replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isAmazonCanadaUrl(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return host === 'amazon.ca' || host === 'www.amazon.ca';
  } catch {
    return false;
  }
}

function extractAsin(value) {
  const match = value.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i);
  return match?.[1]?.toUpperCase() || '';
}

function cleanWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isExcludedDiscoveryTitle(value) {
  return /credit card|gift card|subscription|auto-renewal|monthly plan|protection plan|warranty|insurance|membership|kindle unlimited|audible/i.test(
    value || ''
  );
}

function normalizeRating(value) {
  if (!value) return '';
  const match = String(value).match(/\d+(?:\.\d+)?/);
  return match?.[0] || '';
}

function parseBoughtPastMonth(value) {
  const match = String(value || '').match(/([\d,.]+)\s*\+?\s*bought in past month/i);

  if (!match) return null;

  const amount = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : null;
}

function isDebugMode(value) {
  return value === true || value === 'true';
}

function emptyVideoDebug() {
  return {
    videoTags: [],
    sourceTags: [],
    scriptMatches: [],
    jsonLdMatches: [],
    performanceEntries: [],
    fetchRequests: [],
    xhrRequests: [],
    mediaSourceEvents: [],
    networkMediaRequests: [],
  };
}

function normalizeVideo(video) {
  const source = video?.source || '';

  if (!source) {
    return { available: false };
  }

  return {
    available: true,
    poster: video?.poster || '',
    source,
    type: getVideoType(source),
  };
}

function extractMp4FromVideoTags(videoTags = []) {
  const match = videoTags.find(videoTag => isValidHttpMp4(videoTag?.src));

  if (!match) {
    return { available: false };
  }

  return {
    available: true,
    source: match.src,
    poster: match.poster || '',
    type: 'mp4',
  };
}

function isValidHttpMp4(value) {
  if (!/^https?:\/\//i.test(value || '')) return false;
  return String(value).split('?')[0].toLowerCase().endsWith('.mp4');
}

function getVideoType(source) {
  const cleanSource = String(source).split('?')[0].toLowerCase();

  if (cleanSource.endsWith('.mp4')) return 'mp4';
  if (cleanSource.endsWith('.m3u8')) return 'm3u8';
  return 'unknown';
}

function isVideoSignalUrl(value) {
  return /mp4|m3u8|videoplayback|playback|manifest|dash|hls/i.test(value || '');
}

function uniqueByUrl(requests) {
  const seen = new Set();

  return requests.filter(request => {
    if (!request.url || seen.has(request.url)) return false;
    seen.add(request.url);
    return true;
  });
}

async function clickVideoThumbnail(page) {
  const selectors = [
    '#videoBlock_feature_div',
    '#videoBlockIngress',
    '#videoBlockIngress_feature_div',
    '#altImages li.videoThumbnail',
    '#altImages .videoThumbnail',
    '#altImages [data-video-url]',
    '#altImages [data-action="main-image-click"]',
    '[data-action="video-block-player-trigger"]',
    '[aria-label*="video" i]',
    '[title*="video" i]',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();

    try {
      if ((await locator.count()) > 0 && (await locator.isVisible({ timeout: 1000 }))) {
        await locator.click({ timeout: 3000, force: true });
        return true;
      }
    } catch {
      // Try the next selector. Amazon frequently changes video thumbnail markup.
    }
  }

  try {
    return await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('img, span, div, button, li')).filter(element => {
        const text = `${element.textContent || ''} ${element.getAttribute('alt') || ''} ${element.getAttribute('title') || ''} ${element.getAttribute('aria-label') || ''} ${element.className || ''}`;
        return /video|play/i.test(text);
      });

      const target = candidates.find(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      if (!target) return false;
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return true;
    });
  } catch {
    return false;
  }
}
