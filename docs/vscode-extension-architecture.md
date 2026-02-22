# Recurate Annotator — VS Code Extension Architecture

**Status:** Built and working
**Date:** February 21, 2026
**Target:** Claude Code in VS Code terminal

> **See also:** [Chrome Extension Architecture](extension-architecture.md) for the web-based LLM chat variant.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [How It Captures Claude Code Output](#how-it-captures-claude-code-output)
5. [Component Architecture](#component-architecture)
6. [State Management](#state-management)
7. [Messaging Architecture](#messaging-architecture)
8. [Sidebar Persistence](#sidebar-persistence)
9. [Response History](#response-history)
10. [Feedback Delivery](#feedback-delivery)
11. [Shared Code with Chrome Extension](#shared-code-with-chrome-extension)
12. [Build System](#build-system)
13. [Known Risks & Mitigations](#known-risks--mitigations)

---

## 1. Overview

The Recurate Annotator VS Code Extension brings the same annotation UX as the Chrome extension to the Claude Code terminal workflow. A VS Code sidebar watches Claude Code's conversation files, renders assistant text responses with full markdown formatting, and lets users annotate with highlight (keep) and strikethrough (drop). Feedback auto-copies to clipboard on every annotation change — the user pastes into Claude Code when ready.

**Core loop:**

1. Claude Code writes to a JSONL conversation file → `fs.watch()` fires → watcher reads the file tail
2. Watcher extracts the latest assistant text → extension host converts markdown to HTML via `marked`
3. HTML sent to webview sidebar via `postMessage`
4. User annotates (highlight / strikethrough) via floating toolbar
5. `formatFeedback()` generates structured KEEP/DROP text → auto-copies to clipboard
6. User pastes (`Cmd+V` / `Ctrl+V`) into Claude Code terminal

**Key difference from Chrome extension:** The Chrome extension captures AI output by reading the DOM and injects feedback into the platform's text box. The VS Code extension captures output from JSONL files and delivers feedback via clipboard. The annotation UI is identical.

---

## 2. Tech Stack

| Component | Technology | Why |
|-----------|------------|-----|
| **Extension host** | VS Code Extension API (Node.js) | Native extension platform for VS Code sidebar |
| **Extension host bundler** | esbuild | Fast, zero-config, produces single CJS file |
| **Sidebar UI** | Preact + Preact Signals | Same 4KB runtime and fine-grained reactivity as Chrome extension — shared components |
| **Sidebar bundler** | Vite with @preact/preset-vite | Fast builds, handles JSX transform, outputs hashed assets |
| **Markdown rendering** | marked (~30KB) | Converts JSONL text content to HTML before sending to webview |
| **Language** | TypeScript | All code — extension host, webview, and shared types |

### Why not other approaches for capturing Claude Code output?

- **Terminal API (`onDidWriteTerminalData`):** Proposed/unstable, not in stable VS Code API. Would capture raw terminal output (ANSI codes, formatting) rather than structured message data.
- **Claude Code hooks:** Capture tool events (file reads, edits), not text responses. The text reasoning is where annotation adds value.
- **Clipboard monitoring:** Would require the user to manually copy each response.

**JSONL file watching is the clear winner** — reliable, stable, gives structured message data with text, timestamps, and message IDs.

---

## 3. Project Structure

```
extensions/vscode/
├── package.json                       # VS Code extension manifest
├── tsconfig.json                      # TypeScript configuration
├── vite.config.ts                     # Vite build config for webview
├── .gitignore                         # node_modules, dist, *.vsix
│
├── src/                               # Extension host (Node.js)
│   ├── extension.ts                   # Activation, registers sidebar, wires up messaging
│   ├── jsonlWatcher.ts                # Watches JSONL files, extracts assistant text
│   ├── webviewProvider.ts             # WebviewViewProvider — manages sidebar lifecycle
│   └── clipboard.ts                   # Copies feedback to system clipboard
│
├── webview/                           # Sidebar UI (Preact, runs in browser sandbox)
│   ├── index.html                     # Webview entry HTML
│   ├── main.tsx                       # Preact render mount
│   ├── App.tsx                        # Root component — state wiring, auto-copy, navigation
│   ├── messaging.ts                   # acquireVsCodeApi() postMessage adapter
│   ├── vscode.d.ts                    # Type declaration for acquireVsCodeApi
│   ├── components/
│   │   ├── ResponseView.tsx           # Renders response with DOM overlay annotations
│   │   ├── AnnotationToolbar.tsx      # Floating ✓ / ✗ / ↺ toolbar
│   │   ├── AnnotationList.tsx         # Annotation summary with delete buttons
│   │   └── StatusBar.tsx              # Connection status indicator
│   ├── state/
│   │   └── annotations.ts            # Preact Signals — annotation + response history state
│   └── styles/
│       ├── sidepanel.css              # Layout, typography, navigation, clipboard indicator
│       └── annotations.css           # Highlight/strikethrough visual treatment
│
├── shared/                            # Shared between extension host + webview
│   ├── types.ts                       # TypeScript types (Annotation, ResponseData, messages)
│   └── formatter.ts                   # Annotations → KEEP/DROP feedback text
│
├── dist/                              # Build output
│   ├── extension.js                   # Extension host bundle (~81 KB)
│   └── webview/assets/
│       ├── index-*.js                 # Webview JS (~28.5 KB)
│       └── index-*.css                # Webview CSS (~6 KB)
│
└── .vscode/
    └── launch.json                    # F5 debugging configuration
```

---

## 4. How It Captures Claude Code Output

### JSONL file format

Claude Code saves all conversations as JSONL files at:

```
~/.claude/projects/<encoded-path>/<session-id>.jsonl
```

**Path encoding:** The workspace filesystem path is encoded by replacing `/` with `-`. For example:
- `/Users/foo/myproject` → `-Users-foo-myproject`

Each line in a JSONL file is a JSON object. Assistant text messages look like:

```json
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [
      { "type": "text", "text": "Here's what I found..." },
      { "type": "tool_use", "name": "Read", "input": { "file_path": "..." } }
    ]
  },
  "timestamp": "2026-02-21T19:55:25.021Z",
  "uuid": "abc123-..."
}
```

The watcher filters for `type: "assistant"` messages → content blocks with `type: "text"` → extracts `.text`. Blocks with `type: "tool_use"`, `type: "thinking"`, and `type: "tool_result"` are ignored. **Text is where Claude reasons and makes claims — where annotation adds the most value.**

### Project directory resolution

The watcher derives the Claude project directory from the VS Code workspace path:

1. Encode the workspace path: `/Users/foo/myproject` → `-Users-foo-myproject`
2. Check if `~/.claude/projects/-Users-foo-myproject/` exists
3. If not found, walk up parent directories — so subfolders of a project still work
4. If no matching directory exists, poll every 5 seconds (the directory is created when Claude Code first runs in that project)

```typescript
private findProjectDir(claudeDir: string, workspacePath: string): string | null {
  let current = workspacePath;
  const root = path.parse(current).root;
  while (current && current !== root) {
    const encoded = encodeProjectPath(current);
    const candidate = path.join(claudeDir, encoded);
    if (fs.existsSync(candidate)) return candidate;
    current = path.dirname(current);
  }
  return null;
}
```

### File watching and tail reading

- Uses `fs.watch()` on the project directory (falls back to polling at 2-second intervals if watch fails)
- On change: finds the most recently modified `.jsonl` file
- **Reads only the last 64KB** of the file — sessions can be 25MB+, but the latest assistant message is always near the end
- Walks backwards through lines to find the most recent assistant text messages
- Keeps the last 5 responses in history

```typescript
function readTail(filePath: string, bytes: number = 64 * 1024): string {
  const stat = fs.statSync(filePath);
  if (stat.size <= bytes) return fs.readFileSync(filePath, 'utf-8');

  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(bytes);
  fs.readSync(fd, buffer, 0, bytes, stat.size - bytes);
  fs.closeSync(fd);

  const text = buffer.toString('utf-8');
  // Skip the first partial line (we likely landed mid-line)
  const firstNewline = text.indexOf('\n');
  return firstNewline >= 0 ? text.slice(firstNewline + 1) : text;
}
```

### Markdown to HTML conversion

Unlike the Chrome extension (which receives pre-rendered HTML from the DOM), the VS Code extension receives plain text with markdown from the JSONL file. The extension host converts markdown to HTML using `marked` before sending to the webview:

```typescript
watcher.onResponse(async (response) => {
  const html = await marked.parse(response.text);
  provider.postMessage({
    type: 'RESPONSE_READY',
    html,
    text: response.text,
    messageId: response.messageId,
  });
});
```

---

## 5. Component Architecture

### Component tree

```
App.tsx
├── StatusBar                    # "Connected" / "Watching" / "Not connected"
├── Response navigation          # "‹ 3 of 5 ›" (when multiple responses exist)
├── ResponseView                 # The AI response with annotation overlays
│   └── (rendered HTML with <mark> and <del> wrappers via DOM overlay)
├── AnnotationToolbar            # Floating toolbar (appears on text selection)
│   ├── ✓ Highlight button
│   ├── ✗ Strikethrough button
│   └── ↺ Clear button (when selection overlaps existing annotation)
├── AnnotationList               # "3 highlights, 1 strikethrough" + item list
│   └── AnnotationItem × N      # Each annotation with type icon + text preview + delete
└── Clipboard indicator          # "Feedback copied to clipboard" (when annotations exist)
```

### Component responsibilities

| Component | Input | Output | Key behavior |
|-----------|-------|--------|-------------|
| **App** | Messages from extension host | COPY_FEEDBACK, WEBVIEW_READY | Listens for messages, auto-copies feedback on annotation change, manages navigation |
| **StatusBar** | `connectionStatus` signal | — | Shows file watcher state |
| **ResponseView** | `currentResponse` signal + `annotations` signal | Selection events | Renders HTML, overlays annotations as `<mark>`/`<del>` wrappers |
| **AnnotationToolbar** | Selection position + overlap state | Annotation actions | Positions near selection, dispatches addAnnotation/removeAnnotation |
| **AnnotationList** | `annotations` signal | Remove actions | Displays all annotations, click-to-scroll, delete buttons |
| **Clipboard indicator** | `hasAnnotations` signal | — | Shows green indicator when feedback has been copied |

---

## 6. State Management

All state lives in Preact Signals, defined in `webview/state/annotations.ts`. Signals provide fine-grained reactivity — when one annotation changes, only the components reading that specific data re-render.

### State model

```typescript
// Core state
export const annotations = signal<Annotation[]>([]);
export const responseHistory = signal<ResponseData[]>([]);
export const currentIndex = signal(0);
export const connectionStatus = signal<ConnectionStatus>('disconnected');

// Derived state
export const currentResponse = computed(() =>
  responseHistory.value.length > 0 ? responseHistory.value[currentIndex.value] : null
);
export const canGoNewer = computed(() => currentIndex.value > 0);
export const canGoOlder = computed(() => currentIndex.value < responseHistory.value.length - 1);
export const hasAnnotations = computed(() => annotations.value.length > 0);
```

### Key actions

- `addResponse(data)` — Adds a new response to the front of history. Deduplicates by `messageId`. Clears annotations.
- `setHistory(items)` — Replaces entire history (used on reconnect/resend). Clears annotations.
- `goNewer()` / `goOlder()` — Navigate between responses. Clears annotations on navigation.
- `addAnnotation(type, text, start, end)` — Adds annotation, removes overlapping ones first.
- `removeAnnotation(id)` — Removes by ID.

---

## 7. Messaging Architecture

The extension uses VS Code's `postMessage` API for bidirectional communication between the extension host (Node.js) and the webview sidebar (browser sandbox).

```
Extension Host (Node.js)
  ├── JSONLWatcher ──→ onResponse/onHistory callbacks
  │                          ↓
  ├── extension.ts ──→ marked.parse() ──→ provider.postMessage()
  │                                              ↓
  │                                    ┌─────────↓─────────┐
  │                                    │  Webview Sidebar   │
  │                                    │                    │
  │                                    │  window.addEventListener('message')
  │                                    │       ↓            │
  │                                    │  App.tsx processes  │
  │                                    │  RESPONSE_READY    │
  │                                    │  RESPONSE_HISTORY  │
  │                                    │  CONNECTION_STATUS │
  │                                    │       ↓            │
  │                                    │  vscode.postMessage()
  │                                    └────────↓──────────┘
  │                                             ↓
  ├── webviewView.webview.onDidReceiveMessage()
  │       ↓
  ├── COPY_FEEDBACK ──→ clipboard.ts ──→ vscode.env.clipboard.writeText()
  └── WEBVIEW_READY ──→ watcher.resend()
```

### Message types

```typescript
type ExtensionMessage =
  | { type: 'RESPONSE_READY'; html: string; text: string; messageId: string }
  | { type: 'RESPONSE_HISTORY'; responses: ResponseHistoryItem[] }
  | { type: 'COPY_FEEDBACK'; feedback: string }
  | { type: 'CONNECTION_STATUS'; status: ConnectionStatus }
  | { type: 'THEME_CHANGED'; theme: Theme }
  | { type: 'WEBVIEW_READY' };
```

### Messaging adapter

The Chrome extension uses `browser.runtime.sendMessage()` for inter-component messaging. The VS Code extension replaces this with a thin adapter around `acquireVsCodeApi()`:

```typescript
const vscode = acquireVsCodeApi();

export function sendMessage(message: ExtensionMessage): void {
  vscode.postMessage(message);
}

export function onMessage(handler: (message: ExtensionMessage) => void): () => void {
  const listener = (event: MessageEvent) => handler(event.data);
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
```

This adapter is the primary difference between the Chrome and VS Code webview code. All other components (`ResponseView`, `AnnotationToolbar`, etc.) work identically in both extensions.

---

## 8. Sidebar Persistence

**Problem:** VS Code destroys webviews when the sidebar is hidden (user switches to Explorer, Source Control, etc.). When the user returns to the Recurate sidebar, a fresh webview is created with no state.

**Solution: WEBVIEW_READY handshake**

1. When the webview's Preact app mounts, it sends `{ type: 'WEBVIEW_READY' }` to the extension host
2. The extension host listens for this message in `onDidReceiveMessage`
3. On receiving WEBVIEW_READY, it calls the `onReadyCallback` (set up by `extension.ts`)
4. The callback calls `watcher.resend()`, which re-sends the current connection status and full response history
5. The webview receives `RESPONSE_HISTORY` and restores to its previous state

```typescript
// webviewProvider.ts — listens for ready signal
webviewView.webview.onDidReceiveMessage((message) => {
  if (message.type === 'WEBVIEW_READY') {
    this.onReadyCallback?.();
  }
});

// extension.ts — wires up resend on ready
provider.onReady(() => {
  watcher.resend();
});

// jsonlWatcher.ts — re-sends cached state
resend(): void {
  this.onStatusCallback?.(this.currentStatus);
  if (this.responseHistory.length > 0) {
    this.onHistoryCallback?.(this.responseHistory);
  }
}
```

**Why not queue messages?** An earlier approach queued messages and flushed them in `resolveWebviewView`. This failed because `resolveWebviewView` fires when VS Code creates the webview element, but the Preact script hasn't loaded yet — flushed messages are lost. The WEBVIEW_READY handshake ensures messages are only sent after the script is actually listening.

---

## 9. Response History

The VS Code extension keeps the last 5 assistant responses with back/forward navigation.

**Why history matters for VS Code (but not Chrome):** The Chrome extension receives a new response every time the AI finishes streaming — the user is typically watching in real time. In the Claude Code workflow, the user may open the sidebar after several exchanges have already happened. History lets them annotate any recent response.

### How it works

1. **Watcher side:** `extractRecentAssistantTexts(filePath, 5)` reads the file tail and walks backwards to find the last 5 assistant text messages
2. **Extension host:** Converts all 5 responses to HTML via `marked`, sends as `RESPONSE_HISTORY`
3. **Webview state:** `responseHistory` signal stores up to 5 `ResponseData` objects (newest first), `currentIndex` signal tracks which one is displayed
4. **Navigation UI:** `‹ 3 of 5 ›` bar with back/forward buttons. Annotations clear when navigating between responses.

---

## 10. Feedback Delivery

### Auto-copy to clipboard

Every annotation change triggers an automatic clipboard copy. There is no manual "Copy" button.

```typescript
// App.tsx — auto-copy effect
const annotationList = annotations.value;
useEffect(() => {
  if (annotationList.length > 0) {
    const feedback = formatFeedback(annotationList);
    if (feedback) {
      sendMessage({ type: 'COPY_FEEDBACK', feedback });
    }
  }
}, [annotationList]);
```

When the extension host receives `COPY_FEEDBACK`:

```typescript
// clipboard.ts
export async function copyFeedbackToClipboard(feedback: string): Promise<void> {
  await vscode.env.clipboard.writeText(feedback);
  vscode.window.showInformationMessage('Feedback copied — paste into Claude Code');
}
```

The sidebar shows a green "Feedback copied to clipboard" indicator when annotations exist.

### Feedback format

The KEEP/DROP format is identical to the Chrome extension:

```
[Feedback on your previous response]

KEEP — I found these points valuable:
- "The stateless API approach eliminates complexity..."
- "Token cost is approximately 2.5-3x..."

DROP — Please disregard or reconsider:
- "For straightforward questions this adds no value..."

[Your message below]
```

### Why clipboard (not terminal injection)?

**V1 uses clipboard** for safety:
- No risk of sending text to the wrong terminal
- No risk of disrupting an active Claude Code session
- No ambiguity about when to inject
- User controls exactly when to paste

Terminal injection via `Terminal.sendText()` could be a V2 enhancement once the basic flow is validated.

---

## 11. Shared Code with Chrome Extension

The Chrome and VS Code extensions share ~70% of their UI code:

| Component | Shared? | Notes |
|-----------|---------|-------|
| `ResponseView.tsx` | 95% | Works as-is in both |
| `AnnotationToolbar.tsx` | 95% | Works as-is in both |
| `AnnotationList.tsx` | 100% | No platform APIs used |
| `StatusBar.tsx` | 90% | Different status labels ("Connected to claude.ai" vs "Connected") |
| `annotations.ts` (state) | 90% | VS Code version adds response history + navigation |
| `formatter.ts` | 100% | Pure function, zero dependencies |
| `types.ts` | 90% | VS Code adds `WEBVIEW_READY`, `RESPONSE_HISTORY` message types |
| `annotations.css` | 100% | Identical visual treatment |
| `sidepanel.css` | 90% | VS Code adds navigation bar + clipboard indicator styles |

### What's different

| Concern | Chrome Extension | VS Code Extension |
|---------|-----------------|-------------------|
| Data source | DOM extraction via content script | JSONL file watching |
| HTML acquisition | Pre-rendered from platform DOM | Markdown → HTML via `marked` |
| Messaging | `browser.runtime.sendMessage()` | `acquireVsCodeApi().postMessage()` |
| Feedback delivery | Auto-inject into platform text box | Auto-copy to clipboard |
| Response history | Latest response only | Last 5 with navigation |
| Lifecycle | Persistent (while side panel is open) | Destroyed/recreated on tab switch (WEBVIEW_READY handshake) |

---

## 12. Build System

### Extension host (esbuild)

```bash
esbuild src/extension.ts \
  --bundle \
  --outfile=dist/extension.js \
  --external:vscode \
  --format=cjs \
  --platform=node \
  --sourcemap
```

Produces a single `dist/extension.js` (~81 KB). The `vscode` module is externalized (provided by the VS Code runtime).

### Webview (Vite)

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [preact()],
  root: 'webview',
  build: {
    outDir: '../dist/webview',
    emptyOutDir: true,
  },
});
```

Produces hashed assets in `dist/webview/assets/`:
- `index-*.js` (~28.5 KB)
- `index-*.css` (~6 KB)

### Build commands

```bash
npm run compile              # Build everything
npm run compile:extension    # Extension host only
npm run compile:webview      # Webview only
npm run watch                # Watch mode (extension host only)
```

### Packaging

```bash
npx @vscode/vsce package --allow-missing-repository --allow-star-activation
# Produces recurate-annotator-vscode-0.1.0.vsix (~254 KB)
```

### Content Security Policy

The webview uses a strict CSP with nonce-based script loading:

```
default-src 'none';
style-src ${webview.cspSource} 'unsafe-inline';
script-src 'nonce-${nonce}';
```

This ensures only the Vite-built bundle can execute in the webview.

---

## 13. Known Risks & Mitigations

### JSONL format changes

**Risk:** Claude Code changes its JSONL format, breaking message extraction.

**Mitigation:** The watcher has a try/catch around JSON parsing and skips malformed lines. The message structure check (`entry.type === 'assistant' && entry.message?.role === 'assistant'`) is robust to additional fields. Monitor Claude Code releases for schema changes.

### Large JSONL files

**Risk:** Long sessions produce large JSONL files (25MB+). Reading the entire file on every change would be slow.

**Mitigation:** Tail reading — only the last 64KB is read. Assistant text messages are always near the end of the file. The `readTail()` function handles partial first lines correctly.

### Webview lifecycle

**Risk:** VS Code destroys and recreates webviews unpredictably. State could be lost between switches.

**Mitigation:** The WEBVIEW_READY handshake (Section 8) ensures state is always restored. The watcher keeps `responseHistory` and `currentStatus` in memory, and re-sends them on every webview mount.

### Workspace path resolution

**Risk:** The user opens a subfolder of a project, so the encoded path doesn't match any Claude project directory.

**Mitigation:** The watcher walks up parent directories to find a matching project dir. `/Users/foo/myproject/src` will match `-Users-foo-myproject` if that directory exists.

### Clipboard overwriting

**Risk:** Auto-copy overwrites the user's clipboard every time they annotate.

**Mitigation:** This is the intended behavior — the clipboard always has the latest feedback. Users who need to preserve clipboard contents can copy before annotating. A VS Code notification confirms each copy.

### No active session

**Risk:** The user opens the sidebar before starting Claude Code. No JSONL file exists yet.

**Mitigation:** The watcher polls every 5 seconds for the project directory to appear. Once found, it starts watching. The sidebar shows "Not connected" until a session is detected.

---

*This document captures the VS Code extension architecture as of February 21, 2026. The extension is built and working. For the Chrome extension variant, see [Chrome Extension Architecture](extension-architecture.md).*
