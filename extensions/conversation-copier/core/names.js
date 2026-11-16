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

  const MIME_EXT = {
    'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg',
    'application/pdf': '.pdf', 'text/plain': '.txt', 'text/markdown': '.md', 'text/html': '.html', 'text/csv': '.csv',
    'application/json': '.json', 'application/zip': '.zip',
  };

  // The first bytes of common formats, for files that arrive without a type.
  function sniff(head) {
    const b = head || [];
    const starts = sig => sig.every((v, i) => b[i] === v);
    if (starts([0x89, 0x50, 0x4e, 0x47])) return '.png';
    if (starts([0xff, 0xd8, 0xff])) return '.jpg';
    if (starts([0x47, 0x49, 0x46, 0x38])) return '.gif';
    if (starts([0x52, 0x49, 0x46, 0x46]) && b[8] === 0x57 && b[9] === 0x45) return '.webp';
    if (starts([0x25, 0x50, 0x44, 0x46])) return '.pdf';
    if (starts([0x50, 0x4b, 0x03, 0x04])) return '.zip';
    return '';
  }

  // Adds an extension when the name has none, from the MIME type or the
  // file's first bytes. A name that already has one is left alone.
  function ensureExtension(name, mime, head) {
    const base = String(name || 'file');
    if (splitExt(base)[1]) return base;
    const type = String(mime || '').split(';')[0].trim().toLowerCase();
    return base + (MIME_EXT[type] || sniff(head));
  }

  // recurate-claude-trip-planning-2026-11-15-1402, in the reader's time zone.
  function exportBaseName(platform, title, date = new Date(), timeZone) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).map(x => [x.type, x.value]));
    return `recurate-${platform}-${slugify(title)}-${p.year}-${p.month}-${p.day}-${p.hour}${p.minute}`;
  }

  globalThis.Recurate = Object.assign(globalThis.Recurate || {}, {
    safeName,
    slugify,
    utf8Bytes,
    ensureExtension,
    exportBaseName,
  });
})();
