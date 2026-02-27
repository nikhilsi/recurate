import { connectionStatus } from '../state/annotations';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  disconnected: { label: 'Not connected', color: '#9ca3af' },
  connected: { label: 'Connected', color: '#22c55e' },
  streaming: { label: 'AI is responding...', color: '#3b82f6' },
  ready: { label: 'Response ready', color: '#22c55e' },
};

export function StatusBar() {
  const status = STATUS_LABELS[connectionStatus.value] || STATUS_LABELS.disconnected;

  return (
    <div class="status-bar">
      <span class="status-dot" style={{ backgroundColor: status.color }} />
      <span class="status-label">{status.label}</span>
    </div>
  );
}
