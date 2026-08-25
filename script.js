const books = [
  { slug: 'texas-holdem-in-texas', title: 'Texas Hold’em in Texas', category: 'strategy', blurb: 'A practical live-game lens.', price: '$14.99', stripeUrl: 'https://buy.stripe.com/4gM00jacCbQQ9yqddt2Nq09', description: 'A grounded guide to reading the rhythms of live Texas Hold’em. It focuses on the decisions that matter between hands: table awareness, disciplined starting ranges, practical bet sizing, and the patience to let a real edge develop.' },
  { slug: 'winning-tournament-poker', title: 'Winning Tournament Poker', category: 'tournament', blurb: 'Progress. Adapt. Win.', price: '$14.99', stripeUrl: 'https://buy.stripe.com/8x2fZhfwW1cch0Sehx2Nq02', description: 'Tournament poker changes as the blinds rise and stack sizes tighten. This book centers on adapting your decisions to the stage of the event, recognizing pressure points, and keeping a clear process when the pace changes.' },
  { slug: 'poker-math-made-easy', title: 'Poker Math Made Easy', category: 'strategy', blurb: 'Control your mind, control the game.', price: '$12.99', stripeUrl: 'https://buy.stripe.com/4gM8wP98ydYYh0Sa1h2Nq04', description: 'Poker math without the fog. A practical companion for building confidence with the numbers behind draws, pot odds, risk, and reward — so the calculations serve your decisions instead of slowing them down.' },
  { slug: 'is-he-bluffing', title: 'Is He Bluffing?', category: 'strategy', blurb: 'Read players. Win more.', price: '$14.99', stripeUrl: 'https://buy.stripe.com/4gMeVdgB0g765ia6P52Nq06', description: 'A book about observing opponents with discipline rather than chasing a single dramatic tell. It helps players think through betting patterns, timing, and board texture while keeping every read open to new evidence.' },
  { slug: 'complete-guide-to-poker-for-women', title: 'The Complete Guide to Poker for Women', category: 'mindset', blurb: 'Learn the right way.', price: '$14.99', stripeUrl: 'https://buy.stripe.com/8x214nbgGcUUfWO0qH2Nq00', description: 'A welcoming, practical starting point for learning poker from the ground up. It covers the language of the game, the habits that make a strong foundation, and the confidence to make decisions at the table.' },
  { slug: 'patient-poker-player-advanced-tactics', title: 'The Patient Poker Player: Advanced Tactics to Outlast and Outplay', category: 'mindset', blurb: 'Discipline. Focus. Results.', price: '$14.99', stripeUrl: 'https://buy.stripe.com/4gM3cvdoObQQ8umddt2Nq03', description: 'An advanced look at the value of waiting for stronger spots. The focus is on controlling pace, applying pressure with purpose, and turning disciplined decision-making into an advantage over long sessions.' },
  { slug: 'i-just-ran-bad', title: 'I Just Ran Bad and Other Lies Poker Players Tell Themselves', category: 'mindset', blurb: 'Other lies players tell.', price: '$14.99', stripeUrl: 'https://buy.stripe.com/7sYdR9bgGdYYcKCgpF2Nq01', description: 'A direct look at the stories players tell themselves after a difficult session. It separates genuine variance from avoidable mistakes and encourages a more useful habit: reviewing the decision before judging the result.' },
  { slug: 'final-table-secrets', title: 'Final Table Secrets', category: 'tournament', blurb: 'Pressure-proof decisions.', price: '$14.99', stripeUrl: 'https://buy.stripe.com/4gM6oHacC088aCu0qH2Nq0b', description: 'Final tables demand a different kind of focus. This book explores stack pressure, changing incentives, and the calm needed to make sound decisions when every chip and every decision feels larger.' },
  { slug: 'poker-tricks-traps-and-mind-games', title: 'Poker Tricks, Traps, and Mind Games', category: 'strategy', blurb: 'Make every read count.', price: '$19.99', stripeUrl: 'https://buy.stripe.com/dRmaEXfwWaMM3a23CT2Nq0c', description: 'A strategy guide for seeing past the obvious line. It looks at common traps, tactical patterns, and the mental game behind a table’s shifting dynamics — with the goal of making each read more deliberate.' },
  { slug: 'poker-what-the-pros-dont-want-you-to-know', title: 'Poker: What the Pros Don’t Want You to Know', category: 'strategy', blurb: 'See beyond the obvious.', price: '$19.99', description: 'A practical guide to recognizing the decisions and patterns that experienced players notice first, so you can build a sharper, more deliberate approach at the table.' },
  { slug: 'poker-players-joke-book', title: 'The Poker Player’s Joke Book', category: 'humor', blurb: 'For the long session.', price: '$9.99', stripeUrl: 'https://buy.stripe.com/5kQcN570q7AA4e68Xd2Nq05', description: 'A lighter seat at the Poker Life table. This collection is for the downtime between hands, the stories that follow a session, and anyone who understands why poker players find the game funny.' },
  { slug: 'poker-life-culture', title: 'Poker Life: The Complete Guide to Poker Culture', category: 'mindset', blurb: 'The poker world, from the inside out.', price: '$19.99', stripeUrl: 'https://buy.stripe.com/4gMaEXacC2gg3a2b5l2Nq0a', description: 'A look at the people, routines, language, and unwritten rules that shape the poker world. It is written for readers who want to understand the culture around the cards as well as the game itself.' },
  { slug: 'only-poker-book-youll-ever-need', title: 'The Only Poker Book You’ll Ever Need', category: 'strategy', blurb: 'One strong reference.', price: '$19.99', stripeUrl: 'https://buy.stripe.com/28E5kDdoO8EE7qi1uL2Nq07', description: 'A broad, practical reference for players who want the core ideas in one place. It brings together strategy, table awareness, basic math, and mindset into an approachable guide for ongoing study.' },
  { slug: 'patient-poker-player-win-more', title: 'The Patient Poker Player: Win More by Playing Less', category: 'mindset', blurb: 'Outlast and outplay.', price: '$14.99', stripeUrl: 'https://buy.stripe.com/28EaEXgB0bQQaCu3CT2Nq08', description: 'A concise case for selective, intentional poker. It challenges the impulse to force action and shows how fewer marginal decisions can lead to a more focused, sustainable approach to the game.' }
];
const covers = {
  'Texas Hold’em in Texas': 'assets/covers/clean/texas-holdem-in-texas.jpg',
  'Winning Tournament Poker': 'assets/covers/clean/winning-tournament-poker.jpg',
  'Poker Math Made Easy': 'assets/covers/clean/poker-math-made-easy.jpg',
  'Is He Bluffing?': 'assets/covers/clean/is-he-bluffing.jpg',
  'The Complete Guide to Poker for Women': 'assets/covers/clean/complete-guide-to-poker-for-women.jpg',
  'The Patient Poker Player: Advanced Tactics to Outlast and Outplay': 'assets/covers/clean/patient-poker-player-advanced-tactics.jpg',
  'I Just Ran Bad and Other Lies Poker Players Tell Themselves': 'assets/covers/clean/i-just-ran-bad.jpg',
  'Final Table Secrets': 'assets/covers/clean/final-table-secrets.jpg',
  'Poker Tricks, Traps, and Mind Games': 'assets/covers/clean/poker-tricks-traps-and-mind-games.jpg',
  'Poker: What the Pros Don’t Want You to Know': 'assets/covers/clean/poker-what-the-pros-dont-want-you-to-know.jpg',
  'The Poker Player’s Joke Book': 'assets/covers/clean/poker-players-joke-book.jpg',
  'Poker Life: The Complete Guide to Poker Culture': 'assets/covers/clean/poker-life-culture.jpg',
  'The Only Poker Book You’ll Ever Need': 'assets/covers/clean/the-only-poker-book.jpg',
  'The Patient Poker Player: Win More by Playing Less': 'assets/covers/clean/patient-poker-player-win-more.jpg'
};

