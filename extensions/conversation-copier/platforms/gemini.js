// Recurate Copier: Gemini adapter.
// Reads Gemini's own conversation data through its batchexecute call
// (spec section 4.4), never the page. The data is positional arrays.
// parse() is pure: turns in, Conversation out. The fetch steps run in the page.

(function () {
  'use strict';

  const R = globalThis.Recurate;
  const PLATFORM = 'gemini';
  const PAGE_SIZE = 100;
  const PAGE_CAP = 50;
  const IMAGE_HOST = /^https:\/\/lh\d\.googleusercontent\.com\//;

  function matches(location) {
    return location.hostname === 'gemini.google.com';
  }

  // /app/{id}, /u/{n}/app/{id}, /gem/{gem}/{id}, /u/{n}/gem/{gem}/{id}.
  function conversationRef(location) {
    const m = location.pathname.match(/^(\/u\/\d+)?\/(?:app|gem\/[^/]+)\/([0-9a-f]{12,})(?:[/?#]|$)/i);
    return m ? { id: m[2], prefix: m[1] || '' } : null;
  }

  // ---------- parse (pure) ----------

  const at = (v, ...path) => path.reduce((x, i) => (Array.isArray(x) ? x[i] : undefined), v);
  const str = v => (typeof v === 'string' ? v : '');
  const pre = (v, s) => typeof v === 'string' && v.startsWith(s);

  // Turns arrive newest first. Each must carry the ids this adapter anchors on.
  function checkShape(t) {
    return pre(at(t, 0, 0), 'c_') && pre(at(t, 0, 1), 'r_') && pre(at(t, 3, 0, 0, 0), 'rc_') && typeof at(t, 4, 0) === 'number';
  }

  function deepStrings(v, out = [], d = 0) {
    if (d > 14 || v === null || v === undefined) return out;
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(x => deepStrings(x, out, d + 1));
    return out;
  }

  // Image references anywhere in a value: a googleusercontent URL plus the
  // nearest file-like name and MIME type in the same entry.
  function imagesIn(value) {
    const found = [];
    const walk = (v, d = 0) => {
      if (d > 14 || !Array.isArray(v)) return;
      const urls = v.filter(x => typeof x === 'string' && IMAGE_HOST.test(x));
      if (urls.length) {
        const strings = v.filter(x => typeof x === 'string' && !/^https?:/.test(x));
        const name = strings.find(s => /^[^\s/]{1,120}\.[a-z0-9]{2,5}$/i.test(s)) || null;
        const mime = strings.find(s => /^[a-z]+\/[a-z0-9.+-]+$/i.test(s)) || 'image/*';
        urls.forEach(u => found.push({ url: u, name, mime }));
        return;
      }
      v.forEach(x => walk(x, d + 1));
    };
    walk(value);
    return found;
  }

  function insertAfter(text, snippet, marker) {
    if (!snippet) return null;
    const i = text.indexOf(snippet);
    return i === -1 ? null : text.slice(0, i + snippet.length) + marker + text.slice(i + snippet.length);
  }

  // turns: every turn from every page, newest first. opts.pagesComplete: the
  // last page came back with no cursor.
  function parse(turns, { url = null, title = null, pagesComplete = true, pagesReason = null, exportedAt } = {}) {
    if (!Array.isArray(turns)) throw new R.StructuralError(PLATFORM, "Gemini's data has no turn list");
    if (!turns.length) throw new R.StructuralError(PLATFORM, "Gemini's data has no turns");
    const bad = turns.findIndex(t => !checkShape(t));
    if (bad !== -1) throw new R.StructuralError(PLATFORM, "Gemini's data is not in the shape Copier expects (its format may have changed)");

    // Dedupe by response id, then oldest first.
    const seen = new Set();
    const ordered = turns.filter(t => { const id = at(t, 0, 1); if (seen.has(id)) return false; seen.add(id); return true; }).reverse();

    const conv = R.createConversation({ platform: PLATFORM, id: str(at(ordered[0], 0, 0)).replace(/^c_/, '') || null, title, url, exportedAt });
    const notes = conv.completeness.notes;

    // Parent links: each turn points at the one before it; the first has none.
    let broken = 0;
    ordered.forEach((t, i) => {
      const parent = at(t, 1);
      if (i === 0) { if (parent && str(at(parent, 1))) broken++; return; }
      const prev = ordered[i - 1];
      if (at(parent, 1) !== at(prev, 0, 1) || at(parent, 2) !== at(prev, 3, 0, 0, 0)) broken++;
    });
    let complete = true;
    let reason = null;
    if (!pagesComplete) { complete = false; reason = pagesReason || 'not every page of the conversation could be read'; }
    else if (broken) { complete = false; reason = `${broken} turn link${broken === 1 ? '' : 's'} did not match, so a turn may be missing`; }

    const blocked = new Set(); // distinct images; one can appear in several turns
    let unplaced = 0;
    const models = [];
    ordered.forEach((t, ti) => {
      const time = new Date(at(t, 4, 0) * 1000).toISOString();

      // You.
      const user = R.createMessage('user', { createdAt: time });
      imagesIn(at(t, 2, 0, 4)).forEach((img, i) => {
        const ref = R.addFile(conv, R.fileRef({ kind: 'gemini-image', id: img.url, name: img.name || `image-${ti + 1}-${i + 1}`, mime: img.mime, from: 'user' }));
        user.blocks.push(R.block.image(ref));
        blocked.add(ref.key);
      });
      const question = str(at(t, 2, 0, 0));
      if (question) user.blocks.push(R.block.text(question));
      conv.messages.push(user);

      // Gemini.
      // The chosen draft: t[3][3] names it (equal to the first candidate on
      // 21 of 21 turns checked live); the first candidate is the fallback.
      const chosen = str(at(t, 3, 3));
      const drafts = Array.isArray(at(t, 3, 0)) ? at(t, 3, 0) : [];
      const cand = drafts.find(c => Array.isArray(c) && chosen && c[0] === chosen) || at(t, 3, 0, 0) || [];
      const model = str(at(t, 3, 21)) || null;
      if (model && !models.includes(model)) models.push(model);
      const reply = R.createMessage('assistant', { createdAt: time, model });

      const thinking = str(at(cand, 37, 0, 0));
      if (thinking) reply.blocks.push(R.block.thinking('', thinking));
      // Web pages Gemini read while thinking: [favicon, url, title, ...].
      (at(cand, 37, 1) || []).forEach(section => {
        (at(section, 7) || []).forEach(item => {
          const link = at(item, 1);
          if (typeof link === 'string' && /^https?:/.test(link)) R.addSource(reply, str(at(item, 2)) || link, link);
        });
      });

      let text = deepStrings(at(cand, 1)).join('\n\n');
      // Inline citations: [[cited text, start, end, ...], [...], [[url, title, ...], ...]].
      // The marker goes after the cited text, found by search, so the
      // offsets' units do not matter.
      (at(cand, 2, 1) || []).forEach(c => {
        const sources = (at(c, 2) || []).filter(s => Array.isArray(s) && typeof s[0] === 'string' && /^https?:/.test(s[0]));
        if (!sources.length) return;
        const marker = [...new Set(sources.map(s => R.addSource(reply, str(s[1]) || s[0], s[0])))].map(n => `[${n}]`).join('');
        const placed = insertAfter(text, str(at(c, 0, 0)), marker);
        if (placed !== null) text = placed;
        else unplaced++;
      });
      // Source list entries: [null, null, [url, ..., title at 21], n].
      (at(cand, 2, 0) || []).forEach(c => {
        const entry = at(c, 2);
        const link = at(entry, 0);
        if (typeof link === 'string' && /^https?:/.test(link)) R.addSource(reply, str(at(entry, 21)) || link, link);
      });
      if (text.trim()) reply.blocks.push(R.block.text(text));

      // Images in the answer (generated or shown), outside text and sources.
      cand.forEach((slot, i) => {
        if (i === 1 || i === 2 || i === 37) return;
        imagesIn(slot).forEach((img, k) => {
          const ref = R.addFile(conv, R.fileRef({ kind: 'gemini-image', id: img.url, name: img.name || `gemini-image-${ti + 1}-${k + 1}`, mime: img.mime, from: 'assistant' }));
          reply.blocks.push(R.block.image(ref));
          blocked.add(ref.key);
        });
      });
      conv.messages.push(reply);
    });

    if (models.length) conv.modelNote = `Models: ${models.join(', ')}`;
    if (unplaced) notes.push(`${unplaced} citation${unplaced === 1 ? '' : 's'} could not be placed in the text; ${unplaced === 1 ? 'its source is' : 'their sources are'} still listed.`);
    if (blocked.size) conv.completeness.notIncluded.push(`${blocked.size} image${blocked.size === 1 ? '' : 's'} (Gemini's image server does not allow downloads from the page; each is listed by name).`);
    return R.finish(conv, { complete, reason, noTotal: true });
  }

  // ---------- fetch (browser) ----------

  function pageParams() {
    const scripts = [...document.querySelectorAll('script:not([src])')].map(s => s.textContent || '');
    const find = key => {
      for (const t of scripts) {
        const m = t.match(new RegExp(`"${key}":"([^"]+)"`));
        if (m) return m[1];
      }
      return null;
    };
    const p = { at: find('SNlM0e'), bl: find('cfb2h'), sid: find('FdrFJe') };
    if (!p.at || !p.bl || !p.sid) throw new R.FetchError(PLATFORM, 0, "Could not find Gemini's request details on this page. Reload the page and try again.");
    return p;
  }

  async function loadPage(p, ref, cursor) {
    const qs = new URLSearchParams({
      rpcids: 'hNvQHb', 'source-path': location.pathname, bl: p.bl, 'f.sid': p.sid, hl: 'en',
      _reqid: String(100000 + Math.floor(Math.random() * 800000)), rt: 'c',
    });
    const inner = JSON.stringify(['c_' + ref.id, PAGE_SIZE, cursor || null, 1, [0], [4, 12], null, 1]);
    const body = new URLSearchParams({ 'f.req': JSON.stringify([[['hNvQHb', inner, null, 'generic']]]), at: p.at });
    const r = await fetch(`${ref.prefix}/_/BardChatUi/data/batchexecute?${qs}`, {
      method: 'POST', credentials: 'include', headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body,
    });
    if (r.status === 401 || r.status === 403) throw new R.FetchError(PLATFORM, r.status, `Gemini refused the request (HTTP ${r.status}). Reload the page and try again.`);
    if (!r.ok) throw new R.FetchError(PLATFORM, r.status, `Could not read Gemini's conversation data: HTTP ${r.status}.`);
    const line = (await r.text()).split('\n').find(l => l.startsWith('[["wrb.fr"'));
    if (!line) throw new R.StructuralError(PLATFORM, "Gemini's reply was not in the shape Copier expects");
    const payload = JSON.parse(line)[0][2];
    if (!payload) throw new R.FetchError(PLATFORM, 0, 'Gemini returned no data for this conversation.');
    return JSON.parse(payload);
  }

  function pageTitle() {
    const t = (document.title || '').replace(/\s*[-\u2013\u2014|]\s*Google Gemini\s*$/i, '').trim();
    return t && t !== 'Google Gemini' && t !== 'Gemini' ? t : null;
  }

  async function extract(location) {
    const ref = conversationRef(location);
    if (!ref) throw new R.FetchError(PLATFORM, 0, 'This page is not a Gemini conversation.');
    const p = pageParams();
    const turns = [];
    const cursors = new Set();
    let cursor = null;
    let pagesComplete = false;
    let pagesReason = 'Gemini kept offering older pages past the page limit';
    for (let i = 0; i < PAGE_CAP; i++) {
      const d = await loadPage(p, ref, cursor);
      const page = d[0] || [];
      turns.push(...page);
      const next = d[1];
      if (!next || !page.length) { pagesComplete = true; break; }
      if (cursors.has(next)) { pagesReason = 'Gemini repeated a page cursor, so older turns may be missing'; break; }
      cursors.add(next);
      cursor = next;
    }
    const conversation = parse(turns, { url: `https://gemini.google.com${ref.prefix}/app/${ref.id}`, title: pageTitle(), pagesComplete, pagesReason });
    return { conversation, ctx: { id: ref.id } };
  }

  // Gemini's image server sends no CORS header to the page, so a download
  // from the content script fails. The reason goes into the export.
  async function fetchFile(file) {
    try {
      const r = await fetch(file.id);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.blob();
    } catch (e) {
      const err = new R.FetchError(PLATFORM, 0, "Gemini's image server does not allow downloads from the page");
      err.final = true; // a retry cannot help
      throw err;
    }
  }

  globalThis.Recurate = Object.assign(globalThis.Recurate || {}, {
    platforms: Object.assign((globalThis.Recurate && globalThis.Recurate.platforms) || {}, {
      gemini: { id: PLATFORM, matches, conversationRef, parse, extract, fetchFile, checkShape },
    }),
  });
})();
