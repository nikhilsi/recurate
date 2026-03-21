import { SELECTORS } from './selectors';
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
 * Inject text into Claude's ProseMirror editor using clipboard paste.
 * This is the safe approach — ProseMirror handles the paste event natively
 * and keeps its internal state in sync (same pattern as Annotator).
 */
export function injectIntoEditor(text: string): boolean {
  const editor = document.querySelector(SELECTORS.editor) as HTMLElement | null;
  if (!editor) return false;

  // Focus and select all existing content
  editor.focus();
  const selection = window.getSelection();
  if (selection) {
    selection.selectAllChildren(editor);
  }

  // Use clipboard paste event to inject — ProseMirror handles this natively
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  const pasteEvent = new ClipboardEvent('paste', {
    clipboardData: dt,
    bubbles: true,
    cancelable: true,
  });
  editor.dispatchEvent(pasteEvent);

  // Dispatch selectionchange so ProseMirror syncs its internal state
  document.dispatchEvent(new Event('selectionchange'));

  return true;
}

/**
 * Click Claude's send button to auto-send the injected text.
 */
export function clickSendButton(): boolean {
  const sendBtn = document.querySelector(SELECTORS.sendButton) as HTMLButtonElement | null;
  if (sendBtn && !sendBtn.disabled) {
    sendBtn.click();
    return true;
  }

  // Fallback: look for send button by data-testid
  const fallback = document.querySelector(
    'button[data-testid*="send"]'
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
    // Delay to let ProseMirror sync before clicking send
    setTimeout(() => clickSendButton(), 250);
  }

  return true;
}

/**
 * Append text to the current editor content (for drag-to-inject).
 * Moves cursor to end, then pastes.
 */
export function appendToEditor(text: string): boolean {
  const editor = document.querySelector(SELECTORS.editor) as HTMLElement | null;
  if (!editor) return false;

  // Move cursor to end of editor
  editor.focus();
  const selection = window.getSelection();
  if (selection) {
    selection.selectAllChildren(editor);
    selection.collapseToEnd();
  }

  // Paste at cursor position
  const dt = new DataTransfer();
  dt.setData('text/plain', '\n\n' + text);
  const pasteEvent = new ClipboardEvent('paste', {
    clipboardData: dt,
    bubbles: true,
    cancelable: true,
  });
  editor.dispatchEvent(pasteEvent);

  document.dispatchEvent(new Event('selectionchange'));

  return true;
}
