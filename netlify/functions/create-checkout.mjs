const maxQuantity = 10;

// The browser submits only a slug and quantity. Product IDs and prices stay
// here so a customer cannot alter an amount before Stripe Checkout is created.
const catalog = {
  'texas-holdem-in-texas': { product: 'prod_V5M6S47uh2OTDj', amount: 999 },
  'winning-tournament-poker': { product: 'prod_V5M36LwWoLfcll', amount: 999 },
  'poker-math-made-easy': { product: 'prod_V5M5SXZsMsm0UH', amount: 999 },
  'is-he-bluffing': { product: 'prod_V5M4xs6NLcJeMv', amount: 999 },
  'complete-guide-to-poker-for-women': { product: 'prod_V5Ls63twEpzvcO', amount: 999 },
  'patient-poker-player-advanced-tactics': { product: 'prod_V5M7eUl26s4Eor', amount: 999 },
  'i-just-ran-bad': { product: 'prod_V5Lu613QFh02tS', amount: 999 },
  'final-table-secrets': { product: 'prod_V5MKGW33Jeaelc', amount: 999 },
  'poker-tricks-traps-and-mind-games': { product: 'prod_V5MJmm1s0atwAU', amount: 999 },
  'poker-players-joke-book': { product: 'prod_V5M9R49HBZ96mz', amount: 999 },
  'poker-life-culture': { product: 'prod_V5MMT3old0zpn7', amount: 1299 },
  'only-poker-book-youll-ever-need': { product: 'prod_V5MI1d8ScevuKz', amount: 999 },
  'patient-poker-player-win-more': { product: 'prod_V5M8ZouRjmNweD', amount: 999 }
};

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export default async (request) => {
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return response({ error: 'Secure checkout is still being configured. Please try again shortly.' }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return response({ error: 'The cart could not be read.' }, 400);
  }

  if (!Array.isArray(body.items) || !body.items.length) return response({ error: 'Your cart is empty.' }, 400);

  const quantities = new Map();
  for (const item of body.items) {
    const slug = typeof item?.slug === 'string' ? item.slug : '';
    const quantity = Number(item?.quantity);
    if (!slug || !Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity || !catalog[slug]) {
      return response({ error: 'One or more cart items are not available for checkout.' }, 400);
    }
    quantities.set(slug, Math.min((quantities.get(slug) || 0) + quantity, maxQuantity));
  }

  const siteUrl = (process.env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
  const form = new URLSearchParams({
    mode: 'payment',
    success_url: `${siteUrl}/order-confirmed.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/checkout.html`
  });
  [...quantities.entries()].forEach(([slug, quantity], index) => {
    form.set(`line_items[${index}][price_data][currency]`, 'usd');
    form.set(`line_items[${index}][price_data][unit_amount]`, String(catalog[slug].amount));
    form.set(`line_items[${index}][price_data][product]`, catalog[slug].product);
    form.set(`line_items[${index}][quantity]`, String(quantity));
  });

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form
  });
  const stripe = await stripeResponse.json();
  if (!stripeResponse.ok || !stripe.url) {
    return response({ error: 'Stripe could not start checkout. Please try again.' }, 502);
  }
  return response({ url: stripe.url });
};
