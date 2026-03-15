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

  function getEditor() {
    switch (getPlatform()) {
      case 'claude':
        return document.querySelector('.ProseMirror[contenteditable="true"]');
      case 'chatgpt':
        return document.querySelector('#prompt-textarea') ||
               document.querySelector('.ProseMirror[contenteditable="true"]');
      case 'gemini':
        return document.querySelector('.ql-editor[contenteditable="true"]') ||
               document.querySelector('[contenteditable="true"]');
      case 'copilot':
        return document.querySelector('textarea#userInput') ||
               document.querySelector('[role="textbox"]');
      case 'copilot-enterprise':
        return document.querySelector('#m365-chat-editor-target-element') ||
               document.querySelector('[role="textbox"][aria-label="Message Copilot"]');
      case 'grok':
        return document.querySelector('.tiptap.ProseMirror[contenteditable="true"]') ||
               document.querySelector('[contenteditable="true"]');
      case 'google':
        return document.querySelector('textarea[name="q"]') || document.querySelector('textarea');
      default:
        return null;
    }
  }

  // Find the outermost container that wraps the editor (for positioning the toolbar above it)
  function getEditorContainer() {
    const editor = getEditor();
    if (!editor) return null;

    switch (getPlatform()) {
      case 'claude':
        return editor.closest('[class*="composer"]') ||
               editor.closest('form') ||
               editor.closest('fieldset') ||
               editor.parentElement?.parentElement?.parentElement;
      case 'chatgpt':
        return editor.closest('form') ||
               editor.parentElement?.parentElement?.parentElement;
      case 'gemini':
        return editor.closest('form') ||
               editor.closest('[class*="input"]') ||
               editor.parentElement?.parentElement;
      case 'copilot':
        return editor.closest('form') ||
               editor.closest('[class*="input"]') ||
               editor.parentElement?.parentElement;
      case 'copilot-enterprise':
        return editor.closest('[class*="chat-input"]') ||
               editor.closest('form') ||
               editor.parentElement?.parentElement?.parentElement;
      case 'grok':
        return editor.closest('.query-bar') ||
               editor.closest('form') ||
               editor.parentElement?.parentElement?.parentElement;
      case 'google':
        // Google search box: the visible rounded bar is a few levels up from the textarea
        return editor.closest('[role="combobox"]')?.parentElement ||
               editor.closest('.SDkEP') ||
               editor.closest('[class*="search"]') ||
               editor.parentElement?.parentElement?.parentElement;
      default:
        return null;
    }
  }

  // --- Editor operations ---

  function isTextarea(el) {
    return el && el.tagName === 'TEXTAREA';
  }

  function pasteIntoEditor(editor, text) {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    editor.dispatchEvent(new ClipboardEvent('paste', {
      clipboardData: dt, bubbles: true, cancelable: true
    }));
  }

  function applyWrap(prefix, suffix) {
    const editor = getEditor();
    if (!editor) return;
    editor.focus();

    if (isTextarea(editor)) {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const text = editor.value;
      const selected = text.substring(start, end);
      const wrapped = prefix + selected + suffix;
      editor.value = text.substring(0, start) + wrapped + text.substring(end);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      const newPos = selected.length === 0 ? start + prefix.length : start + wrapped.length;
      editor.setSelectionRange(newPos, newPos);
    } else {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const selected = range.toString();
      if (selected.length > 0) range.deleteContents();
      pasteIntoEditor(editor, prefix + selected + suffix);
      // Move cursor between prefix/suffix when no text selected
      // Skip on Gemini — sel.modify crosses line boundaries in their editor
      if (selected.length === 0 && getPlatform() !== 'gemini') {
        for (let i = 0; i < suffix.length; i++) sel.modify('move', 'backward', 'character');
      }
    }
  }

  function applyLine(prefix) {
    const editor = getEditor();
    if (!editor) return;
    editor.focus();

    if (isTextarea(editor)) {
      const start = editor.selectionStart;
      const text = editor.value;
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      editor.value = text.substring(0, lineStart) + prefix + text.substring(lineStart);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length);
    } else {
      // ProseMirror / contenteditable: select the entire paragraph, replace with prefix + original
      const sel = window.getSelection();
      if (!sel.rangeCount) return;

      // Walk up from cursor to find the paragraph element
      let node = sel.anchorNode;
      if (node.nodeType === 3) node = node.parentElement;

      // Try <p> first (most common in ProseMirror), then other block elements
      // but never match the editor itself
      let blockEl = node.closest('p');
      if (!blockEl || blockEl === editor) {
        blockEl = node.closest('li, h1, h2, h3, h4, blockquote');
      }
      if (!blockEl || blockEl === editor) {
        let child = node;
        while (child && child.parentElement !== editor) {
          child = child.parentElement;
        }
        blockEl = child || node;
      }
      if (!blockEl || blockEl === editor) return;

      const originalText = blockEl.textContent;

      // Select all content in the block
      const range = document.createRange();
      range.selectNodeContents(blockEl);
      sel.removeAllRanges();
      sel.addRange(range);

      // Dispatch selectionchange so ProseMirror syncs its internal selection state
      // Then paste after a short delay to let the framework process it
      document.dispatchEvent(new Event('selectionchange'));
      setTimeout(() => {
        pasteIntoEditor(editor, prefix + originalText);
      }, 15);
    }
  }

  function getNextListNumber() {
    const editor = getEditor();
    if (!editor) return 1;

    if (isTextarea(editor)) {
      const pos = editor.selectionStart;
      const text = editor.value;
      const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
      // Look at the previous line
      const prevLineEnd = lineStart - 1;
      if (prevLineEnd <= 0) return 1;
      const prevLineStart = text.lastIndexOf('\n', prevLineEnd - 1) + 1;
      const prevLine = text.substring(prevLineStart, prevLineEnd);
      const match = prevLine.match(/^(\d+)\.\s/);
      return match ? parseInt(match[1], 10) + 1 : 1;
    } else {
      // Contenteditable: look at the previous sibling block
      const sel = window.getSelection();
      if (!sel.rangeCount) return 1;
      let node = sel.anchorNode;
      if (node.nodeType === 3) node = node.parentElement;
      let blockEl = node.closest('p') || node.closest('li, div');
      if (!blockEl || blockEl === editor) {
        let child = node;
        while (child && child.parentElement !== editor) child = child.parentElement;
        blockEl = child || node;
      }
      const prevBlock = blockEl?.previousElementSibling;
      if (prevBlock) {
        const match = prevBlock.textContent.match(/^(\d+)\.\s/);
        if (match) return parseInt(match[1], 10) + 1;
      }
      return 1;
    }
  }

  function insertText(text) {
    const editor = getEditor();
    if (!editor) return;
    editor.focus();

    if (isTextarea(editor)) {
      const pos = editor.selectionStart;
      const val = editor.value;
      editor.value = val.substring(0, pos) + text + val.substring(pos);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.setSelectionRange(pos + text.length, pos + text.length);
    } else {
      pasteIntoEditor(editor, text);
    }
  }

  // --- Actions ---

  const actions = [
    { label: 'B', title: 'Bold', fn: () => applyWrap('**', '**'), key: 'b' },
    { label: 'I', title: 'Italic', fn: () => applyWrap('_', '_'), key: 'i' },
    { label: 'S', title: 'Strikethrough', fn: () => applyWrap('~~', '~~') },
    { type: 'sep' },
    { label: 'H1', title: 'Heading 1', fn: () => applyLine('# ') },
    { label: 'H2', title: 'Heading 2', fn: () => applyLine('## ') },
    { label: 'H3', title: 'Heading 3', fn: () => applyLine('### ') },
    { type: 'sep' },
    { label: '`', title: 'Inline code', fn: () => applyWrap('`', '`'), key: 'e' },
    { label: '```', title: 'Code block', fn: () => applyWrap('```\n', '\n```') },
    { type: 'sep' },
    { label: '\u2022', title: 'Bullet list', fn: () => applyLine('- ') },
    { label: '1.', title: 'Numbered list', fn: () => applyLine(`${getNextListNumber()}. `) },
    { label: '>', title: 'Blockquote', fn: () => applyLine('> ') },
    { type: 'sep' },
    { label: 'link', title: 'Link', fn: () => applyWrap('[', '](url)'), key: 'k' },
    { label: '\u2014', title: 'Horizontal rule', fn: () => insertText('\n---\n') },
  ];

  // --- Toolbar UI ---

  let toolbar = null;
  let isDocked = true;
  let resizeObserver = null;
  let repositionInterval = null;

  function positionAboveEditor() {
    if (!toolbar || !isDocked) return;

    const container = getEditorContainer();
    if (!container) {
      // No editor visible — hide toolbar
      toolbar.style.display = 'none';
      return;
    }

    toolbar.style.display = 'flex';
    const rect = container.getBoundingClientRect();

    toolbar.style.position = 'fixed';
    toolbar.style.left = `${rect.left}px`;
    toolbar.style.top = `${rect.top - toolbar.offsetHeight - 6}px`;
    toolbar.style.bottom = 'auto';
    toolbar.style.transform = 'none';
  }

  function buildToolbar() {
    if (document.getElementById('md-toolbar')) return;

    const bar = document.createElement('div');
    bar.id = 'md-toolbar';
    toolbar = bar;

    // Collapse/expand toggle
    let collapsed = false;
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '\u2303';
    toggleBtn.title = 'Collapse/Expand';
    toggleBtn.className = 'md-tb-toggle';
    toggleBtn.addEventListener('mousedown', e => e.preventDefault());
    toggleBtn.onclick = e => {
      e.stopPropagation();
      collapsed = !collapsed;
      btnWrap.style.display = collapsed ? 'none' : 'flex';
      toggleBtn.textContent = collapsed ? '\u2304' : '\u2303';
      bar.style.padding = collapsed ? '4px 8px' : '6px';
      // Reposition after size change
      requestAnimationFrame(positionAboveEditor);
    };
    bar.appendChild(toggleBtn);

    // Button container
    const btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;gap:3px;align-items:center;flex-wrap:wrap;max-width:520px;';

    actions.forEach(act => {
      if (act.type === 'sep') {
        const sep = document.createElement('div');
        sep.className = 'md-tb-sep';
        btnWrap.appendChild(sep);
        return;
      }
      const btn = document.createElement('button');
      btn.textContent = act.label;
      btn.title = act.title;
      btn.className = 'md-tb-btn';
      if (act.label === 'B') btn.style.fontWeight = '700';
      if (act.label === 'I') btn.style.fontStyle = 'italic';
      if (act.label === 'S') btn.style.textDecoration = 'line-through';
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.onclick = e => { e.stopPropagation(); act.fn(); };
      btnWrap.appendChild(btn);
    });
    bar.appendChild(btnWrap);

    // --- Dragging (detaches from docked position) ---
    let isDragging = false, offsetX, offsetY;
    bar.addEventListener('mousedown', e => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      isDocked = false; // Detach from editor
      offsetX = e.clientX - bar.getBoundingClientRect().left;
      offsetY = e.clientY - bar.getBoundingClientRect().top;
      bar.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      bar.style.left = `${e.clientX - offsetX}px`;
      bar.style.top = `${e.clientY - offsetY}px`;
      bar.style.bottom = 'auto';
      bar.style.transform = 'none';
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
      if (bar) bar.style.cursor = 'grab';
    });

    // Double-click to re-dock
    bar.addEventListener('dblclick', e => {
      if (e.target.tagName === 'BUTTON') return;
      isDocked = true;
      positionAboveEditor();
    });

    // Base styles (position will be set by positionAboveEditor)
    Object.assign(bar.style, {
      position: 'fixed',
      zIndex: '2147483647', display: 'flex', gap: '6px', cursor: 'grab', alignItems: 'center',
      background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      padding: '6px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      transition: 'padding 0.15s ease'
    });

    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
      #md-toolbar .md-tb-btn {
        padding:4px 10px;border:none;border-radius:8px;cursor:pointer;
        font-size:12px;font-weight:500;background:transparent;color:#555;
        min-width:32px;transition:all .12s ease;line-height:1.4;
      }
      #md-toolbar .md-tb-btn:hover { background:rgba(66,133,244,0.1);color:#1a73e8; }
      #md-toolbar .md-tb-btn:active { background:rgba(66,133,244,0.18);transform:scale(0.95); }
      #md-toolbar .md-tb-toggle {
        padding:2px 8px;border:none;border-radius:6px;cursor:pointer;
        font-size:11px;background:transparent;color:#999;transition:all .12s ease;
      }
      #md-toolbar .md-tb-toggle:hover { color:#555; }
      #md-toolbar .md-tb-sep {
        width:1px;height:20px;background:rgba(0,0,0,0.12);margin:0 2px;
      }
      @media (prefers-color-scheme:dark) {
        #md-toolbar { background:rgba(40,40,38,0.92) !important;border-color:rgba(255,255,255,0.1) !important; }
        #md-toolbar .md-tb-btn { color:#aaa; }
        #md-toolbar .md-tb-btn:hover { background:rgba(100,160,255,0.15);color:#7ab4ff; }
        #md-toolbar .md-tb-toggle { color:#666; }
        #md-toolbar .md-tb-toggle:hover { color:#aaa; }
        #md-toolbar .md-tb-sep { background:rgba(255,255,255,0.12); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(bar);

    // Initial position
    requestAnimationFrame(positionAboveEditor);

    // Watch for editor container size changes (text box expanding)
    watchEditorResize();
  }

  function watchEditorResize() {
    // Clean up any previous observer
    if (resizeObserver) resizeObserver.disconnect();
    if (repositionInterval) clearInterval(repositionInterval);

    // ResizeObserver for when the editor container grows/shrinks
    const container = getEditorContainer();
    if (container) {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(positionAboveEditor);
      });
      resizeObserver.observe(container);
    }

    // Scroll listener — reposition on any scroll (page or container)
    let scrollTick = false;
    const onScroll = () => {
      if (!scrollTick) {
        scrollTick = true;
        requestAnimationFrame(() => {
          positionAboveEditor();
          scrollTick = false;
        });
      }
    };
    window.addEventListener('scroll', onScroll, true); // capture phase catches scrollable containers

    // Fallback poll — catches SPA navigation, editor appearing/disappearing,
    // and cases where the container element changes identity
    repositionInterval = setInterval(() => {
      positionAboveEditor();

      // If the container changed (SPA navigation), re-attach ResizeObserver
      const currentContainer = getEditorContainer();
      if (currentContainer && resizeObserver) {
        try { resizeObserver.observe(currentContainer); } catch {}
      }
    }, 1000);
  }

  // Keyboard shortcuts (Cmd/Ctrl + key)
  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const act = actions.find(a => a.key === e.key);
    if (act) { e.preventDefault(); act.fn(); }
  });

  // --- Init ---
  // Wait a beat for SPA frameworks to render their editors
  setTimeout(() => {
    buildToolbar();
  }, 1000);

  // Re-inject if toolbar gets removed (SPA navigation)
  setInterval(() => {
    if (!document.getElementById('md-toolbar')) {
      toolbar = null;
      isDocked = true;
      buildToolbar();
    }
  }, 3000);
})();
