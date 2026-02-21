import { useEffect } from 'preact/hooks';
import { connectionStatus, setResponse, currentResponse, hasAnnotations, showPreview } from './state/annotations';
import { StatusBar } from './components/StatusBar';
import { ResponseView } from './components/ResponseView';
import { AnnotationList } from './components/AnnotationList';
import { FeedbackPreview } from './components/FeedbackPreview';
import type { ExtensionMessage } from '../../lib/types';
import './styles/annotations.css';

export function App() {
  useEffect(() => {
    // Listen for messages from content script (via background)
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
      }
    };

    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

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

          {hasAnnotations.value && !showPreview.value && (
            <div class="apply-bar">
              <button
                class="apply-button"
                onClick={() => { showPreview.value = true; }}
              >
                Apply annotations
              </button>
            </div>
          )}

          {showPreview.value && <FeedbackPreview />}
        </>
      ) : (
        <div class="empty-state">
          <p>Waiting for an AI response...</p>
          <p class="hint">Navigate to a conversation on claude.ai and send a message.</p>
        </div>
      )}
    </div>
  );
}
