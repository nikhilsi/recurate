/**
 * Get the currently selected text within a message, if any.
 */
export function getSelectedText(): string | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return null;
  const text = selection.toString().trim();
  return text.length > 0 ? text : null;
}
