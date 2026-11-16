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

test('a message file also in the older list falls back to it when its own address fails', async () => {
  const conv = C.parse(fixture(), { exportedAt: at, wiggleFiles: ['/mnt/user-data/uploads/map.png'] });
  const map = conv.files.find(f => f.name === 'map.png');
  assert.equal(map.altPath, '/mnt/user-data/uploads/map.png');
  const calls = [];
  const fetch = async path => { calls.push(path); return path.includes('/files/') ? { ok: false, status: 404 } : { ok: true, blob: async () => ({ size: 1234 }) }; };
  const S = load([...CORE, 'platforms/claude.js'], { fetch, Blob });
  const blob = await S.platforms.claude.fetchFile(map, { org: 'o', id: 'c' });
  assert.equal(blob.size, 1234);
  assert.ok(calls[1].includes('wiggle/download-file?path=%2Fmnt%2Fuser-data%2Fuploads%2Fmap.png'));
});

test('screen text: the version shown on screen is exported, with a note', () => {
  const conv = C.parse(fixture(), { exportedAt: at, screen: R.letters('Claude said: Abandoned branch answer.') });
  assert.match(md(conv), /Abandoned branch answer/);
  assert.ok(!md(conv).includes('change in Basel'));
  assert.match(conv.completeness.notes.join(' '), /branch shown on screen/);
  assert.equal(conv.completeness.messages.complete, true);
});

test('screen text that matches the data, or matches nothing, changes nothing', () => {
  const same = C.parse(fixture(), { exportedAt: at, screen: R.letters('Hourly trains, 7 hours, change in Basel.') });
  const none = C.parse(fixture(), { exportedAt: at, screen: R.letters('Something else entirely on the page') });
  [same, none].forEach(conv => {
    assert.match(md(conv), /change in Basel/);
    assert.ok(!conv.completeness.notes.join(' ').includes('branch shown on screen'));
  });
});

// --- breaker pass fixes ---

test('screen text: a stopped first try is not swapped in for the reply on screen', () => {
  const ROOT = '00000000-0000-4000-8000-000000000000';
  const FULL = 'Here are some options for your trip:\n\n1. Take the train\n2. Fly\n3. Drive';
  const data = {
    uuid: '22222222-2222-4222-8222-222222222222', name: 't', current_leaf_message_uuid: 'a2',
    chat_messages: [
      { uuid: 'u1', parent_message_uuid: ROOT, sender: 'human', created_at: '2026-11-15T10:00:00Z', content: [{ type: 'text', text: 'Give me trip options' }] },
      { uuid: 'a1', parent_message_uuid: 'u1', sender: 'assistant', created_at: '2026-11-15T10:00:05Z', content: [{ type: 'text', text: 'Here are some options for your trip:' }] },
      { uuid: 'a2', parent_message_uuid: 'u1', sender: 'assistant', created_at: '2026-11-15T10:01:00Z', content: [{ type: 'text', text: FULL }] },
    ],
  };
  const conv = C.parse(data, { exportedAt: at, screen: R.letters('Here are some options for your trip:\nTake the train\nFly\nDrive') });
  assert.match(md(conv), /3\. Drive/);
  assert.ok(!conv.completeness.notes.join(' ').includes('branch shown on screen'));
});

test('older file list: same name in uploads and outputs are two files; a fallback is never overwritten', () => {
  const conv = C.parse(fixture(), { exportedAt: at, wiggleFiles: ['/mnt/user-data/uploads/map.png', '/mnt/user-data/outputs/map.png'] });
  const maps = conv.files.filter(f => f.name === 'map.png');
  assert.equal(maps.length, 2);
  assert.equal(maps.find(f => f.kind === 'claude-file').altPath, '/mnt/user-data/uploads/map.png');
  assert.equal(maps.find(f => f.kind === 'claude-wiggle').id, '/mnt/user-data/outputs/map.png');
});

test('an attachment whose text was extracted from a binary file is saved with .txt', () => {
  const data = fixture();
  data.chat_messages[0].attachments.push({ id: 'att2', file_name: 'Q3 report.docx', file_size: 9, file_type: 'docx', extracted_content: 'Quarterly numbers.' });
  const files = C.parse(data, { exportedAt: at }).files;
  assert.equal(files.find(f => f.name === 'Q3 report.docx').saveName, 'Q3 report.docx.txt');
  assert.equal(files.find(f => f.name === 'draft notes.txt').saveName, 'draft notes.txt');
});

test('a last reply that was stopped or failed gets a note', () => {
  const data = fixture();
  data.chat_messages.find(m => m.uuid === 'm6').stop_reason = 'user_canceled';
  assert.match(C.parse(data, { exportedAt: at }).completeness.notes.join(' '), /last reply was stopped before it finished/);
  data.chat_messages.find(m => m.uuid === 'm6').stop_reason = 'end_turn';
  assert.ok(!C.parse(data, { exportedAt: at }).completeness.notes.join(' ').includes('last reply'));
});

test('a citation marker stays out of inline code on its line and out of fenced code', () => {
  const R2 = load([...CORE, 'platforms/claude.js']);
  const conv = R2.createConversation({ platform: 'claude' });
  const msg = R2.createMessage('assistant');
  conv.messages.push(msg);
  const prose = 'A lone ` mark here.\nRun it:\n```bash\nls\n```\nDone.';
  const out = R2.platforms.claude.insertCitations(prose, [{ end_index: Array.from('A lone ` mark here.\nRun').length, url: 'https://a.example', title: 'A' }], msg);
  assert.match(out, /\nRun\[1\] it:\n```bash\nls\n```/);
  // Inside a fenced block: to the end of the line before it, so no fence line changes.
  const inFence = R2.platforms.claude.insertCitations(prose, [{ end_index: Array.from('A lone ` mark here.\nRun it:\n```bash\nl').length, url: 'https://b.example', title: 'B' }], msg);
  assert.match(inFence, /\nRun it:\[\d\]\n```bash\nls\n```\nDone\./);
});

