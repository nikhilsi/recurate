export type AnnotationType = 'highlight' | 'strikethrough' | 'deeper' | 'verify';

export interface Annotation {
  id: string;
  type: AnnotationType;
  text: string;
  startOffset: number;
  endOffset: number;
  createdAt: number;
}

export interface ResponseData {
  html: string;
  text: string;
  messageId: string;
  timestamp: number;
}

export type ConnectionStatus = 'disconnected' | 'connected' | 'watching' | 'ready';

export type Theme = 'light' | 'dark';

// VS Code extension ↔ webview message types
export interface ResponseHistoryItem {
  html: string;
  text: string;
  messageId: string;
  timestamp: number;
}

// VS Code extension ↔ webview message types
export type ExtensionMessage =
  | { type: 'RESPONSE_READY'; html: string; text: string; messageId: string }
  | { type: 'RESPONSE_HISTORY'; responses: ResponseHistoryItem[] }
  | { type: 'COPY_FEEDBACK'; feedback: string }
  | { type: 'CONNECTION_STATUS'; status: ConnectionStatus }
  | { type: 'THEME_CHANGED'; theme: Theme }
  | { type: 'WEBVIEW_READY' };
