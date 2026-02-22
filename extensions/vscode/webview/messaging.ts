import type { ExtensionMessage } from '../shared/types';

// Acquire the VS Code API (only callable once per webview lifetime)
const vscode = acquireVsCodeApi();

/**
 * Send a message from the webview to the extension host.
 */
export function sendMessage(message: ExtensionMessage): void {
  vscode.postMessage(message);
}

/**
 * Listen for messages from the extension host.
 */
export function onMessage(handler: (message: ExtensionMessage) => void): () => void {
  const listener = (event: MessageEvent) => {
    handler(event.data);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
