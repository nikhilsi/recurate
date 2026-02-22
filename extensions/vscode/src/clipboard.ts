import * as vscode from 'vscode';

/**
 * Copy formatted feedback text to the clipboard.
 * Shows a notification so the user knows it's ready to paste.
 */
export async function copyFeedbackToClipboard(feedback: string): Promise<void> {
  await vscode.env.clipboard.writeText(feedback);
  vscode.window.showInformationMessage('Feedback copied — paste into Claude Code');
}
