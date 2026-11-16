# Recurate Copier 1.0: Spec

**Status:** Draft v2. Independent review answered (`reviews/2026-11-15-spec-review.md`, 27 findings). Waiting on Nikhil's rulings (section 11).  
**Date:** November 15, 2026  
**Task:** CenterEye #530 (recurate area)  
**Replaces:** Copier 0.4.0 (July 11, 2026)

---

## 1. Goal

One click gives a complete, faithful copy of any conversation on Claude, ChatGPT, Grok, Gemini and Microsoft 365 Copilot.

Complete means every message, not the part the site happens to draw on screen. Faithful means the parts that make a modern chat useful come along: tool steps, web searches and their sources, images, files, and which model answered.

Every export says how many messages it holds, whether that is all of them, which files failed, and what it could not include.

---

## 2. What the live checks found (November 15, 2026)

The checks ran in Nikhil's Chrome through Claude in Chrome, read-only, on his signed-in accounts. Counts only below; no chat content.

### 2.1 Copier 0.4.0 today

| Platform | Result today | Why |
|---|---|---|
| Claude | Full thread, but noisy and incomplete | Tool steps arrive as a placeholder line ("This block is not supported on your current device yet"): 497 of them in one chat. Tool calls, sources, images, files and compaction summaries are dropped. The ZIP file list returns 404 on newer chats, so the ZIP quietly becomes a plain Markdown file. |
| ChatGPT | 0 messages | ChatGPT replaced its page structure. Copier's selectors match nothing. |
| Grok | Replies only, none of the user's messages | The user-message test (`items-end` class) no longer matches. Toolbar injection fails; floating buttons show instead. |
| Gemini | Every message labeled as Gemini; older turns missing | Role detection fails. Gemini loads the latest 10 turns and older ones only on scroll. |
| M365 Copilot | 14 of 26 messages (work account), 14 of 18 (personal account) | The page draws a window of messages and swaps them on scroll. |
| Consumer Copilot | Copier does not run | copilot.microsoft.com redirects to copilot.com. M365 Copilot also answers on copilot.cloud.microsoft. Neither new host is in the manifest. |

### 2.2 The common cause

Four of the five sites now draw only part of a long chat. ChatGPT drew 1 exchange of a 457-message chat. Claude drew about 4 turns of 121. Reading the page cannot produce a complete export on these sites.

Grok was not tested on a long chat: the account has one 6-message chat.

### 2.3 What each site loads behind the page

| Platform | Data source | Verified |
|---|---|---|
| Claude | `GET /api/organizations/{org}/chat_conversations/{id}?tree=True&rendering_mode=messages&render_all_tools=true` | Full thread, all block types. Without `render_all_tools=true` tool blocks come back as placeholder text. |
| ChatGPT | `GET /backend-api/conversation/{id}` with a Bearer token from `GET /api/auth/session` | Full message tree (612 nodes in one chat). |
| Grok | `GET /rest/app-chat/conversations/{id}/response-node?includeThreads=true`, then `POST .../load-responses` with the response ids | Full thread with sources, X posts, image and file fields. |
| Gemini | `POST /_/BardChatUi/data/batchexecute`, rpc `hNvQHb` | Paging forced with page size 10 on an 11-turn chat: page one held 10 turns and a cursor, page two the last turn and no cursor. Page size 100 held all 11 and no cursor. |
| M365 Copilot | None reachable from the page | No page-level call carries chat data on either account type (likely a worker). |

