import { useSignal } from '@preact/signals';
import { annotations, highlights, strikethroughs, deeperAnnotations, verifyAnnotations, removeAnnotation, clearAnnotations } from '../state/annotations';
import type { AnnotationType } from '../../../lib/types';

function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + '...';
}

const TYPE_ICON: Record<AnnotationType, string> = {
  highlight: '✓', strikethrough: '✗', deeper: '⤵', verify: '?',
};

function scrollToAnnotation(id: string) {
  const el = document.querySelector(`[data-annotation-id="${id}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function AnnotationList() {
  const items = annotations.value;
  const expanded = useSignal(true);
  if (items.length === 0) return null;

  const hCount = highlights.value.length;
  const sCount = strikethroughs.value.length;
  const dCount = deeperAnnotations.value.length;
  const vCount = verifyAnnotations.value.length;

  const summaryParts: string[] = [];
  if (hCount > 0) summaryParts.push(`${hCount} highlight${hCount !== 1 ? 's' : ''}`);
  if (sCount > 0) summaryParts.push(`${sCount} strikethrough${sCount !== 1 ? 's' : ''}`);
  if (dCount > 0) summaryParts.push(`${dCount} explore${dCount !== 1 ? 's' : ''}`);
  if (vCount > 0) summaryParts.push(`${vCount} verif${vCount !== 1 ? 'ies' : 'y'}`);

  return (
    <div class="annotation-list">
      <div class="annotation-list-header">
        <button
          class="annotation-list-toggle"
          onClick={() => { expanded.value = !expanded.value; }}
          title={expanded.value ? 'Collapse' : 'Expand'}
        >
          <span class={`toggle-chevron ${expanded.value ? '' : 'collapsed'}`}>&#x25BE;</span>
          <span class="annotation-list-summary">
            Annotations ({summaryParts.join(', ')})
          </span>
        </button>
        <button
          class="clear-all-btn"
          onClick={clearAnnotations}
          title="Clear all annotations"
        >
          Clear all
        </button>
      </div>

      {expanded.value && (
        <div class="annotation-list-items">
          {items.map((ann) => (
            <div
              key={ann.id}
              class={`annotation-item annotation-item-${ann.type}`}
              onClick={() => scrollToAnnotation(ann.id)}
            >
              <span class="annotation-item-icon">
                {TYPE_ICON[ann.type]}
              </span>
              <span class="annotation-item-text">
                {truncate(ann.text, 80)}
              </span>
              <button
                class="annotation-item-delete"
                onClick={(e: MouseEvent) => { e.stopPropagation(); removeAnnotation(ann.id); }}
                title="Remove annotation"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
