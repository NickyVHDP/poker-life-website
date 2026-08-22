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
const grid = document.querySelector('#book-grid');
const viewAllBooks = document.querySelector('#view-all-books');
const note = document.querySelector('.form-note');
const form = document.querySelector('.signup-form');
function makeBook(book, index) {
  const [title, type, blurb, price, checkoutUrl] = book;
  const purchaseUrl = checkoutUrl || '#contact';
  const externalLink = checkoutUrl ? ' target="_blank" rel="noopener"' : '';
  return `<article class="book-card"><div class="book-cover"><span class="type">${index === 0 ? 'Best seller' : index === 1 ? 'New release' : type}</span><img src="${covers[title]}" alt="Cover of ${title}" loading="lazy" /></div><div class="book-copy"><h4>${title}</h4><p>${blurb}</p><div class="price">${price}</div><a class="button gold" href="${purchaseUrl}"${externalLink} aria-label="Buy ${title}">Buy now</a><a class="amazon" href="#contact">Buy on Amazon</a></div></article>`;
}
grid.innerHTML = books.slice(0, 5).map(makeBook).join('');
viewAllBooks?.addEventListener('click', () => {
  grid.innerHTML = books.map(makeBook).join('');
  viewAllBooks.hidden = true;
});
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = new FormData(form).get('email');
  note.textContent = email ? `Thank you — ${email} is ready for newsletter connection.` : 'Please enter your email address.';
});
