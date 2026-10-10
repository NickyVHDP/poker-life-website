import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { ripplePreorderConfig } from '../ripple-preorder-config.js';

const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');

test('the full Ripple series is coming soon, without a public preorder price or control', async () => {
  const html = await read('ripple.html');
  assert.match(html, /class="[^"]*ripple-series-coming-soon/);
  assert.match(html, /Coming [Ss]oon/);
  assert.deepEqual([...html.matchAll(/data-preorder-offer="([^"]+)"/g)].map(match => match[1]), ['pink']);
  for (const name of ['ripple.html', 'books.html']) {
    const source = await read(name);
    assert.doesNotMatch(source, /\$100|data-preorder-offer="bundle"|one week before|seven days before|five early deliveries|preorder the (?:full|complete) series/i, name);
  }
});

test('Pink remains a $25 preorder with standard book shipping while the series stays closed', () => {
  assert.equal(ripplePreorderConfig.enabled, true);
  assert.equal(ripplePreorderConfig.termsVersion, 'ripple-preorder-v5');
  assert.equal(ripplePreorderConfig.pink.enabled, true);
  assert.equal(ripplePreorderConfig.pink.amount, 2500);
  assert.equal(ripplePreorderConfig.pink.estimatedShipMonth, '2026-12');
  assert.equal(ripplePreorderConfig.pink.shippingPolicy, 'standard-book');
  assert.equal(ripplePreorderConfig.pink.shippingAmount, null);
  assert.match(ripplePreorderConfig.pink.termsText, /standard.*shipping|shipping.*checkout/i);
  assert.doesNotMatch(ripplePreorderConfig.pink.termsText, /free\s+(?:U\.?S\.?\s+)?shipping/i);
  assert.deepEqual(ripplePreorderConfig.countries, ['US']);
  assert.equal(ripplePreorderConfig.bundle.enabled, false);
});

test('public Pink marketing does not promise free shipping', async () => {
  for (const name of ['ripple.html', 'books.html', 'ripple-page.js']) {
    const source = await read(name);
    assert.doesNotMatch(source, /free\s+(?:U\.?S\.?\s+)?shipping|Pink preorder includes free/i, name);
    assert.match(source, /standard.*shipping|shipping.*checkout/i, name);
  }
});

test('the Pink payment form retains explicit consent and a separate secure checkout', async () => {
  const html = await read('ripple.html');
  assert.match(html, /name="accepted" required/);
  assert.match(html, /my payment is collected now/);
  assert.match(html, /data-preorder-checkout disabled/);
  assert.match(html, /larrymccrackenjr@gmail\.com/);
});
