import { defineContentScript } from 'wxt/sandbox';
import { render } from 'preact';
import { signal } from '@preact/signals';
import { SELECTORS } from '../lib/selectors';
import { extractExchange, getSelectedText } from '../lib/exchange';
import { injectEntry, appendToEditor, formatForInjection } from '../lib/inject';
import type { TabInfo, SharedEntry, BgMessage, CsMessage } from '../lib/types';
import { TabPicker } from '../components/TabPicker';
import { TabBadge } from '../components/TabBadge';
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
      // Debounce: cancel any pending registration
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

    // Register on load
    setTimeout(register, 1000);

    // Re-register on SPA navigation (URL change without page reload)
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
          // Background tells us our tabId explicitly
          currentTabId = message.yourTabId;
          otherTabs.value = message.tabs.filter(t => t.tabId !== currentTabId);
          break;

        case 'SHARED_SPACE_UPDATED':
          sharedEntries.value = message.entries;
          break;

        case 'INJECT_AND_SEND':
          injectEntry(message.entry, message.autoSend);
          break;
      }
    });

    // --- Share Button Injection ---

    const SHARE_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>';

    let activePickerContainer: HTMLElement | null = null;

    function closePicker() {
      if (activePickerContainer) {
        activePickerContainer.remove();
        activePickerContainer = null;
      }
    }

    function showPicker(anchorEl: HTMLElement, messageEl: HTMLElement) {
      closePicker();

      const container = document.createElement('div');
      container.className = 'rc-connect-picker';
      document.body.appendChild(container);
      activePickerContainer = container;

      const handleSelect = (targetTabIds: number[] | 'all') => {
        const selectedText = getSelectedText();
        const exchange = extractExchange(messageEl);

        const entry = {
          from: currentChatName.value,
          fromUuid: currentChatUuid.value,
          prompt: selectedText ? '' : exchange.prompt,
          response: selectedText || exchange.response,
        };

        const msg: BgMessage = {
          type: 'SHARE',
          entry,
          targetTabIds,
        };
        chrome.runtime.sendMessage(msg);
        closePicker();
      };

      render(
        <TabPicker
          tabs={otherTabs.value}
          onSelect={handleSelect}
          onClose={closePicker}
          anchorEl={anchorEl}
        />,
        container
      );
    }

    function createShareButton(messageEl: HTMLElement): HTMLElement {
      const wrapper = document.createElement('div');
      wrapper.className = 'w-fit rc-connect-injected';
      wrapper.setAttribute('data-state', 'closed');

      const btn = document.createElement('button');
      btn.className = 'inline-flex items-center justify-center relative isolate shrink-0 can-focus select-none border-transparent transition font-base duration-300 h-8 w-8 rounded-md group/btn _fill_56vq7_9 _ghost_56vq7_96';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Share to another chat');
      btn.title = 'Share to another chat';

      const iconDiv = document.createElement('div');
      iconDiv.className = 'text-text-500 group-hover/btn:text-text-100';
      iconDiv.style.cssText = 'width:20px;height:20px;display:flex;align-items:center;justify-content:center;';
      iconDiv.innerHTML = SHARE_SVG;

      btn.appendChild(iconDiv);
      wrapper.appendChild(btn);

      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', e => {
        e.stopPropagation();
        showPicker(btn, messageEl);
      });

      return wrapper;
    }

    function findMessageForActionBar(bar: HTMLElement): HTMLElement | null {
      let el: HTMLElement | null = bar;
      while (el) {
        if (el.matches(SELECTORS.aiMessage) || el.matches(SELECTORS.userMessage)) {
          return el;
        }
        el = el.parentElement;
      }
      const parent = bar.closest('[data-is-streaming]') ||
                     bar.closest('[data-testid="user-message"]');
      return parent as HTMLElement | null;
    }

    function injectShareButtons() {
      document.querySelectorAll('.rc-connect-injected').forEach(el => el.remove());

      const bars = document.querySelectorAll(SELECTORS.actionBar);
      bars.forEach(bar => {
        const messageEl = findMessageForActionBar(bar as HTMLElement);
        if (!messageEl) return;

        const sep = document.createElement('div');
        sep.className = 'rc-connect-injected';
        sep.style.cssText = 'width:1px;height:16px;background:currentColor;opacity:0.15;margin:0 2px;align-self:center;';

        const shareBtn = createShareButton(messageEl);

        bar.appendChild(sep);
        bar.appendChild(shareBtn);
      });
    }

    // --- Chat-Requested Share Detection ---

    const SHARE_PATTERNS = [
      /share (?:this )?with\s+(.+?):/i,
      /send (?:this )?to\s+(.+?):/i,
      /please share (?:this )?with\s+(.+)/i,
      /forward (?:this )?to\s+(.+?):/i,
    ];

    function findMatchingTab(name: string): TabInfo | null {
      const normalized = name.toLowerCase().trim().replace(/['"]/g, '');
      return otherTabs.value.find(t =>
        t.chatName.toLowerCase().includes(normalized) ||
        normalized.includes(t.chatName.toLowerCase())
      ) || null;
    }

    function scanForShareRequests() {
      const aiMessages = document.querySelectorAll(
        `${SELECTORS.aiMessage}:not([data-rc-share-scanned])`
      );

      aiMessages.forEach(msgEl => {
        msgEl.setAttribute('data-rc-share-scanned', 'true');

        const content =
          msgEl.querySelector(SELECTORS.aiMessageContent) ||
          msgEl.querySelector(SELECTORS.aiMessageContentFallback) ||
          msgEl;
        const text = content.textContent || '';

        for (const pattern of SHARE_PATTERNS) {
          const match = text.match(pattern);
          if (!match) continue;

          const targetName = match[1].trim();
          const targetTab = findMatchingTab(targetName);
          if (!targetTab) continue;

          injectRequestedShareButton(msgEl as HTMLElement, targetTab);
          break;
        }
      });
    }

    function injectRequestedShareButton(msgEl: HTMLElement, targetTab: TabInfo) {
      if (msgEl.querySelector('.rc-connect-requested-share')) return;

      const bar = document.createElement('div');
      bar.className = 'rc-connect-requested-share rc-connect-injected';
      bar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 12px;margin:8px 0;background:rgba(67,56,202,0.06);border:1px solid rgba(67,56,202,0.15);border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:12px;';

      const label = document.createElement('span');
      label.style.cssText = 'color:#4338CA;flex:1;';
      label.textContent = `Claude wants to share with ${targetTab.chatName}`;

      const btn = document.createElement('button');
      btn.style.cssText = 'border:1px solid #4338CA;background:#4338CA;color:#fff;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;';
      btn.textContent = `Share to ${targetTab.chatName}`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const exchange = extractExchange(msgEl);
        const msg: BgMessage = {
          type: 'SHARE',
          entry: {
            from: currentChatName.value,
            fromUuid: currentChatUuid.value,
            prompt: exchange.prompt,
            response: exchange.response,
          },
          targetTabIds: [targetTab.tabId],
        };
        chrome.runtime.sendMessage(msg);
        bar.style.background = 'rgba(52,211,153,0.08)';
        bar.style.borderColor = 'rgba(52,211,153,0.3)';
        btn.textContent = 'Shared';
        btn.disabled = true;
        btn.style.background = '#34D399';
        btn.style.borderColor = '#34D399';
      });

      const dismiss = document.createElement('button');
      dismiss.style.cssText = 'border:none;background:transparent;color:#999;font-size:14px;cursor:pointer;padding:2px 4px;';
      dismiss.textContent = '\u00d7';
      dismiss.title = 'Dismiss';
      dismiss.addEventListener('click', (e) => {
        e.stopPropagation();
        bar.remove();
      });

      bar.appendChild(label);
      bar.appendChild(btn);
      bar.appendChild(dismiss);

      const actionBar = msgEl.querySelector(SELECTORS.actionBar);
      if (actionBar) {
        actionBar.parentElement?.insertBefore(bar, actionBar);
      } else {
        msgEl.appendChild(bar);
      }
    }

    // --- Drag-to-inject receiver ---

    function setupDragReceiver() {
      const editor = document.querySelector(SELECTORS.editor) as HTMLElement | null;
      if (!editor) return;

      editor.addEventListener('dragover', (e) => {
        const de = e as DragEvent;
        // Only accept our extension's drag data
        if (de.dataTransfer?.types.includes('application/rc-connect-entry')) {
          e.preventDefault();
          de.dataTransfer.dropEffect = 'copy';
          editor.style.outline = '2px solid #4338CA';
        }
      });

      editor.addEventListener('dragleave', () => {
        editor.style.outline = '';
      });

      editor.addEventListener('drop', (e) => {
        e.preventDefault();
        editor.style.outline = '';
        const de = e as DragEvent;
        if (de.dataTransfer?.types.includes('application/rc-connect-entry')) {
          const text = de.dataTransfer.getData('text/plain');
          if (text) {
            appendToEditor(text);
          }
        }
      });
    }

    // --- Sidebar + Badge Mount ---

    function mountUI() {
      let badgeRoot = document.getElementById('rc-connect-badge');
      if (!badgeRoot) {
        badgeRoot = document.createElement('div');
        badgeRoot.id = 'rc-connect-badge';
        document.body.appendChild(badgeRoot);
      }

      let sidebarRoot = document.getElementById('rc-connect-sidebar');
      if (!sidebarRoot) {
        sidebarRoot = document.createElement('div');
        sidebarRoot.id = 'rc-connect-sidebar';
        document.body.appendChild(sidebarRoot);
      }

      const renderUI = () => {
        render(
          <TabBadge tabs={otherTabs.value} currentName={currentChatName.value} />,
          badgeRoot!
        );

        render(
          <Sidebar
            entries={sharedEntries.value}
            tabs={[...otherTabs.value, { tabId: currentTabId, chatName: currentChatName.value, chatUuid: currentChatUuid.value, url: window.location.href }]}
            currentTabId={currentTabId}
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

      // Subscribe to signal changes — store unsubscribe functions for cleanup
      unsubscribes.push(otherTabs.subscribe(() => renderUI()));
      unsubscribes.push(sharedEntries.subscribe(() => renderUI()));
      unsubscribes.push(currentChatName.subscribe(() => renderUI()));
    }

    // --- Init ---

    document.addEventListener('click', (e) => {
      if (activePickerContainer && !activePickerContainer.contains(e.target as Node)) {
        closePicker();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePicker();
    });

    // Mount UI after Claude.ai renders
    setTimeout(mountUI, 2000);
    setTimeout(setupDragReceiver, 3000);

    // Periodic tasks — store interval IDs for cleanup
    intervals.push(window.setInterval(injectShareButtons, 3000));
    intervals.push(window.setInterval(scanForShareRequests, 3000));

    // Initial injection
    setTimeout(injectShareButtons, 3000);
    setTimeout(scanForShareRequests, 4000);
  },
});
