import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');
const coverRoot = 'assets/covers/approved-november/';
const volumes = ['pink', 'blue', 'red', 'yellow', 'black'];
const supplied = [...volumes.map(volume => `ripple-${volume}.png`), 'behind-the-felt.png', 'pros-dont-want-you-to-know.png', 'f-ked-on-the-river.png'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const originalHashes = {
  'ripple-pink.png': '5958ff86b35e2cf4ecf50c61ece328a611358e142df17f23f5ca8c5e7d277a77',
  'ripple-blue.png': '0f3b76bf9f8b58c742bdcd13f02069c2a9b2c1719e901cd394252b391e610148',
  'ripple-red.png': '5ffb5a26b19f310d092422263d496c78680ba4da3b31529f659553f00d5e6970',
  'ripple-yellow.png': '5674106631fa5a22455e8e6ed0edac6d32be37386ad271ecd50e3e9f7b6b537a',
  'ripple-black.png': 'c887202d303af696438516092e1cd25859a0d5f65927dad79e781b724ad0cd21',
  'behind-the-felt.png': 'c10524c6443987b57a7e4b02e5bc8e368f28b2007a581f952b1009813a303bb5',
  'pros-dont-want-you-to-know.png': 'bd1bc443c8e1048422587e13abf3294fd8a2d3f3ee1f2656df414c9e5432ae9d',
  'f-ked-on-the-river.png': '6134a5053eca2e7b2e3bc0207a58a27f4386c4d736968323b6d25c62aab5be08'
};

test('the November collection displays all eight supplied cover designs as individual high-resolution images', async () => {
  const consumers = (await Promise.all(['index.html', 'books.html', 'ripple.html', 'script.js'].map(read))).join('\n');
  for (const name of supplied) {
    const source = coverRoot + name;
    assert.ok(consumers.includes(source), 'Supplied cover has no public consumer: ' + name);
    const data = await readFile(new URL('../' + source, import.meta.url));
    assert.equal(data.subarray(1, 4).toString(), 'PNG', name + ' must remain a lossless PNG');
    assert.ok(data.readUInt32BE(16) >= 1000 && data.readUInt32BE(20) >= 1400, name + ' cover resolution was reduced');
  }
});

test('the homepage and series page share the five approved Ripple covers instead of baked promotional covers', async () => {
  for (const page of ['index.html', 'ripple.html']) {
    const html = await read(page);
    for (const volume of volumes) assert.ok(html.includes(coverRoot + `ripple-${volume}.png`), page + ': missing ' + volume);
    assert.doesNotMatch(html, /(?:src|href)="assets\/(?:home-reference-october\.png|ripple-(?:pink-promo|series-promo|series-suspense-promo)\.png|poker-life-books-scene-v2\.webp)/, page + ': obsolete baked cover art remains');
  }
  const home = await read('index.html');
  assert.match(home, /Five players\. One unforgettable poker hand\./);
  assert.doesNotMatch(home, /(?:Four|4) players/i, 'Homepage player count must be five');
});

test('current paperback cover mappings use the exact approved Pros and River artwork', async () => {
  const script = await read('script.js');
  assert.match(script, /'Poker: What the Pros Don’t Want You to Know':\s*'assets\/covers\/approved-november\/pros-dont-want-you-to-know\.png'/);
  assert.match(script, /'F#@KED on the River':\s*'assets\/covers\/approved-november\/f-ked-on-the-river\.png'/);
  assert.doesNotMatch(script, /assets\/covers\/clean\/(?:poker-what-the-pros-dont-want-you-to-know|f-ked-on-the-river)\.jpg/, 'Catalog/modal/cart must not retain superseded cover mappings');
});

test('featured books use independent current cover files rather than cropped composite art', async () => {
  const home = await read('index.html');
  const firstSlide = home.match(/<div\b[^>]*data-book-slide="0"[\s\S]*?(?=<div\b[^>]*data-book-slide="1")/)?.[0];
  assert.ok(firstSlide, 'Initial carousel slide missing');
  for (const cover of ['assets/covers/print-sharp/patient-poker-player-win-more.jpg', 'assets/covers/print-sharp/patient-poker-player-advanced-tactics.jpg', coverRoot + 'behind-the-felt.png']) {
    assert.ok(firstSlide.includes(cover), 'Featured edition does not match its book: ' + cover);
  }
  assert.equal((firstSlide.match(/<img\b/g) || []).length, 3, 'The first slide requires three independent cover images');
  assert.doesNotMatch(firstSlide, /<svg\b|<image\b/, 'Featured covers must not be crops from an invented composite');
});

test('all supplied originals are preserved and literal cover replacements remain byte-identical', async () => {
  const provenance = JSON.parse(await read(coverRoot + 'provenance.json'));
  assert.equal(provenance.updated, '2026-11-07');
  assert.deepEqual(provenance.covers.map(cover => cover.file).sort(), [...supplied].sort());
  for (const name of supplied) {
    const cover = provenance.covers.find(entry => entry.file === name);
    assert.equal(cover.original, 'originals/' + name, name + ': original source not recorded');
    const original = await readFile(new URL('../' + coverRoot + cover.original, import.meta.url));
    const current = await readFile(new URL('../' + coverRoot + name, import.meta.url));
    assert.equal(hash(original), originalHashes[name], name + ': supplied original bytes changed');
    assert.equal(cover.originalSha256, originalHashes[name], name + ': original provenance hash differs');
    assert.equal(hash(current), cover.sha256, name + ': current provenance hash differs');
    if (['ripple-black.png', 'behind-the-felt.png', 'pros-dont-want-you-to-know.png', 'f-ked-on-the-river.png'].includes(name)) {
      assert.equal(cover.treatment, 'original', name + ': approved literal artwork must not be regenerated');
      assert.equal(hash(current), originalHashes[name], name + ': literal replacement changed pixels');
    } else {
      assert.equal(cover.treatment, 'card-detail-repair', name + ': card repair must be documented');
    }
  }
});

test('the approved free-shipping checkout baseline remains locked during artwork edits', async () => {
  // Updated for the owner's November 8 request: free shipping on all orders.
  // Future artwork releases must not silently change payment, shipping or consent.
  // Update these snapshots only alongside an explicitly approved checkout change.
  const checkoutSnapshots = {
    'ripple-preorder-config.js': 'fab785e9013f49a9dba625a1b1f1b3929cd97dbc44727fa34a1d3917a34d5624',
    'ripple-page.js': '0ab3da26ec52da96386568f4a351bdc32c58adc3c5beb6ffb943f3f33fbfa4a5',
    'netlify/functions/create-checkout.mjs': '554b9223241676d4d36c316d0cf84660995d0dfbb5e8d6db312fc3e062471c49',
    'netlify/functions/order-status.mjs': '478aa336ea9a97e6446a74042dabfff5abc3a1026049165c01f4466a69a57d9e',
    'netlify/functions/stripe-webhook.mjs': '9ccfef16e1b68253ff37c97b494820f462f0ee24e344a3157cf134578541045e'
  };
  for (const [file, expected] of Object.entries(checkoutSnapshots)) {
    assert.equal(hash(await readFile(new URL('../' + file, import.meta.url))), expected, file + ': checkout baseline changed without updating its approved snapshot');
  }
});
