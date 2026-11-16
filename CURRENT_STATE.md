# Current State

---
**Last Updated**: November 15, 2026
**Purpose**: Project context for new Claude Code sessions
**What's Next**: See NOW.md
---

**Phase**: Published & Building | **Status**: 4 extensions published, 1 built | **5 extensions**: Annotator (Chrome + VS Code), Composer, Copier, Connect

---

## What Exists

### Documentation (Complete)
- README.md — project overview
- docs/design.md — design & architecture
- docs/product_brief.md — non-technical product brief
- docs/extension-architecture.md — Chrome extension technical architecture
- docs/vscode-extension-architecture.md — VS Code extension technical architecture
- Blog articles — docs/blog/posts/text-box-problem.md, docs/blog/posts/twenty-tools-zero-curation.md
- CLAUDE.md — development rules and workflow
- Tracking docs — CHANGELOG.md, CURRENT_STATE.md, NOW.md

### Website (Live)
- recurate.ai — MkDocs Material site, deployed via GitHub Pages
- Blog with two articles live
- Logo (SVG), favicon (32px PNG), social card (1200x630 PNG)
- OG meta tags with social card for link previews

### Chrome Extension (Working — 4 platforms)
- WXT + Preact + Preact Signals + TypeScript
- Version 0.2.0 — builds clean (143 KB total output: 4 content scripts + shared code)
- **Supported platforms:** claude.ai, ChatGPT (chat.com), Copilot consumer (copilot.microsoft.com), Copilot enterprise (m365.cloud.microsoft/chat)
- **Tested and working end-to-end on all 4 platforms:**
  - Response detection via MutationObserver (platform-specific)
  - Response extraction and rendering in side panel
  - Annotation UX: text selection → floating toolbar → highlight/strikethrough/dig deeper/verify
  - DOM overlay annotations via TreeWalker
  - Word-level selection snapping
  - Auto-inject feedback into text box
  - Light/dark theme support
  - Structured feedback formatter (KEEP/DROP/EXPLORE DEEPER/VERIFY)

### VS Code Extension (Working — v0.2.1)
- Located at `extensions/vscode/`
- Extension host (Node.js): JSONL watcher, webview provider, clipboard copy
- Webview sidebar (Preact + Signals): same annotation UI as Chrome extension
- JSONL file watching, auto-copy to clipboard, response history (last 5)
- Windows path encoding fix (v0.2.1) — works on Google Antigravity, VSCodium, Theia
- Build: extension host 81 KB (esbuild), webview 28.5 KB JS + 6 KB CSS

