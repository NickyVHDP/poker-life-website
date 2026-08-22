const books = [
  ['Texas Hold’em in Texas', 'strategy', 'A practical live-game lens.', '$9.99', 'https://buy.stripe.com/4gM00jacCbQQ9yqddt2Nq09'], ['Winning Tournament Poker', 'tournament', 'Progress. Adapt. Win.', '$9.99', 'https://buy.stripe.com/8x2fZhfwW1cch0Sehx2Nq02'], ['Poker Math Made Easy', 'strategy', 'Control your mind, control the game.', '$9.99', 'https://buy.stripe.com/4gM8wP98ydYYh0Sa1h2Nq04'], ['Is He Bluffing?', 'strategy', 'Read players. Win more.', '$9.99', 'https://buy.stripe.com/4gMeVdgB0g765ia6P52Nq06'], ['The Complete Guide to Poker for Women', 'mindset', 'Learn the right way.', '$9.99', 'https://buy.stripe.com/8x214nbgGcUUfWO0qH2Nq00'], ['The Patient Poker Player: Advanced Tactics to Outlast and Outplay', 'mindset', 'Discipline. Focus. Results.', '$9.99', 'https://buy.stripe.com/4gM3cvdoObQQ8umddt2Nq03'], ['I Just Ran Bad and Other Lies Poker Players Tell Themselves', 'mindset', 'Other lies players tell.', '$9.99', 'https://buy.stripe.com/7sYdR9bgGdYYcKCgpF2Nq01'], ['Final Table Secrets', 'tournament', 'Pressure-proof decisions.', '$9.99', 'https://buy.stripe.com/4gM6oHacC088aCu0qH2Nq0b'], ['Poker Tricks, Traps, and Mind Games', 'strategy', 'Make every read count.', '$9.99', 'https://buy.stripe.com/dRmaEXfwWaMM3a23CT2Nq0c'], ['The Poker Player’s Joke Book', 'humor', 'For the long session.', '$9.99', 'https://buy.stripe.com/5kQcN570q7AA4e68Xd2Nq05'], ['Poker Life: The Complete Guide to Poker Culture', 'mindset', 'The poker world, from the inside out.', '$9.99', 'https://buy.stripe.com/4gMaEXacC2gg3a2b5l2Nq0a'], ['The Only Poker Book You’ll Ever Need', 'strategy', 'One strong reference.', '$9.99', 'https://buy.stripe.com/28E5kDdoO8EE7qi1uL2Nq07'], ['The Patient Poker Player: Win More by Playing Less', 'mindset', 'Outlast and outplay.', '$9.99', 'https://buy.stripe.com/28EaEXgB0bQQaCu3CT2Nq08']
];
const covers = {
  'Texas Hold’em in Texas': 'assets/covers/texas-holdem-in-texas.jpg',
  'Winning Tournament Poker': 'assets/covers/winning-tournament-poker.jpg',
  'Poker Math Made Easy': 'assets/covers/poker-math-made-easy.jpg',
  'Is He Bluffing?': 'assets/covers/is-he-bluffing.jpg',
  'The Complete Guide to Poker for Women': 'assets/covers/complete-guide-to-poker-for-women.jpg',
  'The Patient Poker Player: Advanced Tactics to Outlast and Outplay': 'assets/covers/patient-poker-player-advanced-tactics.jpg',
  'I Just Ran Bad and Other Lies Poker Players Tell Themselves': 'assets/covers/i-just-ran-bad.jpg',
  'Final Table Secrets': 'assets/covers/final-table-secrets.jpg',
  'Poker Tricks, Traps, and Mind Games': 'assets/covers/poker-tricks-traps-and-mind-games.jpg',
  'The Poker Player’s Joke Book': 'assets/covers/poker-players-joke-book.jpg',
  'Poker Life: The Complete Guide to Poker Culture': 'assets/covers/poker-life-culture.jpg',
  'The Only Poker Book You’ll Ever Need': 'assets/covers/the-only-poker-book.jpg',
  'The Patient Poker Player: Win More by Playing Less': 'assets/covers/patient-poker-player-win-more.jpg'
};
function makeBook(book) {
  const [title, type, blurb, price, checkoutUrl] = book;
  // Stripe URLs are real external checkout; anything without one routes to contact.
  const purchaseUrl = checkoutUrl || 'contact.html';
  const linkAttrs = checkoutUrl ? ' target="_blank" rel="noopener noreferrer"' : '';
  const action = checkoutUrl ? 'Buy now' : 'Ask about this book';
  return `<article class="book-card"><div class="book-cover"><span class="type">${type}</span><img src="${covers[title]}" alt="Cover of ${title}" loading="lazy" /></div><div class="book-copy"><h4>${title}</h4><p>${blurb}</p><div class="price">${price}</div><a class="button gold" href="${purchaseUrl}"${linkAttrs} aria-label="${action}: ${title}">${action}</a></div></article>`;
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
