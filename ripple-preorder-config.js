// Public offer terms shared by the page and the server. Never put secrets here.
// Paid checkout remains closed until the owner confirms every required field.
export const ripplePreorderConfig = {
  enabled: false,
  termsVersion: 'ripple-preorder-v3',
  countries: ['US'],
  pink: {
    slug: 'ripple-pink-preorder',
    title: 'Ripple: Pink — Autographed Preorder',
    amount: 2500,
    regularAmount: 2999,
    // Owner-confirmed release window; no exact release or shipping day yet.
    releaseWindow: 'December',
    releaseDate: null,
    shipDate: null,
    // Owner-approved ISO timestamp with an explicit timezone (Z or ±HH:MM).
    purchaseCutoffAt: null,
    shippingAmount: 0,
    termsText: 'Paid preorder: one autographed copy of The Ripple: Pink for $25, with free U.S. shipping. Pink is planned for December; its exact release and shipping dates will be announced. Cancel before shipment for a full refund. Contact support for damaged or incorrect deliveries. These terms do not limit your statutory rights.'
  },
  bundle: {
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
