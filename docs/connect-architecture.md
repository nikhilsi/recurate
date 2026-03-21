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

1. **One-click sharing.** Click Share or type `\rc`, done. The last exchange is injected into the other tab and auto-sent. The human gate is the click (or keystroke) itself.
2. **Two tabs, one shared space.** Connect links exactly two Claude.ai chat tabs. One shared space visible to both. Simple, focused, no ambiguity about where messages go.
3. **Full exchange context.** Sharing an AI response automatically includes the user prompt that triggered it. The receiving chat gets the full context, not a fragment.
4. **Command palette.** `\rc` to share, `\rcp` to pop out, `\rcc` to clear. Typed into the input box, intercepted before Claude sees it. Keyboard-first workflow.
5. **Zero configuration.** Chat names and tab identities are discovered automatically from Claude.ai's UI and URL. No setup, no naming prompts.
6. **Claude.ai only.** Single platform. Single set of selectors. Focused.

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

### Three Components

**1. Background Service Worker** (`entrypoints/background.ts`)

The message bus and shared space manager. Enforces 2-tab limit.

- **Tab registry:** Map of `{tabId, chatName, chatUuid, url}`. Maximum 2 tabs. Rejects registration if at capacity.
- **Shared space:** Ordered list of shared exchanges stored in `chrome.storage.local`. Each entry: `{id, from, prompt, response, timestamp, pinned}`. Persists across browser restarts.
- **Message routing:** When a share arrives, writes to shared space, then notifies the other tab to inject and send.
- **Lifecycle cleanup:** Listens to `chrome.tabs.onRemoved` and `chrome.tabs.onUpdated` to remove stale registry entries.
- **Pop-out state:** Tracks whether the pop-out window is open. Broadcasts `POPOUT_STATE` to all tabs so inline sidebars collapse/restore.
- **Broadcast:** When the shared space or registry changes, notifies all registered tabs so sidebars update in real time.

**2. Content Script** (`entrypoints/claude.content.tsx`, runs in every claude.ai tab)

Four jobs: register, send, receive, commands.

**Registration:**
- On load, registers with background (debounced): reads chat name from `[data-testid="chat-title-button"] .truncate`, chat UUID from URL (`/chat/{uuid}`).
- Re-registers on SPA navigation (MutationObserver on title element).
- Background assigns tabId explicitly via `TABS_UPDATED` message.

**Sending:**
- Share button injected into the last message action bar (same pattern as Copier). One click shares the last exchange to the other tab. No dropdown, no picker.
- If text is selected, shares only the selection.
- Triggers auto-send via `button[aria-label="Send message"]`.

**Receiving:**
- Listens for messages from background via `chrome.runtime.onMessage`.
- On receive: injects into Claude's ProseMirror input as a quoted block with attribution, then clicks send.

**Command Palette:**
- Intercepts Enter keypress in capture phase before Claude processes it.
- `\rc` — share last exchange to the other tab
- `\rcp` — open pop-out window
- `\rcc` — clear shared space
- Command is cleared from input after execution. Claude never sees it.

**3. Sidebar** (Preact component, injected by content script)

Toggle anchored in the right margin next to the input box. Panel expands upward into the right gutter, outside Claude's chat content.

- Header: "Recurate Connect" + connected tab name
- Entry list with source name, timestamp, preview
- Each entry: send to other tab, edit, pin, delete
- Search/filter (appears with 4+ entries)
- Pop-out button opens shared space in separate window
- Drag entries from sidebar to editor
- Auto-collapses when pop-out window is open, restores when closed
- Hidden when no other tab is connected

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

### Three ways to share

**1. Share button** (mouse)
```
Click Share icon on the last message's action bar
  → Extracts last exchange (prompt + response)
  → Writes to shared space
  → Injects into other tab's input as quoted block
  → Auto-sends
```

**2. Command: `\rc`** (keyboard)
```
Type \rc in the input box, hit Enter
  → Extension intercepts before Claude sees it
  → Same flow as share button
  → Input is cleared
```

**3. Sidebar send** (from history)
```
Open sidebar → click "Send to {tab}" on any entry
  → Injects that entry into other tab's input
  → Auto-sends
```

The receiving tab gets:
```
> **[From Ops-HQ]:**
> **You asked:** How should the INTENT section open?
> **Claude:** The INTENT section should open with the moment...
```

