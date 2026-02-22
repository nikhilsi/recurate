import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { ExtensionMessage } from '../shared/types';
import { copyFeedbackToClipboard } from './clipboard';

export class RecurateViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'recurate.annotator';
  private view: vscode.WebviewView | undefined;
  private onReadyCallback: (() => void) | null = null;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview'),
      ],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((message: ExtensionMessage) => {
      if (message.type === 'COPY_FEEDBACK') {
        copyFeedbackToClipboard(message.feedback);
      } else if (message.type === 'WEBVIEW_READY') {
        // Webview script has loaded and is listening — safe to send state
        this.onReadyCallback?.();
      }
    });
  }

  /**
   * Register a callback for when the webview becomes visible.
   * Used by the watcher to re-send current state.
   */
  onReady(callback: () => void): void {
    this.onReadyCallback = callback;
  }

  /**
   * Send a message to the webview.
   */
  postMessage(message: ExtensionMessage): void {
    this.view?.webview.postMessage(message);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const distPath = path.join(this.extensionUri.fsPath, 'dist', 'webview');

    // Find the built JS and CSS files
    const jsFile = this.findAsset(distPath, '.js');
    const cssFile = this.findAsset(distPath, '.css');

    const jsUri = jsFile
      ? webview.asWebviewUri(vscode.Uri.file(jsFile))
      : '';
    const cssUri = cssFile
      ? webview.asWebviewUri(vscode.Uri.file(cssFile))
      : '';

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  ${cssUri ? `<link rel="stylesheet" href="${cssUri}">` : ''}
  <title>Recurate Annotator</title>
</head>
<body>
  <div id="app"></div>
  ${jsUri ? `<script nonce="${nonce}" type="module" src="${jsUri}"></script>` : '<p>Extension not built. Run npm run compile.</p>'}
</body>
</html>`;
  }

  private findAsset(dir: string, ext: string): string | null {
    if (!fs.existsSync(dir)) return null;

    // Check for assets/ subdirectory (Vite output)
    const assetsDir = path.join(dir, 'assets');
    const searchDirs = [dir];
    if (fs.existsSync(assetsDir)) searchDirs.push(assetsDir);

    for (const d of searchDirs) {
      const files = fs.readdirSync(d).filter(f => f.endsWith(ext));
      if (files.length > 0) return path.join(d, files[0]);
    }
    return null;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
