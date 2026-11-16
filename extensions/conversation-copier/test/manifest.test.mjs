import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
const popup = readFileSync(new URL('popup/popup.js', root), 'utf8');

test('the popup injects exactly the files the manifest declares, in the same order', () => {
  const list = JSON.parse(popup.match(/const CONTENT_FILES = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
  assert.deepEqual(list, manifest.content_scripts[0].js);
});

test('every declared file exists', () => {
  manifest.content_scripts[0].js.forEach(f => assert.ok(existsSync(new URL(f, root)), f));
  assert.ok(existsSync(new URL(manifest.action.default_popup, root)));
});

test('no host is added beyond 0.4.0, and no permission beyond activeTab and scripting', () => {
  const old = ['claude.ai', 'chatgpt.com', 'chat.openai.com', 'grok.com', 'gemini.google.com', 'www.google.com', 'copilot.microsoft.com', 'm365.cloud.microsoft'];
  manifest.content_scripts[0].matches.forEach(m => assert.ok(old.includes(new URL(m.replace('*', '')).hostname), m));
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting']);
  assert.equal(manifest.host_permissions, undefined);
  assert.ok(manifest.description.length <= 132);
});
