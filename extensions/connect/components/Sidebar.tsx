import { signal } from '@preact/signals';
import type { SharedEntry, TabInfo, BgMessage } from '../lib/types';

const isExpanded = signal(false);

interface SidebarProps {
  entries: SharedEntry[];
  tabs: TabInfo[];
  currentTabId: number;
  connectedCount: number;
  popoutIsOpen: boolean;
  inputRect: DOMRect | null;
  onSendEntry: (entryId: string, targetTabIds: number[] | 'all') => void;
  onClear: () => void;
}

export function Sidebar({ entries, tabs, currentTabId, connectedCount, popoutIsOpen, inputRect, onSendEntry, onClear }: SidebarProps) {
  const otherTabs = tabs.filter(t => t.tabId !== currentTabId);

  // Position in the right margin gutter, outside Claude's chat content
  const gutterLeft = inputRect
    ? `${inputRect.right + 12}px`
    : 'auto';
  const toggleBottom = inputRect
    ? `${window.innerHeight - inputRect.bottom + Math.floor((inputRect.height - 32) / 2)}px`
    : '80px';
  const fallbackRight = inputRect ? 'auto' : '20px';

  const togglePos = { bottom: toggleBottom, left: gutterLeft, right: fallbackRight };

  const panelPos = {
    bottom: inputRect
      ? `${window.innerHeight - inputRect.top + 8}px`
      : '120px',
    left: gutterLeft,
    right: fallbackRight,
  };

  if (connectedCount === 0) return null;

  // Hide inline sidebar when pop-out window is open
  if (popoutIsOpen) {
    isExpanded.value = false;
    return null;
  }

  return (
    <div>
      {/* Toggle button — anchored next to input box */}
      <button
        type="button"
        style={{ ...toggleStyle, ...togglePos }}
        onClick={() => { isExpanded.value = !isExpanded.value; }}
        title={isExpanded.value ? 'Collapse shared space' : 'Expand shared space'}
      >
        <span style={{ fontSize: '13px' }}>&#x27F7;</span>
        <span style={{ fontSize: '11px' }}>{connectedCount} connected</span>
        {!isExpanded.value && entries.length > 0 && (
          <span style={countBadgeStyle}>{entries.length}</span>
        )}
      </button>

      {/* Panel — expands upward from toggle into right margin */}
      {isExpanded.value && (
        <div style={{ ...panelStyle, ...panelPos }}>
          {/* Header */}
          <div style={headerStyle}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: '700', fontSize: '13px', color: '#4338CA' }}>Recurate Connect</span>
                <button
                  type="button"
                  style={popOutBtnStyle}
                  onClick={() => {
                    chrome.runtime.sendMessage({ type: 'POP_OUT_SHARED_SPACE' });
                    isExpanded.value = false;
                  }}
                  title="Open in separate window"
                >
                  &#x2197;
                </button>
              </div>
              <div style={connectedToStyle}>
                {formatConnectedTo(otherTabs)}
              </div>
            </div>
            {entries.length > 0 && (
              <button type="button" style={clearBtnStyle} onClick={onClear} title="Clear all">
                Clear
              </button>
            )}
          </div>

          {/* Entry list — read-only */}
          {entries.length === 0 ? (
            <div style={emptyStyle}>
              No shared messages yet. Click the share button on any message or type \rc to share.
            </div>
          ) : (
            <div style={listStyle}>
              {entries.slice().reverse().map(entry => (
                <div key={entry.id} style={entryStyle}>
                  <div style={entryHeaderStyle}>
                    <span style={fromStyle}>{entry.from}</span>
                    <span style={timeStyle}>{formatTime(entry.timestamp)}</span>
                  </div>
                  {entry.prompt && (
                    <div style={promptStyle}>You: {truncate(entry.prompt, 80)}</div>
                  )}
                  <div style={responseStyle}>{truncate(entry.response, 150)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Helpers ---

function formatConnectedTo(tabs: TabInfo[]): string {
  if (tabs.length === 0) return 'No connections';
  const names = tabs.map(t => `"${truncate(t.chatName || 'Untitled', 10)}"`);
  if (names.length === 1) return `Connected to ${names[0]}`;
  if (names.length === 2) return `Connected to ${names[0]} and ${names[1]}`;
  return `Connected to ${names[0]}, ${names[1]}, and ${names.length - 2} more`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

// --- Styles ---

const toggleStyle: Record<string, string> = {
  position: 'fixed',
  zIndex: '2147483646',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  border: '1px solid rgba(67,56,202,0.2)',
  borderRadius: '10px',
  background: 'rgba(67,56,202,0.06)',
  cursor: 'pointer',
  color: '#4338CA',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontWeight: '500',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  whiteSpace: 'nowrap',
};

const countBadgeStyle: Record<string, string> = {
  marginLeft: '2px',
  padding: '1px 6px',
  borderRadius: '10px',
  background: '#4338CA',
  color: '#fff',
  fontSize: '10px',
  fontWeight: '600',
};

const panelStyle: Record<string, string> = {
  position: 'fixed',
  zIndex: '2147483646',
  width: '320px',
  maxHeight: '60vh',
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const headerStyle: Record<string, string> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '10px 12px',
  borderBottom: '1px solid rgba(0,0,0,0.06)',
  color: '#1a1a2e',
};

const connectedToStyle: Record<string, string> = {
  fontSize: '10px',
  color: '#888',
  marginTop: '2px',
};

const popOutBtnStyle: Record<string, string> = {
  border: 'none',
  background: 'transparent',
  color: '#4338CA',
  fontSize: '14px',
  cursor: 'pointer',
  padding: '2px 4px',
  borderRadius: '4px',
  lineHeight: '1',
};

const clearBtnStyle: Record<string, string> = {
  border: 'none',
  background: 'transparent',
  color: '#999',
  fontSize: '11px',
  cursor: 'pointer',
  padding: '2px 6px',
  borderRadius: '4px',
};

const emptyStyle: Record<string, string> = {
  padding: '20px 12px',
  color: '#999',
  fontSize: '12px',
  textAlign: 'center',
  lineHeight: '1.5',
};

const listStyle: Record<string, string> = {
  overflowY: 'auto',
  flex: '1',
};

const entryStyle: Record<string, string> = {
  padding: '10px 12px',
  borderBottom: '1px solid rgba(0,0,0,0.04)',
};

const entryHeaderStyle: Record<string, string> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '4px',
};

const fromStyle: Record<string, string> = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#4338CA',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
};

const timeStyle: Record<string, string> = {
  fontSize: '10px',
  color: '#aaa',
};

const promptStyle: Record<string, string> = {
  fontSize: '11px',
  color: '#666',
  marginBottom: '2px',
  fontStyle: 'italic',
};

const responseStyle: Record<string, string> = {
  fontSize: '12px',
  color: '#333',
  lineHeight: '1.4',
};
