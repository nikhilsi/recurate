import { useRef, useEffect, useCallback } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { currentResponse, annotations, addAnnotation, removeAnnotation } from '../state/annotations';
import { AnnotationToolbar } from './AnnotationToolbar';
import type { Annotation, AnnotationType } from '../../../lib/types';

interface SelectionInfo {
  text: string;
  startOffset: number;
  endOffset: number;
  rect: DOMRect;
  overlapsAnnotationId: string | null;
}

/**
 * Compute character offset of a range endpoint relative to a container element.
 * Walks text nodes in document order, counting characters.
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

/**
 * Apply annotation overlays directly to the DOM.
 * Walks text nodes and wraps annotated ranges with <mark>/<del> elements,
 * preserving the original HTML structure (headings, lists, code blocks, etc.).
 *
 * Processes annotations from highest to lowest offset so that wrapping
 * (which splits text nodes) doesn't invalidate earlier offsets.
 */
function applyAnnotationsToDOM(container: HTMLElement, annotationList: Annotation[]) {
  if (annotationList.length === 0) return;

  // Build a flat list of text nodes with their global character offsets
  const textNodes: { node: Text; start: number; end: number }[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let textNode: Text | null;
  while ((textNode = walker.nextNode() as Text | null)) {
    textNodes.push({ node: textNode, start: offset, end: offset + textNode.length });
    offset += textNode.length;
  }

  // Process annotations from highest offset to lowest to preserve earlier text node positions
  const sorted = [...annotationList].sort((a, b) => b.startOffset - a.startOffset);

  for (const ann of sorted) {
    const tagName = ann.type === 'highlight' ? 'mark' : 'del';
    const cls = ann.type === 'highlight' ? 'annotation-highlight' : 'annotation-strikethrough';

    // Find and wrap overlapping text nodes (reverse order for safe DOM modification)
    for (let i = textNodes.length - 1; i >= 0; i--) {
      const tn = textNodes[i];
      const overlapStart = Math.max(ann.startOffset, tn.start);
      const overlapEnd = Math.min(ann.endOffset, tn.end);

      if (overlapStart >= overlapEnd) continue;

      const localStart = overlapStart - tn.start;
      const localEnd = overlapEnd - tn.start;

      try {
        const range = document.createRange();
        range.setStart(tn.node, localStart);
        range.setEnd(tn.node, localEnd);

        const wrapper = document.createElement(tagName);
        wrapper.className = cls;
        wrapper.dataset.annotationId = ann.id;
        range.surroundContents(wrapper);
      } catch {
        // surroundContents can fail if range crosses element boundaries — skip gracefully
      }
    }
  }
}

export function ResponseView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionInfo = useSignal<SelectionInfo | null>(null);

  // Read signal values so component re-renders when they change
  const response = currentResponse.value;
  const annotationList = annotations.value;

  // Render original HTML then apply annotation overlays via DOM manipulation.
  // This preserves all formatting (headings, lists, code, bold, etc.).
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !response) return;

    // Always start from the original HTML
    container.innerHTML = response.html;

    // Apply annotation wrappers to the DOM
    applyAnnotationsToDOM(container, annotationList);
  }, [response, annotationList]);

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

      let startOffset = getTextOffset(containerRef.current, range.startContainer, range.startOffset);
      let endOffset = getTextOffset(containerRef.current, range.endContainer, range.endOffset);

      // Snap selection to word boundaries so partial words aren't captured
      const fullText = containerRef.current.textContent || '';
      while (startOffset > 0 && !/\s/.test(fullText[startOffset - 1])) {
        startOffset--;
      }
      while (endOffset < fullText.length && !/\s/.test(fullText[endOffset])) {
        endOffset++;
      }

      const rect = range.getBoundingClientRect();

      // Check if the selection overlaps an existing annotation
      const overlapping = annotations.value.find(
        a => a.startOffset < endOffset && a.endOffset > startOffset
      );

      selectionInfo.value = {
        text: fullText.slice(startOffset, endOffset),
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

  return (
    <div class="response-view">
      <div
        ref={containerRef}
        class="response-content"
        onPointerUp={handlePointerUp}
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
