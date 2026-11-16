// content.js page buttons: the busy note's "Cancel it" and the hold after a
// Cancel. A small fake DOM; the floating cluster holds Copy, Download, Export.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));

function setup() {
  const all = n => n.children.flatMap(c => [c, ...all(c)]);
  function mk(tag) {
    return {
      tagName: tag, style: {}, children: [], parent: null, listeners: {}, id: '', textContent: '', classList: { add() {} },
      appendChild(c) { c.parent = this; this.children.push(c); return c; },
      append(...cs) { cs.forEach(c => this.appendChild(c)); },
      remove() { if (this.parent) { this.parent.children = this.parent.children.filter(x => x !== this); this.parent = null; } },
      addEventListener(t, f) { (this.listeners[t] ||= []).push(f); },
      click() { (this.listeners.click || []).forEach(f => f({ preventDefault() {}, stopPropagation() {} })); },
      setAttribute() {}, removeAttribute() {}, querySelector: () => null,
      querySelectorAll(sel) { return sel === 'button' ? all(this).filter(e => e.tagName === 'button') : []; },
      set innerHTML(v) {}, get firstElementChild() { return mk('svg'); },
    };
  }
  const body = mk('body');
  const byId = id => all(body).find(e => e.id === id) || null;
  let release;
  const sandbox = {
    console, TextEncoder, URLSearchParams, Intl, Date, Blob, setTimeout, clearInterval,
    setInterval: (f, ms) => { const t = setInterval(f, ms); t.unref(); return t; },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    matchMedia: () => ({ matches: false }),
    location: { hostname: 'fake.test', pathname: '/c/1' },
    navigator: { clipboard: { writeText: async () => {} } },
    document: { getElementById: byId, createElement: mk, querySelectorAll: () => [], body, documentElement: mk('html') },
    chrome: { runtime: { onConnect: { addListener() {} } } },
    JSZip: class { folder() { return { file() {} }; } async generateAsync() { return new Blob(['zip']); } },
    __gate: new Promise(r => { release = r; }),
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
        return { conversation: Recurate.finish(c, { complete: true }), ctx: {} };
      },
      fetchFile: async () => new Blob(['x']),
    } };`, sandbox);
  vm.runInContext(readFileSync(path.join(root, 'content.js'), 'utf8'), sandbox);
  const [copyBtn, , exportBtn] = byId('rc-copier-floating').children;
  const toastText = () => { const t = byId('rc-copier-toast'); return t && t.children[0].textContent; };
  const toastButton = () => { const t = byId('rc-copier-toast'); return t && t.children.find(c => c.tagName === 'button'); };
  return { byId, copyBtn, exportBtn, toastText, toastButton, release };
}

test('"Cancel it" on the busy note stops the run and closes its progress window', async () => {
  const h = setup();
  h.exportBtn.click();
  await tick();
  assert.ok(h.byId('rc-copier-modal'));
  h.exportBtn.click();
  assert.equal(h.toastButton().textContent, 'Cancel it');
  h.toastButton().click();
  assert.equal(h.toastText(), 'Cancelled');
  await tick(400);
  assert.equal(h.byId('rc-copier-modal'), null);
});

test('during the hold after a Cancel, the busy note offers nothing to cancel', async () => {
  const h = setup();
  h.copyBtn.click();
  await tick();
  assert.equal(h.toastButton().textContent, 'Cancel');
  h.toastButton().click();
  await tick(300);
  h.copyBtn.click();
  assert.match(h.toastText(), /already working/);
  assert.equal(h.toastButton(), undefined);
});
