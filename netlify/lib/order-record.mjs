import { getStore } from '@netlify/blobs';

export function orderStore() {
  return getStore({ name: 'poker-life-orders', consistency: 'strong' });
}

export function isSiteSession(session) {
  return session?.object === 'checkout.session'
    && /^cs_(?:live|test)_[A-Za-z0-9]+$/.test(session.id || '')
    && session.metadata?.site === 'pokerlifeusa.com'
    && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(session.metadata.order_id || '')
    && session.client_reference_id === `pokerlife_${session.metadata.order_id}`;
}

export function isSitePaymentIntent(intent) {
  return intent?.object === 'payment_intent'
    && /^pi_[A-Za-z0-9]+$/.test(intent.id || '')
    && intent.metadata?.site === 'pokerlifeusa.com'
    && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(intent.metadata.order_id || '');
}

export function orderRecord(session, source, eventId = null) {
  return {
    orderId: session.metadata.order_id,
    sessionId: session.id,
    paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null,
    amountTotal: session.amount_total,
    currency: session.currency,
    paymentStatus: session.payment_status,
    source,
    eventId,
    recordedAt: new Date().toISOString()
  };
}

export async function recordPaidOrder(store, session, source, eventId = null) {
  if (session.payment_status !== 'paid') throw new Error('Cannot record an unpaid order.');
  const key = `paid/${session.id}`;
  await store.setJSON(key, orderRecord(session, source, eventId), { onlyIfNew: true });
}
