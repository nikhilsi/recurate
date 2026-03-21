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
    for (const tabId of tabs.keys()) {
      const msg: CsMessage = { type: 'TABS_UPDATED', tabs: tabList, yourTabId: tabId };
      chrome.tabs.sendMessage(tabId, msg).catch(() => {
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

    // Validate message has a type
    if (!message || !message.type) return false;

    // Pop-out window doesn't come from a tab
    if (message.type === 'POP_OUT_SHARED_SPACE') {
      chrome.windows.create({
        url: chrome.runtime.getURL('/shared-space.html'),
        type: 'popup',
        width: 480,
        height: 640,
      }, (win) => {
        if (!win) return;
        const popoutWindowId = win.id;

        // Tell all tabs to collapse inline sidebar
        const openMsg: CsMessage = { type: 'POPOUT_STATE', isOpen: true };
        for (const tabId of tabs.keys()) {
          chrome.tabs.sendMessage(tabId, openMsg).catch(() => {});
        }

        // When pop-out closes, re-enable inline sidebars
        const onRemoved = (windowId: number) => {
          if (windowId === popoutWindowId) {
            chrome.windows.onRemoved.removeListener(onRemoved);
            const closeMsg: CsMessage = { type: 'POPOUT_STATE', isOpen: false };
            for (const tabId of tabs.keys()) {
              chrome.tabs.sendMessage(tabId, closeMsg).catch(() => {});
            }
          }
        };
        chrome.windows.onRemoved.addListener(onRemoved);
      });
      return false;
    }

    // GET_TABS and GET_SHARED_SPACE can come from the pop-out window (no tab)
    if (message.type === 'GET_TABS') {
      const filterTabId = senderTabId || -1;
      sendResponse(getTabList().filter(t => t.tabId !== filterTabId));
      return true;
    }

    if (message.type === 'GET_SHARED_SPACE') {
      getEntries().then(entries => sendResponse(entries));
      return true;
    }

    // SEND_ENTRY can come from pop-out window
    if (message.type === 'SEND_ENTRY') {
      getEntry(message.entryId).then(entry => {
        if (!entry) return;
        const targetIds = message.targetTabIds === 'all'
          ? getTabList().filter(t => t.tabId !== (senderTabId || -1)).map(t => t.tabId)
          : message.targetTabIds;
        const injectMsg: CsMessage = { type: 'INJECT_AND_SEND', entry, autoSend: true };
        for (const targetId of targetIds) {
          chrome.tabs.sendMessage(targetId, injectMsg).catch(() => {
            tabs.delete(targetId);
          });
        }
      });
      return false;
    }

    // All remaining messages require a sender tab
    if (!senderTabId) return false;

    switch (message.type) {
      case 'REGISTER_TAB': {
        tabs.set(senderTabId, {
          tabId: senderTabId,
          chatName: message.chatName,
          chatUuid: message.chatUuid,
          url: message.url,
        });
        broadcastTabsUpdated();
        broadcastSharedSpaceUpdated();
        return false;
      }

      case 'UNREGISTER_TAB': {
        tabs.delete(senderTabId);
        broadcastTabsUpdated();
        return false;
      }

      case 'SHARE': {
        if (!message.entry || !message.entry.from) return false;
        const entry: SharedEntry = {
          id: generateId(),
          from: message.entry.from,
          fromUuid: message.entry.fromUuid,
          prompt: message.entry.prompt,
          response: message.entry.response,
          timestamp: Date.now(),
        };
        addEntry(entry).then(async () => {
          await broadcastSharedSpaceUpdated();
          const targetIds = message.targetTabIds === 'all'
            ? getTabList().filter(t => t.tabId !== senderTabId).map(t => t.tabId)
            : message.targetTabIds;
          const injectMsg: CsMessage = { type: 'INJECT_AND_SEND', entry, autoSend: true };
          for (const targetId of targetIds) {
            chrome.tabs.sendMessage(targetId, injectMsg).catch(() => {
              tabs.delete(targetId);
            });
          }
        });
        return false;
      }

      case 'EDIT_ENTRY': {
        if (!message.entryId) return false;
        updateEntry(message.entryId, { response: message.response })
          .then(() => broadcastSharedSpaceUpdated());
        return false;
      }

      case 'PIN_ENTRY': {
        if (!message.entryId) return false;
        updateEntry(message.entryId, { pinned: message.pinned })
          .then(() => broadcastSharedSpaceUpdated());
        return false;
      }

      case 'DELETE_ENTRY': {
        if (!message.entryId) return false;
        deleteEntry(message.entryId)
          .then(() => broadcastSharedSpaceUpdated());
        return false;
      }

      case 'CLEAR_SHARED_SPACE': {
        clearEntries().then(() => broadcastSharedSpaceUpdated());
        return false;
      }

      default:
        return false;
    }
  });
});
