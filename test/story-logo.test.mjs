import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const file = name => new URL('../' + name, import.meta.url);
const read = name => readFile(file(name), 'utf8');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('desktop, mobile and author-page portraits share the refined background logo artwork', async () => {
  const source = 'assets/poker-life-story-photo-v4.webp';
  const home = await read('index.html');
  const about = await read('about.html');
  assert.equal(home.split('href="' + source + '"').length - 1, 2, 'Both homepage portrait paths must share the logo refinement');
  assert.equal(about.split('href="' + source + '"').length - 1, 1, 'Author portrait must share the logo refinement');
  assert.doesNotMatch(home + about, /poker-life-story-photo-v3\.webp/, 'Current pages must not retain the choppy background logo');
});

test('refined story artwork retains a high-resolution lossless master and efficient web delivery', async () => {
  const master = await readFile(file('assets/poker-life-story-photo-v4.png'));
  assert.equal(master.subarray(1, 4).toString(), 'PNG');
  assert.ok(master.readUInt32BE(16) >= 1600, 'The portrait master must not be a small enlarged screenshot');
  assert.ok(master.readUInt32BE(20) >= 500, 'The portrait master must retain enough vertical detail');
  await access(file('assets/poker-life-story-photo-v4.webp'));
});

test('the approved warm portrait originals remain untouched for recovery', async () => {
  const previous = {
    'assets/poker-life-story-photo-v3.png': '6ae72f7deac46ddb1318b4477a06abd552baddc17074fcbd719343381e89fa64',
    'assets/poker-life-story-photo-v3.webp': '70af8b5df52ca64d9db9578d7c628d2afd7b79964ceae299ec2b867e07efd698'
  };
  for (const [name, expected] of Object.entries(previous)) {
    assert.equal(hash(await readFile(file(name))), expected, name + ': logo cleanup must preserve the approved original');
  }
});
