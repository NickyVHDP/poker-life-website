import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';

import { createOrderStatusHandler } from '../netlify/functions/order-status.mjs';
import { createStripeWebhookHandler } from '../netlify/functions/stripe-webhook.mjs';

const orderId = '78fe058a-0675-4e3f-8295-a12f99080fa4';
const sessionId = 'cs_live_order123';
const session = {
  id: sessionId,
  object: 'checkout.session',
  client_reference_id: `pokerlife_${orderId}`,
  metadata: { site: 'pokerlifeusa.com', order_id: orderId },
  amount_total: 5296,
  currency: 'usd',
  payment_status: 'paid',
  payment_intent: 'pi_order123',
  status: 'complete'
};

function memoryStore() {
  const records = new Map();
  return {
    records,
    async get(key) { return records.get(key) ?? null; },
    async setJSON(key, value, options = {}) {
      if (options.onlyIfNew && records.has(key)) return { modified: false };
      records.set(key, value);
      return { modified: true };
    }
  };
}

function statusRequest(id = sessionId) {
  return new Request(`https://pokerlifeusa.com/.netlify/functions/order-status?session_id=${encodeURIComponent(id)}`);
}

function stripeReply(value) {
  return new Response(JSON.stringify(value), { status: 200 });
}

function signedHeader(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

test('verified paid session records an order and reports paid', async () => {
  const store = memoryStore();
  const handler = createOrderStatusHandler({
    env: { STRIPE_SECRET_KEY: 'sk_live_example' },
    fetchImpl: async () => stripeReply(session),
    storeFactory: () => store
  });
  const response = await handler(statusRequest());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'paid', recorded: true, orderId });
  assert.equal(store.records.get(`paid/${sessionId}`).paymentIntentId, 'pi_order123');
  assert.equal(store.records.size, 1);
});

test('Stripe-paid orders remain visibly paid if order storage is temporarily unavailable', async () => {
  const handler = createOrderStatusHandler({
    env: { STRIPE_SECRET_KEY: 'sk_live_example' },
    fetchImpl: async () => stripeReply(session),
    storeFactory: () => { throw new Error('Storage unavailable'); }
  });
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await (await handler(statusRequest())).json(), { status: 'paid', recorded: false, orderId });
  } finally {
    console.error = originalError;
  }
});

test('unpaid session cannot be reported paid or recorded as an order', async () => {
  const store = memoryStore();
  const handler = createOrderStatusHandler({
    env: { STRIPE_SECRET_KEY: 'sk_live_example' },
    fetchImpl: async () => stripeReply({ ...session, payment_status: 'unpaid', status: 'open' }),
    storeFactory: () => store
  });
  assert.deepEqual(await (await handler(statusRequest())).json(), { status: 'pending' });
  assert.equal(store.records.size, 0);
});

test('session from another integration is rejected', async () => {
  const handler = createOrderStatusHandler({
    env: { STRIPE_SECRET_KEY: 'sk_live_example' },
    fetchImpl: async () => stripeReply({ ...session, metadata: { site: 'other-site' } }),
    storeFactory: () => memoryStore()
  });
  assert.equal((await handler(statusRequest())).status, 404);
});

