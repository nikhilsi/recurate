// Recurate Copier: Microsoft Copilot adapter (work and personal accounts).
// Copilot has no conversation data reachable from the page, so this
// adapter scrolls the chat and collects each message by its position
// label (spec section 4.5). parse() is pure: records in, Conversation out.

(function () {
  'use strict';

  const R = globalThis.Recurate;
  const PLATFORM = 'copilot';
  const SELECTOR = 'div.fai-UserMessage, div.fai-CopilotMessage';
  const STEP_CAP = 400;
  const TIME_CAP_MS = 180000;
  const WAIT_MS = 700;

  const HOSTS = /(^|\.)(m365\.cloud\.microsoft|copilot\.cloud\.microsoft|copilot\.com|copilot\.microsoft\.com)$/;

  function matches(location) {
    return HOSTS.test(location.hostname);
  }

  function conversationRef(location) {
    const m = location.pathname.match(/\/chat\/conversation\/([0-9a-f-]{36})(?:[/?#]|$)/i);
    return m ? { id: m[1] } : null;
  }

  // ---------- parse (pure) ----------

  const norm = s => String(s || '').replace(/\s+/g, ' ').trim();

  // collected: { records: [{ pos, setsize, role, html, text, citations, after }],
  // setsize, sizesSeen, stopReason }. opts.htmlToMarkdown converts answer HTML.
  function parse(collected, { url = null, title = null, htmlToMarkdown = null, exportedAt } = {}) {
    const records = collected && collected.records;
    if (!Array.isArray(records) || !records.length) {
      throw new R.StructuralError(PLATFORM, 'No Copilot messages were found on this page.');
    }
    const conv = R.createConversation({ platform: PLATFORM, title, url, exportedAt });
    const notes = conv.completeness.notes;

    // Labeled messages by position; unlabeled ones right after their neighbor.
    const ordered = records.slice().sort((a, b) => (a.pos ?? (a.after ?? 0) + 0.5) - (b.pos ?? (b.after ?? 0) + 0.5));
    ordered.forEach(r => {
      const msg = R.createMessage(r.role === 'user' ? 'user' : 'assistant');
      if (r.role === 'user') {
        if (r.text) msg.blocks.push(R.block.text(r.text));
      } else {
        const md = r.markdown || (htmlToMarkdown && r.html ? htmlToMarkdown(r.html) : r.text);
        if (md && md.trim()) msg.blocks.push(R.block.text(md.trim()));
        (r.citations || []).forEach(t => R.addSource(msg, t, null));
      }
      conv.messages.push(msg);
    });

    const expected = collected.setsize || null;
    const labeled = new Set(records.filter(r => r.pos).map(r => r.pos));
    const unlabeled = records.filter(r => !r.pos).length;
    let complete = false;
    let reason = null;
    if (!expected) {
      reason = 'Copilot did not report how many messages the chat has';
    } else {
      const missing = [];
      for (let p = 1; p <= expected; p++) if (!labeled.has(p)) missing.push(p);
      complete = missing.length === 0;
      if (!complete) reason = `${collected.stopReason || 'collection stopped'}; ${missing.length} of ${expected} positions were not reached`;
    }
    const sizes = (collected.sizesSeen || []).filter(Boolean);
    if (sizes.length > 1) notes.push(`Copilot's message total changed during collection (${sizes.join(', ')}); the largest was used.`);
    if (unlabeled) notes.push(`${unlabeled} message${unlabeled === 1 ? '' : 's'} carried no position label and ${unlabeled === 1 ? 'was' : 'were'} placed by ${unlabeled === 1 ? 'its' : 'their'} neighbors, on top of Copilot's total.`);
    if (conv.messages.some(m => m.sources.length)) notes.push('Copilot gives source titles without links.');
    conv.completeness.notIncluded.push('Copilot images and files.');

    // Copilot's total counts labeled messages only; unlabeled ones are on top.
    return R.finish(conv, { complete, reason, method: 'scroll', expected: expected ? expected + unlabeled : null });
  }

  // ---------- collect (browser) ----------

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function findScroller(el) {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 20) return n;
    }
    return document.scrollingElement || document.documentElement;
  }

  // Each message names a visually hidden heading ("You said:") through
  // aria-labelledby, alongside the message text itself. A label is stripped
  // from the front only when text remains after it, in any language.
  function stripLabels(text, labels) {
    let out = text;
    labels.forEach(l => { if (l && out.startsWith(l) && out.length > l.length) out = out.slice(l.length).trim(); });
    return out;
  }

  function withoutLabel(el, text) {
    const labels = (el.getAttribute('aria-labelledby') || '').split(/\s+/)
      .map(id => id && document.getElementById(id)).filter(Boolean)
      .map(n => (n.textContent || '').trim());
    return stripLabels(text, labels);
  }

  function readMessage(el, convert) {
    const role = el.classList.contains('fai-UserMessage') ? 'user' : 'assistant';
    const reply = role === 'assistant' ? (el.querySelector('[data-testid="markdown-reply"]') || el) : null;
    const raw = ((role === 'user' ? el.innerText || el.textContent : reply.innerText || reply.textContent) || '').trim();
    return {
      role,
      pos: parseInt(el.getAttribute('aria-posinset'), 10) || null,
      setsize: parseInt(el.getAttribute('aria-setsize'), 10) || null,
      html: reply ? reply.innerHTML : null,
      text: withoutLabel(el, raw),
      // Converted from the live element, so no HTML string is parsed.
      markdown: reply && convert ? safely(() => convert(reply)) : null,
      citations: reply
        ? [...new Set([...reply.querySelectorAll('button[aria-label^="Citation:"]')].map(b => b.getAttribute('aria-label').replace(/^Citation:\s*/, '').trim()).filter(Boolean))]
        : [],
    };
  }

  function safely(fn) {
    try { return fn(); } catch (e) { return null; }
  }

  // Scrolls the chat both ways and collects every message once.
  async function collect({ onProgress = () => {}, isCancelled = () => false, convert = null } = {}) {
    const first = document.querySelector(SELECTOR);
    if (!first) throw new R.FetchError(PLATFORM, 0, 'No Copilot messages were found on this page.');
    const scroller = findScroller(first);
    const startTop = scroller.scrollTop;
    const labeled = new Map();
    const unlabeled = [];
    const sizes = new Set();
    let setsize = 0;

    const grab = () => {
      const els = [...document.querySelectorAll(SELECTOR)];
      els.forEach((el, i) => {
        const r = readMessage(el, convert);
        if (r.setsize) { sizes.add(r.setsize); setsize = Math.max(setsize, r.setsize); }
        if (r.pos) { if (!labeled.has(r.pos)) labeled.set(r.pos, r); return; }
        let after = 0;
        for (let k = i - 1; k >= 0; k--) { const p = parseInt(els[k].getAttribute('aria-posinset'), 10); if (p) { after = p; break; } }
        const key = `${r.role}|${norm(r.text).slice(0, 200)}|${after}`;
        if (!unlabeled.some(u => u.key === key)) unlabeled.push({ ...r, key, after });
      });
    };
    const done = () => setsize > 0 && Array.from({ length: setsize }, (_, k) => k + 1).every(p => labeled.has(p));
    const step = dir => {
      scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: dir * 600, bubbles: true, cancelable: true }));
      scroller.scrollBy({ top: dir * Math.max(200, scroller.clientHeight * 0.8), behavior: 'instant' });
    };

    grab();
    const deadline = Date.now() + TIME_CAP_MS;
    let steps = 0;
    let stopReason = null;
    for (const dir of [-1, 1]) {
      let still = 0;
      while (!done() && steps < STEP_CAP) {
        if (isCancelled()) throw new R.FetchError(PLATFORM, 0, 'Cancelled.');
        while (document.hidden) { onProgress({ paused: true, got: labeled.size, total: setsize }); await sleep(500); }
        const before = scroller.scrollTop;
        step(dir);
        await sleep(WAIT_MS);
        grab();
        steps++;
        onProgress({ paused: false, got: labeled.size, total: setsize });
        const atEnd = dir < 0 ? scroller.scrollTop <= 0 : scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
        still = atEnd && Math.abs(scroller.scrollTop - before) < 2 ? still + 1 : 0;
        if (still >= 4) break;
        if (Date.now() > deadline) { stopReason = 'collection hit the time limit'; break; }
      }
      if (stopReason) break;
    }
    if (!done() && !stopReason) stopReason = steps >= STEP_CAP ? 'collection hit the step limit' : 'Copilot stopped loading messages at the ends of the chat';
    scroller.scrollTop = startTop;
    return { records: [...labeled.values(), ...unlabeled], setsize, sizesSeen: [...sizes], stopReason };
  }

  function converter() {
    const T = globalThis.TurndownService;
    if (!T) return null;
    const td = new T({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', hr: '---' });
    if (globalThis.turndownPluginGfm) td.use(globalThis.turndownPluginGfm.gfm);
    td.remove(['button', 'svg', 'script', 'style']);
    td.addRule('copierImage', {
      filter: 'img',
      replacement: (content, node) => (node.closest && node.closest('button') ? '' : `[Image: ${(node.getAttribute('alt') || 'image').trim()}]`),
    });
    return input => td.turndown(input);
  }

  function pageTitle() {
    const t = (document.title || '').replace(/\s*[-\u2013\u2014|]\s*Microsoft Copilot\s*$/i, '').trim();
    return t && !/^(chat|microsoft copilot)$/i.test(t) ? t : null;
  }

  async function extract(location, opts = {}) {
    const ref = conversationRef(location);
    if (!ref) throw new R.FetchError(PLATFORM, 0, 'This page is not a Copilot conversation.');
    const convert = converter();
    const collected = await collect({ ...opts, convert });
    const conversation = parse(collected, { url: location.href, title: pageTitle() });
    return { conversation, ctx: { id: ref.id } };
  }

  async function fetchFile() {
    throw new R.FetchError(PLATFORM, 0, 'Copilot files are not exported yet');
  }

  globalThis.Recurate = Object.assign(globalThis.Recurate || {}, {
    platforms: Object.assign((globalThis.Recurate && globalThis.Recurate.platforms) || {}, {
      copilot: { id: PLATFORM, matches, conversationRef, parse, extract, fetchFile, collect, stripLabels },
    }),
  });
})();