### Other commands

- `\rcp` — open shared space in a separate pop-out window
- `\rcc` — clear all shared space entries

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
| Send button | `button[aria-label="Send message"]` | Connect (auto-send) |

---

## Versioning Plan

**Sharing**
- Two-tab limit: exactly two Claude.ai tabs connected at a time
- Share button on the last message's action bar (one click, no dropdown)
- Command palette: `\rc` (share), `\rcp` (pop out), `\rcc` (clear)
- Full exchange context: share includes both the prompt and response
- Text selection support: share only the selected portion
- Auto-send: shared content is injected and sent automatically

**Shared Space Sidebar**
- Toggle anchored in the right margin next to the input box
- Panel expands upward into the right gutter
- Header: "Recurate Connect" with connected tab name
- Entry list: send, edit, pin, delete per entry
- Search/filter (appears with 4+ entries)
- Drag entries from sidebar into editor
- Auto-collapses when pop-out window is open

**Pop-out Window**
- Opens in a separate browser window (480x640)
- Draggable to another monitor for multi-monitor workflows
- Full-width entry cards with complete message text
- Same functionality as inline sidebar: send, edit, pin, delete, search
- Real-time updates via chrome.runtime messaging
- Inline sidebars on all tabs auto-collapse when window opens, restore when closed

---

## Project Structure

```
extensions/connect/
├── wxt.config.ts                    # WXT + Vite + Preact configuration
├── package.json
├── tsconfig.json
├── entrypoints/
│   ├── background.ts                # Service worker: tab registry (2-tab limit), shared space, routing
│   ├── claude.content.tsx           # Content script: share button, commands, sidebar mount
│   └── shared-space/               # Pop-out window
│       ├── index.html
│       └── main.tsx
├── components/
│   ├── Sidebar.tsx                  # Inline sidebar: toggle, shared space, pop-out
│   └── SharedSpaceWindow.tsx        # Full-window shared space (for pop-out)
├── lib/
│   ├── selectors.ts                 # Claude.ai DOM selectors (shared constants)
│   ├── exchange.ts                  # Text selection helper
│   ├── inject.ts                    # ProseMirror injection (clipboard paste + send)
│   ├── shared-space.ts              # Shared space CRUD (chrome.storage.local)
│   └── types.ts                     # Shared types (TabInfo, SharedEntry, messages)
├── assets/
│   └── icon.svg                     # Master icon SVG (two arrows, indigo gradient)
└── public/
    └── icon-{16,32,48,128}.png      # Generated from icon.svg
```

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tech stack | WXT + Preact + TypeScript | Same stack as Annotator. Reactive state (tab registry, shared space, sidebar) benefits from Preact Signals. |
| Two-tab limit | Maximum 2 connected tabs | The core use case is two specialist chats coordinating. More tabs add UX complexity without proportional value. Architecture supports N tabs if needed later. |
| Shared space | Extension-managed buffer (chrome.storage.local) | Claude.ai can't read from extension storage directly -- content must be injected through the text box. But the shared space gives the human a command center view and the ability to curate before sharing. |
| Command palette | `\rc`, `\rcp`, `\rcc` | Keyboard-first. Faster than clicking buttons. Deterministic (unlike pattern detection on Claude's natural language). Intercepted in capture phase before Claude processes the Enter key. |
| No pattern detection | Removed | Claude phrases share requests differently every time. Pattern matching is inherently fragile for natural language. The command approach (`\rc`) is deterministic and user-controlled. |
| No tab picker dropdown | Removed | With 2-tab limit, there's only one other tab. No choice to make. Share button and `\rc` go directly to the other tab. |
| Auto-send | Always auto-send | The human gate is the click or keystroke. No second review step. |
| Exchange context | Always include prompt + response | An AI message without its prompt is context-free. The exchange is the unit of sharing. |
| Pop-out window | Separate browser window, collapses all inline sidebars | One shared space view at a time. Pop-out gives full-width reading on any monitor. Inline sidebars auto-restore when pop-out closes. |
| Platform scope | Claude.ai only | Each claude.ai chat carries persistent memory, project context, file access, and conversation history. API-based multi-LLM coordination is a different product (Recurate Platform). |
