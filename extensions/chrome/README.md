# Recurate Annotator — Chrome Extension

Annotate AI responses with highlight and strikethrough gestures. Works on **claude.ai** and **ChatGPT (chat.com)**.

## What It Does

A Chrome side panel that mirrors the AI's latest response and lets you annotate it:

- **Highlight** (green) — "Keep this, carry it forward"
- **Strikethrough** (red) — "Drop this, it's wrong or irrelevant"

Annotations are automatically injected into the AI's text box as structured KEEP/DROP feedback. The AI's next response is better because it got explicit signal about what you valued.

## How to Build

```bash
cd extensions/chrome
npm install
npm run dev     # Development mode with HMR
npm run build   # Production build
```

Development build output: `.output/chrome-mv3-dev/`
Production build output: `.output/chrome-mv3/`

## How to Install (Development)

1. Run `npm run dev` or `npm run build`
2. Open `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `.output/chrome-mv3-dev/` (or `chrome-mv3/`) directory

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Content Script (one per platform)               │
│  claude.content.ts / chatgpt.content.ts          │
│                                                  │
│  - Detects AI response completion                │
│  - Extracts response HTML                        │
│  - Injects feedback into text box                │
│  - Detects theme (light/dark)                    │
└────────┬───────────────────────────┬─────────────┘
         │ browser.runtime           │
         │ .sendMessage()            │
         ↓                           ↓
┌────────────────────┐    ┌────────────────────────┐
│  Background        │    │  Side Panel (Preact)    │
│  background.ts     │    │                        │
│                    │←──→│  App.tsx                │
│  Message relay     │    │  ├─ StatusBar           │
│  between content   │    │  ├─ ResponseView        │
│  script & panel    │    │  │   └─ AnnotationToolbar│
│                    │    │  ├─ AnnotationList      │
└────────────────────┘    │  └─ feedback indicator  │
                          │                        │
                          │  State: Preact Signals  │
                          │  annotations.ts         │
                          └────────────────────────┘
```

### Message Flow

1. AI finishes responding → content script extracts HTML → sends `RESPONSE_READY` via background
2. Side panel renders HTML in ResponseView
3. User selects text → floating toolbar → highlight or strikethrough
4. Annotation state updates → `formatFeedback()` generates KEEP/DROP text
5. Side panel sends `PENDING_FEEDBACK` → background relays → content script
6. Content script injects feedback into the AI's text box (ProseMirror editor)
7. When user sends next message, feedback is included automatically

### Platform Modules

Each AI platform has a module in `lib/platforms/` that provides:
- DOM selectors (response containers, input editor, streaming indicators)
- Response extraction (`extractLatestResponse`)
- Streaming detection (`isStreaming`)
- Editor manipulation (`getEditor`, `setEditorContent`, `clearEditor`)

Adding a new platform means creating a new platform module and content script following the same pattern.

## Key Files

| File | Purpose |
|------|---------|
| `wxt.config.ts` | WXT build config (Vite + Preact) |
| `entrypoints/claude.content.ts` | Content script for claude.ai |
| `entrypoints/chatgpt.content.ts` | Content script for chat.com |
| `entrypoints/background.ts` | Background service worker (message relay) |
| `entrypoints/sidepanel/App.tsx` | Root UI component |
| `entrypoints/sidepanel/components/ResponseView.tsx` | Renders response with DOM overlay annotations |
| `entrypoints/sidepanel/components/AnnotationToolbar.tsx` | Floating toolbar on text selection |
| `entrypoints/sidepanel/components/AnnotationList.tsx` | Shows annotation summary |
| `entrypoints/sidepanel/state/annotations.ts` | Annotation state (Preact Signals) |
| `lib/platforms/claude.ts` | claude.ai DOM selectors and extraction |
| `lib/platforms/chatgpt.ts` | ChatGPT DOM selectors and extraction |
| `lib/formatter.ts` | Formats annotations into KEEP/DROP feedback text |
| `lib/types.ts` | Shared TypeScript types |

## Tech Stack

- **WXT** — Extension build framework (file-based entrypoints, auto-manifest, HMR)
- **Preact + Preact Signals** — UI framework (4KB runtime, fine-grained reactivity)
- **TypeScript** — All code
- **Manifest V3** — Chrome extension platform

## How Annotations Work

1. ResponseView renders the AI's HTML response in the side panel
2. User selects text → `handlePointerUp` computes character offsets via TreeWalker
3. Selection snaps to word boundaries
4. Floating toolbar appears → user clicks highlight or strikethrough
5. Annotation stored as `{ id, type, text, startOffset, endOffset }`
6. DOM overlay: TreeWalker walks text nodes, `Range.surroundContents()` wraps annotated ranges with `<mark>` or `<del>`
7. Original HTML is always preserved — annotations are re-applied from scratch on every change

## Platform-Specific Details

### claude.ai
- Streaming detection: `data-is-streaming` attribute on response elements
- Editor: ProseMirror `div[contenteditable]` with `.is-editor-empty` class
- Theme: `<html>` class contains `dark` → dark mode

### ChatGPT (chat.com)
- Streaming detection: stop button presence/absence (no data attribute)
- Editor: ProseMirror `div#prompt-textarea[contenteditable]`
- Theme: `<html>` class contains `dark` → dark mode
- Response containers: `article[data-testid^="conversation-turn-"]`
