import { useSignal } from '@preact/signals';
import { annotations, highlights, strikethroughs, removeAnnotation, clearAnnotations } from '../state/annotations';

function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + '...';
}

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

  const summaryParts: string[] = [];
  if (hCount > 0) summaryParts.push(`${hCount} highlight${hCount !== 1 ? 's' : ''}`);
  if (sCount > 0) summaryParts.push(`${sCount} strikethrough${sCount !== 1 ? 's' : ''}`);

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
                {ann.type === 'highlight' ? '✓' : '✗'}
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
