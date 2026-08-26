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

async function submittedShippingRate(items, envOverrides = {}) {
  let stripeRequest;
  const handler = createCheckoutHandler({
    env: shippingEnv(envOverrides),
    fetchImpl: async (url, options) => {
      stripeRequest = { url, options };
      return new Response(JSON.stringify({ url: 'https://checkout.stripe.com/example' }), { status: 200 });
    }
  });

  const response = await handler(checkoutRequest(items));
  const form = new URLSearchParams(stripeRequest.options.body);

  assert.equal(response.status, 200);
  assert.equal(stripeRequest.url, 'https://api.stripe.com/v1/checkout/sessions');
  return form;
}

test('uses the one-book shipping rate for one book', async () => {
  const form = await submittedShippingRate([{ slug: 'poker-math-made-easy', quantity: 1 }], {
    STRIPE_SHIPPING_COUNTRIES: 'us, CA, us'
  });

  assert.equal(form.get('shipping_options[0][shipping_rate]'), 'shr_oneBook');
  assert.deepEqual(form.getAll('shipping_address_collection[allowed_countries][0]'), ['US']);
  assert.deepEqual(form.getAll('shipping_address_collection[allowed_countries][1]'), ['CA']);
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '1299');
  assert.equal(form.get('line_items[0][quantity]'), '1');
});

test('uses the multiple-book rate for orders of $100 or less', async () => {
  for (const quantity of [2, 3, 4, 5]) {
    const form = await submittedShippingRate([{ slug: 'poker-math-made-easy', quantity }]);
    assert.equal(form.get('shipping_options[0][shipping_rate]'), 'shr_multipleBooks');
  }
  const justUnderOneHundred = await submittedShippingRate([{ slug: 'only-poker-book-youll-ever-need', quantity: 5 }]);
  assert.equal(justUnderOneHundred.get('shipping_options[0][shipping_rate]'), 'shr_multipleBooks');
});

test('uses combined quantities across titles to choose the multiple-book rate', async () => {
  const form = await submittedShippingRate([
    { slug: 'poker-math-made-easy', quantity: 1 },
    { slug: 'texas-holdem-in-texas', quantity: 2 }
  ]);

  assert.equal(form.get('shipping_options[0][shipping_rate]'), 'shr_multipleBooks');
});

test('uses free shipping when the book subtotal is over $100', async () => {
  const form = await submittedShippingRate([{ slug: 'poker-math-made-easy', quantity: 8 }]);

  assert.equal(form.get('shipping_options[0][shipping_rate]'), 'shr_freeOver100');
});

test('refuses checkout before contacting Stripe when any shipping tier is missing', async () => {
  let fetchCalls = 0;
  const handler = createCheckoutHandler({
    env: shippingEnv({ STRIPE_SHIPPING_RATE_ID_MULTIPLE_BOOKS: '' }),
    fetchImpl: async () => { fetchCalls += 1; }
  });

  const response = await handler(checkoutRequest());

  assert.equal(response.status, 503);
  assert.equal(fetchCalls, 0);
  assert.match((await response.json()).error, /shipping/i);
});

test('defaults shipping-address collection to the US', async () => {
  let stripeForm;
  const handler = createCheckoutHandler({
    env: shippingEnv(),
    fetchImpl: async (_url, options) => {
      stripeForm = new URLSearchParams(options.body);
      return new Response(JSON.stringify({ url: 'https://checkout.stripe.com/example' }), { status: 200 });
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
