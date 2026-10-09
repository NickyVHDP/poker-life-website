import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,access} from 'node:fs/promises';

const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
const exists=name=>access(new URL('../'+name,import.meta.url));
const scenes={books:'books-scene',apparel:'apparel-photo',coins:'coins-photo',resources:'resources-photo',community:'community-photo',story:'story-photo'};
const sceneVersion=section=>section==='story'?'v3':'v2';

test('high-detail section art is shared with corresponding destinations',async()=>{
  const home=await read('index.html');
  const css=await read('theme-images.css');
  const pages={books:'books.html',apparel:'apparel.html',coins:'card-protectors.html',resources:'resources.html',community:'community.html',story:'about.html'};
  for(const [section,scene] of Object.entries(scenes)){
    const asset='assets/poker-life-'+scene+'-'+sceneVersion(section)+'.webp';
    assert.ok(home.includes(asset),section+' homepage source missing');
    const page=await read(pages[section]);
    assert.ok(page.includes(asset)||(section==='resources'&&css.includes(asset)),section+' destination source missing');
    assert.match(page,/theme-images\.css/);
    const master=await readFile(new URL('../assets/poker-life-'+scene+'-'+sceneVersion(section)+'.png',import.meta.url));
    assert.equal(master.subarray(1,4).toString(),'PNG');
    assert.ok(master.readUInt32BE(16)>=1600,scene+' master must be high resolution');
    await exists(asset);
  }
  assert.doesNotMatch(home,/poker-life-design-reference\.png/,'Enlarged reference sprites must not be used for polished sections');
  assert.ok((await read('shop.html')).includes('assets/poker-life-apparel-photo-v2.webp'));
});

test('resource tiles share the crisp official-source logo files',async()=>{
  const home=await read('index.html');
  const page=await read('resources.html');
  const provenance=JSON.parse(await read('assets/resources/provenance.json'));
  for(const file of ['wpt-logo.png','pokeratlas-logo.png','acr-logo.png','pokerstars-logo.svg']){
    const asset='assets/resources/'+file;
    assert.ok(home.includes(asset)&&page.includes(asset),'Logo consumers differ: '+file);
    await exists(asset);
    assert.ok(provenance.assets.some(entry=>entry.file===file&&entry.sourceAsset.startsWith('https://')));
  }
});

test('verified higher-resolution paperback originals feed the common cover mapping',async()=>{
  const script=await read('script.js');
  const provenance=JSON.parse(await read('assets/covers/print-sharp/provenance.json'));
  assert.equal(provenance.covers.length,5);
  for(const cover of provenance.covers){
    const path='assets/covers/print-sharp/'+cover.file;
    await exists(path);
    assert.ok(script.includes(path),'Shared catalog/modal/cart source missing: '+cover.file);
    assert.ok(cover.newDimensions[0]>=1000&&cover.newDimensions[1]>cover.oldDimensions[1]);
    assert.match(cover.sourceUrl,/^https:\/\/m\.media-amazon\.com\/images\//);
  }
  assert.doesNotMatch(script,/assets\/covers\/print-sharp\/poker-players-joke-book/);
});

test('original approved artwork remains available for recovery',async()=>{
  for(const file of ['assets/poker-life-design-reference.png','assets/poker-life-story-photo.png','assets/poker-life-hero-photo.png'])await exists(file);
});
