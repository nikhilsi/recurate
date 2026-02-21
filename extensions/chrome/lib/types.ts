// Annotation types — V1: highlight, strikethrough
// V1.1 will add: 'deeper' | 'question'
export type AnnotationType = 'highlight' | 'strikethrough';

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

export type ConnectionStatus = 'disconnected' | 'connected' | 'streaming' | 'ready';

export type Theme = 'light' | 'dark';

// Chrome runtime message types
export type ExtensionMessage =
  | { type: 'RESPONSE_STREAMING'; html: string; messageId: string }
  | { type: 'RESPONSE_READY'; html: string; text: string; messageId: string }
  | { type: 'INJECT_FEEDBACK'; feedback: string }
  | { type: 'PENDING_FEEDBACK'; feedback: string | null }
  | { type: 'CONNECTION_STATUS'; status: ConnectionStatus }
  | { type: 'THEME_CHANGED'; theme: Theme };
