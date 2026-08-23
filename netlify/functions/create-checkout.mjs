const maxQuantity = 10;

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function configuredPrices() {
  try {
    const priceMap = JSON.parse(process.env.STRIPE_PRICE_MAP || '{}');
    return priceMap && typeof priceMap === 'object' ? priceMap : {};
  } catch {
    return {};
  }
}

export default async (request) => {
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceMap = configuredPrices();
  if (!secretKey || !Object.keys(priceMap).length) {
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
    if (!slug || !Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity || !priceMap[slug]) {
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
    form.set(`line_items[${index}][price]`, priceMap[slug]);
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
