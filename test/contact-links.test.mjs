import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { ripplePreorderConfig } from '../ripple-preorder-config.js';

const email = 'larrymccrackenjr@gmail.com';
const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');

test('Larry email links use the approved address and do not prefill private information', async () => {
  for (const name of ['contact.html', 'faq.html', 'ripple.html']) {
    const html = await read(name);
    const links = [...html.matchAll(/href="(mailto:[^"]+)"/g)].map(match => new URL(match[1]));
    assert.ok(links.length, name + ' has no email link');
    for (const link of links) {
      assert.equal(link.pathname, email);
      assert.deepEqual([...link.searchParams.keys()].filter(key => key !== 'subject'), []);
    }
  }
});

test('contact page replaces the inactive form with direct, accessible email instructions', async () => {
  const html = await read('contact.html');
  assert.match(html, /id="email-larry"/);
  assert.match(html, /Email Larry McCracken/);
  assert.match(html, />larrymccrackenjr@gmail\.com<\/a>/);
  assert.match(html, /Opens your email app/);
  assert.match(html, /Copy the address above/);
  assert.doesNotMatch(html, /data-local-form="contact"|Contact service coming soon|Preview message|Use the form|through the form/);
  for (const id of ['books-help', 'gear', 'coaching', 'courses']) assert.ok(html.includes(`id="${id}"`));
  assert.match(html, /data-local-form="newsletter"/);
});

test('FAQ email remains available alongside the independently gated offers', async () => {
  const html = await read('faq.html');
  assert.doesNotMatch(html, /No email address|Does the contact form actually send|There is no published refund/);
  assert.match(html, /Clicking the button does not send anything automatically/);
  assert.equal(ripplePreorderConfig.enabled, true);
  assert.equal(ripplePreorderConfig.pink.enabled, true);
  assert.equal(ripplePreorderConfig.bundle.enabled, false);
  assert.equal(ripplePreorderConfig.pink.amount, 2500);
  assert.equal(ripplePreorderConfig.bundle.amount, 10000);
});