### Chrome Web Store (Published)
- [Install link](https://chromewebstore.google.com/detail/recurate-annotator/nfkfbokpmmcdnhdpnhcbkppapnkcdphm)

### VS Code Marketplace (Published)
- [Install link](https://marketplace.visualstudio.com/items?itemName=recurate.recurate-annotator-vscode)

### Open VSX Registry (Published)
- [Install link](https://open-vsx.org/extension/recurate/recurate-annotator-vscode)

### Recurate Composer — Markdown Toolbar (Working — 8 platforms)
- Vanilla JS Chrome extension, no build step
- Version 0.1.0
- Floating markdown formatting toolbar docked above AI chat input boxes
- **Supported platforms:** claude.ai, ChatGPT (chatgpt.com), Grok (grok.com), Gemini (gemini.google.com), Copilot consumer (copilot.microsoft.com), Copilot enterprise (m365.cloud.microsoft), Google Search (google.com), Google AI Mode
- **Formatting:** Bold, italic, strikethrough, H1-H3, inline code, code blocks, bullet lists, numbered lists (auto-increment), blockquotes, links, horizontal rules
- Keyboard shortcuts: Cmd/Ctrl+B (bold), Cmd/Ctrl+I (italic), Cmd/Ctrl+E (code), Cmd/Ctrl+K (link)
- Docked above editor, draggable to detach, double-click to re-dock
- Collapsible toolbar, dark mode support via prefers-color-scheme
- Platform-specific editor detection: ProseMirror (Claude, ChatGPT, Grok), textarea (Google, Copilot consumer), Lexical (Copilot enterprise), contenteditable (Gemini)
- Icon: indigo gradient with pen + formatting marks (same brand palette as Annotator)

### Recurate Copier: Conversation Export (1.0 built and tested in the repo; the store still has 0.4.0)
- Vanilla JS, Chrome Manifest V3, no build step. JSZip and Turndown (with its GFM plugin) vendored in `lib/`.
- **Reads each site's own conversation data** (Claude, ChatGPT, Grok, Gemini). Copilot has none reachable from the page, so it is collected by scrolling and checked against the message total the page reports.
- **Structure:** one conversation model (`core/model.js`), one Markdown writer (`core/markdown.js`), safe file names (`core/names.js`), one adapter per site (`platforms/`), and `content.js` for buttons, the progress window and the ZIP.
- **Copy, Download (Markdown) and Export (ZIP with `uploads/` and `artifacts/`) on every site:** in Claude's message toolbar, a floating cluster elsewhere, and a toolbar popup (Alt+Shift+C) that injects into tabs opened before an update and works on copilot.cloud.microsoft.
- **Every export starts with a completeness line:** complete, or may be partial with the reason; files downloaded and failed, each failure with its reason; notes; what is not included.
- Exports the branch shown on screen (Claude and ChatGPT by comparing the screen with the data; Grok by the page address). Cancel works at every stage; one run per page.
- **Sites:** claude.ai, chatgpt.com, grok.com, gemini.google.com, m365.cloud.microsoft (Copilot work and personal), copilot.cloud.microsoft through the popup. Google AI Mode removed.
- **Permissions:** activeTab and scripting. No background worker, no backend.
- **Tests:** node tests in `test/` (`node --test test/` from the Copier folder). `probe/` holds the live probe that produced the value-free skeletons the fixtures follow.
- **Docs:** spec `docs/spec.md` (v2.1); `docs/reviews/` holds the spec review, the live test record and the breaker pass.
- **Status:** build steps 1 to 10 done (tasks #531 to #540). Step 11, release prep, is next (#541); the store upload waits on Nikhil's go.

### Recurate Connect — Cross-Chat Context Sharing (Built — Claude.ai + Copilot)
- WXT + Preact + Preact Signals + TypeScript (same stack as Annotator)
- Version 0.2.0
- Connect 2 AI chat tabs with one-click context sharing (Claude-to-Claude, Claude-to-Copilot, Copilot-to-Copilot)
- **Tab auto-discovery:** reads chat name from DOM, UUID from URL, registers with background. 2-tab limit enforced.
- **Share button:** injected into last message action bar. One click shares to the other tab (no dropdown).
- **Command palette:** `\rc` (share), `\rcp` (pop out), `\rcc` (clear). Typed in input, intercepted before Claude sees it.
- **Full exchange context:** share includes both the user prompt and AI response
- **Text selection:** if text is selected, shares only the selection
- **Auto-send:** shared content injected and sent automatically
- **Shared space sidebar:** toggle anchored next to input box, panel in right margin. Header shows "Recurate Connect" + connected tab name.
- **Shared space sidebar:** read-only view of all shared exchanges with timestamps and source
- **Pop-out window:** open shared space in separate browser window for multi-monitor. All inline sidebars collapse when pop-out opens, restore when closed.
- Build output: 112KB (content script + background + shared space page + icons)
- Icon: indigo gradient with two arrows in opposite directions (white right, green left)

### Icons & Visual Identity (Complete)
- Master SVG icon (Annotator), Composer icon SVG, Connect icon SVG
- Chrome extension icons (16-128px), VS Code marketplace icon
- Site logo, favicon, social card
- Generation scripts in `scripts/`

---

## Not Yet Published

- Recurate Connect v0.2.0 — built and tested, not yet submitted to Chrome Web Store

## Planned

- Additional Annotator platforms — grok.com, gemini.google.com
- Copier: periodic auto-export for non-technical users
- Connect V0.3: edit/pin/delete/search in sidebar, additional platforms

## Blocked / Shelved

- **Copier Google AI Mode.** Chrome (150 dev) routes AI Mode (`udm=50`) to a Chrome-native WebUI at `chrome://contextual-tasks/` where content scripts cannot run, and that surface renders an error state with no answer content. Not reachable by any extension. Shelved until the surface stabilizes. See CHANGELOG 1.7.0.

---

## Key Files

| Purpose | File |
|---------|------|
| **Design & architecture** | `docs/design.md` |
| **Extension architecture** | `docs/extension-architecture.md` |
| **Product brief** | `docs/product_brief.md` |
| **Dev rules** | `CLAUDE.md` |
| **Site config** | `mkdocs.yml` |
| **Annotator config** | `extensions/chrome/wxt.config.ts` |
| **Content scripts** | `extensions/chrome/entrypoints/*.content.ts` |
| **Platform selectors** | `extensions/chrome/lib/platforms/*.ts` |
| **VS Code extension** | `extensions/vscode/src/extension.ts` |
| **Composer content script** | `extensions/markdown-toolbar/content.js` |
| **Composer manifest** | `extensions/markdown-toolbar/manifest.json` |
| **Composer store listing** | `extensions/markdown-toolbar/STORE_LISTING.md` |
| **Copier spec** | `extensions/conversation-copier/docs/spec.md` |
| **Copier core (model, Markdown, names)** | `extensions/conversation-copier/core/` |
| **Copier site adapters** | `extensions/conversation-copier/platforms/` |
| **Copier content script** | `extensions/conversation-copier/content.js` |
| **Copier manifest** | `extensions/conversation-copier/manifest.json` |
| **Connect config** | `extensions/connect/wxt.config.ts` |
| **Connect content script** | `extensions/connect/entrypoints/claude.content.tsx` |
| **Connect background** | `extensions/connect/entrypoints/background.ts` |
| **Connect architecture** | `docs/connect-architecture.md` |

---

**For more details**: See NOW.md | CHANGELOG.md | docs/extension-architecture.md
