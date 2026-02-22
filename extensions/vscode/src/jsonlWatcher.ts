import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface JSONLMessage {
  type: string;
  message?: {
    role: string;
    content: Array<{
      type: string;
      text?: string;
      [key: string]: unknown;
    }>;
  };
  timestamp?: string;
  uuid?: string;
}

export interface ParsedResponse {
  text: string;
  messageId: string;
  timestamp: string;
}

/**
 * Encode a filesystem path to Claude's project directory name.
 * /Users/foo/myproject → -Users-foo-myproject
 */
function encodeProjectPath(fsPath: string): string {
  return fsPath.replace(/\//g, '-');
}

/**
 * Find the most recently modified JSONL file in the project directory.
 */
function findActiveSession(projectDir: string): string | null {
  if (!fs.existsSync(projectDir)) return null;

  const files = fs.readdirSync(projectDir)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({
      name: f,
      path: path.join(projectDir, f),
      mtime: fs.statSync(path.join(projectDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return files.length > 0 ? files[0].path : null;
}

/**
 * Read the tail of a file efficiently.
 * For large JSONL files (25MB+), we only need the last ~50KB to find the latest assistant message.
 */
function readTail(filePath: string, bytes: number = 64 * 1024): string {
  const stat = fs.statSync(filePath);
  if (stat.size <= bytes) {
    return fs.readFileSync(filePath, 'utf-8');
  }

  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(bytes);
  fs.readSync(fd, buffer, 0, bytes, stat.size - bytes);
  fs.closeSync(fd);

  const text = buffer.toString('utf-8');
  // Skip the first partial line (we likely landed mid-line)
  const firstNewline = text.indexOf('\n');
  return firstNewline >= 0 ? text.slice(firstNewline + 1) : text;
}

/**
 * Extract the last N assistant text responses from the tail of a JSONL file.
 * Returns newest first.
 */
function extractRecentAssistantTexts(filePath: string, count: number = 5): ParsedResponse[] {
  const content = readTail(filePath);
  const lines = content.trim().split('\n');
  const results: ParsedResponse[] = [];

  for (let i = lines.length - 1; i >= 0 && results.length < count; i--) {
    try {
      const entry: JSONLMessage = JSON.parse(lines[i]);

      if (
        entry.type === 'assistant' &&
        entry.message?.role === 'assistant' &&
        Array.isArray(entry.message.content)
      ) {
        const textParts = entry.message.content
          .filter(block => block.type === 'text' && block.text)
          .map(block => block.text as string);

        if (textParts.length > 0) {
          results.push({
            text: textParts.join('\n\n'),
            messageId: entry.uuid || crypto.randomUUID(),
            timestamp: entry.timestamp || new Date().toISOString(),
          });
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  return results;
}

export class JSONLWatcher implements vscode.Disposable {
  private watcher: fs.FSWatcher | null = null;
  private projectDir: string | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private lastMessageId: string | null = null;
  private responseHistory: ParsedResponse[] = [];
  private currentStatus: string = 'disconnected';
  private onResponseCallback: ((response: ParsedResponse) => void) | null = null;
  private onHistoryCallback: ((responses: ParsedResponse[]) => void) | null = null;
  private onStatusCallback: ((status: string) => void) | null = null;

  /**
   * Start watching for Claude Code conversation updates.
   * Walks up from the workspace path to find a matching Claude project directory.
   */
  start(workspacePath: string): void {
    const claudeDir = path.join(os.homedir(), '.claude', 'projects');
    this.projectDir = this.findProjectDir(claudeDir, workspacePath);

    if (!this.projectDir) {
      this.setStatus('disconnected');
      const encodedPath = encodeProjectPath(workspacePath);
      this.watchForProjectDir(claudeDir, encodedPath);
      return;
    }

    this.startWatching();
  }

  /**
   * Re-send the current status and response history.
   * Called when the webview becomes visible after missing earlier messages.
   */
  resend(): void {
    this.onStatusCallback?.(this.currentStatus);
    if (this.responseHistory.length > 0) {
      this.onHistoryCallback?.(this.responseHistory);
    }
  }

  /**
   * Walk up from workspacePath to find a Claude project directory that exists.
   */
  private findProjectDir(claudeDir: string, workspacePath: string): string | null {
    let current = workspacePath;
    const root = path.parse(current).root;

    while (current && current !== root) {
      const encoded = encodeProjectPath(current);
      const candidate = path.join(claudeDir, encoded);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      current = path.dirname(current);
    }
    return null;
  }

  private watchForProjectDir(claudeDir: string, encodedPath: string): void {
    this.pollInterval = setInterval(() => {
      const dir = path.join(claudeDir, encodedPath);
      if (fs.existsSync(dir)) {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = null;
        this.projectDir = dir;
        this.startWatching();
      }
    }, 5000);
  }

  private startWatching(): void {
    if (!this.projectDir) return;

    this.setStatus('watching');
    this.checkForNewMessages();

    try {
      this.watcher = fs.watch(this.projectDir, { recursive: false }, (_eventType, filename) => {
        if (filename && filename.endsWith('.jsonl')) {
          setTimeout(() => this.checkForNewMessages(), 300);
        }
      });
    } catch {
      this.pollInterval = setInterval(() => this.checkForNewMessages(), 2000);
    }
  }

  private checkForNewMessages(): void {
    if (!this.projectDir) return;

    const sessionFile = findActiveSession(this.projectDir);
    if (!sessionFile) return;

    const responses = extractRecentAssistantTexts(sessionFile, 5);
    if (responses.length === 0) return;

    const latest = responses[0];
    if (latest.messageId === this.lastMessageId) return;
    this.lastMessageId = latest.messageId;
    this.responseHistory = responses;

    this.setStatus('ready');
    this.onResponseCallback?.(latest);
  }

  private setStatus(status: string): void {
    this.currentStatus = status;
    this.onStatusCallback?.(status);
  }

  onResponse(callback: (response: ParsedResponse) => void): void {
    this.onResponseCallback = callback;
  }

  onHistory(callback: (responses: ParsedResponse[]) => void): void {
    this.onHistoryCallback = callback;
  }

  onStatus(callback: (status: string) => void): void {
    this.onStatusCallback = callback;
  }

  dispose(): void {
    this.watcher?.close();
    this.watcher = null;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
