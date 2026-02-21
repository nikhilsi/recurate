/**
 * claude.ai platform-specific DOM selectors and extraction/injection logic.
 *
 * These selectors are reverse-engineered and may break on platform updates.
 * The extension should handle failures gracefully.
 */

export const SELECTORS = {
  // Response detection — data-is-streaming is the most stable selector
  responseStreaming: '[data-is-streaming="true"]',
  responseComplete: '[data-is-streaming="false"]',

  // Content within response containers (fallback chain)
  responseContent: [
    '.font-claude-message',
    '[data-testid*="message"]',
    '.prose',
    '[class*="markdown"]',
  ],

  // User messages
  userMessage: '[data-testid="user-message"]',

  // Text input — ProseMirror contenteditable
  inputEditor: 'div.ProseMirror[contenteditable="true"]',
  inputEditorFallback: '[contenteditable="true"]',

  // Streaming indicators
  stopButton: 'button[aria-label*="Stop"], button[title*="Stop"]',
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
  if ((container.textContent?.length ?? 0) > 10) return container;
  return null;
}

/**
 * Extract the latest completed AI response from the page.
 */
export function extractLatestResponse(): { html: string; text: string } | null {
  const responses = document.querySelectorAll(SELECTORS.responseComplete);
  if (responses.length === 0) return null;

  const latest = responses[responses.length - 1];
  const content = findContentElement(latest);
  if (!content) return null;

  return {
    html: content.innerHTML,
    text: content.textContent || '',
  };
}

/**
 * Check if the AI is currently generating a response.
 */
export function isStreaming(): boolean {
  if (document.querySelector(SELECTORS.responseStreaming)) return true;
  if (document.querySelector(SELECTORS.stopButton)) return true;
  return false;
}

/**
 * Inject structured feedback text into claude.ai's ProseMirror text input.
 * Returns true if injection succeeded.
 */
export function injectFeedback(text: string): boolean {
  const editor =
    document.querySelector(SELECTORS.inputEditor) ||
    document.querySelector(SELECTORS.inputEditorFallback);

  if (!editor) return false;

  // ProseMirror expects <p> elements as children
  const lines = text.split('\n');
  for (const line of lines) {
    const p = document.createElement('p');
    p.textContent = line || '\u200B'; // Zero-width space for empty lines
    editor.appendChild(p);
  }

  // Dispatch input event so ProseMirror syncs its internal state
  editor.dispatchEvent(new Event('input', { bubbles: true }));

  // Focus the editor so the user can start typing their message
  (editor as HTMLElement).focus();

  return true;
}
