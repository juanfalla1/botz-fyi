# Smart Deals Canada

Standalone landing for `smartdeals.ca`.

## Buying Flow

- Visitor opens `https://smartdeals.ca`.
- Visitor clicks `Buy on Amazon.ca`.
- Site routes through `/go/{ASIN}`.
- Visitor is redirected to `https://www.amazon.ca/dp/{ASIN}?tag={tracking_id}`.

## Vercel Environment Variables

```text
AMAZON_ASSOCIATES_TRACKING_ID=botzca-20
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
