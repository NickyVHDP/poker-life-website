import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4176';
const out = '/private/tmp/poker-life-contact-qa';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext();
const errors = [], writes = [];
await context.route('**/*', route => {
  if (!['GET', 'HEAD'].includes(route.request().method())) {
    writes.push(route.request().url());
    return route.abort();
  }
  return route.continue();
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
try {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const name of ['contact', 'faq', 'ripple']) {
      const response = await page.goto(`${base}/${name}.html`, { waitUntil: 'networkidle' });
      assert.ok(response.ok());
      const links = await page.locator('a[href^="mailto:"]').evaluateAll(items => items.map(item => item.getAttribute('href')));
      assert.ok(links.length, `${name}: email link missing`);
      links.forEach(href => assert.equal(new URL(href).pathname, 'larrymccrackenjr@gmail.com'));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} overflows at ${width}`);
      if (name === 'contact') {
        assert.equal(await page.locator('[data-local-form="contact"]').count(), 0);
        const button = page.getByRole('link', { name: 'Email Larry', exact: true });
        assert.ok(await button.isVisible());
        await button.focus();
        assert.ok(await button.evaluate(element => document.activeElement === element));
        assert.ok(await page.getByText('larrymccrackenjr@gmail.com', { exact: true }).isVisible());
        await page.screenshot({ path: `${out}/contact-${width}.png`, fullPage: true });
      }
      if (name === 'ripple') {
        await page.locator('[data-preorder-offer="pink"]').click();
        const dialog = page.locator('[data-preorder-dialog]');
        assert.ok(await dialog.locator('a[href^="mailto:"]').isVisible());
        assert.ok(await dialog.locator('[data-preorder-checkout]').isDisabled());
        assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth));
        await page.locator('[data-preorder-close]').click();
      }
    }
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, []);
  console.log('PASS: contact, FAQ, and Ripple at 320/390/1440px; exact email links, keyboard focus, no layout overflow, no outgoing messages or payment requests. Screenshots: ' + out);
} finally { await browser.close(); }
