import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load, CORE } from './load.mjs';

const R = load([...CORE, 'platforms/claude.js']);
const C = R.platforms.claude;
const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/claude-basic.json', import.meta.url), 'utf8'));
const at = new Date('2026-11-15T22:00:00Z');
const md = (conv, extra = {}) => R.toMarkdown(conv, { timeZone: 'UTC', ...extra });

test('conversationRef reads the chat id and rejects other pages', () => {
  assert.deepEqual({ ...C.conversationRef({ pathname: '/chat/11111111-1111-4111-8111-111111111111' }) }, { id: '11111111-1111-4111-8111-111111111111' });
  assert.equal(C.conversationRef({ pathname: '/recents' }), null);
  assert.equal(C.conversationRef({ pathname: '/project/abc' }), null);
});

test('active branch only, complete when the root is reached, turns merged', () => {
  const conv = C.parse(fixture(), { exportedAt: at });
  assert.equal(conv.completeness.messages.complete, true);
  // m1 user, m2+m3(folded)+m4 one assistant turn, m5 user, m6 assistant; m6b is off-branch.
  assert.deepEqual(Array.from(conv.messages, m => m.role), ['user', 'assistant', 'user', 'assistant']);
  assert.equal(conv.completeness.messages.got, 4);
  assert.ok(!md(conv).includes('Abandoned branch answer'));
});

test('a missing parent makes the export partial with a reason', () => {
  const data = fixture();
  data.chat_messages[0].parent_message_uuid = 'gone';
  const conv = C.parse(data, { exportedAt: at });
  assert.equal(conv.completeness.messages.complete, false);
  assert.match(R.describeMessages(conv), /may be partial \(a parent message is missing from the data\)/);
});

test('no leaf: the newest message branch is exported, with a note', () => {
  const data = fixture();
  delete data.current_leaf_message_uuid;
  const conv = C.parse(data, { exportedAt: at });
  assert.match(conv.completeness.notes.join(' '), /named no current message/);
  assert.match(md(conv), /Abandoned branch answer/);
});

test('no message list is a structural error', () => {
  assert.throws(() => C.parse({ uuid: 'x' }), e => e.name === 'StructuralError');
});

