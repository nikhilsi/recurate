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
 * Excludes subagent files.
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
 * Extract the latest assistant text response from a JSONL file.
 * Reads from the end of the file to find the most recent assistant message
 * with text content blocks.
 */
function extractLatestAssistantText(filePath: string): ParsedResponse | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  // Walk backwards to find the last assistant message with text
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry: JSONLMessage = JSON.parse(lines[i]);

      if (
        entry.type === 'assistant' &&
        entry.message?.role === 'assistant' &&
        Array.isArray(entry.message.content)
      ) {
        // Extract only text blocks (ignore tool_use, thinking, etc.)
        const textParts = entry.message.content
          .filter(block => block.type === 'text' && block.text)
          .map(block => block.text as string);

        if (textParts.length > 0) {
          return {
            text: textParts.join('\n\n'),
            messageId: entry.uuid || crypto.randomUUID(),
            timestamp: entry.timestamp || new Date().toISOString(),
          };
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  return null;
}

export class JSONLWatcher implements vscode.Disposable {
  private watcher: fs.FSWatcher | null = null;
  private projectDir: string | null = null;
  private lastMessageId: string | null = null;
  private onResponseCallback: ((response: ParsedResponse) => void) | null = null;
  private onStatusCallback: ((status: string) => void) | null = null;

  constructor() {}

  /**
   * Start watching for Claude Code conversation updates.
   * Walks up from the workspace path to find a matching Claude project directory,
   * so it works even when the workspace is a subfolder of the project root.
   */
  start(workspacePath: string): void {
    const claudeDir = path.join(os.homedir(), '.claude', 'projects');
    this.projectDir = this.findProjectDir(claudeDir, workspacePath);

    if (!this.projectDir) {
      this.onStatusCallback?.('disconnected');
      // Watch for the exact path's directory to be created
      const encodedPath = encodeProjectPath(workspacePath);
      this.watchForProjectDir(claudeDir, encodedPath);
      return;
    }

    this.startWatching();
  }

  /**
   * Walk up from workspacePath to find a Claude project directory that exists.
   * e.g. if workspace is /Users/foo/project/sub, checks:
   *   -Users-foo-project-sub → -Users-foo-project → -Users-foo → ...
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
    // Poll for project dir creation (fs.watch on parent can be noisy)
    const interval = setInterval(() => {
      const dir = path.join(claudeDir, encodedPath);
      if (fs.existsSync(dir)) {
        clearInterval(interval);
        this.projectDir = dir;
        this.startWatching();
      }
    }, 5000);
  }

  private startWatching(): void {
    if (!this.projectDir) return;

    this.onStatusCallback?.('watching');

    // Check for existing session immediately
    this.checkForNewMessages();

    // Watch the project directory for changes
    try {
      this.watcher = fs.watch(this.projectDir, { recursive: false }, (eventType, filename) => {
        if (filename && filename.endsWith('.jsonl')) {
          // Debounce slightly — JSONL gets many rapid writes during streaming
          setTimeout(() => this.checkForNewMessages(), 300);
        }
      });
    } catch {
      // Fallback: poll every 2 seconds
      setInterval(() => this.checkForNewMessages(), 2000);
    }
  }

  private checkForNewMessages(): void {
    if (!this.projectDir) return;

    const sessionFile = findActiveSession(this.projectDir);
    if (!sessionFile) return;

    const response = extractLatestAssistantText(sessionFile);
    if (!response) return;

    // Only notify if this is a new message
    if (response.messageId === this.lastMessageId) return;
    this.lastMessageId = response.messageId;

    this.onStatusCallback?.('ready');
    this.onResponseCallback?.(response);
  }

  onResponse(callback: (response: ParsedResponse) => void): void {
    this.onResponseCallback = callback;
  }

  onStatus(callback: (status: string) => void): void {
    this.onStatusCallback = callback;
  }

  dispose(): void {
    this.watcher?.close();
    this.watcher = null;
  }
}
