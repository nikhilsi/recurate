import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load, CORE } from './load.mjs';

const R = load([...CORE, 'platforms/chatgpt.js']);
const G = R.platforms.chatgpt;
const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/chatgpt-basic.json', import.meta.url), 'utf8'));
const at = new Date('2026-11-15T22:00:00Z');
const md = (conv, extra = {}) => R.toMarkdown(conv, { timeZone: 'UTC', ...extra });

test('conversationRef handles /c/ and /g/.../c/ and rejects other pages', () => {
  assert.equal(G.conversationRef({ pathname: '/c/6a8e50f3-b734-83e8-98d7-34ad8d3b6bf0' }).id, '6a8e50f3-b734-83e8-98d7-34ad8d3b6bf0');
  assert.equal(G.conversationRef({ pathname: '/g/g-p-abc123/c/6a8e50f3-b734-83e8-98d7-34ad8d3b6bf0' }).id, '6a8e50f3-b734-83e8-98d7-34ad8d3b6bf0');
  assert.equal(G.conversationRef({ pathname: '/gpts' }), null);
});

test('active branch, root reached, system and hidden context skipped, turns merged', () => {
  const conv = G.parse(fixture(), { exportedAt: at });
  assert.equal(conv.completeness.messages.complete, true);
  assert.deepEqual(Array.from(conv.messages, m => m.role), ['user', 'assistant', 'user', 'assistant']);
  const out = md(conv);
  assert.ok(!out.includes('Other branch answer'));
  assert.ok(!out.includes('secret prefs'));
  assert.match(conv.completeness.notes.join(' '), /1 hidden context message \(custom instructions or memory\) skipped/);
});

test('a missing parent or a walk that stops short is partial', () => {
  const data = fixture();
  data.mapping.u1.parent = 'gone';
  assert.match(R.describeMessages(G.parse(data, { exportedAt: at })), /may be partial \(a parent message is missing from the data\)/);
});

test('no tree is a structural error', () => {
  assert.throws(() => G.parse({ title: 'x' }), e => e.name === 'StructuralError');
});