Copilot labels each message with `aria-posinset` (its position) and `aria-setsize` (the chat's total). Step-scrolling the chat and collecting by position got 26 of 26 and 18 of 18.

### 2.4 Content Copier drops today (Claude, 40 recent chats)

| Block type | Count | Exported today |
|---|---|---|
| text | 5,127 | Yes |
| thinking | 4,674 | Summary only (2.5) |
| tool_use | 7,605 | No |
| tool_result | 7,604 | No |
| image | 100 | No |

### 2.5 Facts that shape the design

**Claude**
- Claude's own web page moved to a binary protobuf service (`claudeai-rpc/.../ConversationService/StreamTimeline`). The REST endpoint still returns everything. Copier stays on REST (risk 2).
- Full thinking text is hidden on recent chats (`thinking_hidden`). Only summaries come back.
- Every active branch (60 of 60 chats) ends at a parent id that is not in the message list and begins `00000000`.
- Tool calls and their results always sat in the same message (60 chats; 1 call with no result, no orphan results).
- Tool-result parts: `text` (10,433), `knowledge` web results with title and url (4,388), `image` as file references, never base64 (397), `local_resource` delivered files (115), `image_gallery` (9).
- `wiggle/list-files` works on older chats only. `GET /api/organizations/{org}/files/{file_uuid}/contents` downloads any message file. Byte counts matched.
- 0.4.0 picks the organization with `data[0]`. The `lastActiveOrg` cookie names the active one and is readable from `document.cookie`.
- Chats where Claude worked on Nikhil's Mac (remote-device tools, Bash, Edit) are in the same claude.ai data.

**ChatGPT**
- Every tree starts at a node with a null parent and a null message (22 of 22 chats).
- Text carries private-use citation markers (`U+E200 cite U+E202 turn...search0 U+E201`): 2,895 marker characters across 160 messages.
- Reference indexes count code points, not UTF-16 units. Where an emoji came before a reference (34 cases), the code-point slice matched `matched_text` 30 times and the UTF-16 slice 0 times.
- `alt` is present on every `entity`, `grouped_webpages`, `url` and `image_group` reference, and absent on every `file`, `sources_footnote`, `client_defined_widget`, `dil` and `hidden` reference.
- 260 assistant nodes addressed to a tool carry `text` content. Tool calls must be told apart by `recipient`, not `content_type`.
- The hidden flag sits on 78 tool outputs, 2 assistant text nodes and 1 thinking node.
- Files resolve through `GET /backend-api/files/download/{id}?conversation_id={cid}`, which returns a same-origin `download_url`. Byte counts matched.
- ChatGPT's shortcut list has Control+Shift+D (dictation). It has no Command/Control+Shift+C.

**Grok**
- The first node's parent id is a UUID that is not in the node set.
- After load, the page URL carries `rid`, which names the leaf of the branch on screen.

**Gemini**
- Request parameters (`SNlM0e`, `cfb2h`, `FdrFJe`) sit in an inline script. A content script can read them from the DOM.
- Turns arrive newest first as positional arrays. `turn[0]` holds `c_` and `r_` ids, `turn[1]` holds `c_`, `r_` and `rc_`, and the answer candidate starts with an `rc_` id.

**Copilot**
- One chat had a first message with no position label: setsize said 7, there were 8 messages.
- Consumer Copilot (copilot.com) uses a different app from M365 Copilot (0.4.0 already had separate selectors). Nikhil's browser routes copilot.com to the work account, so it was not probed.

---

## 3. Design decisions

### 3.1 Read the conversation data, not the page

Claude, ChatGPT, Grok and Gemini are read only from the site's own conversation data. There is no automatic page fallback: on those sites the page holds a fragment of a long chat, and 0.4.0's page readers are what broke.

When the data cannot be read, the export stops and says why, for example "Could not read ChatGPT's conversation data: HTTP 401. Nothing was copied."

Copilot has no reachable data source. Its adapter collects messages from the page by scrolling (4.5).

### 3.2 One conversation model

Every adapter returns the same plain-data shape. The writers never know which site it came from.

```
Conversation {
  platform, title, url, id, exportedAt,
  modelNote,                       // e.g. "Model setting at export: claude-opus-5-5"
  messages: [ Message ],
  files: [ FileRef ],
  completeness: {
    messages: { got, expected, complete, rule },
    files: { got, failed: [ { name, reason } ] },
    notIncluded: [ text ],          // content this adapter does not read
    notes: [ text ]                 // unsupported blocks, unmatched markers, branch warning
  }
}

Message { role: 'user' | 'assistant', n, createdAt, model, blocks: [ Block ] }

Block =
  { type: 'text', text, sources: [ { title, url } ] }
  { type: 'thinking', summary, text, hiddenInSite }
  { type: 'tool', name, input, output: [ OutputPart ], isError, noResult }
  { type: 'image', file }            // FileRef
  { type: 'file', file, inlineText } // inlineText for pasted text
  { type: 'summary', text }          // Claude compaction summary
  { type: 'unsupported', siteType, strings: [ text ] }

FileRef { kind, id, name, mime, size, from: 'user' | 'assistant' }   // a descriptor; the fetch step resolves it
```

Two error classes:
- **Structural** (no message list, no ids or parent links, wrong top-level type): the export stops with the reason.
- **Unknown content** (a block, part or content type not in the mapping): an `unsupported` block naming the type and keeping any strings inside it. It is counted in `notes`. A message is never dropped for being empty.

### 3.3 Completeness

"Messages" means user turns plus assistant turns, on every platform. Consecutive assistant and tool entries between two user messages are one assistant turn.

| Platform | "Complete" means |
|---|---|
| Claude | The walk from the leaf reached a parent id beginning `00000000` that is not in the list, with no missing parent on the way. |
| ChatGPT | The walk reached the node with a null parent and a null message. |
| Grok | The walk ended at the one node whose parent is absent from the node set. |
| Gemini | The last page came back with no cursor. Gemini gives no total. |
| Copilot | Positions 1 to setsize were all collected. Unlabeled messages are counted on top and noted. |

The header and toast print the result:

- `281 messages, complete (read from Claude's conversation data)`
- `22 messages (all pages read; Gemini gives no total)`
- `26 of 26 messages, complete (collected from the page by scrolling)`
- `Files: 37 of 40 downloaded. 3 failed (listed below).`
- `Not included: Copilot sources and images.`

Anything that fails a rule prints "may be partial" with the reason.

### 3.4 Formats

- **Copy:** Markdown to the clipboard.
- **Download:** a Markdown file.
- **Export:** always a ZIP: `conversation.md`, `uploads/` (files from the user), `artifacts/` (files from the AI). With no files, the ZIP holds the Markdown alone and the toast says "no files in this chat" or why the file list failed.

Markdown is the one format (open question 1).

### 3.5 What an export holds

Nothing is trimmed. Long tool outputs stay whole.

- **Header:** title, platform, link, export time with timezone, the model note, the completeness lines.
- **Message headings:** numbered, with the time: `## 12. You · 14:02` and `## 13. ChatGPT · 14:02 · gpt-6` (model only where the site records it per message).
- **Text:** as the site wrote it.
- **Sources:** numbered markers in the text, then a `Sources` list after the message (title and link).
- **Thinking:** a quoted block with the summary, then the full text when the site provides it. Thinking the site hides in its UI is labeled so.
- **Tool steps:** one collapsible block each, in order:

  ```
  <details><summary>Tool: web_search</summary>

  Input: (pretty-printed JSON, fenced)
  Output: (parts, below)

  </details>
  ```

  Output parts: text as fenced text; web results as a link list; images as files; image search results as plain links; other structured parts as pretty-printed JSON. A display-only form is used only when nothing else exists. Fences are longer than any backtick run inside them. A call with no result says "(no result recorded)".
- **Pasted text:** inline under the user message in all three formats, fenced and named. In the ZIP it is also saved to `uploads/`.
- **Images and files:** in the ZIP, a link to the file. In Copy and Download, a line naming the file. Link targets use angle brackets (`<uploads/Q3 report (final).pdf>`).
- **Failed files:** a line where the file belongs: "report.pdf could not be downloaded: HTTP 403".
- **Files on another host:** a content-script fetch to another origin follows the page's CORS rules. If it fails, the file is a failed file with that reason. Signed or download URLs are never written into an export. Remote images are plain links, never embeds.
- **Compaction summaries:** a marked section holding the summary text.
- **Claude in-chat artifacts (older style):** the final version of each, saved in `artifacts/` and linked where it was created.

### 3.6 Entry points

- **Claude:** buttons in the message toolbar, cloned from a live toolbar button (works today).
- **ChatGPT, Grok, Gemini, M365 Copilot:** a small floating cluster, shown only on conversation pages.
- **Toolbar popup (new):** Copy, Download and Export. It works when in-page buttons break, on tabs opened before the update, and on copilot.cloud.microsoft (section 6).
  - The popup sends `{ action: 'copy' | 'download' | 'export' }` to the tab.
  - The reply is `{ ok, markdown?, summary, error? }`, where `summary` holds the completeness lines.
  - If the tab does not answer, the popup checks the URL is a supported conversation page, injects the scripts with `chrome.scripting` under `activeTab`, and retries once.
  - For Copy, the popup writes the clipboard itself (the page loses focus when the popup opens) and shows its own progress and Cancel.
  - If the popup closes mid-run, the page finishes the work and shows a toast with a Copy button.
- **Clipboard failures anywhere:** keep the text and show a toast with a Copy button. A fresh click gives focus and user activation.
- **Keyboard:** the in-page shortcuts go (Control+Shift+D is ChatGPT's dictation key). A manifest `commands` entry for `_execute_action` opens the popup, suggested Alt+Shift+C, rebindable at chrome://extensions/shortcuts.

Buttons no longer appear on non-conversation pages.

### 3.7 Long operations

Copilot collection and file downloads show the progress modal with Cancel. Copilot collection pauses when the tab is hidden and tells the user. The page's scroll position is restored afterwards.

### 3.8 Screen check

After the data is read, the normalized text prefix of the last message on screen is compared with the last exported message. A mismatch adds "the exported branch may differ from the one on screen" to the notes. This catches a wrong branch choice, which a message count cannot.

---

## 4. Platform adapters

Each adapter has three parts:
- `conversationRef(location)`: the conversation id and its context from the URL. Unit-tested over every URL form.
- A fetch step that talks to the site and resolves FileRefs.
- A pure parse step: plain data in, a Conversation out. This is what the unit tests cover.

### 4.1 Claude

- **URL:** `/chat/{id}`.
- **Organization:** the `lastActiveOrg` cookie, confirmed against `GET /api/organizations` (must list `chat`). On a 403 or 404, try the other chat-capable orgs before failing.
- **Conversation:** the endpoint in 2.3, with `render_all_tools=true`.
- **Active branch:** walk from `current_leaf_message_uuid` up `parent_message_uuid`. With no leaf, walk from the newest message by `created_at` and note it.
- **Title:** `name` from the data.
- **Blocks:**
  - `text` with `citations`: a marker at `end_index`, read as a code-point index (unverified on Claude, see risk 7), inserted from the highest index down, moved to the end of a word or code span it lands inside.
  - `thinking`: the last summary, plus `thinking` text when present.
  - `tool_use` and `tool_result`: paired by `tool_use_id` across the active branch. Output parts as in 3.5. A human message holding only tool results folds into the assistant turn before it.
  - `image`: resolved through the message's `files` by `file_uuid`.
  - `compaction_summary`: a summary block.
- **Files:**
  - `files` on each message: `GET /api/organizations/{org}/files/{file_uuid}/contents`.
  - `attachments` with `extracted_content`: inline text plus a file in `uploads/`.
  - `wiggle/list-files` for older chats.
  - Merge: on uuid where both sides have one, else name plus size, else keep both with a note.
  - Older `artifacts` tool calls, active branch only: `create` and `rewrite` replace the content; `update` applies `old_str` to `new_str` once, with a note when it cannot. The final version per `id` goes in `artifacts/`.
  - Newer `Artifact` tool results with a claude.ai artifact link: kept as a link.
- **Model:** none per message. The header gets "Model setting at export".

### 4.2 ChatGPT

- **URL:** the id after `/c/` (covers `/c/{id}` and `/g/{gpt-or-project}/c/{id}`).
- **Token:** `GET /api/auth/session`, `accessToken`. In memory for one export; never stored, logged or sent anywhere but chatgpt.com.
- **Conversation:** `GET /backend-api/conversation/{id}`.
- **Active branch:** walk from `current_node` up `parent`.
- **Classification, in order:**
  1. `system` role: skipped.
  2. `user` role: a user turn.
  3. `assistant` with a `recipient` other than `all`: a tool call (input is the content, whatever its `content_type`).
  4. `tool` role: the output of the preceding call.
  5. `assistant` to `all`: by `content_type`: `text`, `multimodal_text` (text plus images), `thoughts` (thinking from each item's `summary` and `content`), `reasoning_recap` (a note on the thinking block).
  6. Anything else: an `unsupported` block.
- **Hidden nodes:** kept, labeled "hidden in ChatGPT".
- **Turns:** all non-user nodes between two user messages form one assistant turn.
- **Citations:** each `content_references` entry with `matched_text`:
  - Located by code-point `start_idx` and `end_idx`, after checking the slice equals `matched_text`; otherwise found by searching for `matched_text` from the end. Replaced from the end of the text backwards, with a replacer function.
  - `grouped_webpages`, `url`: a numbered marker; sources listed after the message. `sources_footnote`: feeds the same list.
  - `entity`, `image_group`, `alt_text`: the `alt` text.
  - `file`: `[file: name]`.
  - `hidden`: removed.
  - `client_defined_widget`, `dil`, other types: an inline placeholder naming the type, counted in `notes`.
  - A last pass removes any whole U+E200 to U+E201 sequence still present; each one is counted in `notes`.
- **Files:** `sediment://` and `file-service://` pointers and `metadata.attachments`, through `GET /backend-api/files/download/{id}?conversation_id={cid}`, then `download_url`.
- **Model and time:** `metadata.model_slug` and `create_time` per message.
- **Workspaces:** untested (no workspace account). A 404 reports the reason.

### 4.3 Grok

- **URL:** `/c/{id}`; the `rid` query parameter names the leaf.
- **Conversation:** `response-node?includeThreads=true` gives the nodes.
- **Active branch:** from `rid`; without it, the newest leaf by `createTime`, with a note. Walk parents to the root.
- **Content:** `load-responses` with `{ responseIds }`, in batches (the accepted batch size is checked at build).
- **Mapping:** `message` as text; `webSearchResults`, `citedWebSearchResults` and `xposts` as sources; `generatedImageUrls`, `imageAttachments` and `fileAttachments` as files; `steps` and `toolResponses` as tool blocks; `model` and `createTime` per response.
- **To confirm at build:** thinking fields and file routes. Until confirmed, they are listed in `notIncluded`.

### 4.4 Gemini

- **URL:** the conversation id is the last path segment. The path prefix before `/app` or `/gem` (for example `/u/1`) is kept and used for the request path.
- **Parameters:** `at` from `SNlM0e`, `bl` from `cfb2h`, `f.sid` from `FdrFJe`, read from inline script text.
- **Request:** `rpcids=hNvQHb`, `f.req = [[["hNvQHb", JSON.stringify(["c_" + id, 100, cursor, 1, [0], [4, 12], null, 1]), null, "generic"]]]`.
- **Paging:** the cursor is `data[1]`. Stop on no cursor, a repeated cursor, an empty page or a page cap. Dedupe by response id, join, then reverse once.
- **Positions:** user text `turn[2][0][0]`, answer text = every string in `turn[3][0][0][1]` joined, time `turn[4][0]`.
- **Guard:** `turn[0][0]` starts `c_`, `turn[0][1]` starts `r_`, `turn[1][2]` and the candidate's first element start `rc_`, and the time is a number in a sane range. Any failure is a structural error.
- **To confirm at build:** thinking (candidate slot 37), sources (slot 2), images and uploads. Listed in `notIncluded` until confirmed.
- **Auth errors:** tell the user to reload the page.

### 4.5 M365 Copilot

Hosts: `m365.cloud.microsoft` (content script), `copilot.cloud.microsoft` (popup only, section 6).

- **Collection:**
  1. Remember the scroll position.
  2. Step up through the chat (part of a screen, wait, collect), then down to the bottom.
  3. Stop when positions 1 to setsize are all collected, or at the step or time cap.
  4. Restore the scroll position.
- **Keys:** `aria-posinset` for labeled messages. Unlabeled messages are keyed by role, normalized text and neighboring position.
- **Set size:** the largest seen is kept; a change is noted.
- **Content:** a parse step takes plain records `{ pos, setsize, role, html, text }`. User text via `innerText`. Answers from `[data-testid="markdown-reply"]` HTML, converted with Turndown (section 12).
- **Not included:** sources, images and files, until probed. Listed in `notIncluded`.

Consumer Copilot (copilot.com) is not in 1.0 (open question 3).

---

## 5. File layout

```
extensions/conversation-copier/
  manifest.json
  content.js            UI: buttons, popup messages, modal, toasts, clipboard, downloads, ZIP
  core/model.js         Conversation helpers, error classes
  core/markdown.js      Conversation to Markdown
  core/names.js         safeName for ZIP entries and links
  platforms/claude.js
  platforms/chatgpt.js
  platforms/grok.js
  platforms/gemini.js
  platforms/copilot.js
  popup/popup.html, popup/popup.js
  lib/jszip.min.js      vendored, as today
  lib/turndown.js, lib/turndown-plugin-gfm.js   vendored, pinned, with license headers
  test/                 node test runner, fixtures built from probe skeletons
  probe/                live-check script and how to run it
  docs/spec.md, docs/reviews/
```

No build step. Each file ends with `globalThis.Recurate = Object.assign(globalThis.Recurate || {}, { ... })`, which works in a content script and in Node (tests load the files with `vm`). `window.RecurateExtractor` stays as an alias returning the Conversation model. The copies of the old extractor in aicc-platform and claude-chat-archive are archived copies and do not load this file.

---

## 6. Manifest, permissions and the store

- **Content-script hosts:** `claude.ai`, `chatgpt.com`, `chat.openai.com`, `grok.com`, `gemini.google.com`, `m365.cloud.microsoft`. No host is added.
- **Hosts removed:** `www.google.com` (Google AI Mode) and `copilot.microsoft.com` (it redirects to copilot.com, so the script never runs there). Removing hosts narrows access.
- **Permissions added:** `activeTab` and `scripting`, for popup injection. Neither shows a warning. Injection happens only after the user clicks the icon, and only on a supported conversation page.
- **Keys added:** `action` (the popup) and `commands` (`_execute_action`).
- **Existing users:** no re-approval expected. Chrome's Extension Update Testing Tool confirms the update does not disable the extension before upload.
- **Store listing:** rewritten for 1.0. The host justification names each site and states that requests go only to that site with the user's own session, and nothing leaves the browser. Screenshots replace the HTML ones.

---

## 7. Security and privacy

- Requests go only to the site the user is on. No other host, no analytics, no backend.
- The ChatGPT token lives in memory for one export.
- Copier generates no HTML. Files the chat produced are saved as they are.
- Signed or download URLs never appear in an export.
- `safeName` for every ZIP entry and link:
  - strips control characters, path separators, `..` and the Windows set (`: * ? " < > |`);
  - trims trailing dots and spaces, prefixes reserved names (`CON`, `NUL` and the rest);
  - caps the name at about 100 UTF-8 bytes, keeping the extension and never splitting a character;
  - dedupes case-insensitively against names already used in the folder, looping until a name is free.
- Test fixtures come from values-free skeletons (key paths and types). No chat content.
- Docs and commits carry counts only.

---

## 8. Testing

### 8.1 Unit (node test runner, no new dependency)

Every parse step against fixtures built from probe skeletons. Each completeness rule, including a missing parent and a repeated Gemini cursor. Branch walking, tool pairing (unpaired call, orphan result, folded human message), Claude citation positions with characters outside the basic plane, ChatGPT marker replacement for each reference type, unknown content types, Gemini paging and the guard, Copilot dedupe with an unlabeled message, `safeName` cases, fence lengths, `conversationRef` URL forms, and the Markdown writer. Turndown conversion is tested live only.

### 8.2 Live test matrix

| Case | Expected | Available on Nikhil's accounts |
|---|---|---|
| Long chat, each platform | Complete per 3.3 | Claude, ChatGPT, Gemini (11 turns), Copilot (26) |
| Edited and regenerated branch, each platform | Exports the branch on screen; screen check passes | Needs test chats (open question 2) |
| Claude chat with files, artifacts, compaction | All files present or listed as failed | Yes |
| ChatGPT chat with images, searches, code runs | Images in ZIP, sources as links, tool steps | Yes |
| Gemini beyond one page | All pages read | Yes (forced with a small page size) |
| A failing file download | Listed as failed with the reason | Simulated in unit tests |
| Reply still streaming at export time | Exports what is stored and notes the last turn is in progress | Yes |
| Tab open before the update | Popup injects and works | Yes |
| copilot.cloud.microsoft from the popup | Works | Yes |

Untested on these accounts, named in the release notes: ChatGPT workspace, project and custom GPT chats; a second Google account, a Workspace account, a Gem; a long Grok chat; a Copilot chat of 100 or more messages; a Claude account with two chat orgs; consumer Copilot.

### 8.3 Before release

- Nikhil loads the unpacked build once, with the store version turned off. Every entry point on every site is checked in the installed extension. Injected test code runs in the page's world; this pass proves the content-script world works.
- Old versus new on the same Claude chats (0.4.0 is broken on the other platforms), counts recorded.
- The Extension Update Testing Tool on the final manifest.

### 8.4 Probe script

`probe/` holds the live check as a script plus how to run it through Claude in Chrome. Per platform it reports counts by block type, hidden flags by content type, completeness, and a values-free skeleton of the response for fixtures. When a site changes, the rerun shows what moved.

---

## 9. Build steps

Each becomes a CenterEye task.

1. **Core:** model, error classes, Markdown writer, `safeName`, tests.
2. **Probe script:** live counts and skeletons for fixtures.
3. **Claude adapter:** org pick, branch, blocks, tools, citations, compaction, files, artifacts, tests, live check.
4. **ChatGPT adapter:** classification, turns, citations, files, tests, live check.
5. **Grok adapter:** tests, live check.
6. **Gemini adapter:** paging, guard, decode thinking, sources and images, tests, live check.
7. **Copilot adapter:** scroll collection, Turndown, tests, live check on both account types.
8. **UI:** toolbar buttons, floating cluster, popup with injection, commands, clipboard fallback, modal, ZIP, screen check.
9. **Live matrix and proof:** section 8.2 and 8.3.
10. **Breaker pass:** a separate agent attacks the finished code. Findings fixed with tests.
11. **Release prep:** version 1.0.0, manifest, update testing tool, store listing, screenshots, CHANGELOG, CURRENT_STATE, NOW, README, ZIP. The store upload waits for Nikhil's go.

---

## 10. Not in this version

- AI-written content inside an export (a summary, a title). It needs a model call and a key. Copier stays with no backend.
- Exporting many chats at once. The data sources make it possible; a candidate for the next version.
- All branches of a chat. The active branch only.
- Page-reading fallbacks for Claude, ChatGPT, Grok and Gemini.
- Consumer Copilot (copilot.com), unless open question 3 changes it.
- Claude Code sessions at claude.ai/code and Claude in Chrome side-panel chats. Not probed.
- Google AI Mode.

---

## 11. Open questions for Nikhil

1. **Markdown only?** Lean: yes. Drop the styled HTML export. Keeping HTML means rendering Markdown ourselves with two more vendored libraries and a second writer to maintain. Cost of yes: Windows has no default `.md` viewer, so people there lose a double-click file.
2. **Test chats for branches?** Lean: yes. I create a few short throwaway chats on Claude, ChatGPT, Grok and Gemini, each with one edited message and one regenerated answer, to prove the branch rules. They sit on your accounts until you delete them.
3. **Consumer Copilot out of 1.0?** Lean: yes. It is a different app and I cannot reach it. To include it, you would set up a Chrome profile signed into your personal Microsoft account, and I probe it there.

---

## 12. Decided in this spec (Nikhil can overturn)

- Version 1.0.0.
- Google AI Mode removed (the reviewer agreed).
- Turndown vendored for Copilot only (the reviewer agreed, with conditions in 4.5 and the build check on Copilot's table markup).
- No page fallbacks except Copilot (review F20).
- No new content-script hosts; `activeTab` and `scripting` for the popup, so existing users are not asked to re-approve (review F19).
- Toolbar popup added; in-page shortcuts replaced by a rebindable command (review F23).
- Tool steps exported whole, in collapsible blocks.
- Spec and reviews live in this folder, off the recurate.ai site (Nikhil, November 15).

---

## 13. Risks

1. **Every data source is private and undocumented.** Any site can change it overnight. Structural checks stop a bad export and say why; the probe script finds what moved.
2. **Claude's REST endpoint may retire.** Claude's own page no longer uses it. If it goes, Claude export stops with a clear error until an adapter for the new service is built.
3. **Gemini's positional arrays** move when Google ships a new client. The id-prefix guard catches it; the fix is new positions.
4. **Copilot collection depends on `aria-posinset` and `aria-setsize`** and on scroll loading. Without the labels the export still works and says it cannot confirm completeness.
5. **Store review** may take longer for `scripting`. The listing states the single purpose and that nothing leaves the browser.
6. **No page fallback** means a site change stops exports on that site until fixed, instead of producing a fragment. Chosen on purpose: a clear failure beats a silent partial.
7. **Claude citation units** are unverified (no live case found in 61 chats). Code points are assumed, as on ChatGPT; markers snap to word ends to limit damage; the probe flags the first live case.
