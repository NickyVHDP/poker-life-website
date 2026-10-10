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

export function preorderShippingAmount(session) {
  const metadata = session.metadata || {};
  // New rate-based orders capture Stripe's actual charge. Never infer free
  // shipping from a missing amount, or rewrite a historical order's terms.
  const amount = metadata.preorder_shipping_policy === 'standard-book'
    ? session.total_details?.amount_shipping
    : /^\d{1,6}$/.test(metadata.preorder_shipping_amount || '') ? Number(metadata.preorder_shipping_amount) : null;
  return Number.isInteger(amount) && amount >= 0 && amount <= 100000 ? amount : null;
}

export function orderRecord(session, source, eventId = null) {
  const metadata = session.metadata || {};
  let preorder = null;
  if (metadata.order_type === 'preorder') {
    let schedule = [];
    try {
      const parsed = JSON.parse(metadata.preorder_schedule || '[]');
      if (Array.isArray(parsed)) schedule = parsed;
    } catch { /* Preserve paid status even if historical metadata is malformed. */ }
    preorder = {
      slug: metadata.preorder_slug || null,
      title: metadata.preorder_title || null,
      termsVersion: metadata.preorder_terms_version || null,
      termsText: metadata.preorder_terms_text || null,
      acceptedAt: metadata.preorder_accepted_at || null,
      purchaseCutoffAt: metadata.preorder_purchase_cutoff_at || null,
      shippingAmount: preorderShippingAmount(session),
      countries: (metadata.preorder_countries || '').split(',').filter(Boolean),
      autographed: metadata.preorder_autographed === 'true',
      tshirtIncluded: metadata.preorder_tshirt_included === 'true',
      tshirtSize: metadata.preorder_tshirt_size || null,
      schedule,
      // This private fulfillment record is never returned by the public status endpoint.
      shippingDetails: session.collected_information?.shipping_details || session.shipping_details || null,
      customerEmail: session.customer_details?.email || null
    };
  }
  return {
    orderId: session.metadata.order_id,
    sessionId: session.id,
    paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null,
    amountTotal: session.amount_total,
    currency: session.currency,
    paymentStatus: session.payment_status,
    source,
    eventId,
    recordedAt: new Date().toISOString(),
    ...(preorder ? { orderType: 'preorder', preorder } : {})
  };
}

export async function recordPaidOrder(store, session, source, eventId = null) {
  if (session.payment_status !== 'paid') throw new Error('Cannot record an unpaid order.');
  const key = `paid/${session.id}`;
  await store.setJSON(key, orderRecord(session, source, eventId), { onlyIfNew: true });
}
