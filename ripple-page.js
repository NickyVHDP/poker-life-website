import { ripplePreorderConfig as config, preorderCutoff } from './ripple-preorder-config.js?v=5';

const dialog = document.querySelector('[data-preorder-dialog]');
const form = dialog.querySelector('[data-preorder-form]');
const submit = dialog.querySelector('[data-preorder-checkout]');
const error = dialog.querySelector('[data-preorder-error]');
const consent = form.elements.accepted;
const money = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
const date = (value) => new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`));
const validMonth = (value) => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const month = (value) => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`));
const closedMessage = 'Preorder delivery details and terms are being finalized. Paid checkout is not open yet; no payment is taken.';
let selected = null;
let opener = null;
let busy = false;
let attempt = 0;
let requestController = null;

// This only controls presentation. The server independently validates all terms,
// timing and prices before it creates a Stripe Checkout session.
function isOpen(key) {
  // Only Pink is offered publicly. The complete series is coming soon.
  if (key !== 'pink') return false;
  const offer = config[key];
  if (!config.enabled || !offer || offer.enabled !== true || !config.countries?.length || !offer.termsText || !config.termsVersion) return false;
  const cutoff = preorderCutoff(offer);
  if (!Number.isFinite(cutoff) || cutoff <= Date.now() + 31 * 60 * 1000) return false;
  const shippingConfirmed = offer.shippingPolicy === 'standard-book'
    ? offer.shippingAmount === null
    : (!offer.shippingPolicy || offer.shippingPolicy === 'fixed') && offer.shippingAmount === 0;
  return (validMonth(offer.estimatedShipMonth) || (validDate(offer.releaseDate) && validDate(offer.shipDate))) && shippingConfirmed;
}

function details(key) {
  const offer = config[key];
  if (!isOpen(key)) return `An autographed copy of The Ripple: Pink for $25 plus standard one-book shipping, shown in Stripe before payment. ${validMonth(offer.estimatedShipMonth) ? `Estimated shipping: ${month(offer.estimatedShipMonth)}.` : `Planned release: ${offer.releaseWindow}. The exact release and shipping dates are to be announced.`} Standard book price: $29.99. Cancel before shipment for a full refund.`;
  const schedule = validMonth(offer.estimatedShipMonth) ? `Estimated shipping: ${month(offer.estimatedShipMonth)}. This is an estimate, not a guaranteed arrival date.` : `Ships by ${date(offer.shipDate)}. Official release: ${date(offer.releaseDate)}.`;
  const cutoff = offer.purchaseCutoffAt ? `\nPreorders close: ${new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(offer.purchaseCutoffAt))} UTC.` : '';
  const shipping = offer.shippingPolicy === 'standard-book' ? 'Standard one-book shipping, added at checkout and shown before payment' : offer.shippingAmount === 0 ? 'Free' : money(offer.shippingAmount);
  return `${offer.termsText}\n\n${schedule}\nShipping: ${shipping}. Available to: ${config.countries.join(', ')}.${cutoff}`;
}

function updateSubmit() {
  submit.disabled = busy || !selected || !isOpen(selected) || !consent.checked;
}

const pinkOpen = isOpen('pink');
if (!pinkOpen && config.pink.releaseWindow) {
  document.querySelector('[data-pink-date]').textContent = `Planned release: ${config.pink.releaseWindow} · Exact date to be announced`;
}
if (pinkOpen) {
  document.querySelector('[data-preorder-launch-notice]').textContent = 'Signed Pink preorders are open: $25 plus standard one-book shipping, shown in Stripe before payment. Payment is collected now. Estimated shipping: ' + (validMonth(config.pink.estimatedShipMonth) ? month(config.pink.estimatedShipMonth) : date(config.pink.shipDate)) + '.';
}
if (pinkOpen) document.querySelector('[data-pink-date]').textContent = validMonth(config.pink.estimatedShipMonth)
  ? `Estimated shipping: ${month(config.pink.estimatedShipMonth)} · U.S. only`
  : `Ships by ${date(config.pink.shipDate)} · Release ${date(config.pink.releaseDate)}`;
if (pinkOpen) document.querySelector('[data-release-faq]').textContent = `${validMonth(config.pink.estimatedShipMonth) ? `Signed Pink preorders are estimated to ship in ${month(config.pink.estimatedShipMonth)}; the exact release day is to be announced. This is not a guaranteed arrival date.` : `Pink releases ${date(config.pink.releaseDate)}. Signed Pink preorders ship by ${date(config.pink.shipDate)}.`} Blue, Red, Yellow, and Black are coming soon; their release dates have not been set yet.`;

for (const button of document.querySelectorAll('[data-preorder-offer="pink"]')) {
  button.addEventListener('click', () => {
    selected = button.dataset.preorderOffer;
    opener = button;
    const offer = config[selected];
    const open = isOpen(selected);
    form.reset();
    error.textContent = '';
    dialog.querySelector('#ripple-dialog-title').textContent = offer.title;
    dialog.querySelector('[data-preorder-price]').textContent = money(offer.amount);
    dialog.querySelector('[data-preorder-status]').textContent = open ? 'This is a paid preorder, not an in-stock shipment. Payment is collected now. Please review the estimated shipping and terms.' : closedMessage;
    dialog.querySelector('[data-preorder-terms]').textContent = details(selected);
    dialog.querySelector('[data-preorder-consent]').hidden = !open;
    consent.disabled = !open;
    submit.textContent = open ? 'Continue to secure checkout →' : 'Checkout opens soon';
    updateSubmit();
    dialog.showModal();
  });
}
dialog.querySelector('[data-preorder-close]').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  // A dismissed offer must never redirect after a different offer is opened.
  attempt += 1;
  requestController?.abort();
  requestController = null;
  busy = false;
  opener?.focus();
});
form.addEventListener('change', updateSubmit);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy || !selected || !isOpen(selected) || !form.reportValidity() || !consent.checked) return;
  const key = selected;
  const requestAttempt = ++attempt;
  requestController = new AbortController();
  busy = true;
  updateSubmit();
  error.textContent = '';
  submit.textContent = 'Opening secure checkout…';
  try {
    const response = await fetch('/.netlify/functions/create-checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: requestController.signal,
      body: JSON.stringify({
        items: [{ slug: config[key].slug, quantity: 1 }],
        preorder: { accepted: true, termsVersion: config.termsVersion }
      })
    });
    const result = await response.json();
    if (requestAttempt !== attempt || !dialog.open) return;
    if (!response.ok) throw new Error(result.error || 'Checkout could not be opened. Please try again.');
    const checkout = new URL(result.url);
    if (checkout.protocol !== 'https:' || checkout.hostname !== 'checkout.stripe.com') throw new Error('The checkout link could not be verified. Please contact us.');
    window.location.assign(checkout.href);
  } catch (problem) {
    if (requestAttempt === attempt && problem.name !== 'AbortError') error.textContent = problem.message || 'Checkout is temporarily unavailable. Please try again.';
  } finally {
    if (requestAttempt === attempt) {
      busy = false;
      requestController = null;
      submit.textContent = isOpen(selected) ? 'Continue to secure checkout →' : 'Checkout opens soon';
      updateSubmit();
    }
  }
});
