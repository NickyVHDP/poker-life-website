import { isSiteSession, orderStore, recordPaidOrder } from '../lib/order-record.mjs';

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
      return json({ status: 'paid', recorded, orderId: session.metadata.order_id });
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
