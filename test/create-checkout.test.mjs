import assert from 'node:assert/strict';
import test from 'node:test';

import { createCheckoutHandler } from '../netlify/functions/create-checkout.mjs';

function shippingEnv(overrides = {}) {
  return {
    STRIPE_SECRET_KEY: 'sk_live_example',
    STRIPE_SHIPPING_RATE_ID_ONE_BOOK: 'shr_oneBook',
    STRIPE_SHIPPING_RATE_ID_MULTIPLE_BOOKS: 'shr_multipleBooks',
    STRIPE_SHIPPING_RATE_ID_FREE_OVER_100: 'shr_freeOver100',
    ...overrides
  };
}

function checkoutRequest(items = [{ slug: 'poker-math-made-easy', quantity: 1 }]) {
  return new Request('https://pokerlifeusa.com/.netlify/functions/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
}

async function submittedShippingRate(items, envOverrides = {}, bodyOverrides = {}) {
  let stripeRequest;
  const handler = createCheckoutHandler({
    env: shippingEnv(envOverrides),
    fetchImpl: async (url, options) => {
      stripeRequest = { url, options };
      return new Response(JSON.stringify({ id: 'cs_live_example', url: 'https://checkout.stripe.com/example' }), { status: 200 });
    }
  });

  const request = checkoutRequest(items);
  const response = await handler(Object.keys(bodyOverrides).length ? new Request(request.url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, ...bodyOverrides })
  }) : request);
  const form = new URLSearchParams(stripeRequest.options.body);

  assert.equal(response.status, 200);
  assert.equal(stripeRequest.url, 'https://api.stripe.com/v1/checkout/sessions');
  assert.match(form.get('client_reference_id'), /^pokerlife_/);
  assert.equal(form.get('metadata[site]'), 'pokerlifeusa.com');
  assert.equal(form.get('payment_intent_data[metadata][order_id]'), form.get('metadata[order_id]'));
  return form;
}

function assertFreeShipping(form) {
  assert.equal(form.get('shipping_options[0][shipping_rate_data][type]'), 'fixed_amount');
  assert.equal(form.get('shipping_options[0][shipping_rate_data][display_name]'), 'Free shipping');
  assert.equal(form.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '0');
  assert.equal(form.get('shipping_options[0][shipping_rate_data][fixed_amount][currency]'), 'usd');
  assert.equal(form.has('shipping_options[0][shipping_rate]'), false);
  assert.equal([...form.keys()].some(key => /^shipping_options\[[1-9]/.test(key)), false);
}

test('uses server-owned free shipping for one book without changing eligible countries or price', async () => {
  const form = await submittedShippingRate([{ slug: 'poker-math-made-easy', quantity: 1 }], {
    STRIPE_SHIPPING_COUNTRIES: 'us, CA, us'
  });

  assertFreeShipping(form);
  assert.deepEqual(form.getAll('shipping_address_collection[allowed_countries][0]'), ['US']);
  assert.deepEqual(form.getAll('shipping_address_collection[allowed_countries][1]'), ['CA']);
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '1299');
  assert.equal(form.get('line_items[0][quantity]'), '1');
});

test('sends the new river book to Stripe at $10.99', async () => {
  const form = await submittedShippingRate([{ slug: 'f-ked-on-the-river', quantity: 2 }]);

  assert.equal(form.get('line_items[0][price_data][product_data][name]'), 'F#@KED on the River');
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '1099');
  assert.equal(form.get('line_items[0][quantity]'), '2');
});

test('uses free shipping for multiple books below $100 with no minimum', async () => {
  for (const quantity of [2, 3, 4, 5]) {
    const form = await submittedShippingRate([{ slug: 'poker-math-made-easy', quantity }]);
    assertFreeShipping(form);
  }
  const justUnderOneHundred = await submittedShippingRate([{ slug: 'only-poker-book-youll-ever-need', quantity: 5 }]);
  assertFreeShipping(justUnderOneHundred);
});