// Apparel will join this exact cart once its real products, prices, and images
// are ready. Keeping it empty prevents placeholder merchandise from appearing for sale.
const merch = [];

const products = [
  ...books.map((book) => ({ ...book, kind: 'book', amount: Number(book.price.replace(/[^0-9.]/g, '')) * 100, image: covers[book.title] })),
  ...merch.map((item) => ({ ...item, kind: 'merch', amount: null }))
];
const cartStorageKey = 'poker-life-cart-v1';

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(cartStorageKey) || '[]');
    return Array.isArray(saved) ? saved.filter((line) => getProduct(line.slug) && Number(line.quantity) > 0) : [];
  } catch {
    return [];
  }
}

let cart = readCart();

function getProduct(slug) {
  return products.find((product) => product.slug === slug);
}

function saveCart() {
  localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  renderCartCount();
}

function cartQuantity() {
  return cart.reduce((total, line) => total + line.quantity, 0);
}

function cartTotal() {
  return cart.reduce((total, line) => total + ((getProduct(line.slug)?.amount || 0) * line.quantity), 0);
}

function money(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function addToCart(slug) {
  const product = getProduct(slug);
  if (!product) return;
  const line = cart.find((item) => item.slug === slug);
  if (line) line.quantity += 1;
  else cart.push({ slug, quantity: 1 });
  saveCart();
}

function setCartQuantity(slug, quantity) {
  cart = cart.map((line) => line.slug === slug ? { ...line, quantity } : line).filter((line) => line.quantity > 0);
  saveCart();
}

function renderCartCount() {
  const quantity = cartQuantity();
  document.querySelectorAll('[data-cart-count]').forEach((count) => {
    count.textContent = String(quantity);
    count.hidden = quantity === 0;
  });
  document.querySelectorAll('[data-cart-link]').forEach((link) => link.setAttribute('aria-label', `${quantity} item${quantity === 1 ? '' : 's'} in cart`));
}

function productPrice(product) {
  return product.amount == null ? 'Price coming soon' : money(product.amount);
}

function bookCheckoutUrl(book) {
  return `checkout.html?add=${encodeURIComponent(book.slug)}`;
}

const amazonPaperbackLinks = {
  'texas-holdem-in-texas': 'https://www.amazon.com/dp/B0H4XGQ4W2?th=1&psc=1',
  'winning-tournament-poker': 'https://www.amazon.com/dp/B0H3C2391D?th=1&psc=1',
  'poker-math-made-easy': 'https://www.amazon.com/dp/B0GTG5WD6G?th=1&psc=1',
  'is-he-bluffing': 'https://www.amazon.com/dp/B0H2MY32GR?th=1&psc=1',
  'complete-guide-to-poker-for-women': 'https://www.amazon.com/dp/B0GTFZFKSK?th=1&psc=1',
  'patient-poker-player-advanced-tactics': 'https://www.amazon.com/dp/B0GTG5TW56?th=1&psc=1',
  'patient-poker-player-win-more': 'https://www.amazon.com/dp/B0GT7541GL?th=1&psc=1',
  'i-just-ran-bad': 'https://www.amazon.com/dp/B0H624RHW4?th=1&psc=1',
  'final-table-secrets': 'https://www.amazon.com/dp/B0H6PCQFY2?th=1&psc=1',
  'poker-tricks-traps-and-mind-games': 'https://www.amazon.com/dp/B0H7H8KW5J?th=1&psc=1',
  'poker-what-the-pros-dont-want-you-to-know': 'https://www.amazon.com/dp/B0GTVK8JT8?th=1&psc=1',
  'poker-life-culture': 'https://www.amazon.com/dp/B0H9GTJXGP?th=1&psc=1',
  'only-poker-book-youll-ever-need': 'https://www.amazon.com/dp/B0H6P1QCX4?th=1&psc=1'
};

function amazonSearchUrl(book) {
  return amazonPaperbackLinks[book.slug] || `https://www.amazon.com/s?k=${encodeURIComponent(`${book.title} Larry McCracken`)}`;
}

function makeBook(book) {
  return `<article class="book-card" data-book-card><div class="book-cover"><span class="type">${book.category}</span><img src="${covers[book.title]}" alt="Cover of ${book.title}" loading="lazy" /></div><div class="book-copy"><h4>${book.title}</h4><p>${book.blurb}</p><div class="price">${book.price}</div><button class="book-details" type="button" data-book-details="${book.slug}" aria-label="View details for ${book.title}">View details</button><button class="button gold" type="button" data-add-to-cart="${book.slug}">Add to cart</button></div></article>`;
}

// Any page can host the grid. `data-book-limit` decides how many show;
// omit it (books.html) to render the full catalog from this single dataset.
const grid = document.querySelector('#book-grid');
if (grid) {
  const limit = Number(grid.dataset.bookLimit) || books.length;
  grid.innerHTML = books.slice(0, limit).map(makeBook).join('');
}

const bookCount = document.querySelector('#book-count');
if (bookCount) bookCount.textContent = String(books.length);

function getBook(slug) {
  return books.find((book) => book.slug === slug);
}

function showBookDetails(book) {
  let modal = document.querySelector('#book-details-modal');
  if (!modal) {
    modal = document.createElement('dialog');
    modal.id = 'book-details-modal';
    modal.className = 'book-modal';
    document.body.append(modal);
  }

  modal.innerHTML = `<div class="book-modal-shell"><button class="book-modal-close" type="button" data-close-book-modal aria-label="Close book details">×</button><div class="book-modal-cover"><img src="${covers[book.title]}" alt="Cover of ${book.title}" /></div><div class="book-modal-copy"><p class="section-kicker">Poker Life ${book.category}</p><h2>${book.title}</h2><p class="book-modal-price">${book.price}</p><p>${book.description}</p><div class="book-modal-actions"><button class="button gold" type="button" data-add-to-cart="${book.slug}">Add to cart &nbsp; →</button><a class="button outline" href="${amazonSearchUrl(book)}" target="_blank" rel="noopener noreferrer">Find on Amazon ↗</a></div><p class="book-modal-note">Your selection stays in the Poker Life cart until you are ready for checkout.</p></div></div>`;
  modal.showModal();
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-book-details]');
  if (trigger) {
    showBookDetails(getBook(trigger.dataset.bookDetails));
    return;
  }

  const addButton = event.target.closest('[data-add-to-cart]');
  if (addButton) {
    addToCart(addButton.dataset.addToCart);
    addButton.textContent = 'Added to cart ✓';
    window.setTimeout(() => { addButton.textContent = 'Add to cart'; }, 1200);
    return;
  }

  const cartChange = event.target.closest('[data-cart-change]');
  if (cartChange) {
    const line = cart.find((item) => item.slug === cartChange.dataset.cartChange);
    if (line) setCartQuantity(line.slug, line.quantity + Number(cartChange.dataset.cartDelta));
    renderCheckoutPage();
    return;
  }

  const cartRemove = event.target.closest('[data-cart-remove]');
  if (cartRemove) {
    setCartQuantity(cartRemove.dataset.cartRemove, 0);
    renderCheckoutPage();
    return;
  }

  const checkoutButton = event.target.closest('[data-start-stripe-checkout]');
  if (checkoutButton) startStripeCheckout(checkoutButton);

  if (event.target.closest('[data-close-book-modal]')) {
    document.querySelector('#book-details-modal')?.close();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') document.querySelector('#book-details-modal')?.close();
});

