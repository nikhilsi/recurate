// Recurate Copier: Claude adapter.
// Reads Claude's own conversation data (spec section 4.1), never the page.
// parse() is pure: data in, Conversation out. The fetch steps run in the page.

(function () {
  'use strict';

  const R = globalThis.Recurate;
  const PLATFORM = 'claude';
  const ROOT = /^0{8}-/;

  function matches(location) {
    return location.hostname === 'claude.ai';
  }

  function conversationRef(location) {
    const m = location.pathname.match(/^\/chat\/([0-9a-f-]{36})(?:[/?#]|$)/i);
    return m ? { id: m[1] } : null;
  }

  // ---------- parse (pure) ----------

  const isWordChar = ch => /[\p{L}\p{N}_]/u.test(ch || '');

  // Inserts [n] markers for citations. Indexes are read as code points
  // (spec risk 7). A marker that lands inside a word or an inline code span
  // moves to the end of it. Numbers follow reading order.
  function insertCitations(text, citations, message) {
    const cps = Array.from(text);
    const usable = (citations || []).filter(c => typeof c.end_index === 'number');
    if (!usable.length) return text;
    const numbered = usable
      .slice()
      .sort((a, b) => (a.start_index ?? a.end_index) - (b.start_index ?? b.end_index))
      .map(c => ({ c, n: R.addSource(message, c.title || (c.metadata && c.metadata.site_name), c.url) }));
    const byPos = new Map();
    numbered.forEach(({ c, n }) => {
      let pos = Math.max(0, Math.min(c.end_index, cps.length));
      while (pos < cps.length && isWordChar(cps[pos - 1]) && isWordChar(cps[pos])) pos++;
      const ticks = cps.slice(0, pos).filter(ch => ch === '`').length;
      if (ticks % 2 === 1) {
        const close = cps.indexOf('`', pos);
        pos = close === -1 ? cps.length : close + 1;
      }
      if (!byPos.has(pos)) byPos.set(pos, []);
      if (!byPos.get(pos).includes(n)) byPos.get(pos).push(n);
    });
    [...byPos.keys()].sort((a, b) => b - a).forEach(pos => {
      const marker = byPos.get(pos).sort((a, b) => a - b).map(n => `[${n}]`).join('');
      cps.splice(pos, 0, marker);
    });
    return cps.join('');
  }

  const ARTIFACT_EXT = {
    'text/markdown': '.md',
    'text/html': '.html',
    'image/svg+xml': '.svg',
    'application/vnd.ant.react': '.jsx',
    'application/vnd.ant.mermaid': '.mmd',
  };
  const LANG_EXT = {
    python: '.py', javascript: '.js', typescript: '.ts', html: '.html', css: '.css', json: '.json',
    bash: '.sh', shell: '.sh', sql: '.sql', java: '.java', go: '.go', rust: '.rs', ruby: '.rb',
    yaml: '.yaml', markdown: '.md', jsx: '.jsx', tsx: '.tsx', swift: '.swift', kotlin: '.kt', csharp: '.cs', cpp: '.cpp', c: '.c',
  };

  function artifactName(art) {
    const base = (art.title || art.id || 'artifact').trim();
    const ext = ARTIFACT_EXT[art.type] || LANG_EXT[(art.language || '').toLowerCase()] || '.txt';
    return base.toLowerCase().endsWith(ext) ? base : base + ext;
  }

  function fileFrom(f, sender) {
    const mime = f.media_type || (f.file_kind === 'image' ? 'image/*' : null);
    return R.fileRef({
      kind: 'claude-file', id: f.file_uuid || f.uuid, name: f.file_name || 'file',
      mime, size: f.size_bytes ?? null, from: sender === 'human' ? 'user' : 'assistant',
    });
  }

  function toolOutput(result, conv, files, wiggle) {
    const parts = [];
    const content = result.content;
    if (typeof content === 'string') {
      if (content.trim()) parts.push(R.output.text(content));
    } else if (Array.isArray(content)) {
      let links = [];
      const flushLinks = () => { if (links.length) { parts.push(R.output.links(links)); links = []; } };
      content.forEach(p => {
        if (!p || typeof p !== 'object') return;
        if (p.type === 'knowledge') { links.push({ title: p.title || p.url, url: p.url || null }); return; }
        flushLinks();
        if (p.type === 'text') parts.push(R.output.text(p.text));
        else if (p.type === 'image' && p.file_uuid) {
          const ref = files.get(p.file_uuid) || R.fileRef({ kind: 'claude-file', id: p.file_uuid, name: `image-${p.file_uuid.slice(0, 8)}`, mime: 'image/*', from: 'assistant' });
          parts.push(R.output.file(R.addFile(conv, ref)));
        } else if (p.type === 'image_gallery') {
          parts.push(R.output.links((p.images || []).map(i => ({ title: i.title || i.page_url || i.url, url: i.page_url || i.url || null }))));
        } else if (p.type === 'local_resource') {
          const path = p.file_path;
          if (path && wiggle.has(path)) parts.push(R.output.file(R.addFile(conv, wiggle.get(path))));
          else parts.push(R.output.text(`${p.name || 'file'}${path ? ` (${path})` : ''}`));
        } else {
          parts.push(R.output.json(p));
        }
      });
      flushLinks();
    }
    if (!parts.length && result.structured_content) parts.push(R.output.json(result.structured_content));
    if (!parts.length && result.display_content) parts.push(R.output.json(result.display_content));
    return parts;
  }

  // data: the chat_conversations response. opts.wiggleFiles: paths from the
  // older file list, if any. Returns a finished Conversation.
  function parse(data, { url = null, wiggleFiles = [], exportedAt } = {}) {
    if (!data || !Array.isArray(data.chat_messages)) {
      throw new R.StructuralError(PLATFORM, "Claude's data has no message list");
    }
    const conv = R.createConversation({
      platform: PLATFORM, id: data.uuid || null, title: data.name || null, url, exportedAt,
      modelNote: data.model ? `Model setting at export: ${data.model}` : null,
    });
    const notes = conv.completeness.notes;

    // Active branch: walk from the leaf to the root.
    const msgs = data.chat_messages;
    const byId = new Map(msgs.map(m => [m.uuid, m]));
    let leaf = data.current_leaf_message_uuid;
    if (!leaf || !byId.has(leaf)) {
      const newest = msgs.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
      leaf = newest && newest.uuid;
      if (leaf) notes.push("Claude's data named no current message; the newest message's branch was exported.");
    }
    const chain = [];
    const seen = new Set();
    let cur = leaf;
    while (cur && byId.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      chain.push(byId.get(cur));
      cur = byId.get(cur).parent_message_uuid;
    }
    chain.reverse();
    let complete = true;
    let reason = null;
    if (seen.has(cur)) { complete = false; reason = 'the message links loop back on themselves'; }
    else if (!cur || !ROOT.test(cur)) { complete = false; reason = 'a parent message is missing from the data'; }
    if (!chain.length) throw new R.StructuralError(PLATFORM, "Claude's data has no messages on the active branch");

    // Older file list: path to FileRef.
    const wiggle = new Map(wiggleFiles.map(path => [path, R.fileRef({
      kind: 'claude-wiggle', id: path, name: path.split('/').pop() || 'file',
      from: path.includes('/outputs/') ? 'assistant' : 'user',
    })]));

    const pendingTools = new Map();   // tool_use id to its tool block
    const artifacts = new Map();      // artifact id to { title, type, language, content, block, notes }
    let hiddenThinking = 0;
    let current = null;               // the assistant turn being filled

    for (const m of chain) {
      const blocks = Array.isArray(m.content) ? m.content : [];
      const files = new Map((m.files || []).map(f => [f.file_uuid || f.uuid, fileFrom(f, m.sender)]));

      // A human message holding only tool results belongs to the assistant turn.
      if (m.sender === 'human' && blocks.length && blocks.every(b => b.type === 'tool_result') && current) {
        blocks.forEach(b => attachResult(b, current, files));
        continue;
      }

      let msg;
      if (m.sender === 'human') {
        msg = R.createMessage('user', { createdAt: m.created_at || null });
        conv.messages.push(msg);
        current = null;
      } else if (current) {
        msg = current;
      } else {
        msg = R.createMessage('assistant', { createdAt: m.created_at || null });
        conv.messages.push(msg);
        current = msg;
      }

      if (Array.isArray(m.compaction_summary) && m.compaction_summary.length) {
        msg.blocks.push(R.block.summary(m.compaction_summary.map(s => s.text || '').join('\n\n')));
      }

      // Uploads and deliveries listed on the message.
      const shown = new Set();
      const fileBlocks = [];
      files.forEach((ref, uuid) => {
        R.addFile(conv, ref);
        shown.add(uuid);
        fileBlocks.push((ref.mime || '').startsWith('image/') ? R.block.image(ref) : R.block.file(ref));
      });
      (m.attachments || []).forEach(a => {
        const ref = R.addFile(conv, R.fileRef({
          kind: 'claude-attachment', id: a.id, name: a.file_name || 'pasted-text.txt', mime: 'text/plain',
          size: a.file_size ?? null, from: 'user',
        }));
        ref.text = a.extracted_content || '';
        fileBlocks.push(R.block.file(ref, a.extracted_content || ''));
      });
      if (m.sender === 'human') msg.blocks.push(...fileBlocks);

      let sawText = false;
      for (const b of blocks) {
        switch (b.type) {
          case 'text':
            if (b.text) sawText = true;
            msg.blocks.push(R.block.text(insertCitations(b.text || '', b.citations, msg)));
            break;
          case 'thinking': {
            const summaries = Array.isArray(b.summaries) ? b.summaries : [];
            const summary = summaries.length ? summaries[summaries.length - 1].summary || '' : '';
            if (b.thinking_hidden || (!b.thinking && summary)) hiddenThinking++;
            msg.blocks.push(R.block.thinking(summary, b.thinking || ''));
            break;
          }
          case 'tool_use': {
            const tool = R.block.tool({ name: b.name, input: b.input ?? null });
            msg.blocks.push(tool);
            if (b.id) pendingTools.set(b.id, tool);
            if (b.name === 'artifacts' && b.input) replayArtifact(b.input, tool);
            break;
          }
          case 'tool_result':
            attachResult(b, msg, files);
            break;
          case 'image': {
            if (b.file_uuid && shown.has(b.file_uuid)) break;
            const ref = files.get(b.file_uuid) || R.fileRef({ kind: 'claude-file', id: b.file_uuid, name: `image-${String(b.file_uuid).slice(0, 8)}`, mime: 'image/*', from: m.sender === 'human' ? 'user' : 'assistant' });
            msg.blocks.push(R.block.image(R.addFile(conv, ref)));
            break;
          }
          default:
            msg.blocks.push(R.block.unsupported(b.type || 'unknown', b));
        }
      }
      if (!sawText && !blocks.length && m.text) msg.blocks.push(R.block.text(m.text));
      if (m.sender !== 'human') msg.blocks.push(...fileBlocks);
    }

    function attachResult(b, msg, files) {
      const tool = pendingTools.get(b.tool_use_id);
      const output = toolOutput(b, conv, files, wiggle);
      if (tool) {
        tool.output.push(...output);
        tool.isError = tool.isError || Boolean(b.is_error);
        pendingTools.delete(b.tool_use_id);
      } else {
        msg.blocks.push(R.block.tool({ name: b.name || 'tool result', input: null, output, isError: Boolean(b.is_error) }));
        notes.push('A tool result had no matching call.');
      }
    }

    function replayArtifact(input, tool) {
      const id = input.id;
      if (!id) return;
      const art = artifacts.get(id) || { id, title: input.title, type: input.type, language: input.language, content: '', block: tool, failed: 0 };
      if (input.title) art.title = input.title;
      if (input.type) art.type = input.type;
      if (input.language) art.language = input.language;
      if (input.command === 'create' || input.command === 'rewrite') {
        art.content = input.content || '';
        art.block = tool;
      } else if (input.command === 'update') {
        const from = input.old_str;
        const at = typeof from === 'string' ? art.content.indexOf(from) : -1;
        if (at === -1) art.failed++;
        else {
          art.content = art.content.slice(0, at) + (input.new_str || '') + art.content.slice(at + from.length);
          art.block = tool;
        }
      }
      artifacts.set(id, art);
    }

    // Tool calls that never got a result.
    pendingTools.forEach(tool => { tool.noResult = true; });

    // Final artifact versions become files, linked from their last change.
    artifacts.forEach(art => {
      if (!art.content) return;
      const ref = R.addFile(conv, R.fileRef({ kind: 'claude-artifact', id: art.id, name: artifactName(art), mime: art.type || 'text/plain', from: 'assistant' }));
      ref.text = art.content;
      art.block.output.push(R.output.file(ref));
      if (art.failed) notes.push(`Artifact "${art.title || art.id}": ${art.failed} edit${art.failed === 1 ? '' : 's'} could not be applied; the file holds the last version that could be rebuilt.`);
    });

    // Files only the older file list knows about.
    const named = new Set(conv.files.map(f => f.name.toLowerCase()));
    wiggle.forEach(ref => { if (!named.has(ref.name.toLowerCase())) R.addFile(conv, ref); });

    if (hiddenThinking) {
      notes.push(`${hiddenThinking} thinking block${hiddenThinking === 1 ? ' is a summary' : 's are summaries'} only (Claude does not send the full text).`);
    }
    return R.finish(conv, { complete, reason });
  }

  // ---------- fetch (browser) ----------

  async function getJson(path) {
    const r = await fetch(path, { credentials: 'include' });
    if (!r.ok) throw new R.FetchError(PLATFORM, r.status, `HTTP ${r.status}`);
    return r.json();
  }

  function cookieOrg() {
    const m = (globalThis.document && document.cookie || '').match(/(?:^|;\s*)lastActiveOrg=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  async function fetchConversation(id) {
    const orgs = await getJson('/api/organizations');
    const chat = (Array.isArray(orgs) ? orgs : []).filter(o => (o.capabilities || []).includes('chat')).map(o => o.uuid);
    const first = cookieOrg();
    const order = [...new Set([first, ...chat].filter(o => o && chat.includes(o)))];
    if (!order.length) throw new R.FetchError(PLATFORM, 0, 'no chat organization on this account');
    let last = 0;
    for (const org of order) {
      const r = await fetch(`/api/organizations/${org}/chat_conversations/${id}?tree=True&rendering_mode=messages&render_all_tools=true`, { credentials: 'include' });
      if (r.ok) return { org, data: await r.json() };
      last = r.status;
      if (r.status !== 403 && r.status !== 404) break;
    }
    throw new R.FetchError(PLATFORM, last, `Could not read Claude's conversation data: HTTP ${last}.`);
  }

  async function fetchWiggleFiles(org, id) {
    try {
      const r = await fetch(`/api/organizations/${org}/conversations/${id}/wiggle/list-files?prefix=`, { credentials: 'include' });
      if (!r.ok) return [];
      const j = await r.json();
      return j && j.success && Array.isArray(j.files) ? j.files : [];
    } catch (e) {
      return [];
    }
  }

  async function extract(location) {
    const ref = conversationRef(location);
    if (!ref) throw new R.FetchError(PLATFORM, 0, 'This page is not a Claude conversation.');
    const { org, data } = await fetchConversation(ref.id);
    const wiggleFiles = await fetchWiggleFiles(org, ref.id);
    const conversation = parse(data, { url: `https://claude.ai/chat/${ref.id}`, wiggleFiles });
    return { conversation, ctx: { org, id: ref.id } };
  }

  // Resolves a FileRef to a Blob. Throws FetchError with the reason.
  async function fetchFile(file, ctx) {
    if (file.text !== undefined) return new Blob([file.text], { type: 'text/plain;charset=utf-8' });
    let path;
    if (file.kind === 'claude-file') path = `/api/organizations/${ctx.org}/files/${file.id}/contents`;
    else if (file.kind === 'claude-wiggle') path = `/api/organizations/${ctx.org}/conversations/${ctx.id}/wiggle/download-file?path=${encodeURIComponent(file.id)}`;
    else throw new R.FetchError(PLATFORM, 0, `unknown file kind ${file.kind}`);
    const r = await fetch(path, { credentials: 'include' });
    if (!r.ok) throw new R.FetchError(PLATFORM, r.status, `HTTP ${r.status}`);
    return r.blob();
  }

  globalThis.Recurate = Object.assign(globalThis.Recurate || {}, {
    platforms: Object.assign((globalThis.Recurate && globalThis.Recurate.platforms) || {}, {
      claude: { id: PLATFORM, matches, conversationRef, parse, extract, fetchFile, insertCitations },
    }),
  });
})();
