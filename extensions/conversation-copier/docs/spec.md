# Recurate Copier 1.0: Spec

**Status:** Draft v1, for independent review  
**Date:** November 15, 2026  
**Task:** CenterEye #530 (recurate area)  
**Replaces:** Copier 0.4.0 (July 11, 2026)

---

## 1. Goal

One click gives a complete, faithful copy of any conversation on Claude, ChatGPT, Grok, Gemini and Microsoft Copilot.

Complete means every message, not the part the site happens to draw on screen. Faithful means the parts that make a modern chat useful come along: tool steps, web searches and their sources, images, files, and which model answered.

Every export says how many messages it holds and whether that is all of them.

---

## 2. What the live check found (November 15, 2026)

The check ran in Nikhil's Chrome through Claude in Chrome, read-only, on his signed-in accounts. Counts only below; no chat content.

### 2.1 Copier 0.4.0 today

| Platform | Result today | Why |
|---|---|---|
| Claude | Full thread, but noisy and incomplete | Tool steps arrive as a placeholder line ("This block is not supported on your current device yet"): 497 of them in one chat. Tool calls, sources, images, files and compaction summaries are dropped. The ZIP file list returns 404 on newer chats, so the ZIP quietly becomes a plain Markdown file. |
| ChatGPT | 0 messages | ChatGPT replaced its page structure. Copier's selectors match nothing. |
| Grok | Replies only, none of the user's messages | The user-message test (`items-end` class) no longer matches. Toolbar injection fails; floating buttons show instead. |
| Gemini | Every message labeled as Gemini; older turns missing | Role detection fails. Gemini loads the latest 10 turns and older ones only on scroll. |
| M365 Copilot | 14 of 26 messages (work account), 14 of 18 (personal account) | The page draws a window of about 8 to 18 messages and swaps them on scroll. |
| Consumer Copilot | Copier does not run | copilot.microsoft.com now redirects to copilot.com. M365 Copilot also answers on copilot.cloud.microsoft. Neither new host is in the manifest. |

### 2.2 The common cause

Four of the five sites now draw only part of a long chat. ChatGPT drew 1 exchange of a 457-message chat. Claude drew about 4 turns of 121. Reading the page cannot produce a complete export on these sites.

Grok was not tested on a long chat: the account has one 6-message chat.

### 2.3 What each site loads behind the page

| Platform | Data source found | Verified |
|---|---|---|
| Claude | `GET /api/organizations/{org}/chat_conversations/{id}?tree=True&rendering_mode=messages&render_all_tools=true` | Full thread, all block types. Without `render_all_tools=true` the tool blocks come back as the placeholder text. |
| ChatGPT | `GET /backend-api/conversation/{id}` with a Bearer token from `GET /api/auth/session` | Full message tree (612 nodes in one chat). |
| Grok | `GET /rest/app-chat/conversations/{id}/response-node?includeThreads=true`, then `POST .../load-responses` with the response ids | Full thread with sources, X posts, image and file fields. |
| Gemini | `POST /_/BardChatUi/data/batchexecute`, rpc `hNvQHb` | Page size 100 returned all 11 turns where the page first drew 10. Returns a token for further pages. |
| M365 Copilot | None reachable from the page | No page-level call carries chat data on either account type (likely a worker). |

