// --- Tab Registry ---

export interface TabInfo {
  tabId: number;
  chatName: string;
  chatUuid: string;
  url: string;
}

// --- Shared Space ---

export interface SharedEntry {
  id: string;
  from: string; // chat name of source tab
  fromUuid: string;
  prompt: string; // user message that triggered the response
  response: string; // AI response (or selected portion)
  timestamp: number;
}

// --- Messages between content script and background ---

export type BgMessage =
  | { type: 'REGISTER_TAB'; chatName: string; chatUuid: string; url: string }
  | { type: 'UNREGISTER_TAB' }
  | { type: 'GET_TABS' }
  | { type: 'SHARE'; entry: Omit<SharedEntry, 'id' | 'timestamp'>; targetTabIds: number[] | 'all' }
  | { type: 'GET_SHARED_SPACE' }
  | { type: 'SEND_ENTRY'; entryId: string; targetTabIds: number[] | 'all' }
  | { type: 'CLEAR_SHARED_SPACE' }
  | { type: 'POP_OUT_SHARED_SPACE' };

export type CsMessage =
  | { type: 'TABS_UPDATED'; tabs: TabInfo[]; yourTabId: number }
  | { type: 'SHARED_SPACE_UPDATED'; entries: SharedEntry[] }
  | { type: 'INJECT_AND_SEND'; entry: SharedEntry; autoSend: boolean }
  | { type: 'POPOUT_STATE'; isOpen: boolean };
