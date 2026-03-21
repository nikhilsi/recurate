// Platform detection

export type Platform = 'claude' | 'copilot';

export function getPlatform(): Platform | null {
  const host = window.location.host;
  if (host.includes('claude.ai')) return 'claude';
  if (host.includes('m365.cloud.microsoft')) return 'copilot';
  return null;
}

// Claude.ai DOM selectors — proven in Copier and Annotator

export const CLAUDE = {
  chatTitle: '[data-testid="chat-title-button"] .truncate',
  userMessage: '[data-testid="user-message"]',
  aiMessage: '[data-is-streaming="false"]',
  aiMessageContent: '.font-claude-message',
  aiMessageContentFallback: '.prose',
  actionBar: 'div[role="group"][aria-label="Message actions"]',
  editor: 'div.ProseMirror[contenteditable="true"]',
  sendButton: 'button[aria-label="Send message"]',
} as const;

// Copilot Enterprise DOM selectors — proven in Annotator

export const COPILOT = {
  chatTitle: '', // Copilot doesn't show chat titles the same way
  userMessage: 'div.fai-UserMessage',
  aiMessage: 'div.fai-CopilotMessage',
  aiMessageContent: '[data-testid="markdown-reply"]',
  aiMessageContentFallback: '[data-testid="lastChatMessage"]',
  actionBar: '', // Copilot doesn't have per-message action bars like Claude
  editor: '#m365-chat-editor-target-element',
  editorFallback: '[role="textbox"][aria-label="Message Copilot"]',
  lexicalEditor: '[data-lexical-editor="true"]',
  sendButton: 'button[aria-label="Send"]',
} as const;

// Convenience: get selectors for current platform
export function getSelectors() {
  const platform = getPlatform();
  if (platform === 'copilot') return COPILOT;
  return CLAUDE;
}
