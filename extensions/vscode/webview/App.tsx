import { useEffect } from 'preact/hooks';
import { connectionStatus, setResponse, currentResponse, annotations, hasAnnotations } from './state/annotations';
import { formatFeedback } from '../shared/formatter';
import { sendMessage, onMessage } from './messaging';
import { StatusBar } from './components/StatusBar';
import { ResponseView } from './components/ResponseView';
import { AnnotationList } from './components/AnnotationList';
import type { ExtensionMessage } from '../shared/types';
import './styles/annotations.css';

export function App() {
  useEffect(() => {
    const cleanup = onMessage((message: ExtensionMessage) => {
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
    });

    // Detect VS Code theme from body class
    const body = document.body;
    const isLight = body.classList.contains('vscode-light');
    document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');

    return cleanup;
  }, []);

  const handleCopyFeedback = () => {
    const feedback = formatFeedback(annotations.value);
    if (feedback) {
      sendMessage({ type: 'COPY_FEEDBACK', feedback });
    }
  };

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
            <div class="copy-feedback-bar">
              <button class="copy-feedback-btn" onClick={handleCopyFeedback}>
                Copy Feedback
              </button>
              <span class="copy-feedback-hint">Paste into Claude Code</span>
            </div>
          )}
        </>
      ) : (
        <div class="empty-state">
          <p>Waiting for a Claude Code response...</p>
          <p class="hint">Start Claude Code in this workspace and send a message.</p>
        </div>
      )}
    </div>
  );
}
