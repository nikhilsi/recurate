// Loads Copier's plain content-script files into a fresh sandbox, in manifest
// order, and returns what they registered on globalThis.Recurate.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function load(files, extra = {}) {
  const sandbox = { console, TextEncoder, URL, URLSearchParams, Intl, Date, ...extra };
  vm.createContext(sandbox);
  for (const file of files) {
    vm.runInContext(readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
  }
  return sandbox.Recurate;
}

export const CORE = ['core/model.js', 'core/names.js', 'core/markdown.js'];