test('paid preorder summary comes only from Stripe and excludes private or unknown fields', async () => {
  const preorderSession = {
    ...session,
    metadata: {
      ...session.metadata, order_type: 'preorder', preorder_slug: 'ripple-pink-preorder',
      preorder_title: 'Captured title at purchase', preorder_terms_version: 'captured-v1',
      preorder_terms_text: 'Captured shipping terms at purchase.',
      preorder_schedule: JSON.stringify([{ volume: 'Pink', releaseDate: '2030-02-01', shipDate: '2030-01-25', email: 'private@example.invalid', address: 'private address' }]),
      preorder_tshirt_size: 'L', preorder_customer_email: 'private@example.invalid',
      preorder_shipping_amount: '0', preorder_countries: 'US,CA,private@example.invalid,US'
    },
    customer_details: { email: 'private@example.invalid' }, shipping_details: { name: 'Private Name' }
  };
  const handler = createOrderStatusHandler({ env: { STRIPE_SECRET_KEY: 'sk_test_fixture' }, fetchImpl: async () => stripeReply(preorderSession), storeFactory: memoryStore });
  const request = new Request(`https://pokerlifeusa.com/.netlify/functions/order-status?session_id=${sessionId}&order_type=regular&preorder_title=forged`);
  const result = await (await handler(request)).json();
  assert.deepEqual(result.preorder, {
    slug: 'ripple-pink-preorder', title: 'Captured title at purchase', termsVersion: 'captured-v1',
    termsText: 'Captured shipping terms at purchase.', schedule: [{ volume: 'Pink', releaseDate: '2030-02-01', shipDate: '2030-01-25' }],
    shippingAmount: 0, countries: ['US', 'CA']
  });
  assert.equal(result.orderType, 'preorder');
  assert.equal(JSON.stringify(result).includes('private'), false);
  assert.equal(JSON.stringify(result).includes('tshirt'), false);
});

test('unpaid or unrelated sessions cannot receive a paid preorder summary', async () => {
  const metadata = { ...session.metadata, order_type: 'preorder', preorder_slug: 'ripple-pink-preorder', preorder_terms_text: 'Preorder terms' };
  for (const [stripeSession, expectedStatus, expectedBody] of [
    [{ ...session, metadata, payment_status: 'unpaid', status: 'open' }, 200, { status: 'pending' }],
    [{ ...session, metadata: { ...metadata, site: 'other-site' } }, 404, { error: 'Checkout session not found.' }]
  ]) {
    const handler = createOrderStatusHandler({ env: { STRIPE_SECRET_KEY: 'sk_test_fixture' }, fetchImpl: async () => stripeReply(stripeSession), storeFactory: memoryStore });
    const response = await handler(statusRequest());
    assert.equal(response.status, expectedStatus);
    assert.deepEqual(await response.json(), expectedBody);
  }
});

test('malformed historical preorder summaries do not hide payment confirmation', async () => {
  for (const schedule of ['{bad', '[null]', JSON.stringify([{ volume: 'Pink', releaseDate: '2030-02-31', shipDate: 'personal data' }])]) {
    const handler = createOrderStatusHandler({
      env: { STRIPE_SECRET_KEY: 'sk_test_fixture' }, storeFactory: memoryStore,
      fetchImpl: async () => stripeReply({ ...session, metadata: { ...session.metadata, order_type: 'preorder', preorder_slug: 'ripple-pink-preorder', preorder_schedule: schedule } })
    });
    const result = await (await handler(statusRequest())).json();
    assert.equal(result.status, 'paid');
    assert.equal(result.preorder.title, 'Ripple: Pink — Autographed Preorder');
    assert.equal(result.preorder.termsText, null);
    assert.equal(result.preorder.shippingAmount, null);
    assert.deepEqual(result.preorder.countries, []);
    assert.equal(JSON.stringify(result.preorder.schedule).includes('personal data'), false);
    assert.equal(JSON.stringify(result.preorder.schedule).includes('2030-02-31'), false);
  }
});

test('recorded delayed-payment failure is reported without marking paid', async () => {
  const store = memoryStore();
  store.records.set(`failed/${sessionId}`, { sessionId });
  const handler = createOrderStatusHandler({
    env: { STRIPE_SECRET_KEY: 'sk_live_example' },
    fetchImpl: async () => stripeReply({ ...session, payment_status: 'unpaid' }),
    storeFactory: () => store
  });
  assert.deepEqual(await (await handler(statusRequest())).json(), { status: 'failed' });
});

