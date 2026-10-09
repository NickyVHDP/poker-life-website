import { randomUUID } from 'node:crypto';
import { ripplePreorderConfig, validShipMonth, preorderCutoff } from '../../ripple-preorder-config.js';

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
  'patient-poker-player-win-more': { name: 'The Patient Poker Player: Win More by Playing Less', amount: 1499 },
  'f-ked-on-the-river': { name: 'F#@KED on the River', amount: 1099 }
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

const preorderSlugs = new Set(['ripple-pink-preorder', 'ripple-series-preorder']);
const oneDay = 86400000;
// Stripe requires at least 30 minutes from session creation; allow API transit.
const preorderSessionDuration = 31 * 60 * 1000;
function dateTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null;
}

function cutoffTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)) return null;
  if (dateTimestamp(value.slice(0, 10)) === null) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function preorderCheckoutDisclosure(offer, schedule, countries) {
  const dates = schedule.map(entry => entry.estimatedShipMonth
    ? `${entry.volume}: estimated shipping ${new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${entry.estimatedShipMonth}-01T00:00:00Z`))}.`
    : entry.arrivalDate
    ? `${entry.volume}: arrives ${entry.arrivalDate}; release ${entry.releaseDate}.`
    : `${entry.volume}: ships ${entry.shipDate}; release ${entry.releaseDate}.`).join('\n');
  const shipping = offer.shippingAmount === 0
    ? 'Free (USD $0.00)'
    : `USD $${(offer.shippingAmount / 100).toFixed(2)}`;
  return `Paid preorder. ${offer.termsText.trim()}\n\n${dates}\nShipping: ${shipping}. Eligible countries: ${countries.join(', ')} only.`;
}

function configuredPreorder(config, slug) {
  if (config?.enabled !== true || typeof config.termsVersion !== 'string' || !config.termsVersion.trim() || config.termsVersion.length > 100) return null;
  if (!Array.isArray(config.countries) || !config.countries.length || config.countries.some(country => typeof country !== 'string' || !/^[A-Z]{2}$/.test(country))) return null;
  const bundle = slug === 'ripple-series-preorder';
  const offer = bundle ? config.bundle : config.pink;
  if (!offer || offer.enabled !== true || offer.slug !== slug || offer.amount !== (bundle ? 10000 : 2500)) return null;
  if (typeof offer.title !== 'string' || !offer.title.trim() || offer.title.length > 120) return null;
  if (typeof offer.termsText !== 'string' || !offer.termsText.trim() || offer.termsText.length > 500) return null;
  const estimated = !bundle && offer.estimatedShipMonth != null;
  if (estimated && !validShipMonth(offer.estimatedShipMonth)) return null;
  const cutoff = estimated && offer.purchaseCutoffAt == null ? preorderCutoff(offer) : cutoffTimestamp(offer.purchaseCutoffAt);
  if (cutoff === null || !Number.isFinite(cutoff)) return null;
  let schedule;
  if (bundle) {
    if (!Array.isArray(offer.volumes) || offer.volumes.join(',') !== 'Pink,Blue,Red,Yellow,Black') return null;
    if (!Number.isInteger(offer.shippingAmount) || offer.shippingAmount < 0 || offer.shippingAmount > 100000) return null;
    if (!Array.isArray(offer.schedule) || offer.schedule.length !== 5) return null;
    schedule = [];
    for (const volume of offer.volumes) {
      const entries = offer.schedule.filter(entry => entry?.volume === volume);
      if (entries.length !== 1) return null;
      const { releaseDate, arrivalDate } = entries[0];
      const release = dateTimestamp(releaseDate), arrival = dateTimestamp(arrivalDate);
      if (release === null || arrival === null || release - arrival !== 7 * oneDay) return null;
      schedule.push({ volume, releaseDate, arrivalDate });
    }
    // The owner chooses sufficient delivery lead time; never infer it here.
    if (cutoff >= Math.min(...schedule.map(entry => dateTimestamp(entry.arrivalDate)))) return null;
  } else if (estimated) {
    // An approved month is sufficient; never invent exact release/shipping days.
    if (offer.shippingAmount !== 0 || offer.releaseDate != null || offer.shipDate != null) return null;
    const windowEnd = preorderCutoff({ estimatedShipMonth: offer.estimatedShipMonth });
    if (cutoff > windowEnd) return null;
    schedule = [{ volume: 'Pink', estimatedShipMonth: offer.estimatedShipMonth }];
  } else {
    const release = dateTimestamp(offer.releaseDate), ship = dateTimestamp(offer.shipDate);
    if (release === null || ship === null || ship > release || offer.shippingAmount !== 0) return null;
    schedule = [{ volume: 'Pink', releaseDate: offer.releaseDate, shipDate: offer.shipDate }];
    if (cutoff > ship || cutoff >= release) return null;
  }
  const countries = [...new Set(config.countries)];
  if (countries.join(',').length > 500) return null;
  const checkoutDisclosure = preorderCheckoutDisclosure(offer, schedule, countries);
  // Stripe custom_text.submit.message allows 1,200 characters. Never truncate
  // agreed terms or dates to fit: keep checkout closed until the copy is concise.
  if (checkoutDisclosure.length > 1200) return null;
  return { offer, bundle, schedule, cutoff, countries, checkoutDisclosure, termsVersion: config.termsVersion };
}

function setMetadata(form, metadata) {
  for (const [key, value] of Object.entries(metadata)) {
    form.set(`metadata[${key}]`, String(value));
    form.set(`payment_intent_data[metadata][${key}]`, String(value));
  }
}

export function createCheckoutHandler({ env = process.env, fetchImpl = fetch, preorderConfig = ripplePreorderConfig, now = () => new Date() } = {}) {
  return async (request) => {
    if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);

    const secretKey = env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return response({ error: 'Secure checkout is still being configured. Please try again shortly.' }, 503);
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return response({ error: 'The cart could not be read.' }, 400);
    }

    if (!Array.isArray(body?.items) || !body.items.length) return response({ error: 'Your cart is empty.' }, 400);

    const hasPreorder = body.items.some(item => preorderSlugs.has(item?.slug));
    let preorder = null;
    if (hasPreorder) {
      if (body.items.length !== 1 || body.items[0]?.quantity !== 1) {
        return response({ error: 'Preorders must be purchased separately, one offer at a time. Your regular cart is unchanged.' }, 400);
      }
      preorder = configuredPreorder(preorderConfig, body.items[0].slug);
      if (!preorder) return response({ error: 'Paid preorders are not open yet. Release dates and shipping terms must be confirmed first.' }, 503);
      const consent = body.preorder;
      if (consent?.accepted !== true || consent.termsVersion !== preorder.termsVersion) {
        return response({ error: 'Please review and accept the current preorder terms before continuing.' }, 400);
      }
      const timestamp = new Date(now()).getTime();
      if (!Number.isFinite(timestamp) || timestamp + preorderSessionDuration >= preorder.cutoff) {
        return response({ error: 'This preorder offer has closed. Please check the current book availability.' }, 409);
      }
      preorder.acceptedAt = new Date(timestamp).toISOString();
      preorder.expiresAt = Math.floor((timestamp + preorderSessionDuration) / 1000);
    } else if (body.preorder !== undefined) {
      return response({ error: 'Preorder terms cannot be used for regular cart purchases.' }, 400);
    }
    const shipping = preorder ? { countries: preorder.countries } : shippingConfiguration(env);
    if (!shipping) return response({ error: 'Secure shipping is still being configured. Please try again shortly.' }, 503);
    const orderCatalog = preorder ? { [preorder.offer.slug]: { name: preorder.offer.title, amount: preorder.offer.amount } } : catalog;

    const quantities = new Map();
    for (const item of body.items) {
      const slug = typeof item?.slug === 'string' ? item.slug : '';
      const quantity = Number(item?.quantity);
      if (!slug || !Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity || !Object.hasOwn(orderCatalog, slug)) {
        return response({ error: 'One or more cart items are not available for checkout.' }, 400);
      }
      quantities.set(slug, Math.min((quantities.get(slug) || 0) + quantity, maxQuantity));
    }
    const totalQuantity = [...quantities.values()].reduce((total, quantity) => total + quantity, 0);
    const subtotal = [...quantities.entries()].reduce((total, [slug, quantity]) => total + orderCatalog[slug].amount * quantity, 0);

    const siteUrl = (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
    const orderId = randomUUID();
    const form = new URLSearchParams({
      mode: 'payment',
      'managed_payments[enabled]': 'false',
      client_reference_id: `pokerlife_${orderId}`,
      'metadata[site]': 'pokerlifeusa.com',
      'metadata[order_id]': orderId,
      'payment_intent_data[metadata][site]': 'pokerlifeusa.com',
      'payment_intent_data[metadata][order_id]': orderId,
      success_url: `${siteUrl}/order-confirmed.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/${preorder ? 'ripple.html' : 'checkout.html'}`
    });
    if (preorder) {
      const { offer, bundle, schedule, termsVersion, acceptedAt } = preorder;
      setMetadata(form, {
        order_type: 'preorder', preorder_slug: offer.slug, preorder_title: offer.title, preorder_terms_version: termsVersion,
        preorder_terms_text: offer.termsText, preorder_accepted_at: acceptedAt,
        preorder_purchase_cutoff_at: new Date(preorder.cutoff).toISOString(),
        preorder_schedule: JSON.stringify(schedule), preorder_shipping_amount: offer.shippingAmount,
        preorder_countries: preorder.countries.join(','), preorder_autographed: bundle ? 'not-specified' : 'true',
        // New offers are books-only; historical orders retain their own terms.
        preorder_tshirt_included: 'false'
      });
      form.set('expires_at', String(preorder.expiresAt));
      form.set('custom_text[submit][message]', preorder.checkoutDisclosure);
      form.set('line_items[0][price_data][product_data][description]', preorder.checkoutDisclosure);
      form.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
      form.set('shipping_options[0][shipping_rate_data][display_name]', offer.shippingAmount === 0 ? 'Free preorder shipping' : 'Preorder shipping');
      form.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(offer.shippingAmount));
      form.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'usd');
    } else {
      form.set('shipping_options[0][shipping_rate]', shippingRateForOrder(shipping.rates, totalQuantity, subtotal));
    }
    shipping.countries.forEach((country, index) => {
      form.set(`shipping_address_collection[allowed_countries][${index}]`, country);
    });
    [...quantities.entries()].forEach(([slug, quantity], index) => {
      form.set(`line_items[${index}][price_data][currency]`, 'usd');
      form.set(`line_items[${index}][price_data][unit_amount]`, String(orderCatalog[slug].amount));
      form.set(`line_items[${index}][price_data][product_data][name]`, orderCatalog[slug].name);
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
    if (!stripeResponse.ok || !stripe.url || !stripe.id) {
      return response({ error: 'Stripe could not start checkout. Please try again.' }, 502);
    }
    return response({ url: stripe.url, sessionId: stripe.id });
  };
}

export default createCheckoutHandler();
