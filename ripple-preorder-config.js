// Public offer terms shared by the page and the server. Never put secrets here.
// Each offer opens independently after its delivery terms are confirmed.
export const ripplePreorderConfig = {
  enabled: true,
  termsVersion: 'ripple-preorder-v4',
  countries: ['US'],
  pink: {
    enabled: true,
    slug: 'ripple-pink-preorder',
    title: 'Ripple: Pink — Autographed Preorder',
    amount: 2500,
    regularAmount: 2999,
    // Owner-approved shipping estimate, not an invented exact release day.
    releaseWindow: 'December 2026',
    estimatedShipMonth: '2026-12',
    releaseDate: null,
    shipDate: null,
    // Optional explicit closing time. Otherwise the estimate expires at month-end.
    purchaseCutoffAt: null,
    shippingAmount: 0,
    termsText: 'Paid preorder: one autographed copy of The Ripple: Pink for $25, charged now, with free U.S. shipping. Estimated shipping: December 2026, not immediate delivery. Cancel before shipment for a full refund. If shipping is delayed, we will contact you to agree to the delay or receive a refund. For help, email larrymccrackenjr@gmail.com. These terms do not limit your statutory rights.'
  },
  bundle: {
    enabled: false,
    slug: 'ripple-series-preorder',
    title: 'Ripple — Five-Book Preorder Bundle',
    amount: 10000,
    regularBookAmount: 2999,
    volumes: ['Pink', 'Blue', 'Red', 'Yellow', 'Black'],
    shippingAmount: 0,
    purchaseCutoffAt: null,
    // Each entry: { volume, releaseDate: 'YYYY-MM-DD', arrivalDate: 'YYYY-MM-DD' }.
    // Arrival must be seven calendar days before release for every volume.
    schedule: [],
    termsText: 'Paid preorder: all five Ripple books for $100 with free U.S. shipping, each received one week before its official release. Pink is planned for December; remaining dates will be announced. Cancel before the first shipment for a full refund. After shipments begin, cancel unshipped books for $20 per book. Contact support for damaged or incorrect deliveries. These terms do not limit your statutory rights.'
  }
};

export function validShipMonth(value) {
  return typeof value === 'string' && /^[1-9]\d{3}-(?:0[1-9]|1[0-2])$/.test(value);
}

// Do not leave a paid preorder open after its advertised shipping window ends.
// This is an expiry safeguard, not a claim about an exact release/shipping day.
export function preorderCutoff(offer) {
  if (offer?.purchaseCutoffAt != null) return Date.parse(offer.purchaseCutoffAt);
  if (!validShipMonth(offer?.estimatedShipMonth)) return NaN;
  const [year, month] = offer.estimatedShipMonth.split('-').map(Number);
  return Date.UTC(year, month, 1);
}
