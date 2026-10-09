import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { ripplePreorderConfig, preorderCutoff, validShipMonth } from '../ripple-preorder-config.js';

// All checkout requests are intercepted; this suite cannot place a real order.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.PREVIEW_URL || 'http://127.0.0.1:4175').replace(/\/$/, '');
const out = '/private/tmp/poker-life-ripple-qa';
const origin = new URL(base).origin;
const errors = [];
const missing = [];
const failedRequests = [];
const recoveredNetworkRetries = [];
const unexpectedWrites = [];
const checkoutRequests = [];
const measurements = [];
const layoutIssues = [];
const checkedLinks = new Map();
const checkedSvgAssets = new Set();
const pages = ['index', 'books', 'ripple', 'about', 'apparel'];
const navPages = ['index', 'books', 'ripple', 'apparel', 'resources', 'community', 'about'];
const cartKey = 'poker-life-cart-v1';
const expectedBooks = [
  ['texas-holdem-in-texas', 1499],
  ['winning-tournament-poker', 1499],
  ['poker-math-made-easy', 1299],
  ['is-he-bluffing', 1499],
  ['complete-guide-to-poker-for-women', 1499],
  ['patient-poker-player-advanced-tactics', 1499],
  ['i-just-ran-bad', 1499],
  ['final-table-secrets', 1499],
  ['poker-tricks-traps-and-mind-games', 1999],
  ['poker-what-the-pros-dont-want-you-to-know', 1499],
  ['poker-life-culture', 1999],
  ['only-poker-book-youll-ever-need', 1999],
  ['patient-poker-player-win-more', 1499],
  ['f-ked-on-the-river', 1099]
];
const biography = [
  "For Larry McCracken, poker has never been just a card game. It has been a career, a community, a source of unforgettable stories, and ultimately the inspiration behind Poker Life USA.",
  "Larry has spent years on nearly every side of the poker table. He has worked as a poker dealer, floor manager, and poker room manager, while also spending countless hours as a player himself. That experience has given him a perspective on the poker world that goes far beyond cards, chips, bad beats, and big pots. He understands the personalities, friendships, rivalries, pressure, humor, and unpredictability that make the poker room such a fascinating place.",
  "But poker is only one chapter of his story.",
  "For more than 25 years, Larry has also worked in the entertainment and nightlife industry as a professional DJ, performing in clubs and learning how to read a room long before he ever started writing about reading people at a poker table. Those years introduced him to an endless collection of characters, situations, and stories—some hilarious, some unbelievable, and some that sound like they belong in a novel.",
  "Eventually, Larry realized that many of those experiences were stories worth telling.",
  "That realization led him into publishing.",
  "Writing as Larry McCracken, he began creating books centered around poker, entertainment, humor, real-life experience, and the fascinating people who inhabit those worlds. His goal has never been to write books that feel distant or overly complicated. He wants readers to feel as though they are sitting across the table, standing inside the club, or experiencing the story alongside the characters.",
  "His fiction takes that philosophy even further.",
  "Through characters such as Larry Legend, Larry combines the world he knows with suspense, crime, relationships, humor, money, temptation, and unexpected consequences. Poker may provide the setting, but the stories are ultimately about people—and what happens when one decision changes everything.",
  "That idea is at the heart of The Ripple, an ambitious thriller series built around a single pivotal poker hand. The same moment can produce completely different consequences depending on who wins, who loses, and what happens next. Each book explores another version of that ripple, showing how seemingly small moments can alter relationships, careers, fortunes, and lives.",
  "Larry’s writing reflects the personality he brings to the poker table and DJ booth: conversational, unpredictable, occasionally sarcastic, and never afraid to have some fun. Even when the stakes become serious, humor remains part of the experience because that is how Larry sees the real world. Some of the funniest conversations happen during the worst nights, and some of the biggest decisions begin with moments nobody realizes are important until much later.",
  "Poker Life USA was created to bring all of those worlds together.",
  "It is more than a website promoting books. It represents the lifestyle surrounding the game—the late nights, friendships, road trips, tournaments, cash games, incredible wins, brutal bad beats, colorful personalities, inside jokes, and stories that poker players collect over a lifetime.",
  "Through PokerLifeUSA.com, Larry is building a home for his books, original Poker Life apparel, merchandise, collectibles, and future projects inspired by the game and the people who play it.",
  "The philosophy behind the brand is simple:",
  "Poker isn’t something you simply play. For some of us, it’s part of who we are.",
  "Larry knows what it feels like to deal the cards, run the room, sit in the game, watch a huge pot develop, experience the frustration of losing one, and laugh about something ridiculous that happened at the table five minutes later. Those experiences are what give Poker Life its authenticity.",
  "There are plenty of poker brands built around winning.",
  "Poker Life is built around living it.",
  "Larry’s path has never followed a straight line, and he wouldn’t want it to.",
  "He has spent decades entertaining crowds as a DJ, years working inside poker rooms, thousands of hours around poker tables, and more recently has turned those experiences and his imagination toward becoming an independent author and entrepreneur.",
  "Every chapter has added another story.",
  "Today, Larry continues playing poker, writing and publishing books, DJing, developing the Poker Life USA brand, and creating new projects that bring together the worlds he knows best.",
  "There are more books coming.",
  "There are more stories coming.",
  "And there will definitely be more poker hands that seemed like a good idea when the money went in.",
  "Welcome to Poker Life USA.",
  "The cards are only the beginning."
];
const seriesIntroduction = [
  'ONE POKER HAND. FIVE OUTCOMES. FIVE COMPLETELY DIFFERENT LIVES.',
  'At a poker table in San Antonio, a group of players sit down for what should be just another night of cards.',
  'Then one extraordinary hand changes everything.',
  'The cards are the same. The players are the same. The night is the same.',
  'But one decision changes.',
  'And with it, so does everything that follows.',
  'THE RIPPLE is a five-book suspense series built around a unique idea: PINK, BLUE, RED, YELLOW, and BLACK each begin with the same pivotal poker hand—but the hand ends differently in every book.',
  'A different player wins. A different player loses. Someone leaves the poker room earlier. Someone stays longer. A decision that never mattered in one version becomes life-changing in another.',
  'And the ripple begins.',
  'Love, money, betrayal, opportunity, crime, mystery, heartbreak and second chances all grow from those tiny changes. People who appear to lose may discover that losing was the best thing that ever happened to them. A winner may learn that getting exactly what they wanted comes with consequences they never imagined.',
  'Each book is its own complete story, following the dramatically different lives created by that version of the hand. You can experience each novel on its own, but readers who follow the entire series will begin noticing connections, recurring moments and unanswered questions that take on entirely new meanings as the five realities unfold.',
  'At the center of them all is Larry Legend, a longtime poker player who has spent years learning how to read people. Larry can spot nervousness, confidence, desperation and deception across a poker table.',
  'Then there’s Samantha.',
  'She’s the one person he can’t read.',
  'Their slow-burning relationship follows Larry through all five versions of the story, along with a small detail that’s easy to overlook—until eventually it isn’t.',
  'Because in THE RIPPLE, the smallest things can matter the most.',
  'A few seconds.',
  'One decision.',
  'One card.',
  'One person walking through the wrong door.',
  'And sometimes the difference between the life you have and the life you could have had is nothing more than the turn of a card.',
  'Five books. Five realities. One unforgettable poker hand.',
  'Welcome to THE RIPPLE.'
];
const synopsis = [
  'SOMETIMES WINNING THE HAND IS ONLY THE BEGINNING.',
  'Delinda came to the poker room expecting to play cards.',
  'She never expected one hand to change her life.',
  'When a massive pot falls her way at Table Seven, Delinda suddenly has the freedom to do something she’s wanted to do for years: take the Vegas poker trip she’s always talked herself out of.',
  'For once, she doesn’t talk herself out of anything.',
  'Vegas brings poker, nightlife, bad decisions, great stories—and Cole, a confident stranger who doesn’t seem particularly interested in chasing her.',
  'Which, naturally, makes Delinda want to know why.',
  'What begins as a carefree Vegas adventure becomes something neither of them planned when one outrageous night leaves Delinda waking up with considerably more than a hangover.',
  'She’s married.',
  'Her solution is simple: get divorced and return to real life.',
  'Then Cole agrees.',
  'And somehow, hearing him say “Okay” bothers her more than waking up married to him did.',
  'While Delinda tries to figure out whether the craziest mistake of her life might actually be something worth keeping, the other players from Table Seven are experiencing ripples of their own.',
  'Eddie leaves the game carrying a secret that could destroy his marriage. Desperation leads him to a decision involving a forgotten backpack and money that doesn’t belong to him—a decision that forces him to confront the difference between knowing the right thing and actually doing it.',
  'Ryan leaves the poker room after losing with pocket queens and accidentally gets into the wrong car. That simple mistake delivers him somewhere he was never supposed to be, where an embarrassing misunderstanding introduces him to people who could change the direction of his entire life.',
  'And Bernard is carrying something heavier than a poker loss. Haunted by what gambling once did to his family, he’s determined to protect the people he loves—even when protecting them may mean making decisions they never asked him to make.',
  'Four lives begin moving in completely different directions.',
  'All because of one poker hand.',
  'But beneath everything that follows is a question no one at Table Seven realizes they should be asking.',
  'What if Delinda didn’t win because she had the best hand?',
  'Funny, sexy, emotional and filled with poker, romance, difficult choices and unexpected second chances, THE RIPPLE: PINK is a story about the strange ways our lives can change when one moment sends us somewhere we never intended to go.',
  'Because winning and losing aren’t always what they look like.',
  'And sometimes the hand that changes your life isn’t the hand you were supposed to win.',
  'THE RIPPLE: PINK One poker hand changes everything.'
];
const money = cents => '$' + (cents / 100).toFixed(2);
const normalize = text => text.replace(/\s+/g, ' ').trim();
const pageName = href => new URL(href, base + '/').pathname.replace(/\/$/, '').split('/').pop().replace(/\.html$/, '') || 'index';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true
});
async function makeContext(label, fixtureConfig) {
  const context = await browser.newContext();
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.startsWith('/.netlify/functions/')) {
      checkoutRequests.push({ label, url: request.url(), method: request.method(), body: request.postDataJSON() });
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'QA fixture: checkout temporarily unavailable. No order was created.' }) });
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method())) {
      unexpectedWrites.push({ label, url: request.url(), method: request.method() });
      await route.abort();
      return;
    }
    await route.continue();
  });
  if (fixtureConfig) {
    await context.route('**/ripple-preorder-config.js*', route => route.fulfill({
      contentType: 'text/javascript', body: 'export const ripplePreorderConfig = ' + JSON.stringify(fixtureConfig) + ';\nexport const validShipMonth = ' + validShipMonth.toString() + ';\nexport const preorderCutoff = ' + preorderCutoff.toString() + ';'
    }));
  }
  const page = await context.newPage();
  page.on('pageerror', error => errors.push({ label, message: error.message }));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin === origin && response.status() >= 400 && !url.pathname.startsWith('/.netlify/functions/')) {
      missing.push({ label, url: response.url(), status: response.status() });
    }
  });
  page.on('requestfailed', request => {
    if (new URL(request.url()).origin === origin && request.failure()?.errorText !== 'net::ERR_ABORTED') {
      failedRequests.push({ label, url: request.url(), error: request.failure()?.errorText });
    }
  });
  return { context, page };
}
async function gotoUrl(page, url) {
  const failureStart = failedRequests.length;
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  assert.ok(response?.ok(), url + ' did not load');
  await page.evaluate(() => document.fonts.ready);
  const initialFailures = failedRequests.slice(failureStart);
  if (initialFailures.length && initialFailures.every(failure => /^net::ERR_(CONNECTION_RESET|SOCKET_NOT_CONNECTED|EMPTY_RESPONSE)$/.test(failure.error))) {
    // Python's local preview server can reset simultaneous asset connections.
    // Retry once, retain a report of the failure, and require a clean reload.
    const retryStart = failedRequests.length;
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    if (failedRequests.length === retryStart) {
      recoveredNetworkRetries.push({ page: url, failures: initialFailures });
      failedRequests.splice(failureStart, initialFailures.length);
    }
  }
  const missingStyles = await page.locator('link[rel="stylesheet"]').evaluateAll(links => links.filter(link => new URL(link.href).origin === location.origin && !link.sheet).map(link => link.href));
  assert.deepEqual(missingStyles, [], url + ': local stylesheets did not load');
}
async function goto(page, name) {
  await gotoUrl(page, base + '/' + (name === 'index' ? '' : name + '.html'));
  assert.equal(pageName(page.url()), name, 'Unexpected destination after loading ' + name);
  if (name === 'books') await page.locator('#book-grid [data-book-card]').first().waitFor();
}
async function checkImages(context, page, label) {
  const broken = await page.evaluate(async () => {
    return (await Promise.all([...document.images].map(async image => {
      image.loading = 'eager';
      try { await image.decode(); } catch { return image.currentSrc || image.src; }
      return image.naturalWidth && image.naturalHeight ? null : image.src;
    }))).filter(Boolean);
  });
  assert.deepEqual(broken, [], label + ' has broken raster images');
  const svgImages = await page.locator('svg image').evaluateAll(images => images.map(image => image.href.baseVal));
  for (const source of svgImages) {
    const url = new URL(source, page.url()).href;
    if (checkedSvgAssets.has(url)) continue;
    checkedSvgAssets.add(url);
    const response = await context.request.get(url);
    assert.ok(response.ok(), label + ' missing SVG source ' + url);
    assert.match(response.headers()['content-type'] || '', /^image\//);
  }
  const artwork = await page.locator('img[src*="ripple-"]').evaluateAll(images => images.map(image => {
    const rect = image.getBoundingClientRect();
    return { src: image.getAttribute('src'), width: rect.width, height: rect.height, naturalRatio: image.naturalWidth / image.naturalHeight, renderedRatio: rect.width / rect.height, objectFit: getComputedStyle(image).objectFit };
  }));
  for (const art of artwork) {
    assert.ok(art.width > 0 && art.height > 0, label + ': hidden artwork ' + art.src);
    assert.ok(Math.abs(art.naturalRatio - art.renderedRatio) < .025 || art.objectFit === 'contain', label + ': distorted artwork ' + JSON.stringify(art));
  }
}
async function checkShell(page, name) {
  const theme = await page.evaluate(() => ({ gold: getComputedStyle(document.documentElement).getPropertyValue('--pl-gold').trim(), header: getComputedStyle(document.querySelector('.pl-site-header')).display, footer: getComputedStyle(document.querySelector('.pl-footer')).display }));
  assert.deepEqual(theme, { gold: '#d9b35d', header: 'flex', footer: 'grid' }, name + ': shared theme did not apply');
  const links = await page.locator('.pl-nav a').evaluateAll(items => items.map(link => ({ href: link.href, current: link.getAttribute('aria-current') })));
  assert.deepEqual(links.map(link => pageName(link.href)), navPages, name + ': incorrect main navigation');
  assert.deepEqual(links.filter(link => link.current === 'page').map(link => pageName(link.href)), [name], name + ': incorrect active navigation');
  const logos = await page.locator('.pl-site-header .pl-brand img, .pl-footer-brand img').evaluateAll(images => images.map(image => image.getAttribute('src')));
  assert.deepEqual(logos, [
    'assets/poker-life-mark-transparent.png', 'assets/poker-life-wordmark-detailed-transparent.png',
    'assets/poker-life-mark-transparent.png', 'assets/poker-life-wordmark-detailed-transparent.png'
  ], name + ': sharp header/footer logos changed');
  const footerLinks = await page.locator('.pl-footer-nav a').evaluateAll(items => items.map(link => link.href));
  assert.ok(footerLinks.some(href => pageName(href) === 'ripple'), name + ': Ripple footer link missing');
  const overflow = await page.evaluate(() => ({
    viewport: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth,
    offenders: document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth ? [] : [...document.querySelectorAll('body *')].filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && getComputedStyle(element).display !== 'none' && (rect.right > innerWidth + 1 || rect.left < -1) && !element.matches('.skip-link');
    }).slice(0, 10).map(element => ({ tag: element.tagName, className: String(element.className), right: element.getBoundingClientRect().right }))
  }));
  measurements.push({ name, ...overflow });
  assert.ok(overflow.body <= overflow.viewport && overflow.document <= overflow.viewport, name + ': horizontal overflow ' + JSON.stringify(overflow));
}
async function checkLinks(context, page, name) {
  const links = await page.locator('a[href]').evaluateAll(items => items.map(link => link.href));
  for (const href of new Set(links)) {
    const url = new URL(href);
    if (url.origin !== origin) continue;
    const hash = url.hash.slice(1);
    url.hash = '';
    if (!checkedLinks.has(url.href)) {
      const response = await context.request.get(url.href);
      assert.ok(response.ok(), name + ': broken local link ' + href + ' (' + response.status() + ')');
      checkedLinks.set(url.href, await response.text());
    }
    if (hash) assert.ok(checkedLinks.get(url.href).includes('id="' + decodeURIComponent(hash) + '"'), name + ': missing link anchor ' + href);
  }
}
async function checkCopy(page, name) {
  if (name === 'ripple' || name === 'books') {
    assert.doesNotMatch(await page.locator('main').textContent(), /(?:free|included)\s+(?:Poker Life\s+)?T-shirt|shirt sizes/i, name + ': removed T-shirt offer remains');
    assert.doesNotMatch(await page.locator('main').textContent(), /\$100|one week before|seven days before|preorder the (?:full|complete) series|five early deliveries/i, name + ': removed full-series preorder offer remains');
    assert.equal(await page.locator('[data-preorder-offer="bundle"]').count(), 0, name + ': removed bundle checkout control remains');
  }
  if (name === 'about') {
    const paragraphs = await page.locator('.pl-author-intro, .pl-author-chapter p').allTextContents();
    assert.deepEqual(paragraphs.map(normalize), biography, 'Author biography was shortened or changed');
    assert.deepEqual((await page.locator('main h1, main h2').allTextContents()).map(normalize), ['About Larry McCracken', 'The Poker Life', 'More Than One Story']);
    assert.equal(await page.locator('.pl-author-portrait svg').getAttribute('viewBox'), '316 0 295 207', 'Author crop must preserve the current dedicated portrait scene');
  }
  if (name === 'ripple') {
    const seriesParagraphs = (await page.locator('#series-introduction .ripple-introduction-deck, #series-introduction .ripple-prose > p, #series-introduction .ripple-story-beats > p').allTextContents()).map(normalize);
    assert.deepEqual(seriesParagraphs, seriesIntroduction, 'Series introduction was shortened or changed');
    const paragraphs = (await page.locator('.ripple-pink-hook, .ripple-pink-intro > p:not(.ripple-kicker):not(.ripple-pink-hook), #pink-synopsis .ripple-prose > p, #pink-synopsis .ripple-prose > blockquote').allTextContents()).map(normalize);
    assert.deepEqual(paragraphs, synopsis, 'Pink synopsis was shortened or changed');
    assert.doesNotMatch(await page.locator('#pink-synopsis').textContent(), /little girl named Emily|walls of a house/);
    assert.equal(await page.locator('.ripple-hero-art img').getAttribute('src'), 'assets/ripple-series-suspense-promo.png');
    assert.match(await page.locator('.ripple-offer-pink .ripple-price').textContent(), /\$25\b/);
    assert.ok(await page.locator('.ripple-series-coming-soon').isVisible());
    assert.match(await page.locator('.ripple-series-coming-soon').textContent(), /coming soon/i);
    assert.equal(await page.locator('.ripple-series-coming-soon .ripple-price, .ripple-series-coming-soon button, .ripple-series-coming-soon [data-preorder-offer]').count(), 0, 'Series coming-soon panel must not include a price or payment control');
    assert.match(await page.locator('.ripple-offer-pink .ripple-standard').textContent(), /\$29\.99\b/);
    assert.doesNotMatch(await page.locator('.ripple-series-coming-soon').textContent(), /shirt|free shipping|early deliver/i);
    assert.equal(await page.locator('[data-shirt-field], [name="shirtSize"]').count(), 0, 'Removed shirt-size selector remains');
    assert.match(await page.locator('[data-preorder-launch-notice]').textContent(), /Payment is collected now/i);
    assert.match(await page.locator('[data-pink-date]').textContent(), /Estimated shipping: December 2026/);
    assert.match(await page.locator('[data-release-faq]').textContent(), /have not been set yet/);
    assert.deepEqual((await page.locator('.ripple-volumes li').allTextContents()).map(normalize), ['Pink', 'Blue', 'Red', 'Yellow', 'Black']);
  }
}
async function checkProductionPreorders(page, width, originalCart) {
  await page.setViewportSize({ width, height: 950 });
  await goto(page, 'ripple');
  const dialog = page.locator('[data-preorder-dialog]');
  assert.deepEqual(await page.locator('[data-preorder-offer]').evaluateAll(buttons => buttons.map(button => button.dataset.preorderOffer)), ['pink'], 'Only Pink has a public preorder trigger');
  for (const [offer, price] of [['pink', '$25']]) {
    const trigger = page.locator('[data-preorder-offer="' + offer + '"]');
    await trigger.click();
    assert.ok(await dialog.isVisible(), offer + ': preorder dialog did not open');
    assert.match(await page.locator('[data-preorder-price]').textContent(), new RegExp(price.replace('$', '\\$')));
    assert.ok(await page.locator('[data-preorder-checkout]').isDisabled(), 'Checkout must wait for consent or remain closed');
    assert.equal(await page.locator('[data-preorder-consent]').isVisible(), offer === 'pink', 'Only Pink should accept payment consent');
    assert.doesNotMatch(await page.locator('[data-preorder-terms]').textContent(), /shirt/i, 'Closed offer still advertises the removed shirt');
    assert.match(await page.locator('[data-preorder-terms]').textContent(), /December/);
    assert.match(await page.locator('[data-preorder-terms]').textContent(), /free U\.S\. shipping/i);
    const bounds = await dialog.evaluate(element => ({ width: element.getBoundingClientRect().width, left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, height: element.getBoundingClientRect().height, viewport: innerWidth, viewportHeight: innerHeight }));
    assert.ok(bounds.left >= 0 && bounds.right <= bounds.viewport && bounds.scrollWidth <= bounds.clientWidth && bounds.height <= bounds.viewportHeight, 'Dialog overflows: ' + JSON.stringify(bounds));
    const before = checkoutRequests.filter(request => request.label === 'default').length;
    await page.locator('[data-preorder-form]').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(checkoutRequests.filter(request => request.label === 'default').length, before, 'Checkout without consent attempted a backend request');
    if (offer === 'pink') {
      assert.match(await page.locator('[data-preorder-terms]').textContent(), /Estimated shipping: December 2026/);
      assert.match(await page.locator('[data-preorder-status]').textContent(), /Payment is collected now/);
      await page.locator('[name="accepted"]').check();
      assert.ok(!(await page.locator('[data-preorder-checkout]').isDisabled()), 'Approved month estimate must enable signed Pink checkout');
      await page.locator('[data-preorder-checkout]').click();
      await page.locator('[data-preorder-error]').filter({ hasText: 'QA fixture:' }).waitFor();
      assert.equal(checkoutRequests.filter(request => request.label === 'default').length, before + 1);
      assert.deepEqual(checkoutRequests.at(-1).body, { items: [{ slug: 'ripple-pink-preorder', quantity: 1 }], preorder: { accepted: true, termsVersion: 'ripple-preorder-v4' } });
    }
    await page.screenshot({ path: out + '/dialog-' + offer + '-' + width + '.png', fullPage: false });
    if (offer === 'pink') await page.keyboard.press('Escape');
    else await page.locator('[data-preorder-close]').click();
    assert.ok(!(await dialog.isVisible()), 'Preorder dialog did not close');
    assert.equal(await trigger.evaluate(element => document.activeElement === element), true, 'Closing preorder must restore focus to its trigger');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), cartKey), originalCart, 'Preorder dialog changed the regular cart');
  }
}
function enabledFixture() {
  const config = structuredClone(ripplePreorderConfig);
  const year = new Date().getUTCFullYear() + 1;
  config.enabled = true;
  config.countries = ['US'];
  Object.assign(config.pink, { enabled: true, estimatedShipMonth: null, releaseDate: year + '-02-01', shipDate: year + '-01-25', purchaseCutoffAt: year + '-01-20T18:00:00Z', termsText: 'QA fixture: paid signed Pink preorder, free US shipping; ships January 25.' });
  return config;
}
const { context, page } = await makeContext('default');
try {
  for (const width of [320, 390, 770, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const name of pages) {
      await goto(page, name);
      try {
        await checkShell(page, name);
        await checkImages(context, page, name + '-' + width);
        await checkCopy(page, name);
        if (width === 1440) await checkLinks(context, page, name);
      } catch (error) { layoutIssues.push(name + '-' + width + ': ' + error.message); }
      await page.screenshot({ path: out + '/' + name + '-' + width + '.png', fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await goto(page, 'books');
  assert.equal(await page.locator('#book-grid [data-book-card]').count(), expectedBooks.length, 'Original catalog size changed');
  assert.deepEqual(await page.locator('#book-grid [data-book-details]').evaluateAll(buttons => buttons.map(button => button.dataset.bookDetails)), expectedBooks.map(([slug]) => slug), 'Original book slugs/order changed');
  for (const [slug, cents] of expectedBooks) {
    await page.locator('#book-grid [data-book-details="' + slug + '"]').click();
    const modal = page.locator('#book-details-modal');
    assert.ok(await modal.isVisible());
    assert.equal(normalize(await modal.locator('.book-modal-price').textContent()), money(cents), slug + ': original price changed');
    await modal.locator('[data-add-to-cart]').click();
    await modal.locator('[data-close-book-modal]').click();
  }
  assert.equal(await page.locator('[data-cart-count]').textContent(), String(expectedBooks.length));
  const originalCart = await page.evaluate(key => localStorage.getItem(key), cartKey);
  assert.deepEqual(JSON.parse(originalCart), expectedBooks.map(([slug]) => ({ slug, quantity: 1 })));
  await page.locator('[data-cart-link]').click();
  await page.waitForURL(url => pageName(url) === 'checkout');
  assert.equal(await page.locator('.cart-line').count(), expectedBooks.length);
  assert.equal(normalize(await page.locator('.cart-total strong').textContent()), money(expectedBooks.reduce((total, [, amount]) => total + amount, 0)), 'Regular cart subtotal changed');
  for (const width of [320, 1440]) await checkProductionPreorders(page, width, originalCart);
  await page.setViewportSize({ width: 390, height: 844 });
  await goto(page, 'apparel');
  await page.locator('.pl-menu-toggle').click();
  await page.locator('.pl-nav a[href="ripple.html"]').click();
  await page.waitForURL(url => pageName(url) === 'ripple');
  assert.equal(await page.locator('.pl-nav a[aria-current="page"]').getAttribute('href'), 'ripple.html');
  assert.equal(await page.locator('.pl-menu-toggle').getAttribute('aria-expanded'), 'false');
  assert.equal(checkoutRequests.filter(request => request.label === 'default').length, 2, 'Only explicitly consented Pink requests should contact the intercepted backend');

  for (const estimate of ['2020-12', '2026-13']) {
    const expiredConfig = structuredClone(ripplePreorderConfig);
    expiredConfig.pink.estimatedShipMonth = estimate;
    const expired = await makeContext('expired-' + estimate, expiredConfig);
    await goto(expired.page, 'ripple');
    await expired.page.locator('[data-preorder-offer="pink"]').click();
    assert.ok(await expired.page.locator('[data-preorder-checkout]').isDisabled(), 'Expired or invalid month must not allow a paid preorder');
    assert.ok(!(await expired.page.locator('[data-preorder-consent]').isVisible()));
    await expired.page.locator('[data-preorder-form]').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(checkoutRequests.filter(request => request.label === 'expired-' + estimate).length, 0);
    await expired.context.close();
  }

  // Enable public offer terms only in this fresh browser context; no production file changes.
  const fixtureConfig = enabledFixture();
  const fixture = await makeContext('enabled-fixture', fixtureConfig);
  await fixture.context.addInitScript(({ key, cart }) => localStorage.setItem(key, cart), { key: cartKey, cart: originalCart });
  await fixture.page.setViewportSize({ width: 390, height: 844 });
  await goto(fixture.page, 'ripple');
  assert.equal(await fixture.page.locator('[data-preorder-offer="bundle"]').count(), 0);
  for (const [offer, slug] of [['pink', 'ripple-pink-preorder']]) {
    await fixture.page.locator('[data-preorder-offer="' + offer + '"]').click();
    const form = fixture.page.locator('[data-preorder-form]');
    const submit = fixture.page.locator('[data-preorder-checkout]');
    assert.ok(await fixture.page.locator('[data-preorder-consent]').isVisible(), 'Enabled fixture must disclose paid preorder consent');
    assert.ok(await submit.isDisabled(), 'Paid checkout must wait for explicit consent');
    const before = checkoutRequests.length;
    await form.evaluate(element => element.requestSubmit());
    assert.equal(checkoutRequests.length, before, 'Consent must be required before checkout');
    assert.equal(await fixture.page.locator('[data-shirt-field], [name="shirtSize"]').count(), 0, 'No offer should request a shirt size');
    await fixture.page.locator('[name="accepted"]').check();
    assert.ok(!(await submit.isDisabled()), 'Complete offer and consent must permit checkout without a shirt size');
    await submit.click();
    await fixture.page.locator('[data-preorder-error]').filter({ hasText: 'QA fixture:' }).waitFor();
    assert.equal(checkoutRequests.length, before + 1);
    const request = checkoutRequests.at(-1);
    assert.equal(request.method, 'POST');
    assert.deepEqual(request.body.items, [{ slug, quantity: 1 }]);
    assert.equal(request.body.preorder.accepted, true);
    assert.equal(request.body.preorder.termsVersion, fixtureConfig.termsVersion);
    assert.equal(Object.hasOwn(request.body.preorder, 'shirtSize'), false, 'Checkout request must omit the removed shirt size');
    assert.ok(!(await submit.isDisabled()), 'Failed request should allow a deliberate retry');
    assert.equal(await fixture.page.evaluate(key => localStorage.getItem(key), cartKey), originalCart, 'Preorder fixture mutated original cart');
    await fixture.page.screenshot({ path: out + '/enabled-' + offer + '-390.png', fullPage: false });
    await fixture.page.locator('[data-preorder-close]').click();
  }
  await fixture.context.close();

  // Resolve a decoded Pink response after that dialog has been dismissed and
  // a second Pink checkout is pending. This intentionally ignores abort in the fixture
  // so both the abort signal and stale-attempt guard are exercised independently.
  const race = await makeContext('race-fixture', fixtureConfig);
  const staleRedirects = [];
  await race.context.route('https://checkout.stripe.com/**', async route => {
    staleRedirects.push(route.request().url());
    await route.fulfill({ contentType: 'text/html', body: '<title>Intercepted QA checkout</title>' });
  });
  await race.context.addInitScript(({ key, cart }) => {
    localStorage.setItem(key, cart);
    const originalFetch = window.fetch.bind(window);
    const requests = [];
    window.__qaPreorderRace = { requests };
    window.fetch = (input, options) => {
      const url = new URL(typeof input === 'string' ? input : input.url, location.href);
      if (url.pathname !== '/.netlify/functions/create-checkout') return originalFetch(input, options);
      const request = { body: JSON.parse(options.body), signal: options.signal, response: null, release: null };
      const decoded = new Promise(resolve => { request.release = response => { request.response = response; resolve(response.body); }; });
      requests.push(request);
      return Promise.resolve({ get ok() { return request.response?.ok ?? true; }, json: () => decoded });
    };
  }, { key: cartKey, cart: originalCart });
  await race.page.setViewportSize({ width: 390, height: 844 });
  await goto(race.page, 'ripple');
  await race.page.locator('[data-preorder-offer="pink"]').click();
  await race.page.locator('[name="accepted"]').check();
  await race.page.locator('[data-preorder-checkout]').click();
  await race.page.waitForFunction(() => window.__qaPreorderRace.requests.length === 1);
  assert.ok(await race.page.locator('[data-preorder-checkout]').isDisabled());
  await race.page.locator('[data-preorder-close]').click();
  await race.page.waitForFunction(() => window.__qaPreorderRace.requests[0].signal?.aborted);
  await race.page.locator('[data-preorder-offer="pink"]').click();
  assert.equal(await race.page.locator('#ripple-dialog-title').textContent(), fixtureConfig.pink.title);
  assert.equal(await race.page.locator('[data-preorder-price]').textContent(), '$25');
  assert.ok(await race.page.locator('[data-preorder-checkout]').isDisabled(), 'Reopened Pink requires fresh consent');
  await race.page.locator('[name="accepted"]').check();
  await race.page.locator('[data-preorder-checkout]').click();
  await race.page.waitForFunction(() => window.__qaPreorderRace.requests.length === 2);
  await race.page.evaluate(async () => {
    window.__qaPreorderRace.requests[0].release({ ok: true, body: { url: 'https://checkout.stripe.com/stale-pink-qa-fixture' } });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  assert.deepEqual(staleRedirects, [], 'Dismissed Pink response must never redirect to checkout');
  assert.equal(pageName(race.page.url()), 'ripple');
  assert.ok(await race.page.locator('[data-preorder-dialog]').isVisible());
  assert.equal(await race.page.locator('#ripple-dialog-title').textContent(), fixtureConfig.pink.title);
  assert.ok(await race.page.locator('[data-preorder-checkout]').isDisabled(), 'Stale Pink completion must not unlock a newer Pink request');
  assert.match(await race.page.locator('[data-preorder-checkout]').textContent(), /Opening secure checkout/);
  assert.equal(await race.page.locator('[data-preorder-error]').textContent(), '');
  await race.page.evaluate(() => window.__qaPreorderRace.requests[1].release({ ok: false, body: { error: 'QA race fixture: current Pink response retained.' } }));
  await race.page.locator('[data-preorder-error]').filter({ hasText: 'QA race fixture: current Pink response retained.' }).waitFor();
  assert.ok(!(await race.page.locator('[data-preorder-checkout]').isDisabled()), 'The current Pink request must recover independently');
  assert.deepEqual(await race.page.evaluate(() => window.__qaPreorderRace.requests.map(request => request.body.items[0].slug)), ['ripple-pink-preorder', 'ripple-pink-preorder']);
  assert.equal(await race.page.evaluate(key => localStorage.getItem(key), cartKey), originalCart);
  await race.page.screenshot({ path: out + '/race-pink-reopened-390.png', fullPage: false });
  await race.context.close();

  // Paid order-status responses are browser fixtures, including literal markup
  // to confirm that delivery terms are rendered as text rather than HTML.
  const confirmation = await makeContext('confirmation-fixture');
  let confirmedPreorder = {
    slug: 'ripple-pink-preorder', title: 'The Ripple: Pink <em>QA</em>',
    termsVersion: fixtureConfig.termsVersion,
    termsText: 'QA delivery terms: <strong>signed Pink preorder</strong>, free US shipping, ships January 25.',
    schedule: [{ volume: 'Pink', shipDate: '2032-01-25', releaseDate: '2032-02-01' }],
    shippingAmount: 0
  };
  let confirmationMode = 'preorder';
  await confirmation.context.addInitScript(({ key, cart, slug }) => {
    localStorage.setItem(key, cart);
    localStorage.setItem('pokerLifePendingCheckouts', JSON.stringify({ cs_regular_ui_fixture: [{ slug, quantity: 1 }] }));
  }, { key: cartKey, cart: originalCart, slug: expectedBooks[0][0] });
  await confirmation.context.route('**/.netlify/functions/order-status?*', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ status: 'paid', recorded: true, orderId: 'PL-QA-FIXTURE', orderType: confirmationMode, ...(confirmationMode === 'preorder' ? { preorder: confirmedPreorder } : {}) })
  }));
  for (const width of [320, 1440]) {
    await confirmation.page.setViewportSize({ width, height: 950 });
    await gotoUrl(confirmation.page, base + '/order-confirmed.html?session_id=cs_preorder_ui_fixture');
    assert.equal(normalize(await confirmation.page.locator('[data-order-heading]').textContent()), 'Preorder payment confirmed.');
    assert.equal(await confirmation.page.locator('[data-confirmed-preorder-terms]').textContent(), confirmedPreorder.termsText);
    assert.ok(await confirmation.page.locator('[data-confirmed-preorder-terms]').isVisible());
    assert.deepEqual(await confirmation.page.locator('[data-confirmed-preorder-schedule] li').allTextContents(), ['Pink: ships by January 25, 2032; official release February 1, 2032.'], 'Recorded Pink dates must appear unchanged');
    assert.ok(await confirmation.page.locator('[data-confirmed-preorder-schedule]').isVisible());
    assert.equal(await confirmation.page.locator('[data-confirmed-preorder-shipping]').textContent(), 'Your preorder includes free shipping.');
    assert.ok(await confirmation.page.locator('[data-confirmed-preorder-shipping]').isVisible());
    assert.equal(await confirmation.page.locator('[data-confirmed-preorder-terms] strong, [data-order-message] em').count(), 0, 'Order fields must not interpret markup');
    assert.equal(await confirmation.page.locator('[data-order-return]').getAttribute('href'), 'ripple.html');
    assert.equal(await confirmation.page.evaluate(key => localStorage.getItem(key), cartKey), originalCart, 'Confirmed preorder removed unrelated regular books');
    const size = await confirmation.page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    assert.ok(size.width <= size.viewport, 'Preorder confirmation overflows at ' + width);
    await confirmation.page.screenshot({ path: out + '/confirmation-preorder-' + width + '.png', fullPage: true });
  }
  confirmedPreorder = {
    slug: 'ripple-pink-preorder', title: 'Ripple: Pink — Autographed Preorder', termsVersion: 'ripple-preorder-v4',
    termsText: ripplePreorderConfig.pink.termsText, shippingAmount: 0,
    schedule: [{ volume: 'Pink', estimatedShipMonth: '2026-12' }]
  };
  for (const width of [320, 1440]) {
    await confirmation.page.setViewportSize({ width, height: 950 });
    await gotoUrl(confirmation.page, base + '/order-confirmed.html?session_id=cs_month_ui_fixture');
    assert.deepEqual(await confirmation.page.locator('[data-confirmed-preorder-schedule] li').allTextContents(), ['Pink: estimated shipping December 2026.']);
    assert.equal(await confirmation.page.locator('[data-confirmed-preorder-terms]').textContent(), confirmedPreorder.termsText);
    assert.equal(await confirmation.page.evaluate(key => localStorage.getItem(key), cartKey), originalCart);
    assert.ok(await confirmation.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  // Historical paid orders must still show their captured terms, even if the
  // current offer no longer includes the original shirt bonus.
  confirmedPreorder = {
    slug: 'ripple-series-preorder', title: 'The Ripple Collection', termsVersion: 'captured-bundle-v1',
    termsText: 'Captured bundle terms: five early deliveries and one shirt; $7 shipping.', shippingAmount: 700,
    schedule: [
      { volume: 'Pink', arrivalDate: '2032-01-25', releaseDate: '2032-02-01' },
      { volume: 'Blue', arrivalDate: '2032-02-23', releaseDate: '2032-03-01' },
      { volume: 'Red', arrivalDate: '2032-03-25', releaseDate: '2032-04-01' },
      { volume: 'Yellow', arrivalDate: '2032-04-24', releaseDate: '2032-05-01' },
      { volume: 'Black', arrivalDate: '2032-05-25', releaseDate: '2032-06-01' }
    ]
  };
  for (const width of [320, 1440]) {
    await confirmation.page.setViewportSize({ width, height: 950 });
    await gotoUrl(confirmation.page, base + '/order-confirmed.html?session_id=cs_bundle_ui_fixture');
    assert.equal(await confirmation.page.locator('[data-confirmed-preorder-terms]').textContent(), confirmedPreorder.termsText);
    assert.deepEqual(await confirmation.page.locator('[data-confirmed-preorder-schedule] li').allTextContents(), [
      'Pink: receive by January 25, 2032; official release February 1, 2032.',
      'Blue: receive by February 23, 2032; official release March 1, 2032.',
      'Red: receive by March 25, 2032; official release April 1, 2032.',
      'Yellow: receive by April 24, 2032; official release May 1, 2032.',
      'Black: receive by May 25, 2032; official release June 1, 2032.'
    ], 'All five captured release/arrival pairs must be shown in order');
    assert.equal(await confirmation.page.locator('[data-confirmed-preorder-shipping]').textContent(), 'Preorder shipping: $7.00.');
    assert.equal(await confirmation.page.evaluate(key => localStorage.getItem(key), cartKey), originalCart);
    const size = await confirmation.page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    assert.ok(size.width <= size.viewport, 'Bundle confirmation overflows at ' + width);
    await confirmation.page.screenshot({ path: out + '/confirmation-bundle-' + width + '.png', fullPage: true });
  }
  confirmationMode = 'regular';
  await gotoUrl(confirmation.page, base + '/order-confirmed.html?session_id=cs_regular_ui_fixture');
  assert.equal(normalize(await confirmation.page.locator('[data-order-heading]').textContent()), 'Payment confirmed.');
  assert.ok(!(await confirmation.page.locator('[data-confirmed-preorder-terms]').isVisible()));
  assert.ok(!(await confirmation.page.locator('[data-confirmed-preorder-schedule]').isVisible()));
  assert.ok(!(await confirmation.page.locator('[data-confirmed-preorder-shipping]').isVisible()));
  assert.equal(await confirmation.page.locator('[data-order-return]').getAttribute('href'), 'checkout.html');
  assert.deepEqual(JSON.parse(await confirmation.page.evaluate(key => localStorage.getItem(key), cartKey)), expectedBooks.slice(1).map(([slug]) => ({ slug, quantity: 1 })), 'Regular confirmation must remove only its paid item');
  await confirmation.context.close();
  assert.deepEqual(errors, [], 'Browser page errors');
  assert.deepEqual(missing, [], 'Missing site resources');
  assert.deepEqual(failedRequests, [], 'Failed site requests');
  assert.deepEqual(unexpectedWrites, [], 'Unexpected mutation attempts');
  assert.deepEqual(layoutIssues, [], 'Page layout/content issues');
  console.log('PASS: 20 responsive page checks, complete biography/synopsis, original 14-book cart, Pink-only paid checkout with consent, series coming soon without a sales offer, expired-window protection, focus restoration, intercepted exact-date checkout fixtures, reopened-Pink stale-response protection, and historical preorder schedules/shipping.');
} finally {
  console.log(JSON.stringify({ errors, missing, failedRequests, recoveredNetworkRetries, unexpectedWrites, layoutIssues, measurements, checkoutRequests, screenshots: out }, null, 2));
  await browser.close();
}
