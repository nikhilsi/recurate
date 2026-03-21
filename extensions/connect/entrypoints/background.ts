import { defineBackground } from 'wxt/sandbox';
import type { TabInfo, BgMessage, CsMessage, SharedEntry } from '../lib/types';
import { getEntries, addEntry, getEntry, updateEntry, deleteEntry, clearEntries, generateId } from '../lib/shared-space';

export default defineBackground(() => {
  // --- Tab Registry ---
  const tabs = new Map<number, TabInfo>();

  function getTabList(): TabInfo[] {
    return Array.from(tabs.values());
  }

  function broadcastTabsUpdated() {
    const tabList = getTabList();
    const msg: CsMessage = { type: 'TABS_UPDATED', tabs: tabList };
    for (const tabId of tabs.keys()) {
      chrome.tabs.sendMessage(tabId, msg).catch(() => {
        // Tab may have closed — clean up
        tabs.delete(tabId);
      });
    }
  }

  async function broadcastSharedSpaceUpdated() {
    const entries = await getEntries();
    const msg: CsMessage = { type: 'SHARED_SPACE_UPDATED', entries };
    for (const tabId of tabs.keys()) {
      chrome.tabs.sendMessage(tabId, msg).catch(() => {
        tabs.delete(tabId);
      });
    }
  }

  // Clean up when tabs close
  chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabs.has(tabId)) {
      tabs.delete(tabId);
      broadcastTabsUpdated();
    }
  });

  // Clean up when tabs navigate away from claude.ai
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url && tabs.has(tabId)) {
      if (!changeInfo.url.includes('claude.ai')) {
        tabs.delete(tabId);
        broadcastTabsUpdated();
      }
    }
  });

  // --- Message Handler ---
  chrome.runtime.onMessage.addListener((message: BgMessage, sender, sendResponse) => {
    const senderTabId = sender.tab?.id;
    if (!senderTabId) return;

    switch (message.type) {
      case 'REGISTER_TAB': {
        tabs.set(senderTabId, {
          tabId: senderTabId,
          chatName: message.chatName,
          chatUuid: message.chatUuid,
          url: message.url,
        });
        broadcastTabsUpdated();
        // Also send current shared space to the new tab
        broadcastSharedSpaceUpdated();
        break;
      }

      case 'UNREGISTER_TAB': {
        tabs.delete(senderTabId);
        broadcastTabsUpdated();
        break;
      }

      case 'GET_TABS': {
        sendResponse(getTabList().filter(t => t.tabId !== senderTabId));
        return true; // async response
      }

      case 'GET_SHARED_SPACE': {
        getEntries().then(entries => sendResponse(entries));
        return true;
      }

      case 'SHARE': {
        const entry: SharedEntry = {
          id: generateId(),
          from: message.entry.from,
          fromUuid: message.entry.fromUuid,
          prompt: message.entry.prompt,
          response: message.entry.response,
          timestamp: Date.now(),
        };

        addEntry(entry).then(async () => {
          // Broadcast shared space update to all tabs (for sidebar)
          await broadcastSharedSpaceUpdated();

          // Send to target tab(s) for injection
          const targetIds = message.targetTabIds === 'all'
            ? getTabList().filter(t => t.tabId !== senderTabId).map(t => t.tabId)
            : message.targetTabIds;

          const injectMsg: CsMessage = {
            type: 'INJECT_AND_SEND',
            entry,
            autoSend: true,
          };

          for (const targetId of targetIds) {
            chrome.tabs.sendMessage(targetId, injectMsg).catch(() => {
              tabs.delete(targetId);
            });
          }
        });
        break;
      }

      case 'SEND_ENTRY': {
        getEntry(message.entryId).then(entry => {
          if (!entry) return;

          const targetIds = message.targetTabIds === 'all'
            ? getTabList().filter(t => t.tabId !== senderTabId).map(t => t.tabId)
            : message.targetTabIds;

          const injectMsg: CsMessage = {
            type: 'INJECT_AND_SEND',
            entry,
            autoSend: true,
          };

          for (const targetId of targetIds) {
            chrome.tabs.sendMessage(targetId, injectMsg).catch(() => {
              tabs.delete(targetId);
            });
          }
        });
        break;
      }

      case 'EDIT_ENTRY': {
        updateEntry(message.entryId, { response: message.response })
          .then(() => broadcastSharedSpaceUpdated());
        break;
      }

      case 'PIN_ENTRY': {
        updateEntry(message.entryId, { pinned: message.pinned })
          .then(() => broadcastSharedSpaceUpdated());
        break;
      }

      case 'DELETE_ENTRY': {
        deleteEntry(message.entryId)
          .then(() => broadcastSharedSpaceUpdated());
        break;
      }

      case 'CLEAR_SHARED_SPACE': {
        clearEntries().then(() => broadcastSharedSpaceUpdated());
        break;
      }

      case 'POP_OUT_SHARED_SPACE': {
        chrome.windows.create({
          url: chrome.runtime.getURL('/shared-space.html'),
          type: 'popup',
          width: 480,
          height: 640,
        });
        break;
      }
    }
  });
});
