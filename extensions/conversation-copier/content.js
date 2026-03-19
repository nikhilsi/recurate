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
            messages.push({ role: 'user', text: el.textContent?.trim() || '', html: el.innerHTML });
          } else {
            const content = el.querySelector('.font-claude-message') ||
                            el.querySelector('[data-testid*="message"]') ||
                            el.querySelector('.prose') || el;
            messages.push({ role: 'assistant', text: content.textContent?.trim() || '', html: content.innerHTML });
          }
        });
        break;
      }

      case 'chatgpt': {
        // ChatGPT: all turns in article[data-testid^="conversation-turn-"]
        // AI turns have .markdown.prose content; user turns don't
        const articles = document.querySelectorAll('article[data-testid^="conversation-turn-"]');
        articles.forEach(article => {
          const markdownContent = article.querySelector('.markdown.prose') ||
                                  article.querySelector('.prose') ||
                                  article.querySelector('[class*="markdown"]');
          if (markdownContent) {
            messages.push({ role: 'assistant', text: markdownContent.textContent?.trim() || '', html: markdownContent.innerHTML });
          } else {
            // User message — get the text content
            const userText = article.querySelector('[data-message-author-role="user"]') || article;
            messages.push({ role: 'user', text: userText.textContent?.trim() || '', html: userText.innerHTML });
          }
        });
        break;
      }

      case 'grok': {
        // Grok: messages in the conversation area
        // Try common patterns — message containers with role indicators
        const turns = document.querySelectorAll('[class*="message"], [class*="turn"], [data-testid*="message"]');
        if (turns.length === 0) {
          // Fallback: look for the main conversation container and walk direct children
          const container = document.querySelector('main') || document.querySelector('[role="main"]');
          if (container) {
            const blocks = container.querySelectorAll('[class*="response"], [class*="query"]');
            blocks.forEach(block => {
              const isUser = block.className.includes('query') || block.className.includes('user');
              messages.push({
                role: isUser ? 'user' : 'assistant',
                text: block.textContent?.trim() || '',
                html: block.innerHTML,
              });
            });
          }
        } else {
          turns.forEach(turn => {
            const isUser = turn.getAttribute('data-message-author-role') === 'user' ||
                           turn.className.includes('user') ||
                           turn.className.includes('human');
            messages.push({
              role: isUser ? 'user' : 'assistant',
              text: turn.textContent?.trim() || '',
              html: turn.innerHTML,
            });
          });
        }
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
            messages.push({
              role: isUser ? 'user' : 'assistant',
              text: turn.textContent?.trim() || '',
              html: turn.innerHTML,
            });
          });
        } else {
          // Fallback: look for model-response and user-query pairs
          const allBlocks = document.querySelectorAll(
            'model-response, user-query, [class*="response-container"], [class*="query-container"]'
          );
          allBlocks.forEach(block => {
            const isUser = block.tagName === 'USER-QUERY' || block.className.includes('query');
            messages.push({
              role: isUser ? 'user' : 'assistant',
              text: block.textContent?.trim() || '',
              html: block.innerHTML,
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
            // Get the main content area but exclude action buttons and UI chrome
            const content = aiEl.querySelector('[data-container-id="main-col"]') ||
                            aiEl.querySelector('[dir="ltr"]') || aiEl;
            // Clone and strip out buttons, action bars, and non-content elements
            const clone = content.cloneNode(true);
            clone.querySelectorAll('button, [role="button"], [aria-label*="response"], [aria-label*="Copy"], [aria-label*="Share"], [aria-label*="perspective"], [class*="Labs"]').forEach(el => el.remove());
            // Remove hidden elements and elements with display:none
            clone.querySelectorAll('[style*="display:none"], [style*="display: none"]').forEach(el => el.remove());
            // Remove remaining UI text nodes (Search Labs, Copy, Good/Bad response, etc.)
            const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
            const junkPatterns = /^(Search Labs|Copy|Creating a public link|Good response|Bad response|Would you like to see this from a different perspective\?|Legal Counsel|Procurement Specialist|IT Management Consultant)\.{0,3}$/;
            const junkNodes = [];
            while (walker.nextNode()) {
              if (junkPatterns.test(walker.currentNode.textContent.trim())) {
                junkNodes.push(walker.currentNode.parentElement || walker.currentNode);
              }
            }
            junkNodes.forEach(n => n.remove());
            // Remove stray SVGs and icon elements (beaker, checkmarks, etc.)
            clone.querySelectorAll('svg, img[src*="icon"], [class*="icon"]').forEach(el => el.remove());
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

  function toHTML(messages) {
    const platform = getPlatformDisplayName();
    const title = getConversationTitle();
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    let body = '';
    for (const msg of messages) {
      if (msg.role === 'user') {
        body += `<div class="message user">
          <div class="label">You</div>
          <div class="content">${escapeHtml(msg.text)}</div>
        </div>`;
      } else {
        // Use innerHTML from DOM — already rendered with proper formatting
        body += `<div class="message assistant">
          <div class="label">${platform}</div>
          <div class="content">${msg.html}</div>
        </div>`;
      }
    }

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
<div class="footer">Exported with <a href="https://recurate.ai">Recurate Copier</a></div>
</body>
</html>`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

  function downloadHTML() {
    const messages = extractConversation();
    if (messages.length === 0) {
      showToast('No conversation found on this page');
      return;
    }
    const html = toHTML(messages);
    const title = getConversationTitle();
    const platform = getPlatformDisplayName().toLowerCase();
    const date = new Date().toISOString().slice(0, 10);
    const slug = title ? slugify(title) : platform;
    const filename = `recurate-${slug}-${date}.html`;

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

  function findLastActionBar() {
    const platform = getPlatform();

    switch (platform) {
      case 'claude': {
        // Claude: div[role="group"][aria-label="Message actions"]
        const bars = document.querySelectorAll('div[role="group"][aria-label="Message actions"]');
        return bars.length > 0 ? bars[bars.length - 1] : null;
      }
      case 'chatgpt': {
        // ChatGPT: look for the action buttons area in the last assistant turn
        const articles = document.querySelectorAll('article[data-testid^="conversation-turn-"]');
        for (let i = articles.length - 1; i >= 0; i--) {
          const bar = articles[i].querySelector('[class*="flex"][class*="items-center"]');
          if (bar) return bar;
        }
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
    } else {
      // Fallback: floating buttons for platforms without action bar injection
      showFloatingButtons();
    }
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
      position: 'fixed', bottom: '20px', right: '20px',
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
