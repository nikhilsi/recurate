# NOW - Current Focus & Next Steps

---
**Last Updated**: February 21, 2026
**Purpose**: What to work on next
**Context**: See CLAUDE.md for rules, CURRENT_STATE.md for what's built, docs/extension-architecture.md for extension details
---

**Phase**: Extension Implementation

---

## Recently Completed

- Complete design & architecture document (docs/design.md)
- Product brief (docs/product_brief.md)
- Blog article: "The Text Box Is the Only Way to Talk to AI. That's a Problem."
- Project scaffolding: README, CLAUDE.md, tracking docs
- MkDocs Material site: landing page, blog, docs, OG meta tags, GitHub Actions deploy
- Social card for link previews
- recurate.ai live with custom domain
- Extension architecture doc (docs/extension-architecture.md)
- Extension scaffold: WXT + Preact + Signals + TypeScript, builds clean

---

## Current Focus: Chrome Extension (Phase 0)

Build the Recurate Annotator — see docs/extension-architecture.md:

### Scaffold (Done)
1. [x] Set up extension project structure (WXT + Preact)
2. [x] Extension architecture doc
3. [x] Component architecture (ResponseView, Toolbar, List, Preview)
4. [x] State management (Preact Signals)
5. [x] Content script for claude.ai (extraction, injection, streaming detection)
6. [x] Background service worker (message relay)
7. [x] Styles (dark theme, annotation visuals)

### Integration Testing (Next)
8. [ ] Load extension in Chrome, verify side panel opens
9. [ ] Test response detection on claude.ai
10. [ ] Test annotation UX (select text, toolbar, highlight/strikethrough)
11. [ ] Test feedback preview + injection into text box
12. [ ] Debug and fix issues from real-world testing

### Polish
13. [ ] Handle edge cases (long responses, code blocks, empty selections)
14. [ ] SPA navigation handling (conversation switching)
15. [ ] Error states (selector failures, injection failures)
16. [ ] Extension icons (16, 32, 48, 128px)

### Ship
17. [ ] Test on multiple claude.ai conversations
18. [ ] Chrome Web Store listing
19. [ ] Logo and visual identity

---

## Website (recurate.ai)

1. [x] Site structure and deployment
2. [x] Custom domain configured
3. [ ] Logo and visual identity (when ready)

---

## Backlog

1. **Extension V1.1** — ⤵ "dig deeper" + ? "verify" annotation gestures
2. **Additional platforms** — chat.com, grok.com, gemini.google.com
3. **CC schema design** — critical for Roundtable, not needed for extension
4. **Synthesis prompt engineering** — auto-synthesis and user-refined prompts
5. **Roundtable backend** — FastAPI + LLM orchestration
6. **Roundtable frontend** — React + TypeScript
7. **Extension ↔ Platform convergence** (Phase 2)

---

## Reminders

- No API keys needed for the Chrome extension (fully client-side)
- docs/extension-architecture.md has the full tech details
- To test: `cd extension && npm run dev`, load `.output/chrome-mv3-dev` in chrome://extensions
- The extension is the priority — it validates the core UX before building the platform

---

**For more details**: See CURRENT_STATE.md | CHANGELOG.md | docs/extension-architecture.md
