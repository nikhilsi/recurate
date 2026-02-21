/**
 * ChatGPT (chat.com / chatgpt.com) platform-specific DOM selectors and extraction/injection logic.
 *
 * These selectors are reverse-engineered and may break on platform updates.
 * The extension should handle failures gracefully.
 */

export const SELECTORS = {
  // Response containers — assistant messages are in <article> elements
  responseArticle: 'article[data-testid^="conversation-turn-"]',

  // Content within response containers (fallback chain)
  responseContent: [
    '.markdown.prose',
    '.prose',
    '[class*="markdown"]',
  ],

  // Text input — ChatGPT uses #prompt-textarea (may be textarea or contenteditable div)
  inputEditor: '#prompt-textarea',
  inputEditorFallback: '[contenteditable="true"]',

  // Streaming indicator — stop button present during generation
  stopButton: 'button[aria-label="Stop generating"], button[data-testid="stop-button"]',

  // Send button (for reference, not used — user sends normally)
  sendButton: 'button[data-testid="send-button"]',
};

/**
 * Find the content element within a response article,
 * trying selectors in order until one works.
 */
function findContentElement(article: Element): Element | null {
  for (const selector of SELECTORS.responseContent) {
    const el = article.querySelector(selector);
    if (el && (el.textContent?.length ?? 0) > 10) return el;
  }
  return null;
}

/**
 * Check if an article is an assistant (not user) message.
 * Assistant messages contain markdown/prose content; user messages don't.
 */
function isAssistantMessage(article: Element): boolean {
  return !!findContentElement(article);
}

/**
 * Extract the latest completed AI response from the page.
 */
export function extractLatestResponse(): { html: string; text: string } | null {
  const articles = document.querySelectorAll(SELECTORS.responseArticle);
  if (articles.length === 0) return null;

  // Find the last assistant message (iterate from end)
  for (let i = articles.length - 1; i >= 0; i--) {
    const article = articles[i];
    if (!isAssistantMessage(article)) continue;

    const content = findContentElement(article);
    if (!content) continue;

    return {
      html: content.innerHTML,
      text: content.textContent || '',
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
 * Get the editor element, or null if not found.
 * ChatGPT's input may be a <textarea> or a contenteditable <div> — handle both.
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
 * Handles both textarea and contenteditable div.
 */
export function setEditorContent(text: string): boolean {
  const editor = getEditor();
  if (!editor) return false;

  if (isTextarea(editor)) {
    // Textarea path — use native setter to bypass React
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;
    if (nativeSetter) {
      nativeSetter.call(editor, text);
    } else {
      editor.value = text;
    }
  } else {
    // Contenteditable div path — rebuild with <p> elements (same approach as claude.ai)
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
