import { useEffect } from 'preact/hooks';
import { connectionStatus, setResponse, currentResponse, annotations, hasAnnotations } from './state/annotations';
import { formatFeedback } from '../../lib/formatter';
import { StatusBar } from './components/StatusBar';
import { ResponseView } from './components/ResponseView';
import { AnnotationList } from './components/AnnotationList';
import type { ExtensionMessage } from '../../lib/types';
import './styles/annotations.css';

export function App() {
  useEffect(() => {
    const listener = (message: ExtensionMessage) => {
      switch (message.type) {
        case 'RESPONSE_READY':
          setResponse({
            html: message.html,
            text: message.text,
            messageId: message.messageId,
            timestamp: Date.now(),
          });
          break;
        case 'CONNECTION_STATUS':
          connectionStatus.value = message.status;
          break;
        case 'THEME_CHANGED':
          document.documentElement.setAttribute('data-theme', message.theme);
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

          {hasAnnotations.value && (
            <div class="feedback-pending">
              Annotations will be included in your next message
            </div>
          )}
        </>
      ) : (
        <div class="empty-state">
          <p>Waiting for an AI response...</p>
          <p class="hint">Navigate to a conversation on claude.ai or ChatGPT and send a message.</p>
        </div>
      )}
    </div>
  );
}
