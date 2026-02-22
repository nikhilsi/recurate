# Recurate Annotator — VS Code Extension

Annotate Claude Code's text responses directly in VS Code. Same highlight/strikethrough UX as the Chrome extension, built for the terminal workflow.

## What It Does

A VS Code sidebar that watches Claude Code's conversation files and renders assistant text responses with full markdown formatting. You annotate, feedback auto-copies to clipboard, you paste into Claude Code.

- **Highlight** (green) — "Keep this"
- **Strikethrough** (red) — "Drop this"
- **Auto-copy** — Feedback copies to clipboard on every annotation change
- **Response history** — Last 5 responses with back/forward navigation

## How to Build

```bash
cd extensions/vscode
npm install
npm run compile              # Build extension host + webview
npm run compile:extension    # Build extension host only
npm run compile:webview      # Build webview only
npm run watch                # Watch mode for extension host
```

## How to Install

### Via .vsix (recommended for testing)

```bash
cd extensions/vscode
npm install
npm run compile
npx @vscode/vsce package --allow-missing-repository --allow-star-activation
code --install-extension recurate-annotator-vscode-0.1.0.vsix
```

Then reload VS Code (`Cmd+Shift+P` → "Reload Window").

### Via F5 (Extension Development Host)

1. Open `extensions/vscode/` in VS Code
2. Press F5 — launches a new VS Code window with the extension loaded
3. In the new window, open a project where you use Claude Code

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Extension Host (Node.js)                            │
│                                                      │
│  extension.ts                                        │
│  ├─ Registers WebviewViewProvider (sidebar)           │
│  ├─ Starts JSONLWatcher                              │
│  └─ Wires up message passing                         │
│                                                      │
│  jsonlWatcher.ts                                     │
│  ├─ Finds Claude project dir in ~/.claude/projects/  │
│  ├─ Watches *.jsonl files for changes (fs.watch)     │
│  ├─ Reads tail of file (64KB, not entire file)       │
│  ├─ Extracts assistant text messages                 │
│  └─ Keeps last 5 responses in history                │
│                                                      │
│  webviewProvider.ts                                  │
│  ├─ Manages sidebar lifecycle                        │
│  ├─ Serves built Preact app with CSP + nonce         │
│  └─ Listens for WEBVIEW_READY before sending state   │
│                                                      │
│  clipboard.ts                                        │
│  └─ Copies feedback to clipboard via vscode API      │
└────────────────────┬─────────────────────────────────┘
                     │ postMessage
┌────────────────────↓─────────────────────────────────┐
│  Webview Sidebar (Preact, runs in browser sandbox)   │
│                                                      │
│  App.tsx                                             │
│  ├─ Sends WEBVIEW_READY on mount                     │
│  ├─ Receives RESPONSE_READY / RESPONSE_HISTORY       │
│  ├─ Auto-copies feedback on annotation change        │
│  └─ Response navigation (back/forward)               │
│                                                      │
│  Components (same as Chrome extension):              │
│  ├─ ResponseView — HTML rendering + DOM annotations  │
│  ├─ AnnotationToolbar — floating toolbar             │
│  ├─ AnnotationList — annotation summary              │
│  └─ StatusBar — connection status                    │
│                                                      │
│  messaging.ts — acquireVsCodeApi() adapter           │
│  state/annotations.ts — Preact Signals state         │
└──────────────────────────────────────────────────────┘
```

### How It Captures Claude Code Output

Claude Code saves conversations as JSONL files at:
```
~/.claude/projects/<encoded-path>/<session-id>.jsonl
```

Path encoding: `/Users/foo/myproject` becomes `-Users-foo-myproject`

The watcher:
1. Encodes the workspace path and looks for it in `~/.claude/projects/`
2. If not found, walks up parent directories (so subfolders work)
3. Watches the directory with `fs.watch()` (falls back to polling)
4. On change, reads the last 64KB of the most recently modified `.jsonl` file
5. Walks backwards through lines to find the latest assistant text message
6. Extracts only `type: "text"` content blocks (ignores `tool_use`, `thinking`)
7. Converts markdown to HTML via `marked`, sends to webview

### Message Flow

1. Claude Code writes to `.jsonl` → `fs.watch` fires → watcher reads tail
2. Watcher extracts text → extension converts markdown → sends `RESPONSE_READY`
3. Webview renders in ResponseView with full formatting
4. User annotates → `formatFeedback()` generates KEEP/DROP text
5. Auto-copy: `COPY_FEEDBACK` sent to extension host → `vscode.env.clipboard.writeText()`
6. User pastes (`Cmd+V`) into Claude Code terminal

### Sidebar Persistence

VS Code destroys webviews when the sidebar is hidden. To handle this:
1. Webview sends `WEBVIEW_READY` message when its Preact app mounts
2. Extension host listens for this and calls `watcher.resend()`
3. Watcher re-sends current status + full response history
4. Sidebar restores to its previous state

## Key Files

| File | Purpose |
|------|---------|
| `src/extension.ts` | Activation, registers sidebar, wires everything up |
| `src/jsonlWatcher.ts` | Watches JSONL files, extracts assistant text |
| `src/webviewProvider.ts` | Manages webview sidebar lifecycle |
| `src/clipboard.ts` | Copies feedback to system clipboard |
| `shared/types.ts` | TypeScript types shared between host and webview |
| `shared/formatter.ts` | Formats annotations into KEEP/DROP text |
| `webview/App.tsx` | Root webview component |
| `webview/messaging.ts` | postMessage adapter (replaces Chrome's browser.runtime) |
| `webview/components/ResponseView.tsx` | Renders response with DOM overlay annotations |
| `webview/components/AnnotationToolbar.tsx` | Floating toolbar on text selection |
| `webview/state/annotations.ts` | Annotation state + response history (Preact Signals) |
| `vite.config.ts` | Vite build config for webview |
| `package.json` | Extension manifest (views, commands, activation) |

## Tech Stack

- **VS Code Webview API** — Sidebar panel
- **Preact + Preact Signals** — Webview UI (same components as Chrome extension)
- **esbuild** — Extension host bundler
- **Vite** — Webview bundler (with @preact/preset-vite)
- **marked** — Markdown to HTML conversion
- **TypeScript** — All code

## Build Output

- Extension host: `dist/extension.js` (~81 KB)
- Webview JS: `dist/webview/assets/index-*.js` (~28.5 KB)
- Webview CSS: `dist/webview/assets/index-*.css` (~6 KB)

## Scope

This extension focuses on **text output only** — Claude Code's reasoning, explanations, and claims. It intentionally ignores:
- Code blocks and file operations (tool_use blocks)
- Thinking blocks
- Tool results

Text is where Claude reasons and makes claims — where annotation adds the most value.
