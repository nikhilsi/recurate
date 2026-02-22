import * as vscode from 'vscode';
import { marked } from 'marked';
import { RecurateViewProvider } from './webviewProvider';
import { JSONLWatcher } from './jsonlWatcher';
import type { ConnectionStatus, ResponseHistoryItem } from '../shared/types';

export function activate(context: vscode.ExtensionContext) {
  const provider = new RecurateViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      RecurateViewProvider.viewType,
      provider
    )
  );

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const watcher = new JSONLWatcher();

    watcher.onStatus((status: ConnectionStatus) => {
      provider.postMessage({ type: 'CONNECTION_STATUS', status });
    });

    watcher.onResponse(async (response) => {
      try {
        const html = await marked.parse(response.text);
        provider.postMessage({
          type: 'RESPONSE_READY',
          html,
          text: response.text,
          messageId: response.messageId,
        });
      } catch (err) {
        console.error('[Recurate] Failed to parse markdown:', err);
      }
    });

    watcher.onHistory(async (responses) => {
      try {
        const items: ResponseHistoryItem[] = await Promise.all(
          responses.map(async (r) => ({
            html: await marked.parse(r.text),
            text: r.text,
            messageId: r.messageId,
            timestamp: Date.parse(r.timestamp) || Date.now(),
          }))
        );
        provider.postMessage({ type: 'RESPONSE_HISTORY', responses: items });
      } catch (err) {
        console.error('[Recurate] Failed to parse response history:', err);
      }
    });

    // When the sidebar opens (or reopens), re-send current state
    provider.onReady(() => {
      watcher.resend();
    });

    watcher.start(workspaceFolders[0].uri.fsPath);
    context.subscriptions.push(watcher);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('recurate.copyFeedback', () => {
      vscode.window.showInformationMessage('Use the Recurate sidebar to annotate and copy feedback.');
    })
  );
}

export function deactivate() {}
