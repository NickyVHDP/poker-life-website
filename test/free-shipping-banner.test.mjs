import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');

test('every shopping and information page has the same native free-shipping announcement', async () => {
  const pages = (await readdir(root)).filter(name => name.endsWith('.html'));
  let announcement;
  for (const page of pages) {
    const html = await read(page);
    assert.match(html, /theme-shared\.css\?v=shipping-1/, page);
    assert.match(html, /script\.js\?v=16/, page);
    const banners = [...html.matchAll(/<aside class="pl-shipping-banner"[\s\S]*?<\/aside>/g)].map(match => match[0]);
    if (page === 'order-confirmed.html') {
      assert.equal(banners.length, 0, 'A new shipping promotion must not relabel historical paid orders');
      continue;
    }
    assert.equal(banners.length, 1, page);
    assert.match(banners[0], /Free U\.S\. shipping/);
    assert.match(banners[0], /Every order\. No minimum\./);
    assert.match(banners[0], /aria-label="Shipping offer"/);
    assert.match(banners[0], /<svg[^>]+aria-hidden="true"/);
    assert.ok(html.indexOf(banners[0]) > html.indexOf('</header>') && html.indexOf(banners[0]) < html.indexOf('<main'), page + ': banner must stay outside navigation and main content');
    announcement ??= banners[0];
    assert.equal(banners[0], announcement, page + ': shipping announcement drifted');
  }
});

test('cart and current public ordering copy promise free shipping without an order threshold', async () => {
  for (const name of ['script.js', 'books.html', 'ripple.html', 'faq.html', 'contact.html']) {
    const source = await read(name);
    assert.match(source, /free U\.S\. shipping/i, name);
    assert.doesNotMatch(source, /free on book orders over \$100|plus standard one-book shipping|shipping charge is shown|shipping.*added at checkout/i, name);
  }
  const script = await read('script.js');
  assert.match(script, /no minimum purchase/);
  assert.match(script, /result\.preorder\.shippingAmount \/ 100/, 'Historical order confirmations must still use the amount captured by Stripe');
});

test('the shipping announcement uses the existing black-and-gold style and normal document flow', async () => {
  const css = await read('theme-shared.css');
  const bannerRule = css.match(/\.pl-shipping-banner \{([^}]+)\}/)?.[1] || '';
  assert.match(bannerRule, /linear-gradient/);
  assert.match(bannerRule, /color: #161005/);
  assert.match(bannerRule, /width: min\(100%, 1540px\)/);
  assert.doesNotMatch(bannerRule, /position:\s*(?:fixed|absolute|sticky)/);
  assert.match(css, /@media \(max-width: 480px\).*\.pl-shipping-banner/);
});
