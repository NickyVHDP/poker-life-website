import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { createCheckoutHandler } from '../netlify/functions/create-checkout.mjs';
import { createOrderStatusHandler } from '../netlify/functions/order-status.mjs';
import { createStripeWebhookHandler } from '../netlify/functions/stripe-webhook.mjs';
import { orderRecord } from '../netlify/lib/order-record.mjs';
import { ripplePreorderConfig } from '../ripple-preorder-config.js';

const fixedNow = new Date('2030-01-01T12:00:00Z');
const env = {
  STRIPE_SECRET_KEY: 'sk_test_fixture',
  SITE_URL: 'https://pokerlifeusa.com',
  STRIPE_SHIPPING_RATE_ID_ONE_BOOK: 'shr_oneBook',
  STRIPE_SHIPPING_RATE_ID_MULTIPLE_BOOKS: 'shr_multipleBooks',
  STRIPE_SHIPPING_RATE_ID_FREE_OVER_100: 'shr_freeOver100'
};
function configured() {
  const config = structuredClone(ripplePreorderConfig);
  config.enabled = true;
  config.countries = ['US'];
  Object.assign(config.pink, { releaseDate: '2030-02-01', shipDate: '2030-01-25', purchaseCutoffAt: '2030-01-20T23:59:59Z', termsText: 'Fixture terms: paid Pink preorder, signed copy, ships January 25, free US shipping.' });
  Object.assign(config.bundle, { shippingAmount: 700, purchaseCutoffAt: '2030-01-15T23:59:59Z', termsText: 'Fixture terms: five-book preorder, $7 shipping, each volume arrives seven days before release.' });
  config.bundle.schedule = config.bundle.volumes.map((volume, index) => {
    const releaseDate = `2030-0${index + 2}-01`;
    const arrivalDate = new Date(Date.parse(releaseDate + 'T00:00:00Z') - 7 * 86400000).toISOString().slice(0, 10);
    return { volume, releaseDate, arrivalDate };
  });
  return config;
}
function payload(slug = 'ripple-pink-preorder', extra = {}) {
  return { items: [{ slug, quantity: 1 }], preorder: { accepted: true, termsVersion: ripplePreorderConfig.termsVersion, ...extra } };
}
async function checkout(body, options = {}) {
  let form;
  let calls = 0;
  const handler = createCheckoutHandler({
    env,
    preorderConfig: configured(),
    now: () => fixedNow,
    ...options,
    fetchImpl: async (url, request) => {
      assert.equal(url, 'https://api.stripe.com/v1/checkout/sessions');
      calls += 1;
      form = new URLSearchParams(request.body);
      return Response.json({ id: 'cs_test_fixture', url: 'https://checkout.stripe.com/fixture' });
    }
  });
  const response = await handler(new Request('https://pokerlifeusa.com/.netlify/functions/create-checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }));
  return { status: response.status, body: await response.json(), calls, form };
}

test('paid preorders are disabled by default and never contact Stripe', async () => {
  assert.equal(ripplePreorderConfig.enabled, false);
  assert.equal(ripplePreorderConfig.pink.amount, 2500);
  assert.equal(ripplePreorderConfig.pink.regularAmount, 2999);
  assert.equal(ripplePreorderConfig.bundle.amount, 10000);
  assert.equal(ripplePreorderConfig.termsVersion, 'ripple-preorder-v3');
  assert.equal(ripplePreorderConfig.pink.releaseWindow, 'December');
  assert.equal(ripplePreorderConfig.pink.shippingAmount, 0);
  assert.equal(ripplePreorderConfig.bundle.shippingAmount, 0);
  assert.equal(Object.hasOwn(ripplePreorderConfig.bundle, 'shirtSizes'), false);
  assert.equal(ripplePreorderConfig.pink.releaseDate, null);
  assert.equal(ripplePreorderConfig.pink.purchaseCutoffAt, null);
  assert.equal(ripplePreorderConfig.bundle.purchaseCutoffAt, null);
  assert.deepEqual(ripplePreorderConfig.countries, ['US']);
  assert.match(ripplePreorderConfig.pink.termsText, /Cancel before shipment for a full refund/);
  assert.match(ripplePreorderConfig.bundle.termsText, /cancel unshipped books for \$20 per book/);
  for (const slug of [ripplePreorderConfig.pink.slug, ripplePreorderConfig.bundle.slug]) {
    const result = await checkout(payload(slug), { preorderConfig: ripplePreorderConfig });
    assert.equal(result.status, 503);
    assert.equal(result.calls, 0);
  }
});

test('confirmed free bundle shipping stays free in Stripe and fulfillment metadata', async () => {
  const config = configured();
  config.bundle.shippingAmount = ripplePreorderConfig.bundle.shippingAmount;
  config.bundle.termsText = 'Fixture terms: five-book preorder, free shipping, each book arrives seven days before release.';
  const result = await checkout(payload(config.bundle.slug), { preorderConfig: config });
  assert.equal(result.status, 200);
  assert.equal(result.form.get('line_items[0][price_data][unit_amount]'), '10000');
  assert.equal(result.form.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '0');
  assert.equal(result.form.get('metadata[preorder_shipping_amount]'), '0');
  assert.equal(result.form.get('payment_intent_data[metadata][preorder_shipping_amount]'), '0');
});

test('activation fails closed for incomplete or invalid dates, countries, terms, prices and shipping', async () => {
  const cases = [
    config => { config.pink.releaseDate = null; },
    config => { config.pink.shipDate = null; },
    config => { config.pink.releaseDate = '2030-02-31'; },
    config => { config.pink.shipDate = '2030-02-05'; },
    config => { config.pink.purchaseCutoffAt = null; },
    config => { config.pink.purchaseCutoffAt = '2030-01-20'; },
    config => { config.pink.purchaseCutoffAt = '2030-01-20T20:00:00'; },
    config => { config.pink.purchaseCutoffAt = '2030-02-31T20:00:00Z'; },
    config => { config.pink.purchaseCutoffAt = '2030-01-26T00:00:00Z'; },
    config => { config.countries = []; },
    config => { config.countries = ['USA']; },
    config => { config.pink.termsText = ''; },
    config => { config.pink.termsText = 'a'.repeat(501); },
    config => { config.termsVersion = ''; },
    config => { config.pink.amount = 1; },
    config => { config.pink.shippingAmount = 100; }
  ];
  for (const change of cases) {
    const config = configured(); change(config);
    const result = await checkout(payload(), { preorderConfig: config });
    assert.equal(result.status, 503);
    assert.equal(result.calls, 0);
  }
});

test('Pink price, signed fulfillment, free shipping and terms come only from server config', async () => {
  const body = payload();
  Object.assign(body.items[0], { amount: 1, name: 'Tampered', price: 0 });
  Object.assign(body.preorder, { shippingAmount: 0, countries: ['CA'], releaseDate: '2040-01-01', purchaseCutoffAt: '2040-01-01T00:00:00Z', termsText: 'Not a preorder', enabled: true });
  body.metadata = { order_type: 'regular', preorder_schedule: 'tampered' };
  const result = await checkout(body);
  assert.equal(result.status, 200);
  const { form } = result;
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '2500');
  assert.equal(form.get('line_items[0][price_data][product_data][name]'), ripplePreorderConfig.pink.title);
  assert.equal(form.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '0');
  assert.equal(form.has('shipping_options[0][shipping_rate]'), false);
  assert.equal(form.get('shipping_address_collection[allowed_countries][0]'), 'US');
  assert.equal(form.has('shipping_address_collection[allowed_countries][1]'), false);
  assert.equal(form.get('metadata[order_type]'), 'preorder');
  assert.equal(form.get('metadata[preorder_autographed]'), 'true');
  assert.equal(form.get('metadata[preorder_title]'), configured().pink.title);
  assert.equal(form.get('metadata[preorder_purchase_cutoff_at]'), '2030-01-20T23:59:59.000Z');
  assert.equal(form.get('metadata[preorder_tshirt_included]'), 'false');
  assert.deepEqual(JSON.parse(form.get('metadata[preorder_schedule]')), [{ volume: 'Pink', releaseDate: '2030-02-01', shipDate: '2030-01-25' }]);
  const disclosure = form.get('custom_text[submit][message]');
  assert.ok(disclosure.includes(configured().pink.termsText));
  assert.ok(disclosure.includes('Pink: ships 2030-01-25; release 2030-02-01.'));
  assert.ok(disclosure.includes('Shipping: Free (USD $0.00). Eligible countries: US only.'));
  assert.equal(form.get('line_items[0][price_data][product_data][description]'), disclosure);
  assert.ok(disclosure.length <= 1200);
  assert.equal(form.get('cancel_url'), 'https://pokerlifeusa.com/ripple.html');
  assert.equal(Number(form.get('expires_at')), fixedNow.getTime() / 1000 + 1860);
  for (const [key, value] of form.entries()) {
    if (key.startsWith('metadata[')) {
      assert.equal(form.get(key.replace('metadata[', 'payment_intent_data[metadata][')), value);
      assert.ok(value.length <= 500, key + ' exceeds Stripe metadata size');
    }
  }
});

test('one preorder offer must be isolated from other offers and normal cart items', async () => {
  for (const items of [
    [{ slug: 'ripple-pink-preorder', quantity: 1 }, { slug: 'poker-math-made-easy', quantity: 1 }],
    [{ slug: 'ripple-series-preorder', quantity: 1 }, { slug: 'ripple-pink-preorder', quantity: 1 }],
    [{ slug: 'ripple-pink-preorder', quantity: 1 }, { slug: 'ripple-pink-preorder', quantity: 1 }],
    [{ slug: 'ripple-pink-preorder', quantity: 2 }],
    [{ slug: 'ripple-pink-preorder', quantity: '1' }]
  ]) {
    const result = await checkout({ ...payload(), items });
    assert.equal(result.status, 400);
    assert.equal(result.calls, 0);
  }
});

test('current affirmative preorder terms acceptance is required', async () => {
  for (const consent of [undefined, {}, { accepted: 'true', termsVersion: ripplePreorderConfig.termsVersion }, { accepted: false, termsVersion: ripplePreorderConfig.termsVersion }, { accepted: true, termsVersion: 'ripple-preorder-v1' }, { accepted: true, termsVersion: 'old' }]) {
    const result = await checkout({ items: payload().items, preorder: consent });
    assert.equal(result.status, 400);
    assert.equal(result.calls, 0);
  }
});

test('bundle requires every release/arrival date and confirmed shipping', async () => {
  for (const change of [
    config => { config.bundle.schedule = []; },
    config => { config.bundle.schedule[0].arrivalDate = '2030-01-24'; },
    config => { config.bundle.schedule[4].volume = 'Pink'; },
    config => { config.bundle.purchaseCutoffAt = null; },
    config => { config.bundle.purchaseCutoffAt = '2030-01-25T00:00:00Z'; },
    config => { config.bundle.shippingAmount = null; },
    config => { config.bundle.termsText = null; },
    config => { config.bundle.amount = 9999; }
  ]) {
    const config = configured(); change(config);
    const result = await checkout(payload('ripple-series-preorder'), { preorderConfig: config });
    assert.equal(result.status, 503);
    assert.equal(result.calls, 0);
  }
});

test('bundle is $100 without a shirt and retains its shipping/fulfillment metadata', async () => {
  const result = await checkout(payload('ripple-series-preorder', { shippingAmount: 0 }));
  assert.equal(result.status, 200);
  const { form } = result;
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '10000');
  assert.equal(form.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '700');
  assert.equal(form.get('metadata[preorder_tshirt_included]'), 'false');
  assert.equal(form.has('metadata[preorder_tshirt_size]'), false);
  assert.equal(form.get('payment_intent_data[metadata][preorder_tshirt_included]'), 'false');
  assert.equal(form.has('payment_intent_data[metadata][preorder_tshirt_size]'), false);
  assert.deepEqual(JSON.parse(form.get('metadata[preorder_schedule]')), configured().bundle.schedule);
  assert.ok(form.get('metadata[preorder_schedule]').length <= 500);
  const disclosure = form.get('custom_text[submit][message]');
  for (const { volume, releaseDate, arrivalDate } of configured().bundle.schedule) {
    assert.ok(disclosure.includes(`${volume}: arrives ${arrivalDate}; release ${releaseDate}.`));
  }
  assert.ok(disclosure.includes('Shipping: USD $7.00. Eligible countries: US only.'));
  assert.doesNotMatch(disclosure, /shirt/i);
  assert.equal(form.get('line_items[0][price_data][product_data][description]'), disclosure);
  assert.ok(disclosure.length <= 1200);
});

