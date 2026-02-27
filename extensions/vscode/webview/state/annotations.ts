import { signal, computed, batch } from '@preact/signals';
import type { Annotation, AnnotationType, ResponseData, ConnectionStatus } from '../../shared/types';

// --- Core state ---

export const annotations = signal<Annotation[]>([]);
export const responseHistory = signal<ResponseData[]>([]);
export const currentIndex = signal(0);
export const connectionStatus = signal<ConnectionStatus>('disconnected');

// --- Derived state ---

export const currentResponse = computed(() =>
  responseHistory.value.length > 0 ? responseHistory.value[currentIndex.value] : null
);

export const highlights = computed(() =>
  annotations.value.filter(a => a.type === 'highlight')
);

export const strikethroughs = computed(() =>
  annotations.value.filter(a => a.type === 'strikethrough')
);

export const deeperAnnotations = computed(() =>
  annotations.value.filter(a => a.type === 'deeper')
);

export const verifyAnnotations = computed(() =>
  annotations.value.filter(a => a.type === 'verify')
);

export const hasAnnotations = computed(() =>
  annotations.value.length > 0
);

export const canGoNewer = computed(() => currentIndex.value > 0);
export const canGoOlder = computed(() => currentIndex.value < responseHistory.value.length - 1);

// --- Actions ---

/**
 * Add a new response to the front of history (newest first).
 * Switches to it and clears annotations.
 */
export function addResponse(data: ResponseData) {
  batch(() => {
    // Avoid duplicates
    const existing = responseHistory.value.findIndex(r => r.messageId === data.messageId);
    if (existing >= 0) {
      currentIndex.value = existing;
    } else {
      responseHistory.value = [data, ...responseHistory.value].slice(0, 5);
      currentIndex.value = 0;
    }
    annotations.value = [];
  });
}

/**
 * Replace entire history (used on resend/reconnect).
 */
export function setHistory(items: ResponseData[]) {
  batch(() => {
    responseHistory.value = items.slice(0, 5);
    currentIndex.value = 0;
    annotations.value = [];
  });
}

export function goNewer() {
  if (canGoNewer.value) {
    batch(() => {
      currentIndex.value = currentIndex.value - 1;
      annotations.value = [];
    });
  }
}

export function goOlder() {
  if (canGoOlder.value) {
    batch(() => {
      currentIndex.value = currentIndex.value + 1;
      annotations.value = [];
    });
  }
}

/**
 * Add an annotation, removing any overlapping annotations first.
 */
export function addAnnotation(
  type: AnnotationType,
  text: string,
  startOffset: number,
  endOffset: number,
) {
  const nonOverlapping = annotations.value.filter(
    a => a.endOffset <= startOffset || a.startOffset >= endOffset
  );

  annotations.value = [...nonOverlapping, {
    id: crypto.randomUUID(),
    type,
    text,
    startOffset,
    endOffset,
    createdAt: Date.now(),
  }].sort((a, b) => a.startOffset - b.startOffset);
}

export function removeAnnotation(id: string) {
  annotations.value = annotations.value.filter(a => a.id !== id);
}

export function clearAnnotations() {
  annotations.value = [];
}
