// content.js run control: Cancel, one run at a time, file retries.
// Loads the real content.js with a fake adapter and a small fake DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));

function setup({ files = [], fetchFile } = {}) {
  const saved = [];
  const el = tag => ({
    tagName: tag, style: {}, children: [], classList: { add() {} },
    appendChild(c) { this.children.push(c); return c; }, append(...cs) { cs.forEach(c => this.appendChild(c)); },
    remove() {}, addEventListener() {}, setAttribute() {}, removeAttribute() {},
    querySelector: () => null, querySelectorAll: () => [], click() { saved.push(this.download); },
  });
  let release;
  const gate = new Promise(r => { release = r; });
  let listener = null;
  const sandbox = {
    console, TextEncoder, URLSearchParams, Intl, Date, Blob, setTimeout, clearInterval,
    // content.js polls for its buttons forever; unref lets the test process exit.
    setInterval: (f, ms) => { const t = setInterval(f, ms); t.unref(); return t; },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    matchMedia: () => ({ matches: false }),
    location: { hostname: 'fake.test', pathname: '/c/1' },
    navigator: { clipboard: { writeText: async () => {} } },
    document: { getElementById: () => null, createElement: el, querySelectorAll: () => [], body: el('body'), documentElement: el('html') },
    chrome: { runtime: { onConnect: { addListener: f => { listener = f; } } } },
    JSZip: class { folder() { return { file() {} }; } async generateAsync() { await sandbox.__zipGate; return new Blob(['zip']); } },
    __gate: gate, __zipGate: Promise.resolve(), __files: files, __fetchFile: fetchFile || (async () => new Blob(['x'])),
  };
  vm.createContext(sandbox);
  for (const f of ['core/model.js', 'core/names.js', 'core/markdown.js']) vm.runInContext(readFileSync(path.join(root, f), 'utf8'), sandbox);
  vm.runInContext(`
    Recurate.platforms = { fake: {
      id: 'fake', matches: () => true, conversationRef: () => ({ id: '1' }),
      extract: async () => {
        await globalThis.__gate;
        const c = Recurate.createConversation({ platform: 'claude', title: 't' });
        const m = Recurate.createMessage('user'); m.blocks.push(Recurate.block.text('hello there friend')); c.messages.push(m);
        globalThis.__files.forEach(f => Recurate.addFile(c, Recurate.fileRef(f)));
        return { conversation: Recurate.finish(c, { complete: true }), ctx: {} };
      },
      fetchFile: (...a) => globalThis.__fetchFile(...a),
    } };`, sandbox);
  vm.runInContext(readFileSync(path.join(root, 'content.js'), 'utf8'), sandbox);
  const posted = [];
  const handlers = [];
  listener({ name: 'recurate-copier', postMessage: m => posted.push(m), onDisconnect: { addListener() {} }, onMessage: { addListener: f => handlers.push(f) } });
  return { saved, posted, release, sandbox, send: m => handlers.forEach(f => f(m)) };
}

test('popup Copy: Cancel while reading sends no result, so nothing reaches the clipboard', async () => {
  const h = setup();
  h.send({ type: 'run', action: 'copy' });
  h.send({ type: 'cancel' });
  h.release();
  await tick(300);
  assert.equal(h.posted.filter(m => m.type === 'result').length, 0);
});

test('popup Export: Cancel while the ZIP is built saves nothing', async () => {
  const h = setup();
  let zipDone;
  h.sandbox.__zipGate = new Promise(r => { zipDone = r; });
  h.send({ type: 'run', action: 'export' });
  h.release();
  await tick();
  h.send({ type: 'cancel' });
  zipDone();
  await tick(300);
  assert.equal(h.saved.length, 0);
  assert.equal(h.posted.filter(m => m.type === 'result').length, 0);
});

test('a stalled file download ends on Cancel', async () => {
  const h = setup({ files: [{ kind: 'x', id: 'a', name: 'a.png', from: 'user' }], fetchFile: () => new Promise(() => {}) });
  h.send({ type: 'run', action: 'export' });
  h.release();
  await tick();
  h.send({ type: 'cancel' });
  await tick(400);
  assert.equal(h.saved.length, 0);
  h.send({ type: 'run', action: 'download' }); // within a second of Cancel: still held
  await tick();
  assert.equal(h.saved.length, 0);
  assert.match(h.posted.filter(m => m.type === 'result').pop().error, /already working/);
  await tick(900);
  h.send({ type: 'run', action: 'download' }); // then released
  await tick();
  assert.equal(h.saved.length, 1);
});

test('one run at a time: a second run is turned away until the first ends', async () => {
  const h = setup();
  h.send({ type: 'run', action: 'download' });
  h.send({ type: 'run', action: 'download' });
  h.release();
  await tick();
  assert.equal(h.saved.length, 1);
  assert.match(h.posted.find(m => m.type === 'result' && !m.ok).error, /already working/);
  h.send({ type: 'run', action: 'download' });
  await tick();
  assert.equal(h.saved.length, 2);
});

test('file retries: a network error is retried once, a final error and a 4xx are not', async () => {
  const calls = {};
  const fetchFile = async f => {
    calls[f.id] = (calls[f.id] || 0) + 1;
    if (f.id === 'net' && calls[f.id] === 1) throw new Error('Failed to fetch');
    if (f.id === 'final') throw Object.assign(new Error('blocked'), { status: 0, final: true });
    if (f.id === 'refused') throw Object.assign(new Error('HTTP 403'), { status: 403 });
    return new Blob(['x']);
  };
  const files = ['net', 'final', 'refused'].map(id => ({ kind: 'x', id, name: `${id}.png`, from: 'user' }));
  const h = setup({ files, fetchFile });
  h.send({ type: 'run', action: 'export' });
  h.release();
  await tick(1500);
  assert.deepEqual({ ...calls }, { net: 2, final: 1, refused: 1 });
  assert.match(h.posted.find(m => m.type === 'result').summary, /files 1 of 3 \(2 failed\)/);
});
