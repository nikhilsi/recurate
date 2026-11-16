// Recurate Copier: ChatGPT adapter.
// Reads ChatGPT's own conversation data (spec section 4.2), never the page.
// parse() is pure: data in, Conversation out. The fetch steps run in the page.

(function () {
  'use strict';

  const R = globalThis.Recurate;
  const PLATFORM = 'chatgpt';
  const SKIP_CONTEXT = new Set(['user_editable_context', 'model_editable_context']);
  const MARKER_SEQUENCE = /\uE200[^\uE201]*\uE201/g;
  const STRAY_MARKER = /[\uE200-\uE2FF]/g;

  function matches(location) {
    return location.hostname === 'chatgpt.com' || location.hostname === 'chat.openai.com';
  }

  // Covers /c/{id} and /g/{gpt-or-project}/c/{id}.
  function conversationRef(location) {
    const m = location.pathname.match(/\/c\/([0-9a-f-]{20,})(?:[/?#]|$)/i);
    return m ? { id: m[1] } : null;
  }

  // ---------- parse (pure) ----------

  const isoFromSeconds = s => (typeof s === 'number' ? new Date(s * 1000).toISOString() : null);

  function pointerId(pointer) {
    return String(pointer || '').replace(/^[a-z-]+:\/\//i, '');
  }

  function cpIndex(text, utf16Index) {
    return Array.from(text.slice(0, utf16Index)).length;
  }

  // Replaces ChatGPT's private-use citation markers using the message's
  // content_references. Offsets are code points (checked live: 30 of 34
  // matches by code point after an emoji, 0 by UTF-16 unit).
  function replaceReferences(text, refs, message, counts) {
    const cps = Array.from(text);
    const edits = [];
    const taken = [];
    const overlaps = (s, e) => taken.some(([a, b]) => s < b && a < e);

    (refs || []).forEach(ref => {
      if (!ref || !ref.matched_text) return;
      const target = Array.from(ref.matched_text);
      let start = -1;
      if (typeof ref.start_idx === 'number' && cps.slice(ref.start_idx, ref.start_idx + target.length).join('') === ref.matched_text) {
        start = ref.start_idx;
      } else {
        let from = text.length;
        while (from >= 0) {
          const at = text.lastIndexOf(ref.matched_text, from);
          if (at === -1) break;
          const s = cpIndex(text, at);
          if (!overlaps(s, s + target.length)) { start = s; break; }
          from = at - 1;
        }
      }
      if (start === -1) { counts.unmatched++; return; }
      const end = start + target.length;
      if (overlaps(start, end)) return;
      taken.push([start, end]);
      edits.push({ start, end, ref });
    });

    // Number sources in reading order, then splice from the end backwards.
    edits.sort((a, b) => a.start - b.start).forEach(e => { e.replacement = replacementFor(e.ref, message, counts); });
    edits.sort((a, b) => b.start - a.start).forEach(e => { cps.splice(e.start, e.end - e.start, e.replacement); });

    let out = cps.join('');
    out = out.replace(MARKER_SEQUENCE, () => { counts.unmatched++; return ''; });
    out = out.replace(STRAY_MARKER, '');
    return out;
  }

  function markers(numbers) {
    return [...new Set(numbers)].sort((a, b) => a - b).map(n => `[${n}]`).join('');
  }

  function replacementFor(ref, message, counts) {
    switch (ref.type) {
      case 'grouped_webpages': {
        const items = (ref.items && ref.items.length ? ref.items : ref.fallback_items) || [];
        return markers(items.filter(i => i && (i.url || i.title)).map(i => R.addSource(message, i.title, i.url)));
      }
      case 'url': {
        const url = (ref.item && ref.item.url) || (ref.safe_urls && ref.safe_urls[0]) || null;
        return url || ref.title ? markers([R.addSource(message, ref.title || (ref.item && ref.item.title), url)]) : '';
      }
      case 'sources_footnote':
        (ref.sources || []).forEach(s => R.addSource(message, s.title, s.url));
        return '';
      case 'entity':
      case 'entity_metadata':
      case 'image_group':
      case 'alt_text':
      case 'followup_a':
        return ref.alt || ref.name || '';
      case 'file':
        return `[file: ${ref.name || 'file'}]`;
      case 'hidden':
        return '';
      default:
        counts.placeholders++;
        return `[${ref.type || 'reference'}]`;
    }
  }

  // Raw tool output keeps its source markers, made readable: U+E200 cite
  // U+E202 turn0search0 U+E201 becomes [cite turn0search0].
  function visibleMarkers(text) {
    return String(text ?? '')
      .replace(/\uE200/g, '[')
      .replace(/\uE201/g, ']')
      .replace(/[\uE202-\uE2FF]/g, ' ');
  }

  function partsText(content) {
    return ((content && content.parts) || []).filter(p => typeof p === 'string').join('');
  }

  function parse(data, { url = null, exportedAt } = {}) {
    const map = data && data.mapping;
    if (!map || typeof map !== 'object' || Array.isArray(map)) {
      throw new R.StructuralError(PLATFORM, "ChatGPT's data has no message tree");
    }
    const conv = R.createConversation({ platform: PLATFORM, id: data.conversation_id || null, title: data.title || null, url, exportedAt });
    const notes = conv.completeness.notes;

    let leaf = data.current_node;
    if (!leaf || !map[leaf]) {
      const newest = Object.values(map).filter(n => n.message).sort((a, b) => (b.message.create_time || 0) - (a.message.create_time || 0))[0];
      leaf = newest && newest.id;
      if (leaf) notes.push("ChatGPT's data named no current message; the newest message's branch was exported.");
    }
    const chain = [];
    const seen = new Set();
    let cur = leaf;
    let last = null;
    while (cur && map[cur] && !seen.has(cur)) {
      seen.add(cur);
      last = map[cur];
      chain.push(last);
      cur = last.parent;
    }
    chain.reverse();
    let complete = true;
    let reason = null;
    if (cur && seen.has(cur)) { complete = false; reason = 'the message links loop back on themselves'; }
    else if (cur && !map[cur]) { complete = false; reason = 'a parent message is missing from the data'; }
    else if (!last || last.parent !== null || last.message) { complete = false; reason = 'the walk did not reach the start of the conversation'; }

    const counts = { unmatched: 0, placeholders: 0, hiddenTool: 0, hiddenThinking: 0, skippedContext: 0 };
    const models = [];
    const attachmentsById = new Map();
    let turn = null;          // current assistant turn
    let pending = [];         // tool blocks waiting for output, in call order

    function fileFor(id, { name, mime, size, from }) {
      const att = attachmentsById.get(id);
      return R.addFile(conv, R.fileRef({
        kind: 'chatgpt-file', id, name: (att && att.name) || name || `image-${id.replace(/^file[-_]/, "").slice(-12)}`,
        mime: (att && att.mime_type) || mime || null, size: (att && att.size) || size || null, from,
      }));
    }

    function imagePart(p, from) {
      const id = pointerId(p.asset_pointer);
      return R.block.image(fileFor(id, { mime: p.mime_type || 'image/*', size: p.size_bytes, from }));
    }

    function assistantTurn(m) {
      if (!turn) {
        turn = R.createMessage('assistant', { createdAt: isoFromSeconds(m.create_time) });
        conv.messages.push(turn);
        pending = [];
      }
      return turn;
    }

    for (const node of chain) {
      const m = node.message;
      if (!m) continue;
      const role = m.author && m.author.role;
      const content = m.content || {};
      const ct = content.content_type;
      const hidden = Boolean(m.metadata && m.metadata.is_visually_hidden_from_conversation);
      const toAll = !m.recipient || m.recipient === 'all';
      ((m.metadata && m.metadata.attachments) || []).forEach(a => { if (a && a.id) attachmentsById.set(a.id, a); });

      if (role === 'system') continue;
      if (role === 'user' && (SKIP_CONTEXT.has(ct) || hidden)) { counts.skippedContext++; continue; }

      if (role === 'user') {
        turn = null;
        pending = [];
        const msg = R.createMessage('user', { createdAt: isoFromSeconds(m.create_time) });
        conv.messages.push(msg);
        const shown = new Set();
        if (ct === 'text' || ct === 'multimodal_text') {
          (content.parts || []).forEach(p => {
            if (typeof p === 'string') { if (p) msg.blocks.push(R.block.text(p)); }
            else if (p && p.content_type === 'image_asset_pointer') { msg.blocks.push(imagePart(p, 'user')); shown.add(pointerId(p.asset_pointer)); }
            else if (p) msg.blocks.push(R.block.unsupported(p.content_type || 'part', p));
          });
        } else {
          msg.blocks.push(R.block.unsupported(ct || 'content', content));
        }
        ((m.metadata && m.metadata.attachments) || []).forEach(a => {
          if (!a || !a.id || shown.has(a.id)) return;
          const ref = fileFor(a.id, { name: a.name, mime: a.mime_type, size: a.size, from: 'user' });
          msg.blocks.unshift((a.mime_type || '').startsWith('image/') ? R.block.image(ref) : R.block.file(ref));
        });
        continue;
      }

      if (role === 'assistant' && !toAll) {
        const t = assistantTurn(m);
        let input = ct === 'code' ? (content.text ?? '') : partsText(content) || content.text || null;
        if (typeof input === 'string') { try { input = JSON.parse(input); } catch (e) { /* keep text */ } }
        const tool = R.block.tool({ name: m.recipient, input });
        t.blocks.push(tool);
        pending.push(tool);
        continue;
      }

      if (role === 'tool') {
        const t = assistantTurn(m);
        if (hidden) counts.hiddenTool++;
        const output = [];
        if (ct === 'execution_output' || ct === 'code') output.push(R.output.text(visibleMarkers(content.text)));
        else if (ct === 'text') output.push(R.output.text(visibleMarkers(partsText(content))));
        else if (ct === 'multimodal_text') {
          (content.parts || []).forEach(p => {
            if (typeof p === 'string') { if (p) output.push(R.output.text(visibleMarkers(p))); }
            else if (p && p.content_type === 'image_asset_pointer') output.push(R.output.file(fileFor(pointerId(p.asset_pointer), { mime: p.mime_type || 'image/*', size: p.size_bytes, from: 'assistant' })));
            else if (p) output.push(R.output.json(p));
          });
        } else if (ct === 'tether_browsing_display') {
          const text = [content.summary, content.result].filter(Boolean).join('\n\n');
          if (text) output.push(R.output.text(visibleMarkers(text)));
        } else {
          output.push(R.output.json(content));
        }
        const name = m.author && m.author.name;
        const idx = pending.findIndex(p => p.name === name);
        const tool = idx >= 0 ? pending.splice(idx, 1)[0] : pending.shift();
        if (tool) tool.output.push(...output);
        else t.blocks.push(R.block.tool({ name: name || 'tool', input: null, output }));
        continue;
      }

      if (role === 'assistant') {
        const t = assistantTurn(m);
        const slug = m.metadata && m.metadata.model_slug;
        if (slug) { t.model = slug; if (!models.includes(slug)) models.push(slug); }
        if (ct === 'text' || ct === 'multimodal_text') {
          (content.parts || []).forEach(p => {
            if (typeof p === 'string') {
              const text = replaceReferences(p, m.metadata && m.metadata.content_references, t, counts);
              if (text.trim()) t.blocks.push(R.block.text(text));
            } else if (p && p.content_type === 'image_asset_pointer') t.blocks.push(imagePart(p, 'assistant'));
            else if (p) t.blocks.push(R.block.unsupported(p.content_type || 'part', p));
          });
        } else if (ct === 'thoughts') {
          if (hidden) counts.hiddenThinking++;
          (content.thoughts || []).forEach(th => t.blocks.push(R.block.thinking(th.summary || '', th.content || '', hidden)));
        } else if (ct === 'reasoning_recap') {
          if (content.content) t.blocks.push(R.block.thinking(content.content, ''));
        } else if (ct === 'code') {
          t.blocks.push(R.block.text('```' + (content.language || '') + '\n' + (content.text || '') + '\n```'));
        } else {
          t.blocks.push(R.block.unsupported(ct || 'content', content));
        }
        continue;
      }

      // Any other role.
      assistantTurn(m).blocks.push(R.block.unsupported(`${role || 'unknown'} message`, content));
    }

    // Tool calls that never got output.
    conv.messages.forEach(msg => msg.blocks.forEach(b => {
      if (b.type === 'tool' && !b.output.length && b.input !== null) b.noResult = true;
    }));

    if (models.length) conv.modelNote = `Models: ${models.join(', ')}`;
    if (counts.hiddenTool) notes.push(`${counts.hiddenTool} tool output${counts.hiddenTool === 1 ? ' is' : 's are'} hidden in ChatGPT's view and included here.`);
    if (counts.unmatched) notes.push(`${counts.unmatched} citation marker${counts.unmatched === 1 ? '' : 's'} could not be matched and ${counts.unmatched === 1 ? 'was' : 'were'} removed.`);
    if (counts.placeholders) notes.push(`${counts.placeholders} widget reference${counts.placeholders === 1 ? ' is' : 's are'} shown as a placeholder.`);
    if (counts.skippedContext) notes.push(`${counts.skippedContext} hidden context message${counts.skippedContext === 1 ? '' : 's'} (custom instructions or memory) skipped.`);
    if (!chain.some(n => n.message)) throw new R.StructuralError(PLATFORM, "ChatGPT's data has no messages on the active branch");
    return R.finish(conv, { complete, reason });
  }

  // ---------- fetch (browser) ----------

  let token = null;

  async function authHeaders() {
    if (!token) {
      const r = await fetch('/api/auth/session', { credentials: 'include' });
      if (!r.ok) throw new R.FetchError(PLATFORM, r.status, `Could not read your ChatGPT session: HTTP ${r.status}.`);
      const s = await r.json();
      if (!s || !s.accessToken) throw new R.FetchError(PLATFORM, 401, 'You are not signed in to ChatGPT.');
      token = s.accessToken;
    }
    return { Authorization: `Bearer ${token}` };
  }

  async function extract(location) {
    const ref = conversationRef(location);
    if (!ref) throw new R.FetchError(PLATFORM, 0, 'This page is not a ChatGPT conversation.');
    token = null;
    const r = await fetch(`/backend-api/conversation/${ref.id}`, { headers: await authHeaders(), credentials: 'include' });
    if (!r.ok) throw new R.FetchError(PLATFORM, r.status, `Could not read ChatGPT's conversation data: HTTP ${r.status}.`);
    const conversation = parse(await r.json(), { url: `https://chatgpt.com/c/${ref.id}` });
    return { conversation, ctx: { id: ref.id } };
  }

  async function fetchFile(file, ctx) {
    const meta = await fetch(`/backend-api/files/download/${encodeURIComponent(file.id)}?conversation_id=${ctx.id}&inline=false`, { headers: await authHeaders(), credentials: 'include' });
    if (!meta.ok) throw new R.FetchError(PLATFORM, meta.status, `HTTP ${meta.status}`);
    const info = await meta.json();
    if (!info || !info.download_url) throw new R.FetchError(PLATFORM, 0, (info && info.status) || 'no download link');
    const r = await fetch(info.download_url, { credentials: 'include' });
    if (!r.ok) throw new R.FetchError(PLATFORM, r.status, `HTTP ${r.status}`);
    return r.blob();
  }

  globalThis.Recurate = Object.assign(globalThis.Recurate || {}, {
    platforms: Object.assign((globalThis.Recurate && globalThis.Recurate.platforms) || {}, {
      chatgpt: { id: PLATFORM, matches, conversationRef, parse, extract, fetchFile, replaceReferences },
    }),
  });
})();
