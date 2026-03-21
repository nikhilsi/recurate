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
    // For multi-line responses, indent each line with >
    const responseLines = entry.response.split('\n');
    if (entry.prompt === '[Multi-message exchange]') {
      // Multi-message exchange — already formatted with role labels
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

  lines.push(''); // blank line after quote block
  return lines.join('\n');
}

/**
 * Inject text into Claude's ProseMirror editor.
 * Uses the same pattern as Annotator: clear, build <p> elements, dispatch input event.
 */
export function injectIntoEditor(text: string): boolean {
  const editor = document.querySelector(SELECTORS.editor) as HTMLElement | null;
  if (!editor) return false;

  editor.innerHTML = '';
  const lines = text.split('\n');
  for (const line of lines) {
    const p = document.createElement('p');
    p.textContent = line || '\u200B'; // zero-width space for empty lines
    editor.appendChild(p);
  }

  editor.dispatchEvent(new Event('input', { bubbles: true }));
  editor.focus();
  return true;
}

/**
 * Click Claude's send button to auto-send the injected text.
 */
export function clickSendButton(): boolean {
  // Try the primary send button selector
  const sendBtn = document.querySelector(SELECTORS.sendButton) as HTMLButtonElement | null;
  if (sendBtn && !sendBtn.disabled) {
    sendBtn.click();
    return true;
  }

  // Fallback: look for any button with a send-like aria-label
  const fallback = document.querySelector(
    'button[aria-label*="Send"], button[data-testid*="send"]'
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
    // Small delay to let ProseMirror sync before clicking send
    setTimeout(() => clickSendButton(), 150);
  }

  return true;
}

/**
 * Append text to the current editor content (for drag-to-inject).
 * Unlike injectIntoEditor which replaces, this appends.
 */
export function appendToEditor(text: string): boolean {
  const editor = document.querySelector(SELECTORS.editor) as HTMLElement | null;
  if (!editor) return false;

  // Add a blank line separator if editor already has content
  const existing = editor.textContent?.trim();
  if (existing) {
    const sep = document.createElement('p');
    sep.textContent = '\u200B';
    editor.appendChild(sep);
  }

  const lines = text.split('\n');
  for (const line of lines) {
    const p = document.createElement('p');
    p.textContent = line || '\u200B';
    editor.appendChild(p);
  }

  editor.dispatchEvent(new Event('input', { bubbles: true }));
  editor.focus();
  return true;
}
