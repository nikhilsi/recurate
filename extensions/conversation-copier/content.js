// Recurate Copier: extension plumbing.
// Picks the platform adapter for this page, shows the buttons on
// conversation pages, runs Copy, Download and Export, and answers the
// toolbar popup (spec sections 3.4 and 3.6 to 3.8).
// Loads last, after lib/, core/ and platforms/ (manifest order).

(function () {
  'use strict';

  // The popup may inject this file into a tab that already has it.
  if (globalThis.__recurateCopierLoaded) return;
  globalThis.__recurateCopierLoaded = true;

  const R = globalThis.Recurate;
  const PORT_NAME = 'recurate-copier';

  const COPY_SVG = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6 2a2 2 0 0 0-2 2v1H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6zm8 10a1 1 0 0 1-1 1H5V7a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v5zM3 6h1v7a2 2 0 0 0 2 2h6v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/></svg>';
  const DOWNLOAD_SVG = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a.5.5 0 0 1 .5.5v9.793l2.646-2.647a.5.5 0 0 1 .708.708l-3.5 3.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 0 1 .708-.708L9.5 12.293V2.5A.5.5 0 0 1 10 2zM4 14.5a.5.5 0 0 1 1 0v1a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 1 1 0v1a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 15.5v-1z"/></svg>';
  const EXPORT_SVG = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M2 4a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm7.5 2a.5.5 0 0 0-.5.5v5.793l-1.646-1.647a.5.5 0 0 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l2.5-2.5a.5.5 0 0 0-.708-.708L10 12.293V6.5a.5.5 0 0 0-.5-.5z"/></svg>';

  const ACTIONS = [
    { mode: 'copy', icon: COPY_SVG, label: 'Copy conversation (Markdown)' },
    { mode: 'download', icon: DOWNLOAD_SVG, label: 'Download conversation (Markdown file)' },
    { mode: 'export', icon: EXPORT_SVG, label: 'Export conversation with files (ZIP)' },
  ];

  const adapter = () => Object.values(R.platforms || {}).find(p => p.matches(location));
  const onConversation = () => {
    const a = adapter();
    return Boolean(a && a.conversationRef(location));
  };

  // ---------- screen check (spec 3.8) ----------

  const LAST_ON_SCREEN = {
    claude: '[data-testid="user-message"], .standard-markdown',
    chatgpt: '[data-message-author-role]',
    grok: '.message-bubble',
    gemini: 'user-query, model-response',
  };
  const letters = s => String(s || '').replace(/\[\d+\]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

  // Compares the end of the last exported message with the last message
  // on screen. A mismatch means the export may hold a different branch.
  function screenCheck(conv) {
    const sel = LAST_ON_SCREEN[conv.platform];
    if (!sel) return;
    const els = [...document.querySelectorAll(sel)].filter(e => !e.closest('[class*="transition-[grid-template-rows]"]'));
    const last = conv.messages[conv.messages.length - 1];
    if (!els.length || !last) return;
    const screen = letters(els[els.length - 1].innerText);
    const exported = letters(last.blocks.filter(b => b.type === 'text').map(b => b.text).join(' '));
    if (!screen || exported.length < 12) return;
    if (!screen.includes(exported.slice(-40))) {
      conv.completeness.notes.push('The exported branch may differ from the one on screen (the last message does not match).');
    }
  }

  // ---------- page UI: toast and progress modal ----------

  function toast(text, { actionLabel, onAction, sticky = false } = {}) {
    document.getElementById('rc-copier-toast')?.remove();
    const el = document.createElement('div');
    el.id = 'rc-copier-toast';
    Object.assign(el.style, {
      position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: '2147483647',
      padding: '10px 16px', borderRadius: '8px', background: '#1e1b4b', color: '#e0e7ff', fontSize: '13px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      display: 'flex', gap: '12px', alignItems: 'center', maxWidth: '640px',
    });
    const span = document.createElement('span');
    span.textContent = text;
    el.appendChild(span);
    if (actionLabel) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = actionLabel;
      Object.assign(b.style, { border: '1px solid #a5b4fc', background: 'transparent', color: '#e0e7ff', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' });
      b.addEventListener('click', () => { onAction(); });
      el.appendChild(b);
    }
    document.body.appendChild(el);
    if (!sticky) setTimeout(() => el.remove(), 4500);
  }

  function pageUi(title, { withModal }) {
    const ui = { cancelled: false, update() {}, done(text) { toast(text); }, fail(text) { toast(text); }, close() {} };
    if (!withModal) { toast(`${title}…`, { sticky: true }); return ui; }
    document.getElementById('rc-copier-modal')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'rc-copier-modal';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '2147483647', background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    });
    const box = document.createElement('div');
    Object.assign(box.style, {
      background: '#fff', color: '#1e1b4b', borderRadius: '14px', padding: '24px 28px', minWidth: '340px', maxWidth: '440px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center',
    });
    const h = document.createElement('div');
    h.textContent = title;
    Object.assign(h.style, { fontSize: '16px', fontWeight: '600', marginBottom: '8px' });
    const status = document.createElement('div');
    Object.assign(status.style, { fontSize: '13px', color: '#4b5563', marginBottom: '14px', minHeight: '18px' });
    const barWrap = document.createElement('div');
    Object.assign(barWrap.style, { background: '#eef2ff', borderRadius: '6px', height: '6px', overflow: 'hidden', marginBottom: '14px' });
    const bar = document.createElement('div');
    Object.assign(bar.style, { height: '100%', width: '0%', background: '#4f46e5', transition: 'width .3s ease' });
    barWrap.appendChild(bar);
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    Object.assign(cancel.style, { border: '1px solid #d1d5db', background: '#fff', color: '#4b5563', padding: '5px 16px', borderRadius: '8px', cursor: 'pointer' });
    cancel.addEventListener('click', () => { ui.cancelled = true; overlay.remove(); toast('Cancelled'); });
    box.append(h, status, barWrap, cancel);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    ui.update = (text, pct) => { status.textContent = text; if (typeof pct === 'number') bar.style.width = `${Math.max(0, Math.min(100, pct))}%`; };
    ui.close = () => overlay.remove();
    ui.done = text => { overlay.remove(); toast(text); };
    ui.fail = text => { overlay.remove(); toast(text, { sticky: false }); };
    return ui;
  }

  // ---------- the work ----------

  function summaryOf(conv, mode) {
    const parts = [R.describeMessages(conv)];
    const f = conv.completeness.files;
    if (mode === 'export' && conv.files.length) parts.push(`files ${f.got} of ${conv.files.length}${f.failed.length ? ` (${f.failed.length} failed)` : ''}`);
    return parts.join('; ');
  }

  async function build(mode, ui) {
    const a = adapter();
    if (!a || !a.conversationRef(location)) throw new Error('Open a conversation first.');
    ui.update('Reading the conversation…');
    const { conversation: conv, ctx } = await a.extract(location, {
      onProgress: p => ui.update(p.paused ? 'Paused while this tab is in the background' : `Collected ${p.got} of ${p.total || '?'} messages`, p.total ? (p.got / p.total) * 100 : undefined),
      isCancelled: () => ui.cancelled,
    });
    screenCheck(conv);
    const base = R.exportBaseName(conv.platform, conv.title);
    if (mode !== 'export') return { conv, base, markdown: R.toMarkdown(conv, { mode }) };

    const zip = new JSZip();
    const folder = zip.folder(base);
    const used = { uploads: new Set(), artifacts: new Set() };
    const paths = {};
    let got = 0;
    for (let i = 0; i < conv.files.length; i++) {
      if (ui.cancelled) throw new Error('Cancelled.');
      const f = conv.files[i];
      ui.update(`Downloading files: ${i + 1} of ${conv.files.length}`, (i / conv.files.length) * 100);
      try {
        const blob = await a.fetchFile(f, ctx);
        const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
        const sub = f.from === 'user' ? 'uploads' : 'artifacts';
        const name = R.safeName(R.ensureExtension(f.name, blob.type || f.mime, head), used[sub]);
        folder.file(`${sub}/${name}`, blob);
        paths[f.key] = `${sub}/${name}`;
        got++;
      } catch (e) {
        conv.completeness.files.failed.push({ key: f.key, name: f.name, reason: (e && e.message) || 'download failed' });
      }
    }
    conv.completeness.files.got = got;
    const markdown = R.toMarkdown(conv, { mode: 'zip', paths });
    folder.file('conversation.md', markdown);
    ui.update('Building the ZIP…', 100);
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return { conv, base, markdown, zipBlob };
  }

  function saveFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.documentElement.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
  }

  // A clipboard write can fail when the page lost focus during a long run.
  // The text is kept and a fresh click retries with focus and activation.
  async function copyText(markdown, summary) {
    try {
      await navigator.clipboard.writeText(markdown);
      toast(`Copied: ${summary}`);
    } catch (e) {
      toast('Ready to copy.', {
        actionLabel: 'Copy', sticky: true,
        onAction: () => navigator.clipboard.writeText(markdown)
          .then(() => toast(`Copied: ${summary}`))
          .catch(() => toast('Copy failed. Use Download instead.')),
      });
    }
  }

  async function run(mode, ui, { fromPopup = false } = {}) {
    try {
      const r = await build(mode, ui);
      const summary = summaryOf(r.conv, mode);
      if (mode === 'copy' && fromPopup) return { ok: true, markdown: r.markdown, summary };
      if (mode === 'copy') await copyText(r.markdown, summary);
      if (mode === 'download') saveFile(new Blob([r.markdown], { type: 'text/markdown;charset=utf-8' }), `${r.base}.md`);
      if (mode === 'export') saveFile(r.zipBlob, `${r.base}.zip`);
      const noFiles = mode === 'export' && !r.conv.files.length ? ' No files in this chat.' : '';
      if (mode !== 'copy') ui.done(`${mode === 'export' ? 'Exported' : 'Downloaded'}: ${summary}.${noFiles}`);
      else ui.close();
      return { ok: true, summary };
    } catch (e) {
      const error = (e && e.message) || String(e);
      if (!ui.cancelled) ui.fail(error);
      return { ok: false, error };
    }
  }

  function startFromPage(mode) {
    const slow = mode === 'export' || (adapter() && adapter().id === 'copilot');
    const title = { copy: 'Copying', download: 'Downloading', export: 'Exporting' }[mode];
    run(mode, pageUi(title, { withModal: slow }));
  }

  // ---------- popup connection (spec 3.6) ----------

  chrome.runtime.onConnect.addListener(port => {
    if (port.name !== PORT_NAME) return;
    let open = true;
    const ui = {
      cancelled: false,
      update: text => { if (open) port.postMessage({ type: 'progress', text }); },
      done() {}, fail() {}, close() {},
    };
    port.onDisconnect.addListener(() => { open = false; });
    port.onMessage.addListener(async msg => {
      if (msg.type === 'cancel') { ui.cancelled = true; return; }
      if (msg.type === 'ping') {
        const a = adapter();
        port.postMessage({ type: 'pong', supported: onConversation(), platform: a ? a.id : null });
        return;
      }
      if (msg.type === 'run') {
        const res = await run(msg.action, ui, { fromPopup: true });
        if (open) { port.postMessage({ type: 'result', ...res }); return; }
        // The popup closed mid-run: finish on the page.
        if (res.ok && msg.action === 'copy') copyText(res.markdown, res.summary);
        else if (res.ok) toast(`Done: ${res.summary}`);
        else toast(res.error);
      }
    });
  });

  // ---------- in-page buttons ----------

  function claudeToolbar() {
    const bars = document.querySelectorAll('div[role="toolbar"][aria-label="Message actions"]');
    return bars.length ? bars[bars.length - 1] : null;
  }

  function cloneButton(template, action) {
    const btn = template.cloneNode(true);
    ['data-testid', 'data-state', 'id', 'aria-pressed', 'aria-expanded'].forEach(a => btn.removeAttribute(a));
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', action.label);
    btn.setAttribute('title', action.label);
    const svg = btn.querySelector('svg');
    const tmp = document.createElement('div');
    tmp.innerHTML = action.icon;
    if (svg) svg.replaceWith(tmp.firstElementChild); else btn.replaceChildren(tmp.firstElementChild);
    btn.classList.add('rc-copier-injected');
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); startFromPage(action.mode); });
    return btn;
  }

  function floatingCluster() {
    if (document.getElementById('rc-copier-floating')) return;
    const cluster = document.createElement('div');
    cluster.id = 'rc-copier-floating';
    Object.assign(cluster.style, {
      position: 'fixed', bottom: '20px', right: '20px', zIndex: '2147483646', display: 'flex', gap: '4px', padding: '6px',
      borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.92)', boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
    });
    ACTIONS.forEach(action => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = action.icon;
      b.title = action.label;
      b.setAttribute('aria-label', action.label);
      Object.assign(b.style, { width: '34px', height: '34px', border: 'none', borderRadius: '8px', background: 'transparent', color: '#4b5563', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' });
      b.addEventListener('mousedown', e => e.preventDefault());
      b.addEventListener('click', e => { e.stopPropagation(); startFromPage(action.mode); });
      cluster.appendChild(b);
    });
    if (matchMedia('(prefers-color-scheme: dark)').matches) {
      cluster.style.background = 'rgba(40,40,38,0.92)';
      cluster.style.borderColor = 'rgba(255,255,255,0.1)';
      cluster.querySelectorAll('button').forEach(b => { b.style.color = '#d1d5db'; });
    }
    document.body.appendChild(cluster);
  }

  function refreshButtons() {
    const a = adapter();
    if (!onConversation()) {
      document.querySelectorAll('.rc-copier-injected, #rc-copier-floating').forEach(el => el.remove());
      return;
    }
    if (a.id === 'claude') {
      const bar = claudeToolbar();
      const template = bar && bar.querySelector('button');
      if (bar && template) {
        document.getElementById('rc-copier-floating')?.remove();
        if (!bar.querySelector('.rc-copier-injected')) {
          document.querySelectorAll('.rc-copier-injected').forEach(el => el.remove());
          const sep = document.createElement('div');
          sep.className = 'rc-copier-injected';
          sep.style.cssText = 'width:1px;height:16px;background:currentColor;opacity:0.15;margin:0 2px;align-self:center;';
          bar.appendChild(sep);
          ACTIONS.forEach(action => bar.appendChild(cloneButton(template, action)));
        }
        return;
      }
    }
    floatingCluster();
  }

  // ---------- start ----------

  // Other extensions and the archived copies used window.RecurateExtractor.
  globalThis.RecurateExtractor = {
    extract: async () => (await adapter().extract(location)).conversation,
    toMarkdown: R.toMarkdown,
  };

  refreshButtons();
  setInterval(refreshButtons, 2000);
})();