function makeMerch(item) {
  return `<article class="merch-card"><div class="merch-card-image"><img src="${item.image}" alt="${item.title}" loading="lazy" /></div><p class="section-kicker">${item.category}</p><h3>${item.title}</h3><p>${item.description}</p><div class="price">${productPrice(item)}</div><button class="button outline" type="button" data-add-to-cart="${item.slug}">Add to cart</button></article>`;
}

document.querySelectorAll('[data-merch-grid]').forEach((grid) => { grid.innerHTML = merch.map(makeMerch).join(''); });

function renderCheckoutPage() {
  const checkoutPage = document.querySelector('[data-checkout-page]');
  if (!checkoutPage) return;
  const lines = cart.map((line) => ({ ...line, product: getProduct(line.slug) })).filter((line) => line.product);
  if (!lines.length) {
    checkoutPage.innerHTML = `<div class="checkout-empty"><p class="section-kicker">Your cart is empty</p><h2>Build your Poker Life library.</h2><p>Add books or gear from the shop, then return here when you are ready.</p><a class="button gold" href="shop.html">Browse the shop &nbsp; →</a></div>`;
    return;
  }
  const needsPricing = lines.some((line) => line.product.amount == null);
  const rows = lines.map(({ product, quantity }) => `<article class="cart-line"><img src="${product.image}" alt="" /><div><p class="section-kicker">${product.kind === 'book' ? 'Book' : product.category}</p><h3>${product.title}</h3><p>${productPrice(product)}</p></div><div class="cart-line-controls"><div class="quantity-controls"><button type="button" data-cart-change="${product.slug}" data-cart-delta="-1" aria-label="Remove one ${product.title}">−</button><span>${quantity}</span><button type="button" data-cart-change="${product.slug}" data-cart-delta="1" aria-label="Add one ${product.title}">+</button></div><button class="cart-remove" type="button" data-cart-remove="${product.slug}">Remove</button></div><strong>${product.amount == null ? 'Pending price' : money(product.amount * quantity)}</strong></article>`).join('');
  checkoutPage.innerHTML = `<div class="cart-checkout"><div class="cart-items"><p class="section-kicker">Your cart</p><h2>${cartQuantity()} item${cartQuantity() === 1 ? '' : 's'} selected.</h2>${rows}</div><aside class="cart-summary"><p class="section-kicker">Order summary</p><h2>Ready when you are.</h2><div class="cart-total"><span>Subtotal</span><strong>${money(cartTotal())}</strong></div><p class="cart-summary-note">Shipping, taxes, delivery format, and any applicable fees are confirmed during secure checkout.</p>${needsPricing ? `<div class="checkout-status"><strong>Gear price needed</strong><p>One or more gear items does not yet have a published price or Stripe product, so this cart cannot be paid for online yet.</p></div>` : `<div class="checkout-status"><strong>Secure checkout</strong><p>You will be taken to Stripe to complete this single combined order securely.</p></div><button class="button gold checkout-primary" type="button" data-start-stripe-checkout>Continue to secure checkout &nbsp; →</button><p class="checkout-error" data-checkout-error aria-live="polite"></p>`}<a class="button outline" href="shop.html">Continue shopping</a></aside></div>`;
}

