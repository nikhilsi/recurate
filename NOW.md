# NOW - Current Focus & Next Steps

---
**Last Updated**: February 21, 2026
**Purpose**: What to work on next
**Context**: See CLAUDE.md for rules, CURRENT_STATE.md for what's built, docs/design.md for the full design
---

**Phase**: Pre-implementation → Website + Extension Build

---

## Recently Completed

- Complete design & architecture document (docs/design.md)
- Product brief (docs/product_brief.md)
- Blog article: "The Text Box Is the Only Way to Talk to AI. That's a Problem."
- Project scaffolding: README, CLAUDE.md, tracking docs
- MkDocs Material site: landing page, blog, docs, OG meta tags, GitHub Actions deploy
- Social card for link previews

---

## Next Priority

### Track 1: Website (recurate.ai)

1. [x] Reorganize files into MkDocs layout (docs/ folder)
2. [x] Create mkdocs.yml configuration
3. [x] Create GitHub Actions deploy workflow
4. [x] Create site landing page (docs/index.md)
5. [x] Set up blog with the text-box-problem article
6. [x] Add OG meta tags for social preview
7. [ ] Configure custom domain DNS at GoDaddy
8. [ ] Set GitHub Pages source to "GitHub Actions" + add custom domain
9. [ ] Logo and visual identity (when ready)

### Track 2: Chrome Extension (Phase 0)

Build the Recurate Annotator — see docs/design.md Section 3:

1. [ ] Set up extension project structure (Manifest V3)
2. [ ] Implement side panel with annotation UI (highlight + strikethrough)
3. [ ] Build content script: extract latest AI response from DOM
4. [ ] Build content script: inject structured feedback into text input
5. [ ] Test on claude.ai (primary target)
6. [ ] Test on chat.com, grok.com, gemini.google.com
7. [ ] Polish UX — annotation must be faster than typing
8. [ ] Chrome Web Store listing

---

## Backlog

1. **CC schema design** — critical for Roundtable, not needed for extension
2. **Synthesis prompt engineering** — auto-synthesis and user-refined prompts
3. **Roundtable backend** — FastAPI + LLM orchestration
4. **Roundtable frontend** — React + TypeScript
5. **Extension ↔ Platform convergence** (Phase 2)

---

## Reminders

- Domain registered: recurate.ai
- No API keys needed for the Chrome extension (fully client-side)
- docs/design.md is implementation-ready for the extension
- The extension is the priority — it validates the core UX before building the platform

---

**For more details**: See CURRENT_STATE.md | CHANGELOG.md | docs/design.md
