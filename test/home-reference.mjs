import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/nickydivine/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = (process.env.PREVIEW_URL || 'http://127.0.0.1:4176').replace(/\/$/, '');
const origin = new URL(base).origin;
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
const missing = [];
const failedRequests = [];
const blockedWrites = [];
const measurements = [];
const results = [];
await context.route('**/*', async route => {
  if (!['GET', 'HEAD'].includes(route.request().method())) {
    blockedWrites.push({ method: route.request().method(), url: route.request().url() });
    await route.abort();
    return;
  }
  await route.continue();
});
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (new URL(response.url()).origin === origin && response.status() >= 400) missing.push(response.status() + ' ' + response.url());
});
page.on('requestfailed', request => {
  if (new URL(request.url()).origin === origin && request.failure()?.errorText !== 'net::ERR_ABORTED') failedRequests.push(request.url() + ' ' + request.failure()?.errorText);
});
const pageName = url => new URL(url, base).pathname.split('/').pop().replace(/\.html$/, '') || 'index';
async function home() {
  const response = await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
  assert.ok(response.ok(), 'Homepage did not load');
  await page.evaluate(() => document.fonts.ready);
}
async function noOverflow(label) {
  const value = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  measurements.push({ label, ...value });
  assert.ok(value.document <= value.viewport && value.body <= value.viewport, label + ': horizontal overflow ' + JSON.stringify(value));
}
async function checkDialog(trigger, expectedTitle) {
  await page.locator(trigger).click();
  const dialog = page.locator('#book-details-modal');
  assert.ok(await dialog.isVisible(), expectedTitle + ' dialog is not visible');
  assert.equal(await dialog.locator('h2').textContent(), expectedTitle);
  assert.equal(await dialog.locator('.book-modal-price').textContent(), '$14.99');
  assert.equal(await dialog.locator('[data-add-to-cart]').count(), 1);
  await dialog.locator('[data-close-book-modal]').click();
  assert.equal(await dialog.isVisible(), false);
}
try {
  for (const width of [320, 390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await home();
    await noOverflow('home-' + width);
    assert.ok(await page.locator('.pl-menu-toggle').isVisible(), 'Hamburger must be visible at ' + width);
    assert.equal(await page.locator('.pl-nav').isVisible(), false, 'Navigation must start closed at ' + width);
    await page.locator('.pl-menu-toggle').click();
    assert.ok(await page.locator('.pl-nav').isVisible());
    assert.equal(await page.locator('.pl-menu-toggle').getAttribute('aria-expanded'), 'true');
    await noOverflow('menu-' + width);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.pl-nav').isVisible(), false);
    assert.ok(await page.locator('.pl-menu-toggle').evaluate(button => button === document.activeElement));
    await page.locator('.pl-menu-toggle').click();
    const openMenu = await page.locator('.pl-nav').boundingBox();
    await page.mouse.click(5, openMenu.y + openMenu.height + 8);
    assert.equal(await page.locator('.pl-nav').isVisible(), false, 'Outside click must close navigation');
    await page.locator('[data-search-toggle]').click();
    assert.ok(await page.locator('[data-site-search]').isVisible());
    assert.equal(await page.locator('[data-search-toggle]').getAttribute('aria-expanded'), 'true');
    assert.ok(await page.locator('[data-site-search] input').evaluate(input => input === document.activeElement));
    await noOverflow('search-' + width);
    await page.locator('.pl-menu-toggle').click();
    assert.equal(await page.locator('[data-site-search]').isVisible(), false, 'Menu must close search');
    await page.locator('[data-search-toggle]').click();
    assert.equal(await page.locator('.pl-nav').isVisible(), false, 'Search must close menu');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-site-search]').isVisible(), false);
    assert.ok(await page.locator('[data-search-toggle]').evaluate(button => button === document.activeElement));

    await checkDialog('[data-book-details="patient-poker-player-win-more"]', 'The Patient Poker Player: Win More by Playing Less');
    await checkDialog('[data-book-details="patient-poker-player-advanced-tactics"]', 'The Patient Poker Player: Advanced Tactics to Outlast and Outplay');
    const previewButton = page.locator('[data-preview="behind-the-felt"]');
    await previewButton.click();
    assert.ok(await page.locator('#pl-preview-dialog').isVisible());
    assert.match(await page.locator('#pl-preview-dialog').textContent(), /not currently available to purchase/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#pl-preview-dialog').isVisible(), false);
    assert.ok(await previewButton.evaluate(button => button === document.activeElement));
    results.push('Responsive layout, menu, search and all three book controls at ' + width);
  }

  await page.setViewportSize({ width: 1024, height: 1000 });
  await home();
  const links = await page.locator('a[href]').evaluateAll(anchors => anchors.map(anchor => anchor.href));
  const checked = new Map();
  for (const href of new Set(links)) {
    const url = new URL(href);
    if (url.origin !== origin) continue;
    const hash = url.hash;
    url.hash = '';
    if (!checked.has(url.href)) {
      const response = await context.request.get(url.href);
      assert.ok(response.ok(), 'Broken homepage link ' + href);
      checked.set(url.href, await response.text());
    }
    if (hash) assert.ok(checked.get(url.href).includes('id="' + decodeURIComponent(hash.slice(1)) + '"'), 'Missing anchor ' + href);
  }
  assert.deepEqual(await page.locator('.pl-category-links a').evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute('href'))), ['books.html', 'apparel.html', 'card-protectors.html', 'resources.html']);
  for (const [selector, destination] of [['.pl-books-link', 'books'], ['.pl-ripple-link', 'ripple'], ['.pl-apparel-link', 'apparel'], ['.pl-category-links a[href="card-protectors.html"]', 'card-protectors']]) {
    await home();
    await page.locator(selector).click();
    await page.waitForURL(url => pageName(url.href) === destination);
    assert.equal(pageName(page.url()), destination);
  }
  await home();
  await page.locator('.pl-menu-toggle').click();
  await page.locator('.pl-nav a[href="resources.html"]').click();
  await page.waitForURL(url => pageName(url.href) === 'resources');
  assert.equal(await page.locator('.pl-menu-toggle').getAttribute('aria-expanded'), 'false');
  results.push('All homepage local links resolve; Books, Ripple, Apparel, Card Protectors and menu navigate to separate pages');

  await home();
  await page.locator('[data-book-details="patient-poker-player-win-more"]').click();
  await page.locator('#book-details-modal [data-add-to-cart]').click();
  assert.equal(await page.locator('[data-cart-count]').textContent(), '1');
  await page.keyboard.press('Escape');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('[data-cart-count]').textContent(), '1');
  await page.locator('[data-search-toggle]').click();
  await page.locator('[data-site-search] input').fill('math');
  await page.locator('[data-site-search] button[type="submit"]').click();
  await page.waitForURL(url => pageName(url.href) === 'books' && url.searchParams.get('q') === 'math');
  assert.ok(await page.locator('[data-book-card]').count() >= 1);
  assert.equal(await page.locator('[data-book-card]').filter({ hasText: 'Poker Math Made Easy' }).count(), 1);
  assert.equal(await page.locator('[data-cart-count]').textContent(), '1');
  await page.locator('[data-cart-link]').click();
  await page.waitForURL(url => pageName(url.href) === 'checkout');
  assert.match(await page.locator('[data-checkout-page]').textContent(), /The Patient Poker Player: Win More by Playing Less/);
  assert.equal(await page.locator('.cart-total strong').textContent(), '$14.99');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await noOverflow('checkout-' + width);
  }
  results.push('Book add-to-cart, reload persistence, submitted math search, and cart link/subtotal');

  await home();
  await page.locator('[data-local-form="newsletter"] input').fill('qa@example.invalid');
  await page.locator('[data-local-form="newsletter"] button').click();
  assert.match(await page.locator('[data-local-form="newsletter"] .form-status').textContent(), /No subscription has been created yet/);
  results.push('Newsletter confirms local-only behavior without a network submission');
  assert.deepEqual(errors, [], 'Browser JavaScript errors');
  assert.deepEqual(missing, [], 'Failed local HTTP responses');
  assert.deepEqual(failedRequests, [], 'Failed local network requests');
  assert.deepEqual(blockedWrites, [], 'Unexpected network mutation attempted');
  console.log('PASS: supplied-reference homepage interactions and responsive layouts.');
} finally {
  console.log(JSON.stringify({ results, measurements, errors, missing, failedRequests, blockedWrites }, null, 2));
  await browser.close();
}
