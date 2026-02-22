import { signal, computed, batch } from '@preact/signals';
import type { Annotation, AnnotationType, ResponseData, ConnectionStatus } from '../../shared/types';

// --- Core state ---

export const annotations = signal<Annotation[]>([]);
export const currentResponse = signal<ResponseData | null>(null);
export const connectionStatus = signal<ConnectionStatus>('disconnected');

// --- Derived state ---

export const highlights = computed(() =>
  annotations.value.filter(a => a.type === 'highlight')
);

export const strikethroughs = computed(() =>
  annotations.value.filter(a => a.type === 'strikethrough')
);

export const hasAnnotations = computed(() =>
  annotations.value.length > 0
);

// --- Actions ---

/**
 * Add an annotation, removing any overlapping annotations first.
 * New annotation replaces old on overlap.
 */
export function addAnnotation(
  type: AnnotationType,
  text: string,
  startOffset: number,
  endOffset: number,
) {
  // Remove any annotations that overlap with the new one
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

/**
 * Remove a single annotation by ID.
 */
export function removeAnnotation(id: string) {
  annotations.value = annotations.value.filter(a => a.id !== id);
}

/**
 * Clear all annotations.
 */
export function clearAnnotations() {
  annotations.value = [];
}

/**
 * Set a new response, clearing all annotations.
 */
export function setResponse(data: ResponseData) {
  batch(() => {
    currentResponse.value = data;
    annotations.value = [];
  });
}
