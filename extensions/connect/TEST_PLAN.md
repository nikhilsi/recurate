# Recurate Connect — Test Plan

**Prerequisites:**
- Load extension at `chrome://extensions` → Load unpacked → `extensions/connect/.output/chrome-mv3/`
- Open 2+ Claude.ai chat tabs with existing conversations (so they have names)
- Have at least a few AI responses visible in each tab

---

## 1. Tab Discovery & Registration

- [ ] **Auto-discovery:** Open two Claude.ai tabs. Both should show the tab badge (top-right area) with "1 connected" after a few seconds.
- [ ] **Chat name detection:** Badge or sidebar should show the correct chat name from Claude's UI (not "New chat" if the conversation has a title).
- [ ] **Third tab:** Open a third tab. Badge should update to "2 connected" on all tabs.
- [ ] **Tab close:** Close one tab. Other tabs should update badge count within a few seconds.
- [ ] **SPA navigation:** In one tab, click a different conversation in Claude's sidebar. The tab should re-register with the new chat name and UUID.
- [ ] **New chat:** Start a brand new chat (type a question). Once Claude names the conversation, the tab should re-register with the new name.

## 2. Share Button

- [ ] **Button visible:** Share button (share icon) should appear in the action bar of every AI message, next to Claude's copy/thumbs buttons.
- [ ] **Separator:** A vertical separator line should appear before the share button.
- [ ] **Tooltip:** Hover should show "Share to another chat".
- [ ] **New messages:** When a new AI response arrives, the share button should appear on it within a few seconds.

## 3. Tab Picker

- [ ] **Dropdown appears:** Click the share button. A dropdown should appear listing the other connected tab(s) by name.
- [ ] **All tabs option:** If 2+ other tabs are connected, "All tabs" should appear at the top of the dropdown.
- [ ] **No tabs:** If only one tab is open, the dropdown should say "No other tabs connected".
- [ ] **Click outside:** Clicking outside the dropdown should close it.
- [ ] **Escape:** Pressing Escape should close the dropdown.

## 4. Sharing — Auto-Send

- [ ] **Share to single tab:** Click share on an AI message, pick a target tab. Switch to that tab. The message should have been injected into the input and sent. Claude in that tab should be responding to it.
- [ ] **Exchange context:** The injected text should include both "You asked:" (the user prompt) and "Claude:" (the AI response), prefixed with "[From {source chat name}]:".
- [ ] **Broadcast:** Click share, pick "All tabs". All connected tabs should receive the shared message.

## 5. Sharing — Selection

- [ ] **Selected text:** Select a portion of an AI response, then click share. Only the selected text should be shared (not the full message).
- [ ] **No selection:** Click share without selecting text. The full exchange (prompt + response) should be shared.

## 6. Shift+Click (Inject Without Sending)

- [ ] **Shift+click tab name:** In the tab picker, hold Shift and click a tab name. The text should be injected into that tab's input but NOT auto-sent. The cursor should be in the input so you can add context before sending.

## 7. Sidebar — Basic

- [ ] **Toggle:** Click the sidebar toggle button (right edge of page, arrow icon). Sidebar should expand/collapse.
- [ ] **Entry count badge:** When sidebar is collapsed and entries exist, a count badge should appear on the toggle button.
- [ ] **Empty state:** With no shared messages, sidebar should show "No shared messages yet..." text.
- [ ] **Entry appears:** After sharing a message, it should appear in the sidebar of ALL connected tabs.
- [ ] **Entry content:** Each entry should show: source chat name, timestamp, prompt (if present), response text.
- [ ] **Reverse chronological:** Newest entries should appear at the top.

## 8. Sidebar — Send from Sidebar

- [ ] **Send to single tab:** Click "Send to {tab name}" on a sidebar entry. The entry should be injected and sent to that tab.
- [ ] **Send to all:** Click "Send to all" on a sidebar entry. All connected tabs should receive it.
- [ ] **Re-send old entry:** Scroll down to an older entry and send it. Should work the same as sending a new one.

## 9. Sidebar — Edit

