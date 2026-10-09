import { isSiteSession, orderStore, recordPaidOrder } from '../lib/order-record.mjs';
import { validShipMonth } from '../../ripple-preorder-config.js';

const preorderTitles = {
  'ripple-pink-preorder': 'Ripple: Pink — Autographed Preorder',
  'ripple-series-preorder': 'Ripple — Five-Book Preorder Bundle'
};

function publicPreorderSummary(session) {
  const metadata = session.metadata;
  if (metadata.order_type !== 'preorder') return null;
  const text = (value, limit) => typeof value === 'string' && value.length <= limit ? value : null;
  const slug = Object.hasOwn(preorderTitles, metadata.preorder_slug) ? metadata.preorder_slug : null;
  let schedule = [];
  try {
    const parsed = JSON.parse(metadata.preorder_schedule || '[]');
    if (Array.isArray(parsed) && parsed.length <= 5) {
      schedule = parsed.filter(entry => ['Pink', 'Blue', 'Red', 'Yellow', 'Black'].includes(entry?.volume)).map(entry => {
        const safe = { volume: entry.volume };
        if (validShipMonth(entry.estimatedShipMonth)) safe.estimatedShipMonth = entry.estimatedShipMonth;
        for (const key of ['releaseDate', 'shipDate', 'arrivalDate']) {
          const date = entry[key];
          if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
          const timestamp = Date.parse(date + 'T00:00:00Z');
          if (Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date) safe[key] = date;
        }
        return safe;
      });
    }
  } catch { /* A missing historical summary must not hide a confirmed payment. */ }
  const amount = typeof metadata.preorder_shipping_amount === 'string' && /^\d{1,6}$/.test(metadata.preorder_shipping_amount)
    ? Number(metadata.preorder_shipping_amount) : null;
  const countries = [...new Set((text(metadata.preorder_countries, 500) || '').split(',').filter(country => /^[A-Z]{2}$/.test(country)))];
  // Whitelist only public offer terms. Do not return customer or fulfillment PII.
  return {
    slug,
    title: text(metadata.preorder_title, 120) || preorderTitles[slug] || 'Preorder',
    termsVersion: text(metadata.preorder_terms_version, 100),
    termsText: text(metadata.preorder_terms_text, 500),
    schedule,
    shippingAmount: amount !== null && amount <= 100000 ? amount : null,
    countries
  };
}

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });
}

export function createOrderStatusHandler({ env = process.env, fetchImpl = fetch, storeFactory = orderStore } = {}) {
  return async (request) => {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    const sessionId = new URL(request.url).searchParams.get('session_id') || '';
    if (!/^cs_(?:live|test)_[A-Za-z0-9]+$/.test(sessionId)) return json({ error: 'Invalid checkout session.' }, 400);
    if (!env.STRIPE_SECRET_KEY) return json({ error: 'Order verification is unavailable.' }, 503);

    let session;
    try {
      const stripeResponse = await fetchImpl(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
        signal: AbortSignal.timeout(8000)
      });
      if (stripeResponse.status === 404) return json({ error: 'Checkout session not found.' }, 404);
      if (!stripeResponse.ok) throw new Error(`Stripe returned HTTP ${stripeResponse.status}`);
      session = await stripeResponse.json();
    } catch (error) {
      console.error('Could not retrieve Stripe Checkout session:', error);
      return json({ error: 'Order verification is temporarily unavailable.' }, 502);
    }
    if (!isSiteSession(session)) return json({ error: 'Checkout session not found.' }, 404);

    if (session.payment_status === 'paid') {
      let recorded = false;
      try {
        const store = storeFactory();
        await recordPaidOrder(store, session, 'verified-session');
        recorded = true;
      } catch (error) {
        console.error('Could not save a paid order record:', error);
      }
      const preorder = publicPreorderSummary(session);
      return json({ status: 'paid', recorded, orderId: session.metadata.order_id, ...(preorder ? { orderType: 'preorder', preorder } : {}) });
    }
    if (session.status === 'expired') return json({ status: 'expired' });
    try {
      const store = storeFactory();
      const failure = await store.get(`failed/${session.id}`, { type: 'json' })
        || await store.get(`failed-order/${session.metadata.order_id}`, { type: 'json' });
      if (failure) return json({ status: 'failed' });
    } catch (error) {
      console.error('Could not check for a failed payment record:', error);
    }
    return json({ status: session.status === 'complete' ? 'processing' : 'pending' });
  };
}

export default createOrderStatusHandler();
