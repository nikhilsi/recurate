import { extractLatestResponse, isStreaming, getEditor, getEditorText, setEditorContent, clearEditor, FEEDBACK_MARKER } from '../lib/platforms/copilot-enterprise';
import type { ExtensionMessage, Theme } from '../lib/types';

export default defineContentScript({
  matches: ['*://m365.cloud.microsoft/chat*', '*://m365.cloud.microsoft/chat/*'],
  runAt: 'document_idle',

  main() {
    let lastMessageId: string | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingFeedback: string | null = null;
    let wasStreaming = false;
    let injecting = false; // True while we're modifying the editor — ignore observer triggers

    // Notify side panel that we're connected
    sendMessage({ type: 'CONNECTION_STATUS', status: 'connected' });

    // --- Theme detection ---

    function detectTheme(): Theme {
      // Enterprise Copilot doesn't set a theme attribute — use system preference
      const html = document.documentElement;
      if (html.classList.contains('dark')) return 'dark';
      if (html.classList.contains('light')) return 'light';
      if (html.getAttribute('data-theme') === 'dark') return 'dark';
      if (html.getAttribute('data-theme') === 'light') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    sendMessage({ type: 'THEME_CHANGED', theme: detectTheme() });

    const themeObserver = new MutationObserver(() => {
      sendMessage({ type: 'THEME_CHANGED', theme: detectTheme() });
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      sendMessage({ type: 'THEME_CHANGED', theme: detectTheme() });
    });

    // --- Proactive feedback injection ---

    function tryInjectFeedback() {
      if (!pendingFeedback) return;

      const editorText = getEditorText();

      if (editorText === '' || editorTextIsOnlyOurFeedback(editorText)) {
        const success = setEditorContent(pendingFeedback);
        if (!success) {
          sendMessage({ type: 'INJECTION_FAILED', feedback: pendingFeedback });
        }
      }
    }

    function editorTextIsOnlyOurFeedback(text: string): boolean {
      if (!text.startsWith(FEEDBACK_MARKER)) return false;
      return text.trimEnd().endsWith('[Your message below]');
    }

    function clearFeedbackFromEditor() {
      const editorText = getEditorText();
      if (editorTextIsOnlyOurFeedback(editorText)) {
        clearEditor();
      }
    }

    // When editor gets focus, try to inject if pending
    document.addEventListener('focusin', (e) => {
      const editor = getEditor();
      if (editor && editor.contains(e.target as Node) && pendingFeedback) {
        tryInjectFeedback();
      }
    });

    // --- Response detection via MutationObserver ---
    //
    // Enterprise Copilot: watch for stop button or send button disabled state changes.
    // When send button becomes disabled + new content appears = streaming.
    // When send button becomes enabled again = streaming ended.

    const observer = new MutationObserver(() => {
      // Skip mutations caused by our own editor injection — these are DOM
      // changes from the Lexical paste, not from the AI streaming.
      if (injecting) return;

      const streaming = isStreaming();

      if (streaming && !wasStreaming) {
        wasStreaming = true;
        pendingFeedback = null; // Previous feedback was sent — don't re-inject
        sendMessage({ type: 'CONNECTION_STATUS', status: 'streaming' });
      } else if (!streaming && wasStreaming) {
        wasStreaming = false;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          extractAndSend();
        }, 800); // Slightly longer delay for enterprise — DOM may settle slower
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'aria-label', 'title'],
    });

    // --- SPA navigation detection ---

    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        lastMessageId = null;
        pendingFeedback = null;
        wasStreaming = false;
        sendMessage({ type: 'CONNECTION_STATUS', status: 'connected' });
      }
    });
    urlObserver.observe(document.body, { childList: true, subtree: true });

    // --- Incoming messages from side panel (via background) ---

    browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
      if (message.type === 'INJECT_FEEDBACK') {
        injecting = true;
        setEditorContent(message.feedback);
        setTimeout(() => { injecting = false; }, 200);
      }
      if (message.type === 'PENDING_FEEDBACK') {
        pendingFeedback = message.feedback;
        if (pendingFeedback) {
          // Inject directly — Lexical reformats pasted text so the
          // "is only our feedback" guard in tryInjectFeedback fails on
          // subsequent updates. Since PENDING_FEEDBACK always carries our
          // content, it's safe to replace unconditionally.
          injecting = true;
          setEditorContent(pendingFeedback);
          setTimeout(() => { injecting = false; }, 200);
        } else {
          clearFeedbackFromEditor();
        }
      }
    });

    // --- Helpers ---

    function extractAndSend() {
      if (isStreaming()) return;

      const response = extractLatestResponse();
      if (!response) {
        sendMessage({ type: 'EXTRACTION_FAILED' });
        sendMessage({ type: 'CONNECTION_STATUS', status: 'error' });
        return;
      }

      const responseHash = response.text.slice(0, 100);
      if (responseHash === lastMessageId) {
        // Same response seen before — still update status to 'ready'
        sendMessage({ type: 'CONNECTION_STATUS', status: 'ready' });
        return;
      }
      lastMessageId = responseHash;

      const messageId = crypto.randomUUID();
      sendMessage({
        type: 'RESPONSE_READY',
        html: response.html,
        text: response.text,
        messageId,
      });

      sendMessage({ type: 'CONNECTION_STATUS', status: 'ready' });
    }

    function sendMessage(message: ExtensionMessage) {
      browser.runtime.sendMessage(message).catch(() => {});
    }
  },
});
