# Changelog

All notable changes to this project will be documented in this file.

---

## [1.3.0] - 2026-03-20

### Added
- **Recurate Connect** — new Chrome extension: connect multiple Claude.ai chat tabs with one-click context sharing. Fifth extension in the Recurate family, completing the circle: Compose, Annotate, Copy, Connect.
- **Tab auto-discovery:** extension automatically reads chat name from Claude.ai UI and UUID from URL. Zero configuration.
- **Share buttons** injected into Claude's native message action bars on both AI and user messages.
- **Full exchange context:** sharing an AI message automatically includes the user prompt that triggered it.
- **Tab picker** dropdown with individual tabs + "All tabs" broadcast option.
- **One-click auto-send:** shared context is injected into the target tab's ProseMirror input and sent automatically. Shift+click to inject without sending.
- **Shared space sidebar:** floating panel showing all shared exchanges across tabs with send, edit, pin, delete, and search.
- **Chat-requested share:** MutationObserver detects "share with X:" patterns in AI messages, shows one-click share button.
- **Edit entries** inline before sending (trim, rewrite, then share).
- **Pin entries** to keep important context at the top.
- **Search/filter** across all shared messages.
- **Drag-to-inject:** drag sidebar entries directly into the editor.
- **Resizable sidebar:** drag left edge to resize (250-600px).
- **Pop-out window:** open shared space in a separate browser window for multi-monitor workflows.
- **Architecture doc:** `docs/connect-architecture.md` with full design rationale, "Why Connect, not the Platform" section, decisions log.
- Icon: indigo gradient with two arrows in opposite directions (white right arrow, green left arrow).

### Technical Notes
- WXT + Preact + Preact Signals + TypeScript (same stack as Annotator). Chosen over vanilla JS because Connect has real-time reactive state across tabs.
- Background service worker manages tab registry + shared space (chrome.storage.local) + message routing.
- Content script handles share button injection, chat-requested share detection, ProseMirror injection, and sidebar/badge mounting.
- Pop-out window is a separate extension page opened via chrome.windows.create, communicates with background via chrome.runtime messaging.
- Build output: 124KB (content script 54KB, background 13KB, shared space page, icons).
- Claude.ai only. Born from the multi-intelligence workflow (Ops-HQ, Book HQ, AI Trust Commons coordination).

---

## [1.2.1] - 2026-03-20

### Fixed
- **ChatGPT conversation extraction** — ChatGPT changed `<article>` to `<section>` elements for conversation turns. Updated selector from `article[data-testid^="conversation-turn-"]` to element-agnostic `[data-testid^="conversation-turn-"]`. Now uses `data-message-author-role` attribute for reliable user/assistant role detection.
- **ChatGPT action bar injection** — replaced fragile class-based selector with `aria-label="Response actions"` for finding the button row.

### Added
- **HTML sanitization for exports** — `sanitizeHTML()` now strips `class`, `style`, and `dir` attributes from all elements, Google's `js*` and `data-*` attributes, empty wrapper divs/spans, buttons, icons, SVGs, UI chrome text, favicon images, and HTML comments. Produces clean, portable HTML exports across all platforms.
- **Grok action bar injection** — Copier buttons now inject into Grok's native `div.action-buttons` bar (same pattern as Claude), instead of floating.
- **Grok conversation title extraction** — extracts title from `document.title`, stripping the "— Grok" suffix.
- **Platform name in filenames** — HTML download filenames now include the platform name (e.g., `recurate-chatgpt-topic-2026-03-20.html`).

### Tested
- 6 of 7 platforms verified: Claude, ChatGPT, Grok, Gemini, Google AI Mode, Copilot consumer

---

## [1.2.0] - 2026-03-19

### Added
- **Recurate Copier** — new Chrome extension: copy or download full AI conversations (both user messages and AI responses). Third extension in the Recurate family.
- **7 platforms supported:** claude.ai, ChatGPT, Grok, Gemini, Microsoft Copilot (consumer + enterprise), Google AI Mode
- **Two export formats:** Click copies full conversation as clean markdown to clipboard. Download button exports as styled self-contained HTML file.
- **Platform-native button injection on Claude:** Copier buttons appear inline in Claude's action bar (next to copy/thumbs/retry). Floating buttons on other platforms.
- **Smart filename:** HTML downloads include conversation title from the platform (e.g., `recurate-daily-ops-and-campaign-hq-v9-2026-03-19.html`)
- **Styled HTML export:** Indigo-branded, responsive layout, user messages in bordered boxes, AI responses with full formatting (headings, lists, code blocks, blockquotes). Print-ready.
- **Keyboard shortcuts:** Cmd/Ctrl+Shift+C (copy), Cmd/Ctrl+Shift+D (download)
- Brand identity: indigo gradient icon with clipboard + green export arrow, same palette as Annotator and Composer

