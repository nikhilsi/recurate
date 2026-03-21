// Claude.ai DOM selectors — proven in Copier and Annotator

export const SELECTORS = {
  // Chat identity
  chatTitle: '[data-testid="chat-title-button"] .truncate',

  // Messages
  userMessage: '[data-testid="user-message"]',
  aiMessage: '[data-is-streaming="false"]',
  aiMessageContent: '.font-claude-message',
  aiMessageContentFallback: '.prose',

  // Action bar (per-message buttons: copy, thumbs, retry, etc.)
  actionBar: 'div[role="group"][aria-label="Message actions"]',

  // ProseMirror input
  editor: 'div.ProseMirror[contenteditable="true"]',

  // Send button
  sendButton: 'button[aria-label="Send Message"]',
} as const;
