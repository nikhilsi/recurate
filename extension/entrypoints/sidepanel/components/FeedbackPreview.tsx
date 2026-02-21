import { annotations, showPreview } from '../state/annotations';
import { formatFeedback } from '../../../lib/formatter';

export function FeedbackPreview() {
  const feedbackText = formatFeedback(annotations.value);

  function handleInject() {
    browser.runtime.sendMessage({
      type: 'INJECT_FEEDBACK',
      feedback: feedbackText,
    }).catch((err) => {
      console.error('[Recurate] Failed to send inject message:', err);
    });
    showPreview.value = false;
  }

  function handleCancel() {
    showPreview.value = false;
  }

  return (
    <div class="feedback-preview">
      <h3>Preview — this will be injected into the text box:</h3>
      <pre class="feedback-preview-text">{feedbackText}</pre>
      <div class="feedback-preview-actions">
        <button class="inject-button" onClick={handleInject}>
          Inject into text box
        </button>
        <button class="cancel-button" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
