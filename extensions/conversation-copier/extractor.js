// Recurate Copier — Conversation extraction and formatting
// Reusable module: no extension dependencies, pure DOM extraction.
// Exposes window.RecurateExtractor for use by content scripts.

(function () {
  // --- Platform detection ---

  function getPlatform() {
    const host = window.location.host;
    if (host.includes('claude.ai')) return 'claude';
    if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) return 'chatgpt';
    if (host.includes('gemini.google.com')) return 'gemini';
    if (host.includes('copilot.microsoft.com')) return 'copilot';
    if (host.includes('m365.cloud.microsoft')) return 'copilot-enterprise';
    if (host.includes('grok.com')) return 'grok';
    if (host.includes('google.com')) return 'google';
    return null;
  }

  function getPlatformDisplayName() {
    const names = {
      claude: 'Claude',
      chatgpt: 'ChatGPT',
      gemini: 'Gemini',
      google: 'Google AI',
      copilot: 'Microsoft Copilot',
      'copilot-enterprise': 'Microsoft Copilot',
      grok: 'Grok',
    };
    return names[getPlatform()] || 'AI';
  }

  // --- Helpers ---

  function slugify(text, maxLength = 50) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, maxLength)
      .replace(/-$/, '');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function getConversationTitle() {
    const platform = getPlatform();

    switch (platform) {
      case 'claude': {
        const titleEl = document.querySelector('[data-testid="chat-title-button"] .truncate');
        if (titleEl) {
          const text = titleEl.textContent?.trim();
          if (text && text.length > 2 && text.length < 200) return text;
        }
        return null;
      }
      case 'chatgpt': {
        const titleEl = document.querySelector('h1') ||
                        document.querySelector('[class*="truncate"]');
        if (titleEl) {
          const text = titleEl.textContent?.trim();
          if (text && text.length > 2 && text.length < 200) return text;
        }
        return null;
      }
      case 'grok': {
        const docTitle = document.title?.trim();
        if (docTitle && docTitle.length > 2 && docTitle !== 'Grok') {
          const cleaned = docTitle.replace(/\s*[-\u2013\u2014]\s*Grok\s*$/i, '').trim();
          if (cleaned && cleaned.length > 2) return cleaned;
        }
        return null;
      }
      case 'gemini': {
        const docTitle = document.title?.trim();
        if (docTitle) {
          const cleaned = docTitle.replace(/\s*[-\u2013\u2014]\s*Google Gemini\s*$/i, '').trim();
          if (cleaned && cleaned.length > 2 && cleaned !== 'Google Gemini') return cleaned;
        }
        const activeChat = document.querySelector('[class*="selected"] [class*="title"]') ||
                           document.querySelector('[aria-selected="true"]');
        if (activeChat) {
          const text = activeChat.textContent?.trim();
          if (text && text.length > 2 && text.length < 200) return text;
        }
        return null;
      }
      case 'google': {
        const q = new URLSearchParams(window.location.search).get('q');
        if (q) return q;
        return null;
      }
      default: {
        const docTitle = document.title?.trim();
        if (docTitle && docTitle.length > 2 && !docTitle.includes('|')) return docTitle;
        return null;
      }
    }
  }

  // --- HTML sanitization ---

  function sanitizeHTML(clone) {
    const junkAttrs = [
      'jscontroller', 'jsaction', 'jsuid', 'jsmodel', 'jsname', 'jsshadow',
      'jsdata', 'jstcache', 'jsslot',
      'data-sfc-root', 'data-sfc-cb', 'data-sfc-cp',
      'data-wiz-uids', 'data-wiz-attrbind',
      'data-hveid', 'data-ved',
      'data-animation-skip', 'data-animation-nesting',
      'data-processed', 'data-container-id', 'data-scope-id',
      'data-subtree', 'data-xid', 'data-zzy',
      'data-keys', 'data-value', 'data-hpmde',
      'data-crb-el',
    ];
    const attrPrefixes = ['data-sfc-', 'data-wiz-', 'data-animation-'];

    clone.querySelectorAll('*').forEach(el => {
      junkAttrs.forEach(attr => el.removeAttribute(attr));
      const attrsToRemove = [];
      for (const attr of el.attributes) {
        if (attrPrefixes.some(p => attr.name.startsWith(p)) ||
            attr.name.startsWith('js') ||
            attr.name.startsWith('data-') ||
            attr.name === 'tabindex' ||
            attr.name === 'jsuid') {
          attrsToRemove.push(attr.name);
        }
      }
      attrsToRemove.forEach(a => el.removeAttribute(a));
      el.removeAttribute('class');
      el.removeAttribute('style');
      el.removeAttribute('dir');
    });

    clone.querySelectorAll('.sr-only, [aria-hidden="true"]').forEach(el => el.remove());

    const commentWalker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
    const comments = [];
    while (commentWalker.nextNode()) comments.push(commentWalker.currentNode);
    comments.forEach(c => c.remove());

    let changed = true;
    while (changed) {
      changed = false;
      clone.querySelectorAll('div, span').forEach(el => {
        if (!el.textContent?.trim() && !el.querySelector('img, svg, video, iframe')) {
          el.remove();
          changed = true;
        }
      });
    }

    clone.querySelectorAll('img[src*="gstatic.com/favicon"], img[src*="encrypted-tbn"], .notranslate').forEach(el => el.remove());
    clone.querySelectorAll('button, [role="button"], svg, [aria-label*="Copy"], [aria-label*="Share"], [aria-label*="response"], [aria-label*="perspective"]').forEach(el => el.remove());

    const textWalker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    const junkPatterns = /^(Search Labs|Copy|Creating a public link|Good response|Bad response|Would you like to see this from a different perspective\?)\.{0,3}$/;
    const junkNodes = [];
    while (textWalker.nextNode()) {
      if (junkPatterns.test(textWalker.currentNode.textContent.trim())) {
        junkNodes.push(textWalker.currentNode.parentElement || textWalker.currentNode);
      }
    }
    junkNodes.forEach(n => n.remove());

    return clone;
  }

  // --- Thinking block expansion (Claude.ai) ---

  async function expandThinkingBlocks() {
    const collapsed = document.querySelectorAll('button[class*="group/status"][aria-expanded="false"]');
    if (collapsed.length === 0) return;

    collapsed.forEach(btn => btn.click());

    await new Promise(resolve => setTimeout(resolve, 300));

    const grids = document.querySelectorAll('[class*="transition-[grid-template-rows]"]');
    const anyEmpty = Array.from(grids).some(g => g.getAttribute('style')?.includes('1fr') && !g.textContent?.trim());
    if (anyEmpty) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  function collapseThinkingBlocks() {
    const expanded = document.querySelectorAll('button[class*="group/status"][aria-expanded="true"]');
    expanded.forEach(btn => btn.click());
  }

  function extractThinkingContent(aiBlock) {
    const thinkingBlocks = [];
    aiBlock.querySelectorAll('button[class*="group/status"]').forEach(btn => {
      const summary = btn.textContent?.trim() || '';
      const wrapper = btn.parentElement?.parentElement;
      const transGrid = wrapper?.querySelector('[class*="transition-[grid-template-rows]"]');
      let fullText = '';
      let fullHtml = '';
      if (transGrid && transGrid.textContent?.trim()) {
        const clone = transGrid.cloneNode(true);
        clone.querySelectorAll('button, a, svg, [class*="h-[8px]"]').forEach(el => el.remove());
        const paras = clone.querySelectorAll('p.font-claude-response-body');
        if (paras.length > 0) {
          fullText = Array.from(paras).map(p => p.textContent?.trim()).filter(Boolean).join('\n\n');
          fullHtml = Array.from(paras).map(p => `<p>${p.innerHTML}</p>`).join('');
        } else {
          fullText = clone.textContent?.trim() || '';
          fullHtml = `<p>${escapeHtml(fullText)}</p>`;
        }
      }
      if (summary || fullText) {
        thinkingBlocks.push({ summary, text: fullText, html: fullHtml });
      }
    });
    return thinkingBlocks.length > 0 ? thinkingBlocks : undefined;
  }

  // --- Conversation extraction ---

  async function extractConversation() {
    const platform = getPlatform();
    if (!platform) return [];

    const messages = [];

    switch (platform) {
      case 'claude': {
        await expandThinkingBlocks();

        const allElements = document.querySelectorAll(
          '[data-testid="user-message"], [data-is-streaming="false"]'
        );
        allElements.forEach(el => {
          if (el.matches('[data-testid="user-message"]')) {
            const clone = el.cloneNode(true);
            sanitizeHTML(clone);
            messages.push({ role: 'user', text: el.textContent?.trim() || '', html: clone.innerHTML });
          } else {
            const thinking = extractThinkingContent(el);
            // When thinking blocks are expanded, .standard-markdown appears
            // inside thinking grids AND in the actual response. Use the LAST
            // .standard-markdown that is NOT inside a thinking block grid.
            const allMarkdown = el.querySelectorAll('.standard-markdown');
            const nonThinkingMarkdown = Array.from(allMarkdown).filter(md =>
              !md.closest('[class*="transition-[grid-template-rows]"]')
            );
            const content = (nonThinkingMarkdown.length > 0
              ? nonThinkingMarkdown[nonThinkingMarkdown.length - 1]
              : null) ||
                            el.querySelector('.font-claude-message') ||
                            el.querySelector('[data-testid*="message"]') ||
                            el.querySelector('.prose') || el;
            const clone = content.cloneNode(true);
            sanitizeHTML(clone);
            messages.push({
              role: 'assistant',
              text: content.textContent?.trim() || '',
              html: clone.innerHTML,
              thinking,
            });
          }
        });

        collapseThinkingBlocks();
        break;
      }

      case 'chatgpt': {
        const turns = document.querySelectorAll('[data-testid^="conversation-turn-"]');
        turns.forEach(turn => {
          const assistantEl = turn.querySelector('[data-message-author-role="assistant"]');
          if (assistantEl) {
            const markdownContent = assistantEl.querySelector('[class*="markdown"]') ||
                                    assistantEl.querySelector('.prose') || assistantEl;
            const clone = markdownContent.cloneNode(true);
            sanitizeHTML(clone);
            messages.push({ role: 'assistant', text: markdownContent.textContent?.trim() || '', html: clone.innerHTML });
          } else {
            const userEl = turn.querySelector('[data-message-author-role="user"]');
            if (userEl) {
              const text = userEl.textContent?.trim() || '';
              if (text) messages.push({ role: 'user', text, html: escapeHtml(text) });
            }
          }
        });
        break;
      }

      case 'grok': {
        const groups = document.querySelectorAll('div[id^="response-"]');
        groups.forEach(group => {
          const isUser = group.className.includes('items-end');
          if (isUser) {
            const text = group.textContent?.trim() || '';
            if (text) messages.push({ role: 'user', text, html: escapeHtml(text) });
          } else {
            const content = group.querySelector('.response-content-markdown') ||
                            group.querySelector('.message-bubble') || group;
            const clone = content.cloneNode(true);
            sanitizeHTML(clone);
            const text = content.textContent?.trim() || '';
            if (text) messages.push({ role: 'assistant', text, html: clone.innerHTML });
          }
        });
        break;
      }

      case 'gemini': {
        const turns = document.querySelectorAll(
          '[data-turn-role], message-content, .conversation-turn, [class*="turn"]'
        );
        if (turns.length > 0) {
          turns.forEach(turn => {
            const role = turn.getAttribute('data-turn-role');
            const isUser = role === 'user' || role === '1' ||
                           turn.className.includes('user') ||
                           turn.className.includes('query');
            const clone = turn.cloneNode(true);
            sanitizeHTML(clone);
            messages.push({
              role: isUser ? 'user' : 'assistant',
              text: turn.textContent?.trim() || '',
              html: clone.innerHTML,
            });
          });
        } else {
          const allBlocks = document.querySelectorAll(
            'model-response, user-query, [class*="response-container"], [class*="query-container"]'
          );
          allBlocks.forEach(block => {
            const isUser = block.tagName === 'USER-QUERY' || block.className.includes('query');
            const clone = block.cloneNode(true);
            sanitizeHTML(clone);
            messages.push({
              role: isUser ? 'user' : 'assistant',
              text: block.textContent?.trim() || '',
              html: clone.innerHTML,
            });
          });
        }
        break;
      }

      case 'google': {
        const turns = document.querySelectorAll('div[data-scope-id="turn"]');
        turns.forEach(turn => {
          const queryEl = turn.querySelector('span[role="heading"][aria-level="2"]');
          if (queryEl) {
            messages.push({ role: 'user', text: queryEl.textContent?.trim() || '', html: escapeHtml(queryEl.textContent?.trim() || '') });
          }
          const aiEl = turn.querySelector('[data-subtree="aimc"]') ||
                       turn.querySelector('[data-subtree="aimfl"]');
          if (aiEl) {
            const content = aiEl.querySelector('[data-container-id="main-col"]') ||
                            aiEl.querySelector('[dir="ltr"]') || aiEl;
            const clone = content.cloneNode(true);
            clone.querySelectorAll('[style*="display:none"], [style*="display: none"]').forEach(el => el.remove());
            sanitizeHTML(clone);
            const text = clone.textContent?.trim() || '';
            if (text.length > 5) {
              messages.push({ role: 'assistant', text, html: clone.innerHTML });
            }
          }
        });
        break;
      }

      case 'copilot': {
        const aiMessages = document.querySelectorAll('[data-testid="ai-message"]');
        const userMessages = document.querySelectorAll('[data-testid="user-message"], [class*="user-message"]');
        const all = [];
        aiMessages.forEach(el => all.push({ el, role: 'assistant' }));
        userMessages.forEach(el => all.push({ el, role: 'user' }));
        all.sort((a, b) => {
          const pos = a.el.compareDocumentPosition(b.el);
          return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
        all.forEach(({ el, role }) => {
          const content = role === 'assistant'
            ? (el.querySelector('[class*="ai-message-item"]') || el)
            : el;
          messages.push({ role, text: content.textContent?.trim() || '', html: content.innerHTML });
        });
        break;
      }

      case 'copilot-enterprise': {
        const all = document.querySelectorAll('div.fai-CopilotMessage, div.fai-UserMessage');
        all.forEach(el => {
          const isUser = el.classList.contains('fai-UserMessage');
          const content = isUser ? el :
            (el.querySelector('[data-testid="markdown-reply"]') ||
             el.querySelector('[data-testid="lastChatMessage"]') || el);
          messages.push({
            role: isUser ? 'user' : 'assistant',
            text: content.textContent?.trim() || '',
            html: content.innerHTML,
          });
        });
        break;
      }
    }

    return messages.filter(m => m.text.length > 0);
  }

  // --- Format as markdown ---

  function toMarkdown(messages) {
    const platform = getPlatformDisplayName();
    const title = getConversationTitle();
    const heading = title ? `# ${title}` : `# Conversation with ${platform}`;
    let md = `${heading}\n\n`;
    md += `*Exported on ${new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}*\n\n---\n\n`;

    for (const msg of messages) {
      const label = msg.role === 'user' ? '## You' : `## ${platform}`;
      let thinking = '';
      if (msg.thinking && msg.thinking.length > 0) {
        thinking = msg.thinking.map(t => {
          const header = `> **Thinking: ${t.summary}**`;
          if (t.text) return `${header}\n>\n> ${t.text.split('\n').join('\n> ')}`;
          return header;
        }).join('\n>\n') + '\n\n';
      }
      md += `${label}\n\n${thinking}${msg.text}\n\n---\n\n`;
    }

    md += `*Exported with Recurate Copier — recurate.ai*\n`;
    return md;
  }

  // --- Format as styled HTML ---

  function toHTML(messages, outputFiles, uploadFiles) {
    const platform = getPlatformDisplayName();
    const title = getConversationTitle();
    const date = new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    });

    let body = '';
    for (const msg of messages) {
      if (msg.role === 'user') {
        body += `<div class="message user">
          <div class="label">You</div>
          <div class="content">${escapeHtml(msg.text)}</div>
        </div>`;
      } else {
        let msgHtml = msg.html;
        if (outputFiles && outputFiles.length > 0) {
          const temp = document.createElement('div');
          temp.innerHTML = msgHtml;
          replaceArtifactBlocksInHTML(temp, outputFiles);
          msgHtml = temp.innerHTML;
        }
        let thinkingHtml = '';
        if (msg.thinking && msg.thinking.length > 0) {
          thinkingHtml = msg.thinking.map(t => {
            const body = t.html || (t.text ? `<p>${escapeHtml(t.text)}</p>` : '');
            if (body) {
              return `<details class="thinking-block"><summary class="thinking-summary">${escapeHtml(t.summary)}</summary><div class="thinking-content">${body}</div></details>`;
            }
            return `<div class="thinking-summary">${escapeHtml(t.summary)}</div>`;
          }).join('');
        }
        body += `<div class="message assistant">
          <div class="label">${platform}</div>
          ${thinkingHtml}
          <div class="content">${msgHtml}</div>
        </div>`;
      }
    }

    const manifestHTML = (outputFiles || uploadFiles)
      ? buildArtifactManifestHTML(outputFiles || [], uploadFiles || [])
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title ? title + ' \u2014 ' : ''}Conversation with ${platform} \u2014 ${date}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6; color: #1a1a2e; max-width: 800px; margin: 0 auto;
    padding: 2rem 1.5rem; background: #fff;
  }
  .header { border-bottom: 2px solid #4f46e5; padding-bottom: 1rem; margin-bottom: 2rem; }
  .header h1 { color: #4f46e5; font-size: 1.5rem; }
  .header .meta { color: #888; font-size: 0.85rem; margin-top: 0.25rem; }
  .message { margin-bottom: 1.5rem; }
  .message .label {
    font-weight: 600; font-size: 0.85rem; text-transform: uppercase;
    letter-spacing: 0.05em; margin-bottom: 0.5rem;
  }
  .message.user .label { color: #312e81; }
  .message.assistant .label { color: #4f46e5; }
  .message.user .content {
    padding: 0.75rem 1rem; background: #eef2ff; border-radius: 8px;
    border-left: 4px solid #4f46e5;
  }
  .message.assistant .content {
    padding: 0.5rem 0;
  }
  .thinking-block { margin-bottom: 0.75rem; }
  .thinking-summary {
    font-size: 0.85rem; color: #6b7280; font-style: italic;
    padding: 0.4rem 0.75rem; margin-bottom: 0.5rem;
    background: #f9fafb; border-radius: 6px; border-left: 3px solid #9ca3af;
    cursor: pointer;
  }
  .thinking-content {
    font-size: 0.85rem; color: #4b5563; line-height: 1.6;
    padding: 0.5rem 0.75rem; margin-top: 0.25rem;
    background: #f9fafb; border-radius: 0 0 6px 6px; border-left: 3px solid #9ca3af;
  }
  .thinking-content p { margin-bottom: 0.5rem; }
  .message.assistant .content h1,
  .message.assistant .content h2,
  .message.assistant .content h3 {
    margin: 1rem 0 0.5rem; color: #1e1b4b;
  }
  .message.assistant .content h1 { font-size: 1.3rem; }
  .message.assistant .content h2 { font-size: 1.1rem; }
  .message.assistant .content h3 { font-size: 1rem; }
  .message.assistant .content p { margin-bottom: 0.75rem; }
  .message.assistant .content ul, .message.assistant .content ol {
    padding-left: 1.5rem; margin-bottom: 0.75rem;
  }
  .message.assistant .content li { margin-bottom: 0.3rem; }
  .message.assistant .content code {
    background: #f3f4f6; padding: 0.15rem 0.4rem; border-radius: 4px;
    font-size: 0.9em; font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }
  .message.assistant .content pre {
    background: #1e1b4b; color: #e0e7ff; padding: 1rem;
    border-radius: 8px; overflow-x: auto; margin-bottom: 0.75rem;
  }
  .message.assistant .content pre code {
    background: none; padding: 0; color: inherit;
  }
  .message.assistant .content blockquote {
    border-left: 3px solid #4f46e5; padding-left: 1rem;
    color: #4b5563; margin-bottom: 0.75rem;
  }
  .message.assistant .content strong { color: #1e1b4b; }
  .message.assistant .content a { color: #4f46e5; }
  .divider { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
  .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 0.75rem; }
  .footer a { color: #4f46e5; text-decoration: none; }
  @media print { body { max-width: 100%; padding: 1rem; } }
</style>
</head>
<body>
<div class="header">
  <h1>${title || 'Conversation with ' + platform}</h1>
  <div class="meta">${date}</div>
</div>
${body}
${manifestHTML}
<div class="footer">Exported with <a href="https://recurate.ai">Recurate Copier</a></div>
</body>
</html>`;
  }

  // --- Artifact helpers (used by both toHTML and content.js ZIP export) ---

  function getFilename(filePath) {
    return filePath.split('/').pop() || filePath;
  }

  function deduplicateFilenames(filePaths) {
    const seen = {};
    return filePaths.map(path => {
      let name = getFilename(path);
      if (seen[name]) {
        seen[name]++;
        const ext = name.lastIndexOf('.');
        if (ext > 0) {
          name = name.slice(0, ext) + '-' + seen[name] + name.slice(ext);
        } else {
          name = name + '-' + seen[name];
        }
      } else {
        seen[name] = 1;
      }
      return { path, filename: name };
    });
  }

  function slugifyForMatch(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function findMatchingFile(artifactName, outputFiles) {
    const slug = slugifyForMatch(artifactName);
    const matches = outputFiles.filter(f => {
      const stem = getFilename(f.path).replace(/\.[^.]+$/, '');
      return slugifyForMatch(stem).startsWith(slug);
    });
    if (matches.length === 0) return null;
    return matches[matches.length - 1];
  }

  function replaceArtifactBlocksInHTML(clone, outputFiles) {
    const blocks = clone.querySelectorAll('.artifact-block-cell');
    blocks.forEach(block => {
      const parent = block.closest('[role="button"][aria-label]');
      if (!parent) return;

      const ariaLabel = parent.getAttribute('aria-label') || '';
      const nameMatch = ariaLabel.match(/^Open artifact:\s*(.+)$/);
      if (!nameMatch) return;

      const artifactName = nameMatch[1].trim();
      const text = block.textContent || '';

      const typeMatch = text.match(/(Document|Code|Application|Presentation|Spreadsheet)\s*[·.]\s*(\w+)/);
      const type = typeMatch ? typeMatch[1] : '';
      const format = typeMatch ? typeMatch[2] : '';

      const matchedFile = findMatchingFile(artifactName, outputFiles);

      const link = document.createElement('div');
      link.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;margin:8px 0;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;';

      if (matchedFile) {
        link.innerHTML = '<span style="font-size:16px;">&#x1F4CE;</span>' +
          '<a href="artifacts/' + escapeHtml(matchedFile.filename) + '" style="color:#4f46e5;text-decoration:none;font-weight:500;">' + escapeHtml(artifactName) + '</a>' +
          (type ? '<span style="color:#888;font-size:11px;">' + escapeHtml(type + ', ' + format) + '</span>' : '');
      } else {
        link.innerHTML = '<span style="font-size:16px;">&#x1F4CE;</span>' +
          '<span style="color:#4f46e5;font-weight:500;">' + escapeHtml(artifactName) + '</span>' +
          (type ? '<span style="color:#888;font-size:11px;">' + escapeHtml(type + ', ' + format) + '</span>' : '');
      }

      parent.replaceWith(link);
    });
  }

  function buildArtifactManifestHTML(outputFiles, uploadFiles) {
    let html = '';

    if (outputFiles.length > 0) {
      html += '<div class="artifacts-section" style="margin-top:2rem;padding-top:1rem;border-top:2px solid #4f46e5;">';
      html += '<h2 style="color:#4f46e5;font-size:1.2rem;margin-bottom:0.5rem;">Artifacts</h2>';
      html += '<p style="color:#888;font-size:0.85rem;margin-bottom:0.75rem;">Claude generated ' + outputFiles.length + ' artifact' + (outputFiles.length !== 1 ? 's' : '') + ' during this conversation:</p>';
      html += '<ul style="list-style:none;padding:0;">';
      outputFiles.forEach(f => {
        html += '<li style="margin-bottom:4px;"><a href="artifacts/' + escapeHtml(f.filename) + '" style="color:#4f46e5;text-decoration:none;">&#x1F4CE; ' + escapeHtml(f.filename) + '</a></li>';
      });
      html += '</ul></div>';
    }

    if (uploadFiles.length > 0) {
      html += '<div class="uploads-section" style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e5e7eb;">';
      html += '<h2 style="color:#4f46e5;font-size:1.2rem;margin-bottom:0.5rem;">Uploaded Files</h2>';
      html += '<p style="color:#888;font-size:0.85rem;margin-bottom:0.75rem;">' + uploadFiles.length + ' file' + (uploadFiles.length !== 1 ? 's were' : ' was') + ' uploaded during this conversation:</p>';
      html += '<ul style="list-style:none;padding:0;">';
      uploadFiles.forEach(f => {
        html += '<li style="margin-bottom:4px;"><a href="uploads/' + escapeHtml(f.filename) + '" style="color:#4f46e5;text-decoration:none;">&#x1F4CE; ' + escapeHtml(f.filename) + '</a></li>';
      });
      html += '</ul></div>';
    }

    return html;
  }

  // --- Public API ---

  window.RecurateExtractor = {
    getPlatform,
    getPlatformDisplayName,
    slugify,
    escapeHtml,
    getConversationTitle,
    extractConversation,
    toMarkdown,
    toHTML,
    deduplicateFilenames,
    getFilename,
  };
})();
