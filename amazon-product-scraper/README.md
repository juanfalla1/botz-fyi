# amazon-product-scraper

Node.js + Express + Playwright microservice for Smart Deals automation.

Endpoints:

```http
GET /health
POST /discover
POST /extract
POST /creative
```

`/discover` finds Amazon.ca candidates from Best Sellers, Movers & Shakers and Goldbox. `/extract` scrapes product details. `/creative` returns a branded `image/jpeg` creative.

## Local

```bash
npm install
npm start
```

## Docker

```bash
docker build -t amazon-product-scraper .
docker run --rm -p 8080:8080 amazon-product-scraper
```

## Render

Deploy this folder as a Render web service so n8n does not depend on a local machine or ngrok.

Recommended setup:

- Service type: `Web Service`
- Environment: `Docker`
- Root Directory: `amazon-product-scraper`
- Dockerfile path: `./Dockerfile`
- Health check path: `/health`
- Instance: at least Starter, because Playwright/Chromium needs more memory than a tiny free instance.

Environment variables:

```text
NODE_ENV=production
PORT=8080
EXTRACT_TIMEOUT_MS=120000
```

After deployment, set this env var in n8n:

```text
SMART_DEALS_SCRAPER_URL=https://your-render-service.onrender.com
```

Then import the n8n workflow that uses `$env.SMART_DEALS_SCRAPER_URL` for `/discover`, `/extract` and `/creative`.
