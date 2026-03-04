/**
 * Microsoft Copilot Enterprise (m365.cloud.microsoft/chat) platform-specific
 * DOM selectors and extraction/injection logic.
 *
 * Enterprise Copilot has a completely different DOM structure from consumer
 * Copilot (copilot.microsoft.com). See copilot.ts for the consumer version.
 *
 * These selectors are reverse-engineered and may break on platform updates.
 * The extension should handle failures gracefully.
 */

export const SELECTORS = {
  // Response containers — Copilot messages use the fai-CopilotMessage class
  responseContainer: 'div.fai-CopilotMessage',

  // Content within response containers (fallback chain)
  // Enterprise Copilot uses data-testid="markdown-reply" for the actual content
  responseContent: [
    '[data-testid="markdown-reply"]',
    '[data-testid="lastChatMessage"]',
  ],

  // Text input — Enterprise uses a contenteditable <span>
  inputEditor: '#m365-chat-editor-target-element',
  inputEditorFallback: '[role="textbox"][aria-label="Message Copilot"]',

  // Streaming indicator — stop button replaces send button during generation
  // The send button (button.fai-SendButton) changes its aria-label to "Stop generating"
  stopButton: 'button[aria-label="Stop generating"], button[title="Stop generating"]',

  // Send button
  sendButton: 'button.fai-SendButton, button[aria-label="Send"]',

  // User messages (to distinguish from AI messages)
  userMessage: 'div.fai-UserMessage',
};

/**
 * Find the content element within a response container,
 * trying selectors in order until one works.
 */
function findContentElement(container: Element): Element | null {
  for (const selector of SELECTORS.responseContent) {
    const el = container.querySelector(selector);
    if (el && (el.textContent?.length ?? 0) > 10) return el;
  }
  // Fallback: use the container itself if it has substantial text
  if ((container.textContent?.length ?? 0) > 50) return container;
  return null;
}

/**
 * Extract the latest completed AI response from the page.
 */
export function extractLatestResponse(): { html: string; text: string } | null {
  const containers = document.querySelectorAll(SELECTORS.responseContainer);
  if (containers.length === 0) return null;

  // Get the last Copilot message
  const latest = containers[containers.length - 1];
  const content = findContentElement(latest);
  if (!content) return null;

  return {
    html: content.innerHTML,
    text: content.textContent || '',
  };
}

/**
 * Check if the AI is currently generating a response.
 * Enterprise Copilot: the send button changes to "Stop generating" during streaming,
 * and the CopilotMessage element gets aria-busy="true".
 */
export function isStreaming(): boolean {
  // Only use the stop button — it's the definitive signal that the AI is
  // actively generating. The aria-busy attribute on CopilotMessage is unreliable
  // (persists/reappears after responses complete, causing false positives).
  return !!document.querySelector(SELECTORS.stopButton);
}

/**
 * Get the editor element, or null if not found.
 * Enterprise Copilot uses a contenteditable <span>.
 */
export function getEditor(): HTMLElement | null {
  return (
    document.querySelector(SELECTORS.inputEditor) ||
    document.querySelector(SELECTORS.inputEditorFallback)
  ) as HTMLElement | null;
}

/**
 * Get the current text content of the editor.
 */
export function getEditorText(): string {
  const editor = getEditor();
  return editor?.textContent?.trim() || '';
}

// Marker used to identify our injected feedback in the editor
export const FEEDBACK_MARKER = '[Feedback on your previous response]';

/**
 * Set the editor content to the given text, replacing everything.
 * Enterprise Copilot uses a Lexical editor (data-lexical-editor="true").
 * Lexical maintains its own state tree and reverts direct DOM manipulation.
 * The only reliable injection method is via synthetic ClipboardEvent paste,
 * which Lexical's paste handler processes and syncs to internal state.
 */
export function setEditorContent(text: string): boolean {
  const editor = getEditor();
  if (!editor) return false;

  editor.focus();

  // Select all existing content in the DOM
  const sel = document.getSelection();
  if (sel) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Lexical manages its own internal selection state separately from the DOM.
  // Fire selectionchange so Lexical syncs its internal selection to match our
  // "select all" above, then paste after a tick so Lexical has time to process.
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
 * Clear the editor to an empty state.
 */
export function clearEditor(): boolean {
  const editor = getEditor();
  if (!editor) return false;

  editor.focus();

  // Select all and delete via paste of empty string
  const sel = document.getSelection();
  if (sel) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  const dt = new DataTransfer();
  dt.setData('text/plain', '');
  editor.dispatchEvent(new ClipboardEvent('paste', {
    clipboardData: dt,
    bubbles: true,
    cancelable: true,
  }));

  return true;
}
