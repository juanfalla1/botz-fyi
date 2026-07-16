import express from 'express';
import { chromium } from 'playwright';
import sharp from 'sharp';

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
  const maxProducts = Math.max(1, Math.min(Number(limit) || 24, 200));
  const perSourceLimit = Math.max(4, Math.ceil(maxProducts / Math.max(sourceUrls.length, 1)));

  try {
    const products = [];
    const seenAsins = new Set();

    for (const sourceUrl of sourceUrls) {
      if (!isAmazonCanadaUrl(sourceUrl)) continue;

      let addedFromSource = 0;

      try {
        const response = await fetch(sourceUrl, {
          signal: AbortSignal.timeout(extractTimeoutMs),
          headers: {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'accept-language': 'en-CA,en;q=0.9',
            'cache-control': 'no-cache',
            'user-agent':
              'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
          },
        });

        if (!response.ok) continue;

        const html = await response.text();
        const pageProducts = discoverProductsFromHtml(html, sourceUrl);

        for (const product of pageProducts) {
          const asin = product.asin || extractAsin(product.href || product.product_url || '');
          const title = cleanWhitespace(product.title);
          if (!asin || seenAsins.has(asin) || !title || !product.image_url || isExcludedDiscoveryTitle(title)) continue;
          seenAsins.add(asin);
          products.push({
            asin,
            product_url: `https://www.amazon.ca/dp/${asin}`,
            source_url: sourceUrl,
            title,
            image_url: product.image_url || '',
          });
          addedFromSource += 1;

          if (addedFromSource >= perSourceLimit) break;
        }
      } catch {
        // Keep discovery resilient. Amazon may throttle or change markup on any page.
      }
    }

    return res.json({ products: products.slice(0, maxProducts), count: Math.min(products.length, maxProducts), sources: sourceUrls });
  } catch (error) {
    return res.status(422).json({ error: 'Unable to discover products' });
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
    browser = await chromium.launch(chromiumLaunchOptions());
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
      const ratingFromPage = () => {
        const directCandidates = [
          attr('#acrPopover', 'title'),
          attr('#acrPopover', 'aria-label'),
          text('#acrPopover .a-icon-alt'),
          text('[data-hook="average-star-rating"] .a-icon-alt'),
          text('[data-hook="rating-out-of-text"]'),
          text('.reviewCountTextLinkedHistogram .a-icon-alt'),
          text('i.a-icon-star .a-icon-alt'),
          text('.a-icon-star .a-icon-alt'),
        ];

        for (const candidate of directCandidates) {
          if (/\d+(?:\.\d+)?\s*out of\s*5|\d+(?:\.\d+)?\s*stars?/i.test(candidate || '')) return candidate;
        }

        const attributeCandidate = Array.from(document.querySelectorAll('[aria-label], [title], .a-icon-alt'))
          .flatMap(element => [
            element.getAttribute('aria-label') || '',
            element.getAttribute('title') || '',
            element.textContent || '',
          ])
          .map(value => value.trim())
          .find(value => /\d+(?:\.\d+)?\s*out of\s*5\s*stars?|\d+(?:\.\d+)?\s*stars?/i.test(value));

        return attributeCandidate || '';
      };
      const priceFromParts = () => {
        const containers = Array.from(document.querySelectorAll('.a-price, #corePriceDisplay_desktop_feature_div, #apex_desktop'));

        for (const container of containers) {
          const offscreen = container.querySelector('.a-offscreen')?.textContent?.trim();
          if (/\$\s*\d/.test(offscreen || '')) return offscreen;

          const whole = container.querySelector('.a-price-whole')?.textContent?.trim() || '';
          const fraction = container.querySelector('.a-price-fraction')?.textContent?.trim() || '00';
          const dollars = whole.replace(/[^0-9]/g, '');
          const cents = fraction.replace(/[^0-9]/g, '').slice(0, 2).padEnd(2, '0');

          if (dollars) return `$${dollars}.${cents}`;
        }

        const bodyMatch = document.body?.textContent?.match(/\$\s*\d{1,4}(?:[,.]\d{3})*(?:\.\d{2})?/);
        return bodyMatch?.[0] || '';
      };

      const title = text('#productTitle') || attr('meta[property="og:title"]', 'content');
      const price =
        text('#corePriceDisplay_desktop_feature_div .a-price .a-offscreen') ||
        text('#apex_desktop .a-price .a-offscreen') ||
        text('.a-price .a-offscreen') ||
        text('#priceblock_ourprice') ||
        text('#priceblock_dealprice') ||
        text('#corePriceDisplay_desktop_feature_div .a-offscreen') ||
        priceFromParts();
      const rating = ratingFromPage();
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
    const fallbackData = !data.title || !data.price || !data.images?.length
      ? await fetchProductDataFallback(validation.url.href).catch(() => null)
      : null;

    const mergedTitle = data.title || fallbackData?.title || '';
    const mergedPrice = data.price || fallbackData?.price || '';
    const mergedRating = normalizeRating(data.rating) || normalizeRating(fallbackData?.rating || '');
    const mergedImages = await filterProductImages(data.images?.length ? data.images : fallbackData?.images || []);
    const mergedSalesSignal = data.salesSignal || fallbackData?.salesSignal || '';

    const response = {
      asin: asin || '',
      title: mergedTitle,
      price: mergedPrice,
      rating: mergedRating,
      sales_signal: mergedSalesSignal,
      bought_past_month: parseBoughtPastMonth(mergedSalesSignal),
      images: mergedImages,
      video,
      product_url: productUrl,
      input_url: validation.url.href,
    };

    if (debugMode) {
      response.video_debug = videoDebug;
    }

    return res.json(response);
  } catch (error) {
    const fallbackData = await fetchProductDataFallback(validation.url.href).catch(() => null);
    if (fallbackData?.title && fallbackData?.price && fallbackData?.images?.length) {
      const fallbackAsin = extractAsin(fallbackData.product_url || '') || extractAsin(validation.url.href);
      return res.json({
        asin: fallbackAsin || '',
        title: fallbackData.title,
        price: fallbackData.price,
        rating: normalizeRating(fallbackData.rating),
        sales_signal: fallbackData.salesSignal || '',
        bought_past_month: parseBoughtPastMonth(fallbackData.salesSignal),
        images: await filterProductImages(fallbackData.images),
        video: { poster: '', source: '' },
        product_url: fallbackAsin ? `https://www.amazon.ca/dp/${fallbackAsin}` : fallbackData.product_url || validation.url.href,
        input_url: validation.url.href,
      });
    }

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

  try {
    const buffer = await renderCreativeJpeg({ title, price, rating, salesSignal, imageUrl, brand });
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(buffer);
  } catch (error) {
    return res.status(422).json({ error: 'Unable to generate creative', detail: error?.message || '' });
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

function chromiumLaunchOptions() {
  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
    ],
  };
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
    'https://www.amazon.ca/Best-Sellers-Automotive/zgbs/automotive',
    'https://www.amazon.ca/Best-Sellers-Baby/zgbs/baby',
    'https://www.amazon.ca/Best-Sellers-Cell-Phones-Accessories/zgbs/wireless',
    'https://www.amazon.ca/Best-Sellers-Clothing-Shoes-Jewelry/zgbs/fashion',
    'https://www.amazon.ca/Best-Sellers-Musical-Instruments/zgbs/musical-instruments',
    'https://www.amazon.ca/Best-Sellers-Pet-Supplies/zgbs/pet-supplies',
    'https://www.amazon.ca/gp/movers-and-shakers/electronics',
    'https://www.amazon.ca/gp/movers-and-shakers/videogames',
    'https://www.amazon.ca/gp/movers-and-shakers/kitchen',
    'https://www.amazon.ca/gp/movers-and-shakers/home',
    'https://www.amazon.ca/gp/movers-and-shakers/beauty',
    'https://www.amazon.ca/gp/movers-and-shakers/hpc',
    'https://www.amazon.ca/gp/movers-and-shakers/sports',
    'https://www.amazon.ca/gp/movers-and-shakers/tools',
    'https://www.amazon.ca/gp/goldbox',
    'https://www.amazon.ca/s?k=wireless+earbuds&rh=p_72%3A11192170011',
    'https://www.amazon.ca/s?k=phone+charger&rh=p_72%3A11192170011',
    'https://www.amazon.ca/s?k=bluetooth+speaker&rh=p_72%3A11192170011',
    'https://www.amazon.ca/s?k=kitchen+gadgets&rh=p_72%3A11192170011',
    'https://www.amazon.ca/s?k=air+fryer+accessories&rh=p_72%3A11192170011',
    'https://www.amazon.ca/s?k=home+organization&rh=p_72%3A11192170011',
    'https://www.amazon.ca/s?k=vacuum+cleaner&rh=p_72%3A11192170011',
    'https://www.amazon.ca/s?k=skin+care&rh=p_72%3A11192170011',
    'https://www.amazon.ca/s?k=gaming+accessories&rh=p_72%3A11192170011',
    'https://www.amazon.ca/s?k=pet+supplies&rh=p_72%3A11192170011',
    'https://www.amazon.ca/s?k=camping+gear&rh=p_72%3A11192170011',
    'https://www.amazon.ca/s?k=car+accessories&rh=p_72%3A11192170011',
  ];
}

