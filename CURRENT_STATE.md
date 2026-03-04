# Current State

---
**Last Updated**: March 4, 2026
**Purpose**: Project context for new Claude Code sessions
**What's Next**: See NOW.md
---

**Phase**: Published & Promoting | **Status**: Both extensions live — Chrome Web Store + VS Code Marketplace | **4 platforms**: claude.ai, ChatGPT, Copilot (consumer + enterprise)

---

## What Exists

### Documentation (Complete)
- README.md — project overview and two-product vision
- docs/design.md — comprehensive design & architecture (Phase 0 implemented)
- docs/product_brief.md — non-technical product brief
- docs/extension-architecture.md — Chrome extension technical architecture
- docs/vscode-extension-architecture.md — VS Code extension technical architecture
- Blog article — docs/blog/posts/text-box-problem.md
- CLAUDE.md — development rules and workflow
- Tracking docs — CHANGELOG.md, CURRENT_STATE.md, NOW.md

### Website (Live)
- recurate.ai — MkDocs Material site, deployed via GitHub Pages
- Blog with first article live
- Logo (SVG), favicon (32px PNG), social card (1200x630 PNG)
- OG meta tags with social card for link previews

### Chrome Extension (Working — 4 platforms)
- WXT + Preact + Preact Signals + TypeScript
- Version 0.2.0 — builds clean (143 KB total output: 4 content scripts + shared code)
- **Supported platforms:** claude.ai, ChatGPT (chat.com), Copilot consumer (copilot.microsoft.com), Copilot enterprise (m365.cloud.microsoft/chat)
- **Tested and working end-to-end on all 4 platforms:**
  - Response detection via MutationObserver (platform-specific: `data-is-streaming`, stop button presence)
  - Response extraction and rendering in side panel (preserves HTML formatting)
  - Annotation UX: text selection → floating toolbar → highlight (green ✓) / strikethrough (red ✗) / dig deeper (blue ⤵) / verify (amber ?)
  - DOM overlay annotations — `<mark>`/`<del>` wrappers applied via TreeWalker, preserves all formatting
  - Word-level selection snapping — partial word selections expand to full word boundaries, respects element boundaries
  - Auto-inject feedback into text box — annotations appear in platform's input as user annotates, zero-click flow
  - Light/dark theme — side panel matches platform's theme via CSS variables + content script detection
  - Background service worker — message relay between content script and side panel
  - State management via Preact Signals
  - Structured feedback formatter (KEEP/DROP/EXPLORE DEEPER/VERIFY format)

### Design Decisions (Locked)
- Chrome extension first (Phase 0), then Roundtable platform (Phase 1)
- Side panel approach (not DOM injection) for the extension
- WXT + Preact + Signals (not Svelte — familiarity for faster development)
- claude.ai first, then ChatGPT (chat.com), then other platforms
- Annotation UX: floating toolbar with ✓ (green), ✗ (red), ⤵ (blue), ? (amber), ↺ (gray)
- Word-level selection snapping, no overlap (new replaces old)
- Auto-inject feedback into text box (proactive injection, no Apply/Inject buttons)
- Stateless LLM architecture for Roundtable — CC as sole persistent state
- Project structure: `extensions/chrome/`, `extensions/vscode/`
- VS Code extension: JSONL file watching, clipboard auto-copy, response history (last 5)