test('older file list: a 404 is no list; any other failure is noted', async () => {
  for (const [status, noted] of [[404, false], [500, true]]) {
    const data = fixture();
    const fetch = async path => {
      if (path === '/api/organizations') return { ok: true, json: async () => [{ uuid: 'org', capabilities: ['chat'] }] };
      if (path.includes('/chat_conversations/')) return { ok: true, json: async () => data };
      if (path.includes('/wiggle/list-files')) return { ok: false, status };
      return { ok: false, status: 500 };
    };
    const S = load([...CORE, 'platforms/claude.js'], { fetch, document: { cookie: 'lastActiveOrg=org' } });
    const { conversation } = await S.platforms.claude.extract({ hostname: 'claude.ai', pathname: `/chat/${data.uuid}` });
    assert.equal(/older file list could not be read \(HTTP 500\)/.test(conversation.completeness.notes.join(' ')), noted);
  }
});

test('markers: one-line inline code is not a fence; a marker at a closing fence goes after it', () => {
  const R2 = load([...CORE, 'platforms/claude.js']);
  const msg = R2.createMessage('assistant');
  const ins = (text, before) => R2.platforms.claude.insertCitations(text, [{ end_index: Array.from(before).length, url: 'https://a.example', title: 'A' }], msg);
  const t1 = '```x``` is shown.\nParis is the capital. More text follows here.';
  assert.equal(ins(t1, '```x``` is shown.\nParis is the capital'), '```x``` is shown.\nParis is the capital[1]. More text follows here.');
  const t2 = 'Intro\n```\ncode line\n```\nMore text\n```python\nx=1\n```';
  assert.equal(ins(t2, 'Intro\n```\ncode line\n'), 'Intro[1]\n```\ncode line\n```\nMore text\n```python\nx=1\n```');
  // A fence opened on a list-marker line, and a tilde block holding a backtick line.
  const t3 = '1. ```bash\n   npm i\n   ```\n2. Paris is the capital. More.';
  assert.equal(ins(t3, '1. ```bash\n   npm i\n   ```\n2. Paris is the capital'), '1. ```bash\n   npm i\n   ```\n2. Paris is the capital[1]. More.');
  const t4 = '~~~\n```\n~~~\nParis is the capital. More.';
  assert.equal(ins(t4, '~~~\n```\n~~~\nParis is the capital'), '~~~\n```\n~~~\nParis is the capital[1]. More.');
  // A reply that is one code block: the marker goes on a new last line.
  assert.equal(ins('```\nx = 1\n```', '```\nx'), '```\nx = 1\n```\n[1]');
});

test('an upload with its own sandbox path falls back to it, and the older list entry for that path is the same file', async () => {
  const data = fixture();
  const f = data.chat_messages[0].files[0];
  f.file_name = 'Trip map v2.png';
  f.path = '/mnt/user-data/uploads/Trip_map_v2.png';
  const conv = C.parse(data, { exportedAt: at, wiggleFiles: ['/mnt/user-data/uploads/Trip_map_v2.png', '/mnt/user-data/outputs/route.pdf'] });
  const map = conv.files.find(x => x.name === 'Trip map v2.png');
  assert.equal(map.altPath, '/mnt/user-data/uploads/Trip_map_v2.png');
  assert.ok(!conv.files.some(x => x.kind === 'claude-wiggle' && x.id.endsWith('Trip_map_v2.png')), 'not listed twice');
  assert.ok(conv.files.some(x => x.name === 'route.pdf'));
  const calls = [];
  const fetch = async p => { calls.push(p); return p.includes('/files/') ? { ok: false, status: 404 } : { ok: true, blob: async () => ({ size: 1234 }) }; };
  const S = load([...CORE, 'platforms/claude.js'], { fetch, Blob });
  assert.equal((await S.platforms.claude.fetchFile(map, { org: 'o', id: 'c' })).size, 1234);
  assert.ok(calls[1].includes('path=%2Fmnt%2Fuser-data%2Fuploads%2FTrip_map_v2.png'));
});

test('file fallback: used only when it works, and never a copy of another size', async () => {
  const ref = { kind: 'claude-file', id: 'u1', name: 'notes.docx', size: 100, altPath: '/mnt/user-data/uploads/notes.docx' };
  const run = async (first, alt, size = 100) => {
    const fetch = async p => (p.includes('/files/') ? first : alt.status === 200 ? { ok: true, status: 200, blob: async () => ({ size }) } : { ok: false, status: alt.status });
    const S = load([...CORE, 'platforms/claude.js'], { fetch, Blob });
    return S.platforms.claude.fetchFile(ref, { org: 'o', id: 'c' });
  };
  await assert.rejects(run({ ok: false, status: 503 }, { status: 404 }), e => e.status === 503 && !e.final);
  await assert.rejects(run({ ok: false, status: 404 }, { status: 200 }, 250), e => e.final === true && /different version/.test(e.message));
  assert.equal((await run({ ok: false, status: 404 }, { status: 200 })).size, 100);
});
