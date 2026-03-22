# Recurate Connect — Test Plan (v0.2.0)

**Prerequisites:**
- Load extension at `chrome://extensions` > Load unpacked > `extensions/connect/.output/chrome-mv3/`
- Open 2 Claude.ai and/or Copilot chat tabs with existing conversations

---

## 1. Tab Discovery & Registration

- [x] **Auto-discovery:** Open two claude.ai tabs. Both should show "1 connected" toggle after a few seconds.
- [x] **Chat name detection:** Toggle shows correct chat name from Claude's UI.
- [x] **Tab close:** Close one tab. Other tab's toggle disappears (0 connected).
- [x] **SPA navigation:** Click a different conversation in Claude's sidebar. Tab re-registers with new name.
- [x] **New chat:** Start a new chat. Once Claude names it, tab re-registers.

## 2. Share Button (Claude)

- [x] **Button visible:** Share icon appears in the action bar of the last AI message.
- [x] **One-click share:** Click share. Last exchange injected into other tab and auto-sent.
- [x] **New messages:** When a new AI response arrives, share button appears on it.

## 3. Command Palette

- [x] **\rc:** Type `\rc` in input, hit Enter. Last exchange shared to other tab. Input cleared.
- [x] **\rcp:** Type `\rcp`. Pop-out window opens. Input cleared.
- [x] **\rcc:** Type `\rcc`. Shared space cleared. Input cleared.
- [x] **Intercepted:** Commands are intercepted before the AI sees them. Claude/Copilot does not receive \rc as input.

## 4. Sharing — Content

- [x] **Exchange context:** Shared message includes "You asked:" (prompt) and "Claude:" (response).
- [x] **Auto-send:** Shared content is injected AND sent automatically in the target tab.
- [x] **Echo prevention:** Round-trip sharing (A to B, B back to A) does not echo the original share as the prompt.

## 5. Text Selection

- [x] **Selected text:** Select a portion of a response, then click share. Only the selected text is shared.

## 6. Sidebar

- [x] **Toggle position:** "1 connected" toggle appears in the right margin next to the input box.
- [x] **Expand:** Click toggle. Panel expands upward showing "Recurate Connect" header + connected tab name.
- [x] **Entries:** After sharing, entries appear in the sidebar with source name, timestamp, and preview.
- [x] **Clear:** "Clear" button removes all entries.

## 7. Pop-out Window

- [x] **Open:** Click pop-out arrow in sidebar header (or type \rcp). Separate window opens.
- [x] **Sidebar collapses:** Inline sidebars on all tabs collapse when pop-out opens.
- [x] **Restore:** Close the pop-out window. Inline sidebar toggles reappear on all tabs.
- [x] **Real-time:** New shares appear in the pop-out window immediately.
- [x] **Tab count:** Pop-out shows correct number of connected tabs and their names.

## 8. Persistence

- [x] **Reload:** Reload a tab. It re-registers and shared space entries are still there.
- [x] **Browser restart:** Shared space entries persist (chrome.storage.local).

## 9. Cross-Platform (Claude + Copilot)

- [x] **Copilot tab detected:** Open m365.cloud.microsoft/chat. Toggle shows "1 connected".
- [x] **Claude to Copilot:** Share from Claude, received and auto-sent in Copilot.
- [x] **Copilot to Claude:** \rc from Copilot, received and auto-sent in Claude.
- [x] **\rc on Copilot:** Command intercepted, Lexical zero-width characters stripped, input cleared.
- [x] **Edge browser:** Extension works in Microsoft Edge.

## 10. Edge Cases

- [ ] **Single tab:** With only one tab open, toggle should not appear.
- [ ] **Very long message:** Share a long response. Sidebar shows truncated preview. Full content shared.
- [ ] **Non-AI tab:** Extension should not inject on non-Claude/Copilot pages.
- [ ] **Streaming response:** Share button appears only after streaming completes.

---

## V0.3 Features (Not Yet Built)

The following features are planned for V0.3 and are NOT in the current test scope:

- Edit entries inline before sending
- Pin/unpin entries
- Delete individual entries
- Search/filter shared messages
- Drag entries from sidebar to editor
- Send from sidebar (re-share older entries)
- Shift+click inject without sending
- Additional platforms (Grok, Gemini, ChatGPT)

---

**Tested:** March 21-22, 2026