test('legacy client shirt fields cannot add a shirt or affect new preorder fulfillment', async () => {
  for (const slug of ['ripple-pink-preorder', 'ripple-series-preorder']) {
    for (const shirtSize of [undefined, '', 'L', 'XXXL', '<script>', 42]) {
      const body = payload(slug, { shirtSize, tshirtIncluded: true });
      body.metadata = { preorder_tshirt_included: 'true', preorder_tshirt_size: 'L' };
      const { status, calls, form } = await checkout(body);
      assert.equal(status, 200);
      assert.equal(calls, 1);
      for (const prefix of ['metadata', 'payment_intent_data[metadata]']) {
        assert.equal(form.get(`${prefix}[preorder_tshirt_included]`), 'false');
        assert.equal(form.has(`${prefix}[preorder_tshirt_size]`), false);
      }
    }
  }
});

test('checkout disclosure adds dates and shipping even when approved custom terms omit them', async () => {
  for (const key of ['pink', 'bundle']) {
    const config = configured();
    config[key].termsText = 'This purchase reserves the preorder offer.';
    config.countries = ['US', 'CA'];
    const { status, form } = await checkout(payload(config[key].slug), { preorderConfig: config });
    assert.equal(status, 200);
    const disclosure = form.get('custom_text[submit][message]');
    assert.ok(disclosure.includes('2030-02-01'));
    assert.ok(disclosure.includes(key === 'pink' ? 'ships 2030-01-25' : 'arrives 2030-01-25'));
    assert.ok(disclosure.includes('Eligible countries: US, CA only.'));
    assert.equal(form.get('metadata[preorder_terms_text]'), config[key].termsText);
  }
});

