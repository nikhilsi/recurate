# Changelog

All notable changes to this project will be documented in this file.

---

## [0.6.0] - 2026-02-21

### Added
- **Icons, logo & visual identity** — custom icon design and all generated assets
- Master SVG icon: circular arrows (re-curation cycle) + green checkmark (keep) + red strikethrough (drop) on indigo gradient background
- Chrome extension icons (16, 32, 48, 128px PNG) wired into manifest
- VS Code extension marketplace icon (128px PNG) and monochrome activity bar SVG
- Site logo (SVG) and favicon (32px PNG) enabled in mkdocs.yml
- Social card (1200x630 PNG) — icon + title + tagline + URL on dark slate background
- `scripts/generate-icons.mjs` — generates all PNG icons from master SVG via sharp
- `scripts/generate-social-card.mjs` — generates social card PNG from SVG via sharp

### Changed
- VS Code activity bar icon from generic `$(symbol-color)` codicon to custom monochrome SVG
- mkdocs.yml — logo and favicon now point to generated assets
- Chrome extension wxt.config.ts — manifest includes icon paths

### Notes
- Icon color palette: indigo (#4338CA → #6366F1 gradient), green keep (#34D399), red drop (#F87171)
- Social card follows tourgraph pattern (centered icon + title, colored divider, tagline, URL)
- All PNGs generated from SVG sources via sharp (reproducible, not hand-exported)

---

## [0.5.0] - 2026-02-21

### Added
- **VS Code extension** — annotate Claude Code's text responses directly in VS Code
- `extensions/vscode/` project with full build pipeline (esbuild + Vite)
- **JSONL file watcher** — monitors `~/.claude/projects/<encoded-path>/*.jsonl` for new Claude Code assistant responses
- Extracts text content blocks from assistant messages (ignores tool_use, thinking blocks)
- Markdown → HTML rendering via `marked` library
- **Webview sidebar** — same Preact + Signals annotation UI as Chrome extension
- **Auto-copy to clipboard** — annotations automatically copy KEEP/DROP feedback to clipboard on every change, no button needed
- **Response history** — keeps last 5 assistant responses with back/forward navigation (`‹ 3 of 5 ›`)
- **Sidebar persistence** — webview sends `WEBVIEW_READY` on mount, extension re-sends state; survives tab switches
- **Performance** — reads only last 64KB of JSONL file instead of entire file (sessions can be 25MB+)
- Parent directory walking — finds Claude project dir even when workspace is a subfolder
- VS Code theme detection (light/dark via body class)
- WebviewViewProvider with CSP, nonce-based script loading, asset discovery

### Architecture
- Extension host (Node.js): jsonlWatcher.ts, webviewProvider.ts, clipboard.ts, extension.ts
- Webview (Preact): App.tsx, ResponseView, AnnotationToolbar, AnnotationList, StatusBar
- messaging.ts adapter replaces Chrome's browser.runtime API with VS Code's postMessage
- Build: extension host 81 KB, webview 28.5 KB JS + 6 KB CSS

### Fixed
- Messages no longer dropped when sidebar opens after extension activation (WEBVIEW_READY handshake)
- Sidebar no longer shows "Not connected" after switching tabs (state re-sent on webview mount)
- Polling intervals properly cleaned up on dispose

### Notes
- ~70% of Chrome extension UI code reused (components, state, styles, formatter)
- JSONL watching chosen over terminal API (unstable) and hooks (tool events only)
- Tested end-to-end: annotate → auto-copy → paste into Claude Code

---

## [0.4.0] - 2026-02-21

### Added
- **ChatGPT (chat.com) support** — second platform, tested and working end-to-end
- `lib/platforms/chatgpt.ts` — ChatGPT DOM selectors, response extraction, ProseMirror injection
- `entrypoints/chatgpt.content.ts` — content script matching `chat.com/*` and `chatgpt.com/*`
- Streaming detection via stop button presence/absence (ChatGPT has no `data-is-streaming` attribute)
- Editor injection handles both `<textarea>` and `contenteditable` div (ChatGPT uses ProseMirror like claude.ai)
- Theme detection, SPA navigation handling, proactive feedback injection — same patterns as claude.ai

### Fixed
- ChatGPT editor detection — initial implementation assumed `<textarea>` but ChatGPT uses `div.ProseMirror#prompt-textarea[contenteditable]`

### Notes
- Extension now builds at 93 KB total (two content scripts + shared code)
- Zero changes to shared code (side panel, annotations, formatter, background, types)
- Updated extension architecture doc with ChatGPT platform section and proactive injection flow

---

## [0.3.0] - 2026-02-21

### Added
- **Annotation UX working end-to-end on claude.ai** — tested and validated with real conversations
- Auto-inject feedback into text box — annotations proactively appear in claude.ai's input as user annotates, zero-click flow (no Apply/Inject buttons)
- Light/dark theme support — side panel matches claude.ai's theme via CSS variables and content script detection
- Word-level selection snapping — partial word selections expand to full word boundaries for cleaner annotations
- DOM overlay annotations — `<mark>`/`<del>` wrappers applied via TreeWalker, preserves all HTML formatting (headings, lists, code blocks, bold)
- Theme detection via MutationObserver on `<html>` class attribute + `prefers-color-scheme` fallback
- `THEME_CHANGED` and `PENDING_FEEDBACK` message types for content script ↔ side panel communication

### Changed
- **Project restructure**: `extension/` → `extensions/chrome/` for multi-extension support (VS Code extension planned)
- ResponseView rewritten — uses `useEffect` + DOM manipulation instead of `dangerouslySetInnerHTML` with escaped plain text
- Content script rewritten — proactive injection approach replaces fragile Enter/send button interception
- CSS rewritten with CSS custom properties for theming (all hardcoded colors → variables)
- Updated all doc references to new `extensions/chrome/` paths

### Removed
- "Apply annotations" button and FeedbackPreview panel (replaced by zero-click auto-inject flow)
- `showPreview` signal (no longer needed)
- `escapeHtml()` plain text rebuild approach (replaced by DOM overlay)

### Fixed
- Annotation no longer destroys HTML formatting (was rebuilding from plain text, now uses DOM overlays)
- Side panel theme now matches claude.ai's light/dark mode (was always dark)

---

## [0.2.0] - 2026-02-21

### Added
- recurate.ai website — MkDocs Material, GitHub Pages, custom domain, blog, OG meta tags
- Extension architecture doc (docs/extension-architecture.md)
- Chrome extension scaffold — WXT + Preact + Preact Signals + TypeScript
  - Side panel with component architecture (ResponseView, AnnotationToolbar, AnnotationList, FeedbackPreview)
  - Content script for claude.ai (MutationObserver response detection, ProseMirror injection)
  - Background service worker (message relay between content script and side panel)
  - Annotation state management via Preact Signals
  - Dark theme with highlight (green) and strikethrough (red) annotation styles
  - Structured feedback formatter (KEEP/DROP format)
- .gitignore for build artifacts

### Tech Decisions
- **WXT** for extension build framework (file-based entrypoints, auto-manifest, HMR)
- **Preact + Signals** for side panel UI (4KB runtime, fine-grained reactivity)
- **TypeScript** across all extension code
- **claude.ai first** — V1 targets claude.ai only, other platforms follow same architecture
- **Annotation UX** — floating toolbar with ✓ (highlight), ✗ (strikethrough), ↺ (clear)

### Changed
- Moved DESIGN.md, PRODUCT_BRIEF.md, blog article into docs/ folder (served on site)
- Updated all cross-references in CLAUDE.md, README, tracking docs
- Fixed blog article Phase 1/2 numbering inconsistency
- Fixed broken BLOG.md link in README

---

## [0.1.0] - 2026-02-21

### Added
- Project concept and design documentation
- README.md — project overview, problem statement, two-product vision
- DESIGN.md — complete design & architecture document covering:
  - Chrome extension (Recurate Annotator) — side panel, annotation UX, structured feedback injection
  - Web platform (Recurate Roundtable) — multi-LLM orchestration, Condensed Context, stateless architecture
  - Annotation mechanism — highlight/strikethrough as non-verbal feedback
  - Token economics — ~2.5-3x cost vs single model, ~$0.05-0.15 per 5-turn conversation
  - API landscape — Anthropic, OpenAI, xAI, Google compatibility research
  - Data model — Conversations, Turns, ModelResponses, CondensedContext, Annotations
  - 18 open items tracked with priority levels
- PRODUCT_BRIEF.md — non-technical product brief for stakeholder discussions
- Blog article: "The Text Box Is the Only Way to Talk to AI. That's a Problem."
- CLAUDE.md — development rules and workflow for Claude Code sessions
- CURRENT_STATE.md, NOW.md — project tracking documents

### Key Design Decisions
- **Two products, phased delivery** — Chrome extension ships first (validates annotation UX), Roundtable platform ships second
- **Side panel over DOM injection** — platform-agnostic, robust, lower maintenance
- **Stateless LLM calls** — no per-model conversation history, CC is sole persistent state
- **Fast path + power path** — annotation is optional, not required. Zero friction when you don't need it.
- **Brand: Recurate** — curate + re-curate. Tagline: "Don't just chat, recurate."

### Decided
- Domain registered: recurate.ai
- MIT License
- Phase 0 (Chrome extension) before Phase 1 (Roundtable platform)
- Extension targets: claude.ai, chat.com, grok.com, gemini.google.com
