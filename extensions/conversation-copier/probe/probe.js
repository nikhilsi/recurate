// Recurate Copier probe: a read-only check of what a chat site loads behind
// the page. Run it on an open conversation page, in the page context (Claude
// in Chrome's JavaScript tool, or the DevTools console), then:
//
//   await recurateProbe()            counts and checks for this conversation
//   await recurateProbe({ skeleton: true })   adds a values-free skeleton
//
// It reads, never writes. It reports counts, field names and types only:
// no message text, no titles, no ids, no tokens. See probe/README.md.

(function () {
  'use strict';

  // Keys whose values are site vocabulary (block types, roles), not content.
  const ENUM_KEYS = new Set([
    'type', 'content_type', 'role', 'sender', 'kind', 'file_kind', 'status',
    'stop_reason', 'input_mode', 'command', 'reasoning_recap_type',
  ]);
  const ID_KEY = /^([0-9a-f]{8}-[0-9a-f-]{27,}|[0-9a-f]{16,}|client-created-root)$/i;
  // Tool inputs and tool payloads hold the user's own data (emails, commands,
  // file contents). Neither the skeleton nor the vocabulary looks inside them.
  const PAYLOAD_KEYS = new Set(['input', 'structured_content', 'display_content', 'connector_tool_payload', 'meta']);
  // Vocabulary values look like site words ("tool_use", "speech_input"), never
  // like an address, a sentence or a command.
  const WORD = /^[a-z][a-z0-9_.-]{0,39}$/i;

  const tally = (obj, key, n = 1) => { obj[key] = (obj[key] || 0) + n; return obj; };

  // --- skeleton: key paths and types, never values ---

  const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);

  // A type label for a skeleton node, used when two shapes conflict.
  const label = x => (typeof x === 'string' ? x : Array.isArray(x) ? 'array' : 'object');

  // Merges two skeletons into one: objects union their keys, arrays merge
  // their elements, and anything else becomes a "string|null" style label.
  function merge(a, b) {
    if (a === undefined) return b;
    if (b === undefined) return a;
    if (typeof a === 'string' && typeof b === 'string') {
      return [...new Set([...a.split('|'), ...b.split('|')])].sort().join('|');
    }
    if (isObj(a) && isObj(b)) {
      const out = { ...a };
      Object.entries(b).forEach(([k, v]) => { out[k] = merge(out[k], v); });
      return out;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      const len = Math.max(a.length, b.length);
      return Array.from({ length: len }, (_, i) => merge(a[i], b[i]));
    }
    // A record that is sometimes null (or a string) keeps its fields and
    // records the other type under '<also>'.
    if (isObj(a) && typeof b === 'string') return { ...a, '<also>': merge(a['<also>'], b) };
    if (isObj(b) && typeof a === 'string') return merge(b, a);
    if (Array.isArray(a) && typeof b === 'string') return [...a, `<also> ${b}`];
    if (Array.isArray(b) && typeof a === 'string') return merge(b, a);
    return merge(label(a), label(b));
  }

  const mergeAll = list => list.reduce((acc, x) => merge(acc, x), undefined);

  function skel(value, depth = 0) {
    if (depth > 14) return '…';
    if (value === null) return 'null';
    if (Array.isArray(value)) {
      if (!value.length) return [];
      // A list of records collapses to one merged record; a list of plain
      // values of one type collapses to that type.
      // Short arrays with nested arrays are positional (Gemini) and keep slots.
      if (value.every(isObj)) return [mergeAll(value.map(v => skel(v, depth + 1)))];
      if (value.length > 8 && !value.some(Array.isArray)) return [mergeAll(value.map(v => skel(v, depth + 1)))];
      // A positional array (Gemini) keeps each slot, up to 60.
      return value.slice(0, 60).map(v => skel(v, depth + 1));
    }
    if (isObj(value)) {
      const keys = Object.keys(value);
      // A map keyed by ids, or a wide map whose values all share one type
      // (a settings flag list), collapses to one entry. Wide records do not.
      const oneType = new Set(keys.map(k => (Array.isArray(value[k]) ? 'array' : value[k] === null ? 'null' : typeof value[k]))).size === 1;
      if ((keys.length > 40 && oneType) || (keys.length && keys.every(k => ID_KEY.test(k)))) {
        return { '<id>': mergeAll(keys.map(k => skel(value[k], depth + 1))) };
      }
      const out = {};
      keys.forEach(k => { out[k] = PAYLOAD_KEYS.has(k) ? '<tool data>' : skel(value[k], depth + 1); });
      return out;
    }
    return typeof value;
  }

  // Distinct values of vocabulary keys anywhere in the data.
  function vocab(value, out = {}, depth = 0) {
    if (depth > 20 || !value || typeof value !== 'object') return out;
    if (Array.isArray(value)) { value.forEach(v => vocab(v, out, depth + 1)); return out; }
    // A tool result's own content is payload too; only its parts' types count.
    const isToolResult = value.type === 'tool_result';
    for (const [k, v] of Object.entries(value)) {
      if (PAYLOAD_KEYS.has(k)) continue;
      if (ENUM_KEYS.has(k) && typeof v === 'string' && WORD.test(v) && !v.includes('@')) {
        out[k] = out[k] || {};
        tally(out[k], v);
      } else if (isToolResult && k === 'content' && Array.isArray(v)) {
        v.forEach(part => { if (part && typeof part.type === 'string' && WORD.test(part.type)) { out.toolResultPartType = out.toolResultPartType || {}; tally(out.toolResultPartType, part.type); } });
      } else {
        vocab(v, out, depth + 1);
      }
    }
    return out;
  }

  async function getJson(url, init) {
    const r = await fetch(url, init);
    if (!r.ok) throw new Error(`HTTP ${r.status} from ${new URL(url, location.origin).pathname.replace(/[0-9a-f-]{16,}/gi, '<id>')}`);
    return r.json();
  }

  // --- Claude ---

  async function probeClaude() {
    const id = location.pathname.split('/')[2];
    const org = (document.cookie.match(/lastActiveOrg=([^;]+)/) || [])[1];
    const orgs = await getJson('/api/organizations');
    const chatOrgs = orgs.filter(o => (o.capabilities || []).includes('chat')).length;
    const data = await getJson(`/api/organizations/${org}/chat_conversations/${id}?tree=True&rendering_mode=messages&render_all_tools=true`);
    const msgs = data.chat_messages || [];
    const byId = Object.fromEntries(msgs.map(m => [m.uuid, m]));
    let cur = data.current_leaf_message_uuid, chain = [];
    while (cur && byId[cur] && chain.length < 100000) { chain.push(byId[cur]); cur = byId[cur].parent_message_uuid; }
    const children = {};
    msgs.forEach(m => tally(children, m.parent_message_uuid));
    const r = {
      orgFromCookie: Boolean(org), chatOrgs,
      nodes: msgs.length, activeBranch: chain.length,
      branchPoints: Object.values(children).filter(n => n > 1).length,
      rootReached: Boolean(cur) && !byId[cur] && /^0{8}-/.test(cur),
      blocks: {}, toolResultParts: {}, citations: 0, citationsAfterNonBmp: 0,
      thinking: { withText: 0, withSummary: 0, empty: 0 },
      files: {}, attachments: 0, compaction: 0, unpairedToolUses: 0,
    };
    const uses = new Set(), results = new Set();
    chain.forEach(m => {
      (m.files || []).forEach(f => tally(r.files, f.file_kind));
      r.attachments += (m.attachments || []).length;
      if (m.compaction_summary) r.compaction++;
      (m.content || []).forEach(b => {
        tally(r.blocks, b.type);
        if (b.type === 'tool_use') uses.add(b.id);
        if (b.type === 'tool_result') { results.add(b.tool_use_id); (Array.isArray(b.content) ? b.content : []).forEach(p => tally(r.toolResultParts, p.type)); }
        if (b.type === 'thinking') { if (b.thinking) r.thinking.withText++; else if ((b.summaries || []).length) r.thinking.withSummary++; else r.thinking.empty++; }
        if (b.type === 'text') (b.citations || []).forEach(c => { r.citations++; if (/[\uD800-\uDBFF]/.test((b.text || '').slice(0, c.end_index))) r.citationsAfterNonBmp++; });
      });
    });
    uses.forEach(u => { if (!results.has(u)) r.unpairedToolUses++; });
    return { report: r, data };
  }

  // --- ChatGPT ---

  async function probeChatGPT() {
    const id = (location.pathname.match(/\/c\/([^/?#]+)/) || [])[1];
    const session = await getJson('/api/auth/session');
    const auth = { headers: { Authorization: 'Bearer ' + session.accessToken } };
    const data = await getJson(`/backend-api/conversation/${id}`, auth);
    const map = data.mapping || {};
    let cur = data.current_node, chain = [], last = null;
    while (cur && map[cur] && chain.length < 100000) { chain.push(map[cur]); last = map[cur]; cur = map[cur].parent; }
    const children = {};
    Object.values(map).forEach(n => tally(children, n.parent));
    const r = {
      nodes: Object.keys(map).length, activeBranch: chain.length,
      branchPoints: Object.values(map).filter(n => (n.children || []).length > 1).length,
      rootReached: Boolean(last) && last.parent === null && !last.message,
      combos: {}, hidden: {}, referenceTypes: {}, refsMatchedByCodePoint: 0, refsMatchedByUtf16: 0, refsChecked: 0,
      privateUseMarkers: 0, partTypes: {},
    };
    const cp = (s, a, b) => Array.from(s).slice(a, b).join('');
    chain.forEach(n => {
      const m = n.message; if (!m) return;
      const role = m.author && m.author.role, ct = m.content && m.content.content_type;
      const to = m.recipient === 'all' ? 'all' : m.recipient ? 'tool' : 'none';
      tally(r.combos, `${role}|${to}|${ct}`);
      if (m.metadata && m.metadata.is_visually_hidden_from_conversation) tally(r.hidden, `${role}|${ct}`);
      const parts = (m.content && m.content.parts) || [];
      parts.forEach(p => tally(r.partTypes, typeof p === 'string' ? 'string' : (p && p.content_type) || typeof p));
      const text = parts.filter(p => typeof p === 'string').join('');
      r.privateUseMarkers += (text.match(/\uE200/g) || []).length;
      ((m.metadata && m.metadata.content_references) || []).forEach(ref => {
        tally(r.referenceTypes, ref.type);
        if (ref.matched_text && typeof ref.start_idx === 'number' && text) {
          r.refsChecked++;
          if (cp(text, ref.start_idx, ref.end_idx) === ref.matched_text) r.refsMatchedByCodePoint++;
          if (text.slice(ref.start_idx, ref.end_idx) === ref.matched_text) r.refsMatchedByUtf16++;
        }
      });
    });
    return { report: r, data };
  }

  // --- Grok ---

  async function probeGrok() {
    const id = (location.pathname.match(/\/c\/([^/?#]+)/) || [])[1];
    const nodes = (await getJson(`/rest/app-chat/conversations/${id}/response-node?includeThreads=true`)).responseNodes || [];
    const ids = new Set(nodes.map(n => n.responseId));
    const kids = {};
    nodes.forEach(n => tally(kids, n.parentResponseId));
    const rid = new URLSearchParams(location.search).get('rid');
    const roots = nodes.filter(n => !ids.has(n.parentResponseId));
    const data = await getJson(`/rest/app-chat/conversations/${id}/load-responses`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ responseIds: [...ids] }),
    });
    const responses = data.responses || [];
    const nonEmpty = {};
    responses.forEach(resp => Object.entries(resp).forEach(([k, v]) => {
      if (v && (!Array.isArray(v) || v.length) && !(typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)) tally(nonEmpty, k);
    }));
    return {
      report: {
        nodes: nodes.length, roots: roots.length, leaves: nodes.filter(n => !kids[n.responseId]).length,
        ridPresent: Boolean(rid), ridIsLeaf: rid ? ids.has(rid) && !kids[rid] : null,
        responses: responses.length, fieldsWithValues: nonEmpty,
      },
      data: { nodes: { responseNodes: nodes }, responses: data },
    };
  }

  // --- Gemini ---

  function geminiParams() {
    const scripts = [...document.querySelectorAll('script:not([src])')].map(s => s.textContent || '');
    const find = key => { for (const t of scripts) { const m = t.match(new RegExp(`"${key}":"([^"]+)"`)); if (m) return m[1]; } return null; };
    return { at: find('SNlM0e'), bl: find('cfb2h'), sid: find('FdrFJe') };
  }

  async function geminiPage(p, id, size, cursor) {
    const prefix = location.pathname.match(/^(\/u\/\d+)?/)[0] || '';
    const qs = new URLSearchParams({ rpcids: 'hNvQHb', 'source-path': location.pathname, bl: p.bl, 'f.sid': p.sid, hl: 'en', _reqid: String(100000 + Math.floor(Math.random() * 800000)), rt: 'c' });
    const inner = JSON.stringify(['c_' + id, size, cursor || null, 1, [0], [4, 12], null, 1]);
    const body = new URLSearchParams({ 'f.req': JSON.stringify([[['hNvQHb', inner, null, 'generic']]]), at: p.at });
    const r = await fetch(`${prefix}/_/BardChatUi/data/batchexecute?${qs}`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body });
    if (!r.ok) throw new Error(`HTTP ${r.status} from batchexecute`);
    const line = (await r.text()).split('\n').find(l => l.startsWith('[["wrb.fr"'));
    if (!line) throw new Error('no wrb.fr line in the batchexecute response');
    return JSON.parse(JSON.parse(line)[0][2]);
  }

  async function probeGemini() {
    const id = location.pathname.split('/').filter(Boolean).pop();
    const p = geminiParams();
    const pages = [];
    const turns = [];
    let cursor = null;
    const seen = new Set();
    for (let i = 0; i < 50; i++) {
      const d = await geminiPage(p, id, 10, cursor);
      pages.push({ turns: (d[0] || []).length, more: Boolean(d[1]) });
      turns.push(...(d[0] || []));
      if (!d[1] || seen.has(d[1]) || !(d[0] || []).length) break;
      seen.add(d[1]); cursor = d[1];
    }
    // turn[0] = [c_, r_] ids; turn[1] = the parent turn's [c_, r_, rc_],
    // missing or blank on the first turn; turn[3][0][0][0] = the rc_ id.
    const pre = (v, s) => typeof v === 'string' && v.startsWith(s);
    const guard = turns.every(t => pre(t[0] && t[0][0], 'c_') && pre(t[0] && t[0][1], 'r_')
      && pre(t[3] && t[3][0] && t[3][0][0] && t[3][0][0][0], 'rc_') && typeof (t[4] && t[4][0]) === 'number');
    // Turns arrive newest first; each one's parent must be the next one.
    let linked = 0, broken = 0;
    for (let i = 0; i < turns.length - 1; i++) {
      const parent = turns[i][1] || [];
      const prev = turns[i + 1];
      if (parent[1] === prev[0][1] && parent[2] === prev[3][0][0][0]) linked++; else broken++;
    }
    const oldest = turns[turns.length - 1];
    const rootIsFirst = Boolean(oldest) && (!oldest[1] || !oldest[1][1]);
    const slots = {};
    turns.forEach(t => ((t[3] && t[3][0] && t[3][0][0]) || []).forEach((v, i) => { if (v !== null && !(Array.isArray(v) && !v.length)) tally(slots, i); }));
    const ids = turns.map(t => t[0] && t[0][1]);
    return {
      report: {
        paramsFound: Boolean(p.at && p.bl && p.sid), pages, turns: turns.length,
        uniqueTurns: new Set(ids).size, guardHolds: guard,
        parentLinks: { linked, broken }, rootIsFirst,
        emptyAnswers: turns.filter(t => !(t[3] && t[3][0] && t[3][0][0] && t[3][0][0][1])).length,
        candidatesPerTurn: [...new Set(turns.map(t => ((t[3] && t[3][0]) || []).length))],
        answerTextParts: [...new Set(turns.map(t => ((t[3] && t[3][0] && t[3][0][0] && t[3][0][0][1]) || []).length))],
        candidateSlotsWithValues: slots,
        domTurns: document.querySelectorAll('user-query').length,
      },
      data: turns.slice(0, 3),
    };
  }

  // --- Microsoft Copilot (page only) ---

  async function probeCopilot() {
    const sel = 'div.fai-UserMessage, div.fai-CopilotMessage';
    const els = [...document.querySelectorAll(sel)];
    const sizes = [...new Set(els.map(e => e.getAttribute('aria-setsize')).filter(Boolean))];
    return {
      report: {
        messagesInDom: els.length,
        labeled: els.filter(e => e.getAttribute('aria-posinset')).length,
        unlabeled: els.filter(e => !e.getAttribute('aria-posinset')).length,
        setsizes: sizes,
        markdownReplies: document.querySelectorAll('[data-testid="markdown-reply"]').length,
        tablesInReplies: document.querySelectorAll('[data-testid="markdown-reply"] table').length,
        tablesWithHeader: document.querySelectorAll('[data-testid="markdown-reply"] table th').length,
        codeBlocks: document.querySelectorAll('[data-testid="markdown-reply"] pre').length,
        linksInReplies: document.querySelectorAll('[data-testid="markdown-reply"] a[href]').length,
        imagesInReplies: document.querySelectorAll('[data-testid="markdown-reply"] img').length,
        // Sources are buttons labeled "Citation: <title>" with a 16px icon, no URL.
        citationButtons: document.querySelectorAll('[data-testid="markdown-reply"] button[aria-label^="Citation:"]').length,
        imagesInsideButtons: document.querySelectorAll('[data-testid="markdown-reply"] button img').length,
      },
      data: null,
    };
  }

  function platform() {
    const h = location.hostname;
    if (h === 'claude.ai') return 'claude';
    if (h === 'chatgpt.com' || h === 'chat.openai.com') return 'chatgpt';
    if (h === 'grok.com') return 'grok';
    if (h === 'gemini.google.com') return 'gemini';
    if (/(^|\.)m365\.cloud\.microsoft$|(^|\.)copilot\.cloud\.microsoft$|(^|\.)copilot\.com$/.test(h)) return 'copilot';
    return null;
  }

  const PROBES = { claude: probeClaude, chatgpt: probeChatGPT, grok: probeGrok, gemini: probeGemini, copilot: probeCopilot };

  globalThis.recurateProbe = async function ({ skeleton = false } = {}) {
    const p = platform();
    if (!p) return { error: 'not a supported chat site' };
    try {
      const { report, data } = await PROBES[p]();
      const out = { platform: p, probedAt: new Date().toISOString(), report };
      if (data) out.vocabulary = vocab(data);
      if (skeleton && data) out.skeleton = skel(data);
      return out;
    } catch (e) {
      return { platform: p, error: String(e && e.message || e) };
    }
  };
})();
