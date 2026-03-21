import { defineBackground } from 'wxt/sandbox';
import type { TabInfo, BgMessage, CsMessage, SharedEntry } from '../lib/types';
import { getEntries, addEntry, getEntry, updateEntry, deleteEntry, clearEntries, generateId } from '../lib/shared-space';

export default defineBackground(() => {
  // --- Tab Registry ---
  // Persisted to chrome.storage.session to survive service worker hibernation
  const MAX_TABS = 2;

  async function getTabs(): Promise<Map<number, TabInfo>> {
    const data = await chrome.storage.session.get('rc_tabs');
    const arr: TabInfo[] = data.rc_tabs || [];
    return new Map(arr.map(t => [t.tabId, t]));
  }

  async function setTabs(tabs: Map<number, TabInfo>) {
    await chrome.storage.session.set({ rc_tabs: Array.from(tabs.values()) });
  }

  async function getTabList(): Promise<TabInfo[]> {
    const tabs = await getTabs();
    return Array.from(tabs.values());
  }

  async function broadcastTabsUpdated() {
    const tabs = await getTabs();
    const tabList = Array.from(tabs.values());
    for (const tabId of tabs.keys()) {
      const msg: CsMessage = { type: 'TABS_UPDATED', tabs: tabList, yourTabId: tabId };
      chrome.tabs.sendMessage(tabId, msg).catch(async () => {
        const current = await getTabs();
        current.delete(tabId);
        await setTabs(current);
      });
    }
    // Also broadcast to any open extension pages (pop-out)
    chrome.runtime.sendMessage({ type: 'TABS_UPDATED', tabs: tabList, yourTabId: -1 } as CsMessage).catch(() => {});
  }

  async function broadcastSharedSpaceUpdated() {
    const tabs = await getTabs();
    const entries = await getEntries();
    const msg: CsMessage = { type: 'SHARED_SPACE_UPDATED', entries };
    for (const tabId of tabs.keys()) {
      chrome.tabs.sendMessage(tabId, msg).catch(async () => {
        const current = await getTabs();
        current.delete(tabId);
        await setTabs(current);
      });
    }
    // Also broadcast to pop-out window
    chrome.runtime.sendMessage(msg).catch(() => {});
  }

  // Clean up when tabs close
  chrome.tabs.onRemoved.addListener(async (tabId) => {
    const tabs = await getTabs();
    if (tabs.has(tabId)) {
      tabs.delete(tabId);
      await setTabs(tabs);
      broadcastTabsUpdated();
    }
  });

  // Clean up when tabs navigate away from claude.ai
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    const tabs = await getTabs();
    if (changeInfo.url && tabs.has(tabId)) {
      if (!changeInfo.url.includes('claude.ai')) {
        tabs.delete(tabId);
        await setTabs(tabs);
        broadcastTabsUpdated();
      }
    }
  });

  // --- Message Handler ---
  chrome.runtime.onMessage.addListener((message: BgMessage, sender, sendResponse) => {
    const senderTabId = sender.tab?.id;

    if (!message || !message.type) return false;

    // Pop-out window commands (no sender tab)
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
        getTabs().then(tabs => {
          const openMsg: CsMessage = { type: 'POPOUT_STATE', isOpen: true };
          for (const tabId of tabs.keys()) {
            chrome.tabs.sendMessage(tabId, openMsg).catch(() => {});
          }
        });

        // When pop-out closes, re-enable inline sidebars
        const onRemoved = (windowId: number) => {
          if (windowId === popoutWindowId) {
            chrome.windows.onRemoved.removeListener(onRemoved);
            getTabs().then(tabs => {
              const closeMsg: CsMessage = { type: 'POPOUT_STATE', isOpen: false };
              for (const tabId of tabs.keys()) {
                chrome.tabs.sendMessage(tabId, closeMsg).catch(() => {});
              }
            });
          }
        };
        chrome.windows.onRemoved.addListener(onRemoved);
      });
      return false;
    }

    if (message.type === 'GET_TABS') {
      getTabList().then(list => {
        const filterTabId = senderTabId || -1;
        sendResponse(list.filter(t => t.tabId !== filterTabId));
      });
      return true;
    }

    if (message.type === 'GET_SHARED_SPACE') {
      getEntries().then(entries => sendResponse(entries));
      return true;
    }

    if (message.type === 'SEND_ENTRY') {
      getEntry(message.entryId).then(async entry => {
        if (!entry) return;
        const tabs = await getTabs();
        const tabList = Array.from(tabs.values());
        const targetIds = message.targetTabIds === 'all'
          ? tabList.filter(t => t.tabId !== (senderTabId || -1)).map(t => t.tabId)
          : message.targetTabIds;
        const injectMsg: CsMessage = { type: 'INJECT_AND_SEND', entry, autoSend: true };
        for (const targetId of targetIds) {
          chrome.tabs.sendMessage(targetId, injectMsg).catch(async () => {
            const current = await getTabs();
            current.delete(targetId);
            await setTabs(current);
          });
        }
      });
      return false;
    }

    // All remaining messages require a sender tab
    if (!senderTabId) return false;

    switch (message.type) {
      case 'REGISTER_TAB': {
        getTabs().then(async tabs => {
          // 2-tab limit: reject if at capacity and this is a new tab
          if (!tabs.has(senderTabId) && tabs.size >= MAX_TABS) {
            return;
          }
          tabs.set(senderTabId, {
            tabId: senderTabId,
            chatName: message.chatName,
            chatUuid: message.chatUuid,
            url: message.url,
          });
          await setTabs(tabs);
          broadcastTabsUpdated();
          broadcastSharedSpaceUpdated();
        });
        return false;
      }

      case 'UNREGISTER_TAB': {
        getTabs().then(async tabs => {
          tabs.delete(senderTabId);
          await setTabs(tabs);
          broadcastTabsUpdated();
        });
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
          const tabs = await getTabs();
          const tabList = Array.from(tabs.values());
          const targetIds = message.targetTabIds === 'all'
            ? tabList.filter(t => t.tabId !== senderTabId).map(t => t.tabId)
            : message.targetTabIds;
          const injectMsg: CsMessage = { type: 'INJECT_AND_SEND', entry, autoSend: true };
          for (const targetId of targetIds) {
            chrome.tabs.sendMessage(targetId, injectMsg).catch(async () => {
              const current = await getTabs();
              current.delete(targetId);
              await setTabs(current);
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
