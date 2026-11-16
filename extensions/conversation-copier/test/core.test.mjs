import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, CORE } from './load.mjs';

const R = load(CORE);
const opts = { timeZone: 'UTC' };

function sample() {
  const c = R.createConversation({
    platform: 'claude', id: 'abc', title: 'Trip plan', url: 'https://claude.ai/chat/abc',
    exportedAt: new Date('2026-11-15T22:00:00Z'), modelNote: 'Model setting at export: claude-opus-5-5',
  });
  const u = R.createMessage('user', { createdAt: '2026-11-15T14:02:00Z' });
  u.blocks.push(R.block.text('Find trains to Amsterdam'));
  const a = R.createMessage('assistant', { createdAt: '2026-11-15T14:03:00Z' });
  const n = R.addSource(a, 'SBB timetable', 'https://sbb.ch/x');
  a.blocks.push(R.block.text(`There are three trains a day [${n}].`));
  c.messages.push(u, a);
  return c;
}

// --- safeName ---

test('safeName strips separators, traversal and Windows characters', () => {
  assert.equal(R.safeName('../../etc/passwd'), '___.._etc_passwd');
  assert.equal(R.safeName('a/b\\c.txt'), 'a_b_c.txt');
  assert.equal(R.safeName('q3: "final" <v2>?.pdf'), 'q3_ _final_ _v2__.pdf');
  assert.equal(R.safeName('..'), 'file');
  assert.equal(R.safeName('.env'), '_env');
  assert.equal(R.safeName('notes. . '), 'notes');
  assert.equal(R.safeName(''), 'file');
  assert.equal(R.safeName('tab\there\u0007.md'), 'tabhere.md');
});

test('safeName prefixes reserved Windows names', () => {
  assert.equal(R.safeName('CON.txt'), '_CON.txt');
  assert.equal(R.safeName('nul'), '_nul');
  assert.equal(R.safeName('console.txt'), 'console.txt');
});

test('safeName caps at 100 UTF-8 bytes, keeps the extension, never splits a character', () => {
  const long = '日本語'.repeat(30) + '.pdf';
  const name = R.safeName(long);
  assert.ok(R.utf8Bytes(name) <= 100, `bytes ${R.utf8Bytes(name)}`);
  assert.ok(name.endsWith('.pdf'));
  assert.ok(!name.includes('�'));
  assert.equal(Array.from(name.slice(0, -4)).every(ch => '日本語'.includes(ch)), true);
});

test('safeName dedupes case-insensitively and loops until a name is free', () => {
  const used = new Set();
  assert.equal(R.safeName('a.txt', used), 'a.txt');
  assert.equal(R.safeName('A.TXT', used), 'A-2.TXT');
  assert.equal(R.safeName('a-2.txt', used), 'a-2-2.txt');
  assert.equal(R.safeName('a.txt', used), 'a-3.txt');
});

test('slugify gives a dash-joined name and a fallback', () => {
  assert.equal(R.slugify('Train options: Lausanne → Amsterdam!'), 'train-options-lausanne-amsterdam');
  assert.equal(R.slugify('???'), 'conversation');
});

// --- model ---

test('addSource numbers sources per message and reuses a URL', () => {
  const m = R.createMessage('assistant');
  assert.equal(R.addSource(m, 'A', 'https://a'), 1);
  assert.equal(R.addSource(m, 'B', 'https://b'), 2);
  assert.equal(R.addSource(m, 'A again', 'https://a'), 1);
  assert.equal(m.sources.length, 2);
});

test('unsupported blocks keep every string found inside', () => {
  const b = R.block.unsupported('audio_transcription', { a: 'hello', b: [{ c: 'world', d: 3 }], e: '  ' });
  assert.deepEqual(Array.from(b.strings), ['hello', 'world']);
});

test('finish numbers messages and notes empty ones without dropping them', () => {
  const c = sample();
  c.messages.push(R.createMessage('user'));
  R.finish(c, { complete: true });
  assert.deepEqual(Array.from(c.messages, m => m.n), [1, 2, 3]);
  assert.equal(c.completeness.messages.got, 3);
  assert.match(c.completeness.notes[0], /1 message had no content/);
});

// --- completeness lines ---

test('completeness line: complete from data', () => {
  const c = R.finish(sample(), { complete: true });
  assert.equal(R.describeMessages(c), "2 messages, complete (read from Claude's conversation data)");
});