test('oversized composed Stripe disclosure fails closed instead of truncating terms or dates', async () => {
  const config = configured();
  config.bundle.termsText = 'x'.repeat(500);
  config.countries = Array.from({ length: 140 }, (_, index) => String.fromCharCode(65 + Math.floor(index / 26), 65 + index % 26));
  const result = await checkout(payload(config.bundle.slug), { preorderConfig: config });
  assert.equal(result.status, 503);
  assert.equal(result.calls, 0);
});

test('preorder shipping does not require or grant regular-cart shipping tiers', async () => {
  const pink = await checkout(payload(), { env: { STRIPE_SECRET_KEY: 'sk_test_fixture' } });
  assert.equal(pink.status, 200);
  const normal = await checkout({ items: [{ slug: 'poker-math-made-easy', quantity: 1 }] });
  assert.equal(normal.status, 200);
  assert.equal(normal.form.get('shipping_options[0][shipping_rate]'), 'shr_oneBook');
  assert.equal(normal.form.has('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), false);
  assert.equal(normal.form.has('metadata[order_type]'), false);
  const forged = await checkout({ items: [{ slug: 'poker-math-made-easy', quantity: 1 }], preorder: payload().preorder });
  assert.equal(forged.status, 400);
  assert.equal(forged.calls, 0);
});

test('unknown and prototype-property product slugs cannot enter checkout', async () => {
  for (const slug of ['ripple-series-1', '__proto__', 'constructor']) {
    const result = await checkout({ items: [{ slug, quantity: 1 }] });
    assert.equal(result.status, 400);
    assert.equal(result.calls, 0);
  }
});

test('explicit purchase cutoff and the final checkout window cannot create checkout', async () => {
  for (const [slug, timestamp] of [['ripple-pink-preorder', '2030-01-21T00:00:00Z'], ['ripple-pink-preorder', '2030-01-20T23:45:00Z'], ['ripple-series-preorder', '2030-01-16T00:00:00Z']]) {
    const result = await checkout(payload(slug), { now: () => new Date(timestamp) });
    assert.equal(result.status, 409);
    assert.equal(result.calls, 0);
  }
});

test('private paid-order record preserves the agreed preorder fulfillment snapshot', async () => {
  const { form } = await checkout(payload('ripple-series-preorder'));
  const metadata = Object.fromEntries([...form].filter(([key]) => key.startsWith('metadata[')).map(([key, value]) => [key.slice(9, -1), value]));
  const shipping = { name: 'Test Recipient', address: { country: 'US', postal_code: '00000' } };
  const session = { id: 'cs_test_fixture', metadata, payment_intent: 'pi_fixture', amount_total: 10700, currency: 'usd', payment_status: 'paid', collected_information: { shipping_details: shipping }, customer_details: { email: 'test@example.invalid' } };
  const record = orderRecord(session, 'stripe-webhook', 'evt_fixture');
  assert.equal(record.orderType, 'preorder');
  assert.equal(record.preorder.termsVersion, ripplePreorderConfig.termsVersion);
  assert.equal(record.preorder.termsText, configured().bundle.termsText);
  assert.equal(record.preorder.acceptedAt, fixedNow.toISOString());
  assert.equal(record.preorder.purchaseCutoffAt, '2030-01-15T23:59:59.000Z');
  assert.equal(record.preorder.title, configured().bundle.title);
  assert.equal(record.preorder.tshirtIncluded, false);
  assert.equal(record.preorder.tshirtSize, null);
  assert.equal(record.preorder.shippingAmount, 700);
  assert.deepEqual(record.preorder.schedule, configured().bundle.schedule);
  assert.deepEqual(record.preorder.shippingDetails, shipping);
  assert.equal(record.preorder.customerEmail, 'test@example.invalid');
  assert.equal(orderRecord({ ...session, metadata: { order_id: 'normal' } }, 'verified-session').preorder, undefined);
  assert.doesNotThrow(() => orderRecord({ ...session, metadata: { ...metadata, preorder_schedule: '{bad' } }, 'stripe-webhook'));
});

test('historical paid orders retain their originally agreed T-shirt fulfillment', () => {
  const metadata = {
    order_id: 'historical-order', order_type: 'preorder', preorder_slug: 'ripple-series-preorder',
    preorder_terms_version: 'ripple-preorder-v1',
    preorder_terms_text: 'Original agreed terms: five early books and a free Poker Life T-shirt.',
    preorder_tshirt_included: 'true', preorder_tshirt_size: 'M',
    preorder_schedule: JSON.stringify(configured().bundle.schedule)
  };
  const record = orderRecord({ id: 'cs_test_historical', metadata, payment_status: 'paid' }, 'stripe-webhook');
  assert.equal(record.preorder.termsVersion, 'ripple-preorder-v1');
  assert.equal(record.preorder.termsText, metadata.preorder_terms_text);
  assert.equal(record.preorder.tshirtIncluded, true);
  assert.equal(record.preorder.tshirtSize, 'M');
  assert.deepEqual(record.preorder.schedule, configured().bundle.schedule);
});

test('verified preorder payment persists privately without exposing fulfillment details', async () => {
  const { form } = await checkout(payload('ripple-series-preorder'));
  const metadata = Object.fromEntries([...form].filter(([key]) => key.startsWith('metadata[')).map(([key, value]) => [key.slice(9, -1), value]));
  const session = {
    id: 'cs_test_preorder123', object: 'checkout.session', metadata,
    client_reference_id: form.get('client_reference_id'), payment_status: 'paid',
    amount_total: 10700, currency: 'usd', payment_intent: 'pi_preorder123',
    customer_details: { email: 'test@example.invalid' },
    collected_information: { shipping_details: { name: 'Test Recipient', address: { country: 'US', postal_code: '00000' } } }
  };
  const records = new Map();
  const store = {
    async get(key) { return records.get(key) ?? null; },
    async setJSON(key, value, options = {}) {
      if (options.onlyIfNew && records.has(key)) return { modified: false };
      records.set(key, value);
      return { modified: true };
    }
  };
  const handler = createOrderStatusHandler({ env, storeFactory: () => store, fetchImpl: async () => Response.json(session) });
  const response = await handler(new Request(`https://pokerlifeusa.com/.netlify/functions/order-status?session_id=${session.id}`));
  const publicSummary = await response.json();
  assert.deepEqual(publicSummary, {
    status: 'paid', recorded: true, orderId: metadata.order_id, orderType: 'preorder',
    preorder: { slug: configured().bundle.slug, title: configured().bundle.title, termsVersion: ripplePreorderConfig.termsVersion, termsText: configured().bundle.termsText, schedule: configured().bundle.schedule, shippingAmount: 700, countries: ['US'] }
  });
  assert.equal(JSON.stringify(publicSummary).includes('test@example.invalid'), false);
  assert.equal(JSON.stringify(publicSummary).includes('Test Recipient'), false);
  assert.equal(JSON.stringify(publicSummary).includes('tshirtSize'), false);
  assert.equal(records.get(`paid/${session.id}`).preorder.tshirtIncluded, false);
  assert.equal(records.get(`paid/${session.id}`).preorder.tshirtSize, null);
  assert.equal(records.get(`paid/${session.id}`).preorder.customerEmail, 'test@example.invalid');

  const webhookSecret = 'whsec_fixture';
  const webhook = createStripeWebhookHandler({ env: { STRIPE_WEBHOOK_SECRET: webhookSecret }, storeFactory: () => store });
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ id: 'evt_preorder123', type: 'checkout.session.completed', created: timestamp, data: { object: session } });
  const digest = createHmac('sha256', webhookSecret).update(`${timestamp}.${body}`).digest('hex');
  const signedRequest = () => new Request('https://pokerlifeusa.com/.netlify/functions/stripe-webhook', {
    method: 'POST', headers: { 'stripe-signature': `t=${timestamp},v1=${digest}` }, body
  });
  assert.equal((await webhook(signedRequest())).status, 200);
  assert.equal((await webhook(signedRequest())).status, 200);
  assert.equal(records.size, 2);
  assert.deepEqual(records.get(`paid/${session.id}`).preorder.schedule, configured().bundle.schedule);
});
