/**
 * Microsoft Copilot (copilot.microsoft.com) platform-specific DOM selectors
 * and extraction/injection logic.
 *
 * Consumer version of Copilot. For enterprise (m365.cloud.microsoft),
 * see copilot-enterprise.ts.
 *
 * These selectors are reverse-engineered and may break on platform updates.
 * The extension should handle failures gracefully.
 */

export const SELECTORS = {
  // Response containers — AI messages have data-testid="ai-message"
  responseContainer: '[data-testid="ai-message"]',

  // Content within response containers (fallback chain)
  // Copilot uses group/ai-message-item divs with standard HTML (h2, h3, p, ul)
  responseContent: [
    '.group\\/ai-message-item',
    '[class*="ai-message-item"]',
  ],

  // Text input — Copilot consumer uses a plain textarea
  inputEditor: 'textarea#userInput',
  inputEditorFallback: '[role="textbox"]',

  // Streaming indicator — stop button present during generation
  stopButton: 'button[data-testid="stop-button"], button[aria-label="Interrupt message"]',

  // Send button (for reference)
  sendButton: 'button[aria-label="Send message"]',
};

/**
 * Find the content elements within a response container.
 * Copilot AI messages contain multiple content items (group/ai-message-item divs).
 * We concatenate their innerHTML for the full response.
 */
function findContentElements(container: Element): Element[] {
  for (const selector of SELECTORS.responseContent) {
    const els = container.querySelectorAll(selector);
    if (els.length > 0) {
      return Array.from(els).filter(el => (el.textContent?.length ?? 0) > 10);
    }
  }
  return [];
}

/**
 * Extract the latest completed AI response from the page.
 */
export function extractLatestResponse(): { html: string; text: string } | null {
  const containers = document.querySelectorAll(SELECTORS.responseContainer);
  if (containers.length === 0) return null;

  // Get the last AI message
  const latest = containers[containers.length - 1];

  // Find content items within the message
  const contentEls = findContentElements(latest);
  if (contentEls.length > 0) {
    const html = contentEls.map(el => el.innerHTML).join('\n');
    const text = contentEls.map(el => el.textContent || '').join('\n');
    if (text.length > 10) return { html, text };
  }

  // Fallback: use the container's text directly (skip first child which is the author header)
  const text = latest.textContent || '';
  if (text.length > 10) {
    return {
      html: latest.innerHTML,
      text,
    };
  }

  return null;
}

/**
 * Check if the AI is currently generating a response.
 */
export function isStreaming(): boolean {
  return !!document.querySelector(SELECTORS.stopButton);
}

/**
 * Get the textarea editor element, or null if not found.
 */
export function getEditor(): HTMLElement | null {
  return (
    document.querySelector(SELECTORS.inputEditor) ||
    document.querySelector(SELECTORS.inputEditorFallback)
  ) as HTMLElement | null;
}

function isTextarea(el: HTMLElement): el is HTMLTextAreaElement {
  return el.tagName === 'TEXTAREA';
}

/**
 * Get the current text content of the editor.
 */
export function getEditorText(): string {
  const editor = getEditor();
  if (!editor) return '';
  if (isTextarea(editor)) return editor.value.trim();
  return editor.textContent?.trim() || '';
}

// Marker used to identify our injected feedback in the editor
export const FEEDBACK_MARKER = '[Feedback on your previous response]';

/**
 * Set the editor content to the given text, replacing everything.
 * Copilot consumer uses a textarea — use native setter to bypass React.
 */
export function setEditorContent(text: string): boolean {
  const editor = getEditor();
  if (!editor) return false;

  if (isTextarea(editor)) {
    // Textarea path — use native setter to bypass React/framework
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;
    if (nativeSetter) {
      nativeSetter.call(editor, text);
    } else {
      editor.value = text;
    }
  } else {
    // Contenteditable fallback — rebuild with <p> elements
    editor.innerHTML = '';
    const lines = text.split('\n');
    for (const line of lines) {
      const p = document.createElement('p');
      p.textContent = line || '\u200B';
      editor.appendChild(p);
    }
  }

  editor.dispatchEvent(new Event('input', { bubbles: true }));
  editor.focus();
  return true;
}

/**
 * Clear the editor to an empty state.
 */
export function clearEditor(): boolean {
  const editor = getEditor();
  if (!editor) return false;

  if (isTextarea(editor)) {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;
    if (nativeSetter) {
      nativeSetter.call(editor, '');
    } else {
      editor.value = '';
    }
  } else {
    editor.innerHTML = '<p><br></p>';
  }

  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}
