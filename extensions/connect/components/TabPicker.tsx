import { signal } from '@preact/signals';
import type { TabInfo } from '../lib/types';

interface TabPickerProps {
  tabs: TabInfo[];
  onSelect: (tabIds: number[] | 'all') => void;
  onClose: () => void;
  anchorEl: HTMLElement;
}

export function TabPicker({ tabs, onSelect, onClose, anchorEl }: TabPickerProps) {
  if (tabs.length === 0) {
    return (
      <div style={dropdownStyle(anchorEl)}>
        <div style={itemStyle}>No other tabs connected</div>
      </div>
    );
  }

  return (
    <div style={dropdownStyle(anchorEl)} onMouseLeave={onClose}>
      {tabs.length > 1 && (
        <button
          style={{ ...itemStyle, fontWeight: '600', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
          onClick={() => { onSelect('all'); onClose(); }}
        >
          All tabs ({tabs.length})
        </button>
      )}
      {tabs.map(tab => (
        <button
          key={tab.tabId}
          style={itemStyle}
          onClick={() => { onSelect([tab.tabId]); onClose(); }}
        >
          {tab.chatName || 'Untitled chat'}
        </button>
      ))}
    </div>
  );
}

function dropdownStyle(anchor: HTMLElement): Record<string, string> {
  const rect = anchor.getBoundingClientRect();
  return {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    zIndex: '2147483647',
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    minWidth: '160px',
    maxWidth: '280px',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '13px',
  };
}

const itemStyle: Record<string, string> = {
  display: 'block',
  width: '100%',
  padding: '8px 12px',
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  cursor: 'pointer',
  color: '#1a1a2e',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
