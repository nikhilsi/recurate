import { extractLatestResponse, isStreaming, injectFeedback } from '../lib/platforms/claude';
import type { ExtensionMessage } from '../lib/types';

export default defineContentScript({
  matches: ['*://claude.ai/*'],
  runAt: 'document_idle',

  main() {
    let lastMessageId: string | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Notify side panel that we're connected
    sendMessage({ type: 'CONNECTION_STATUS', status: 'connected' });

    // --- Response detection via MutationObserver ---

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Watch for data-is-streaming attribute changes
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-is-streaming'
        ) {
          const target = mutation.target as HTMLElement;
          const streamingState = target.getAttribute('data-is-streaming');

          if (streamingState === 'true') {
            sendMessage({ type: 'CONNECTION_STATUS', status: 'streaming' });
          } else if (streamingState === 'false') {
            // Response complete — debounce briefly to let DOM settle
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
        sendMessage({ type: 'CONNECTION_STATUS', status: 'connected' });
      }
    });
    urlObserver.observe(document.body, { childList: true, subtree: true });

    // --- Incoming messages from side panel (via background) ---

    browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
      if (message.type === 'INJECT_FEEDBACK') {
        const success = injectFeedback(message.feedback);
        if (!success) {
          console.warn('[Recurate] Failed to inject feedback — input field not found');
        }
      }
    });

    // --- Helpers ---

    function extractAndSend() {
      if (isStreaming()) return; // Still streaming, wait

      const response = extractLatestResponse();
      if (!response) return;

      // Avoid sending the same response twice
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
      browser.runtime.sendMessage(message).catch(() => {
        // Side panel may not be open — ignore
      });
    }
  },
});
