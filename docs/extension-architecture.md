# Recurate Annotator — Chrome Extension Architecture

**Status:** Implementation-ready
**Date:** February 21, 2026
**Target:** V1 — claude.ai only

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [Messaging Architecture](#messaging-architecture)
7. [Platform Integration — claude.ai](#platform-integration-claudeai)
8. [Annotation UX](#annotation-ux)
9. [Structured Feedback Format](#structured-feedback-format)
10. [Extensibility](#extensibility)
11. [Known Risks & Mitigations](#known-risks--mitigations)

---

## 1. Overview

The Recurate Annotator is a Chrome extension that adds a side panel to AI chat interfaces. The side panel displays the AI's latest response and provides annotation tools — highlight (keep/carry forward) and strikethrough (drop/discard). When the user is ready, the extension generates structured feedback text and injects it into the platform's native text box alongside the user's next question.

**V1 scope:** claude.ai only. Additional platforms (chat.com, grok.com, gemini.google.com) follow the same architecture with platform-specific selectors.

**Core loop:**

1. Content script detects AI response completion on claude.ai
2. Content script extracts response HTML → sends to side panel via background service worker
3. Side panel renders the response with annotation capabilities
4. User annotates (highlight / strikethrough) via floating toolbar
5. User clicks "Apply" → preview shown → structured feedback injected into claude.ai's text box

---

## 2. Tech Stack

| Component | Technology | Why |
|-----------|------------|-----|
| **Extension framework** | WXT | File-based entrypoint discovery, auto-manifest generation, HMR, smallest bundle output. Actively maintained (unlike Plasmo). |
| **Side panel UI** | Preact | 4 KB runtime, React-compatible API, deep familiarity for rapid development. Lighter than React, more capable than vanilla JS for our state management needs. |
| **State management** | Preact Signals | Fine-grained reactivity — only the annotation that changes re-renders, not the entire panel. No external state library needed. |
| **Language** | TypeScript | Type safety across content scripts, background, and side panel. Catches messaging contract errors at compile time. |
| **Build** | Vite (via WXT) | Fast builds, HMR, handles JSX transform via `@preact/preset-vite`. |
| **Content scripts** | Vanilla TypeScript | Content scripts do DOM observation and text injection. No framework needed — they don't render UI. |

### Why not other frameworks?

- **Svelte 5**: Better technical fit (smaller runtime, Runes), but less familiar — would slow development and increase bug risk.
- **Lit**: Weaker state management, Shadow DOM complicates style inheritance for markdown rendering.
- **Solid.js**: Steep learning curve, small extension ecosystem.
- **Vanilla JS**: The side panel has enough interactive complexity (annotation state, floating toolbar, preview, undo) that we'd end up building a mini-framework.

### Manifest V3 CSP compliance

Chrome's Content Security Policy bans `eval()` and `new Function()` on extension pages. Preact with pre-compiled JSX (via Vite build step) produces static JavaScript only — fully compliant. No runtime template compilation.

---

## 3. Project Structure

```
extensions/chrome/
├── package.json                       # Dependencies and scripts
├── tsconfig.json                      # TypeScript configuration
├── wxt.config.ts                      # WXT + Vite + Preact configuration
│
├── entrypoints/
│   ├── background.ts                  # Service worker
│   │                                  #   - Opens side panel on action click
│   │                                  #   - Relays messages between content ↔ side panel
│   │
│   ├── sidepanel/                     # Side panel UI (Preact)
│   │   ├── index.html                 #   Entry HTML
│   │   ├── main.tsx                   #   Preact render mount
│   │   ├── App.tsx                    #   Root component — layout + state wiring
│   │   ├── components/
│   │   │   ├── ResponseView.tsx       #   Renders AI response with annotation overlays
│   │   │   ├── AnnotationToolbar.tsx  #   Floating ✓ / ✗ / ↺ toolbar
│   │   │   ├── AnnotationList.tsx     #   Summary list with delete buttons
│   │   │   ├── FeedbackPreview.tsx    #   Preview of structured text before injection
│   │   │   └── StatusBar.tsx          #   Connection status, "Listening for responses..."
│   │   ├── state/
│   │   │   └── annotations.ts        #   Preact Signals — all annotation state + actions
│   │   └── styles/
│   │       ├── sidepanel.css          #   Global layout, typography
│   │       └── annotations.css        #   Highlight/strikethrough visual treatment
│   │
│   └── claude.content.ts             # Content script for claude.ai (WXT naming convention)
│                                      #   - MutationObserver for response detection
│                                      #   - Response HTML extraction
│                                      #   - Structured feedback injection into ProseMirror
│
├── lib/
│   ├── types.ts                       # Shared TypeScript types (Annotation, Message, etc.)
│   ├── formatter.ts                   # Annotations → structured feedback text
│   └── platforms/
│       └── claude.ts                  # claude.ai DOM selectors and extraction/injection logic
│
└── public/
    └── icons/                         # Extension icons (16, 32, 48, 128px)
```

**WXT conventions:**
- Files in `entrypoints/` are auto-discovered. `background.ts` becomes the service worker, `sidepanel/index.html` becomes the side panel, `content/claude.ts` becomes a content script.
- Files in `lib/` and `components/` are shared utilities, not entrypoints.
- WXT auto-generates the manifest from entrypoint metadata and `wxt.config.ts`.

---

## 4. Component Architecture

### Component tree

```
App.tsx
├── StatusBar                    # "Connected to claude.ai" / "Waiting for response..."
├── ResponseView                 # The AI response with annotation overlays
│   └── (rendered HTML with <mark> and <del> wrappers)
├── AnnotationToolbar            # Floating toolbar (appears on text selection)
│   ├── ✓ Highlight button
│   ├── ✗ Strikethrough button
│   └── ↺ Clear button (when selection overlaps existing annotation)
├── AnnotationList               # "3 highlights, 1 strikethrough" + item list
│   └── AnnotationItem × N      # Each annotation with type icon + text preview + delete
└── FeedbackPreview              # Shown when user clicks "Apply"
    ├── Preview text (read-only)
    ├── "Inject" button
    └── "Cancel" button
```

### Component responsibilities

| Component | Input | Output | Key behavior |
|-----------|-------|--------|-------------|
| **App** | Messages from background | — | Listens for `RESPONSE_READY` messages, manages top-level state |
| **StatusBar** | Connection state signal | — | Shows platform detection status and response state |
| **ResponseView** | Response HTML + annotations signal | Selection events | Renders sanitized HTML, overlays annotations as `<mark>`/`<del>` wrappers, emits text selection events |
| **AnnotationToolbar** | Selection position + overlap state | Annotation actions | Positions near selection, dispatches addAnnotation/removeAnnotation |
| **AnnotationList** | Annotations signal | Remove actions | Displays all annotations, click-to-scroll, delete buttons |
| **FeedbackPreview** | Annotations signal | Inject/cancel | Formats annotations into structured text, shows preview, dispatches inject message |

### Data flow

```
claude.ai DOM
    ↓ (MutationObserver detects response completion)
Content Script (claude.ts)
    ↓ (chrome.runtime.sendMessage)
Background (background.ts)
    ↓ (relay)
Side Panel (App.tsx)
    ↓ (updates currentResponse signal)
ResponseView
    ↓ (user selects text)
AnnotationToolbar
    ↓ (user clicks ✓ or ✗)
annotations signal updates
    ↓ (user clicks "Apply")
FeedbackPreview
    ↓ (user clicks "Inject")
Background (relay)
    ↓ (chrome.tabs.sendMessage)
Content Script (claude.ts)
    ↓ (injects into ProseMirror)
claude.ai text box
```

---

## 5. State Management

All state lives in Preact Signals, defined in `state/annotations.ts`. Signals provide fine-grained reactivity — when one annotation changes, only the components reading that specific data re-render.

### State model

```typescript
// lib/types.ts

interface Annotation {
  id: string;                          // crypto.randomUUID()
  type: 'highlight' | 'strikethrough'; // V1.1 adds: 'deeper' | 'question'
  text: string;                        // The selected text
  startOffset: number;                 // Character offset in response text
  endOffset: number;                   // Character offset in response text
  createdAt: number;                   // Date.now()
}

interface ResponseData {
  html: string;                        // Sanitized HTML from claude.ai
  text: string;                        // Plain text (for offset calculations)
  messageId: string;                   // Unique ID for this response
  timestamp: number;
}

type ConnectionStatus = 'disconnected' | 'connected' | 'streaming' | 'ready';

// Message types for chrome.runtime messaging
type Message =
  | { type: 'RESPONSE_STREAMING'; html: string; messageId: string }
  | { type: 'RESPONSE_READY'; html: string; text: string; messageId: string }
  | { type: 'INJECT_FEEDBACK'; feedback: string }
  | { type: 'CONNECTION_STATUS'; status: ConnectionStatus };
```

### Signals

```typescript
// state/annotations.ts

import { signal, computed, batch } from '@preact/signals';

// Core state
export const annotations = signal<Annotation[]>([]);
export const currentResponse = signal<ResponseData | null>(null);
export const connectionStatus = signal<ConnectionStatus>('disconnected');
export const showPreview = signal(false);

// Derived state (auto-updates when dependencies change)
export const highlights = computed(() =>
  annotations.value.filter(a => a.type === 'highlight')
);
export const strikethroughs = computed(() =>
  annotations.value.filter(a => a.type === 'strikethrough')
);
export const hasAnnotations = computed(() =>
  annotations.value.length > 0
);

// Actions
export function addAnnotation(
  type: Annotation['type'],
  text: string,
  startOffset: number,
  endOffset: number
) {
  // Remove any overlapping annotations first
  const filtered = annotations.value.filter(
    a => a.endOffset <= startOffset || a.startOffset >= endOffset
  );
  annotations.value = [...filtered, {
    id: crypto.randomUUID(),
    type,
    text,
    startOffset,
    endOffset,
    createdAt: Date.now(),
  }];
}

export function removeAnnotation(id: string) {
  annotations.value = annotations.value.filter(a => a.id !== id);
}

export function clearAnnotations() {
  annotations.value = [];
}

export function setResponse(data: ResponseData) {
  batch(() => {
    currentResponse.value = data;
    annotations.value = [];  // Clear annotations for new response
    showPreview.value = false;
  });
}
```

**Key patterns:**
- Array updates always create new arrays (spread, filter) — signals detect changes by reference.
- `batch()` groups multiple signal updates into one render cycle.
- `computed()` values only recalculate when their dependencies change.
- Overlap removal happens in `addAnnotation` — new annotation replaces any overlapping ones.

---

## 6. Messaging Architecture

The side panel cannot directly message content scripts. All communication routes through the background service worker.

```
Content Script  ──→  Background  ──→  Side Panel
Content Script  ←──  Background  ←──  Side Panel
```

### Message flow: Response detected

```
1. Content script (claude.ts):
   chrome.runtime.sendMessage({ type: 'RESPONSE_READY', html, text, messageId })

2. Background (background.ts):
   // No relay needed — side panel receives runtime messages directly
   // (Side panel is an extension page, so chrome.runtime.onMessage works)

3. Side panel (App.tsx):
   chrome.runtime.onMessage.addListener((msg) => {
     if (msg.type === 'RESPONSE_READY') setResponse(msg);
   });
```

### Message flow: Inject feedback

```
1. Side panel:
   chrome.runtime.sendMessage({ type: 'INJECT_FEEDBACK', feedback })

2. Background (background.ts):
   // Must relay to content script via chrome.tabs.sendMessage
   chrome.runtime.onMessage.addListener((msg) => {
     if (msg.type === 'INJECT_FEEDBACK') {
       chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
         if (tab?.id) chrome.tabs.sendMessage(tab.id, msg);
       });
     }
   });

3. Content script (claude.ts):
   chrome.runtime.onMessage.addListener((msg) => {
     if (msg.type === 'INJECT_FEEDBACK') injectIntoTextBox(msg.feedback);
   });
```

**Why this asymmetry?**
- Content script → Side panel: `chrome.runtime.sendMessage` reaches all extension pages (side panel is one). No relay needed.
- Side panel → Content script: `chrome.runtime.sendMessage` does NOT reach content scripts. Must use `chrome.tabs.sendMessage(tabId)` which requires the background to look up the active tab.

---

## 7. Platform Integration — claude.ai

### DOM selectors

These are reverse-engineered from open-source extensions and subject to change. The extension should handle selector failures gracefully.

```typescript
// lib/platforms/claude.ts

export const SELECTORS = {
  // Response detection
  responseStreaming: '[data-is-streaming="true"]',
  responseComplete: '[data-is-streaming="false"]',

  // Response content (fallback chain)
  responseContent: [
    '.font-claude-message',
    '[data-testid*="message"]',
    '.prose',
    '[class*="markdown"]',
  ],

  // User messages (to distinguish from assistant)
  userMessage: '[data-testid="user-message"]',

  // Text input (ProseMirror)
  inputEditor: 'div.ProseMirror[contenteditable="true"]',
  inputContainer: 'fieldset > div.cursor-text',

  // Streaming state
  stopButton: 'button[aria-label*="Stop"], button[title*="Stop"]',
};
```

### Response extraction

```typescript
export function extractLatestResponse(): { html: string; text: string } | null {
  // Get all completed response containers
  const responses = document.querySelectorAll(SELECTORS.responseComplete);
  if (responses.length === 0) return null;

  const latest = responses[responses.length - 1];

  // Find content within the container
  const content = findContentElement(latest);
  if (!content) return null;

  return {
    html: content.innerHTML,
    text: content.textContent || '',
  };
}
```

### Streaming detection

The content script uses a MutationObserver to watch for the `data-is-streaming` attribute transitioning from `"true"` to `"false"`:

```typescript
// Watch for streaming completion
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'attributes' &&
        mutation.attributeName === 'data-is-streaming') {
      const target = mutation.target as HTMLElement;
      if (target.getAttribute('data-is-streaming') === 'false') {
        // Response complete — extract and send
        debounce(() => {
          const response = extractLatestResponse();
          if (response) {
            chrome.runtime.sendMessage({
              type: 'RESPONSE_READY',
              ...response,
              messageId: crypto.randomUUID(),
            });
          }
        }, 500);  // Brief debounce to ensure DOM is settled
      }
    }
  }
});

observer.observe(document.body, {
  attributes: true,
  attributeFilter: ['data-is-streaming'],
  subtree: true,
});
```

### Text injection (ProseMirror)

claude.ai uses ProseMirror for its text input. You cannot simply set `.textContent` — ProseMirror maintains its own document model.

```typescript
export function injectIntoTextBox(text: string): boolean {
  const editor = document.querySelector(SELECTORS.inputEditor);
  if (!editor) return false;

  // Create paragraph elements (ProseMirror expects <p> children)
  const lines = text.split('\n');
  for (const line of lines) {
    const p = document.createElement('p');
    p.textContent = line;
    editor.appendChild(p);
  }

  // Dispatch input event so ProseMirror syncs its internal state
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}
```

### SPA navigation handling

claude.ai is a single-page app. When the user navigates between conversations, the URL changes but no full page reload occurs. The content script must detect route changes and re-initialize:

```typescript
// Watch for URL changes (SPA navigation)
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    // Re-scan for responses, reset state
    chrome.runtime.sendMessage({ type: 'CONNECTION_STATUS', status: 'connected' });
  }
});
urlObserver.observe(document.body, { childList: true, subtree: true });
```

---

## 8. Annotation UX

### Floating toolbar

When the user selects text in the ResponseView, a floating toolbar appears near the selection:

```
┌─────────────────┐
│  ✓   ✗   ↺     │
└─────────────────┘
```

| Icon | Color | Action | When visible |
|------|-------|--------|-------------|
| **✓** | Green (#22c55e) | Highlight — carry forward | Always (when text selected) |
| **✗** | Red (#ef4444) | Strikethrough — discard | Always (when text selected) |
| **↺** | Gray (#9ca3af) | Clear annotation | Only when selection overlaps existing annotation |

**Positioning:** The toolbar appears above the selection, centered horizontally. Uses `position: fixed` with coordinates from `Range.getBoundingClientRect()`. If too close to the top of the panel, it appears below the selection instead.

**Dismissal:** The toolbar disappears when the user clicks outside, makes a new selection, or scrolls.

### Visual treatment of annotations

| Annotation | Visual |
|------------|--------|
| **Highlight** | `background-color: rgba(34, 197, 94, 0.2)` (light green), `border-left: 3px solid #22c55e` |
| **Strikethrough** | `text-decoration: line-through`, `opacity: 0.5`, `background-color: rgba(239, 68, 68, 0.1)` (light red) |

Annotations are rendered by wrapping the annotated text ranges in `<mark>` (highlight) or `<del>` (strikethrough) elements within the ResponseView.

### Annotation list

Below the response view, a collapsible list shows all annotations:

```
Annotations (3 highlights, 1 strikethrough)
─────────────────────────────────────
✓  "The stateless API approach eliminates..."     [×]
✓  "Token cost is approximately 2.5-3x..."        [×]
✓  "Each model benefits from..."                  [×]
✗  "For straightforward questions..."             [×]
```

- Each item shows the annotation type icon, a text preview (truncated), and a delete button.
- Clicking an item scrolls the ResponseView to that annotation.
- Clicking the delete button removes the annotation.

### Removing annotations — three mechanisms

1. **Click annotated text** → toolbar appears with ↺ (clear) button
2. **Click an annotation** in the ResponseView → toggles it off directly
3. **Click delete** in the AnnotationList → removes by ID

### Apply flow

1. User clicks **"Apply annotations"** button (below the annotation list)
2. **FeedbackPreview** panel slides in, showing the structured text that will be injected
3. User reviews the preview
4. **"Inject into text box"** sends the text to the content script → ProseMirror
5. **"Cancel"** closes the preview, annotations remain
6. After injection, annotations remain visible until the next AI response auto-loads

---

## 9. Structured Feedback Format

When the user clicks Apply, annotations are converted to structured text. This text gets injected into claude.ai's text box above whatever the user types next.

### Format

```
[Feedback on your previous response]

KEEP — I found these points valuable:
- "The stateless API approach eliminates complexity of managing separate threads..."
- "Token cost is approximately 2.5-3x, not the naive 4x..."

DROP — Please disregard or reconsider:
- "For straightforward questions this adds no value..." (not relevant to our discussion)

[Your message below]
```

### Rules

- **Highlighted text** → listed under "KEEP"
- **Struck-through text** → listed under "DROP"
- If only highlights exist, the "DROP" section is omitted (and vice versa)
- Text is quoted verbatim from the selection
- Selections longer than 200 characters are truncated with "..."
- A separator line signals where the user's own message begins

### Formatter logic

```typescript
// lib/formatter.ts

export function formatFeedback(annotations: Annotation[]): string {
  const highlights = annotations.filter(a => a.type === 'highlight');
  const strikethroughs = annotations.filter(a => a.type === 'strikethrough');

  const parts: string[] = ['[Feedback on your previous response]\n'];

  if (highlights.length > 0) {
    parts.push('KEEP — I found these points valuable:');
    for (const h of highlights) {
      parts.push(`- "${truncate(h.text, 200)}"`);
    }
    parts.push('');
  }

  if (strikethroughs.length > 0) {
    parts.push('DROP — Please disregard or reconsider:');
    for (const s of strikethroughs) {
      parts.push(`- "${truncate(s.text, 200)}"`);
    }
    parts.push('');
  }

  parts.push('[Your message below]');
  return parts.join('\n');
}
```

---

## 10. Extensibility

### Adding V1.1 annotation types

The architecture supports new annotation types with minimal changes:

**1. Add to the type union:**
```typescript
type: 'highlight' | 'strikethrough' | 'deeper' | 'question'
```

**2. Add a toolbar button:**
```tsx
// AnnotationToolbar.tsx — add to the button array
{ type: 'deeper', icon: '⤵', color: '#3b82f6', label: 'Dig deeper' }
{ type: 'question', icon: '?', color: '#f59e0b', label: 'Verify this' }
```

**3. Add visual treatment:**
```css
/* annotations.css */
.annotation-deeper { border-left: 3px solid #3b82f6; background: rgba(59, 130, 246, 0.1); }
.annotation-question { border-left: 3px solid #f59e0b; background: rgba(245, 158, 11, 0.1); }
```

**4. Add to the formatter:**
```typescript
// New sections in structured feedback
'EXPLORE DEEPER — I want to go deeper on these points:'
'VERIFY — I'm not sure about these claims:'
```

### Adding new platforms

Each platform needs:

1. A new content script: `entrypoints/content/chatgpt.ts` (or `grok.ts`, `gemini.ts`)
2. A new selectors file: `lib/platforms/chatgpt.ts`
3. Updated `wxt.config.ts` matches (or content script `matches` metadata)

The side panel, state management, and formatter are platform-agnostic — they receive HTML and emit text. Only the content scripts are platform-specific.

---

## 11. Known Risks & Mitigations

### Selector fragility

**Risk:** claude.ai updates its DOM structure, breaking response detection or text injection.

**Mitigation:**
- Use `data-is-streaming` as the primary selector (most stable — it's a semantic attribute, not a styling class)
- Implement a fallback chain for content selectors (try multiple selectors in order)
- Fail gracefully — show "Could not detect response" in the side panel, allow manual refresh
- Future: consider remote selector config (hosted JSON file) so selectors can be updated without republishing the extension

### ProseMirror injection

**Risk:** ProseMirror's internal document model may not sync with DOM manipulation, especially after claude.ai updates.

**Mitigation:**
- Use the established pattern: create `<p>` elements + dispatch `input` event (proven in multiple open-source extensions)
- If injection fails, show the structured text in a copyable format so the user can paste manually
- Test injection after every claude.ai update

### SPA navigation

**Risk:** claude.ai's single-page navigation means the content script's state can become stale when switching conversations.

**Mitigation:**
- Monitor URL changes via MutationObserver
- Re-scan for responses on navigation
- Send `CONNECTION_STATUS` updates to the side panel

### Text offset drift

**Risk:** Annotation offsets (start/end character positions) may not match after the response HTML is re-rendered in the side panel.

**Mitigation:**
- Compute offsets relative to the side panel's own rendered text, not the original page DOM
- Use the side panel's text content as the single source of truth for offset calculations

### Extension review

**Risk:** Chrome Web Store review may flag permissions or behavior.

**Mitigation:**
- Minimal permissions: `sidePanel`, `activeTab` only
- No network requests, no data collection
- All processing is client-side
- Clear privacy description in the store listing

---

*This document captures the complete extension architecture as of February 21, 2026. It is implementation-ready — a developer can build from this document and the parent design doc (docs/design.md) without additional context.*