test('title, model note, user files and pasted text', () => {
  const out = md(C.parse(fixture(), { exportedAt: at }));
  assert.match(out, /^# Fixture: trip planning/);
  assert.match(out, /- \*\*Model:\*\* Model setting at export: claude-opus-5-5/);
  assert.match(out, /## 1\. You · 2026-11-15 14:02\n\n\[Image: map\.png\]\n\n\*\*Pasted text: draft notes\.txt\*\*\n\n```text\nLeave Monday, return Friday\.\n```\n\nPlan a train trip\./);
});

test('citations: code-point positions after an emoji, reading order, sources list', () => {
  const out = md(C.parse(fixture(), { exportedAt: at }));
  assert.match(out, /🚆 Trains run hourly via Basel\[1\] and take 7 hours\.\[2\]/);
  assert.match(out, /\*\*Sources\*\*\n\n1\. \[SBB timetable\]\(<https:\/\/sbb\.example\/a>\)\n2\. \[NS travel\]\(<https:\/\/ns\.example\/b>\)/);
});

test('citation markers move to the end of a word or code span', () => {
  const m = R.createMessage('assistant');
  assert.equal(C.insertCitations('run `npm test` now', [{ end_index: 8, url: 'u', title: 't' }], m), 'run `npm test`[1] now');
  const m2 = R.createMessage('assistant');
  assert.equal(C.insertCitations('Basel station', [{ end_index: 3, url: 'u', title: 't' }], m2), 'Basel[1] station');
});

test('thinking summary is kept and counted as summary-only', () => {
  const conv = C.parse(fixture(), { exportedAt: at });
  const out = md(conv);
  assert.match(out, /> \*\*Thinking:\*\* Checked timetables/);
  assert.match(conv.completeness.notes.join(' '), /1 thinking block is a summary only/);
});

test('tools: web results as links, folded result paired, no-result call flagged', () => {
  const out = md(C.parse(fixture(), { exportedAt: at }));
  assert.match(out, /<summary>Tool: web_search<\/summary>[\s\S]*?- \[SBB timetable\]\(<https:\/\/sbb\.example\/a>\)\n- \[NS travel\]/);
  assert.match(out, /<summary>Tool: bash_tool<\/summary>[\s\S]*?```text\nnotes\.txt\n```/);
  assert.match(out, /<summary>Tool: image_search<\/summary>[\s\S]*?\(no result recorded\)/);
});

test('artifact replay: create then update gives the final file, linked from the last change', () => {
  const conv = C.parse(fixture(), { exportedAt: at });
  const art = conv.files.find(f => f.kind === 'claude-artifact');
  assert.equal(art.name, 'Packing list.md');
  assert.equal(art.text, '- passport\n- charger\n- adapter');
  const out = md(conv, { mode: 'zip', paths: { [art.key]: 'artifacts/Packing list.md' } });
  const lastUpdate = out.lastIndexOf('<summary>Tool: artifacts</summary>');
  assert.ok(out.indexOf('[Packing list.md](<artifacts/Packing list.md>)') > lastUpdate);
});

test('an update whose old text is missing is noted, not silently applied', () => {
  const data = fixture();
  data.chat_messages[3].content[3].input.old_str = 'not there';
  const conv = C.parse(data, { exportedAt: at });
  assert.match(conv.completeness.notes.join(' '), /Packing list": 1 edit could not be applied/);
  assert.equal(conv.files.find(f => f.kind === 'claude-artifact').text, '- passport\n- charger');
});

test('unknown block types become named placeholders that keep their text', () => {
  const out = md(C.parse(fixture(), { exportedAt: at }));
  assert.match(out, /\[unsupported content: voice_note\]\n\n```text\n[\s\S]*spoken aside/);
});

test('assistant deliveries and compaction summary', () => {
  const conv = C.parse(fixture(), { exportedAt: at });
  const out = md(conv);
  assert.match(out, /\[File: itinerary\.md\]/);
  assert.match(out, /> \*\*Compaction summary\*\* \(Claude compacted the chat here\)\n>\n> Earlier: planned Lausanne to Amsterdam by train\./);
  assert.deepEqual(Array.from(conv.files, f => f.kind).sort(), ['claude-artifact', 'claude-attachment', 'claude-file', 'claude-file']);
});

test('older file list: files no message mentions are kept and listed', () => {
  const conv = C.parse(fixture(), { exportedAt: at, wiggleFiles: ['/mnt/user-data/uploads/map.png', '/mnt/user-data/outputs/route.pdf'] });
  const names = Array.from(conv.files, f => f.name);
  assert.ok(names.includes('route.pdf'));
  assert.equal(names.filter(n => n === 'map.png').length, 1);
  assert.match(md(conv), /## Other files\n\n- \[File: route\.pdf\]/);
});

test('fetch: the cookie org comes first; a 404 falls through to the next chat org', async () => {
  const calls = [];
  const data = fixture();
  const fetch = async path => {
    calls.push(path);
    if (path === '/api/organizations') return { ok: true, json: async () => [
      { uuid: 'org-api', capabilities: ['api'] },
      { uuid: 'org-team', capabilities: ['chat'] },
      { uuid: 'org-personal', capabilities: ['chat', 'claude_max'] },
    ] };
    if (path.includes('/organizations/org-team/chat_conversations/')) return { ok: false, status: 404 };
    if (path.includes('/organizations/org-personal/chat_conversations/')) return { ok: true, json: async () => data };
    if (path.includes('/wiggle/list-files')) return { ok: false, status: 404 };
    return { ok: false, status: 500 };
  };
  const document = { cookie: 'a=1; lastActiveOrg=org-team; b=2' };
  const S = load([...CORE, 'platforms/claude.js'], { fetch, document });
  const { conversation, ctx } = await S.platforms.claude.extract({ hostname: 'claude.ai', pathname: `/chat/${data.uuid}` });
  assert.equal(ctx.org, 'org-personal');
  assert.ok(calls[1].includes('/org-team/'), 'cookie org tried first');
  assert.ok(!calls.some(c => c.includes('org-api/chat_conversations')), 'API-only org never tried');
  assert.equal(conversation.messages.length, 4);
});

test('fetch: a 401 stops with a clear reason and nothing is exported', async () => {
  const fetch = async path => path === '/api/organizations'
    ? { ok: true, json: async () => [{ uuid: 'o1', capabilities: ['chat'] }] }
    : { ok: false, status: 401 };
  const S = load([...CORE, 'platforms/claude.js'], { fetch, document: { cookie: '' } });
  await assert.rejects(
    S.platforms.claude.extract({ hostname: 'claude.ai', pathname: '/chat/11111111-1111-4111-8111-111111111111' }),
    e => e.name === 'FetchError' && /HTTP 401/.test(e.message),
  );
});
