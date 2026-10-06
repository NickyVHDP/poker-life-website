// Public offer terms shared by the page and the server. Never put secrets here.
// Paid checkout remains closed until the owner confirms every required field.
export const ripplePreorderConfig = {
  enabled: false,
  termsVersion: 'ripple-preorder-v2',
  countries: [],
  pink: {
    slug: 'ripple-pink-preorder',
    title: 'Ripple: Pink — Autographed Preorder',
    amount: 2500,
    regularAmount: 2999,
    releaseDate: null,
    shipDate: null,
    // Owner-approved ISO timestamp with an explicit timezone (Z or ±HH:MM).
    purchaseCutoffAt: null,
    shippingAmount: 0,
    termsText: null
  },
  bundle: {
    slug: 'ripple-series-preorder',
    title: 'Ripple — Five-Book Preorder Bundle',
    amount: 10000,
    regularBookAmount: 2999,
    volumes: ['Pink', 'Blue', 'Red', 'Yellow', 'Black'],
    shippingAmount: null,
    purchaseCutoffAt: null,
    // Each entry: { volume, releaseDate: 'YYYY-MM-DD', arrivalDate: 'YYYY-MM-DD' }.
    // Arrival must be seven calendar days before release for every volume.
    schedule: [],
    termsText: null
  }
};
