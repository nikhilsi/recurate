// Recurate Copier: Grok adapter.
// Reads Grok's own conversation data (spec section 4.3), never the page.
// parse() is pure: data in, Conversation out. The fetch steps run in the page.

(function () {
  'use strict';

  const R = globalThis.Recurate;
  const PLATFORM = 'grok';
  const ASSETS = 'https://assets.grok.com/';
  const BATCH = 50;

  // Response fields Copier does not map yet. When one carries data it is
  // kept as a labeled block instead of being dropped.
  const UNMAPPED = [
    'imageAttachments', 'imageEditUris', 'webpageUrls', 'ragResults', 'citedRagResults',
    'connectorSearchResults', 'citedConnectorSearchResults', 'collectionSearchResults',
    'citedCollectionSearchResults', 'searchProductResults', 'toolResponses', 'streamErrors',
  ];

  function matches(location) {
    return location.hostname === 'grok.com';
  }

  function conversationRef(location) {
    const m = location.pathname.match(/^\/(?:c|chat)\/([0-9a-f-]{36})(?:[/?#]|$)/i);
    if (!m) return null;
    const rid = new URLSearchParams(location.search || '').get('rid');
    return { id: m[1], rid: rid || null };
  }

  // ---------- parse (pure) ----------

  function linkItem(item) {
    if (!item || typeof item !== 'object') return null;
    const url = item.url || item.link || (item.postId ? `https://x.com/i/status/${item.postId}` : null);
    const title = item.title || item.name || (item.username ? `@${item.username}` : null) || url;
    return url || title ? { title, url } : null;
  }

  function seconds(start, end) {
    const s = Date.parse(start);
    const e = Date.parse(end);
    return Number.isFinite(s) && Number.isFinite(e) && e >= s ? Math.round((e - s) / 1000) : null;
  }

  // nodes: response-node data; responses: load-responses data.
  function parse(nodesData, responsesData, { url = null, rid = null, title = null, exportedAt } = {}) {
    const nodes = nodesData && nodesData.responseNodes;
    const list = responsesData && responsesData.responses;
    if (!Array.isArray(nodes) || !Array.isArray(list)) {
      throw new R.StructuralError(PLATFORM, "Grok's data has no response list");
    }
    const conv = R.createConversation({ platform: PLATFORM, title, url, exportedAt });
    const notes = conv.completeness.notes;
    const byId = new Map(list.map(r => [r.responseId, r]));
    const nodeById = new Map(nodes.map(n => [n.responseId, n]));
    const children = new Map();
    nodes.forEach(n => children.set(n.parentResponseId, (children.get(n.parentResponseId) || 0) + 1));
    const roots = nodes.filter(n => !nodeById.has(n.parentResponseId));

    let leaf = rid && nodeById.has(rid) ? rid : null;
    if (rid && !leaf) notes.push('The reply named in the page address is not in the data; the newest branch was exported.');
    if (leaf && children.get(leaf)) notes.push('Exported up to the reply named in the page address; later replies exist on another branch.');
    if (!leaf) {
      const leaves = nodes.filter(n => !children.get(n.responseId));
      leaves.sort((a, b) => String((byId.get(b.responseId) || {}).createTime).localeCompare(String((byId.get(a.responseId) || {}).createTime)));
      leaf = leaves[0] && leaves[0].responseId;
      if (leaf && !rid && leaves.length > 1) notes.push('The page address named no reply; the newest branch was exported.');
    }

    const chain = [];
    const seen = new Set();
    let cur = leaf;
    let last = null;
    while (cur && nodeById.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      last = nodeById.get(cur);
      chain.push(last);
      cur = last.parentResponseId;
    }
    chain.reverse();
    if (!chain.length) throw new R.StructuralError(PLATFORM, "Grok's data has no replies on the active branch");
    let complete = true;
    let reason = null;
    if (cur && seen.has(cur)) { complete = false; reason = 'the reply links loop back on themselves'; }
    else if (roots.length !== 1) { complete = false; reason = `the data has ${roots.length} starting points instead of one, so a reply may be missing`; }
    else if (last !== roots[0]) { complete = false; reason = 'the walk did not reach the start of the conversation'; }

    let citationTags = 0;
    let otherTags = 0;
    let prev = null;
    for (const node of chain) {
      const r = byId.get(node.responseId);
      if (!r) {
        complete = false;
        reason = reason || 'a reply listed in the conversation could not be loaded';
        continue;
      }
      const role = r.sender === 'human' || node.sender === 'human' ? 'user' : 'assistant';
      let msg;
      if (role === 'assistant' && prev && prev.role === 'assistant') msg = prev;
      else {
        msg = R.createMessage(role, { createdAt: r.createTime || null, model: role === 'assistant' ? r.model || null : null });
        conv.messages.push(msg);
      }
      prev = msg;
      const from = role === 'user' ? 'user' : 'assistant';

      // Thinking: step headers and how long it took.
      const stepText = (r.steps || []).flatMap(s => (Array.isArray(s.text) ? s.text : [])).filter(Boolean);
      const secs = seconds(r.thinkingStartTime, r.thinkingEndTime);
      if (stepText.length || secs !== null) {
        msg.blocks.push(R.block.thinking(secs !== null ? `Thought for ${secs}s` : '', stepText.join('\n')));
      }

      // Files: uploads and generated images, deduped by storage key.
      const seenKeys = new Set();
      const fileBlocks = [];
      const addAsset = ({ key, name, mime, size }) => {
        if (!key || seenKeys.has(key)) return null;
        seenKeys.add(key);
        const ref = R.addFile(conv, R.fileRef({ kind: 'grok-asset', id: key, name: name || key.split('/').pop(), mime, size, from }));
        return ref;
      };

      // Image generation: one tool step per card, prompt in, image out.
      (r.cardAttachmentsJson || []).forEach(raw => {
        let card;
        try { card = JSON.parse(raw); } catch (e) { msg.blocks.push(R.block.unsupported('card', raw)); return; }
        const img = card && card.image_chunk;
        if (img && img.imageUrl) {
          const ext = (img.mimeType || 'image/jpeg').split('/')[1] || 'jpg';
          const asset = (r.fileAttachmentAssetMetadata || []).find(a => a.key === img.imageUrl);
          const ref = addAsset({ key: img.imageUrl, name: `${img.imageTitle || 'image'}.${ext === 'jpeg' ? 'jpg' : ext}`, mime: img.mimeType || 'image/jpeg', size: asset ? asset.sizeBytes : null });
          const input = { prompt: card.prompt || null, model: img.imageModel || null };
          msg.blocks.push(R.block.tool({ name: 'image generation', input, output: ref ? [R.output.file(ref)] : [] }));
        } else {
          msg.blocks.push(R.block.unsupported(card.cardType || card.type || 'card', card));
        }
      });
      (r.fileAttachmentAssetMetadata || []).forEach(a => {
        const ref = addAsset({ key: a.key, name: a.name, mime: a.mimeType, size: a.sizeBytes });
        if (ref) fileBlocks.push((ref.mime || '').startsWith('image/') ? R.block.image(ref) : R.block.file(ref));
      });
      (r.fileAttachmentsMetadata || []).forEach(a => {
        const ref = addAsset({ key: a.fileUri || a.parsedFileUri, name: a.fileName, mime: a.fileMimeType });
        if (ref) fileBlocks.push((ref.mime || '').startsWith('image/') ? R.block.image(ref) : R.block.file(ref));
      });
      (r.generatedImageUrls || []).forEach(u => {
        const ref = addAsset({ key: String(u).replace(ASSETS, ''), mime: 'image/*' });
        if (ref) fileBlocks.push(R.block.image(ref));
      });
      if (role === 'user') msg.blocks.push(...fileBlocks);

      // Searches Grok ran, kept whole as tool steps.
      const searched = (r.webSearchResults || []).map(linkItem).filter(Boolean);
      if (searched.length) msg.blocks.push(R.block.tool({ name: 'web search', input: r.query ? { query: r.query } : null, output: [R.output.links(searched)] }));
      const posts = (r.xposts || []).map(linkItem).filter(Boolean);
      if (posts.length) msg.blocks.push(R.block.tool({ name: 'X search', input: null, output: [R.output.links(posts)] }));
      (r.steps || []).forEach(s => {
        ['toolUsageCards', 'toolUsageResults'].forEach(k => {
          if (Array.isArray(s[k]) && s[k].length) msg.blocks.push(R.block.tool({ name: k === 'toolUsageCards' ? 'tool' : 'tool result', input: null, output: s[k].map(v => R.output.json(v)) }));
        });
      });
      UNMAPPED.forEach(k => {
        if (Array.isArray(r[k]) && r[k].length) msg.blocks.push(R.block.tool({ name: `Grok data: ${k}`, input: null, output: [R.output.json(r[k])] }));
      });

      // Cited sources go in the message's sources list.
      [...(r.citedWebSearchResults || []), ...(r.citedXposts || [])].map(linkItem).filter(Boolean)
        .forEach(item => R.addSource(msg, item.title, item.url));

      let text = r.message || '';
      // Inline render tags: image cards are already shown as image generation
      // steps, so they go quietly; citation and other tags are counted.
      text = text.replace(/<grok:render\b([^>]*)>[\s\S]*?<\/grok:render>/g, (m, attrs) => {
        const type = (attrs.match(/\btype="([^"]+)"/) || [])[1] || '';
        if (/image/i.test(type)) return '';
        if (/citation/i.test(type)) citationTags++; else otherTags++;
        return '';
      });
      if (text.trim()) msg.blocks.push(R.block.text(text));
      if (role !== 'user') msg.blocks.push(...fileBlocks);
    }

    if (citationTags) notes.push(`${citationTags} inline citation tag${citationTags === 1 ? '' : 's'} removed from the text; cited sources are listed after each reply.`);
    if (otherTags) notes.push(`${otherTags} other inline Grok tag${otherTags === 1 ? '' : 's'} removed from the text.`);
    const models = [...new Set(conv.messages.map(m => m.model).filter(Boolean))];
    if (models.length) conv.modelNote = `Models: ${models.join(', ')}`;
    const lastReply = byId.get(chain[chain.length - 1].responseId);
    if ((lastReply && lastReply.partial === true) || (nodesData.inflightResponses || []).length) {
      notes.push('The last reply was still being written when this was exported.');
    }
    return R.finish(conv, { complete, reason });
  }

  // ---------- fetch (browser) ----------

  async function getJson(path, init) {
    const r = await fetch(path, { credentials: 'include', ...init });
    if (!r.ok) throw new R.FetchError(PLATFORM, r.status, `Could not read Grok's conversation data: HTTP ${r.status}.`);
    return r.json();
  }

  function pageTitle() {
    const t = (globalThis.document && document.title || '').replace(/\s*[-\u2013\u2014|]\s*Grok\s*$/i, '').trim();
    return t && t !== 'Grok' ? t : null;
  }

  async function extract(location) {
    const ref = conversationRef(location);
    if (!ref) throw new R.FetchError(PLATFORM, 0, 'This page is not a Grok conversation.');
    const nodesData = await getJson(`/rest/app-chat/conversations/${ref.id}/response-node?includeThreads=true`);
    const ids = (nodesData.responseNodes || []).map(n => n.responseId);
    const responses = [];
    for (let i = 0; i < ids.length; i += BATCH) {
      const page = await getJson(`/rest/app-chat/conversations/${ref.id}/load-responses`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ responseIds: ids.slice(i, i + BATCH) }),
      });
      responses.push(...(page.responses || []));
    }
    const conversation = parse(nodesData, { responses }, { url: `https://grok.com/c/${ref.id}`, rid: ref.rid, title: pageTitle() });
    return { conversation, ctx: { id: ref.id } };
  }

  async function fetchFile(file) {
    const r = await fetch(ASSETS + file.id, { credentials: 'include' });
    if (!r.ok) throw new R.FetchError(PLATFORM, r.status, `HTTP ${r.status}`);
    return r.blob();
  }

  globalThis.Recurate = Object.assign(globalThis.Recurate || {}, {
    platforms: Object.assign((globalThis.Recurate && globalThis.Recurate.platforms) || {}, {
      grok: { id: PLATFORM, matches, conversationRef, parse, extract, fetchFile },
    }),
  });
})();
