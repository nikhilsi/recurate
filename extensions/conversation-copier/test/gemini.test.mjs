import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, CORE } from './load.mjs';

const R = load([...CORE, 'platforms/gemini.js']);
const G = R.platforms.gemini;
const at = new Date('2026-11-15T22:00:00Z');
const md = conv => R.toMarkdown(conv, { timeZone: 'UTC' });

// Builds a positional turn the way Gemini sends it (see test/skeletons/gemini.json).
function turn({ r, parent = null, question, answer, rc, model = '3 Flash', secs, thinking = '', read = [], cites = [], list = [], userImages = [] }) {
  const cand = [];
  cand[0] = rc;
  if (answer !== null) cand[1] = Array.isArray(answer) ? answer : [answer];
  cand[2] = (cites.length || list.length)
    ? [list.length ? list.map(l => [null, null, (() => { const e = [l.url]; e[21] = l.title; return e; })(), 1]) : null,
       cites.length ? cites.map(c => [[c.snippet, 0, 0], [1, true, 1], [[c.url, c.title, 'https://thumb.example', 'source snippet']]]) : null, null, null, [null, null, 1]]
    : null;
  cand[37] = [[thinking], read.length ? [[[''], '', '', '', [], '', '', read.map(x => ['https://favicon.example', x.url, x.title])]] : undefined];
  const t3 = [[cand]];
  t3[21] = model;
  const user = [question];
  if (userImages.length) user[4] = [[null, null, null, null, userImages.map(u => [null, 1, u.name, u.url, null, 'x', null, null, 1, [4, 4], null, u.mime])]];
  return [['c_conv1', r], parent, [user], t3, [secs, 0]];
}

function sample() {
  // Newest first, as Gemini returns them.
  return [
    turn({ r: 'r_2', parent: ['c_conv1', 'r_1', 'rc_1'], rc: 'rc_2', secs: 1794780300, question: 'Second question',
      answer: 'Heat pumps cut bills in mild climates.', model: '3 Flash Thinking', thinking: 'Weighing costs',
      read: [{ url: 'https://read.example', title: 'Read page' }],
      cites: [{ snippet: 'cut bills', url: 'https://src.example', title: 'Source title' }],
      list: [{ url: 'https://list.example', title: 'Listed source' }] }),
    turn({ r: 'r_1', parent: null, rc: 'rc_1', secs: 1794780200, question: 'First question', answer: 'Answer one.',
      userImages: [{ name: 'photo.png', url: 'https://lh3.googleusercontent.com/abc', mime: 'image/png' }] }),
  ];
}

test('conversationRef covers /app, /u/N/app and gems', () => {
  assert.deepEqual({ ...G.conversationRef({ pathname: '/app/564183f6078a6600' }) }, { id: '564183f6078a6600', prefix: '' });
  assert.deepEqual({ ...G.conversationRef({ pathname: '/u/1/app/564183f6078a6600' }) }, { id: '564183f6078a6600', prefix: '/u/1' });
  assert.equal(G.conversationRef({ pathname: '/gem/abc123/564183f6078a6600' }).id, '564183f6078a6600');
  assert.equal(G.conversationRef({ pathname: '/app' }), null);
});

