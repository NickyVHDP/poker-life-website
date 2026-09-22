# Poker Life Website

Initial static storefront for the Poker Life book collection.

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
