const maxQuantity = 10;

// The browser submits only a slug and quantity. Names and prices stay here so
// a customer cannot alter an amount before Stripe Checkout is created.
const catalog = {
  'texas-holdem-in-texas': { name: 'Texas Hold’em in Texas', amount: 1499 },
  'winning-tournament-poker': { name: 'Winning Tournament Poker', amount: 1499 },
  'poker-math-made-easy': { name: 'Poker Math Made Easy', amount: 1299 },
  'is-he-bluffing': { name: 'Is He Bluffing?', amount: 1499 },
  'complete-guide-to-poker-for-women': { name: 'The Complete Guide to Poker for Women', amount: 1499 },
  'patient-poker-player-advanced-tactics': { name: 'The Patient Poker Player: Advanced Tactics to Outlast and Outplay', amount: 1499 },
  'i-just-ran-bad': { name: 'I Just Ran Bad and Other Lies Poker Players Tell Themselves', amount: 1499 },
  'final-table-secrets': { name: 'Final Table Secrets', amount: 1499 },
  'poker-tricks-traps-and-mind-games': { name: 'Poker Tricks, Traps, and Mind Games', amount: 1999 },
  'poker-what-the-pros-dont-want-you-to-know': { name: 'Poker: What the Pros Don’t Want You to Know', amount: 1499 },
  'poker-life-culture': { name: 'Poker Life: The Complete Guide to Poker Culture', amount: 1999 },
  'only-poker-book-youll-ever-need': { name: 'The Only Poker Book You’ll Ever Need', amount: 1999 },
  'patient-poker-player-win-more': { name: 'The Patient Poker Player: Win More by Playing Less', amount: 1499 }
};

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

const shippingRateVariables = {
  oneBook: 'STRIPE_SHIPPING_RATE_ID_ONE_BOOK',
  multipleBooks: 'STRIPE_SHIPPING_RATE_ID_MULTIPLE_BOOKS',
  freeOverOneHundred: 'STRIPE_SHIPPING_RATE_ID_FREE_OVER_100'
};

// Each rate must identify an active Shipping Rate in the same Stripe mode and
// account as STRIPE_SECRET_KEY. Countries are comma-separated ISO alpha-2
// codes in STRIPE_SHIPPING_COUNTRIES and default to US-only delivery.
function shippingConfiguration(env) {
  const rates = Object.fromEntries(Object.entries(shippingRateVariables).map(([tier, variable]) => [tier, env[variable]?.trim()]));
  if (Object.values(rates).some((rateId) => !rateId || !/^shr_[A-Za-z0-9]+$/.test(rateId))) return null;

  const countries = (env.STRIPE_SHIPPING_COUNTRIES || 'US')
    .split(',')
    .map((country) => country.trim().toUpperCase())
    .filter(Boolean);
  if (!countries.length || countries.some((country) => !/^[A-Z]{2}$/.test(country))) return null;

  return { rates, countries: [...new Set(countries)] };
}

function shippingRateForOrder(rates, quantity, subtotal) {
  if (subtotal > 10000) return rates.freeOverOneHundred;
  if (quantity === 1) return rates.oneBook;
  return rates.multipleBooks;
}

export function createCheckoutHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async (request) => {
    if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);

    const secretKey = env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return response({ error: 'Secure checkout is still being configured. Please try again shortly.' }, 503);
    }
    const shipping = shippingConfiguration(env);
    if (!shipping) {
      return response({ error: 'Secure shipping is still being configured. Please try again shortly.' }, 503);
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
    const totalQuantity = [...quantities.values()].reduce((total, quantity) => total + quantity, 0);
    const subtotal = [...quantities.entries()].reduce((total, [slug, quantity]) => total + catalog[slug].amount * quantity, 0);

    const siteUrl = (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
    const form = new URLSearchParams({
      mode: 'payment',
      'managed_payments[enabled]': 'false',
      'shipping_options[0][shipping_rate]': shippingRateForOrder(shipping.rates, totalQuantity, subtotal),
      success_url: `${siteUrl}/order-confirmed.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout.html`
    });
    shipping.countries.forEach((country, index) => {
      form.set(`shipping_address_collection[allowed_countries][${index}]`, country);
    });
    [...quantities.entries()].forEach(([slug, quantity], index) => {
      form.set(`line_items[${index}][price_data][currency]`, 'usd');
      form.set(`line_items[${index}][price_data][unit_amount]`, String(catalog[slug].amount));
      form.set(`line_items[${index}][price_data][product_data][name]`, catalog[slug].name);
      form.set(`line_items[${index}][price_data][product_data][tax_code]`, 'txcd_99999999');
      form.set(`line_items[${index}][quantity]`, String(quantity));
    });

    const stripeResponse = await fetchImpl('https://api.stripe.com/v1/checkout/sessions', {
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
}

export default createCheckoutHandler();
