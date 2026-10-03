import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const out = process.env.SCREENSHOT_DIR || '/private/tmp/poker-life-design-qa';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });
const errors = [];
const missing = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base)) missing.push(response.url() + ' ' + response.status()); });
const layout = [];
try {
  for (const width of [1540, 1440, 1024, 770, 700, 390, 320]) {
    await page.setViewportSize({width, height:950});
    await page.goto(base + '/', {waitUntil:'networkidle'});
    await page.evaluate(() => document.fonts.ready);
    const measure = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      header: document.querySelector('.pl-site-header').getBoundingClientRect().toJSON(),
      nav: document.querySelector('.pl-nav').getBoundingClientRect().toJSON(),
      headings: [...document.querySelectorAll('.pl-feature h2')].map(el => ({text:el.textContent,weight:getComputedStyle(el).fontWeight,font:getComputedStyle(el).fontFamily,size:getComputedStyle(el).fontSize})),
      sections: [...document.querySelectorAll('.pl-feature')].map(el => {
        const copy = el.querySelector('.pl-feature-copy');
        return {id:el.id, bottom:el.getBoundingClientRect().bottom, copyBottom:copy.getBoundingClientRect().bottom};
      })
    }));
    layout.push(measure);
    assert.ok(measure.scroll <= width, 'Homepage overflows at ' + width + ': ' + measure.scroll);
    if (width > 700) {
      for (const s of measure.sections) assert.ok(s.copyBottom <= s.bottom + 2, s.id + ' copy clipped at ' + width);
    }
    if ([1440,770,390].includes(width)) await page.screenshot({path:out + '/home-' + width + '.png',fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base + '/', {waitUntil:'networkidle'});
  await page.locator('[data-carousel-step="1"]').click();
  assert.equal(await page.locator('[data-book-slide="1"]').isVisible(), true);
  await page.locator('[data-carousel-step="-1"]').click();
  await page.locator('[data-book-slide="0"] [data-book-details]').first().click();
  await page.locator('#book-details-modal').waitFor({state:'visible'});
  await page.locator('#book-details-modal [data-add-to-cart]').click();
  assert.equal(await page.locator('[data-cart-count]').textContent(), '1');
  await page.keyboard.press('Escape');
  await page.locator('[data-preview="behind-the-felt"]').click();
  assert.match(await page.locator('#pl-preview-dialog').textContent(), /not currently available/);
  await page.keyboard.press('Escape');
  await page.locator('[data-search-toggle]').click();
  await page.locator('[data-site-search] input').fill('math');
  await page.locator('[data-site-search]').evaluate(form => form.requestSubmit());
  await page.waitForURL('**/books.html?q=math');
  assert.ok(await page.locator('[data-book-card]').count() >= 1);
  assert.equal(await page.locator('[data-book-card]').filter({hasText:'Poker Math Made Easy'}).count(), 1);
  await page.screenshot({path:out+'/book-search.png',fullPage:true});
  await page.locator('[data-cart-link]').click();
  await page.waitForURL('**/checkout.html');
  assert.match(await page.locator('[data-checkout-page]').textContent(), /14.99/);
  await page.screenshot({path:out+'/cart-desktop.png',fullPage:true});
  for (const width of [390, 320]) {
    await page.setViewportSize({width,height:844});
    for (const path of ['books.html','shop.html','about.html','articles.html','faq.html','contact.html','checkout.html','order-confirmed.html']) {
      await page.goto(base+'/'+path,{waitUntil:'networkidle'});
      const sw = await page.evaluate(()=>document.documentElement.scrollWidth);
      assert.ok(sw<=width,path+' overflows at '+width+': '+sw);
      if(width===390 && ['books.html','checkout.html'].includes(path)) await page.screenshot({path:out+'/'+path+'-mobile.png',fullPage:true});
    }
  }
  await page.goto(base+'/',{waitUntil:'networkidle'});
  await page.locator('.pl-menu-toggle').click();
  assert.equal(await page.locator('.pl-menu-toggle').getAttribute('aria-expanded'),'true');
  await page.locator('.pl-nav a[href="books.html"]').click();
  await page.waitForURL('**/books.html');
  assert.equal(await page.locator('.pl-menu-toggle').getAttribute('aria-expanded'),'false');
  assert.deepEqual(errors,[]);
  assert.deepEqual(missing,[]);
  console.log('PASS: responsive layouts, catalog, cart, dialogs, carousel, search and mobile menu.');
} finally {
  console.log(JSON.stringify({errors,missing,viewports:layout.map(({width,scroll,sections})=>({width,scroll,sections}))},null,2));
  await browser.close();
}
