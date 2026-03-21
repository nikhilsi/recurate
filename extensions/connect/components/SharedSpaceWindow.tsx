import type { SharedEntry, TabInfo } from '../lib/types';

interface SharedSpaceWindowProps {
  entries: SharedEntry[];
  tabs: TabInfo[];
  onSendEntry: (entryId: string, targetTabIds: number[] | 'all') => void;
  onClear: () => void;
}

export function SharedSpaceWindow({ entries, tabs, onSendEntry, onClear }: SharedSpaceWindowProps) {
  const sorted = entries.slice().sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Recurate Connect</h1>
          <p style={subtitleStyle}>
            {tabs.length} tab{tabs.length !== 1 ? 's' : ''} connected
            {tabs.length > 0 && ` — ${tabs.map(t => t.chatName).join(', ')}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={countStyle}>{entries.length} message{entries.length !== 1 ? 's' : ''}</span>
          {entries.length > 0 && (
            <button type="button" style={clearBtnStyle} onClick={onClear}>Clear all</button>
          )}
        </div>
      </div>

      {/* Entry list — read-only */}
      <div style={listStyle}>
        {sorted.length === 0 ? (
          <div style={emptyStyle}>
            No shared messages yet. Use the share button or type \rc in any Claude.ai chat to share context here.
          </div>
        ) : (
          sorted.map(entry => (
            <div key={entry.id} style={entryStyle}>
              <div style={entryHeaderStyle}>
                <span style={fromStyle}>{entry.from}</span>
                <span style={timeStyle}>{formatTime(entry.timestamp)}</span>
              </div>
              {entry.prompt && (
                <div style={promptStyle}>
                  <strong>You asked:</strong> {entry.prompt}
                </div>
              )}
              <div style={responseStyle}>{entry.response}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// --- Styles ---

const containerStyle: Record<string, string> = {
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: '#fafafa',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const headerStyle: Record<string, string> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '16px 20px',
  borderBottom: '2px solid #4338CA',
  background: '#fff',
};

const titleStyle: Record<string, string> = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#4338CA',
  margin: '0',
};

const subtitleStyle: Record<string, string> = {
  fontSize: '12px',
  color: '#888',
  marginTop: '2px',
};

const countStyle: Record<string, string> = {
  fontSize: '12px',
  color: '#666',
};

const clearBtnStyle: Record<string, string> = {
  border: '1px solid rgba(239,68,68,0.3)',
  background: 'rgba(239,68,68,0.05)',
  color: '#ef4444',
  fontSize: '12px',
  padding: '4px 12px',
  borderRadius: '6px',
  cursor: 'pointer',
};

const listStyle: Record<string, string> = {
  flex: '1',
  overflowY: 'auto',
  padding: '8px 0',
};

const emptyStyle: Record<string, string> = {
  padding: '40px 20px',
  color: '#999',
  fontSize: '14px',
  textAlign: 'center',
  lineHeight: '1.6',
};

const entryStyle: Record<string, string> = {
  margin: '8px 16px',
  padding: '14px 16px',
  background: '#fff',
  borderRadius: '10px',
  border: '1px solid rgba(0,0,0,0.06)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const entryHeaderStyle: Record<string, string> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
};

const fromStyle: Record<string, string> = {
  fontSize: '12px',
  fontWeight: '700',
  color: '#4338CA',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const timeStyle: Record<string, string> = {
  fontSize: '11px',
  color: '#aaa',
};

const promptStyle: Record<string, string> = {
  fontSize: '13px',
  color: '#555',
  marginBottom: '6px',
  fontStyle: 'italic',
  lineHeight: '1.5',
};

const responseStyle: Record<string, string> = {
  fontSize: '14px',
  color: '#1a1a2e',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap',
};
