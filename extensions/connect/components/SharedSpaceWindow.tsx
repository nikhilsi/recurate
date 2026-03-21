import { signal } from '@preact/signals';
import type { SharedEntry, TabInfo, BgMessage } from '../lib/types';

const editingId = signal<string | null>(null);
const editText = signal('');
const searchQuery = signal('');

interface SharedSpaceWindowProps {
  entries: SharedEntry[];
  tabs: TabInfo[];
  onSendEntry: (entryId: string, targetTabIds: number[] | 'all') => void;
  onClear: () => void;
}

export function SharedSpaceWindow({ entries, tabs, onSendEntry, onClear }: SharedSpaceWindowProps) {
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

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Shared Space</h1>
          <p style={subtitleStyle}>
            {tabs.length} tab{tabs.length !== 1 ? 's' : ''} connected
            {tabs.length > 0 && ` — ${tabs.map(t => t.chatName).join(', ')}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={countStyle}>{entries.length} message{entries.length !== 1 ? 's' : ''}</span>
          {entries.length > 0 && (
            <button style={clearBtnStyle} onClick={onClear}>Clear all</button>
          )}
        </div>
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
      <div style={listStyle}>
        {sorted.length === 0 ? (
          <div style={emptyStyle}>
            {entries.length === 0
              ? 'No shared messages yet. Use the share button on any Claude.ai message to add context here.'
              : 'No matches found.'}
          </div>
        ) : (
          sorted.map(entry => (
            <WindowEntryCard
              key={entry.id}
              entry={entry}
              tabs={tabs}
              onSendEntry={onSendEntry}
            />
          ))
        )}
      </div>
    </div>
  );
}

// --- Entry Card (full-width version) ---

interface WindowEntryCardProps {
  entry: SharedEntry;
  tabs: TabInfo[];
  onSendEntry: (entryId: string, targetTabIds: number[] | 'all') => void;
}

function WindowEntryCard({ entry, tabs, onSendEntry }: WindowEntryCardProps) {
  const isEditing = editingId.value === entry.id;

  function startEdit() {
    editingId.value = entry.id;
    editText.value = entry.response;
  }

  function saveEdit() {
    chrome.runtime.sendMessage({ type: 'EDIT_ENTRY', entryId: entry.id, response: editText.value } as BgMessage);
    editingId.value = null;
  }

  function cancelEdit() {
    editingId.value = null;
  }

  function togglePin() {
    chrome.runtime.sendMessage({ type: 'PIN_ENTRY', entryId: entry.id, pinned: !entry.pinned } as BgMessage);
  }

  function deleteEntry() {
    chrome.runtime.sendMessage({ type: 'DELETE_ENTRY', entryId: entry.id } as BgMessage);
  }

  return (
    <div style={{ ...entryStyle, ...(entry.pinned ? pinnedStyle : {}) }}>
      {/* Header */}
      <div style={entryHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {entry.pinned && <span title="Pinned" style={{ fontSize: '12px' }}>&#x1f4cc;</span>}
          <span style={fromStyle}>{entry.from}</span>
          <span style={timeStyle}>{formatTime(entry.timestamp)}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button style={actionBtnStyle} onClick={togglePin} title={entry.pinned ? 'Unpin' : 'Pin'}>
            {entry.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button style={actionBtnStyle} onClick={startEdit} title="Edit before sending">
            Edit
          </button>
          <button style={{ ...actionBtnStyle, color: '#ef4444' }} onClick={deleteEntry} title="Delete">
            Delete
          </button>
        </div>
      </div>

      {/* Prompt */}
      {entry.prompt && entry.prompt !== '[Multi-message exchange]' && (
        <div style={promptStyle}>
          <strong>You asked:</strong> {entry.prompt}
        </div>
      )}

      {/* Response */}
      {isEditing ? (
        <div>
          <textarea
            style={editTextareaStyle}
            value={editText.value}
            onInput={(e) => { editText.value = (e.target as HTMLTextAreaElement).value; }}
            rows={6}
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <button style={saveBtnStyle} onClick={saveEdit}>Save</button>
            <button style={cancelBtnStyle} onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={responseStyle}>{entry.response}</div>
      )}

      {/* Send actions */}
      {!isEditing && (
        <div style={sendActionsStyle}>
          {tabs.length > 1 && (
            <button style={sendBtnStyle} onClick={() => onSendEntry(entry.id, 'all')}>
              Send to all tabs
            </button>
          )}
          {tabs.map(tab => (
            <button
              key={tab.tabId}
              style={sendBtnStyle}
              onClick={() => onSendEntry(entry.id, [tab.tabId])}
            >
              Send to {tab.chatName || 'Untitled'}
            </button>
          ))}
        </div>
      )}
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

const searchBarStyle: Record<string, string> = {
  position: 'relative',
  padding: '10px 20px',
  background: '#fff',
  borderBottom: '1px solid rgba(0,0,0,0.06)',
};

const searchInputStyle: Record<string, string> = {
  width: '100%',
  padding: '8px 32px 8px 12px',
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: '8px',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const searchClearStyle: Record<string, string> = {
  position: 'absolute',
  right: '28px',
  top: '50%',
  transform: 'translateY(-50%)',
  border: 'none',
  background: 'transparent',
  color: '#999',
  fontSize: '16px',
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

const pinnedStyle: Record<string, string> = {
  borderLeft: '4px solid #4338CA',
  background: 'rgba(67,56,202,0.02)',
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

const actionBtnStyle: Record<string, string> = {
  border: 'none',
  background: 'transparent',
  color: '#888',
  fontSize: '11px',
  cursor: 'pointer',
  padding: '2px 6px',
  borderRadius: '4px',
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
  marginBottom: '10px',
  whiteSpace: 'pre-wrap',
};

const editTextareaStyle: Record<string, string> = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid rgba(67,56,202,0.3)',
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: 'inherit',
  lineHeight: '1.6',
  resize: 'vertical',
  outline: 'none',
  boxSizing: 'border-box',
};

const saveBtnStyle: Record<string, string> = {
  border: 'none',
  background: '#4338CA',
  color: '#fff',
  fontSize: '12px',
  fontWeight: '500',
  padding: '6px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
};

const cancelBtnStyle: Record<string, string> = {
  border: '1px solid rgba(0,0,0,0.15)',
  background: '#fff',
  color: '#666',
  fontSize: '12px',
  padding: '6px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
};

const sendActionsStyle: Record<string, string> = {
  display: 'flex',
  gap: '6px',
  flexWrap: 'wrap',
};

const sendBtnStyle: Record<string, string> = {
  border: '1px solid rgba(67,56,202,0.2)',
  background: 'rgba(67,56,202,0.04)',
  color: '#4338CA',
  fontSize: '12px',
  fontWeight: '500',
  padding: '5px 12px',
  borderRadius: '6px',
  cursor: 'pointer',
};
