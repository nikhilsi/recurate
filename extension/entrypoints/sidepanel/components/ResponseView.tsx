import { useRef, useEffect, useCallback } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { currentResponse, annotations, addAnnotation, removeAnnotation } from '../state/annotations';
import { AnnotationToolbar } from './AnnotationToolbar';
import type { AnnotationType } from '../../../lib/types';

interface SelectionInfo {
  text: string;
  startOffset: number;
  endOffset: number;
  rect: DOMRect;
  overlapsAnnotationId: string | null;
}

/**
 * Compute character offset of a range endpoint relative to a container element.
 */
function getTextOffset(container: Node, targetNode: Node, targetOffset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (node === targetNode) {
      return offset + targetOffset;
    }
    offset += node.length;
  }
  return offset;
}

export function ResponseView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionInfo = useSignal<SelectionInfo | null>(null);

  const handlePointerUp = useCallback(() => {
    // Delay slightly to let the browser finalize the selection
    setTimeout(() => {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim() || !containerRef.current) {
        selectionInfo.value = null;
        return;
      }

      const range = sel.getRangeAt(0);

      // Ensure selection is within our container
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        selectionInfo.value = null;
        return;
      }

      const startOffset = getTextOffset(containerRef.current, range.startContainer, range.startOffset);
      const endOffset = getTextOffset(containerRef.current, range.endContainer, range.endOffset);
      const rect = range.getBoundingClientRect();

      // Check if the selection overlaps an existing annotation
      const overlapping = annotations.value.find(
        a => a.startOffset < endOffset && a.endOffset > startOffset
      );

      selectionInfo.value = {
        text: sel.toString(),
        startOffset,
        endOffset,
        rect,
        overlapsAnnotationId: overlapping?.id ?? null,
      };
    }, 10);
  }, []);

  const handleAnnotate = useCallback((type: AnnotationType) => {
    const info = selectionInfo.value;
    if (!info) return;
    addAnnotation(type, info.text, info.startOffset, info.endOffset);
    document.getSelection()?.removeAllRanges();
    selectionInfo.value = null;
  }, []);

  const handleClear = useCallback(() => {
    const info = selectionInfo.value;
    if (!info?.overlapsAnnotationId) return;
    removeAnnotation(info.overlapsAnnotationId);
    document.getSelection()?.removeAllRanges();
    selectionInfo.value = null;
  }, []);

  const handleDismiss = useCallback(() => {
    selectionInfo.value = null;
  }, []);

  // Build annotated HTML by wrapping annotation ranges
  const getAnnotatedHtml = useCallback((): string => {
    const response = currentResponse.value;
    if (!response) return '';

    const text = response.text;
    const sorted = [...annotations.value].sort((a, b) => a.startOffset - b.startOffset);

    if (sorted.length === 0) return response.html;

    // Build annotated version from plain text with HTML wrappers
    const parts: string[] = [];
    let cursor = 0;

    for (const ann of sorted) {
      // Text before this annotation
      if (ann.startOffset > cursor) {
        parts.push(escapeHtml(text.slice(cursor, ann.startOffset)));
      }
      // The annotated text
      const cls = ann.type === 'highlight' ? 'annotation-highlight' : 'annotation-strikethrough';
      const tag = ann.type === 'highlight' ? 'mark' : 'del';
      parts.push(`<${tag} class="${cls}" data-annotation-id="${ann.id}">${escapeHtml(ann.text)}</${tag}>`);
      cursor = ann.endOffset;
    }
    // Remaining text
    if (cursor < text.length) {
      parts.push(escapeHtml(text.slice(cursor)));
    }

    return parts.join('');
  }, []);

  // Decide whether to show raw HTML (no annotations) or annotated plain text
  const hasAnnotationsOnResponse = annotations.value.length > 0;

  return (
    <div class="response-view">
      <div
        ref={containerRef}
        class="response-content"
        onPointerUp={handlePointerUp}
        dangerouslySetInnerHTML={{
          __html: hasAnnotationsOnResponse
            ? getAnnotatedHtml()
            : (currentResponse.value?.html || ''),
        }}
      />

      {selectionInfo.value && (
        <AnnotationToolbar
          rect={selectionInfo.value.rect}
          hasOverlap={!!selectionInfo.value.overlapsAnnotationId}
          onHighlight={() => handleAnnotate('highlight')}
          onStrikethrough={() => handleAnnotate('strikethrough')}
          onClear={handleClear}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