test('mixed-title orders still receive free shipping', async () => {
  const form = await submittedShippingRate([
    { slug: 'poker-math-made-easy', quantity: 1 },
    { slug: 'texas-holdem-in-texas', quantity: 2 }
  ]);

  assertFreeShipping(form);
});

test('uses free shipping when the book subtotal is over $100', async () => {
  const form = await submittedShippingRate([{ slug: 'poker-math-made-easy', quantity: 8 }]);

  assertFreeShipping(form);
});

test('every current catalog title gets free shipping at minimum and maximum quantity', async () => {
  const slugs = [
    'texas-holdem-in-texas', 'winning-tournament-poker', 'poker-math-made-easy', 'is-he-bluffing',
    'complete-guide-to-poker-for-women', 'patient-poker-player-advanced-tactics', 'i-just-ran-bad',
    'final-table-secrets', 'poker-tricks-traps-and-mind-games', 'poker-what-the-pros-dont-want-you-to-know',
    'poker-life-culture', 'only-poker-book-youll-ever-need', 'patient-poker-player-win-more', 'f-ked-on-the-river'
  ];
  for (const slug of slugs) {
    for (const quantity of [1, 10]) {
      const form = await submittedShippingRate([{ slug, quantity }]);
      assertFreeShipping(form);
      assert.equal(form.get('line_items[0][quantity]'), String(quantity));
    }
  }
});

test('regular orders do not require legacy paid shipping-rate configuration', async () => {
  for (const rate of [undefined, '', 'shr_paidLegacy', 'not_a_rate']) {
    const form = await submittedShippingRate([{ slug: 'poker-math-made-easy', quantity: 1 }], {
      STRIPE_SHIPPING_RATE_ID_ONE_BOOK: rate,
      STRIPE_SHIPPING_RATE_ID_MULTIPLE_BOOKS: rate,
      STRIPE_SHIPPING_RATE_ID_FREE_OVER_100: rate
    });
    assertFreeShipping(form);
  }
});

test('browser shipping and price fields cannot charge shipping or alter a book price', async () => {
  const form = await submittedShippingRate([{ slug: 'poker-math-made-easy', quantity: 1, amount: 1 }], {}, {
    shippingAmount: 700, shippingRate: 'shr_attackerPaid', shippingFee: 700, deliveryFee: 700, countries: ['CA'],
    shipping_options: [{ shipping_rate: 'shr_attackerPaid' }],
    line_items: [{ price: 'price_attackerFee', quantity: 1 }],
    metadata: { shipping_amount: '700' }
  });
  assertFreeShipping(form);
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '1299');
  assert.equal(form.get('shipping_address_collection[allowed_countries][0]'), 'US');
  assert.equal(form.has('shipping_address_collection[allowed_countries][1]'), false);
});

test('defaults shipping-address collection to the US', async () => {
  let stripeForm;
  const handler = createCheckoutHandler({
    env: shippingEnv(),
    fetchImpl: async (_url, options) => {
      stripeForm = new URLSearchParams(options.body);
      return new Response(JSON.stringify({ id: 'cs_live_example', url: 'https://checkout.stripe.com/example' }), { status: 200 });
    }
  });

  const response = await handler(checkoutRequest());

  assert.equal(response.status, 200);
  assert.equal(stripeForm.get('shipping_address_collection[allowed_countries][0]'), 'US');
});

test('refuses checkout before contacting Stripe when shipping countries are malformed', async () => {
  let fetchCalls = 0;
  const handler = createCheckoutHandler({
    env: shippingEnv({ STRIPE_SHIPPING_COUNTRIES: 'USA' }),
    fetchImpl: async () => { fetchCalls += 1; }
  });

  const response = await handler(checkoutRequest());

  assert.equal(response.status, 503);
  assert.equal(fetchCalls, 0);
  assert.match((await response.json()).error, /shipping/i);
});
