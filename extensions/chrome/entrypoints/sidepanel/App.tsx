import { useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { connectionStatus, setResponse, currentResponse, annotations, hasAnnotations } from './state/annotations';
import { formatFeedback } from '../../lib/formatter';
import { StatusBar } from './components/StatusBar';
import { ResponseView } from './components/ResponseView';
import { AnnotationList } from './components/AnnotationList';
import type { ExtensionMessage } from '../../lib/types';
import './styles/annotations.css';

export function App() {
  const extractionFailed = useSignal(false);
  const injectionFallback = useSignal<string | null>(null);

  useEffect(() => {
    const listener = (message: ExtensionMessage) => {
      switch (message.type) {
        case 'RESPONSE_READY':
          extractionFailed.value = false;
          injectionFallback.value = null;
          setResponse({
            html: message.html,
            text: message.text,
            messageId: message.messageId,
            timestamp: Date.now(),
          });
          break;
        case 'CONNECTION_STATUS':
          connectionStatus.value = message.status;
          if (message.status === 'streaming') {
            extractionFailed.value = false;
          }
          break;
        case 'THEME_CHANGED':
          document.documentElement.setAttribute('data-theme', message.theme);
          break;
        case 'EXTRACTION_FAILED':
          extractionFailed.value = true;
          break;
        case 'INJECTION_FAILED':
          injectionFallback.value = message.feedback;
          break;
      }
    };

    browser.runtime.onMessage.addListener(listener);

    // Fallback: use system preference if no theme message arrives
    if (!document.documentElement.hasAttribute('data-theme')) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }

    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  // Send pending feedback to content script whenever annotations change
  const annotationList = annotations.value;
  useEffect(() => {
    const feedback = annotationList.length > 0 ? formatFeedback(annotationList) : null;
    injectionFallback.value = null;
    browser.runtime.sendMessage({
      type: 'PENDING_FEEDBACK',
      feedback,
    } as ExtensionMessage).catch(() => {});
  }, [annotationList]);

  return (
    <div class="app">
      <header class="app-header">
        <h1>Recurate</h1>
      </header>

      <StatusBar />

      {currentResponse.value ? (
        <>
          <ResponseView />
          <AnnotationList />

          {injectionFallback.value && (
            <div class="injection-fallback">
              <p class="injection-fallback-label">Could not inject into text box. Copy and paste manually:</p>
              <pre class="injection-fallback-text">{injectionFallback.value}</pre>
              <button
                class="injection-fallback-copy"
                onClick={() => {
                  navigator.clipboard.writeText(injectionFallback.value!).catch(() => {});
                  injectionFallback.value = null;
                }}
              >
                Copy to clipboard
              </button>
            </div>
          )}

          {hasAnnotations.value && !injectionFallback.value && (
            <div class="feedback-pending">
              Annotations will be included in your next message
            </div>
          )}
        </>
      ) : (
        <div class="empty-state">
          {extractionFailed.value ? (
            <>
              <p>Could not detect the AI response.</p>
              <p class="hint">The page structure may have changed. Try reloading the page.</p>
            </>
          ) : (
            <>
              <p>Waiting for an AI response...</p>
              <p class="hint">Navigate to a conversation on claude.ai or ChatGPT and send a message.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
