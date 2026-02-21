import { extractLatestResponse, isStreaming, getEditor, getEditorText, setEditorContent, clearEditor, FEEDBACK_MARKER, SELECTORS } from '../lib/platforms/claude';
import type { ExtensionMessage, Theme } from '../lib/types';

export default defineContentScript({
  matches: ['*://claude.ai/*'],
  runAt: 'document_idle',

  main() {
    let lastMessageId: string | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingFeedback: string | null = null;

    // Notify side panel that we're connected
    sendMessage({ type: 'CONNECTION_STATUS', status: 'connected' });

    // --- Theme detection ---

    function detectTheme(): Theme {
      const html = document.documentElement;
      if (html.classList.contains('dark')) return 'dark';
      if (html.classList.contains('light')) return 'light';
      if (html.getAttribute('data-theme') === 'dark') return 'dark';
      if (html.getAttribute('data-theme') === 'light') return 'light';
      if (document.body?.classList.contains('dark')) return 'dark';
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
    //
    // Instead of intercepting Enter/send (fragile with ProseMirror),
    // we inject feedback directly into the text box when annotations change.
    // The user types their message after it and sends normally.

    /**
     * Try to inject pending feedback into the editor.
     * - If editor is empty → inject the feedback
     * - If editor contains our previous feedback (no user text after it) → replace with updated feedback
     * - If editor has user content → don't touch it
     */
    function tryInjectFeedback() {
      if (!pendingFeedback) return;

      const editorText = getEditorText();

      if (editorText === '' || editorTextIsOnlyOurFeedback(editorText)) {
        setEditorContent(pendingFeedback);
      }
      // If editor has user content, leave it alone — feedback stays pending
      // and will inject next time the editor is empty
    }

    /**
     * Check if the editor content is only our feedback (no user text typed after it).
     */
    function editorTextIsOnlyOurFeedback(text: string): boolean {
      if (!text.startsWith(FEEDBACK_MARKER)) return false;
      // Our feedback ends with "[Your message below]"
      // If the text ends with that (possibly with trailing whitespace), it's just our feedback
      return text.trimEnd().endsWith('[Your message below]');
    }

    /**
     * Remove our feedback from the editor if annotations were cleared.
     */
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

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-is-streaming'
        ) {
          const target = mutation.target as HTMLElement;
          const streamingState = target.getAttribute('data-is-streaming');

          if (streamingState === 'true') {
            sendMessage({ type: 'CONNECTION_STATUS', status: 'streaming' });
          } else if (streamingState === 'false') {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              extractAndSend();
            }, 500);
          }
        }
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-is-streaming'],
      subtree: true,
    });

    // --- SPA navigation detection ---

    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        lastMessageId = null;
        pendingFeedback = null;
        sendMessage({ type: 'CONNECTION_STATUS', status: 'connected' });
      }
    });
    urlObserver.observe(document.body, { childList: true, subtree: true });

    // --- Incoming messages from side panel (via background) ---

    browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
      if (message.type === 'INJECT_FEEDBACK') {
        // Legacy manual inject — keep as fallback
        setEditorContent(message.feedback);
      }
      if (message.type === 'PENDING_FEEDBACK') {
        pendingFeedback = message.feedback;
        if (pendingFeedback) {
          // Try to inject immediately — works if editor is empty or has stale feedback
          tryInjectFeedback();
        } else {
          // Annotations cleared — remove our feedback from editor if present
          clearFeedbackFromEditor();
        }
      }
    });

    // --- Helpers ---

    function extractAndSend() {
      if (isStreaming()) return;

      const response = extractLatestResponse();
      if (!response) return;

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
