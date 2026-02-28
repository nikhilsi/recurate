# Current State

---
**Last Updated**: February 27, 2026
**Purpose**: Project context for new Claude Code sessions
**What's Next**: See NOW.md
---

**Phase**: Package & Ship | **Status**: Chrome extension submitted to Chrome Web Store (awaiting review), VS Code extension ready to publish

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

### Chrome Extension (Working on claude.ai)
- WXT + Preact + Preact Signals + TypeScript
- Builds clean (74 KB total output)
- **Tested and working end-to-end on claude.ai:**
  - Response detection via MutationObserver on `data-is-streaming`
  - Response extraction and rendering in side panel (preserves HTML formatting)
  - Annotation UX: text selection → floating toolbar → highlight (green ✓) / strikethrough (red ✗) / dig deeper (blue ⤵) / verify (amber ?)
  - DOM overlay annotations — `<mark>`/`<del>` wrappers applied via TreeWalker, preserves all formatting
  - Word-level selection snapping — partial word selections expand to full word boundaries
  - Auto-inject feedback into text box — annotations appear in claude.ai's input as user annotates, zero-click flow
  - Light/dark theme — side panel matches claude.ai's theme via CSS variables + content script detection
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

### Chrome Extension (Working on ChatGPT)
- `lib/platforms/chatgpt.ts` — DOM selectors, response extraction, ProseMirror injection
- `entrypoints/chatgpt.content.ts` — content script for chat.com / chatgpt.com
- **Tested and working end-to-end on chat.com:**
  - Response detection via MutationObserver + stop button presence/absence
  - Response extraction from `article` elements with `.markdown.prose` content
  - Annotation and feedback injection working (same proactive zero-click flow)
  - ChatGPT also uses ProseMirror (div#prompt-textarea[contenteditable]) — handles both textarea and contenteditable
  - Theme detection, SPA navigation handling
- Build output: 93 KB total (both content scripts + shared code)

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

### Chrome Web Store (Submitted)
- Developer account created, $5 fee paid
- Store listing complete: short description, detailed description, category (Tools), language (English)
- Screenshots: 2x 1280x800 PNG showing all 4 annotation gestures on claude.ai
- Privacy practices: single purpose, permission justifications (activeTab, sidePanel, host, remote code), data certification
- Submitted for review (Feb 27, 2026) — typically 1-3 business days
- STORE_LISTING.md has all field values for reference
- Build output: Chrome 105 KB

### VS Code Marketplace (Submitted, Verifying)
- Publisher account created: `recurate`
- .vsix uploaded (41 KB), automated verification in progress
- README serves as marketplace page (problem-first, gesture list, how it works)
- package.json metadata: categories, keywords, repository, homepage, activation

### Not Yet Built
- Blog posts scheduled and shared on LinkedIn
- Update recurate.ai with install links
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
| **Platform selectors (claude.ai)** | `extensions/chrome/lib/platforms/claude.ts` |
| **Platform selectors (ChatGPT)** | `extensions/chrome/lib/platforms/chatgpt.ts` |
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
