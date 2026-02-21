# Current State

---
**Last Updated**: February 21, 2026
**Purpose**: Project context for new Claude Code sessions
**What's Next**: See NOW.md
---

**Phase**: Extension Implementation | **Status**: Scaffold complete, building core features

---

## What Exists

### Documentation (Complete)
- README.md — project overview and two-product vision
- docs/design.md — comprehensive design & architecture (implementation-ready)
- docs/product_brief.md — non-technical product brief
- docs/extension-architecture.md — Chrome extension technical architecture
- Blog article — docs/blog/posts/text-box-problem.md
- CLAUDE.md — development rules and workflow
- Tracking docs — CHANGELOG.md, CURRENT_STATE.md, NOW.md

### Website (Live)
- recurate.ai — MkDocs Material site, deployed via GitHub Pages
- Blog with first article live
- No logo or visual identity yet

### Chrome Extension (Scaffolded)
- WXT + Preact + Preact Signals + TypeScript
- Builds clean (71 KB total output)
- Side panel with component architecture (ResponseView, AnnotationToolbar, AnnotationList, FeedbackPreview)
- Content script for claude.ai (MutationObserver, response extraction, feedback injection)
- Background service worker (message relay, side panel management)
- State management via Preact Signals
- Annotation styles (highlight green, strikethrough red)

### Design Decisions (Locked)
- Chrome extension first (Phase 0), then Roundtable platform (Phase 1)
- Side panel approach (not DOM injection) for the extension
- WXT + Preact + Signals (not Svelte — familiarity for faster development)
- claude.ai only for V1 (other platforms follow same architecture)
- Annotation UX: floating toolbar with ✓ (green), ✗ (red), ↺ (gray)
- Arbitrary text selection, no snapping, no overlap (new replaces old)
- Explicit "Apply" button with preview before injection
- Stateless LLM architecture for Roundtable — CC as sole persistent state

### Not Yet Built
- Extension not yet tested in Chrome (needs manual load)
- No Chrome Web Store listing
- No logo or visual identity
- Platform (Roundtable) — design phase only

---

## Open Design Items

### Resolved (Extension)
- ~~Annotation UX design~~ → floating toolbar with ✓/✗/↺ icons
- ~~Annotation → feedback format~~ → KEEP/DROP structured text
- ~~Platform DOM selectors~~ → claude.ai selectors documented (data-is-streaming, ProseMirror)
- ~~Tech stack~~ → WXT + Preact + Signals + TypeScript

### Critical (Roundtable — not needed for extension)
1. CC schema/structure — JSON vs natural language, token budget
2. Synthesis model selection — cheap model vs frontier vs rotating
3. Auto-synthesis prompt design
4. User-refined synthesis prompt design

### Upcoming (Extension V1.1)
- ⤵ "Dig deeper" annotation gesture
- ? "Verify this" annotation gesture

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

---

**For more details**: See NOW.md | CHANGELOG.md | docs/extension-architecture.md
