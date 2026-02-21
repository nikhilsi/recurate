import type { Annotation } from './types';

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

/**
 * Convert annotations into structured feedback text for injection
 * into the AI platform's text box.
 */
export function formatFeedback(annotations: Annotation[]): string {
  const highlights = annotations.filter(a => a.type === 'highlight');
  const strikethroughs = annotations.filter(a => a.type === 'strikethrough');

  if (highlights.length === 0 && strikethroughs.length === 0) {
    return '';
  }

  const parts: string[] = ['[Feedback on your previous response]', ''];

  if (highlights.length > 0) {
    parts.push('KEEP — I found these points valuable:');
    for (const h of highlights) {
      parts.push(`- "${truncate(h.text, 200)}"`);
    }
    parts.push('');
  }

  if (strikethroughs.length > 0) {
    parts.push('DROP — Please disregard or reconsider:');
    for (const s of strikethroughs) {
      parts.push(`- "${truncate(s.text, 200)}"`);
    }
    parts.push('');
  }

  parts.push('[Your message below]');
  return parts.join('\n');
}
