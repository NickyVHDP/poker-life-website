import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');

test('Behind the Felt hides only its outer white frame on both editorial surfaces', async () => {
  for (const page of ['index.html', 'books.html']) {
    const html = await read(page);
    assert.match(html, /<span class="pl-cover-trim"><img src="assets\/covers\/approved-november\/behind-the-felt\.png"[^>]*alt="Behind the Felt[^>]*><\/span>/, page + ': original cover requires the shared trim window');
    assert.equal((html.match(/class="pl-cover-trim"/g) || []).length, 1, page + ': other covers must not receive this source-specific crop');
  }
  const css = await read('theme-covers.css');
  assert.match(css, /\.pl-cover-trim\s*\{[^}]*overflow:hidden;[^}]*aspect-ratio:936\/1446;/);
  assert.match(css, /width:min\(100cqw,calc\(100cqh \* 936 \/ 1446\)\)/, 'Carousel crop must preserve its aspect ratio at narrow and wide sizes');
  const cover = await readFile(new URL('../assets/covers/approved-november/behind-the-felt.png', import.meta.url));
  assert.equal(createHash('sha256').update(cover).digest('hex'), 'c10524c6443987b57a7e4b02e5bc8e368f28b2007a581f952b1009813a303bb5', 'Source pixels and lettering must remain untouched');
});