test('oldest first, complete when every parent link matches and pages ended', () => {
  const conv = G.parse(sample(), { exportedAt: at });
  assert.equal(conv.completeness.messages.complete, true);
  assert.equal(R.describeMessages(conv), '4 messages (all pages read; Gemini gives no total)');
  assert.deepEqual(Array.from(conv.messages, m => m.role), ['user', 'assistant', 'user', 'assistant']);
  assert.match(md(conv), /## 1\. You[\s\S]*First question[\s\S]*## 3\. You[\s\S]*Second question/);
});

test('a broken parent link, a repeated cursor, or the page cap make it partial', () => {
  const t = sample();
  t[0][1] = ['c_conv1', 'r_other', 'rc_other'];
  assert.match(R.describeMessages(G.parse(t, { exportedAt: at })), /may be partial \(1 turn link did not match/);
  assert.match(R.describeMessages(G.parse(sample(), { exportedAt: at, pagesComplete: false, pagesReason: 'Gemini repeated a page cursor, so older turns may be missing' })), /repeated a page cursor/);
});

test('duplicated turns across pages are counted once', () => {
  const t = sample();
  t.push(t[0]);
  assert.equal(G.parse(t, { exportedAt: at }).messages.length, 4);
});

test('shape guard: a shifted array is a structural error, not a wrong export', () => {
  const t = sample();
  t[0] = [null, ...t[0]];
  assert.throws(() => G.parse(t), e => e.name === 'StructuralError');
  assert.throws(() => G.parse([]), e => e.name === 'StructuralError');
});

test('thinking, inline citation after its snippet, read pages and listed sources', () => {
  const out = md(G.parse(sample(), { exportedAt: at }));
  assert.match(out, /> \*\*Thinking:\*\*\n>\n> Weighing costs/);
  assert.match(out, /Heat pumps cut bills\[2\] in mild climates\./);
  assert.match(out, /\*\*Sources\*\*\n\n1\. \[Read page\]\(<https:\/\/read\.example>\)\n2\. \[Source title\]\(<https:\/\/src\.example>\)\n3\. \[Listed source\]/);
});

test('model per answer and in the header; answer text parts are all kept', () => {
  const t = sample();
  t[1][3][0][0][1] = ['Part one.', 'Part two.'];
  const out = md(G.parse(t, { exportedAt: at }));
  assert.match(out, /## 2\. Gemini · [\d-]+ [\d:]+ · 3 Flash\n/);
  assert.match(out, /- \*\*Model:\*\* Models: 3 Flash, 3 Flash Thinking/);
  assert.match(out, /Part one\.\n\nPart two\./);
});

test('uploaded images are listed by name and counted as not downloadable', () => {
  const conv = G.parse(sample(), { exportedAt: at });
  const out = md(conv);
  assert.match(out, /## 1\. You · [\d-]+ [\d:]+\n\n\[Image: photo\.png\]\n\nFirst question/);
  assert.ok(!out.includes('lh3.googleusercontent.com'), 'no access links written');
  assert.match(conv.completeness.notIncluded.join(' '), /1 image \(Gemini's image server does not allow downloads/);
});

test('an empty answer stays as an empty message with a note', () => {
  const t = sample();
  delete t[1][3][0][0][1];
  const conv = G.parse(t, { exportedAt: at });
  assert.match(md(conv), /## 2\. Gemini[^\n]*\n\n_\(empty message\)_/);
  assert.match(conv.completeness.notes.join(' '), /1 message had no content in Gemini's data/);
});

test('a citation whose text is not found keeps its source and is noted', () => {
  const t = sample();
  t[0][3][0][0][2][1][0][0][0] = 'text that is not in the answer';
  const conv = G.parse(t, { exportedAt: at });
  assert.match(conv.completeness.notes.join(' '), /1 citation could not be placed in the text; its source is still listed/);
  assert.ok(conv.messages[3].sources.some(s => s.url === 'https://src.example'));
});

test('the draft named in t[3][3] is exported; the first candidate is the fallback', () => {
  const t = sample();
  const other = t[0][3][0][0].slice();
  other[0] = 'rc_2b';
  other[1] = ['The chosen second draft.'];
  t[0][3][0].push(other);
  t[0][3][3] = 'rc_2b';
  assert.match(md(G.parse(t, { exportedAt: at })), /The chosen second draft\./);
  t[0][3][3] = 'rc_missing';
  assert.match(md(G.parse(t, { exportedAt: at })), /Heat pumps cut bills/);
});

test('a blocked image download is final, so it is not retried', async () => {
  const S = load([...CORE, 'platforms/gemini.js'], { fetch: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(S.platforms.gemini.fetchFile({ id: 'https://lh3.googleusercontent.com/x' }), e => e.final === true);
});

test('an image that appears in several turns counts once', () => {
  const img = [{ name: 'photo.png', url: 'https://lh3.googleusercontent.com/abc', mime: 'image/png' }];
  const t = [
    turn({ r: 'r_2', parent: ['c_conv1', 'r_1', 'rc_1'], rc: 'rc_2', secs: 1794780300, question: 'Again', answer: 'Same photo.', userImages: img }),
    turn({ r: 'r_1', parent: null, rc: 'rc_1', secs: 1794780200, question: 'First', answer: 'A photo.', userImages: img }),
  ];
  const conv = G.parse(t, { exportedAt: at });
  assert.equal(conv.files.length, 1);
  assert.match(conv.completeness.notIncluded.join(' '), /^1 image \(/);
});
