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

    // --- Tab Registration ---

    function getChatInfo(): { name: string; uuid: string } {
      const titleEl = document.querySelector(SELECTORS.chatTitle);
      const name = titleEl?.textContent?.trim() || 'New chat';
      const pathParts = window.location.pathname.split('/');
      const uuid = pathParts[2] || '';
      return { name, uuid };
    }

    function register() {
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
    }

    // Register on load
    setTimeout(register, 1000);

    // Re-register on SPA navigation (URL change without page reload)
    let lastUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        setTimeout(register, 500);
      }
    });
    urlObserver.observe(document.querySelector('title') || document.head, {
      childList: true, subtree: true, characterData: true,
    });

    // Also watch for title changes (chat gets named after first message)
    const titleObserver = new MutationObserver(() => {
      const { name } = getChatInfo();
      if (name !== currentChatName.value && name !== 'New chat') {
        register();
      }
    });
    // Observe the area where the chat title lives
    setTimeout(() => {
      const titleArea = document.querySelector(SELECTORS.chatTitle)?.closest('button');
      if (titleArea) {
        titleObserver.observe(titleArea, { childList: true, subtree: true, characterData: true });
      }
    }, 2000);

    // --- Listen for messages from background ---

    chrome.runtime.onMessage.addListener((message: CsMessage) => {
      switch (message.type) {
        case 'TABS_UPDATED':
          // Store our own tabId by finding ourselves in the list
          const self = message.tabs.find(
            t => t.chatUuid === currentChatUuid.value && t.url === window.location.href
          );
          if (self) currentTabId = self.tabId;
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
      // Walk up from action bar to find the message container
      let el: HTMLElement | null = bar;
      while (el) {
        if (el.matches(SELECTORS.aiMessage) || el.matches(SELECTORS.userMessage)) {
          return el;
        }
        el = el.parentElement;
      }
      // Fallback: look for sibling/parent message content
      const parent = bar.closest('[data-is-streaming]') ||
                     bar.closest('[data-testid="user-message"]');
      return parent as HTMLElement | null;
    }

    function injectShareButtons() {
      // Remove old injected buttons
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

    // --- V0.2: Chat-Requested Share Detection ---
    // Watches for AI messages containing "share with {tab name}:" or
    // "share this with {tab name}" patterns. Injects a one-click share button.

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
      // Find AI messages that haven't been scanned yet
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

          // Inject a highlighted share button above the message
          injectRequestedShareButton(msgEl as HTMLElement, targetTab);
          break;
        }
      });
    }

    function injectRequestedShareButton(msgEl: HTMLElement, targetTab: TabInfo) {
      // Don't double-inject
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

      // Insert before the message action bar or at the end of the message
      const actionBar = msgEl.querySelector(SELECTORS.actionBar);
      if (actionBar) {
        actionBar.parentElement?.insertBefore(bar, actionBar);
      } else {
        msgEl.appendChild(bar);
      }
    }

    // --- Sidebar + Badge Mount ---

    function mountUI() {
      // Badge
      let badgeRoot = document.getElementById('rc-connect-badge');
      if (!badgeRoot) {
        badgeRoot = document.createElement('div');
        badgeRoot.id = 'rc-connect-badge';
        document.body.appendChild(badgeRoot);
      }

      // Sidebar
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

      // Re-render when signals change
      // Use effect-like pattern with signal subscriptions
      renderUI();

      // Subscribe to signal changes for re-rendering
      const unsubTabs = otherTabs.subscribe(() => renderUI());
      const unsubEntries = sharedEntries.subscribe(() => renderUI());
      const unsubName = currentChatName.subscribe(() => renderUI());
    }

    // --- V0.3: Drag-to-inject receiver ---
    // When a sidebar entry is dragged onto the editor, append it

    function setupDragReceiver() {
      const editor = document.querySelector(SELECTORS.editor);
      if (!editor) return;

      editor.addEventListener('dragover', (e) => {
        e.preventDefault();
        (e as DragEvent).dataTransfer!.dropEffect = 'copy';
        (editor as HTMLElement).style.outline = '2px solid #4338CA';
      });

      editor.addEventListener('dragleave', () => {
        (editor as HTMLElement).style.outline = '';
      });

      editor.addEventListener('drop', (e) => {
        e.preventDefault();
        (editor as HTMLElement).style.outline = '';
        const text = (e as DragEvent).dataTransfer?.getData('text/plain');
        if (text) {
          appendToEditor(text);
        }
      });
    }

    // --- Init ---

    // Close picker on click outside
    document.addEventListener('click', (e) => {
      if (activePickerContainer && !activePickerContainer.contains(e.target as Node)) {
        closePicker();
      }
    });

    // Close picker on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePicker();
    });

    // Mount UI after a delay (let Claude.ai render first)
    setTimeout(mountUI, 2000);

    // Setup drag receiver after editor loads
    setTimeout(setupDragReceiver, 3000);

    // Inject share buttons and scan for share requests periodically
    setTimeout(injectShareButtons, 3000);
    setInterval(injectShareButtons, 3000);
    setTimeout(scanForShareRequests, 4000);
    setInterval(scanForShareRequests, 3000);
  },
});
