import { defineContentScript } from 'wxt/sandbox';
import { render } from 'preact';
import { signal } from '@preact/signals';
import { SELECTORS } from '../lib/selectors';
import { getSelectedText } from '../lib/exchange';
import { injectEntry } from '../lib/inject';
import type { TabInfo, SharedEntry, BgMessage, CsMessage } from '../lib/types';
import { Sidebar } from '../components/Sidebar';

export default defineContentScript({
  matches: ['*://claude.ai/*'],
  runAt: 'document_idle',

  main() {
    // --- State ---
    const otherTabs = signal<TabInfo[]>([]);
    const sharedEntries = signal<SharedEntry[]>([]);
    const currentChatName = signal('');
    const currentChatUuid = signal('');
    const popoutIsOpen = signal(false);
    let currentTabId = 0;

    // --- Cleanup tracking ---
    const intervals: number[] = [];
    const observers: MutationObserver[] = [];
    const unsubscribes: (() => void)[] = [];

    // --- Tab Registration (debounced) ---

    let registrationTimer: number | null = null;

    function getChatInfo(): { name: string; uuid: string } {
      const titleEl = document.querySelector(SELECTORS.chatTitle);
      const name = titleEl?.textContent?.trim() || 'New chat';
      const pathParts = window.location.pathname.split('/');
      const uuid = pathParts[2] || '';
      return { name, uuid };
    }

    function register() {
      if (registrationTimer !== null) {
        clearTimeout(registrationTimer);
      }
      registrationTimer = window.setTimeout(() => {
        registrationTimer = null;
        const { name, uuid } = getChatInfo();
        currentChatName.value = name;
        currentChatUuid.value = uuid;

        const msg: BgMessage = {
          type: 'REGISTER_TAB',
          chatName: name,
          chatUuid: uuid,
          url: window.location.href,
        };
        chrome.runtime.sendMessage(msg);
      }, 300);
    }

    setTimeout(register, 1000);

    // Re-register on SPA navigation
    let lastUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        register();
      }
    });
    urlObserver.observe(document.querySelector('title') || document.head, {
      childList: true, subtree: true, characterData: true,
    });
    observers.push(urlObserver);

    // Watch for title changes (chat gets named after first message)
    setTimeout(() => {
      const titleArea = document.querySelector(SELECTORS.chatTitle)?.closest('button');
      if (titleArea) {
        const titleObserver = new MutationObserver(() => {
          const { name } = getChatInfo();
          if (name !== currentChatName.value && name !== 'New chat') {
            register();
          }
        });
        titleObserver.observe(titleArea, { childList: true, subtree: true, characterData: true });
        observers.push(titleObserver);
      }
    }, 2000);

    // --- Listen for messages from background ---

    chrome.runtime.onMessage.addListener((message: CsMessage) => {
      switch (message.type) {
        case 'TABS_UPDATED':
          currentTabId = message.yourTabId;
          otherTabs.value = message.tabs.filter(t => t.tabId !== currentTabId);
          break;

        case 'SHARED_SPACE_UPDATED':
          sharedEntries.value = message.entries;
          break;

        case 'INJECT_AND_SEND':
          injectEntry(message.entry, message.autoSend);
          break;

        case 'POPOUT_STATE':
          popoutIsOpen.value = message.isOpen;
          break;
      }
    });

    // --- Extract last exchange ---

    function extractLastExchange(): { prompt: string; response: string } | null {
      const selectedText = getSelectedText();
      if (selectedText) {
        return { prompt: '', response: selectedText };
      }

      const allMessages = document.querySelectorAll(
        `${SELECTORS.userMessage}, ${SELECTORS.aiMessage}`
      );
      let prompt = '';
      let response = '';

      if (allMessages.length > 0) {
        for (let i = allMessages.length - 1; i >= 0; i--) {
          const el = allMessages[i] as HTMLElement;
          if (!response && !el.matches(SELECTORS.userMessage)) {
            const content = el.querySelector('.font-claude-message') ||
                            el.querySelector('.prose') || el;
            response = content.textContent?.trim() || '';
          } else if (response && el.matches(SELECTORS.userMessage)) {
            const text = el.textContent?.trim() || '';
            // Skip injected share messages — these start with **[From
            if (text.startsWith('**[From')) continue;
            prompt = text;
            break;
          }
        }
      }

      if (!response) return null;
      return { prompt, response };
    }

    // --- Share to the other tab ---

    function shareToOtherTab() {
      if (otherTabs.value.length === 0) return;

      const exchange = extractLastExchange();
      if (!exchange) return;

      const msg: BgMessage = {
        type: 'SHARE',
        entry: {
          from: currentChatName.value,
          fromUuid: currentChatUuid.value,
          prompt: exchange.prompt,
          response: exchange.response,
        },
        targetTabIds: [otherTabs.value[0].tabId],
      };
      chrome.runtime.sendMessage(msg);
    }

    // --- Share Button (no picker — direct share to the one other tab) ---

    const SHARE_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>';

    function createShareButton(): HTMLElement {
      const wrapper = document.createElement('div');
      wrapper.className = 'w-fit rc-connect-injected';
      wrapper.setAttribute('data-state', 'closed');

      const btn = document.createElement('button');
      btn.className = 'inline-flex items-center justify-center relative isolate shrink-0 can-focus select-none border-transparent transition font-base duration-300 h-8 w-8 rounded-md group/btn _fill_56vq7_9 _ghost_56vq7_96';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Share to another chat');
      btn.title = otherTabs.value.length > 0
        ? `Share to ${otherTabs.value[0].chatName}`
        : 'Share to another chat';

      const iconDiv = document.createElement('div');
      iconDiv.className = 'text-text-500 group-hover/btn:text-text-100';
      iconDiv.style.cssText = 'width:20px;height:20px;display:flex;align-items:center;justify-content:center;';
      iconDiv.innerHTML = SHARE_SVG;

      btn.appendChild(iconDiv);
      wrapper.appendChild(btn);

      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', e => {
        e.stopPropagation();
        shareToOtherTab();
      });

      return wrapper;
    }

    function injectShareButtons() {
      document.querySelectorAll('.rc-connect-injected').forEach(el => el.remove());

      if (otherTabs.value.length === 0) return;

      const bars = document.querySelectorAll(SELECTORS.actionBar);
      if (bars.length === 0) return;

      const lastBar = bars[bars.length - 1];

      const sep = document.createElement('div');
      sep.className = 'rc-connect-injected';
      sep.style.cssText = 'width:1px;height:16px;background:currentColor;opacity:0.15;margin:0 2px;align-self:center;';

      const shareBtn = createShareButton();

      lastBar.appendChild(sep);
      lastBar.appendChild(shareBtn);
    }

    // --- Command Palette (\rc, \rcp, \rcc) ---

    function getEditorText(): string {
      const editor = document.querySelector(SELECTORS.editor) as HTMLElement | null;
      return editor?.textContent?.trim() || '';
    }

    function clearEditor() {
      const editor = document.querySelector(SELECTORS.editor) as HTMLElement | null;
      if (!editor) return;
      editor.innerHTML = '<p><br></p>';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function handleCommand(text: string): boolean {
      const cmd = text.trim().toLowerCase();

      if (cmd === '\\rc') {
        shareToOtherTab();
        clearEditor();
        return true;
      }

      if (cmd === '\\rcp') {
        chrome.runtime.sendMessage({ type: 'POP_OUT_SHARED_SPACE' } as BgMessage);
        clearEditor();
        return true;
      }

      if (cmd === '\\rcc') {
        chrome.runtime.sendMessage({ type: 'CLEAR_SHARED_SPACE' } as BgMessage);
        clearEditor();
        return true;
      }

      return false;
    }

    // Intercept Enter key to check for commands
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        const text = getEditorText();
        if (text.startsWith('\\rc')) {
          if (handleCommand(text)) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    }, true); // capture phase to intercept before Claude

    // --- Sidebar Mount ---

    function findInputContainer(): HTMLElement | null {
      const editor = document.querySelector(SELECTORS.editor);
      if (!editor) return null;
      return editor.closest('form') ||
             editor.closest('[class*="composer"]') ||
             editor.parentElement?.parentElement?.parentElement as HTMLElement || null;
    }

    function mountUI() {
      let sidebarRoot = document.getElementById('rc-connect-sidebar');
      if (!sidebarRoot) {
        sidebarRoot = document.createElement('div');
        sidebarRoot.id = 'rc-connect-sidebar';
        document.body.appendChild(sidebarRoot);
      }

      const renderUI = () => {
        const inputContainer = findInputContainer();
        const inputRect = inputContainer?.getBoundingClientRect() || null;

        render(
          <Sidebar
            entries={sharedEntries.value}
            tabs={[...otherTabs.value, { tabId: currentTabId, chatName: currentChatName.value, chatUuid: currentChatUuid.value, url: window.location.href }]}
            currentTabId={currentTabId}
            connectedCount={otherTabs.value.length}
            popoutIsOpen={popoutIsOpen.value}
            inputRect={inputRect}
            onSendEntry={(entryId, targetTabIds) => {
              const msg: BgMessage = { type: 'SEND_ENTRY', entryId, targetTabIds };
              chrome.runtime.sendMessage(msg);
            }}
            onClear={() => {
              const msg: BgMessage = { type: 'CLEAR_SHARED_SPACE' };
              chrome.runtime.sendMessage(msg);
            }}
          />,
          sidebarRoot!
        );
      };

      renderUI();

      unsubscribes.push(otherTabs.subscribe(() => renderUI()));
      unsubscribes.push(sharedEntries.subscribe(() => renderUI()));
      unsubscribes.push(currentChatName.subscribe(() => renderUI()));
      unsubscribes.push(popoutIsOpen.subscribe(() => renderUI()));

      const reposition = () => renderUI();
      window.addEventListener('resize', reposition);
      intervals.push(window.setInterval(reposition, 2000));
    }

    // --- Init ---

    setTimeout(mountUI, 2000);

    intervals.push(window.setInterval(injectShareButtons, 3000));
    setTimeout(injectShareButtons, 3000);
  },
});
