// Recurate Copier: the conversation model every platform adapter fills in.
// Plain data only. Adapters build a Conversation; the Markdown writer reads it.
// Loads in a content script and in Node tests (registers on globalThis.Recurate).

(function () {
  'use strict';

  const PLATFORM_NAMES = {
    claude: 'Claude',
    chatgpt: 'ChatGPT',
    grok: 'Grok',
    gemini: 'Gemini',
    copilot: 'Copilot',
  };

  // The site's data cannot be used at all: no message list, broken parent
  // links, wrong top-level type. The export stops and shows the reason.
  class StructuralError extends Error {
    constructor(platform, reason) {
      super(reason);
      this.name = 'StructuralError';
      this.platform = platform;
    }
  }

  // A request to the site failed (sign-in expired, not found, network).
  class FetchError extends Error {
    constructor(platform, status, reason) {
      super(reason);
      this.name = 'FetchError';
      this.platform = platform;
      this.status = status;
    }
  }

  function createConversation({ platform, id = null, title = null, url = null, modelNote = null, exportedAt = new Date() }) {
    if (!PLATFORM_NAMES[platform]) throw new Error(`Unknown platform: ${platform}`);
    return {
      platform,
      platformName: PLATFORM_NAMES[platform],
      id,
      title,
      url,
      exportedAt: exportedAt instanceof Date ? exportedAt.toISOString() : String(exportedAt),
      modelNote,
      messages: [],
      files: [],
      completeness: {
        messages: { got: 0, expected: null, complete: false, method: 'data', noTotal: false, reason: null },
        files: { got: 0, failed: [] },
        notIncluded: [],
        notes: [],
      },
    };
  }

  function createMessage(role, { createdAt = null, model = null } = {}) {
    if (role !== 'user' && role !== 'assistant') throw new Error(`Unknown role: ${role}`);
    return { role, n: 0, createdAt, model, blocks: [], sources: [] };
  }

  // Adds a source to a message and returns its 1-based number for the marker
  // in the text. The same URL gets the same number within a message.
  function addSource(message, title, url) {
    const key = url || title || '';
    const found = message.sources.findIndex(s => (s.url || s.title || '') === key);
    if (found >= 0) return found + 1;
    message.sources.push({ title: title || url || 'Source', url: url || null });
    return message.sources.length;
  }

  // A file the chat references. The fetch step resolves `kind` and `id`
  // into bytes; nothing here holds a token or a closure.
  function fileRef({ kind, id, name, mime = null, size = null, from = 'user' }) {
    return { kind, id: String(id), key: `${kind}:${id}`, name: name || 'file', mime, size, from };
  }

  function addFile(conversation, ref) {
    if (!conversation.files.some(f => f.key === ref.key)) conversation.files.push(ref);
    return ref;
  }

  // A URL whose query looks signed (a signature, token, key or expiry) loses
  // its query, so an export never carries a working download link.
  const SIGNED = /[?&](?:sig|signature|token|access_token|expires|expiry|credential|policy|key|se|sp|sv|st|x-amz-[\w-]+|x-goog-[\w-]+)=/i;
  const unsign = text => text.replace(/https?:\/\/[^\s"'<>]+/g, u => {
    const tail = (u.match(/[)\].,;]+$/) || [''])[0];
    const url = u.slice(0, u.length - tail.length);
    return SIGNED.test(url) ? url.split('?')[0] + tail : u;
  });

  // Every string found inside an unknown value, so unsupported content keeps
  // its readable parts instead of disappearing.
  function collectStrings(value, out = [], depth = 0) {
    if (depth > 20) return out;
    if (typeof value === 'string') {
      if (value.trim()) out.push(unsign(value));
    } else if (Array.isArray(value)) {
      value.forEach(v => collectStrings(v, out, depth + 1));
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(v => collectStrings(v, out, depth + 1));
    }
    return out;
  }

  const block = {
    text: text => ({ type: 'text', text: String(text ?? '') }),
    thinking: (summary, text, hiddenInSite = false) => ({
      type: 'thinking', summary: summary || '', text: text || '', hiddenInSite,
    }),
    tool: ({ name, input = null, output = [], isError = false, noResult = false }) => ({
      type: 'tool', name: name || 'tool', input, output, isError, noResult,
    }),
    image: file => ({ type: 'image', file }),
    file: (file, inlineText = null) => ({ type: 'file', file, inlineText }),
    summary: text => ({ type: 'summary', text: String(text ?? '') }),
    unsupported: (siteType, value) => ({
      type: 'unsupported', siteType: String(siteType), strings: collectStrings(value),
    }),
  };

  // Parts of a tool's output.
  const output = {
    text: text => ({ kind: 'text', text: String(text ?? '') }),
    links: items => ({ kind: 'links', items }),
    file: file => ({ kind: 'file', file }),
    json: value => ({ kind: 'json', value }),
  };

  function hasContent(message) {
    return message.blocks.some(b => {
      if (b.type === 'text') return b.text.trim().length > 0;
      if (b.type === 'thinking') return Boolean(b.summary || b.text);
      return true;
    });
  }

  // Numbers the messages, records the completeness result, and notes any
  // message that came back with no content (it stays, with a placeholder).
  function finish(conversation, { complete, method = 'data', expected = null, noTotal = false, reason = null }) {
    const c = conversation;
    c.messages.forEach((m, i) => { m.n = i + 1; });
    const empty = c.messages.filter(m => !hasContent(m)).length;
    if (empty > 0) {
      c.completeness.notes.push(`${empty} message${empty === 1 ? '' : 's'} had no content in ${c.platformName}'s data.`);
    }
    Object.assign(c.completeness.messages, {
      got: c.messages.length, expected, complete: Boolean(complete), method, noTotal, reason,
    });
    return c;
  }

  // Letters and digits only, lowercased, with citation markers, link
  // targets and bare URLs removed: a form in which the page's text and an
  // export's text can be compared (the page shows a link's text only).
  // Fenced code in Markdown lines, for every place that must leave code
  // alone. A fence may follow a list marker ("1. ```bash"); a backtick
  // fence's info string holds no backtick, so "```npm i```" on one line is
  // inline code; a closer uses the same character, at least as many, and
  // nothing after it. Returns, per line, whether it belongs to a block
  // (opener, body or closer), the blocks as line ranges, and the fence
  // still open at the end with the column it opened at.
  const OPENER = /^(\s*(?:(?:[-*+]|\d+[.)])[ \t]+)?)(`{3,}|~{3,})(.*)$/;
  const CLOSER = /^\s*(`{3,}|~{3,})\s*$/;
  function fenceScan(lines) {
    const inside = lines.map(() => false);
    const blocks = [];
    let open = null;
    lines.forEach((line, i) => {
      if (open) {
        inside[i] = true;
        const c = line.match(CLOSER);
        if (c && c[1][0] === open.fence[0] && c[1].length >= open.fence.length) {
          blocks.push({ start: open.start, end: i });
          open = null;
        }
        return;
      }
      const m = line.match(OPENER);
      if (m && !(m[2][0] === '`' && m[3].includes('`'))) {
        open = { fence: m[2], col: m[1].length, start: i };
        inside[i] = true;
      }
    });
    if (open) blocks.push({ start: open.start, end: lines.length - 1 });
    return { inside, blocks, open };
  }

  const LIST_MARK = /^[ \t]*(?:\d+[.)]|[-*+])[ \t]+(?:\[[ xX]\][ \t]+)?/;

  // fromData: the text is an export's Markdown, whose list numbers and task
  // boxes the page draws outside innerText, so they are dropped (not inside
  // code, where the page shows them). Page text keeps a leading "3. ".
  function letters(text, { fromData = false } = {}) {
    let t = String(text || '').replace(/\uE200[^\uE201]*\uE201/g, '');
    if (fromData) {
      const lines = t.split('\n');
      const { inside } = fenceScan(lines);
      t = lines.map((line, i) => (inside[i] ? line : line.replace(LIST_MARK, ''))).join('\n');
    }
    return t
      .replace(/\[\d+\]/g, '')
      .replace(/\]\([^)]*\)/g, ']')
      .replace(/https?:\/\/\S+/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '');
  }

  // True when the screen's last message holds the end of this text.
  function matchesScreen(screen, text) {
    const t = letters(text, { fromData: true });
    return Boolean(screen) && t.length >= 12 && screen.includes(t.slice(-40));
  }

  // When the data's leaf does not match the screen, the one other leaf that
  // does. A candidate whose ending also appears in the data's leaf (a stopped
  // first try, a shared opening) proves nothing, and two matches are
  // ambiguous: in both cases the data's leaf stays. candidates: [{ id, text }].
  function pickOnScreen(screen, currentText, candidates) {
    const cur = letters(currentText, { fromData: true });
    if (!screen || cur.length < 12 || matchesScreen(screen, currentText)) return null;
    const hits = candidates.filter(c => matchesScreen(screen, c.text) && !cur.includes(letters(c.text, { fromData: true }).slice(-40)));
    return hits.length === 1 ? hits[0].id : null;
  }

  globalThis.Recurate = Object.assign(globalThis.Recurate || {}, {
    fenceScan,
    letters,
    matchesScreen,
    pickOnScreen,
    PLATFORM_NAMES,
    StructuralError,
    FetchError,
    createConversation,
    createMessage,
    addSource,
    fileRef,
    addFile,
    collectStrings,
    block,
    output,
    hasContent,
    finish,
  });
})();
