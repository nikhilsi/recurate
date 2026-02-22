import { useEffect } from 'preact/hooks';
import {
  connectionStatus, addResponse, setHistory, currentResponse,
  responseHistory, currentIndex, annotations, hasAnnotations,
  canGoNewer, canGoOlder, goNewer, goOlder,
} from './state/annotations';
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
          addResponse({
            html: message.html,
            text: message.text,
            messageId: message.messageId,
            timestamp: Date.now(),
          });
          break;
        case 'RESPONSE_HISTORY':
          setHistory(message.responses.map(r => ({
            html: r.html,
            text: r.text,
            messageId: r.messageId,
            timestamp: Date.now(),
          })));
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

    // Tell the extension host we're ready for messages
    sendMessage({ type: 'WEBVIEW_READY' });

    return cleanup;
  }, []);

  // Auto-copy: whenever annotations change, copy feedback to clipboard
  const annotationList = annotations.value;
  useEffect(() => {
    if (annotationList.length > 0) {
      const feedback = formatFeedback(annotationList);
      if (feedback) {
        sendMessage({ type: 'COPY_FEEDBACK', feedback });
      }
    }
  }, [annotationList]);

  const total = responseHistory.value.length;
  const position = total > 0 ? total - currentIndex.value : 0;

  return (
    <div class="app">
      <header class="app-header">
        <h1>Recurate</h1>
      </header>

      <StatusBar />

      {currentResponse.value ? (
        <>
          {total > 1 && (
            <div class="response-nav">
              <button
                class="nav-btn"
                onClick={goOlder}
                disabled={!canGoOlder.value}
                title="Older response"
              >
                ‹
              </button>
              <span class="nav-label">{position} of {total}</span>
              <button
                class="nav-btn"
                onClick={goNewer}
                disabled={!canGoNewer.value}
                title="Newer response"
              >
                ›
              </button>
            </div>
          )}

          <ResponseView />
          <AnnotationList />

          {hasAnnotations.value && (
            <div class="clipboard-indicator">
              Feedback copied to clipboard
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