### Chrome Extension — ChatGPT (chat.com)
- `lib/platforms/chatgpt.ts` — DOM selectors, response extraction, ProseMirror injection
- `entrypoints/chatgpt.content.ts` — content script for chat.com / chatgpt.com
- Response detection via MutationObserver + stop button presence/absence
- ChatGPT uses ProseMirror (div#prompt-textarea[contenteditable]) — handles both textarea and contenteditable

### Chrome Extension — Copilot Consumer (copilot.microsoft.com)
- `lib/platforms/copilot.ts` — DOM selectors, response extraction, textarea-based injection (native setter to bypass React)
- `entrypoints/copilot.content.ts` — content script for copilot.microsoft.com
- Streaming detection via stop button presence/absence
- Editor: standard `<textarea#userInput>` — injection via native value setter
- Post-streaming debounce: 1200ms (longer than other platforms — DOM settles slower)

### Chrome Extension — Copilot Enterprise (m365.cloud.microsoft/chat)
- `lib/platforms/copilot-enterprise.ts` — DOM selectors, response extraction, Lexical editor injection via synthetic ClipboardEvent paste
- `entrypoints/copilot-enterprise.content.ts` — content script for m365.cloud.microsoft/chat
- Streaming detection via stop button only (`aria-busy` attribute is unreliable — false positives)
- Editor: Lexical editor (`data-lexical-editor="true"`) — **Lexical maintains its own state tree and reverts all direct DOM manipulation**. Injection uses synthetic `ClipboardEvent` paste with `DataTransfer` + 10ms selection sync delay
- `injecting` flag suppresses MutationObserver during paste to prevent false streaming detection
- `pendingFeedback` cleared on streaming start to prevent stale re-injection

### VS Code Extension (Working)
- Located at `extensions/vscode/`
- Extension host (Node.js): JSONL watcher, webview provider, clipboard copy
- Webview sidebar (Preact + Signals): same annotation UI as Chrome extension
- **JSONL file watching**: monitors `~/.claude/projects/<encoded-path>/*.jsonl` for Claude Code assistant responses
- Walks up parent directories to find matching Claude project dir (works from subfolders)
- Extracts text content blocks from assistant messages, converts markdown → HTML via `marked`
- **Performance**: reads only last 64KB of JSONL file (not entire 25MB+ file)
- **Auto-copy to clipboard**: annotations automatically copy KEEP/DROP/EXPLORE DEEPER/VERIFY feedback to clipboard on every change
- **Response history**: keeps last 5 responses with back/forward navigation
- **Sidebar persistence**: webview sends WEBVIEW_READY on mount, extension re-sends state — survives tab switches
- Theme detection: reads VS Code's `vscode-light`/`vscode-dark` body class
- Build: extension host 81 KB (esbuild), webview 28.5 KB JS + 6 KB CSS (Vite)
- **Tested end-to-end**: installed via .vsix, annotated response, auto-copied feedback, pasted into Claude Code

### Icons & Visual Identity (Complete)
- Master SVG icon: circular arrows (re-curation cycle) + green checkmark + red strikethrough on indigo gradient
- Chrome extension icons: 16, 32, 48, 128px PNG (in `extensions/chrome/public/icons/`)
- VS Code extension: 128px marketplace icon + monochrome activity bar SVG
- Site: SVG logo in header, 32px PNG favicon, 1200x630 social card PNG
- Generation scripts: `scripts/generate-icons.mjs`, `scripts/generate-social-card.mjs` (sharp)

### Chrome Web Store (Published)
- [Install link](https://chromewebstore.google.com/detail/recurate-annotator/nfkfbokpmmcdnhdpnhcbkppapnkcdphm)
- Store listing: short description, detailed description, category (Tools), language (English)
- Screenshots: 2x 1280x800 PNG showing all 4 annotation gestures on claude.ai
- Privacy practices: single purpose, permission justifications, data certification
- STORE_LISTING.md has all field values for reference
- Build output: Chrome 143 KB (4 content scripts + shared code)
- Manifest description: "Annotate AI responses on Claude, ChatGPT, and Copilot."

### VS Code Marketplace (Published)
- [Install link](https://marketplace.visualstudio.com/items?itemName=recurate.recurate-annotator-vscode)
- Publisher: `recurate`
- README serves as marketplace page (problem-first, gesture list, how it works)
- Build output: VSIX 41 KB

### Diagnostic Scripts
- `scripts/inspect-platform.js` — DOM inspector utility for adding new platform support
- `scripts/inspect-editor.js` — editor element diagnostic for contenteditable injection debugging
- `scripts/inspect-lexical.js` — Lexical editor diagnostic (framework detection, injection method testing)

### Not Yet Built
- Chrome Web Store update with Copilot support (v0.2.0 needs republishing)
- Blog posts shared on LinkedIn (post 1 scheduled for Mar 4, post 2 for Mar 7)
- Settings/config page (deferred to V1.2)
- Platform (Roundtable) — design phase only

---

## Open Design Items

### Resolved (Extension)
- ~~Annotation UX design~~ → floating toolbar with ✓/✗/⤵/?/↺ icons
- ~~Annotation → feedback format~~ → KEEP/DROP structured text
- ~~Platform DOM selectors~~ → claude.ai selectors documented (data-is-streaming, ProseMirror)
- ~~Tech stack~~ → WXT + Preact + Signals + TypeScript
- ~~Feedback injection flow~~ → proactive auto-inject into text box (no Apply/Inject buttons)
- ~~Theme support~~ → CSS variables, content script detects claude.ai's light/dark mode
- ~~Selection precision~~ → word-level snapping
- ~~HTML formatting preservation~~ → DOM overlay approach (TreeWalker + surroundContents)

### Resolved (ChatGPT)
- ~~chat.com DOM structure~~ → `article` elements, `div.ProseMirror#prompt-textarea` (contenteditable), stop button for streaming

### Resolved (Copilot)
- ~~Consumer Copilot DOM structure~~ → response containers via `div.cib-message-group`, `<textarea#userInput>`, stop button streaming
- ~~Enterprise Copilot DOM structure~~ → `div.fai-CopilotMessage`, Lexical editor (`data-lexical-editor`), stop button only (aria-busy unreliable)
- ~~Lexical editor injection~~ → synthetic ClipboardEvent paste with DataTransfer (Lexical reverts all direct DOM manipulation)
- ~~Element boundary word snapping~~ → `getElementBoundaryOffsets()` detects parent element changes between text nodes

### Resolved (VS Code Extension)
- ~~VS Code extension architecture~~ → JSONL file watching + Webview sidebar + clipboard feedback
- ~~Terminal capture approach~~ → JSONL files at `~/.claude/projects/` (not terminal API — unstable)
- ~~Feedback injection~~ → clipboard copy (V1), Terminal.sendText() possible V2

### Critical (Roundtable — not needed for extensions)
1. CC schema/structure — JSON vs natural language, token budget
2. Synthesis model selection — cheap model vs frontier vs rotating
3. Auto-synthesis prompt design
4. User-refined synthesis prompt design

### Shipped (Extension V1.1)
- ⤵ "Dig deeper" annotation gesture (blue, EXPLORE DEEPER section in feedback)
- ? "Verify this" annotation gesture (amber, VERIFY section in feedback)

### Upcoming (Extension V1.2)
- Settings page (auto-inject vs manual confirmation toggle)

---

## Key Files

| Purpose | File |
|---------|------|
| **Design & architecture** | `docs/design.md` |
| **Extension architecture** | `docs/extension-architecture.md` |
| **Product brief** | `docs/product_brief.md` |
| **Blog article** | `docs/blog/posts/text-box-problem.md` |
| **Dev rules** | `CLAUDE.md` |
| **Site config** | `mkdocs.yml` |
| **Extension config** | `extensions/chrome/wxt.config.ts` |
| **Content script (claude.ai)** | `extensions/chrome/entrypoints/claude.content.ts` |
| **Content script (ChatGPT)** | `extensions/chrome/entrypoints/chatgpt.content.ts` |
| **Content script (Copilot)** | `extensions/chrome/entrypoints/copilot.content.ts` |
| **Content script (Copilot Enterprise)** | `extensions/chrome/entrypoints/copilot-enterprise.content.ts` |
| **Platform selectors (claude.ai)** | `extensions/chrome/lib/platforms/claude.ts` |
| **Platform selectors (ChatGPT)** | `extensions/chrome/lib/platforms/chatgpt.ts` |
| **Platform selectors (Copilot)** | `extensions/chrome/lib/platforms/copilot.ts` |
| **Platform selectors (Copilot Enterprise)** | `extensions/chrome/lib/platforms/copilot-enterprise.ts` |
| **Annotation state** | `extensions/chrome/entrypoints/sidepanel/state/annotations.ts` |
| **VS Code extension entry** | `extensions/vscode/src/extension.ts` |
| **JSONL watcher** | `extensions/vscode/src/jsonlWatcher.ts` |
| **VS Code webview provider** | `extensions/vscode/src/webviewProvider.ts` |
| **VS Code webview app** | `extensions/vscode/webview/App.tsx` |
| **Master icon SVG** | `docs/assets/images/recurate-icon.svg` |
| **Icon generation** | `scripts/generate-icons.mjs` |
| **Social card generation** | `scripts/generate-social-card.mjs` |

---

**For more details**: See NOW.md | CHANGELOG.md | docs/extension-architecture.md