test('user turn: image and attachment, no duplicate image', () => {
  const out = md(G.parse(fixture(), { exportedAt: at }));
  assert.match(out, /## 1\. You · 2026-11-15 \d\d:\d\d\n\n\[File: tickets\.pdf\]\n\n\[Image: map\.png\]\n\nPlan a trip please/);
  assert.equal((out.match(/map\.png/g) || []).length, 1);
});

test('thinking, recap, tool calls by recipient with outputs, hidden tool output kept', () => {
  const conv = G.parse(fixture(), { exportedAt: at });
  const out = md(conv);
  assert.match(out, /> \*\*Thinking:\*\* Considering routes/);
  assert.match(out, /> \*\*Thinking:\*\* Thought for 12s/);
  assert.match(out, /<summary>Tool: python<\/summary>\n\n\*\*Input\*\*\n\n```text\nprint\(1\)\n```\n\n\*\*Output\*\*\n\n```text\n1\n```/);
  assert.match(out, /<summary>Tool: web\.run<\/summary>\n\n\*\*Input\*\*\n\n```json\n\{\n  "q": "trains"\n\}\n```\n\n\*\*Output\*\*\n\n```text\nresults page\n```\n\n\[Image: image-res1\]/);
  assert.match(out, /"open": 2[\s\S]*?\(no result recorded\)/);
  assert.match(conv.completeness.notes.join(' '), /1 tool output is hidden in ChatGPT's view and included here/);
});

test('citations: code-point offsets after an emoji, entity alt, file, hidden, widget, unmatched', () => {
  const conv = G.parse(fixture(), { exportedAt: at });
  const out = md(conv);
  assert.match(out, /🚆 Trains run hourly\[1\]\[2\]\. Book on SBB Mobile now\.\[file: tickets\.pdf\] Gone hidden \[client_defined_widget\]/);
  assert.match(out, /\*\*Sources\*\*\n\n1\. \[SBB\]\(<https:\/\/sbb\.example>\)\n2\. \[NS\]\(<https:\/\/ns\.example>\)/);
  assert.ok(!/[\uE200-\uE2FF]/.test(out), 'no private-use characters left');
  const notes = conv.completeness.notes.join(' ');
  assert.match(notes, /1 citation marker could not be matched and was removed/);
  assert.match(notes, /1 widget reference is shown as a placeholder/);
});

test('replaceReferences uses a replacer, so $ patterns in alt text stay literal', () => {
  const m = R.createMessage('assistant');
  const counts = { unmatched: 0, placeholders: 0 };
  const text = 'Pay \uE200entity\uE202x\uE201 today';
  const out = G.replaceReferences(text, [{ type: 'entity', matched_text: '\uE200entity\uE202x\uE201', alt: "$' and $&" }], m, counts);
  assert.equal(out, "Pay $' and $& today");
});

test('sources_footnote feeds the sources list and leaves no text', () => {
  const m = R.createMessage('assistant');
  const counts = { unmatched: 0, placeholders: 0 };
  const out = G.replaceReferences('Done.\uE200fn\uE201', [{ type: 'sources_footnote', matched_text: '\uE200fn\uE201', sources: [{ title: 'A', url: 'https://a' }] }], m, counts);
  assert.equal(out, 'Done.');
  assert.equal(m.sources.length, 1);
});

test('models listed in the header, model per assistant turn, unknown content kept', () => {
  const conv = G.parse(fixture(), { exportedAt: at });
  const out = md(conv);
  assert.match(out, /- \*\*Model:\*\* Models: gpt-5-6-thinking, gpt-6/);
  assert.match(out, /## 2\. ChatGPT · [\d-]+ [\d:]+ · gpt-6/);
  assert.match(out, /\[unsupported content: canvas_doc\]\n\n```text\n[\s\S]*canvas body text/);
});

test('fetch: token from the session, 404 stops with a reason', async () => {
  const seen = [];
  const fetch = async (path, init) => {
    seen.push([path, init && init.headers && init.headers.Authorization]);
    if (path === '/api/auth/session') return { ok: true, json: async () => ({ accessToken: 'tok' }) };
    return { ok: false, status: 404 };
  };
  const S = load([...CORE, 'platforms/chatgpt.js'], { fetch });
  await assert.rejects(S.platforms.chatgpt.extract({ hostname: 'chatgpt.com', pathname: '/c/6a8e50f3-b734-83e8-98d7-34ad8d3b6bf0' }),
    e => e.name === 'FetchError' && /HTTP 404/.test(e.message));
  assert.equal(seen[1][1], 'Bearer tok');
});

test('source markers inside raw tool output become readable, never invisible', () => {
  const data = fixture();
  data.mapping.t1.message.content.text = 'see \uE200cite\uE202turn0search3\uE201 for times';
  const out = md(G.parse(data, { exportedAt: at }));
  assert.match(out, /```text\nsee \[cite turn0search3\] for times\n```/);
  assert.ok(!/[\uE200-\uE2FF]/.test(out));
});

test('screen text: the version shown on screen is exported, with a note', () => {
  const conv = G.parse(fixture(), { exportedAt: at, screen: R.letters('ChatGPT said: Other branch answer.') });
  assert.match(md(conv), /Other branch answer/);
  assert.ok(!md(conv).includes('You are welcome'));
  assert.match(conv.completeness.notes.join(' '), /branch shown on screen/);
  const same = G.parse(fixture(), { exportedAt: at, screen: R.letters('You are welcome.') });
  assert.match(md(same), /You are welcome/);
  assert.ok(!same.completeness.notes.join(' ').includes('branch shown on screen'));
});

// --- breaker pass fixes ---

test('a whitespace sources footnote removes no space and still lists its sources', () => {
  const c = R.createConversation({ platform: 'chatgpt' });
  const msg = R.createMessage('assistant');
  c.messages.push(msg);
  const counts = { unmatched: 0, placeholders: 0 };
  const text = 'You can save money. Book early.';
  const refs = [{ type: 'sources_footnote', matched_text: ' ', start_idx: text.length, end_idx: text.length, sources: [{ title: 'Rail site', url: 'https://rail.example' }] }];
  assert.equal(G.replaceReferences(text, refs, msg, counts), text);
  assert.equal(counts.unmatched, 0);
  assert.equal(msg.sources.length, 1);
});

test('a last reply still being written or stopped gets a note', () => {
  const data = fixture();
  data.mapping.a8.message.status = 'in_progress';
  assert.match(G.parse(data, { exportedAt: at }).completeness.notes.join(' '), /still being written/);
  data.mapping.a8.message.status = 'finished_partial_completion';
  assert.match(G.parse(data, { exportedAt: at }).completeness.notes.join(' '), /stopped before it finished/);
  data.mapping.a8.message.status = 'finished_successfully';
  assert.ok(!G.parse(data, { exportedAt: at }).completeness.notes.join(' ').includes('last reply'));
});

test('a code part holding a fence gets a longer fence', () => {
  const data = fixture();
  data.mapping.a8.message.content = { content_type: 'code', language: 'md', text: '```\ninner\n```' };
  assert.match(md(G.parse(data, { exportedAt: at })), /````md\n```\ninner\n```\n````/);
});

test('screen text: a stopped first try is not swapped in (ChatGPT)', () => {
  const data = fixture();
  data.mapping.a8.message.content.parts = ['You are welcome.\n\n1. Keep the tickets\n2. Check the platform'];
  data.mapping.a8b.message.content.parts = ['You are welcome.'];
  const conv = G.parse(data, { exportedAt: at, screen: R.letters('ChatGPT said: You are welcome.\nKeep the tickets\nCheck the platform') });
  assert.match(md(conv), /2\. Check the platform/);
  assert.ok(!conv.completeness.notes.join(' ').includes('branch shown on screen'));
});

test('a whitespace reference at the same place as a real one loses neither', () => {
  const c = R.createConversation({ platform: 'chatgpt' });
  const msg = R.createMessage('assistant');
  c.messages.push(msg);
  const counts = { unmatched: 0, placeholders: 0 };
  const text = 'Hello \uE200cite\uE202turn0search0\uE201world';
  const at6 = 6;
  const refs = [
    { type: 'sources_footnote', matched_text: ' ', start_idx: at6, end_idx: at6, sources: [{ title: 'Foot', url: 'https://foot.example' }] },
    { type: 'url', matched_text: '\uE200cite\uE202turn0search0\uE201', start_idx: at6, end_idx: at6 + 20, item: { url: 'https://a.example' }, title: 'A' },
  ];
  const out = G.replaceReferences(text, refs, msg, counts);
  assert.ok(!/[\uE200-\uE202]/.test(out));
  assert.match(out, /^Hello \[\d\]world$/);
  assert.equal(msg.sources.length, 2);
});