test('a card or wallet decline is reported for the checkout order', async () => {
  const secret = 'whsec_test_secret';
  const store = memoryStore();
  const handler = createStripeWebhookHandler({
    env: { STRIPE_WEBHOOK_SECRET: secret }, storeFactory: () => store
  });
  const event = {
    id: 'evt_cardFailed', type: 'payment_intent.payment_failed', created: Math.floor(Date.now() / 1000),
    data: { object: {
      id: 'pi_failed123', object: 'payment_intent', metadata: { site: 'pokerlifeusa.com', order_id: orderId },
      status: 'requires_payment_method', last_payment_error: { code: 'card_declined', decline_code: 'generic_decline' }
    } }
  };
  const payload = JSON.stringify(event);
  const response = await handler(new Request('https://pokerlifeusa.com/.netlify/functions/stripe-webhook', {
    method: 'POST', headers: { 'stripe-signature': signedHeader(payload, secret) }, body: payload
  }));
  assert.equal(response.status, 200);
  assert.equal(store.records.get(`failed-order/${orderId}`).declineCode, 'generic_decline');
  assert.equal(store.records.has(`paid/${sessionId}`), false);
});

test('a webhook signed outside the five-minute window is rejected', async () => {
  const secret = 'whsec_test_secret';
  const payload = JSON.stringify({ id: 'evt_old', type: 'checkout.session.completed', data: { object: session } });
  const timestamp = Math.floor(Date.now() / 1000) - 601;
  const digest = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  const handler = createStripeWebhookHandler({ env: { STRIPE_WEBHOOK_SECRET: secret }, storeFactory: memoryStore });
  const response = await handler(new Request('https://pokerlifeusa.com/.netlify/functions/stripe-webhook', {
    method: 'POST', headers: { 'stripe-signature': `t=${timestamp},v1=${digest}` }, body: payload
  }));
  assert.equal(response.status, 400);
});

test('webhook rejects invalid signatures and records paid orders idempotently', async () => {
  const secret = 'whsec_test_secret';
  const store = memoryStore();
  const handler = createStripeWebhookHandler({
    env: { STRIPE_WEBHOOK_SECRET: secret },
    storeFactory: () => store
  });
  const event = { id: 'evt_paid123', type: 'checkout.session.completed', created: Math.floor(Date.now() / 1000), data: { object: session } };
  const payload = JSON.stringify(event);
  const signature = signedHeader(payload, secret);
  const request = (sig) => new Request('https://pokerlifeusa.com/.netlify/functions/stripe-webhook', {
    method: 'POST', headers: { 'stripe-signature': sig }, body: payload
  });

  assert.equal((await handler(request('bad-signature'))).status, 400);
  assert.equal(store.records.size, 0);
  assert.equal((await handler(request(signature))).status, 200);
  assert.equal((await handler(request(signature))).status, 200);
  assert.equal(store.records.size, 2);
  assert.equal(store.records.get(`paid/${sessionId}`).paymentStatus, 'paid');
});

test('webhook records delayed-payment failure but never a paid order', async () => {
  const secret = 'whsec_test_secret';
  const store = memoryStore();
  const handler = createStripeWebhookHandler({
    env: { STRIPE_WEBHOOK_SECRET: secret },
    storeFactory: () => store
  });
  const event = {
    id: 'evt_failed123', type: 'checkout.session.async_payment_failed', created: Math.floor(Date.now() / 1000),
    data: { object: { ...session, payment_status: 'unpaid' } }
  };
  const payload = JSON.stringify(event);
  const signature = signedHeader(payload, secret);
  const response = await handler(new Request('https://pokerlifeusa.com/.netlify/functions/stripe-webhook', {
    method: 'POST', headers: { 'stripe-signature': signature }, body: payload
  }));
  assert.equal(response.status, 200);
  assert.equal(store.records.has(`failed/${sessionId}`), true);
  assert.equal(store.records.has(`paid/${sessionId}`), false);
});
