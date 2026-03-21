import { defineContentScript } from 'wxt/sandbox';
import { render } from 'preact';
import { signal } from '@preact/signals';
import { getPlatform, CLAUDE, COPILOT, type Platform } from '../lib/selectors';
import { getSelectedText } from '../lib/exchange';
import { injectEntry } from '../lib/inject';
import type { TabInfo, SharedEntry, BgMessage, CsMessage } from '../lib/types';
import { Sidebar } from '../components/Sidebar';

export default defineContentScript({
  matches: ['*://claude.ai/*', '*://m365.cloud.microsoft/chat*'],
  runAt: 'document_idle',

  main() {
    const platform = getPlatform();
    if (!platform) return;

    // Platform-specific selectors
    const sel = platform === 'copilot' ? COPILOT : CLAUDE;

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
      if (platform === 'copilot') {
        // Copilot: use page title or "Copilot" as name, URL path as UUID
        const title = document.title?.replace('Chat | ', '').trim() || 'Copilot';
        const uuid = `copilot-${window.location.hostname}`;
        return { name: title, uuid };
      }
      // Claude: title from DOM, UUID from URL
      const titleEl = document.querySelector(CLAUDE.chatTitle);
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

    // Watch for title changes (Claude: chat gets named after first message)
    if (platform === 'claude') {
      setTimeout(() => {
        const titleArea = document.querySelector(CLAUDE.chatTitle)?.closest('button');
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
    }

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

    // --- Extract last exchange (platform-aware) ---

    function extractLastExchange(): { prompt: string; response: string } | null {
      const selectedText = getSelectedText();
      if (selectedText) {
        return { prompt: '', response: selectedText };
      }

      const allMessages = document.querySelectorAll(
        `${sel.userMessage}, ${sel.aiMessage}`
      );
      let prompt = '';
      let response = '';

      if (allMessages.length > 0) {
        for (let i = allMessages.length - 1; i >= 0; i--) {
          const el = allMessages[i] as HTMLElement;
          if (!response && !el.matches(sel.userMessage)) {
            // AI message — find the content
            const content =
              el.querySelector(sel.aiMessageContent) ||
              el.querySelector(sel.aiMessageContentFallback) || el;
            response = content.textContent?.trim() || '';
          } else if (response && el.matches(sel.userMessage)) {
            const text = el.textContent?.trim() || '';
            // Skip injected share messages
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

    // --- Share Button ---

    const SHARE_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>';

    function createShareButton(): HTMLElement {
      if (platform === 'claude') {
        // Match Claude's action bar button style
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
      } else {
        // Generic floating share button for Copilot (no action bar to inject into)
        const btn = document.createElement('button');
        btn.className = 'rc-connect-injected';
        btn.type = 'button';
        btn.innerHTML = SHARE_SVG;
        btn.title = otherTabs.value.length > 0
          ? `Share to ${otherTabs.value[0].chatName}`
          : 'Share to another chat';
        btn.style.cssText = 'position:fixed;bottom:80px;left:20px;z-index:2147483646;width:36px;height:36px;border:1px solid rgba(67,56,202,0.2);border-radius:10px;background:rgba(67,56,202,0.06);color:#4338CA;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.06);';
        btn.addEventListener('mousedown', e => e.preventDefault());
        btn.addEventListener('click', e => {
          e.stopPropagation();
          shareToOtherTab();
        });
        return btn;
      }
    }

    function injectShareButtons() {
      document.querySelectorAll('.rc-connect-injected').forEach(el => {
        // Don't remove the sidebar root
        if (el.id === 'rc-connect-sidebar') return;
        el.remove();
      });

      if (otherTabs.value.length === 0) return;

      if (platform === 'claude') {
        // Claude: inject into last action bar
        const bars = document.querySelectorAll(CLAUDE.actionBar);
        if (bars.length === 0) return;

        const lastBar = bars[bars.length - 1];

        const sep = document.createElement('div');
        sep.className = 'rc-connect-injected';
        sep.style.cssText = 'width:1px;height:16px;background:currentColor;opacity:0.15;margin:0 2px;align-self:center;';

        const shareBtn = createShareButton();

        lastBar.appendChild(sep);
        lastBar.appendChild(shareBtn);
      } else {
        // Copilot: floating share button (no per-message action bars)
        if (!document.querySelector('.rc-connect-injected[style*="fixed"]')) {
          const shareBtn = createShareButton();
          document.body.appendChild(shareBtn);
        }
      }
    }

    // --- Command Palette (\rc, \rcp, \rcc) ---

    function getEditorText(): string {
      const editorSelector = platform === 'copilot'
        ? (COPILOT.editor + ', ' + COPILOT.editorFallback + ', ' + COPILOT.lexicalEditor)
        : CLAUDE.editor;
      const editor = document.querySelector(editorSelector) as HTMLElement | null;
      return editor?.textContent?.trim() || '';
    }

    function clearEditor() {
      if (platform === 'copilot') {
        // Lexical clear: select all + deleteContentBackward
        const editor = document.querySelector(COPILOT.editor) ||
                       document.querySelector(COPILOT.editorFallback) ||
                       document.querySelector(COPILOT.lexicalEditor);
        if (!editor) return;
        (editor as HTMLElement).focus();
        const s = document.getSelection();
        if (s) {
          const range = document.createRange();
          range.selectNodeContents(editor);
          s.removeAllRanges();
          s.addRange(range);
        }
        document.dispatchEvent(new Event('selectionchange'));
        setTimeout(() => {
          editor.dispatchEvent(new InputEvent('beforeinput', {
            inputType: 'deleteContentBackward',
            bubbles: true,
            cancelable: true,
          }));
        }, 20);
      } else {
        // ProseMirror clear
        const editor = document.querySelector(CLAUDE.editor) as HTMLElement | null;
        if (!editor) return;
        editor.innerHTML = '<p><br></p>';
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    function handleCommand(text: string): boolean {
      // Strip zero-width characters that Lexical appends
      const cmd = text.trim().replace(/[\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase();

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
    }, true);

    // --- Sidebar Mount ---

    function findInputContainer(): HTMLElement | null {
      const editorSelector = platform === 'copilot'
        ? (COPILOT.editor + ', ' + COPILOT.editorFallback)
        : CLAUDE.editor;
      const editor = document.querySelector(editorSelector);
      if (!editor) return null;
      return editor.closest('form') ||
             editor.closest('[class*="composer"]') ||
             editor.closest('[class*="ChatInput"]') ||
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
