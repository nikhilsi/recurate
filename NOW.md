# NOW - Current Focus & Next Steps

---
**Last Updated**: February 21, 2026
**Purpose**: What to work on next
**Context**: See CLAUDE.md for rules, CURRENT_STATE.md for what's built, docs/extension-architecture.md for extension details
---

**Phase**: Extension Testing & Multi-Platform

---

## Recently Completed

- Complete design & architecture document (docs/design.md)
- Product brief (docs/product_brief.md)
- Blog article: "The Text Box Is the Only Way to Talk to AI. That's a Problem."
- Project scaffolding: README, CLAUDE.md, tracking docs
- MkDocs Material site: landing page, blog, docs, OG meta tags, GitHub Actions deploy
- recurate.ai live with custom domain
- Extension architecture doc (docs/extension-architecture.md)
- Chrome extension — working end-to-end on claude.ai:
  - Response detection, extraction, side panel rendering
  - Annotation UX (select text, floating toolbar, highlight/strikethrough)
  - Auto-inject feedback into text box (proactive injection, zero-click flow)
  - Light/dark theme matching claude.ai
  - Word-level selection snapping
  - DOM overlay annotations (preserves HTML formatting)
- Project restructure: `extension/` → `extensions/chrome/`
- ChatGPT (chat.com) support — tested and working end-to-end
- VS Code extension — working end-to-end:
  - JSONL file watcher for Claude Code responses
  - Webview sidebar with same annotation UI as Chrome (Preact + Signals)
  - Markdown → HTML rendering, clipboard-based feedback
  - Parent directory walking for project path resolution
  - Tested: annotate → Copy Feedback → paste into Claude Code

---

## Current Focus

### 1. Icons, Logo & Visual Identity
- [ ] Use recraft.ai to create logo and icons
- [ ] Extension icons (16, 32, 48, 128px)
- [ ] Site favicon and social card
- [ ] Update recurate.ai with logo

### 2. ChatGPT Support (chat.com) — DONE
- [x] Research chat.com DOM structure (response containers, input field, streaming indicators)
- [x] Create `chatgpt.content.ts` content script
- [x] Create `lib/platforms/chatgpt.ts` platform module
- [x] Test end-to-end on chat.com

### 4. VS Code Extension — DONE
- [x] Research Claude Code output capture (JSONL file watching)
- [x] Scaffold VS Code extension project (`extensions/vscode/`)
- [x] JSONL watcher — watches `~/.claude/projects/` for Claude Code responses
- [x] Webview sidebar with shared annotation UI (Preact + Signals, same as Chrome)
- [x] Markdown → HTML rendering via `marked`
- [x] Clipboard-based feedback (Copy Feedback → paste into Claude Code)
- [x] Build succeeds (extension host 78.5 KB, webview 27.67 KB)
- [x] Tested end-to-end via .vsix install (annotate → copy → paste)

### 5. VS Code Extension — Package & Ship
- [ ] Publisher account on VS Code Marketplace
- [ ] Extension icon (use same logo once created)
- [ ] Marketplace description and README
- [ ] Screenshots showing annotation flow
- [ ] Publish to VS Code Marketplace

### 6. Chrome Extension — Package & Ship
- [ ] Store description — lead with the problem, not the feature
- [ ] Screenshots showing before/after annotation quality
- [ ] Minimal permissions (builds trust, speeds review)
- [ ] 30-second demo video
- [ ] Free forever for the extension
- [ ] Review and submit to Chrome Web Store

### 7. Ship
- [ ] Publish Chrome extension to Chrome Web Store
- [ ] Publish VS Code extension to VS Code Marketplace
- [ ] Update recurate.ai with install links and screenshots

---

## Polish (Before Ship)

- [ ] Handle edge cases (long responses, code blocks, empty selections)
- [ ] SPA navigation handling (conversation switching on claude.ai)
- [ ] Error states (selector failures, injection failures)
- [ ] Settings/config page (auto-inject vs manual confirmation toggle)
- [ ] Test on multiple claude.ai conversations

---

## Backlog

1. **Extension V1.1** — ⤵ "dig deeper" + ? "verify" annotation gestures
2. **Additional browser platforms** — grok.com, gemini.google.com
3. **CC schema design** — critical for Roundtable, not needed for extensions
4. **Synthesis prompt engineering** — auto-synthesis and user-refined prompts
5. **Roundtable backend** — FastAPI + LLM orchestration
6. **Roundtable frontend** — React + TypeScript
7. **Extension ↔ Platform convergence** (Phase 2)

---

## Reminders

- No API keys needed for the Chrome extension (fully client-side)
- docs/extension-architecture.md has the full tech details
- To test: `cd extensions/chrome && npm run dev`, load `.output/chrome-mv3-dev` in chrome://extensions
- The extensions validate the core UX before building the Roundtable platform
- ChatGPT content script follows the same architecture as claude.ai (platform module + content script)
- To build VS Code extension: `cd extensions/vscode && npm install && npm run compile`
- To package: `npx @vscode/vsce package --allow-missing-repository --allow-star-activation`
- To install locally: `code --install-extension recurate-annotator-vscode-0.1.0.vsix`

---

**For more details**: See CURRENT_STATE.md | CHANGELOG.md | docs/extension-architecture.md
