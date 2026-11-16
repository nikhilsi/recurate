import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load, CORE } from './load.mjs';

const R = load([...CORE, 'platforms/grok.js']);
const K = R.platforms.grok;
const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/grok-basic.json', import.meta.url), 'utf8'));
const at = new Date('2026-11-15T22:00:00Z');
const parse = (f, opts = {}) => K.parse(f.nodes, f.responses, { exportedAt: at, rid: 'r4', title: 'Logo', ...opts });
const md = conv => R.toMarkdown(conv, { timeZone: 'UTC' });

test('conversationRef reads the id and the rid leaf', () => {
  const ref = K.conversationRef({ pathname: '/c/aa0e6955-8cc8-46cc-ae80-950d58f50d38', search: '?rid=f8ab' });
  assert.equal(ref.id, 'aa0e6955-8cc8-46cc-ae80-950d58f50d38');
  assert.equal(ref.rid, 'f8ab');
  assert.equal(K.conversationRef({ pathname: '/imagine', search: '' }), null);
});

test('the rid branch is exported and complete', () => {
  const conv = parse(fixture());
  assert.equal(conv.completeness.messages.complete, true);
  assert.deepEqual(Array.from(conv.messages, m => m.role), ['user', 'assistant', 'user', 'assistant']);
  assert.ok(!md(conv).includes('Abandoned branch reply'));
});

test('without rid, the newest leaf is exported with a note', () => {
  const conv = parse(fixture(), { rid: null });
  assert.match(md(conv), /Abandoned branch reply/);
  assert.match(conv.completeness.notes.join(' '), /page address named no reply/);
});

test('two starting points make the export partial', () => {
  const f = fixture();
  f.nodes.responseNodes[2].parentResponseId = 'missing-parent';
  const conv = parse(f);
  assert.equal(conv.completeness.messages.complete, false);
  assert.match(R.describeMessages(conv), /2 starting points instead of one/);
});

test('missing lists are a structural error', () => {
  assert.throws(() => K.parse({}, {}), e => e.name === 'StructuralError');
});

test('thinking from steps and timing, image generation as a tool step with one file', () => {
  const conv = parse(fixture());
  const out = md(conv);
  assert.match(out, /> \*\*Thinking:\*\* Thought for 12s\n>\n> Sketching the mark\n> Choosing colors/);
  assert.match(out, /<summary>Tool: image generation<\/summary>[\s\S]*?"prompt": "flat shield logo"[\s\S]*?\[Image: Shield logo\.jpg\]/);
  assert.equal(conv.files.filter(f => f.id === 'users/u1/generated/g1/image.jpg').length, 1);
  assert.equal(conv.files.find(f => f.name === 'Shield logo.jpg').size, 61764);
});

test('user upload, search results as a tool step, cited sources, X posts', () => {
  const out = md(parse(fixture()));
  assert.match(out, /## 3\. You · 2026-11-15 14:02\n\n\[File: brief\.pdf\]\n\nUse this brief\./);
  assert.match(out, /<summary>Tool: web search<\/summary>[\s\S]*?"query": "logo trends"[\s\S]*?- \[Logo trends\]\(<https:\/\/a\.example>\)\n- \[Flat design\]/);
  assert.match(out, /<summary>Tool: X search<\/summary>[\s\S]*?- \[@designer\]\(<https:\/\/x\.com\/i\/status\/123>\)/);
  assert.match(out, /\*\*Sources\*\*\n\n1\. \[Logo trends\]\(<https:\/\/a\.example>\)/);
});

test('render tags are removed and counted; unmapped fields are kept, not dropped', () => {
  const conv = parse(fixture());
  const out = md(conv);
  assert.match(out, /Flat logos are common now\. Done\./);
  assert.ok(!out.includes('grok:render'));
  assert.match(conv.completeness.notes.join(' '), /1 inline citation tag removed from the text/);
  assert.match(out, /<summary>Tool: Grok data: ragResults<\/summary>[\s\S]*?"doc": "internal"/);
});

test('model per reply and in the header', () => {
  const out = md(parse(fixture()));
  assert.match(out, /## 2\. Grok · 2026-11-15 14:01 · grok-4-7/);
  assert.match(out, /- \*\*Model:\*\* Models: grok-4-7/);
});

test('image card tags go quietly; the image stays as its generation step', () => {
  const f = fixture();
  f.responses.responses[1].message = '<grok:render card_id="c1" card_type="generated_image_card" type="generated_image_card"></grok:render>';
  const conv = parse(f);
  assert.ok(!md(conv).includes('grok:render'));
  assert.ok(!/other inline|image/i.test(conv.completeness.notes.join(' ')));
  assert.match(md(conv), /<summary>Tool: image generation<\/summary>/);
});

test('a last reply still being written gets a note', () => {
  const f = fixture();
  assert.ok(!parse(f).completeness.notes.join(' ').includes('still being written'));
  f.responses.responses.find(r => r.responseId === 'r4').partial = true;
  assert.match(parse(f).completeness.notes.join(' '), /still being written/);
});
