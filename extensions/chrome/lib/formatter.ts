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
  const deeper = annotations.filter(a => a.type === 'deeper');
  const verify = annotations.filter(a => a.type === 'verify');

  if (annotations.length === 0) {
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

  if (deeper.length > 0) {
    parts.push('EXPLORE DEEPER — Need more detail on:');
    for (const d of deeper) {
      parts.push(`- "${truncate(d.text, 200)}"`);
    }
    parts.push('');
  }

  if (verify.length > 0) {
    parts.push('VERIFY — Please double-check:');
    for (const v of verify) {
      parts.push(`- "${truncate(v.text, 200)}"`);
    }
    parts.push('');
  }

  parts.push('[Your message below]');
  return parts.join('\n');
}
