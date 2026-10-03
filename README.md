# Poker Life Website

Poker Life's responsive storefront and lifestyle-brand website.

## Reference redesign

The homepage follows Larry's supplied black/gold design. The original 770 × 2043
artwork is preserved unchanged at `assets/poker-life-design-reference.png`.
Inline SVG viewports reuse its exact portraits, apparel, coins, and brand art;
section copy, navigation, buttons, search, and carousel controls are real HTML.
The artwork's original resolution is the limit on photographic sharpness.
Use the original full-resolution individual photos for a future asset upgrade.

- `theme-home.css` and `theme-home.js` own the responsive homepage and carousel.
- `theme-shared.css` and `theme-ui.js` own the shared black/gold theme and mobile navigation.
- `design/theme-header.html` and `design/theme-footer.html` are maintenance snippets;
  production pages contain their markup directly and work without client-side injection.
- The original 14-book catalog, prices, cart storage, and server checkout are unchanged.
- The mockup's first two featured covers open the existing paperback editions.
  “Behind the Felt,” apparel, and coins remain non-purchasable collection previews.
- Newsletter, community sign-up, and social destinations are not configured.
  The UI reports this honestly instead of claiming a subscription succeeded.
- Resource links are ordinary third-party links, not configured affiliate links.

Browser regression check: serve the site locally, install Playwright in your
development environment, and run `node test/design-smoke.mjs`.
Optional environment overrides: `PREVIEW_URL`, `PLAYWRIGHT_MODULE`, `CHROME_BIN`,
and `SCREENSHOT_DIR`. This tests layout at 320–1540px, search, book dialogs,
carousel, cart persistence, and the mobile menu without initiating a payment.

## What is included

- Premium dark/gold homepage design
- 14-book catalog sourced from the existing Stripe context
- Local-only newsletter form behavior
- Responsive layout with accessible controls
- Stripe-hosted checkout with verified order status and signed webhook records

## Notes

- Book checkout sessions use Stripe's live or test key set in Netlify. Payment methods are managed in Stripe; their availability varies by customer and device.
- The published `dist/` folder excludes server functions, dependencies, and tests.

## Payment configuration

Set these Netlify environment variables for Functions: `STRIPE_SECRET_KEY`,
`STRIPE_SHIPPING_RATE_ID_ONE_BOOK`, `STRIPE_SHIPPING_RATE_ID_MULTIPLE_BOOKS`,
`STRIPE_SHIPPING_RATE_ID_FREE_OVER_100`, and `STRIPE_WEBHOOK_SECRET`.
`SITE_URL` and `STRIPE_SHIPPING_COUNTRIES` are optional.

Create a Stripe webhook destination for
`https://pokerlifeusa.com/.netlify/functions/stripe-webhook` in live mode.
Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, and `payment_intent.payment_failed`.
Store its signing secret in Netlify as
`STRIPE_WEBHOOK_SECRET`; never put it in this repository. After adding or changing
the variable, redeploy so the function receives it. Paid orders and handled event
IDs are stored in the site's private `poker-life-orders` Netlify Blobs store.

The return page asks Stripe for the session's current payment status and only
clears purchased cart items after Stripe reports `paid`. A signed webhook also
records orders when the buyer does not return to the site. Neither a return URL
nor a webhook event with `payment_status` other than `paid` marks an order paid.

## Run locally

Run `npm install`, `npm test`, and `npm run build`. Serve `dist/` as static files;
use Netlify Dev or a deployed Netlify site to exercise the functions.
