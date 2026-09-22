import { createHmac, timingSafeEqual } from 'node:crypto';
import { isSitePaymentIntent, isSiteSession, orderStore, recordPaidOrder } from '../lib/order-record.mjs';

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

const handledEvents = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'payment_intent.payment_failed'
]);

export function verifyStripeSignature(body, header, secret, now = Date.now()) {
  const parts = Object.fromEntries(header.split(',').map((part) => part.trim().split('=', 2)));
  const timestamp = Number(parts.t);
  if (!Number.isInteger(timestamp) || Math.abs(now - timestamp * 1000) > 300000) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest();
  return header.split(',').some((part) => {
    const [key, value] = part.trim().split('=', 2);
    if (key !== 'v1' || !/^[a-f0-9]{64}$/i.test(value || '')) return false;
    const actual = Buffer.from(value, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

export function createStripeWebhookHandler({ env = process.env, storeFactory = orderStore } = {}) {
  return async (request) => {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: 'Webhook is not configured.' }, 503);
    const signature = request.headers.get('stripe-signature');
    if (!signature) return json({ error: 'Missing Stripe signature.' }, 400);

    let event;
    try {
      const body = await request.text();
      if (!verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET)) throw new Error('Invalid signature');
      event = JSON.parse(body);
    } catch {
      return json({ error: 'Invalid Stripe signature.' }, 400);
    }
    if (!handledEvents.has(event.type)) return json({ received: true });
    const object = event.data?.object;
    if (event.type === 'payment_intent.payment_failed' ? !isSitePaymentIntent(object) : !isSiteSession(object)) {
      return json({ received: true });
    }

    try {
      const store = storeFactory();
      if (event.type === 'payment_intent.payment_failed') {
        await store.setJSON(`failed-order/${object.metadata.order_id}`, {
          orderId: object.metadata.order_id,
          paymentIntentId: object.id,
          eventId: event.id,
          errorCode: object.last_payment_error?.code || null,
          declineCode: object.last_payment_error?.decline_code || null,
          failedAt: new Date(event.created * 1000).toISOString()
        });
      } else if (object.payment_status === 'paid' && event.type !== 'checkout.session.async_payment_failed') {
        await recordPaidOrder(store, object, 'stripe-webhook', event.id);
      } else if (event.type === 'checkout.session.async_payment_failed') {
        await store.setJSON(`failed/${object.id}`, {
          sessionId: object.id,
          eventId: event.id,
          failedAt: new Date(event.created * 1000).toISOString()
        }, { onlyIfNew: true });
      }
      await store.setJSON(`events/${event.id}`, {
        eventId: event.id,
        type: event.type,
        resourceId: object.id,
        paymentStatus: object.payment_status || object.status,
        receivedAt: new Date().toISOString()
      }, { onlyIfNew: true });
    } catch (error) {
      console.error('Could not record Stripe event:', error);
      return json({ error: 'Could not record event.' }, 503);
    }
    return json({ received: true });
  };
}

export default createStripeWebhookHandler();
