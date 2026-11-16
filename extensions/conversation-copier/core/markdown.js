// Recurate Copier: Conversation to Markdown.
// The one export format. Reads the plain-data model from core/model.js.
// Loads in a content script and in Node tests (registers on globalThis.Recurate).

(function () {
  'use strict';

  // A fence longer than any backtick run inside the content, so tool output
  // that holds code fences cannot end the block early.
  function fenceFor(content) {
    const runs = String(content).match(/`+/g) || [];
    const longest = runs.reduce((max, run) => Math.max(max, run.length), 0);
    return '`'.repeat(Math.max(3, longest + 1));
  }

  function fenced(content, lang = '') {
    const text = String(content);
    const fence = fenceFor(text);
    return `${fence}${lang}\n${text}\n${fence}`;
  }

  function quote(text) {
    return String(text).split('\n').map(line => (line ? `> ${line}` : '>')).join('\n');
  }

  function escapeHtml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Angle-bracket link targets survive spaces and parentheses in paths.
  function target(url) {
    return `<${String(url).replace(/[<>\n\r]/g, c => encodeURIComponent(c))}>`;
  }

  function link(title, url) {
    const label = String(title || url).replace(/\s+/g, ' ').replace(/[[\]]/g, c => `\\${c}`);
    return `[${label}](${target(url)})`;
  }

  // A path inside the ZIP: "#" and "%" are encoded so a file named
  // "Invoice #12.pdf" is not read as a link to "Invoice " plus a fragment.
  const local = path => String(path).replace(/[%#]/g, c => encodeURIComponent(c));

  // Keeps one message's text from spilling into the rest of the file: an
  // unclosed code fence is closed, and a line that opens an HTML comment
  // outside code is escaped (an unclosed one hides everything after it).
  function contain(text) {
    const lines = String(text).split('\n');
    const { inside, open } = globalThis.Recurate.fenceScan(lines);
    const out = lines.map((line, i) => (inside[i] ? line : line.replace(/^( {0,3})<!--/, '$1&lt;!--')));
    // Closed at the column it opened at, so a block inside a list item ends there.
    if (open) out.push(' '.repeat(open.col) + open.fence);
    return out.join('\n');
  }

  function parts(date, timeZone) {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    return Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
  }

  // "2026-11-15 14:02" in the reader's time zone.
  function formatTime(value, timeZone) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const p = parts(date, timeZone);
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
  }

  function formatExported(value, timeZone) {
    return new Date(value).toLocaleString('en-US', {
      timeZone, year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    });
  }

  function plural(n, word) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
  }

  function describeMessages(c) {
    const m = c.completeness.messages;
    const name = c.platformName;
    const source = m.method === 'scroll'
      ? 'collected from the page by scrolling'
      : `read from ${name}'s conversation data`;
    if (!m.complete) {
      const counted = m.expected ? `${m.got} of ${m.expected} messages` : plural(m.got, 'message');
      return `${counted}, may be partial (${m.reason || 'completeness could not be confirmed'})`;
    }
    if (m.noTotal) return `${plural(m.got, 'message')} (all pages read; ${name} gives no total)`;
    if (m.expected) return `${m.got} of ${m.expected} messages, complete (${source})`;
    return `${plural(m.got, 'message')}, complete (${source})`;
  }

  function describeFiles(c, mode) {
    const total = c.files.length;
    if (total === 0) return null;
    if (mode !== 'zip') return `${plural(total, 'file')} in this chat. Use Export to download them.`;
    const { got, failed } = c.completeness.files;
    let line = `${got} of ${total} downloaded.`;
    if (failed.length) line += ` ${failed.length} failed (listed where they belong).`;
    return line;
  }

  function header(c, opts) {
    const lines = [`# ${c.title || `Conversation with ${c.platformName}`}`, ''];
    const row = (label, value) => { if (value) lines.push(`- **${label}:** ${value}`); };
    row('Platform', c.platformName);
    row('Link', c.url ? target(c.url) : null);
    row('Exported', formatExported(c.exportedAt, opts.timeZone));
    row('Model', c.modelNote);
    row('Messages', describeMessages(c));
    row('Files', describeFiles(c, opts.mode));
    if (c.completeness.notIncluded.length) row('Not included', c.completeness.notIncluded.join(' '));
    if (c.completeness.notes.length) row('Notes', c.completeness.notes.join(' '));
    lines.push('', '---', '');
    return lines.join('\n');
  }

  function failureFor(file, c) {
    const hit = c.completeness.files.failed.find(f => f.key === file.key);
    return hit ? hit.reason : null;
  }

  function renderFile(file, c, opts, { image = false } = {}) {
    const label = image ? 'Image' : 'File';
    const path = opts.paths && opts.paths[file.key];
    if (path) return image ? `![${file.name.replace(/[[\]]/g, '')}](${target(local(path))})` : link(file.name, local(path));
    const reason = failureFor(file, c);
    if (reason) return `[${label}: ${file.name}, could not be downloaded: ${reason}]`;
    return `[${label}: ${file.name}]`;
  }

  function renderJson(value) {
    if (typeof value === 'string') return fenced(value, 'text');
    let text;
    try { text = JSON.stringify(value, null, 2); } catch (e) { text = String(value); }
    return fenced(text ?? 'null', 'json');
  }

  function renderOutputPart(part, c, opts) {
    switch (part.kind) {
      case 'text': return fenced(part.text, 'text');
      case 'links': return part.items.map(item => `- ${item.url ? link(item.title, item.url) : item.title}`).join('\n');
      case 'file': return renderFile(part.file, c, opts, { image: (part.file.mime || '').startsWith('image/') });
      case 'json': return renderJson(part.value);
      default: return renderJson(part);
    }
  }

  function renderTool(b, c, opts) {
    const out = [`<details>`, `<summary>Tool: ${escapeHtml(b.name)}${b.isError ? ' (error)' : ''}</summary>`, ''];
    if (b.input !== null && b.input !== undefined && !(typeof b.input === 'object' && Object.keys(b.input).length === 0)) {
      out.push('**Input**', '', renderJson(b.input), '');
    }
    out.push('**Output**', '');
    if (b.noResult) {
      out.push('(no result recorded)', '');
    } else if (!b.output.length) {
      out.push('(empty)', '');
    } else {
      b.output.forEach(part => out.push(renderOutputPart(part, c, opts), ''));
    }
    out.push('</details>');
    return out.join('\n');
  }

  function renderBlock(b, c, opts) {
    switch (b.type) {
      case 'text':
        return b.text.trim() ? contain(b.text) : null;
      case 'thinking': {
        if (!b.summary && !b.text) return null;
        const label = b.hiddenInSite ? `Thinking (hidden in ${c.platformName})` : 'Thinking';
        const lines = [`**${label}:** ${b.summary || ''}`.trimEnd()];
        if (b.text) lines.push('', b.text);
        return quote(lines.join('\n'));
      }
      case 'tool':
        return renderTool(b, c, opts);
      case 'image':
        return renderFile(b.file, c, opts, { image: true });
      case 'file': {
        if (b.inlineText === null || b.inlineText === undefined) return renderFile(b.file, c, opts);
        const lines = [`**Pasted text: ${b.file.name}**`, '', fenced(b.inlineText, 'text')];
        if (opts.paths && opts.paths[b.file.key]) lines.push('', `Saved as ${link(b.file.name, local(opts.paths[b.file.key]))}`);
        return lines.join('\n');
      }
      case 'summary':
        return quote(`**Compaction summary** (${c.platformName} compacted the chat here)\n\n${b.text}`);
      case 'unsupported': {
        const lines = [`[unsupported content: ${b.siteType}]`];
        if (b.strings.length) lines.push('', fenced(b.strings.join('\n'), 'text'));
        return lines.join('\n');
      }
      default:
        return `[unsupported content: ${b.type}]`;
    }
  }

  function heading(m, c, opts) {
    const who = m.role === 'user' ? 'You' : c.platformName;
    const bits = [`${m.n}. ${who}`];
    const time = formatTime(m.createdAt, opts.timeZone);
    if (time) bits.push(time);
    if (m.model) bits.push(m.model);
    return `## ${bits.join(' · ')}`;
  }

  function renderMessage(m, c, opts) {
    const out = [heading(m, c, opts), ''];
    const rendered = m.blocks.map(b => renderBlock(b, c, opts)).filter(Boolean);
    out.push(rendered.length ? rendered.join('\n\n') : '_(empty message)_');
    if (m.sources.length) {
      out.push('', '**Sources**', '');
      m.sources.forEach((s, i) => out.push(`${i + 1}. ${s.url ? link(s.title, s.url) : s.title}`));
    }
    out.push('', '---', '');
    return out.join('\n');
  }

  function referencedKeys(conversation) {
    const keys = new Set();
    conversation.messages.forEach(m => m.blocks.forEach(b => {
      if (b.file) keys.add(b.file.key);
      if (b.type === 'tool') b.output.forEach(p => { if (p.kind === 'file') keys.add(p.file.key); });
    }));
    return keys;
  }

  // Files the chat holds that no message mentions (Claude's older file list).
  function otherFiles(conversation, opts) {
    const used = referencedKeys(conversation);
    const rest = conversation.files.filter(f => !used.has(f.key));
    if (!rest.length) return '';
    const lines = rest.map(f => `- ${renderFile(f, conversation, opts, { image: (f.mime || '').startsWith('image/') })}`);
    return `## Other files\n\n${lines.join('\n')}\n\n---\n\n`;
  }

  // mode: 'copy' | 'download' | 'zip'. paths: file key to ZIP path (zip only).
  function toMarkdown(conversation, { mode = 'copy', paths = {}, timeZone } = {}) {
    const opts = { mode, paths, timeZone };
    const body = conversation.messages.map(m => renderMessage(m, conversation, opts)).join('\n');
    return `${header(conversation, opts)}\n${body}\n${otherFiles(conversation, opts)}*Exported with Recurate Copier, recurate.ai*\n`;
  }

  globalThis.Recurate = Object.assign(globalThis.Recurate || {}, {
    toMarkdown,
    describeMessages,
    fenceFor,
    contain,
    formatTime,
  });
})();
