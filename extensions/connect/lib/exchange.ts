import { SELECTORS } from './selectors';

/**
 * Extract the exchange (user prompt + AI response) for a given message element.
 * If the element is an AI message, find the preceding user message.
 * If the element is a user message, find the following AI response.
 * Returns { prompt, response } with text content.
 */
export function extractExchange(messageEl: HTMLElement): { prompt: string; response: string } {
  // All messages in DOM order
  const allMessages = Array.from(
    document.querySelectorAll(`${SELECTORS.userMessage}, ${SELECTORS.aiMessage}`)
  );

  const index = allMessages.indexOf(messageEl);
  if (index === -1) {
    // Element not found in message list — try to find it as a child
    const parent = messageEl.closest(`${SELECTORS.userMessage}, ${SELECTORS.aiMessage}`);
    if (parent) return extractExchange(parent as HTMLElement);
    return { prompt: '', response: messageEl.textContent?.trim() || '' };
  }

  const isUser = messageEl.matches(SELECTORS.userMessage);

  if (isUser) {
    const prompt = messageEl.textContent?.trim() || '';
    // Look for the next AI message
    const nextAi = allMessages[index + 1];
    const response = nextAi && !nextAi.matches(SELECTORS.userMessage)
      ? getAiMessageText(nextAi as HTMLElement)
      : '';
    return { prompt, response };
  } else {
    // AI message — find preceding user message
    const response = getAiMessageText(messageEl);
    let prompt = '';
    for (let i = index - 1; i >= 0; i--) {
      if (allMessages[i].matches(SELECTORS.userMessage)) {
        prompt = allMessages[i].textContent?.trim() || '';
        break;
      }
    }
    return { prompt, response };
  }
}

/**
 * Extract text from an AI message element, looking inside
 * .font-claude-message or .prose containers.
 */
function getAiMessageText(el: HTMLElement): string {
  const content =
    el.querySelector(SELECTORS.aiMessageContent) ||
    el.querySelector(SELECTORS.aiMessageContentFallback) ||
    el;
  return content.textContent?.trim() || '';
}

/**
 * Extract a range of messages between two elements (inclusive).
 * Returns a combined text block with role labels.
 */
export function extractMessageRange(startEl: HTMLElement, endEl: HTMLElement): { prompt: string; response: string } {
  const allMessages = Array.from(
    document.querySelectorAll(`${SELECTORS.userMessage}, ${SELECTORS.aiMessage}`)
  );

  const startIdx = allMessages.indexOf(startEl);
  const endIdx = allMessages.indexOf(endEl);
  if (startIdx === -1 || endIdx === -1) return { prompt: '', response: '' };

  const [from, to] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
  const parts: string[] = [];

  for (let i = from; i <= to; i++) {
    const el = allMessages[i] as HTMLElement;
    const isUser = el.matches(SELECTORS.userMessage);
    const text = isUser ? el.textContent?.trim() : getAiMessageText(el);
    if (text) {
      parts.push(`**${isUser ? 'You' : 'Claude'}:** ${text}`);
    }
  }

  // For range shares, we put everything in the response field
  // since it's a multi-turn block
  return { prompt: '[Multi-message exchange]', response: parts.join('\n\n') };
}

/**
 * Get the currently selected text within a message, if any.
 */
export function getSelectedText(): string | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return null;
  const text = selection.toString().trim();
  return text.length > 0 ? text : null;
}
