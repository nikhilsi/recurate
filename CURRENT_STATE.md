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
- DESIGN.md — comprehensive design & architecture (implementation-ready)
- PRODUCT_BRIEF.md — non-technical product brief
- Blog article — "The Text Box Is the Only Way to Talk to AI. That's a Problem."
- CLAUDE.md — development rules and workflow
- Tracking docs — CHANGELOG.md, CURRENT_STATE.md, NOW.md

### Design Decisions (Locked)
- Chrome extension first (Phase 0), then Roundtable platform (Phase 1)
- Side panel approach (not DOM injection) for the extension
- Stateless LLM architecture for Roundtable — CC as sole persistent state
- Fast path (no annotation) + power path (annotate then proceed)
- Supported platforms: claude.ai, chat.com, grok.com, gemini.google.com

### Not Yet Built
- No code — extension, platform, website all pending
- No website — recurate.ai domain registered, MkDocs setup pending
- No logo or visual identity
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
| **Design & architecture** | `DESIGN.md` |
| **Product brief** | `PRODUCT_BRIEF.md` |
| **Blog article** | `The Text Box Is the Only Way to Talk to AI. That's a Problem.md` |
| **Dev rules** | `CLAUDE.md` |

---

**For more details**: See NOW.md | CHANGELOG.md | DESIGN.md
