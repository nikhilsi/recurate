import { signal } from '@preact/signals';
import type { SharedEntry, TabInfo, BgMessage } from '../lib/types';
import { formatForInjection, appendToEditor } from '../lib/inject';

const isExpanded = signal(false);
const editingId = signal<string | null>(null);
const editText = signal('');
const searchQuery = signal('');

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

  // Filter + sort
  const query = searchQuery.value.toLowerCase();
  const filtered = query
    ? entries.filter(e =>
        e.from.toLowerCase().includes(query) ||
        e.prompt.toLowerCase().includes(query) ||
        e.response.toLowerCase().includes(query)
      )
    : entries;
  const sorted = filtered.slice().sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.timestamp - a.timestamp;
  });

  // Position in the right margin gutter, outside Claude's chat content
  // Toggle: vertically centered with input box, just to its right
  const gutterLeft = inputRect
    ? `${inputRect.right + 12}px`  // 12px gap after input container
    : 'auto';
  const toggleBottom = inputRect
    ? `${window.innerHeight - inputRect.bottom + Math.floor((inputRect.height - 32) / 2)}px`
    : '80px';
  const fallbackRight = inputRect ? 'auto' : '20px';

  const togglePos = { bottom: toggleBottom, left: gutterLeft, right: fallbackRight };

  // Panel: anchored at same left position, bottom just above the input, expands upward
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
              <button style={clearBtnStyle} onClick={onClear} title="Clear all">
                Clear
              </button>
            )}
          </div>

          {/* Search */}
          {entries.length > 3 && (
            <div style={searchBarStyle}>
              <input
                type="text"
                placeholder="Search shared messages..."
                value={searchQuery.value}
                onInput={(e) => { searchQuery.value = (e.target as HTMLInputElement).value; }}
                style={searchInputStyle}
              />
              {searchQuery.value && (
                <button style={searchClearStyle} onClick={() => { searchQuery.value = ''; }}>
                  &#x00d7;
                </button>
              )}
            </div>
          )}

          {/* Entry list */}
          {sorted.length === 0 ? (
            <div style={emptyStyle}>
              {entries.length === 0
                ? 'No shared messages yet. Click the share button on any message to add it here.'
                : 'No matches found.'}
            </div>
          ) : (
            <div style={listStyle}>
              {sorted.map(entry => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  otherTabs={otherTabs}
                  onSendEntry={onSendEntry}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Entry Card ---

interface EntryCardProps {
  entry: SharedEntry;
  otherTabs: TabInfo[];
  onSendEntry: (entryId: string, targetTabIds: number[] | 'all') => void;
}

function EntryCard({ entry, otherTabs, onSendEntry }: EntryCardProps) {
  const isEditing = editingId.value === entry.id;

  function startEdit() {
    editingId.value = entry.id;
    editText.value = entry.response;
  }

  function saveEdit() {
    const msg: BgMessage = { type: 'EDIT_ENTRY', entryId: entry.id, response: editText.value };
    chrome.runtime.sendMessage(msg);
    editingId.value = null;
  }

  function cancelEdit() {
    editingId.value = null;
  }

  function togglePin() {
    const msg: BgMessage = { type: 'PIN_ENTRY', entryId: entry.id, pinned: !entry.pinned };
    chrome.runtime.sendMessage(msg);
  }

  function deleteEntry() {
    const msg: BgMessage = { type: 'DELETE_ENTRY', entryId: entry.id };
    chrome.runtime.sendMessage(msg);
  }

  function handleDragStart(e: DragEvent) {
    const text = formatForInjection(entry);
    e.dataTransfer?.setData('text/plain', text);
    e.dataTransfer?.setData('application/rc-connect-entry', entry.id);
  }

  return (
    <div
      style={{ ...entryStyle, ...(entry.pinned ? pinnedEntryStyle : {}) }}
      draggable
      onDragStart={handleDragStart}
    >
      <div style={entryHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {entry.pinned && <span style={{ fontSize: '10px' }} title="Pinned">&#x1f4cc;</span>}
          <span style={fromStyle}>{entry.from}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <span style={timeStyle}>{formatTime(entry.timestamp)}</span>
          <button style={iconBtnStyle} onClick={togglePin} title={entry.pinned ? 'Unpin' : 'Pin'}>
            {entry.pinned ? '&#x25CF;' : '&#x25CB;'}
          </button>
          <button style={iconBtnStyle} onClick={startEdit} title="Edit before sending">
            &#x270E;
          </button>
          <button style={iconBtnStyle} onClick={deleteEntry} title="Delete">
            &#x00d7;
          </button>
        </div>
      </div>

      {entry.prompt && entry.prompt !== '[Multi-message exchange]' && (
        <div style={promptStyle}>You: {truncate(entry.prompt, 80)}</div>
      )}

      {isEditing ? (
        <div style={{ marginBottom: '6px' }}>
          <textarea
            style={editTextareaStyle}
            value={editText.value}
            onInput={(e) => { editText.value = (e.target as HTMLTextAreaElement).value; }}
            rows={4}
          />
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
            <button style={{ ...sendBtnStyle, background: '#4338CA', color: '#fff', borderColor: '#4338CA' }} onClick={saveEdit}>
              Save
            </button>
            <button style={sendBtnStyle} onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={responseStyle}>{truncate(entry.response, 120)}</div>
      )}

      {!isEditing && (
        <div style={actionsStyle}>
          {otherTabs.length > 1 && (
            <button style={sendBtnStyle} onClick={() => onSendEntry(entry.id, 'all')}>
              Send to all
            </button>
          )}
          {otherTabs.map(tab => (
            <button
              key={tab.tabId}
              style={sendBtnStyle}
              onClick={() => onSendEntry(entry.id, [tab.tabId])}
            >
              Send to {truncate(tab.chatName || 'Untitled', 20)}
            </button>
          ))}
        </div>
      )}

      <div style={dragHintStyle}>Drag to input</div>
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
  alignItems: 'center',
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

const searchBarStyle: Record<string, string> = {
  position: 'relative',
  padding: '6px 12px',
  borderBottom: '1px solid rgba(0,0,0,0.04)',
};

const searchInputStyle: Record<string, string> = {
  width: '100%',
  padding: '5px 24px 5px 8px',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: '6px',
  fontSize: '11px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const searchClearStyle: Record<string, string> = {
  position: 'absolute',
  right: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
  border: 'none',
  background: 'transparent',
  color: '#999',
  fontSize: '14px',
  cursor: 'pointer',
  padding: '0 4px',
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
  cursor: 'grab',
  position: 'relative',
};

const pinnedEntryStyle: Record<string, string> = {
  background: 'rgba(67,56,202,0.03)',
  borderLeft: '3px solid #4338CA',
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

const iconBtnStyle: Record<string, string> = {
  border: 'none',
  background: 'transparent',
  color: '#bbb',
  fontSize: '12px',
  cursor: 'pointer',
  padding: '1px 3px',
  borderRadius: '3px',
  lineHeight: '1',
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
  marginBottom: '6px',
};

const editTextareaStyle: Record<string, string> = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid rgba(67,56,202,0.3)',
  borderRadius: '6px',
  fontSize: '12px',
  fontFamily: 'inherit',
  lineHeight: '1.4',
  resize: 'vertical',
  outline: 'none',
  boxSizing: 'border-box',
};

const actionsStyle: Record<string, string> = {
  display: 'flex',
  gap: '4px',
  flexWrap: 'wrap',
};

const sendBtnStyle: Record<string, string> = {
  border: '1px solid rgba(67,56,202,0.2)',
  background: 'rgba(67,56,202,0.04)',
  color: '#4338CA',
  fontSize: '10px',
  fontWeight: '500',
  padding: '3px 8px',
  borderRadius: '4px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const dragHintStyle: Record<string, string> = {
  fontSize: '9px',
  color: '#ccc',
  textAlign: 'right',
  marginTop: '4px',
};
