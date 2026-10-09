import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/nickydivine/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = (process.env.PREVIEW_URL || 'http://127.0.0.1:4176').replace(/\/$/, '');
const origin = new URL(base).origin;
const screenshotDir = '/private/tmp/poker-life-restored-home-qa';
await mkdir(screenshotDir, { recursive: true });
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
async function checkCarousel() {
  const slide = index => page.locator(`[data-book-slide="${index}"]`);
  const dot = index => page.locator(`[data-carousel-index="${index}"]`);
  async function current(index) {
    assert.equal(await page.locator('[data-book-slide]:visible').count(), 1);
    assert.ok(await slide(index).isVisible());
    assert.equal(await dot(index).getAttribute('aria-current'), 'true');
    assert.equal(await page.locator('[data-carousel-index][aria-current="true"]').count(), 1);
  }
  await current(0);
  await page.locator('[data-carousel-step="1"]').click();
  await current(1);
  await page.locator('[data-carousel-step="-1"]').click();
  await current(0);
  await page.locator('[data-carousel-step="-1"]').click();
  await current(3);
  await page.locator('[data-carousel-step="1"]').click();
  await current(0);
  await dot(2).click();
  await current(2);
  await slide(2).locator('button').first().focus();
  await page.keyboard.press('ArrowRight');
  await current(3);
  assert.ok(await dot(3).evaluate(button => button === document.activeElement), 'Carousel must move focus out of a hidden slide');
  await page.keyboard.press('ArrowLeft');
  await current(2);
  assert.ok(await dot(2).evaluate(button => button === document.activeElement));
  assert.match(await page.locator('[data-carousel-status]').textContent(), /3 of 4/);
  await dot(0).click();
  await current(0);
}
try {
  for (const width of [320, 390, 700, 720, 721, 770, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await home();
    if ([390, 770, 1024, 1440].includes(width)) await page.screenshot({ path: `${screenshotDir}/home-${width}.png`, fullPage: true });
    await noOverflow('home-' + width);
    for (const id of ['books', 'merch', 'coins', 'resources', 'community', 'story']) {
      const copy = await page.locator('#' + id + ' .pl-feature-copy').evaluate(element => {
        const title = element.querySelector('h2');
        const body = element.querySelector('p:last-of-type');
        const button = element.querySelector('.pl-cta');
        const titleBox = title.getBoundingClientRect();
        const bodyBox = body.getBoundingClientRect();
        const buttonBox = button.getBoundingClientRect();
        return { titleWidth: titleBox.width, titleHeight: titleBox.height, fontSize: getComputedStyle(button).fontSize, bodyBottom: bodyBox.bottom, buttonTop: buttonBox.top };
      });
      assert.ok(copy.titleWidth > 10 && copy.titleHeight > 10 && parseFloat(copy.fontSize) > 0, id + ': native text and CTA must remain visible at ' + width);
      assert.ok(copy.bodyBottom <= copy.buttonTop + 2, id + ': body text overlaps the CTA at ' + width);
    }
    const rippleCopy = await page.locator('#ripple').evaluate(section => {
      const title = section.querySelector('.pl-ripple-title').getBoundingClientRect();
      const heading = section.querySelector('.pl-ripple-heading').getBoundingClientRect();
      const description = section.querySelector('.pl-ripple-description').getBoundingClientRect();
      const button = section.querySelector('.pl-ripple-link').getBoundingClientRect();
      return { titleBottom: title.bottom, headingTop: heading.top, descriptionBottom: description.bottom, buttonTop: button.top };
    });
    assert.ok(rippleCopy.titleBottom <= rippleCopy.headingTop + 2, 'Ripple title overlaps its subtitle at ' + width);
    assert.ok(rippleCopy.descriptionBottom <= rippleCopy.buttonTop + 2, 'Ripple description overlaps its CTA at ' + width);
    assert.deepEqual(await page.locator('main > section').evaluateAll(sections => sections.map(section => section.id || (section.classList.contains('pl-hero') ? 'hero' : 'unknown'))), ['hero', 'books', 'ripple', 'merch', 'coins', 'resources', 'community', 'story']);
    assert.doesNotMatch(await page.locator('body').textContent(), /free\s+(?:Poker Life\s+)?t[ -]?shirt/i, 'Removed shirt offer must not return');
    const mobileMenu = width <= 720;
    assert.equal(await page.locator('.pl-menu-toggle').isVisible(), mobileMenu, 'Responsive hamburger at ' + width);
    assert.equal(await page.locator('.pl-nav').isVisible(), !mobileMenu, 'Desktop navigation must remain visible at ' + width);
    if (mobileMenu) {
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
    }
    await page.locator('[data-search-toggle]').click();
    assert.ok(await page.locator('[data-site-search]').isVisible());
    assert.equal(await page.locator('[data-search-toggle]').getAttribute('aria-expanded'), 'true');
    assert.ok(await page.locator('[data-site-search] input').evaluate(input => input === document.activeElement));
    await noOverflow('search-' + width);
    if (mobileMenu) {
      await page.locator('.pl-menu-toggle').click();
      assert.equal(await page.locator('[data-site-search]').isVisible(), false, 'Menu must close search');
      await page.locator('[data-search-toggle]').click();
      assert.equal(await page.locator('.pl-nav').isVisible(), false, 'Search must close menu');
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-site-search]').isVisible(), false);
    assert.ok(await page.locator('[data-search-toggle]').evaluate(button => button === document.activeElement));

    await checkCarousel();
    await checkDialog('[data-book-details="patient-poker-player-win-more"]', 'The Patient Poker Player: Win More by Playing Less');
    await checkDialog('[data-book-details="patient-poker-player-advanced-tactics"]', 'The Patient Poker Player: Advanced Tactics to Outlast and Outplay');
    const previewButton = page.locator('[data-preview="behind-the-felt"]');
    await previewButton.click();
    assert.ok(await page.locator('#pl-preview-dialog').isVisible());
    assert.match(await page.locator('#pl-preview-dialog').textContent(), /not currently available to purchase/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#pl-preview-dialog').isVisible(), false);
    assert.ok(await previewButton.evaluate(button => button === document.activeElement));
    results.push('All eight sections, responsive navigation, search, carousel and book controls at ' + width);
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
  assert.deepEqual(await page.locator('.pl-resource-links a').evaluateAll(anchors => anchors.map(anchor => ({ href: anchor.href, target: anchor.target, rel: anchor.rel }))), [
    'https://www.worldpokertour.com/', 'https://www.pokeratlas.com/', 'https://www.acrpoker.eu/', 'https://www.pokerstars.com/'
  ].map(href => ({ href, target: '_blank', rel: 'noopener noreferrer' })));
  for (const [selector, destination] of [['#books .pl-cta', 'books'], ['.pl-ripple-link', 'ripple'], ['#merch .pl-cta', 'apparel'], ['#coins .pl-cta', 'card-protectors'], ['#resources .pl-cta', 'resources'], ['#community .pl-cta', 'community'], ['#story .pl-cta', 'about']]) {
    await home();
    await page.locator(selector).click();
    await page.waitForURL(url => pageName(url.href) === destination);
    assert.equal(pageName(page.url()), destination);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await home();
  await page.locator('.pl-menu-toggle').click();
  await page.locator('.pl-nav a[href="resources.html"]').click();
  await page.waitForURL(url => pageName(url.href) === 'resources');
  assert.equal(await page.locator('.pl-menu-toggle').getAttribute('aria-expanded'), 'false');
  results.push('All local links and anchors resolve; seven section CTAs and mobile menu navigate to separate pages; four external resource links have safe new-tab behavior');

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
  console.log('PASS: restored full-reference homepage, Ripple placement, interactions and responsive layouts.');
} finally {
  console.log(JSON.stringify({ results, measurements, errors, missing, failedRequests, blockedWrites }, null, 2));
  await browser.close();
}
