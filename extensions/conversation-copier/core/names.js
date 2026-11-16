// Recurate Copier: safe names for ZIP entries, downloads and Markdown links.
// Loads in a content script and in Node tests (registers on globalThis.Recurate).

(function () {
  'use strict';

  const MAX_BYTES = 100;
  const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

  function utf8Bytes(text) {
    return new TextEncoder().encode(text).length;
  }

  // Splits "report.final.pdf" into ["report.final", ".pdf"]. A dot with no
  // short, space-free extension after it is part of the stem.
  function splitExt(name) {
    const dot = name.lastIndexOf('.');
    if (dot <= 0) return [name, ''];
    const ext = name.slice(dot);
    return /^\.[^.\s]{1,10}$/.test(ext) ? [name.slice(0, dot), ext] : [name, ''];
  }

  // Shortens the stem, never splitting a character, until stem + ext fits.
  function capBytes(stem, ext) {
    const chars = Array.from(stem);
    while (chars.length > 1 && utf8Bytes(chars.join('') + ext) > MAX_BYTES) chars.pop();
    return chars.join('') + ext;
  }

  function cleanName(raw) {
    let name = String(raw ?? '').normalize('NFC');
    name = name.replace(/[\u0000-\u001f\u007f]/g, '');
    name = name.replace(/[\\/]/g, '_');
    name = name.replace(/[:*?"<>|]/g, '_');
    name = name.trim().replace(/[. ]+$/, '');
    name = name.replace(/^\.+/, m => '_'.repeat(m.length));
    if (!name) name = 'file';
    let [stem, ext] = splitExt(name);
    if (RESERVED.test(stem)) stem = '_' + stem;
    return capBytes(stem, ext);
  }

  // A name safe to extract on macOS, Windows and Linux, unique within its
  // folder. `used` is a Set of lowercased names already taken there.
  function safeName(raw, used = new Set()) {
    const base = cleanName(raw);
    let candidate = base;
    if (used.has(candidate.toLowerCase())) {
      const [stem, ext] = splitExt(base);
      for (let i = 2; ; i++) {
        candidate = capBytes(stem, `-${i}${ext}`);
        if (!used.has(candidate.toLowerCase())) break;
      }
    }
    used.add(candidate.toLowerCase());
    return candidate;
  }

  // Lowercase words joined by dashes, for download file names.
  function slugify(text, maxLength = 50) {
    return String(text ?? '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, maxLength)
      .replace(/^-|-$/g, '') || 'conversation';
  }

  globalThis.Recurate = Object.assign(globalThis.Recurate || {}, {
    safeName,
    slugify,
    utf8Bytes,
  });
})();
