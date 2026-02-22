import * as vscode from 'vscode';
import { marked } from 'marked';
import { RecurateViewProvider } from './webviewProvider';
import { JSONLWatcher } from './jsonlWatcher';
import type { ExtensionMessage } from '../shared/types';

export function activate(context: vscode.ExtensionContext) {
  // Create the sidebar webview provider
  const provider = new RecurateViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      RecurateViewProvider.viewType,
      provider
    )
  );

  // Start the JSONL watcher for the current workspace
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const watcher = new JSONLWatcher();

    watcher.onStatus((status) => {
      provider.postMessage({
        type: 'CONNECTION_STATUS',
        status: status as ExtensionMessage extends { type: 'CONNECTION_STATUS' } ? ExtensionMessage : never extends { status: infer S } ? S : string,
      } as ExtensionMessage);
    });

    watcher.onResponse(async (response) => {
      // Convert markdown to HTML for the webview
      const html = await marked.parse(response.text);

      provider.postMessage({
        type: 'RESPONSE_READY',
        html,
        text: response.text,
        messageId: response.messageId,
      });
    });

    watcher.start(workspaceFolders[0].uri.fsPath);
    context.subscriptions.push(watcher);
  }

  // Register the copy feedback command
  context.subscriptions.push(
    vscode.commands.registerCommand('recurate.copyFeedback', () => {
      // Command can be triggered from command palette — webview handles the actual copy
      vscode.window.showInformationMessage('Use the Recurate sidebar to annotate and copy feedback.');
    })
  );
}

export function deactivate() {}