async function fetchProductDataFallback(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(extractTimeoutMs),
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-CA,en;q=0.9',
      'cache-control': 'no-cache',
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    },
  });

  if (!response.ok) throw new Error(`Fallback fetch failed: ${response.status}`);

  const html = await response.text();
  const canonical = extractHtmlAttribute(html, 'link', 'rel', 'canonical', 'href');
  const asin = extractAsin(canonical) || extractAsin(url);
  const title =
    cleanWhitespace(decodeHtml(stripTags(extractById(html, 'productTitle')))) ||
    cleanWhitespace(decodeHtml(extractMetaContent(html, 'og:title'))) ||
    cleanWhitespace(decodeHtml(extractHtmlTitle(html)));
  const price = extractHtmlPrice(html);
  const rating = extractHtmlRating(html);
  const salesSignal = cleanWhitespace(
    decodeHtml(
      stripTags(
        html.match(/([\d,.]+\+?\s+bought in past month)/i)?.[1] || ''
      )
    )
  );
  const image = await selectProductImage([
    html.match(/id=["']landingImage["'][^>]+src=["']([^"']+)["']/i)?.[1] || '',
    extractMetaContent(html, 'og:image'),
    html.match(/src=["']([^"']*m\.media-amazon\.com\/images\/I\/[^"']*)["']/i)?.[1] || '',
  ]);

  return {
    asin,
    title,
    price,
    rating,
    salesSignal,
    images: image ? [image] : [],
    product_url: asin ? `https://www.amazon.ca/dp/${asin}` : canonical || url,
  };
}

async function filterProductImages(images) {
  const valid = [];
  const seen = new Set();

  for (const image of images || []) {
    const url = decodeHtml(String(image || '').trim());
    if (!url || seen.has(url)) continue;
    seen.add(url);

    if (await isValidProductImage(url)) valid.push(url);
    if (valid.length >= 8) break;
  }

  return valid;
}

async function selectProductImage(images) {
  const valid = await filterProductImages(images);
  return valid[0] || '';
}

async function isValidProductImage(url) {
  if (!/^https?:\/\/m\.media-amazon\.com\/images\/I\//i.test(url)) return false;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(Math.min(extractTimeoutMs, 15000)),
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'user-agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      },
    });

    if (!response.ok) return false;

    const buffer = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    const width = Number(metadata.width || 0);
    const height = Number(metadata.height || 0);
    const ratio = width && height ? width / height : 0;

    return width >= 200 && height >= 200 && ratio >= 0.35 && ratio <= 2.2;
  } catch {
    return false;
  }
}

function extractHtmlPrice(html) {
  const patterns = [
    /<span[^>]+class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*(\$\s*\d[\d,.]*)\s*<\/span>/i,
    /<span[^>]+id=["']priceblock_(?:ourprice|dealprice|saleprice)["'][^>]*>\s*(\$\s*\d[\d,.]*)\s*<\/span>/i,
    /"price"\s*:\s*"?(\d+(?:\.\d{1,2})?)"?/i,
    /\$\s*\d{1,4}(?:,\d{3})*(?:\.\d{2})?/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    const value = match[1] || match[0];
    const normalized = cleanWhitespace(decodeHtml(stripTags(value)));
    if (/^\$/.test(normalized)) return normalized;
    if (/^\d/.test(normalized)) return `$${normalized}`;
  }

  const whole = html.match(/class=["'][^"']*a-price-whole[^"']*["'][^>]*>\s*([\d,.]+)/i)?.[1] || '';
  const fraction = html.match(/class=["'][^"']*a-price-fraction[^"']*["'][^>]*>\s*(\d{2})/i)?.[1] || '00';
  const dollars = whole.replace(/[^0-9]/g, '');
  return dollars ? `$${dollars}.${fraction}` : '';
}

function extractHtmlRating(html) {
  const patterns = [
    /(?:title|aria-label)=["']([^"']*\d+(?:\.\d+)?\s*out of\s*5\s*stars?[^"']*)["']/i,
    /<span[^>]+class=["'][^"']*a-icon-alt[^"']*["'][^>]*>\s*([^<]*\d+(?:\.\d+)?\s*out of\s*5\s*stars?[^<]*)\s*<\/span>/i,
    /<span[^>]+data-hook=["']rating-out-of-text["'][^>]*>\s*([^<]*\d+(?:\.\d+)?[^<]*)\s*<\/span>/i,
    /\b(\d+(?:\.\d+)?)\s*out of\s*5\s*stars?\b/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    const value = cleanWhitespace(decodeHtml(stripTags(match[1] || match[0])));
    if (normalizeRating(value)) return value;
  }

  return '';
}

function extractById(html, id) {
  const match = html.match(new RegExp(`<[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i'));
  return match?.[1] || '';
}

function extractMetaContent(html, property) {
  const propertyMatch = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escapeRegExp(property)}["'][^>]+content=["']([^"']+)["']`, 'i'));
  if (propertyMatch) return decodeHtml(propertyMatch[1]);
  const contentFirstMatch = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapeRegExp(property)}["']`, 'i'));
  return contentFirstMatch ? decodeHtml(contentFirstMatch[1]) : '';
}

function extractHtmlTitle(html) {
  return stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s*:\s*Amazon\.ca.*$/i, '');
}

function extractHtmlAttribute(html, tag, selectorAttr, selectorValue, outputAttr = selectorAttr) {
  const tagMatch = html.match(new RegExp(`<${tag}[^>]+${selectorAttr}=["'][^"']*${escapeRegExp(selectorValue)}[^"']*["'][^>]*>`, 'i'));
  if (!tagMatch) return '';
  const attrMatch = tagMatch[0].match(new RegExp(`${outputAttr}=["']([^"']+)["']`, 'i'));
  return attrMatch?.[1] || stripTags(tagMatch[0]);
}

async function renderCreativeJpeg({ title, price, rating, salesSignal, imageUrl, brand }) {
  const imageResponse = await fetch(imageUrl, {
    signal: AbortSignal.timeout(extractTimeoutMs),
    headers: {
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    },
  });

  if (!imageResponse.ok) {
    throw new Error(`Unable to fetch product image: ${imageResponse.status}`);
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const imageMime = imageResponse.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  const imageDataUri = `data:${imageMime};base64,${imageBuffer.toString('base64')}`;
  const svg = buildCreativeSvg({ title, price, rating, salesSignal, imageDataUri, brand });

  return sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

function buildCreativeSvg({ title, price, rating, salesSignal, imageDataUri, brand }) {
  const titleLines = wrapSvgText(shortenProductTitle(title), 25, 3);
  const safeBrand = escapeXml(brand || 'Smart Deals');
  const safePrice = escapeXml(price || 'Check price');
  const safeRating = escapeXml(formatRatingLabel(rating));
  const safeSalesSignal = escapeXml(formatSalesSignal(salesSignal));
  const titleSvg = titleLines
    .map((line, index) => `<text x="64" y="${860 + index * 66}" class="title">${escapeXml(line)}</text>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#06111f"/>
      <stop offset="0.52" stop-color="#0b1220"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
    <radialGradient id="glow1" cx="18%" cy="12%" r="42%"><stop stop-color="#1d4ed8" stop-opacity="0.55"/><stop offset="1" stop-color="#1d4ed8" stop-opacity="0"/></radialGradient>
    <radialGradient id="glow2" cx="88%" cy="22%" r="38%"><stop stop-color="#0ea5e9" stop-opacity="0.35"/><stop offset="1" stop-color="#0ea5e9" stop-opacity="0"/></radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="30" stdDeviation="38" flood-color="#000" flood-opacity="0.42"/></filter>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="26" stdDeviation="24" flood-color="#0f172a" flood-opacity="0.18"/></filter>
    <style>
      .font { font-family: Arial, Helvetica, sans-serif; }
      .brand { font: 900 24px Arial, Helvetica, sans-serif; letter-spacing: 5px; fill: #f8fafc; }
      .badge { font: 900 24px Arial, Helvetica, sans-serif; fill: #0f172a; }
      .label { font: 900 27px Arial, Helvetica, sans-serif; letter-spacing: 3px; fill: #93c5fd; }
      .price { font: 900 84px Arial, Helvetica, sans-serif; fill: #facc15; }
      .cta { font: 900 31px Arial, Helvetica, sans-serif; fill: #020617; }
      .title { font: 900 58px Arial, Helvetica, sans-serif; fill: #f8fafc; letter-spacing: -2px; }
      .pill { font: 700 24px Arial, Helvetica, sans-serif; fill: #dbeafe; }
      .footer { font: 400 20px Arial, Helvetica, sans-serif; fill: #cbd5e1; opacity: 0.82; }
      .bio { font: 900 30px Arial, Helvetica, sans-serif; fill: #f8fafc; }
    </style>
  </defs>
  <rect width="1080" height="1350" fill="url(#bg)"/>
  <rect width="1080" height="1350" fill="url(#glow1)"/>
  <rect width="1080" height="1350" fill="url(#glow2)"/>
  <rect x="64" y="64" width="74" height="74" rx="22" fill="#1d4ed8"/>
  <text x="101" y="111" text-anchor="middle" class="brand" style="letter-spacing:0">SD</text>
  <text x="160" y="111" class="brand">${safeBrand.toUpperCase()}</text>
  <rect x="820" y="76" width="196" height="58" rx="29" fill="#facc15"/>
  <text x="918" y="113" text-anchor="middle" class="badge">Amazon.ca Find</text>
  <rect x="64" y="172" width="696" height="620" rx="54" fill="#ffffff" opacity="0.96" filter="url(#shadow)"/>
  <image href="${imageDataUri}" x="150" y="250" width="524" height="460" preserveAspectRatio="xMidYMid meet" filter="url(#soft)"/>
  <text x="808" y="300" class="label">TODAY'S PRICE</text>
  <text x="808" y="390" class="price">${safePrice}</text>
  <rect x="792" y="700" width="230" height="76" rx="38" fill="#f8fafc"/>
  <text x="907" y="748" text-anchor="middle" class="cta">Link in bio</text>
  ${titleSvg}
  <rect x="64" y="1088" width="190" height="50" rx="25" fill="#ffffff" opacity="0.09" stroke="#ffffff" stroke-opacity="0.16"/>
  <text x="159" y="1122" text-anchor="middle" class="pill">${safeRating}</text>
  ${safeSalesSignal ? `<rect x="274" y="1088" width="360" height="50" rx="25" fill="#ffffff" opacity="0.09" stroke="#ffffff" stroke-opacity="0.16"/><text x="454" y="1122" text-anchor="middle" class="pill">${safeSalesSignal}</text>` : ''}
  <text x="64" y="1264" class="footer">As an Amazon Associate I earn from qualifying purchases. #ad</text>
  <text x="1016" y="1264" text-anchor="end" class="bio">smart-deals-canada.com</text>
</svg>`;
}

function wrapSvgText(value, maxChars, maxLines) {
  const words = cleanWhitespace(value).split(' ').filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }

  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\.*$/, '')}...`;
  }

  return lines.length ? lines : ['Amazon.ca Deal'];
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
  const match = value.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?#]|$)/i);
  return match?.[1]?.toUpperCase() || '';
}

function discoverProductsFromHtml(html, sourceUrl) {
  const products = [];
  const seen = new Set();
  const cardProducts = discoverProductCardsFromHtml(html, sourceUrl);

  for (const product of cardProducts) {
    if (seen.has(product.asin)) continue;
    seen.add(product.asin);
    products.push(product);
  }

  const linkPattern = /href=["']([^"']*\/(?:dp|gp\/product)\/([A-Z0-9]{10})[^"']*)["']/gi;
  let match;

  while ((match = linkPattern.exec(html)) && products.length < 120) {
    const asin = String(match[2] || '').toUpperCase();
    if (!asin || seen.has(asin)) continue;

    const start = Math.max(0, match.index - 1200);
    const end = Math.min(html.length, match.index + 1800);
    const chunk = html.slice(start, end);
    const image = extractDiscoveryImage(chunk);
    const title = extractDiscoveryTitle(chunk, asin);

    if (!title || !image) continue;

    seen.add(asin);
    products.push({
      asin,
      href: absolutizeAmazonUrl(match[1], sourceUrl),
      product_url: `https://www.amazon.ca/dp/${asin}`,
      title,
      image_url: image,
    });
  }

  return products;
}

function discoverProductCardsFromHtml(html, sourceUrl) {
  const products = [];
  const cardPattern = /<[^>]+data-asin=["']([A-Z0-9]{10})["'][^>]*>[\s\S]*?(?=<[^>]+data-asin=["'][A-Z0-9]{10}["']|<\/body>|$)/gi;
  let match;

  while ((match = cardPattern.exec(html)) && products.length < 120) {
    const asin = String(match[1] || '').toUpperCase();
    const card = match[0] || '';
    const hrefMatch = card.match(new RegExp(`href=["']([^"']*/(?:dp|gp/product)/${asin}[^"']*)["']`, 'i'));
    const image = extractDiscoveryImage(card);
    const title = extractDiscoveryTitle(card, asin);

    if (!asin || !hrefMatch || !title || !image || isExcludedDiscoveryTitle(title)) continue;

    products.push({
      asin,
      href: absolutizeAmazonUrl(hrefMatch[1], sourceUrl),
      product_url: `https://www.amazon.ca/dp/${asin}`,
      title,
      image_url: image,
    });
  }

  return products;
}

function extractDiscoveryImage(chunk) {
  const srcsetMatch = chunk.match(/srcset=["']([^"']*m\.media-amazon\.com[^"']*)["']/i);
  if (srcsetMatch) {
    const first = srcsetMatch[1].split(',')[0]?.trim().split(/\s+/)[0];
    if (first) return decodeHtml(first);
  }

  const srcMatch = chunk.match(/src=["']([^"']*m\.media-amazon\.com[^"']*)["']/i);
  return srcMatch ? decodeHtml(srcMatch[1]) : '';
}

function extractDiscoveryTitle(chunk, asin) {
  const altMatches = Array.from(chunk.matchAll(/<img\b[^>]*alt=["']([^"']{12,260})["'][^>]*>/gi));
  for (const match of altMatches) {
    const title = cleanWhitespace(decodeHtml(stripTags(match[1])));
    if (title && !isExcludedDiscoveryTitle(title) && !/sponsored|advertisement/i.test(title)) return title;
  }

  const textMatches = Array.from(chunk.matchAll(/<(?:span|div|a|h2)[^>]*(?:class|id)=["'][^"']*(?:truncate|title|a-size-base-plus|a-size-medium|p13n)[^"']*["'][^>]*>([\s\S]{12,500}?)<\/(?:span|div|a|h2)>/gi));
  for (const match of textMatches) {
    const title = cleanWhitespace(decodeHtml(stripTags(match[1])));
    if (title && title !== asin && !isExcludedDiscoveryTitle(title)) return title;
  }

  return '';
}

function absolutizeAmazonUrl(value, sourceUrl) {
  try {
    return new URL(decodeHtml(value), sourceUrl).href;
  } catch {
    return String(value || '');
  }
}

function stripTags(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ');
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