test('completeness line: all pages read with no site total', () => {
  const c = sample();
  c.platform = 'gemini'; c.platformName = 'Gemini';
  R.finish(c, { complete: true, noTotal: true });
  assert.equal(R.describeMessages(c), '2 messages (all pages read; Gemini gives no total)');
});

test('completeness line: scroll collection with a total', () => {
  const c = sample();
  c.platform = 'copilot'; c.platformName = 'Copilot';
  R.finish(c, { complete: true, method: 'scroll', expected: 2 });
  assert.equal(R.describeMessages(c), '2 of 2 messages, complete (collected from the page by scrolling)');
});

test('completeness line: partial names its reason', () => {
  const c = R.finish(sample(), { complete: false, reason: 'a parent message is missing from the data' });
  assert.equal(R.describeMessages(c), '2 messages, may be partial (a parent message is missing from the data)');
  const s = sample();
  R.finish(s, { complete: false, method: 'scroll', expected: 26, reason: 'stopped at the time limit' });
  assert.match(R.describeMessages(s), /^2 of 26 messages, may be partial \(stopped at the time limit\)$/);
});

// --- Markdown writer ---

test('header carries title, link, model note and completeness', () => {
  const md = R.toMarkdown(R.finish(sample(), { complete: true }), opts);
  assert.match(md, /^# Trip plan\n/);
  assert.match(md, /- \*\*Link:\*\* <https:\/\/claude\.ai\/chat\/abc>/);
  assert.match(md, /- \*\*Exported:\*\* November 15, 2026 at 10:00 PM UTC/);
  assert.match(md, /- \*\*Model:\*\* Model setting at export: claude-opus-5-5/);
  assert.match(md, /- \*\*Messages:\*\* 2 messages, complete/);
});

test('headings are numbered with time, and sources are listed after the message', () => {
  const c = sample();
  c.messages[1].model = 'gpt-6';
  const md = R.toMarkdown(R.finish(c, { complete: true }), opts);
  assert.match(md, /## 1\. You · 2026-11-15 14:02\n/);
  assert.match(md, /## 2\. Claude · 2026-11-15 14:03 · gpt-6\n/);
  assert.match(md, /three trains a day \[1\]\.\n\n\*\*Sources\*\*\n\n1\. \[SBB timetable\]\(<https:\/\/sbb\.ch\/x>\)/);
});

test('a pasted heading inside a message cannot pass for a message heading', () => {
  const c = sample();
  c.messages[0].blocks.push(R.block.text('## Claude\nfake turn'));
  const md = R.toMarkdown(R.finish(c, { complete: true }), opts);
  assert.equal((md.match(/^## \d+\. /gm) || []).length, 2);
});

test('tool blocks: input, output parts, error, no result, fences longer than content', () => {
  const c = sample();
  const a = c.messages[1];
  a.blocks.push(R.block.tool({
    name: 'web_search', input: { query: 'trains' },
    output: [R.output.text('result with ```code``` inside'), R.output.links([{ title: 'SBB', url: 'https://sbb.ch' }])],
  }));
  a.blocks.push(R.block.tool({ name: 'bash', input: { cmd: 'ls' }, noResult: true }));
  a.blocks.push(R.block.tool({ name: '<script>', input: 'x', isError: true, output: [R.output.json({ ok: false })] }));
  const md = R.toMarkdown(R.finish(c, { complete: true }), opts);
  assert.match(md, /<summary>Tool: web_search<\/summary>/);
  assert.match(md, /\*\*Input\*\*\n\n```json\n\{\n  "query": "trains"\n\}\n```/);
  assert.match(md, /````text\nresult with ```code``` inside\n````/);
  assert.match(md, /- \[SBB\]\(<https:\/\/sbb\.ch>\)/);
  assert.match(md, /<summary>Tool: bash<\/summary>[\s\S]*?\(no result recorded\)/);
  assert.match(md, /<summary>Tool: &lt;script&gt; \(error\)<\/summary>/);
});

test('fenceFor grows past the longest backtick run', () => {
  assert.equal(R.fenceFor('plain'), '```');
  assert.equal(R.fenceFor('a ```` b'), '`````');
});

test('thinking: summary, text, hidden label; empty thinking is skipped', () => {
  const c = sample();
  c.platform = 'chatgpt'; c.platformName = 'ChatGPT';
  c.messages[1].blocks.unshift(R.block.thinking('Checked timetables', 'Line one\nLine two', true));
  c.messages[1].blocks.push(R.block.thinking('', ''));
  const md = R.toMarkdown(R.finish(c, { complete: true }), opts);
  assert.match(md, /> \*\*Thinking \(hidden in ChatGPT\):\*\* Checked timetables\n>\n> Line one\n> Line two/);
  assert.equal((md.match(/Thinking/g) || []).length, 1);
});

test('pasted text is inline in every mode, and linked in zip mode', () => {
  const c = sample();
  const f = R.addFile(c, R.fileRef({ kind: 'claude-attachment', id: 'p1', name: 'draft.txt', from: 'user' }));
  c.messages[0].blocks.push(R.block.file(f, 'The full draft text'));
  R.finish(c, { complete: true });
  const copy = R.toMarkdown(c, { ...opts, mode: 'copy' });
  assert.match(copy, /\*\*Pasted text: draft\.txt\*\*\n\n```text\nThe full draft text\n```/);
  const zip = R.toMarkdown(c, { ...opts, mode: 'zip', paths: { [f.key]: 'uploads/draft.txt' } });
  assert.match(zip, /Saved as \[draft\.txt\]\(<uploads\/draft\.txt>\)/);
});

test('files: a name line in copy mode, a link in zip mode, a reason when failed', () => {
  const c = sample();
  const img = R.addFile(c, R.fileRef({ kind: 'claude-file', id: 'i1', name: 'map (v2).png', mime: 'image/png' }));
  const pdf = R.addFile(c, R.fileRef({ kind: 'claude-file', id: 'd1', name: 'report.pdf' }));
  c.messages[0].blocks.push(R.block.image(img), R.block.file(pdf));
  R.finish(c, { complete: true });

  const copy = R.toMarkdown(c, { ...opts, mode: 'copy' });
  assert.match(copy, /\[Image: map \(v2\)\.png\]/);
  assert.match(copy, /- \*\*Files:\*\* 2 files in this chat\. Use Export to download them\./);

  c.completeness.files = { got: 1, failed: [{ key: pdf.key, name: 'report.pdf', reason: 'HTTP 403' }] };
  const zip = R.toMarkdown(c, { ...opts, mode: 'zip', paths: { [img.key]: 'uploads/map (v2).png' } });
  assert.match(zip, /!\[map \(v2\)\.png\]\(<uploads\/map \(v2\)\.png>\)/);
  assert.match(zip, /\[File: report\.pdf, could not be downloaded: HTTP 403\]/);
  assert.match(zip, /- \*\*Files:\*\* 1 of 2 downloaded\. 1 failed \(listed where they belong\)\./);
});

test('unsupported content, compaction summary, empty message placeholder', () => {
  const c = sample();
  c.messages[1].blocks.push(R.block.unsupported('audio', { transcript: 'spoken words' }));
  c.messages[1].blocks.push(R.block.summary('Earlier we planned the route.'));
  c.messages.push(R.createMessage('user'));
  const md = R.toMarkdown(R.finish(c, { complete: true }), opts);
  assert.match(md, /\[unsupported content: audio\]\n\n```text\nspoken words\n```/);
  assert.match(md, /> \*\*Compaction summary\*\* \(Claude compacted the chat here\)\n>\n> Earlier we planned the route\./);
  assert.match(md, /## 3\. You\n\n_\(empty message\)_/);
});

test('not-included and notes appear in the header', () => {
  const c = sample();
  c.completeness.notIncluded.push('Copilot sources and images.');
  c.completeness.notes.push('2 citation markers could not be matched.');
  const md = R.toMarkdown(R.finish(c, { complete: true }), opts);
  assert.match(md, /- \*\*Not included:\*\* Copilot sources and images\./);
  assert.match(md, /- \*\*Notes:\*\* 2 citation markers could not be matched\./);
});

test('link labels escape brackets', () => {
  const c = sample();
  R.addSource(c.messages[1], 'Title [with] brackets', 'https://x.y/(a b)');
  const md = R.toMarkdown(R.finish(c, { complete: true }), opts);
  assert.match(md, /2\. \[Title \\\[with\\\] brackets\]\(<https:\/\/x\.y\/\(a b\)>\)/);
});
