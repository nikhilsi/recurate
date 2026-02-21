# Current State

---
**Last Updated**: February 21, 2026
**Purpose**: Project context for new Claude Code sessions
**What's Next**: See NOW.md
---

**Phase**: Pre-implementation | **Status**: Design complete, ready to build

---

## What Exists

### Documentation (Complete)
- README.md — project overview and two-product vision
- docs/design.md — comprehensive design & architecture (implementation-ready)
- docs/product_brief.md — non-technical product brief
- Blog article — docs/blog/posts/text-box-problem.md
- CLAUDE.md — development rules and workflow
- Tracking docs — CHANGELOG.md, CURRENT_STATE.md, NOW.md

### Design Decisions (Locked)
- Chrome extension first (Phase 0), then Roundtable platform (Phase 1)
- Side panel approach (not DOM injection) for the extension
- Stateless LLM architecture for Roundtable — CC as sole persistent state
- Fast path (no annotation) + power path (annotate then proceed)
- Supported platforms: claude.ai, chat.com, grok.com, gemini.google.com

### Website
- recurate.ai — MkDocs Material site, deployed via GitHub Pages
- Blog with first article live
- No logo or visual identity yet

### Not Yet Built
- No code — extension, platform pending
- No Chrome Web Store listing

---

## Open Design Items (from DESIGN.md Section 12)

### Critical (Must Resolve Before Implementation)
1. CC schema/structure — JSON vs natural language, token budget
2. Synthesis model selection — cheap model vs frontier vs rotating
3. Auto-synthesis prompt design
4. User-refined synthesis prompt design
5. Annotation UX design — text selection mechanism, floating toolbar
6. Annotation → synthesis translation format

### Important (Resolve During Implementation)
7. Platform DOM selectors for response extraction and text injection
8. Error handling for API failures (one model down)
9. Streaming responses — stream as they arrive or wait for all?
10. Model configuration UI and API key management

---

## Key Files

| Purpose | File |
|---------|------|
| **Design & architecture** | `docs/design.md` |
| **Product brief** | `docs/product_brief.md` |
| **Blog article** | `docs/blog/posts/text-box-problem.md` |
| **Dev rules** | `CLAUDE.md` |
| **Site config** | `mkdocs.yml` |

---

**For more details**: See NOW.md | CHANGELOG.md | docs/design.md
