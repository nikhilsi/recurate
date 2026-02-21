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

### 3. Chrome Web Store Submission
- [ ] Store description — lead with the problem, not the feature
- [ ] Screenshots showing before/after annotation quality
- [ ] Minimal permissions (builds trust, speeds review)
- [ ] 30-second demo video
- [ ] Free forever for the extension
- [ ] Review and submit

### 4. VS Code Extension
- [ ] Research Claude Code terminal output capture (hooks, shell integration API)
- [ ] Scaffold VS Code extension project (`extensions/vscode/`)
- [ ] Webview panel with shared annotation UI
- [ ] Terminal output capture (clipboard-based for V1, hooks for V2)
- [ ] Feedback injection via `Terminal.sendText()`
- [ ] Test with Claude Code in VS Code

### 5. Ship
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

---

**For more details**: See CURRENT_STATE.md | CHANGELOG.md | docs/extension-architecture.md
