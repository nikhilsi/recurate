# Recurate Connect — Architecture

**Status:** Design
**Date:** March 20, 2026
**Author:** Nikhil Singhal

---

## What It Is

A Chrome extension that connects two or more open Claude.ai chat tabs with one-click context sharing. Click Share next to any message, pick a target tab, and the full exchange (your prompt + the AI's response) lands in the other chat's input and sends. One click instead of copy-switch-paste-send.

**The fourth Recurate extension, completing the circle:**

- **Composer** — shape the input
- **Annotator** — curate the output
- **Copier** — capture the conversation
- **Connect** — connect the conversations

Born from the multi-intelligence workflow: Ops-HQ, Book HQ, and AI Trust Commons are separate Claude.ai chats with distinct roles. When one chat produces an insight the other needs, the human is currently the manual router (copy text, switch tab, paste, add context, send). Connect reduces that to one click without removing human judgment.

---

## Why Connect, Not the Platform

Recurate already has a multi-LLM platform ([app.recurate.ai](https://app.recurate.ai)) that sends one question to four different LLMs (Claude, GPT, Grok, Gemini) and synthesizes their responses into a Condensed Context (CC). The platform uses APIs and a backend to coordinate across models. So why build a browser extension for cross-chat coordination?

**Different problem.** The platform solves "What do 4 different minds think about this?" Connect solves "How do I coordinate 4 specialized minds that each know things the others don't?"

**Different intelligence.** On the platform, each LLM is stateless. Every call is independent. The CC exists because you *need* to synthesize across models that have no memory, no project context, no history. Gemini generates the CC automatically.

On claude.ai, each chat is a **specialist** carrying persistent memory, project-specific custom instructions, file access to repos, and weeks of conversation history. Ops-HQ knows the strategy and campaign. Book HQ knows the manuscript, voice, and structure. AI Trust Commons knows governance, NIST, and policy. That context is irreplaceable and impossible to replicate through API calls. The chat IS the intelligence.

**Different CC.** On the platform, a synthesis model (Gemini Flash) produces the CC from all four model responses. On Connect, the human is the CC. You read what Ops said, decide what Book HQ needs to see, curate it, and share it. The extension makes that curation fast and visible instead of manual and invisible.

**The shared space** is the extension-managed buffer where shared messages accumulate. It's not a synthesis — it's a curated clipboard with visibility. The sidebar shows what's been shared across all tabs, and the human decides what crosses each boundary. This is Recurate's core principle applied to the partnership itself: the human curates.

---

## Core Principles

1. **One-click sharing.** Click Share, pick a tab, done. The message is injected and auto-sent. The human gate is the click itself. Hold Shift+click to inject without sending (when you want to add framing first).
2. **Full exchange context.** Sharing an AI response automatically includes the user prompt that triggered it. The receiving chat gets the full context, not a fragment.
3. **Zero configuration.** Chat names and tab identities are discovered automatically from Claude.ai's UI and URL. No setup, no naming prompts.
4. **Claude.ai only.** Single platform. Single set of selectors. Focused.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Build framework | WXT (file-based entrypoints, auto-manifest, HMR) |
| UI | Preact + Preact Signals |
| Language | TypeScript |
| Target | Chrome Manifest V3 |

Same stack as Annotator. Chosen over vanilla JS because Connect has real-time reactive state (tab registry updates, cross-tab message feeds, sidebar with live updates) that compounds in complexity through V0.3. Preact Signals give us reactive UI updates when tabs connect/disconnect without manual DOM tracking.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Chrome Browser                             │
│                                                                   │
│  ┌──────────────────┐                    ┌──────────────────┐    │
│  │  Tab A (Ops-HQ)  │                    │  Tab B (Book HQ) │    │
│  │                   │                    │                   │    │
│  │  Content Script   │                    │  Content Script   │    │
│  │  - Share buttons  │                    │  - Share buttons  │    │
│  │  - Sidebar panel  │                    │  - Sidebar panel  │    │
│  │  - Send to input  │                    │  - Send to input  │    │
│  └────────┬─────────┘                    └────────┬─────────┘    │
│           │                                        │              │
│           │  chrome.runtime.sendMessage             │              │
│           │                                        │              │
│  ┌────────▼────────────────────────────────────────▼──────────┐  │
│  │                 Background Service Worker                   │  │
│  │                                                             │  │
│  │  Tab Registry:                                              │  │
│  │  { tabId: 42, name: "Ops-HQ", uuid: "abc-123" }           │  │
│  │  { tabId: 67, name: "Book HQ", uuid: "def-456" }          │  │
│  │                                                             │  │
│  │  Shared Space (chrome.storage.local):                       │  │
│  │  [                                                          │  │
│  │    { from: "Ops-HQ", prompt: "...", response: "...", ts }  │  │
│  │    { from: "Book HQ", prompt: "...", response: "...", ts } │  │
│  │  ]                                                          │  │
│  │                                                             │  │
│  │  Routes messages, manages shared space, broadcasts updates  │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Four Components

**1. Background Service Worker** (`entrypoints/background.ts`)

The message bus and shared space manager.

- **Tab registry:** Map of `{tabId, chatName, chatUuid, url}`. Updated when content scripts register or when tabs close/navigate.
- **Shared space:** Ordered list of shared exchanges stored in `chrome.storage.local`. Each entry: `{id, from, prompt, response, selectedText, timestamp}`. Persists across browser restarts.
- **Message routing:** When a share arrives, writes to shared space, then notifies the target tab to inject and send.
- **Lifecycle cleanup:** Listens to `chrome.tabs.onRemoved` and `chrome.tabs.onUpdated` to remove stale registry entries.
- **Broadcast:** When the shared space or registry changes, notifies all registered tabs so sidebars and badges update in real time.

**2. Content Script** (`entrypoints/claude.content.ts`, runs in every claude.ai tab)

Three jobs: register, send, receive.

**Registration:**
- On load, registers with background: reads chat name from `[data-testid="chat-title-button"] .truncate`, chat UUID from URL (`/chat/{uuid}`), sends to background.
- Re-registers on SPA navigation (Claude.ai is a SPA; URL changes without page reload). MutationObserver on the title element or `popstate`/`pushState` interception.
- Receives registry and shared space updates from background to keep local state current.

**Sending:**
- Injects a "Share" button into Claude's message action bars (`div[role="group"][aria-label="Message actions"]`), same injection pattern as Copier.
- Share button appears on both AI messages and user messages.
- On Share click: extracts the full exchange (the clicked message + its counterpart: if clicking an AI message, include the preceding user prompt; if clicking a user message, include the following AI response). Shows a dropdown of other registered tabs.
- If text is selected within the message, shares only the selection (with exchange context header).
- Multi-message: shift+click to select a range of consecutive messages as one share payload.
- User picks target tab. Exchange is written to shared space, then injected into target tab's input and auto-sent.
- **Default:** inject and auto-send. **Shift+click on tab name:** inject without sending (for adding framing).

**Receiving:**
- Listens for messages from background via `chrome.runtime.onMessage`.
- On receive: injects into Claude's ProseMirror input as a quoted block with attribution.
- Format:
  ```
  > **[From Ops-HQ]:**
  > **You asked:** How should the INTENT section open?
  > **Claude:** The INTENT section should open with the moment you realized...
  ```
- Uses the same ProseMirror injection pattern as Annotator (ClipboardEvent with DataTransfer).
- If auto-send mode: triggers Claude's send button after injection.
- If shift-click mode: input has focus, cursor positioned after the quoted block for the user to add context.

**3. Sidebar** (Preact component, injected by content script)

The shared space UI. Shows all shared exchanges across connected tabs. This is the command center view of the cross-chat conversation.

- Position: floating panel, right edge of the page. Collapse/expand toggle.
- Shows: ordered list of shared exchanges with source tab name, timestamp, and content preview.
- Each entry has a "Send to this chat" button that injects it into the current tab's input.
- Drag an entry from the sidebar into the input for manual injection.
- Entries can be edited or trimmed in the sidebar before sending (curate before sharing).
- Real-time updates via background broadcasts (Preact Signals).
- Persists via `chrome.storage.local` — survives tab close and browser restart.

**4. Tab Badge** (Preact component, injected by content script)

Small floating indicator showing connection status.

- Position: near the chat title area, non-intrusive
- Shows: connection icon + count of other connected tabs (e.g., "3 connected")
- Click to expand: shows list of connected tabs with names
- Updates reactively when tabs connect/disconnect

---

## Tab Discovery

Claude.ai provides everything we need automatically:

| Data | Source | How |
|------|--------|-----|
| Chat name | DOM: `[data-testid="chat-title-button"] .truncate` | Same selector Copier uses |
| Chat UUID | URL: `claude.ai/chat/{uuid}` | `window.location.pathname.split('/')[2]` |
| Tab identity | Chrome: `chrome.tabs` API | Background gets tabId from message sender |

**No manual registration needed.** Content script reads name + UUID on load, registers with background. User sees their tabs auto-discovered.

**SPA navigation handling:** Claude.ai navigates between chats without page reload. Content script watches for URL changes (MutationObserver on `document.title` or `navigation` API) and re-registers with the updated name/UUID.

**New chat (no name yet):** When the user is at `claude.ai` (no UUID) or just asked a question and hasn't been redirected yet, the tab shows as "New chat" in the registry. Once Claude.ai assigns a name and UUID, the content script re-registers.

---

## Share Flow

### Sharing from a chat tab

```
User clicks "Share" button on an AI message in Tab A
  │
  ▼
Content script extracts the exchange:
  - The AI message text (or selection if text is selected)
  - The preceding user prompt that triggered it
  │
  ▼
Dropdown appears: list of other tabs + "All tabs" option
  │
  ▼
User clicks "Book HQ" (or "All tabs" for broadcast)
  │
  ▼
Exchange is written to shared space (chrome.storage.local)
  │
  ▼
Background routes to target tab(s):
  - Single tab: injects into that tab's input, auto-sends
  - All tabs: injects into every connected tab's input, auto-sends each
  │
  ▼
Each receiving tab gets:
  > **[From Ops-HQ]:**
  > **You asked:** How should the INTENT section open?
  > **Claude:** The INTENT section should open with the moment...
  │
  ▼
Default: auto-sends. Shift+click: inject without sending.
```

### Sharing from the sidebar

```
User opens sidebar (visible in any tab)
  │
  ▼
Sidebar shows all shared exchanges across tabs
  │
  ▼
User clicks "Send" on an entry → picks target: single tab or all tabs
  │
  ▼
Entry is injected into target tab(s) and auto-sent
```

The sidebar is the shared space made visible. Any entry can be sent to any tab (or all tabs) at any time — not just on the moment it was shared.

**Multi-message share:** Shift+click to select a range of consecutive messages. The share payload includes all selected messages in order as a single exchange block.

**Broadcast:** The "All tabs" option sends the same context to every connected tab simultaneously. Each tab's Claude processes it independently with its own specialist knowledge. Useful when you want all chats aligned on the same context.

---

## DOM Selectors (Claude.ai)

All proven selectors from existing extensions:

| Purpose | Selector | Used by |
|---------|----------|---------|
| Chat title | `[data-testid="chat-title-button"] .truncate` | Copier |
| Message action bar | `div[role="group"][aria-label="Message actions"]` | Copier |
| AI message content | `[data-is-streaming="false"]` | Copier |
| User message content | `[data-testid="user-message"]` | Copier |
| ProseMirror input | `div.ProseMirror[contenteditable="true"]` | Annotator |
| AI message text | `.font-claude-message`, `.prose` | Copier |
| Send button | `button[aria-label="Send Message"]` | Connect (new, for auto-send) |

---

## Versioning Plan

All features are built in V0.1. No phased rollout — the extension ships complete.

**Core — Share + Shared Space**
- Tab auto-discovery and registration via background service worker
- Shared space (chrome.storage.local) with sidebar UI in every tab
- Share button in message action bars (AI and user messages)
- Full exchange context: share includes both the prompt and response
- Text selection support: share a portion of a message
- Multi-message selection: shift+click to select a range
- Tab picker dropdown with "All tabs" broadcast option
- One-click auto-send (default) + shift+click inject-only mode
- Tab badge showing connection count
- ProseMirror injection with quoted block formatting

**Chat-Requested Share**
- MutationObserver scans new AI messages for share patterns: "share with X:", "send to X:", "please share with X", "forward to X:"
- Matches pattern against registered tab names (fuzzy)
- Highlighted bar appears with one-click "Share to {tab}" button + dismiss
- Visual feedback on share (bar turns green, button shows "Shared")

**Enhanced Sidebar**
- Edit entries inline before sending (textarea, save/cancel)
- Pin/unpin entries (pinned sort to top, visual indicator)
- Delete individual entries
- Search/filter across all shared messages (from, prompt, response)
- Drag entries from sidebar into editor (drag-and-drop with visual feedback)
- Resizable sidebar (drag left edge, 250-600px wide, 300-800px tall)

**Pop-out Window**
- "Pop out" button opens shared space in a separate browser window (480x640)
- Window can be dragged to another monitor for multi-monitor workflows
- Full-width entry cards with complete message text (not truncated)
- Same functionality as inline sidebar: send, edit, pin, delete, search
- Real-time updates via chrome.runtime messaging
- Inline sidebar auto-collapses when window opens

---

## Project Structure

```
extensions/connect/
├── wxt.config.ts                    # WXT + Vite + Preact configuration
├── package.json
├── tsconfig.json
├── entrypoints/
│   ├── background.ts                # Service worker: tab registry, shared space, routing
│   ├── claude.content.tsx           # Content script: share buttons, receive + inject
│   └── shared-space/               # Pop-out window
│       ├── index.html
│       └── main.tsx
├── components/
│   ├── TabPicker.tsx                # Dropdown for selecting target tab(s) + "All tabs"
│   ├── TabBadge.tsx                 # Connection status badge
│   ├── Sidebar.tsx                  # Inline sidebar: shared space, resize, pop-out
│   └── SharedSpaceWindow.tsx        # Full-window shared space (for pop-out)
├── lib/
│   ├── selectors.ts                 # Claude.ai DOM selectors (shared constants)
│   ├── exchange.ts                  # Extract user+AI message pairs from DOM
│   ├── inject.ts                    # ProseMirror injection (quoted block + append)
│   ├── shared-space.ts              # Shared space CRUD (chrome.storage.local)
│   └── types.ts                     # Shared types (TabInfo, Exchange, SharedEntry)
├── assets/
│   └── icon.svg                     # Master icon SVG (two arrows, indigo gradient)
└── public/
    └── icon-{16,32,48,128}.png      # Generated from icon.svg
```

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tech stack | WXT + Preact + TypeScript | Real-time reactive state (tab registry, shared space, sidebar) compounds in complexity. Same stack as Annotator. Signals give reactive UI without manual DOM tracking. Building for V0.3 from day one avoids rebuilding foundations. |
| Shared space | Extension-managed buffer (chrome.storage.local) | Claude.ai can't read from extension storage directly — content must be injected through the text box. But the shared space gives the human a command center view of all cross-chat context, persistence across sessions, and the ability to curate before sharing. |
| Auto-send default | Yes, with shift+click override | The human gate is the click. Requiring a second review step is the friction we're eliminating. Shift+click gives an escape hatch for when you want to add framing. |
| Exchange context | Always include prompt + response | An AI message without its prompt is context-free. The exchange is the unit of sharing. |
| User message sharing | Yes, from V0.1 | Both sides of the conversation are shareable. Share buttons on all messages. |
| Selection support | V0.1 | Long AI responses need partial sharing. If text is selected, share only the selection. |
| Multi-message | V0.1 | Sometimes the useful context is 2-3 exchanges, not one. Shift+click to select a range. |
| Broadcast | "All tabs" option in tab picker | Sometimes you want every specialist aligned on the same context simultaneously. One action instead of N sequential shares. |
| Sidebar in V0.1 | Yes, not deferred | The sidebar is the shared space made visible. Without it, the shared space has no UI. It's the product, not a future enhancement. |
| Pop-out window | Separate browser window via chrome.windows.create | Inline sidebar is too narrow for reading full messages. Pop-out window can be dragged to another monitor, resized freely. Essential for multi-monitor workflows. |
| All features in V0.1 | No phased rollout | Chat-requested share, edit/pin/delete, search, drag-to-inject, resize, and pop-out are all essential for a complete experience. Shipping without them would feel incomplete. |
| Platform scope | Claude.ai only | Each claude.ai chat carries persistent memory, project context, file access, and conversation history. That specialist intelligence is why you have multiple chats. Connect coordinates between them. API-based multi-LLM coordination is a different product (Recurate Platform). |
