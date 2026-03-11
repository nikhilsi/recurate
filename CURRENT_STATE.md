# Current State

---
**Last Updated**: March 11, 2026
**Purpose**: Project context for new Claude Code sessions
**What's Next**: See NOW.md
---

**Phase**: Published & Live | **Status**: Both extensions published | **4 platforms**: claude.ai, ChatGPT, Copilot (consumer + enterprise)

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

### Icons & Visual Identity (Complete)
- Master SVG icon, Chrome extension icons (16-128px), VS Code marketplace icon
- Site logo, favicon, social card
- Generation scripts in `scripts/`

---

## Not Yet Built

- Additional browser platforms — grok.com, gemini.google.com
- Settings page (auto-inject vs manual confirmation toggle)

---

## Key Files

| Purpose | File |
|---------|------|
| **Design & architecture** | `docs/design.md` |
| **Extension architecture** | `docs/extension-architecture.md` |
| **Product brief** | `docs/product_brief.md` |
| **Dev rules** | `CLAUDE.md` |
| **Site config** | `mkdocs.yml` |
| **Extension config** | `extensions/chrome/wxt.config.ts` |
| **Content scripts** | `extensions/chrome/entrypoints/*.content.ts` |
| **Platform selectors** | `extensions/chrome/lib/platforms/*.ts` |
| **VS Code extension** | `extensions/vscode/src/extension.ts` |

---

**For more details**: See NOW.md | CHANGELOG.md | docs/extension-architecture.md
