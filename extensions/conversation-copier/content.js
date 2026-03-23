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

  function getConversationTitle() {
    const platform = getPlatform();

    switch (platform) {
      case 'claude': {
        // Claude: title is in button[data-testid="chat-title-button"] > div > div.truncate
        const titleEl = document.querySelector('[data-testid="chat-title-button"] .truncate');
        if (titleEl) {
          const text = titleEl.textContent?.trim();
          if (text && text.length > 2 && text.length < 200) return text;
        }
        return null;
      }
      case 'chatgpt': {
        // ChatGPT shows the conversation title in the header
        const titleEl = document.querySelector('h1') ||
                        document.querySelector('[class*="truncate"]');
        if (titleEl) {
          const text = titleEl.textContent?.trim();
          if (text && text.length > 2 && text.length < 200) return text;
        }
        return null;
      }
      case 'grok': {
        // Grok: page title is usually the conversation name
        const docTitle = document.title?.trim();
        if (docTitle && docTitle.length > 2 && docTitle !== 'Grok') {
          const cleaned = docTitle.replace(/\s*[-–—]\s*Grok\s*$/i, '').trim();
          if (cleaned && cleaned.length > 2) return cleaned;
        }
        return null;
      }
      case 'gemini': {
        // Gemini: title is in the page title (format: "conversation name - Google Gemini")
        const docTitle = document.title?.trim();
        if (docTitle) {
          const cleaned = docTitle.replace(/\s*[-–—]\s*Google Gemini\s*$/i, '').trim();
          if (cleaned && cleaned.length > 2 && cleaned !== 'Google Gemini') return cleaned;
        }
        // Fallback: look for active conversation in sidebar
        const activeChat = document.querySelector('[class*="selected"] [class*="title"]') ||
                           document.querySelector('[aria-selected="true"]');
        if (activeChat) {
          const text = activeChat.textContent?.trim();
          if (text && text.length > 2 && text.length < 200) return text;
        }
        return null;
      }
      case 'google': {
        // Google AI Mode: use the search query from the page
        const q = new URLSearchParams(window.location.search).get('q');
        if (q) return q;
        return null;
      }
      default: {
        // Try document.title as fallback
        const docTitle = document.title?.trim();
        if (docTitle && docTitle.length > 2 && !docTitle.includes('|')) return docTitle;
        return null;
      }
    }
  }

  // --- HTML sanitization ---

  function sanitizeHTML(clone) {
    // Remove Google's internal attributes from all elements
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
      // Remove known junk attributes
      junkAttrs.forEach(attr => el.removeAttribute(attr));

      // Remove attributes matching prefixes and all data-* attributes
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

      // Strip class, style, dir — the export has its own CSS
      el.removeAttribute('class');
      el.removeAttribute('style');
      el.removeAttribute('dir');
    });

    // Remove screen-reader-only and hidden elements
    clone.querySelectorAll('.sr-only, [aria-hidden="true"]').forEach(el => el.remove());

    // Remove HTML comments (especially Google's <!--TgQPHd|[...]-->)
    const commentWalker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
    const comments = [];
    while (commentWalker.nextNode()) comments.push(commentWalker.currentNode);
    comments.forEach(c => c.remove());

    // Remove empty wrapper divs (no text content, no images)
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

    // Remove favicon images and citation badges
    clone.querySelectorAll('img[src*="gstatic.com/favicon"], img[src*="encrypted-tbn"], .notranslate').forEach(el => el.remove());

    // Remove buttons, icons, and UI chrome
    clone.querySelectorAll('button, [role="button"], svg, [aria-label*="Copy"], [aria-label*="Share"], [aria-label*="response"], [aria-label*="perspective"]').forEach(el => el.remove());

    // Remove UI text patterns
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

  // --- Conversation extraction ---

  function extractConversation() {
    const platform = getPlatform();
    if (!platform) return [];

    const messages = [];

    switch (platform) {
      case 'claude': {
        // Claude interleaves user and AI messages in DOM order
        // User: [data-testid="user-message"]
        // AI: [data-is-streaming="false"] with content inside .font-claude-message or .prose
        const allElements = document.querySelectorAll(
          '[data-testid="user-message"], [data-is-streaming="false"]'
        );
        allElements.forEach(el => {
          if (el.matches('[data-testid="user-message"]')) {
            const clone = el.cloneNode(true);
            sanitizeHTML(clone);
            messages.push({ role: 'user', text: el.textContent?.trim() || '', html: clone.innerHTML });
          } else {
            const content = el.querySelector('.font-claude-message') ||
                            el.querySelector('[data-testid*="message"]') ||
                            el.querySelector('.prose') || el;
            const clone = content.cloneNode(true);
            sanitizeHTML(clone);
            messages.push({ role: 'assistant', text: content.textContent?.trim() || '', html: clone.innerHTML });
          }
        });
        break;
      }

      case 'chatgpt': {
        // ChatGPT: turns in [data-testid^="conversation-turn-"] (section or article)
        // AI turns have [data-message-author-role="assistant"] with .markdown content
        // User turns have [data-message-author-role="user"]
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
        // Grok: message groups have id="response-..."
        // items-end = user (right-aligned), items-start = AI (left-aligned)
        // AI content in div.message-bubble > div.response-content-markdown
        const groups = document.querySelectorAll('div[id^="response-"]');
        groups.forEach(group => {
          const isUser = group.className.includes('items-end');
          if (isUser) {
            // User message text
            const text = group.textContent?.trim() || '';
            if (text) messages.push({ role: 'user', text, html: escapeHtml(text) });
          } else {
            // AI response — find the markdown content
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
        // Gemini: conversation turns in the main container
        // User messages and model responses in alternating containers
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
          // Fallback: look for model-response and user-query pairs
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
        // Google AI Mode: turns are in div[data-scope-id="turn"]
        // User query: span[role="heading"][aria-level="2"] inside the turn
        // AI response: div[data-subtree="aimc"] inside the turn
        const turns = document.querySelectorAll('div[data-scope-id="turn"]');
        turns.forEach(turn => {
          // Extract user query
          const queryEl = turn.querySelector('span[role="heading"][aria-level="2"]');
          if (queryEl) {
            messages.push({ role: 'user', text: queryEl.textContent?.trim() || '', html: escapeHtml(queryEl.textContent?.trim() || '') });
          }
          // Extract AI response
          const aiEl = turn.querySelector('[data-subtree="aimc"]') ||
                       turn.querySelector('[data-subtree="aimfl"]');
          if (aiEl) {
            // Get the main content area
            const content = aiEl.querySelector('[data-container-id="main-col"]') ||
                            aiEl.querySelector('[dir="ltr"]') || aiEl;
            // Clone, sanitize, and strip all Google DOM cruft
            const clone = content.cloneNode(true);
            // Remove hidden elements first
            clone.querySelectorAll('[style*="display:none"], [style*="display: none"]').forEach(el => el.remove());
            // Run full sanitization
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
        // Copilot consumer: AI = [data-testid="ai-message"], user messages nearby
        const aiMessages = document.querySelectorAll('[data-testid="ai-message"]');
        const userMessages = document.querySelectorAll('[data-testid="user-message"], [class*="user-message"]');

        // Combine and sort by DOM order
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
        // Enterprise: AI = div.fai-CopilotMessage, User = div.fai-UserMessage
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

    // Filter out empty messages
    return messages.filter(m => m.text.length > 0);
  }

  // --- Format as markdown ---

  function toMarkdown(messages) {
    const platform = getPlatformDisplayName();
    const title = getConversationTitle();
    const heading = title ? `# ${title}` : `# Conversation with ${platform}`;
    let md = `${heading}\n\n`;
    md += `*Exported on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*\n\n---\n\n`;

    for (const msg of messages) {
      const label = msg.role === 'user' ? '## You' : `## ${platform}`;
      md += `${label}\n\n${msg.text}\n\n---\n\n`;
    }

    md += `*Exported with Recurate Copier — recurate.ai*\n`;
    return md;
  }

  // --- Format as styled HTML ---

  function toHTML(messages, outputFiles, uploadFiles) {
    const platform = getPlatformDisplayName();
    const title = getConversationTitle();
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    // For Claude with artifacts: process message HTML to replace artifact blocks with links
    let body = '';
    for (const msg of messages) {
      if (msg.role === 'user') {
        body += `<div class="message user">
          <div class="label">You</div>
          <div class="content">${escapeHtml(msg.text)}</div>
        </div>`;
      } else {
        let msgHtml = msg.html;
        // If we have artifact files, replace artifact blocks with links
        if (outputFiles && outputFiles.length > 0) {
          const temp = document.createElement('div');
          temp.innerHTML = msgHtml;
          replaceArtifactBlocksInHTML(temp, outputFiles);
          msgHtml = temp.innerHTML;
        }
        body += `<div class="message assistant">
          <div class="label">${platform}</div>
          <div class="content">${msgHtml}</div>
        </div>`;
      }
    }

    // Add artifact manifest at the end
    const manifestHTML = (outputFiles || uploadFiles)
      ? buildArtifactManifestHTML(outputFiles || [], uploadFiles || [])
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title ? title + ' — ' : ''}Conversation with ${platform} — ${date}</title>
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

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // --- Claude Artifact Export (claude.ai only) ---

  async function getOrgId() {
    try {
      const resp = await fetch('/api/organizations');
      const data = await resp.json();
      return Array.isArray(data) && data.length > 0 ? data[0].uuid : null;
    } catch (e) {
      console.error('Recurate Copier: failed to get org ID', e);
      return null;
    }
  }

  function getChatId() {
    const parts = window.location.pathname.split('/');
    // URL is /chat/{uuid}
    return parts[2] || null;
  }

  async function listFiles(orgId, chatId) {
    try {
      const resp = await fetch(`/api/organizations/${orgId}/conversations/${chatId}/wiggle/list-files?prefix=`);
      const data = await resp.json();
      return data.success ? data.files : [];
    } catch (e) {
      console.error('Recurate Copier: failed to list files', e);
      return [];
    }
  }

  async function downloadFile(orgId, chatId, filePath) {
    try {
      const encodedPath = encodeURIComponent(filePath);
      const resp = await fetch(`/api/organizations/${orgId}/conversations/${chatId}/wiggle/download-file?path=${encodedPath}`);
      if (!resp.ok) return null;
      return await resp.blob();
    } catch (e) {
      console.error('Recurate Copier: failed to download file', filePath, e);
      return null;
    }
  }

  function getFilename(filePath) {
    return filePath.split('/').pop() || filePath;
  }

  function deduplicateFilenames(filePaths) {
    // Returns array of {path, filename} with unique filenames
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
    // Match DOM artifact name to API file path
    const slug = slugifyForMatch(artifactName);
    // Find files whose stem starts with this slug
    const matches = outputFiles.filter(f => {
      const stem = getFilename(f.path).replace(/\.[^.]+$/, '');
      return slugifyForMatch(stem).startsWith(slug);
    });
    if (matches.length === 0) return null;
    // Return the last match (latest version)
    return matches[matches.length - 1];
  }

  function replaceArtifactBlocksInHTML(clone, outputFiles) {
    // Find artifact blocks in the cloned HTML and replace with links
    const blocks = clone.querySelectorAll('.artifact-block-cell');
    blocks.forEach(block => {
      const parent = block.closest('[role="button"][aria-label]');
      if (!parent) return;

      const ariaLabel = parent.getAttribute('aria-label') || '';
      const nameMatch = ariaLabel.match(/^Open artifact:\s*(.+)$/);
      if (!nameMatch) return;

      const artifactName = nameMatch[1].trim();
      const text = block.textContent || '';

      // Parse type and format from text like "Ch01 paper reamsDocument · MD Download"
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

      // Replace the parent button element with our link
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

  // --- Actions ---

  function copyToClipboard() {
    const messages = extractConversation();
    if (messages.length === 0) {
      showToast('No conversation found on this page');
      return;
    }
    const md = toMarkdown(messages);
    navigator.clipboard.writeText(md).then(() => {
      showToast(`Copied ${messages.length} messages as markdown`);
    }).catch(() => {
      showToast('Copy failed — check clipboard permissions');
    });
  }

  function getDateTimeStamp() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
    return { date, time, dateTime: `${date}-${time}` };
  }

  function downloadHTML() {
    const messages = extractConversation();
    if (messages.length === 0) {
      showToast('No conversation found on this page');
      return;
    }
    const title = getConversationTitle();
    const platformName = getPlatformDisplayName().toLowerCase().replace(/\s+/g, '-');
    const { dateTime } = getDateTimeStamp();
    const slug = title ? slugify(title) : 'conversation';
    downloadSimpleHTML(messages, title, platformName, dateTime, slug);
  }

  function exportFullZIP() {
    const messages = extractConversation();
    if (messages.length === 0) {
      showToast('No conversation found on this page');
      return;
    }
    const title = getConversationTitle();
    const platformName = getPlatformDisplayName().toLowerCase().replace(/\s+/g, '-');
    const { dateTime } = getDateTimeStamp();
    const slug = title ? slugify(title) : 'conversation';
    downloadWithArtifacts(messages, title, platformName, dateTime, slug);
  }

  function downloadSimpleHTML(messages, title, platformName, date, slug) {
    const html = toHTML(messages);
    const filename = `recurate-${platformName}-${slug}-${date}.html`;

    try {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.documentElement.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 100);
      showToast(`Downloaded ${messages.length} messages as HTML`);
    } catch (err) {
      showToast('Download failed — try Cmd+Shift+D');
      console.error('Recurate Copier download error:', err);
    }
  }

  async function downloadWithArtifacts(messages, title, platformName, date, slug) {
    const chatId = getChatId();
    if (!chatId) {
      // No chat ID — fall back to simple download
      downloadSimpleHTML(messages, title, platformName, date, slug);
      return;
    }

    const orgId = await getOrgId();
    if (!orgId) {
      downloadSimpleHTML(messages, title, platformName, date, slug);
      return;
    }

    const allFiles = await listFiles(orgId, chatId);
    const outputPaths = allFiles.filter(f => f.includes('/outputs/'));
    const uploadPaths = allFiles.filter(f => f.includes('/uploads/'));

    if (outputPaths.length === 0 && uploadPaths.length === 0) {
      downloadSimpleHTML(messages, title, platformName, date, slug);
      return;
    }

    // We have artifacts — show modal and build a ZIP
    const totalFiles = outputPaths.length + uploadPaths.length;
    showExportModal(totalFiles);

    const outputFiles = deduplicateFilenames(outputPaths);
    const uploadFiles = deduplicateFilenames(uploadPaths);

    // Build the HTML with inline artifact links and manifest
    const html = toHTML(messages, outputFiles, uploadFiles);

    // Create ZIP
    const zip = new JSZip();
    const folderName = `recurate-${platformName}-${slug}-${date}`;

    zip.file(folderName + '/conversation.html', html);

    // Download and add all files
    let downloaded = 0;
    let failed = 0;
    const downloadAndAdd = async (files, subfolder) => {
      for (const file of files) {
        if (exportCancelled) return;
        const blob = await downloadFile(orgId, chatId, file.path);
        if (blob) {
          zip.file(folderName + '/' + subfolder + '/' + file.filename, blob);
        } else {
          failed++;
        }
        downloaded++;
        updateExportModal(downloaded, totalFiles, `Downloading ${subfolder}...`);
      }
    };

    await downloadAndAdd(outputFiles, 'artifacts');
    await downloadAndAdd(uploadFiles, 'uploads');

    if (exportCancelled) return;

    updateExportModal(totalFiles, totalFiles, 'Building ZIP...');

    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = folderName + '.zip';
      a.style.display = 'none';
      document.documentElement.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 100);
      completeExportModal(messages.length, totalFiles - failed);
    } catch (err) {
      console.error('Recurate Copier ZIP error:', err);
      failExportModal('ZIP creation failed');
      setTimeout(() => {
        downloadSimpleHTML(messages, title, platformName, date, slug);
      }, 2000);
    }
  }

  // --- Export progress modal ---

  let exportCancelled = false;

  function showExportModal(totalFiles) {
    exportCancelled = false;
    removeExportModal();

    const overlay = document.createElement('div');
    overlay.id = 'rc-copier-modal-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      zIndex: '2147483647', background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
    });

    const modal = document.createElement('div');
    modal.id = 'rc-copier-modal';
    Object.assign(modal.style, {
      background: '#fff', borderRadius: '16px', padding: '28px 32px',
      minWidth: '340px', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      textAlign: 'center',
    });

    modal.innerHTML = `
      <div style="margin-bottom:16px;">
        <div id="rc-modal-spinner" style="width:36px;height:36px;border:3px solid #e0e7ff;border-top-color:#4f46e5;border-radius:50%;animation:rc-spin 0.8s linear infinite;margin:0 auto;"></div>
      </div>
      <div id="rc-modal-title" style="font-size:16px;font-weight:600;color:#1e1b4b;margin-bottom:6px;">Exporting conversation</div>
      <div id="rc-modal-status" style="font-size:13px;color:#6b7280;margin-bottom:16px;">Checking for artifacts...</div>
      <div style="background:#f3f4f6;border-radius:8px;height:6px;overflow:hidden;margin-bottom:12px;">
        <div id="rc-modal-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#4338CA,#6366F1);border-radius:8px;transition:width 0.3s ease;"></div>
      </div>
      <div id="rc-modal-detail" style="font-size:11px;color:#9ca3af;">0 of ${totalFiles} files</div>
      <button id="rc-modal-cancel" type="button" style="margin-top:8px;border:1px solid #d1d5db;background:#fff;color:#6b7280;padding:5px 16px;border-radius:8px;font-size:12px;cursor:pointer;">Cancel</button>
    `;

    const style = document.createElement('style');
    style.id = 'rc-copier-modal-style';
    style.textContent = '@keyframes rc-spin { to { transform: rotate(360deg); } }';
    if (!document.getElementById('rc-copier-modal-style')) {
      document.head.appendChild(style);
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('rc-modal-cancel').addEventListener('click', () => {
      exportCancelled = true;
      removeExportModal();
      showToast('Export cancelled');
    });
  }

  function updateExportModal(downloaded, total, statusText) {
    const status = document.getElementById('rc-modal-status');
    const detail = document.getElementById('rc-modal-detail');
    const bar = document.getElementById('rc-modal-progress-bar');
    if (status && statusText) status.textContent = statusText;
    if (detail) detail.textContent = `${downloaded} of ${total} files`;
    if (bar) bar.style.width = Math.round((downloaded / total) * 100) + '%';
  }

  function completeExportModal(messageCount, fileCount) {
    const spinner = document.getElementById('rc-modal-spinner');
    const title = document.getElementById('rc-modal-title');
    const status = document.getElementById('rc-modal-status');
    const detail = document.getElementById('rc-modal-detail');
    const bar = document.getElementById('rc-modal-progress-bar');

    if (spinner) spinner.style.cssText = 'width:36px;height:36px;margin:0 auto;font-size:28px;line-height:36px;';
    if (spinner) spinner.textContent = '\u2713';
    if (title) title.textContent = 'Export complete';
    if (status) status.textContent = `${messageCount} messages + ${fileCount} files`;
    if (detail) detail.textContent = 'ZIP downloaded to your computer';
    if (bar) bar.style.width = '100%';

    setTimeout(removeExportModal, 2500);
  }

  function failExportModal(errorText) {
    const spinner = document.getElementById('rc-modal-spinner');
    const title = document.getElementById('rc-modal-title');
    const status = document.getElementById('rc-modal-status');

    if (spinner) spinner.style.cssText = 'width:36px;height:36px;margin:0 auto;font-size:28px;line-height:36px;color:#ef4444;';
    if (spinner) spinner.textContent = '\u2717';
    if (title) { title.textContent = 'Export failed'; title.style.color = '#ef4444'; }
    if (status) status.textContent = errorText;

    setTimeout(removeExportModal, 3000);
  }

  function removeExportModal() {
    const overlay = document.getElementById('rc-copier-modal-overlay');
    if (overlay) overlay.remove();
  }

  // --- Toast notification ---

  function showToast(message) {
    const existing = document.getElementById('rc-copier-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'rc-copier-toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
      zIndex: '2147483647', padding: '10px 20px', borderRadius: '8px',
      background: '#1e1b4b', color: '#e0e7ff', fontSize: '13px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)', transition: 'opacity 0.3s ease',
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; }, 2500);
    setTimeout(() => { toast.remove(); }, 3000);
  }

  // --- UI: inject into platform button rows ---

  // SVG icons matching Claude's button style (20x20, fill="currentColor")
  const COPY_ALL_SVG = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6 2a2 2 0 0 0-2 2v1H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6zm8 10a1 1 0 0 1-1 1H5V7a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v5zM3 6h1v7a2 2 0 0 0 2 2h6v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/></svg>';
  const DOWNLOAD_SVG = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a.5.5 0 0 1 .5.5v9.793l2.646-2.647a.5.5 0 0 1 .708.708l-3.5 3.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 0 1 .708-.708L9.5 12.293V2.5A.5.5 0 0 1 10 2zM4 14.5a.5.5 0 0 1 1 0v1a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 1 1 0v1a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 15.5v-1z"/></svg>';
  // ZIP/archive icon for full export (only on Claude.ai)
  const EXPORT_ZIP_SVG = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M2 4a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm7.5 2a.5.5 0 0 0-.5.5v5.793l-1.646-1.647a.5.5 0 0 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l2.5-2.5a.5.5 0 0 0-.708-.708L10 12.293V6.5a.5.5 0 0 0-.5-.5z"/></svg>';

  function findLastActionBar() {
    const platform = getPlatform();

    switch (platform) {
      case 'claude': {
        // Claude: div[role="group"][aria-label="Message actions"]
        const bars = document.querySelectorAll('div[role="group"][aria-label="Message actions"]');
        return bars.length > 0 ? bars[bars.length - 1] : null;
      }
      case 'chatgpt': {
        // ChatGPT: action bar has aria-label="Response actions"
        const bars = document.querySelectorAll('[aria-label="Response actions"]');
        return bars.length > 0 ? bars[bars.length - 1] : null;
      }
      case 'grok': {
        // Grok: div.action-buttons contains Regenerate, Copy, Like, Dislike etc.
        const bars = document.querySelectorAll('div.action-buttons');
        if (bars.length > 0) {
          const last = bars[bars.length - 1];
          // Find the flex container with the buttons inside
          return last.querySelector('div.flex') || last;
        }
        return null;
      }
      case 'gemini': {
        // Gemini: <message-actions> custom element with class "footer"
        const bars = document.querySelectorAll('message-actions');
        if (bars.length > 0) {
          // Find the buttons-container inside the last message-actions
          const last = bars[bars.length - 1];
          return last.querySelector('.buttons-container-v2') ||
                 last.querySelector('.actions-container-v2') || last;
        }
        return null;
      }
      case 'google': {
        // Google AI Mode: position above the input box (top-right), complementing Composer (top-left)
        // Return null to trigger custom positioning in injectButtons()
        return null;
      }
      default:
        return null;
    }
  }

  function createActionButton(svgIcon, title, onClick) {
    const platform = getPlatform();

    if (platform === 'claude') {
      // Match Claude's exact button structure
      const wrapper = document.createElement('div');
      wrapper.className = 'w-fit';
      wrapper.setAttribute('data-state', 'closed');

      const btn = document.createElement('button');
      btn.className = 'inline-flex items-center justify-center relative isolate shrink-0 can-focus select-none border-transparent transition font-base duration-300 h-8 w-8 rounded-md group/btn _fill_56vq7_9 _ghost_56vq7_96';
      btn.type = 'button';
      btn.setAttribute('aria-label', title);
      btn.title = title;

      const iconDiv = document.createElement('div');
      iconDiv.className = 'text-text-500 group-hover/btn:text-text-100';
      iconDiv.style.cssText = 'width:20px;height:20px;display:flex;align-items:center;justify-content:center;';
      iconDiv.innerHTML = svgIcon;

      btn.appendChild(iconDiv);
      wrapper.appendChild(btn);

      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });

      return wrapper;
    }

    // Generic fallback button
    const btn = document.createElement('button');
    btn.innerHTML = svgIcon;
    btn.title = title;
    btn.style.cssText = 'border:none;background:transparent;cursor:pointer;padding:4px;border-radius:4px;display:flex;align-items:center;';
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
    return btn;
  }

  function injectButtons() {
    // Remove previously injected buttons
    document.querySelectorAll('.rc-copier-injected').forEach(el => el.remove());

    const bar = findLastActionBar();

    if (bar) {
      // Inject into the platform's native action bar
      const copyBtn = createActionButton(COPY_ALL_SVG, 'Copy full conversation (markdown)', copyToClipboard);
      copyBtn.classList.add('rc-copier-injected');

      const dlBtn = createActionButton(DOWNLOAD_SVG, 'Download full conversation (HTML)', downloadHTML);
      dlBtn.classList.add('rc-copier-injected');

      const sep = document.createElement('div');
      sep.className = 'rc-copier-injected';
      sep.style.cssText = 'width:1px;height:16px;background:currentColor;opacity:0.15;margin:0 2px;align-self:center;';

      bar.appendChild(sep);
      bar.appendChild(copyBtn);
      bar.appendChild(dlBtn);

      // Add Export ZIP button on Claude.ai only
      if (getPlatform() === 'claude') {
        const exportBtn = createActionButton(EXPORT_ZIP_SVG, 'Export conversation + artifacts (ZIP)', exportFullZIP);
        exportBtn.classList.add('rc-copier-injected');
        bar.appendChild(exportBtn);
      }
    } else {
      // Fallback: floating buttons for platforms without action bar injection
      showFloatingButtons();
    }
  }

  function getInputContainer() {
    const platform = getPlatform();
    switch (platform) {
      case 'google': {
        // Google AI Mode: find the textarea/input area
        const textarea = document.querySelector('textarea') ||
                         document.querySelector('[contenteditable="true"]');
        if (textarea) {
          return textarea.closest('form') ||
                 textarea.closest('[role="combobox"]')?.parentElement ||
                 textarea.parentElement?.parentElement?.parentElement;
        }
        return null;
      }
      default:
        return null;
    }
  }

  function positionAboveInput(cluster) {
    const container = getInputContainer();
    if (!container) {
      // Fallback to fixed bottom-right
      Object.assign(cluster.style, {
        position: 'fixed', bottom: '20px', right: '20px',
        top: 'auto', left: 'auto', transform: 'none',
      });
      return;
    }
    const rect = container.getBoundingClientRect();
    Object.assign(cluster.style, {
      position: 'fixed',
      top: `${rect.top - cluster.offsetHeight - 6}px`,
      left: `${rect.right - cluster.offsetWidth}px`,
      bottom: 'auto', right: 'auto', transform: 'none',
    });
  }

  function showFloatingButtons() {
    if (document.getElementById('rc-copier-floating')) return;

    const cluster = document.createElement('div');
    cluster.id = 'rc-copier-floating';
    cluster.className = 'rc-copier-injected';

    const copyBtn = document.createElement('button');
    copyBtn.innerHTML = COPY_ALL_SVG;
    copyBtn.title = 'Copy full conversation (markdown)';
    copyBtn.className = 'rc-copier-float-btn';
    copyBtn.addEventListener('mousedown', e => e.preventDefault());
    copyBtn.onclick = e => { e.stopPropagation(); copyToClipboard(); };

    const dlBtn = document.createElement('button');
    dlBtn.innerHTML = DOWNLOAD_SVG;
    dlBtn.title = 'Download full conversation (HTML)';
    dlBtn.className = 'rc-copier-float-btn';
    dlBtn.addEventListener('mousedown', e => e.preventDefault());
    dlBtn.onclick = e => { e.stopPropagation(); downloadHTML(); };

    cluster.appendChild(copyBtn);
    cluster.appendChild(dlBtn);

    Object.assign(cluster.style, {
      zIndex: '2147483647', display: 'flex', gap: '4px',
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      padding: '6px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
    });

    const style = document.createElement('style');
    style.id = 'rc-copier-float-style';
    if (!document.getElementById('rc-copier-float-style')) {
      style.textContent = `
        #rc-copier-floating .rc-copier-float-btn {
          width:36px;height:36px;border:none;border-radius:8px;
          cursor:pointer;font-size:16px;background:transparent;color:#555;
          display:flex;align-items:center;justify-content:center;
          transition:all .12s ease;
        }
        #rc-copier-floating .rc-copier-float-btn:hover { background:rgba(66,133,244,0.1);color:#1a73e8; }
        #rc-copier-floating .rc-copier-float-btn:active { transform:scale(0.92); }
        @media (prefers-color-scheme:dark) {
          #rc-copier-floating { background:rgba(40,40,38,0.92)!important;border-color:rgba(255,255,255,0.1)!important; }
          #rc-copier-floating .rc-copier-float-btn { color:#aaa; }
          #rc-copier-floating .rc-copier-float-btn:hover { color:#7ab4ff; }
        }
      `;
      document.head.appendChild(style);
    }
    document.body.appendChild(cluster);

    // Position above input box on Google, fixed bottom-right elsewhere
    if (getPlatform() === 'google') {
      requestAnimationFrame(() => positionAboveInput(cluster));
      // Re-position on scroll
      window.addEventListener('scroll', () => {
        requestAnimationFrame(() => positionAboveInput(cluster));
      }, true);
      setInterval(() => positionAboveInput(cluster), 1500);
    } else {
      Object.assign(cluster.style, {
        position: 'fixed', bottom: '20px', right: '20px',
      });
    }
  }

  function buildUI() {
    if (!getPlatform()) return;
    injectButtons();
  }

  // Keyboard shortcut: Cmd/Ctrl+Shift+C = copy, Cmd/Ctrl+Shift+D = download
  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
    if (e.key === 'C' || e.key === 'c') {
      if (e.shiftKey) { e.preventDefault(); copyToClipboard(); }
    }
    if (e.key === 'D' || e.key === 'd') {
      if (e.shiftKey) { e.preventDefault(); downloadHTML(); }
    }
  });

  // --- Init ---
  // Inject after page loads, and re-inject periodically
  // (new AI responses create new action bars, our buttons need to follow the latest one)
  setTimeout(buildUI, 2000);
  setInterval(buildUI, 3000);
})();
