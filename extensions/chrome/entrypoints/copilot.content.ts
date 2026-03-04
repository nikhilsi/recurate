import { extractLatestResponse, isStreaming, getEditor, getEditorText, setEditorContent, clearEditor, FEEDBACK_MARKER } from '../lib/platforms/copilot';
import type { ExtensionMessage, Theme } from '../lib/types';

export default defineContentScript({
  matches: ['*://copilot.microsoft.com/*'],
  runAt: 'document_idle',

  main() {
    let lastMessageId: string | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingFeedback: string | null = null;
    let wasStreaming = false;

    // Notify side panel that we're connected
    sendMessage({ type: 'CONNECTION_STATUS', status: 'connected' });

    // --- Theme detection ---

    function detectTheme(): Theme {
      const html = document.documentElement;
      // Copilot consumer uses data-theme attribute on <html>
      const dataTheme = html.getAttribute('data-theme');
      if (dataTheme === 'dark') return 'dark';
      if (dataTheme === 'light') return 'light';
      if (html.classList.contains('dark')) return 'dark';
      if (html.classList.contains('light')) return 'light';
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
    // Copilot consumer uses a stop button during generation (like ChatGPT).
    // Watch for stop button appearing (streaming started) and disappearing (streaming ended).

    const observer = new MutationObserver(() => {
      const streaming = isStreaming();

      if (streaming && !wasStreaming) {
        // Streaming just started
        wasStreaming = true;
        sendMessage({ type: 'CONNECTION_STATUS', status: 'streaming' });
      } else if (!streaming && wasStreaming) {
        // Streaming just ended — extract after a brief delay for DOM settling
        wasStreaming = false;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          extractAndSend();
        }, 1200); // Consumer Copilot finalizes response DOM after stop button disappears
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
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
        setEditorContent(message.feedback);
      }
      if (message.type === 'PENDING_FEEDBACK') {
        pendingFeedback = message.feedback;
        if (pendingFeedback) {
          tryInjectFeedback();
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
      if (responseHash === lastMessageId) return;
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
