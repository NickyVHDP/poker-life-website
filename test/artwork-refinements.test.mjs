import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';

const file = name => new URL('../' + name, import.meta.url);
const read = name => readFile(file(name), 'utf8');

test('desktop and mobile heroes preload and use the matching-deck artwork', async () => {
  const home = await read('index.html');
  const asset = 'assets/poker-life-hero-photo-v3.png';
  assert.match(home, /<link rel="preload" href="assets\/poker-life-hero-photo-v3\.png" as="image"/);
  for (const className of ['pl-hero-image', 'pl-hero-image-mobile']) {
    const hero = home.match(new RegExp('<svg class="' + className + '"[^>]*>[\\s\\S]*?<\\/svg>'))?.[0];
    assert.ok(hero?.includes('href="' + asset + '"'), className + ' requires the matching-deck image');
  }
  assert.doesNotMatch(home, /poker-life-hero-photo-v2\.png/);
  const png = await readFile(file(asset));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.ok(png.readUInt32BE(16) >= 1600, 'Hero master must remain high resolution');
  await access(file('assets/poker-life-hero-photo-v2.png'));
});

test('both coin surfaces use the retouched coin without replacing the previous master', async () => {
  const asset = 'assets/poker-life-coins-photo-v4.webp';
  const home = await read('index.html');
  const page = await read('card-protectors.html');
  assert.equal(home.split('href="' + asset + '"').length - 1, 2, 'Both homepage coin render paths require the same corrected asset');
  assert.equal(page.split('href="' + asset + '"').length - 1, 1, 'Card protectors must share the corrected coin');
  assert.doesNotMatch(home + page, /poker-life-coins-photo-v3\.webp/);
  await access(file(asset));
  await access(file('assets/poker-life-coins-photo-v4.png'));
  await access(file('assets/poker-life-coins-photo-v3.png'));
  await access(file('assets/poker-life-coins-photo-v3.webp'));
});
