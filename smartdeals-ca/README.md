# Smart Deals Canada

Standalone landing for `smartdeals.ca`.

## How It Updates

- n8n discovers and publishes Amazon.ca products.
- n8n saves product data in Supabase `amazon_affiliate_products`.
- n8n saves successful posts in Supabase `amazon_affiliate_publications` with `status = posted`.
- This site reads those Supabase tables on every page load.
- Product cards appear automatically after publication. No manual page edits are needed.

## Buying Flow

- Visitor opens `https://smartdeals.ca`.
- Visitor clicks `Buy on Amazon.ca`.
- Site routes through `/go/{ASIN}`.
- Click is logged to `amazon_affiliate_performance_events`.
- Visitor is redirected to `https://www.amazon.ca/dp/{ASIN}?tag={tracking_id}`.

## Vercel Environment Variables

```text
NEXT_PUBLIC_SUPABASE_URL=https://odjlbtfxxqdihqaswtky.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
AMAZON_ASSOCIATES_TRACKING_ID=bb1zca-20
NEXT_PUBLIC_SITE_URL=https://smartdeals.ca
```

## Deploy

Create a new Vercel project using this folder as the root directory:

```text
smartdeals-ca
```

Then connect the domain:

```text
smartdeals.ca
```
