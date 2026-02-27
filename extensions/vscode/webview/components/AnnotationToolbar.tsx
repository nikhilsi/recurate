import { useRef, useEffect } from 'preact/hooks';

interface Props {
  rect: DOMRect;
  hasOverlap: boolean;
  onHighlight: () => void;
  onStrikethrough: () => void;
  onDeeper: () => void;
  onVerify: () => void;
  onClear: () => void;
  onDismiss: () => void;
}

export function AnnotationToolbar({ rect, hasOverlap, onHighlight, onStrikethrough, onDeeper, onVerify, onClear, onDismiss }: Props) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Position: above the selection, centered horizontally
  const toolbarHeight = 40;
  const toolbarWidth = hasOverlap ? 210 : 170;
  let top = rect.top - toolbarHeight - 8;
  let left = rect.left + rect.width / 2 - toolbarWidth / 2;

  // If too close to the top, show below
  if (top < 8) {
    top = rect.bottom + 8;
  }

  // Keep within viewport
  left = Math.max(8, Math.min(left, window.innerWidth - toolbarWidth - 8));

  // Dismiss on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    // Delay to avoid dismissing immediately from the pointerup that created the selection
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onDismiss]);

  return (
    <div
      ref={toolbarRef}
      class="annotation-toolbar"
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
      }}
    >
      <button
        class="toolbar-btn toolbar-btn-highlight"
        onClick={onHighlight}
        title="Highlight — keep this"
      >
        ✓
      </button>
      <button
        class="toolbar-btn toolbar-btn-strikethrough"
        onClick={onStrikethrough}
        title="Strikethrough — drop this"
      >
        ✗
      </button>
      <button
        class="toolbar-btn toolbar-btn-deeper"
        onClick={onDeeper}
        title="Dig deeper — need more detail"
      >
        ⤵
      </button>
      <button
        class="toolbar-btn toolbar-btn-verify"
        onClick={onVerify}
        title="Verify — double-check this"
      >
        ?
      </button>
      {hasOverlap && (
        <button
          class="toolbar-btn toolbar-btn-clear"
          onClick={onClear}
          title="Clear annotation"
        >
          ↺
        </button>
      )}
    </div>
  );
}
