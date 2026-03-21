import { render } from 'preact';
import { signal, effect } from '@preact/signals';
import type { TabInfo, SharedEntry, BgMessage, CsMessage } from '../../lib/types';
import { SharedSpaceWindow } from '../../components/SharedSpaceWindow';

const tabs = signal<TabInfo[]>([]);
const entries = signal<SharedEntry[]>([]);

// Load initial state
chrome.runtime.sendMessage({ type: 'GET_TABS' } as BgMessage, (result: TabInfo[]) => {
  tabs.value = result || [];
});
chrome.runtime.sendMessage({ type: 'GET_SHARED_SPACE' } as BgMessage, (result: SharedEntry[]) => {
  entries.value = result || [];
});

// Listen for updates from background
chrome.runtime.onMessage.addListener((message: CsMessage) => {
  if (message.type === 'TABS_UPDATED') {
    tabs.value = message.tabs;
  } else if (message.type === 'SHARED_SPACE_UPDATED') {
    entries.value = message.entries;
  }
});

function handleSendEntry(entryId: string, targetTabIds: number[] | 'all') {
  chrome.runtime.sendMessage({ type: 'SEND_ENTRY', entryId, targetTabIds } as BgMessage);
}

function handleClear() {
  chrome.runtime.sendMessage({ type: 'CLEAR_SHARED_SPACE' } as BgMessage);
}

// Re-render whenever signals change
const appRoot = document.getElementById('app')!;

function renderApp() {
  render(
    <SharedSpaceWindow
      entries={entries.value}
      tabs={tabs.value}
      onSendEntry={handleSendEntry}
      onClear={handleClear}
    />,
    appRoot
  );
}

// Initial render
renderApp();

// Subscribe to signal changes
tabs.subscribe(() => renderApp());
entries.subscribe(() => renderApp());