### Technical Notes
- Claude button injection matches exact DOM structure (`div[role="group"][aria-label="Message actions"]`) with matching CSS classes for native look.
- Google AI Mode DOM is heavily obfuscated — content extraction clones DOM, strips buttons/icons/UI chrome via selector removal + text pattern matching + SVG removal.
- Conversation title extracted per-platform: Claude uses `[data-testid="chat-title-button"] .truncate`, Google uses URL query parameter `q`.
- Blob download in content scripts requires `documentElement.appendChild` (not `body`) with delayed cleanup.

---

## [1.1.0] - 2026-03-15

### Added
- **Recurate Composer** — new Chrome extension: floating markdown formatting toolbar for AI chat input boxes. The input-side complement to the output-side Annotator.
- **8 platforms supported:** claude.ai, ChatGPT, Grok, Gemini, Microsoft Copilot (consumer + enterprise), Google Search, Google AI Mode
- **Formatting options:** Bold, italic, strikethrough, H1-H3, inline code, code blocks, bullet lists, numbered lists (auto-increment), blockquotes, links, horizontal rules
- **Keyboard shortcuts:** Cmd/Ctrl+B (bold), Cmd/Ctrl+I (italic), Cmd/Ctrl+E (code), Cmd/Ctrl+K (link)
- **Smart positioning:** toolbar docks above editor container, follows as text box expands, repositions on scroll. Draggable to detach, double-click to re-dock. Collapsible.
- **Platform-specific editor handling:** ProseMirror paste via ClipboardEvent + selectionchange sync (Claude, ChatGPT, Grok), textarea via native value setter (Google, Copilot consumer), Lexical via ClipboardEvent (Copilot enterprise), contenteditable (Gemini)
- **Dark mode** via `prefers-color-scheme` media query
- **Brand identity:** indigo gradient icon with pen + formatting marks (B in green, # in red), same palette as Annotator
- Chrome Web Store listing drafted (`extensions/markdown-toolbar/STORE_LISTING.md`)
- Store screenshots: claude input, claude response, 2 platform collages (6 platforms across 2 images)
- `extensions/markdown-toolbar/` — vanilla JS, no build step, Chrome Manifest V3

### Technical Notes
- Line-prefix operations (headings, lists, blockquotes) on ProseMirror require `selectionchange` event dispatch + 15ms delay before paste, so ProseMirror syncs its internal selection state with the DOM selection.
- Gemini's contenteditable `sel.modify('move', 'backward', 'character')` crosses line boundaries — cursor repositioning skipped on Gemini for wrap operations.
- Numbered list auto-increments by inspecting the previous sibling block's text content for `^\d+\.\s` pattern.

---

## [1.0.1] - 2026-03-11

### Fixed
- **VS Code extension: Windows path encoding** — `encodeProjectPath` only replaced `/` with `-`, missing `:` and `\` on Windows paths. Extension showed "Not connected" on Google Antigravity, VSCodium, and other Windows-based editors. Fixed to match Claude Code's encoding: replaces `:`, `\`, and `/`. (GitHub issue #1)

### Changed
- VS Code extension version bumped to 0.2.1 (published to VS Code Marketplace + Open VSX)

---

## [1.0.0] - 2026-03-04

### Added
- **Microsoft Copilot support** — both consumer (copilot.microsoft.com) and enterprise (m365.cloud.microsoft/chat)
- `lib/platforms/copilot.ts` — consumer Copilot DOM selectors, textarea-based injection (native setter to bypass React)
- `lib/platforms/copilot-enterprise.ts` — enterprise Copilot DOM selectors, Lexical editor injection via synthetic ClipboardEvent paste
- `entrypoints/copilot.content.ts` — content script for copilot.microsoft.com
- `entrypoints/copilot-enterprise.content.ts` — content script for m365.cloud.microsoft/chat
- `scripts/inspect-platform.js` — DOM inspector utility for adding new platform support
- `scripts/inspect-editor.js` — editor element diagnostic for contenteditable injection debugging
- `scripts/inspect-lexical.js` — Lexical editor diagnostic (framework detection, injection method testing)

### Fixed
- **Word-level selection snapping** — annotations no longer grab extra words at element boundaries (e.g., Copilot's HTML concatenates text across `<strong>`/`<em>` elements without whitespace). Added `getElementBoundaryOffsets()` that detects parent element changes between adjacent text nodes. Applied to both Chrome and VS Code extensions.
- **Enterprise Copilot status bar** — `isStreaming()` now uses only stop button presence (removed unreliable `aria-busy` fallback that caused false positives). Added `injecting` flag to suppress observer during editor paste. Clears pending feedback when streaming starts to prevent stale re-injection.
- **Consumer Copilot response truncation** — increased post-streaming debounce from 500ms to 1200ms to let response DOM fully settle

### Changed
- Extension version bumped to 0.2.0 (manifest + package.json)
- Manifest description updated: "Annotate AI responses on Claude, ChatGPT, and Copilot."
- Build output: 143 KB total (4 content scripts + shared code)

### Technical Notes
- Enterprise Copilot uses a **Lexical editor** (Meta's text editor framework, `data-lexical-editor="true"`). Lexical maintains its own state tree and reverts all direct DOM manipulation. The only reliable injection method is synthetic `ClipboardEvent` paste with `DataTransfer`. Selection must be set via DOM API + `selectionchange` event dispatch with 10ms delay before paste so Lexical syncs its internal selection state.
- Consumer Copilot uses a standard `<textarea#userInput>` — injection via native value setter (same pattern as ChatGPT textarea path).
- Enterprise Copilot's DOM is noisy — `aria-busy` attribute on `CopilotMessage` elements persists/reappears after responses complete. Stop button (`button[aria-label="Stop generating"]`) is the only reliable streaming signal.

---

## [0.9.0] - 2026-03-02

### Added
- **Chrome Web Store** — published: [Install link](https://chromewebstore.google.com/detail/recurate-annotator/nfkfbokpmmcdnhdpnhcbkppapnkcdphm)
- **VS Code Marketplace** — published: [Install link](https://marketplace.visualstudio.com/items?itemName=recurate.recurate-annotator-vscode)
- Developer accounts created for both stores
- Chrome store listing, screenshots (1280x800), privacy practices, permission justifications
- STORE_LISTING.md expanded with all submission fields and steps
- Mermaid diagram support enabled in mkdocs.yml
- Second blog post drafted: "I Found 20+ Multi-Model AI Tools. None of Them Let You Curate." (not yet published)
- Install links added to recurate.ai, README.md

### Changed
- Manifest description shortened to 116 chars (Chrome Web Store 132-char limit)
- .gitignore updated: added *.zip and *.vsix

---

## [0.8.0] - 2026-02-27

### Added
- **"Dig deeper" annotation gesture** (blue, ⤵) — select text and mark it for elaboration. Generates EXPLORE DEEPER section in feedback.
- **"Verify this" annotation gesture** (amber, ?) — select text and flag it for fact-checking. Generates VERIFY section in feedback.
- Both new gestures work identically in Chrome and VS Code extensions.
- TYPE_CONFIG lookup map in ResponseView replaces hardcoded ternary for annotation type → DOM element mapping.
- TYPE_ICON map in AnnotationList for scalable icon display.
- Computed signals `deeperAnnotations` and `verifyAnnotations` in both extensions.

### Changed
- Toolbar now shows 5 buttons in a single row: ✓ ✗ ⤵ ? ↺ (was ✓ ✗ ↺)
- Formatter output now includes EXPLORE DEEPER and VERIFY sections alongside KEEP and DROP
- Annotation list summary shows explore and verify counts
- All documentation updated for V1.1 gestures (14 files)

---

## [0.7.0] - 2026-02-21

### Changed
- Chrome extension: empty state now mentions both Claude and ChatGPT (was Claude-only)
- Chrome extension: StatusBar "Connected" label is now platform-agnostic
- Chrome extension: manifest description rewritten for store discoverability
- VS Code extension: README rewritten as marketplace page (architecture docs preserved on recurate.ai)
- VS Code extension: package.json metadata — categories, keywords, repository, homepage, narrowed activation

### Added
- VS Code extension: `.vscodeignore` for clean VSIX packaging (258 KB → 40 KB)
- Chrome extension: `STORE_LISTING.md` with Chrome Web Store description text (short + detailed)

### Removed
- Chrome extension: dead `RESPONSE_STREAMING` message type (defined but never used)

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
