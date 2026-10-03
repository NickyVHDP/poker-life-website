import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Read-only UI regression checks. No checkout is submitted and no backend writes occur.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.PREVIEW_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const out = process.env.SCREENSHOT_DIR || '/private/tmp/poker-life-collections-qa';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true
});
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
const missing = [];
const failedRequests = [];
const measurements = [];
const checkedSvgAssets = new Set();
const collectionPages = ['books', 'apparel', 'shop', 'card-protectors'];
const destinations = [...collectionPages, 'resources', 'community', 'about'];
const navDestinations = ['index', 'books', 'apparel', 'resources', 'community', 'about'];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (response.status() >= 400 && new URL(response.url()).origin === new URL(base).origin) {
    missing.push(response.url() + ' ' + response.status());
  }
});
page.on('requestfailed', request => {
  if (new URL(request.url()).origin === new URL(base).origin) failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
});

// Netlify may canonicalize /books.html to /books; both identify the same page.
function pageName(href) {
  const pathname = new URL(href, base + '/').pathname.replace(/\/$/, '');
  return pathname.split('/').pop().replace(/\.html$/, '') || 'index';
}
function isPage(url, name) {
  return pageName(String(url)) === name;
}
async function goto(name) {
  const response = await page.goto(base + '/' + (name === 'index' ? '' : name + '.html'), { waitUntil: 'networkidle' });
  assert.ok(response?.ok(), name + ' did not return a successful response');
  assert.ok(isPage(page.url(), name === 'shop' ? 'apparel' : name), name + ' redirected to an unexpected page: ' + page.url());
  await page.evaluate(() => document.fonts.ready);
  if (name === 'books') await page.locator('#book-grid [data-book-card]').first().waitFor({ state: 'attached' });
}
async function checkImages(name) {
  const failed = await page.evaluate(async () => {
    const images = [...document.images];
    images.forEach(image => { image.loading = 'eager'; });
    return (await Promise.all(images.map(async image => {
      try { await image.decode(); } catch { return image.currentSrc || image.src || '(empty src)'; }
      return image.naturalWidth > 0 && image.naturalHeight > 0 ? null : image.currentSrc || image.src;
    }))).filter(Boolean);
  });
  assert.deepEqual(failed, [], name + ' has broken images');
  const svgAssets = await page.locator('svg image').evaluateAll(images => images.map(image => image.href.baseVal));
  for (const href of svgAssets) {
    const url = new URL(href, page.url()).href;
    if (checkedSvgAssets.has(url)) continue;
    checkedSvgAssets.add(url);
    const response = await context.request.get(url);
    assert.ok(response.ok(), name + ' has a missing SVG image source: ' + url);
    assert.match(response.headers()['content-type'] || '', /^image\//, 'SVG source is not an image: ' + url);
  }
}
async function checkShell(name) {
  const theme = await page.evaluate(() => ({
    gold: getComputedStyle(document.documentElement).getPropertyValue('--pl-gold').trim(),
    header: getComputedStyle(document.querySelector('.pl-site-header')).display,
    footer: getComputedStyle(document.querySelector('.pl-footer')).display
  }));
  assert.ok(theme.gold, name + ' shared theme stylesheet did not load');
  assert.equal(theme.header, 'flex', name + ' header theme layout did not load');
  assert.equal(theme.footer, 'grid', name + ' footer theme layout did not load');
  for (const selector of ['.pl-site-header .pl-brand', '.pl-footer .pl-footer-brand']) {
    const brand = page.locator(selector);
    assert.equal(await brand.count(), 1, name + ' missing brand link ' + selector);
    assert.equal(pageName(await brand.getAttribute('href')), 'index', name + ' brand link must lead home');
    assert.equal(await brand.locator('img.pl-brand-mark').count(), 1, name + ' should retain the sharp logo');
    assert.equal(await brand.locator('img.pl-brand-wordmark').count(), 1, name + ' should retain the sharp wordmark');
  }
  const topLinks = await page.locator('.pl-nav a').evaluateAll(links => links.map(link => ({ href: link.href, current: link.getAttribute('aria-current') })));
  assert.deepEqual(topLinks.map(link => pageName(link.href)), navDestinations, name + ' has unexpected top-level destinations');
  for (const destination of ['resources', 'community']) {
    const matching = topLinks.filter(link => pageName(link.href) === destination);
    assert.equal(matching.length, 1, name + ' missing ' + destination + ' destination');
    assert.equal(new URL(matching[0].href).hash, '', destination + ' must be a standalone page, not a homepage anchor');
    const footer = await page.locator('.pl-footer-nav a').evaluateAll(links => links.map(link => link.href));
    assert.ok(footer.some(href => pageName(href) === destination && !new URL(href).hash), name + ' footer missing dedicated ' + destination + ' link');
  }
  if (navDestinations.includes(name)) {
    assert.deepEqual(topLinks.filter(link => link.current === 'page').map(link => pageName(link.href)), [name], name + ' top navigation current-page state is wrong');
  }
  if (collectionPages.includes(name)) {
    const nav = page.locator('.pl-collection-nav, [data-collection-nav]');
    assert.equal(await nav.count(), 1, name + ' requires one collection navigation');
    const links = await nav.locator('a').evaluateAll(items => items.map(link => ({ href: link.href, current: link.getAttribute('aria-current') })));
    assert.deepEqual(links.map(link => pageName(link.href)), ['books', 'apparel', 'card-protectors'], name + ' collection links are wrong');
    assert.deepEqual(links.filter(link => link.current === 'page').map(link => pageName(link.href)), [name === 'shop' ? 'apparel' : name], name + ' collection current-page state is wrong');
  }
}
async function checkSeparatedCollections(name) {
  if (['apparel', 'shop', 'card-protectors'].includes(name)) {
    assert.equal(await page.locator('main #book-grid, main [data-book-card], main [data-add-to-cart]').count(), 0, name + ' must not include the books product grid or book checkout controls');
  }
  if (name === 'books') {
    assert.equal(await page.locator('main #book-grid').count(), 1, 'Books must keep its catalog');
    assert.ok(await page.locator('main [data-book-card]').count() > 0, 'Books catalog did not populate');
    assert.equal(await page.locator('main #merch, main #coins, main .gear-gallery, main .pl-coins-gallery, main .merch-product-grid, main [data-product-kind="apparel"], main [data-product-kind="card-protector"]').count(), 0, 'Books should not include apparel/card-protector product sections');
  }
}

try {
  for (const width of [320, 390, 770, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const name of destinations) {
      await goto(name);
      await checkShell(name);
      await checkSeparatedCollections(name);
      await checkImages(name);
      const measure = await page.evaluate(() => ({ width: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth }));
      measurements.push({ name, ...measure });
      assert.ok(measure.document <= width && measure.body <= width, name + ' overflows at ' + width + ': ' + JSON.stringify(measure));
      if ([390, 1440].includes(width) && ['apparel', 'card-protectors', 'resources', 'community'].includes(name)) {
        await page.screenshot({ path: out + '/' + name + '-' + width + '.png', fullPage: true });
      }
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await goto('index');
  await checkShell('index');
  const apparelCta = page.getByRole('link', { name: /shop apparel/i });
  const coinCta = page.getByRole('link', { name: /shop coins|shop card protectors/i });
  assert.equal(await apparelCta.count(), 1, 'Homepage needs one apparel link');
  assert.equal(pageName(await apparelCta.getAttribute('href')), 'apparel');
  assert.equal(await coinCta.count(), 1, 'Homepage needs one card-protector link');
  assert.equal(pageName(await coinCta.getAttribute('href')), 'card-protectors');
  assert.equal(await page.locator('[data-preview="coins"]').count(), 0, 'Card-protector CTA must navigate instead of opening a modal');
  await apparelCta.click();
  await page.waitForURL(url => isPage(url, 'apparel'));
  await goto('index');
  await page.getByRole('link', { name: /shop coins|shop card protectors/i }).click();
  await page.waitForURL(url => isPage(url, 'card-protectors'));
  for (const [legacyHash, destination] of [['coins', 'card-protectors'], ['books', 'books'], ['merch', 'apparel']]) {
    await page.goto(base + '/shop.html#' + legacyHash, { waitUntil: 'networkidle' });
    await page.waitForURL(url => isPage(url, destination));
  }

  // A fresh browser context starts with an empty cart; this only changes local UI state.
  await goto('books');
  await page.locator('[data-book-details]').first().click();
  await page.locator('#book-details-modal').waitFor({ state: 'visible' });
  const selectedTitle = await page.locator('#book-details-modal h2').textContent();
  const selectedPrice = await page.locator('#book-details-modal .book-modal-price').textContent();
  await page.locator('#book-details-modal [data-add-to-cart]').click();
  assert.equal(await page.locator('[data-cart-count]').textContent(), '1');
  await page.keyboard.press('Escape');
  await page.locator('[data-cart-link]').click();
  await page.waitForURL(url => isPage(url, 'checkout'));
  const cart = page.locator('[data-checkout-page]');
  assert.ok((await cart.textContent()).includes(selectedTitle), 'Cart lost the selected book');
  assert.ok((await cart.textContent()).includes(selectedPrice), 'Cart lost the selected book price');

  await page.locator('[data-search-toggle]').click();
  await page.locator('[data-site-search] input').fill('math');
  await page.locator('[data-site-search]').evaluate(form => form.requestSubmit());
  await page.waitForURL(url => isPage(url, 'books') && url.searchParams.get('q') === 'math');
  assert.equal(await page.locator('[data-book-card]').filter({ hasText: 'Poker Math Made Easy' }).count(), 1);
  assert.equal(await page.locator('[data-cart-count]').textContent(), '1', 'Search navigation should preserve the cart');

  await page.setViewportSize({ width: 390, height: 844 });
  await goto('apparel');
  await page.locator('.pl-menu-toggle').click();
  assert.equal(await page.locator('.pl-menu-toggle').getAttribute('aria-expanded'), 'true');
  await page.locator('.pl-nav a').filter({ hasText: /^Resources$/i }).click();
  await page.waitForURL(url => isPage(url, 'resources'));
  assert.equal(await page.locator('.pl-menu-toggle').getAttribute('aria-expanded'), 'false');

  assert.deepEqual(errors, [], 'Browser errors');
  assert.deepEqual(missing, [], 'Failed site asset requests');
  assert.deepEqual(failedRequests, [], 'Failed site network requests');
  console.log('PASS: separate collections, dedicated navigation, responsive layouts, assets, brand links, cart and books search.');
} finally {
  const finalState = await page.evaluate(() => ({
    url: location.href,
    ready: document.readyState,
    catalogCards: document.querySelectorAll('#book-grid [data-book-card]').length,
    scripts: performance.getEntriesByType('resource').filter(entry => entry.initiatorType === 'script').map(entry => ({ url: entry.name, bytes: entry.decodedBodySize }))
  })).catch(() => null);
  console.log(JSON.stringify({ errors, missing, failedRequests, measurements, finalState }, null, 2));
  await browser.close();
}
