import { getPlatform, CLAUDE, COPILOT } from './selectors';
import type { SharedEntry } from './types';

/**
 * Format a shared entry as a quoted block for injection into the input.
 */
export function formatForInjection(entry: SharedEntry): string {
  const lines: string[] = [];
  lines.push(`> **[From ${entry.from}]:**`);

  if (entry.prompt && entry.prompt !== '[Multi-message exchange]') {
    lines.push(`> **You asked:** ${entry.prompt}`);
  }

  if (entry.response) {
    const responseLines = entry.response.split('\n');
    if (entry.prompt === '[Multi-message exchange]') {
      for (const line of responseLines) {
        lines.push(`> ${line}`);
      }
    } else {
      lines.push(`> **Claude:** ${responseLines[0]}`);
      for (let i = 1; i < responseLines.length; i++) {
        lines.push(`> ${responseLines[i]}`);
      }
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Get the editor element for the current platform.
 */
function getEditor(): HTMLElement | null {
  const platform = getPlatform();
  if (platform === 'copilot') {
    return (
      document.querySelector(COPILOT.editor) ||
      document.querySelector(COPILOT.editorFallback) ||
      document.querySelector(COPILOT.lexicalEditor)
    ) as HTMLElement | null;
  }
  return document.querySelector(CLAUDE.editor) as HTMLElement | null;
}

/**
 * Inject text into Claude's ProseMirror editor using clipboard paste.
 */
function injectProseMirror(text: string): boolean {
  const editor = document.querySelector(CLAUDE.editor) as HTMLElement | null;
  if (!editor) return false;

  editor.focus();
  const selection = window.getSelection();
  if (selection) {
    selection.selectAllChildren(editor);
  }

  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  const pasteEvent = new ClipboardEvent('paste', {
    clipboardData: dt,
    bubbles: true,
    cancelable: true,
  });
  editor.dispatchEvent(pasteEvent);
  document.dispatchEvent(new Event('selectionchange'));

  return true;
}

/**
 * Inject text into Copilot's Lexical editor using clipboard paste.
 * Lexical requires selectionchange dispatch + delay before paste.
 */
function injectLexical(text: string): boolean {
  const editor = getEditor();
  if (!editor) return false;

  editor.focus();

  // Select all existing content
  const sel = document.getSelection();
  if (sel) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Lexical needs selectionchange dispatch + tick delay before paste
  document.dispatchEvent(new Event('selectionchange'));

  setTimeout(() => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    editor.dispatchEvent(new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    }));
  }, 10);

  return true;
}

/**
 * Inject text into the editor (platform-aware).
 */
export function injectIntoEditor(text: string): boolean {
  const platform = getPlatform();
  if (platform === 'copilot') return injectLexical(text);
  return injectProseMirror(text);
}

/**
 * Click the send button (platform-aware).
 */
export function clickSendButton(): boolean {
  const platform = getPlatform();
  const selector = platform === 'copilot' ? COPILOT.sendButton : CLAUDE.sendButton;

  const sendBtn = document.querySelector(selector) as HTMLButtonElement | null;
  if (sendBtn && !sendBtn.disabled) {
    sendBtn.click();
    return true;
  }

  // Fallback: broader search
  const fallback = document.querySelector(
    'button[aria-label="Send message"], button[aria-label="Send Message"], button[aria-label="Send"]'
  ) as HTMLButtonElement | null;
  if (fallback && !fallback.disabled) {
    fallback.click();
    return true;
  }

  return false;
}

/**
 * Inject a shared entry into the editor and optionally send it.
 */
export function injectEntry(entry: SharedEntry, autoSend: boolean): boolean {
  const text = formatForInjection(entry);
  const injected = injectIntoEditor(text);
  if (!injected) return false;

  if (autoSend) {
    // Lexical needs more time (10ms paste delay + processing)
    const platform = getPlatform();
    const delay = platform === 'copilot' ? 500 : 250;
    setTimeout(() => clickSendButton(), delay);
  }

  return true;
}