Copilot labels each message with `aria-posinset` (its position) and `aria-setsize` (the chat's total). Step-scrolling the chat and collecting by position got 26 of 26 and 18 of 18.

### 2.4 Content Copier drops today (Claude, 40 recent chats)

| Block type | Count | Exported today |
|---|---|---|
| text | 5,127 | Yes |
| thinking | 4,674 | Summary only (see 4.1) |
| tool_use | 7,605 | No |
| tool_result | 7,604 | No |
| image | 100 | No |

### 2.5 Facts that shape the design

- Claude's own web page moved to a binary protobuf service (`claudeai-rpc/.../ConversationService/StreamTimeline`). The REST endpoint above still returns everything. Copier stays on REST (section 13, risk 2).
- Claude now hides full thinking text (`thinking_hidden`). Only summaries come back for recent chats.
- Claude's file list endpoint (`wiggle/list-files`) works on older chats only. `GET /api/organizations/{org}/files/{file_uuid}/contents` downloads any file attached to a message: images, PDFs and files Claude delivered. Byte counts matched the recorded sizes.
- ChatGPT text carries private-use citation markers (`U+E200 cite U+E202 turn...search0 U+E201`): 2,895 marker characters across 160 messages in Nikhil's chats.
- ChatGPT files resolve through `GET /backend-api/files/download/{id}?conversation_id={cid}`, which returns a same-origin `download_url`. Byte counts matched.
- Gemini's request parameters (`SNlM0e`, `cfb2h`, `FdrFJe`) sit in an inline script on the page. A content script can read them from the DOM; it cannot read the page's JavaScript globals.
- Gemini returns turns newest first and as positional arrays.
- Claude picks the organization with `data[0]`. Nikhil's account has two (chat and API). The `lastActiveOrg` cookie names the active one.
- Chats where Claude worked on Nikhil's Mac (the remote-device tools, Bash, Edit) are in the same claude.ai data. A claude.ai export covers them.

---

## 3. Design decisions

### 3.1 Read the conversation data, not the page

Each platform gets an adapter that reads the site's own conversation data, the way the page itself does. Page reading stays only as a fallback, and an export made that way says so.

Copilot is the exception: no data source is reachable. Its adapter scrolls the chat and collects messages by position (section 4.5).

### 3.2 One conversation model

Every adapter returns the same shape. The writers (Markdown, ZIP) never know which site it came from.

```
Conversation {
  platform, title, url, id, exportedAt, models[],
  messages: [ Message ],
  files: [ FileRef ],
  completeness: { got, expected, method, note }
}

Message { role: 'user' | 'assistant', createdAt, model, blocks: [ Block ] }

Block =
  { type: 'text', text, sources: [ { title, url } ] }
  { type: 'thinking', summary, text }
  { type: 'tool', name, input, output, isError }
  { type: 'image', file }            // FileRef
  { type: 'file', file }             // FileRef
  { type: 'summary', text }          // Claude compaction summary

FileRef { name, mime, size, from: 'user' | 'assistant', fetch() }
```

`method` is one of `data` (read from the site's data), `scroll` (Copilot collection), or `page` (fallback). `expected` is null when the site gives no total.

### 3.3 Completeness in every export

The export header and the toast both carry the count:

- `281 messages, complete (read from Claude's conversation data)`
- `26 of 26 messages, complete (collected from the page by scrolling)`
- `14 messages, may be partial (read from the page; Claude's data could not be read: HTTP 401)`

No silent fallbacks. A fallback always names its reason.

### 3.4 Formats

- **Copy:** Markdown to the clipboard. All platforms.
- **Download:** a Markdown file. All platforms.
- **Export:** a ZIP with `conversation.md`, plus `uploads/` (files from the user) and `artifacts/` (files from the AI). All platforms where files exist.

Markdown is the one format. It reads well in any editor and feeds straight into Claude Code. The styled HTML export goes away (open question 1).

### 3.5 What an export holds

Nothing is trimmed. Long tool outputs stay whole (Nikhil's rule: more information beats less).

- **Header:** title, platform, link, export time with timezone, models seen, the completeness line.
- **Messages:** `## You` or `## {Platform}` with the time sent and, where known, the model.
- **Text:** as the site wrote it (Markdown on every data source).
- **Sources:** numbered markers in the text, a `Sources` list after the message with title and link.
- **Thinking:** a quoted block with the summary, then the full text when the site provides it.
- **Tool steps:** one collapsible block each, in order, with the tool name, its input and its output:

  ```
  <details><summary>Tool: web_search</summary>

  Input: ...
  Output: ...

  </details>
  ```

  Fences around inputs and outputs are made longer than any backtick run inside them, so tool output that contains code fences cannot break the file.
- **Images and files:** a link to the file inside the ZIP. In Copy and Download, a line naming the file.
- **Compaction summaries:** a marked section where Claude compacted the chat, holding the summary text.
- **Claude in-chat artifacts (older style):** the final version of each artifact saved as a file in the ZIP, linked where it was created.

### 3.6 Entry points

- **Claude:** buttons in the message toolbar, cloned from a live toolbar button (works today).
- **Other sites:** a small floating cluster, shown only on conversation pages.
- **Toolbar popup (new):** clicking the Copier icon opens Copy, Download and Export. It works even when a site change breaks the in-page buttons. The popup does the clipboard write itself, because the page loses focus when the popup opens.
- **Shortcuts:** Cmd/Ctrl+Shift+C (copy) and Cmd/Ctrl+Shift+D (download), as today.

Buttons no longer appear on non-conversation pages (today they show on Claude's Recents page and Google search).

### 3.7 Long operations

Copilot collection and file downloads show the existing progress modal with Cancel. The page's scroll position is restored afterwards.

---

## 4. Platform adapters

Each adapter has two parts: a fetch step that talks to the site, and a pure parse step (data in, Conversation out). Parse steps are what the unit tests cover.

Each parse step checks the fields it relies on. A missing or wrong-typed field raises a format error. The adapter then falls back to page reading and the export names the reason.

### 4.1 Claude

- **Organization:** the `lastActiveOrg` cookie, confirmed against `GET /api/organizations` (must list the `chat` capability). Otherwise the first org with `chat`.
- **Conversation:** the endpoint in 2.3, with `render_all_tools=true`.
- **Active branch:** walk from `current_leaf_message_uuid` up `parent_message_uuid` (as 0.4.0 does). Fall back to `index` order when the leaf is missing.
- **Title:** `name` from the data. The page title is the fallback.
- **Blocks:**
  - `text` with `citations` (`url`, `title`, `start_index`, `end_index`): a marker goes in at `end_index`, and the source joins the message's list.
  - `thinking`: the last summary, plus `thinking` text when present.
  - `tool_use` and `tool_result`: paired by `tool_use_id` into one tool block. `display_content` and `structured_content` are used when `content` is empty.
  - `image`: resolved through the message's `files` by `file_uuid`.
  - `compaction_summary` on a message: a summary block.
- **Files:**
  - `files` on each message (kinds `image`, `document`, `blob`): `GET /api/organizations/{org}/files/{file_uuid}/contents`. `from` follows the message sender.
  - `attachments` with `extracted_content` (pasted text): saved as a text file in `uploads/`.
  - `wiggle/list-files` for older chats, merged by path with the above.
  - Older `artifacts` tool calls (`create`, `update`, `rewrite` with `content`): replayed per artifact `id` to its final version and saved in `artifacts/`.
  - Newer `Artifact` tool results that carry a claude.ai artifact link: kept as a link.
- **Model:** `model` on the conversation (the data has no per-message model).

### 4.2 ChatGPT

- **Token:** `GET /api/auth/session` returns `accessToken`. Held in memory for the export only. Never stored, logged or sent anywhere but chatgpt.com.
- **Conversation:** `GET /backend-api/conversation/{id}`.
- **Active branch:** walk from `current_node` up `parent`.
- **Skipped:** system messages and messages with `is_visually_hidden_from_conversation`.
- **Mapping by `content_type`:**
  - `text`: text.
  - `multimodal_text`: text parts plus `image_asset_pointer` parts as images.
  - `code` (a tool call, tool named by `recipient`) and the following `tool` role messages (`execution_output`, `tether_browsing_display`, others): tool blocks.
  - `thoughts`: thinking blocks from each item's `summary` and `content`.
  - `reasoning_recap`: a one-line note on the thinking block ("Thought for 12s").
- **Citations:** each `content_references` entry with `matched_text` is replaced in the text:
  - `grouped_webpages`, `url`, `sources_footnote`: a numbered marker, sources listed after the message.
  - `hidden`: removed.
  - anything else: its `alt` text when present, else removed.
  - A last pass strips any remaining characters in U+E200 to U+E2FF.
- **Files:** `sediment://` and `file-service://` pointers and `metadata.attachments`, through `GET /backend-api/files/download/{id}?conversation_id={cid}`, then the returned `download_url`.
- **Model:** `metadata.model_slug` per message.
- **Time:** `create_time` (seconds) per message.

### 4.3 Grok

- **Conversation:** `GET /rest/app-chat/conversations/{id}/response-node?includeThreads=true` gives the nodes (`responseId`, `sender`, `parentResponseId`).
- **Active branch:** the `rid` query parameter in the page URL names the current leaf. Without it, the newest leaf by `createTime`. Walk parents to the root.
- **Content:** `POST /rest/app-chat/conversations/{id}/load-responses` with `{ responseIds }`.
- **Mapping:** `message` as text. `webSearchResults`, `citedWebSearchResults` and `xposts` as sources. `generatedImageUrls`, `imageAttachments` and `fileAttachments` as files. `steps` and `toolResponses` as tool blocks. `model` per response. `createTime` per response.
- **To confirm at build:** thinking fields and file download routes. The one available chat has none of these. Files on another host that refuse a cross-origin fetch become links.

### 4.4 Gemini

- **Parameters:** `at` from `SNlM0e`, `bl` from `cfb2h`, `f.sid` from `FdrFJe`, read from the page's inline script text.
- **Request:** `rpcids=hNvQHb`, `f.req = [[["hNvQHb", JSON.stringify(["c_" + id, 100, pageToken, 1, [0], [4, 12], null, 1]), null, "generic"]]]`. Repeat with the returned token until none comes back.
- **Parse:** the response line starting `[["wrb.fr"`, then its third element as JSON. Turns arrive newest first; they are reversed.
- **Positions (verified on two chats):** user text at `turn[2][0][0]`, answer text at `turn[3][0][0][1][0]`, time at `turn[4][0]` (seconds).
- **To confirm at build:** thinking (slot 37 of the answer candidate holds up to 10,000 characters per answer), sources (slot 2), images and uploads.
- **Guard:** if the positions do not hold strings, the adapter falls back to page reading. That fallback scrolls up until Gemini stops loading older turns.

### 4.5 Microsoft Copilot

Hosts: `m365.cloud.microsoft`, `copilot.cloud.microsoft`, `copilot.microsoft.com`, `copilot.com`.

- **Collection:**
  1. Remember the scroll position.
  2. Step up through the chat (scroll by part of a screen, wait, collect) until the top stops changing.
  3. Step down to the bottom, collecting.
  4. Restore the scroll position.
- **Keys:** `aria-posinset` for labeled messages. Unlabeled messages (one chat had a first message with no label) are kept in page order next to their labeled neighbors.
- **Completeness:** expected is `aria-setsize`. Unlabeled messages are counted on top and named in the note.
- **Content:** user messages from `div.fai-UserMessage` text. Answers from `[data-testid="markdown-reply"]` HTML, converted to Markdown (open question 3).
- **Limits:** a step cap and a time cap end the collection. The export then says how many it got of how many.
- **Consumer Copilot (copilot.com):** untested. Nikhil's browser routes it to the work account. It ships behind the same adapter if it uses the same app, and is marked untested in the store listing until checked.

---

## 5. File layout

```
extensions/conversation-copier/
  manifest.json
  content.js            UI: buttons, popup messages, modal, toasts, clipboard, downloads, ZIP
  core/model.js         Conversation helpers, format errors
  core/markdown.js      Conversation to Markdown
  platforms/claude.js
  platforms/chatgpt.js
  platforms/grok.js
  platforms/gemini.js
  platforms/copilot.js
  popup/popup.html, popup/popup.js
  lib/jszip.min.js      (vendored, as today)
  lib/turndown.js, lib/turndown-plugin-gfm.js   (vendored, if open question 3 is yes)
  test/                 node test runner, synthetic fixtures
  probe/                live-check script and how to run it
  docs/spec.md, docs/reviews/
```

No build step, as today. Files load in manifest order and register on one shared object. `window.RecurateExtractor` stays, now returning the Conversation model. The copies of the old extractor in aicc-platform and claude-chat-archive are archived copies and do not load this file.

---

## 6. Manifest, permissions and the store

- **Hosts added:** `copilot.com`, `copilot.cloud.microsoft`.
- **Host removed:** `www.google.com` (Google AI Mode), if open question 2 is yes.
- **New key:** `action` with the popup. It adds no permission warning.
- **No new API permissions.** All requests are same-origin from the content script, as the Claude calls are today.
- **Existing users:** adding hosts disables the extension after the auto-update until each user approves the new sites. Chrome's guidance names a content script on a new host as a trigger. Chrome's Extension Update Testing Tool confirms this for the final manifest before upload. Accepted as the cost of covering Copilot.
- **Store listing:** rewritten for 1.0 (five platforms, full threads, files, sources). The host justification names each site and states that requests go only to that site with the user's own session, and nothing leaves the browser.

---

## 7. Security and privacy

- Requests go only to the site the user is on. No other host, no analytics, no backend.
- The ChatGPT token lives in memory for one export.
- File names from the sites are cleaned before they enter the ZIP: path separators and `..` removed, length capped, duplicates numbered. No ZIP entry can escape its folder.
- Markdown output holds the site's own text. No HTML is generated for viewing, so no script can run from an export.
- Test fixtures are synthetic. They copy field shapes, never content from anyone's chats.
- Docs and commits carry counts only.

---

## 8. Testing

- **Unit (`node --test`, no new dependency):** each parse step against synthetic fixtures. Covers branch walking, block mapping, tool pairing, Claude citation positions, ChatGPT marker replacement, Gemini reversal and page merging, Copilot dedupe and completeness, fence lengths, file name cleaning, and the Markdown writer.
- **Live, during the build:** each adapter's code injected into the live page through Claude in Chrome, run against Nikhil's chats, and compared with the data's own message count.
- **Live, before release:** Nikhil loads the unpacked build once, with the store version turned off. Every entry point on every site is checked in the installed extension. Injected code runs in the page's world, so this pass is what proves the content-script world works.
- **Old versus new:** the same chats exported with 0.4.0 and 1.0, counts compared and recorded.
- **Probe script:** `probe/` holds the live check as a script plus how to run it through Claude in Chrome. When a site changes, the rerun shows what broke.

---

## 9. Build steps

Each becomes a CenterEye task with this "done means".

1. **Core:** the model, the Markdown writer, file name cleaning, tests.
2. **Claude adapter:** data, files, artifacts, citations, compaction, org pick, tests, live check.
3. **ChatGPT adapter:** tests, live check.
4. **Grok adapter:** tests, live check.
5. **Gemini adapter:** decode thinking, sources and images, tests, live check.
6. **Copilot adapter:** scroll collection, HTML to Markdown, tests, live check on both account types.
7. **UI:** toolbar buttons, floating cluster on conversation pages only, popup, shortcuts, modal, ZIP.
8. **Probe and proof:** probe script, old versus new comparison, unpacked-build pass.
9. **Breaker pass:** a separate agent attacks the finished code. Findings fixed with tests.
10. **Release prep:** version 1.0.0, manifest, update testing tool, store listing, screenshots, CHANGELOG, CURRENT_STATE, NOW, README, ZIP. The store upload waits for Nikhil's go.

---

## 10. Not in this version

- AI-written content inside an export (a summary, a title). It needs a model call and a key. Copier stays with no backend.
- Exporting many chats at once. The data sources make it possible; a candidate for the next version.
- All branches of a chat. The active branch only, as today.
- Claude Code sessions at claude.ai/code and Claude in Chrome side-panel chats. Not probed.
- Google AI Mode (if open question 2 is yes).

---

## 11. Open questions for Nikhil

1. **Markdown only?** Lean: yes. Drop the styled HTML export on ChatGPT, Grok, Gemini and Copilot. Keeping HTML means rendering Markdown to HTML ourselves, which needs a renderer and a sanitizer (two more vendored libraries) and an XSS surface.
2. **Drop Google AI Mode?** Lean: yes. It is shelved since July (Chrome routes it to a page extensions cannot reach). Today the content script runs on every google.com page and shows floating buttons on ordinary searches.
3. **Vendor Turndown for Copilot?** Lean: yes. Copilot only gives rendered HTML. Turndown (MIT, about 30 KB with its tables plugin) converts it to Markdown, including tables and nested lists. The same converter serves every page-reading fallback. Vendored like JSZip, no remote code.

---

## 12. Decided in this spec (Nikhil can overturn)

- Version 1.0.0.
- Toolbar popup added.
- Tool steps exported whole, in collapsible blocks.
- Existing users' one-time re-approval prompt accepted.
- Spec and reviews live in this folder, off the recurate.ai site (Nikhil, November 15).

---

## 13. Risks

1. **Every data source is private and undocumented.** Any site can change it overnight. Format checks turn a change into a labeled fallback instead of a silent bad export. The probe script finds what changed.
2. **Claude's REST endpoint may retire.** Claude's own page no longer uses it. If it goes, Claude exports fall back to page reading (about 4 turns) until an adapter for the new service is built.
3. **Gemini's positional arrays** move when Google ships a new client. The guard catches it; the fix is new positions.
4. **Copilot collection depends on `aria-posinset` and `aria-setsize`** and on scroll loading. Without the labels the export still works and says it cannot confirm completeness.
5. **Store review** may take longer for broader host access. The listing states the single purpose and that nothing leaves the browser.
6. **Existing users** see the extension turned off until they approve the new sites.
