# Current State

---
**Last Updated**: February 21, 2026
**Purpose**: Project context for new Claude Code sessions
**What's Next**: See NOW.md
---

**Phase**: Extension Testing & Multi-Platform | **Status**: Chrome extension working on claude.ai, preparing for ChatGPT + VS Code + Chrome Web Store

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

### Chrome Extension (Working on claude.ai)
- WXT + Preact + Preact Signals + TypeScript
- Builds clean (74 KB total output)
- **Tested and working end-to-end on claude.ai:**
  - Response detection via MutationObserver on `data-is-streaming`
  - Response extraction and rendering in side panel (preserves HTML formatting)
  - Annotation UX: text selection → floating toolbar → highlight (green ✓) / strikethrough (red ✗)
  - DOM overlay annotations — `<mark>`/`<del>` wrappers applied via TreeWalker, preserves all formatting
  - Word-level selection snapping — partial word selections expand to full word boundaries
  - Auto-inject feedback into text box — annotations appear in claude.ai's input as user annotates, zero-click flow
  - Light/dark theme — side panel matches claude.ai's theme via CSS variables + content script detection
  - Background service worker — message relay between content script and side panel
  - State management via Preact Signals
  - Structured feedback formatter (KEEP/DROP format)

### Design Decisions (Locked)
- Chrome extension first (Phase 0), then Roundtable platform (Phase 1)
- Side panel approach (not DOM injection) for the extension
- WXT + Preact + Signals (not Svelte — familiarity for faster development)
- claude.ai first, then ChatGPT (chat.com), then other platforms
- Annotation UX: floating toolbar with ✓ (green), ✗ (red), ↺ (gray)
- Word-level selection snapping, no overlap (new replaces old)
- Auto-inject feedback into text box (proactive injection, no Apply/Inject buttons)
- Stateless LLM architecture for Roundtable — CC as sole persistent state
- Project structure: `extensions/chrome/`, `extensions/vscode/` (future)
- VS Code extension planned — same annotation UX, different host environment

### Not Yet Built
- ChatGPT (chat.com) content script
- VS Code extension
- Chrome Web Store listing
- Logo, icons, visual identity
- Settings/config page
- Platform (Roundtable) — design phase only

---

## Open Design Items

### Resolved (Extension)
- ~~Annotation UX design~~ → floating toolbar with ✓/✗/↺ icons
- ~~Annotation → feedback format~~ → KEEP/DROP structured text
- ~~Platform DOM selectors~~ → claude.ai selectors documented (data-is-streaming, ProseMirror)
- ~~Tech stack~~ → WXT + Preact + Signals + TypeScript
- ~~Feedback injection flow~~ → proactive auto-inject into text box (no Apply/Inject buttons)
- ~~Theme support~~ → CSS variables, content script detects claude.ai's light/dark mode
- ~~Selection precision~~ → word-level snapping
- ~~HTML formatting preservation~~ → DOM overlay approach (TreeWalker + surroundContents)

### To Research (Next)
- chat.com DOM structure (response containers, input field, streaming indicators)
- VS Code extension architecture (terminal capture, Webview panel, Claude Code hooks)

### Critical (Roundtable — not needed for extensions)
1. CC schema/structure — JSON vs natural language, token budget
2. Synthesis model selection — cheap model vs frontier vs rotating
3. Auto-synthesis prompt design
4. User-refined synthesis prompt design

### Upcoming (Extension V1.1)
- ⤵ "Dig deeper" annotation gesture
- ? "Verify this" annotation gesture
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
| **Platform selectors** | `extensions/chrome/lib/platforms/claude.ts` |
| **Annotation state** | `extensions/chrome/entrypoints/sidepanel/state/annotations.ts` |

---

**For more details**: See NOW.md | CHANGELOG.md | docs/extension-architecture.md
