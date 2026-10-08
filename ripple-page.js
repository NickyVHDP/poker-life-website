import { ripplePreorderConfig as config } from './ripple-preorder-config.js?v=3';

const dialog = document.querySelector('[data-preorder-dialog]');
const form = dialog.querySelector('[data-preorder-form]');
const submit = dialog.querySelector('[data-preorder-checkout]');
const error = dialog.querySelector('[data-preorder-error]');
const consent = form.elements.accepted;
const money = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
const date = (value) => new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`));
const closedMessage = 'Preorder delivery details and terms are being finalized. Paid checkout is not open yet; no payment is taken.';
let selected = null;
let opener = null;
let busy = false;
let attempt = 0;
let requestController = null;

// This only controls presentation. The server independently validates all terms,
// timing and prices before it creates a Stripe Checkout session.
function isOpen(key) {
  const offer = config[key];
  if (!config.enabled || !offer || !config.countries?.length || !offer.termsText || !config.termsVersion) return false;
  if (!offer.purchaseCutoffAt || Date.parse(offer.purchaseCutoffAt) <= Date.now() + 31 * 60 * 1000 || !Number.isFinite(Date.parse(offer.purchaseCutoffAt))) return false;
  if (key === 'pink') return validDate(offer.releaseDate) && validDate(offer.shipDate) && offer.shippingAmount === 0;
  return Number.isInteger(offer.shippingAmount) && offer.shippingAmount >= 0 && offer.schedule?.length === 5 && offer.schedule.every((item) => validDate(item.releaseDate) && validDate(item.arrivalDate));
}

function details(key) {
  const offer = config[key];
  if (!isOpen(key)) return key === 'pink'
    ? `An autographed copy of The Ripple: Pink for $25 with free U.S. shipping. Planned release: ${offer.releaseWindow}. The exact release and shipping dates are to be announced. Standard book price: $29.99. Cancel before shipment for a full refund.`
    : `All five books for $100 with free U.S. shipping, each received one week before its official release. Pink is planned for ${config.pink.releaseWindow}; release dates for Blue, Red, Yellow, and Black are to be announced. Cancel before the first shipment for a full refund; after shipments begin, cancel unshipped books for $20 per book.`;
  const schedule = key === 'pink'
    ? `Ships by ${date(offer.shipDate)}. Official release: ${date(offer.releaseDate)}.`
    : offer.schedule.map((item) => `${item.volume}: receive by ${date(item.arrivalDate)}; official release ${date(item.releaseDate)}.`).join('\n');
  return `${offer.termsText}\n\n${schedule}\nShipping: ${offer.shippingAmount === 0 ? 'Free' : money(offer.shippingAmount)}. Available to: ${config.countries.join(', ')}.\nPreorders close: ${new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(offer.purchaseCutoffAt))} UTC.`;
}

function updateSubmit() {
  submit.disabled = busy || !selected || !isOpen(selected) || !consent.checked;
}

const pinkOpen = isOpen('pink');
const bundleOpen = isOpen('bundle');
if (!pinkOpen && config.pink.releaseWindow) {
  document.querySelector('[data-pink-date]').textContent = `Planned release: ${config.pink.releaseWindow} · Exact date to be announced`;
}
if (pinkOpen || bundleOpen) {
  document.querySelector('[data-preorder-launch-notice]').textContent = 'Paid preorders are open for the offers with confirmed delivery terms below. Review the dates and terms before continuing to secure checkout.';
}
if (pinkOpen) document.querySelector('[data-pink-date]').textContent = `Ships by ${date(config.pink.shipDate)} · Release ${date(config.pink.releaseDate)}`;
if (bundleOpen) {
  document.querySelector('[data-bundle-date]').textContent = `Five early deliveries · ${config.bundle.shippingAmount === 0 ? 'Free shipping' : `${money(config.bundle.shippingAmount)} shipping`}`;
  const schedule = document.querySelector('[data-release-schedule]');
  for (const item of config.bundle.schedule) {
    const row = document.createElement('li');
    row.textContent = `${item.volume}: release ${date(item.releaseDate)}; bundle arrival by ${date(item.arrivalDate)}.`;
    schedule.append(row);
  }
  schedule.hidden = false;
}
if (pinkOpen || bundleOpen) document.querySelector('[data-release-faq]').textContent = pinkOpen
  ? `Pink releases ${date(config.pink.releaseDate)}. Signed Pink preorders ship by ${date(config.pink.shipDate)}. ${bundleOpen ? 'The complete series schedule is below.' : 'The remaining release schedule will be announced.'}`
  : 'The confirmed release and early bundle arrival dates are listed below.';

for (const button of document.querySelectorAll('[data-preorder-offer]')) {
  button.addEventListener('click', () => {
    selected = button.dataset.preorderOffer;
    opener = button;
    const offer = config[selected];
    const open = isOpen(selected);
    form.reset();
    error.textContent = '';
    dialog.querySelector('#ripple-dialog-title').textContent = offer.title;
    dialog.querySelector('[data-preorder-price]').textContent = money(offer.amount);
    dialog.querySelector('[data-preorder-status]').textContent = open ? 'This is a paid preorder, not an in-stock shipment. Please review the delivery dates and terms.' : closedMessage;
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
