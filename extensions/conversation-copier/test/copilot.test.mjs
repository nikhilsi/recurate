import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, CORE } from './load.mjs';

const R = load([...CORE, 'platforms/copilot.js']);
const C = R.platforms.copilot;
const at = new Date('2026-11-15T22:00:00Z');
const md = conv => R.toMarkdown(conv, { timeZone: 'UTC' });
// Stand-in for Turndown: strips tags. Turndown itself is tested live.
const toMd = html => html.replace(/<[^>]+>/g, '');

const rec = (pos, role, text, extra = {}) => ({ pos, setsize: 4, role, text, html: role === 'assistant' ? `<p>${text}</p>` : null, citations: [], ...extra });

test('hosts and conversationRef', () => {
  assert.ok(C.matches({ hostname: 'm365.cloud.microsoft' }));
  assert.ok(C.matches({ hostname: 'copilot.cloud.microsoft' }));
  assert.ok(C.matches({ hostname: 'copilot.com' }));
  assert.ok(!C.matches({ hostname: 'evilcopilot.com' }));
  assert.equal(C.conversationRef({ pathname: '/chat/conversation/D5F0FD52-2489-47E6-A771-7FE03B3E3447' }).id, 'D5F0FD52-2489-47E6-A771-7FE03B3E3447');
  assert.equal(C.conversationRef({ pathname: '/chat' }), null);
});

test('records are ordered by position and complete when every position is collected', () => {
  const collected = { records: [rec(3, 'user', 'Third'), rec(1, 'user', 'First'), rec(4, 'assistant', 'Fourth'), rec(2, 'assistant', 'Second')], setsize: 4, sizesSeen: [4] };
  const conv = C.parse(collected, { exportedAt: at, htmlToMarkdown: toMd });
  assert.deepEqual(Array.from(conv.messages, m => m.blocks[0].text), ['First', 'Second', 'Third', 'Fourth']);
  assert.equal(R.describeMessages(conv), '4 of 4 messages, complete (collected from the page by scrolling)');
});

test('a missing position is partial and names the stop reason', () => {
  const collected = { records: [rec(1, 'user', 'a'), rec(2, 'assistant', 'b'), rec(4, 'assistant', 'd')], setsize: 4, sizesSeen: [4], stopReason: 'collection hit the time limit' };
  const conv = C.parse(collected, { exportedAt: at, htmlToMarkdown: toMd });
  assert.match(R.describeMessages(conv), /^3 of 4 messages, may be partial \(collection hit the time limit; 1 of 4 positions were not reached\)$/);
});

test('an unlabeled message sits after its neighbor and is counted on top of the total', () => {
  const collected = { records: [rec(1, 'user', 'a'), rec(2, 'assistant', 'b'), rec(null, 'user', 'unlabeled', { after: 0, setsize: null }), rec(3, 'user', 'c'), rec(4, 'assistant', 'd')], setsize: 4, sizesSeen: [4] };
  const conv = C.parse(collected, { exportedAt: at, htmlToMarkdown: toMd });
  assert.equal(conv.messages[0].blocks[0].text, 'unlabeled');
  assert.equal(R.describeMessages(conv), '5 of 5 messages, complete (collected from the page by scrolling)');
  assert.match(conv.completeness.notes.join(' '), /1 message carried no position label/);
});

test('no total from Copilot means completeness is not claimed', () => {
  const collected = { records: [rec(null, 'user', 'a', { setsize: null }), rec(null, 'assistant', 'b', { setsize: null, after: 0 })], setsize: 0, sizesSeen: [] };
  const conv = C.parse(collected, { exportedAt: at, htmlToMarkdown: toMd });
  assert.match(R.describeMessages(conv), /may be partial \(Copilot did not report how many messages the chat has\)/);
});

test('a total that changed during collection is noted', () => {
  const collected = { records: [rec(1, 'user', 'a'), rec(2, 'assistant', 'b'), rec(3, 'user', 'c'), rec(4, 'assistant', 'd')], setsize: 4, sizesSeen: [3, 4] };
  assert.match(C.parse(collected, { exportedAt: at }).completeness.notes.join(' '), /total changed during collection \(3, 4\)/);
});

test('citations become source titles without links; images and files are listed as not included', () => {
  const collected = { records: [rec(1, 'user', 'q'), rec(2, 'assistant', 'answer', { citations: ['Email: pizza order', 'Calendar: party'] }), rec(3, 'user', 'q2'), rec(4, 'assistant', 'a2')], setsize: 4, sizesSeen: [4] };
  const conv = C.parse(collected, { exportedAt: at, htmlToMarkdown: toMd });
  const out = md(conv);
  assert.match(out, /\*\*Sources\*\*\n\n1\. Email: pizza order\n2\. Calendar: party/);
  assert.match(out, /- \*\*Not included:\*\* Copilot images and files\./);
  assert.match(conv.completeness.notes.join(' '), /source titles without links/);
});

test('no records is a structural error', () => {
  assert.throws(() => C.parse({ records: [] }), e => e.name === 'StructuralError');
});

test('markdown converted at collection time is used as is', () => {
  const collected = { records: [rec(1, 'user', 'q'), rec(2, 'assistant', 'raw', { markdown: '## Plan\n\n- one' }), rec(3, 'user', 'q2'), rec(4, 'assistant', 'a2')], setsize: 4, sizesSeen: [4] };
  assert.match(md(C.parse(collected, { exportedAt: at })), /## 2\. Copilot\n\n## Plan\n\n- one/);
});