async function startStripeCheckout(button) {
  const message = document.querySelector('[data-checkout-error]');
  button.disabled = true;
  button.textContent = 'Opening secure checkout…';
  if (message) message.textContent = '';
  try {
    const response = await fetch('/.netlify/functions/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url) throw new Error(payload.error || 'Secure checkout is not available yet.');
    window.location.assign(payload.url);
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Continue to secure checkout →';
    if (message) message.textContent = error.message;
  }
}

const checkoutAdd = new URLSearchParams(window.location.search).get('add');
if (checkoutAdd && getProduct(checkoutAdd)) {
  addToCart(checkoutAdd);
  history.replaceState(null, '', 'checkout.html');
}
renderCartCount();
renderCheckoutPage();

if (document.querySelector('[data-order-confirmed]') && new URLSearchParams(window.location.search).get('session_id')) {
  cart = [];
  saveCart();
}

function applyBookSearch(query) {
  const normalized = query.trim().toLowerCase();
  const visibleBooks = normalized ? books.filter((book) => `${book.title} ${book.category} ${book.blurb} ${book.description}`.toLowerCase().includes(normalized)) : books;
  if (grid) {
    const limit = Number(grid.dataset.bookLimit);
    grid.innerHTML = visibleBooks.slice(0, limit || visibleBooks.length).map(makeBook).join('');
  }
  document.querySelectorAll('[data-search-result-count]').forEach((node) => { node.textContent = normalized ? `${visibleBooks.length} result${visibleBooks.length === 1 ? '' : 's'} found` : ''; });
}

const catalogSearch = document.querySelector('[data-catalog-search]');
if (catalogSearch) {
  const query = new URLSearchParams(window.location.search).get('q') || '';
  catalogSearch.value = query;
  applyBookSearch(query);
  catalogSearch.addEventListener('input', () => applyBookSearch(catalogSearch.value));
}

document.querySelectorAll('[data-search-toggle]').forEach((button) => button.addEventListener('click', () => {
  const search = document.querySelector('[data-site-search]');
  if (!search) return;
  search.hidden = !search.hidden;
  if (!search.hidden) search.querySelector('input')?.focus();
}));
document.querySelectorAll('[data-site-search]').forEach((form) => form.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = new FormData(form).get('q')?.toString().trim() || '';
  window.location.href = `books.html${query ? `?q=${encodeURIComponent(query)}` : ''}`;
}));

// Use a real image element for the hands-studied mark so it is not affected by SVG/CSS icon styling.
const handsStudiedIcon = document.querySelector('.stats-bar div:nth-child(3) .stat-icon');
if (handsStudiedIcon) {
  const icon = document.createElement('img');
  icon.className = 'stat-icon hands-studied-icon';
  icon.src = 'assets/hands-studied-card-fan.png?v=1';
  icon.alt = '';
  handsStudiedIcon.replaceWith(icon);
}


// Forms are local-only: confirm the input was captured in the browser,
// never claim anything was sent or subscribed.
document.querySelectorAll('form[data-local-form]').forEach((form) => {
  const status = form.querySelector('.form-status, .form-note');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!status) return;
    const data = new FormData(form);
    const email = (data.get('email') || '').toString().trim();
    const message = (data.get('message') || '').toString().trim();
    if (form.dataset.localForm === 'contact') {
      status.textContent = !email || !message
        ? 'Please add your email address and a message.'
        : 'Preview only — nothing has been delivered. The contact service is not connected yet, so your details stay in this browser tab.';
      return;
    }
    status.textContent = email
      ? `${email} is ready for newsletter connection. No subscription has been created yet — this form is not connected to a mailing list.`
      : 'Please enter your email address.';
  });
});