- [ ] **Edit button:** Click the pencil icon on an entry. A textarea should appear with the response text.
- [ ] **Edit and save:** Modify the text, click Save. The entry in the sidebar should update. The change should be reflected in all tabs' sidebars.
- [ ] **Cancel:** Click Cancel during edit. The original text should be preserved.
- [ ] **Send after edit:** Edit an entry, save, then send it to another tab. The edited text should be what gets injected.

## 10. Sidebar — Pin

- [ ] **Pin:** Click the pin icon on an entry. It should move to the top of the list and show a pin indicator + left border.
- [ ] **Unpin:** Click pin again on a pinned entry. It should return to its chronological position.
- [ ] **Pin persists:** Pin an entry, collapse and expand the sidebar. The pin should persist.

## 11. Sidebar — Delete

- [ ] **Delete:** Click the X button on an entry. It should be removed from the sidebar in all tabs.
- [ ] **Clear all:** Click "Clear" in the sidebar header. All entries should be removed.

## 12. Sidebar — Search

- [ ] **Search bar:** With 4+ entries, a search bar should appear below the header.
- [ ] **Filter:** Type a search term. Only entries matching the term (in from, prompt, or response) should be shown.
- [ ] **Clear search:** Click the X in the search bar. All entries should reappear.
- [ ] **No matches:** Search for something that doesn't match. Should show "No matches found."

## 13. Sidebar — Resize

- [ ] **Resize width:** Hover over the left edge of the sidebar. Cursor should change to resize. Drag to make wider/narrower.
- [ ] **Min/max:** Sidebar should not go below 250px or above 600px wide.

## 14. Sidebar — Drag to Editor

- [ ] **Drag:** Drag an entry from the sidebar toward the Claude editor input. The editor should highlight (blue outline).
- [ ] **Drop:** Drop the entry on the editor. The formatted text should be appended to whatever is already in the editor.
- [ ] **Drag away:** Drag over the editor, then drag away without dropping. The highlight should disappear.

## 15. Chat-Requested Share

- [ ] **Pattern detection:** In a conversation, get Claude to write something like "Please share this with Book HQ:" or "Send this to Ops-HQ:". The extension should detect the pattern and show a highlighted bar with "Claude wants to share with {tab name}" and a "Share to {tab}" button.
- [ ] **One-click share:** Click the "Share to {tab}" button. The entry should be shared. The bar should turn green and say "Shared".
- [ ] **Dismiss:** Click the X on the bar. It should disappear.
- [ ] **No match:** If the pattern mentions a tab name that isn't connected, no bar should appear.

## 16. Pop-out Window

- [ ] **Open:** Click the pop-out arrow button (top-right of sidebar header). A new browser window should open showing the shared space.
- [ ] **Sidebar collapses:** The inline sidebar should collapse when the window opens.
- [ ] **Window content:** The pop-out window should show: header with connected tab names, entry count, all shared entries with full text (not truncated).
- [ ] **Send from window:** Click "Send to {tab}" on an entry in the pop-out window. The message should be injected and sent in the target tab.
- [ ] **Real-time updates:** Share a new message from a Claude tab. The pop-out window should update immediately.
- [ ] **Edit in window:** Edit an entry in the pop-out window. Save. The change should appear in the inline sidebar too.
- [ ] **Separate monitor:** Drag the pop-out window to a second monitor. Everything should still work.
- [ ] **Resize window:** The pop-out window should be freely resizable.

## 17. Persistence

- [ ] **Browser restart:** Share some messages. Close and reopen Chrome. The shared space entries should still be there (stored in chrome.storage.local).
- [ ] **Tab reload:** Reload a Claude.ai tab. It should re-register and the sidebar should show existing shared entries.

## 18. Edge Cases

- [ ] **Single tab:** With only one Claude.ai tab open, the tab badge should not appear. Share button dropdown should say "No other tabs connected."
- [ ] **Very long message:** Share a very long AI response. The sidebar should show a truncated preview. The pop-out window should show the full text. The injected text in the target tab should include the full message.
- [ ] **Non-Claude tab:** The extension should not inject anything on non-Claude.ai pages.
- [ ] **Streaming response:** While Claude is still streaming a response, the action bar may not be present yet. Share buttons should appear once streaming completes and the action bar appears.

---

**Total test cases: 50+**

After testing, note any failures here with steps to reproduce.
