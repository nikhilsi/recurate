# Changelog

All notable changes to this project will be documented in this file.

---

## [0.2.0] - 2026-02-21

### Added
- recurate.ai website — MkDocs Material, GitHub Pages, custom domain, blog, OG meta tags
- Extension architecture doc (docs/extension-architecture.md)
- Chrome extension scaffold — WXT + Preact + Preact Signals + TypeScript
  - Side panel with component architecture (ResponseView, AnnotationToolbar, AnnotationList, FeedbackPreview)
  - Content script for claude.ai (MutationObserver response detection, ProseMirror injection)
  - Background service worker (message relay between content script and side panel)
  - Annotation state management via Preact Signals
  - Dark theme with highlight (green) and strikethrough (red) annotation styles
  - Structured feedback formatter (KEEP/DROP format)
- .gitignore for build artifacts

### Tech Decisions
- **WXT** for extension build framework (file-based entrypoints, auto-manifest, HMR)
- **Preact + Signals** for side panel UI (4KB runtime, fine-grained reactivity)
- **TypeScript** across all extension code
- **claude.ai first** — V1 targets claude.ai only, other platforms follow same architecture
- **Annotation UX** — floating toolbar with ✓ (highlight), ✗ (strikethrough), ↺ (clear)

### Changed
- Moved DESIGN.md, PRODUCT_BRIEF.md, blog article into docs/ folder (served on site)
- Updated all cross-references in CLAUDE.md, README, tracking docs
- Fixed blog article Phase 1/2 numbering inconsistency
- Fixed broken BLOG.md link in README

---

## [0.1.0] - 2026-02-21

### Added
- Project concept and design documentation
- README.md — project overview, problem statement, two-product vision
- DESIGN.md — complete design & architecture document covering:
  - Chrome extension (Recurate Annotator) — side panel, annotation UX, structured feedback injection
  - Web platform (Recurate Roundtable) — multi-LLM orchestration, Condensed Context, stateless architecture
  - Annotation mechanism — highlight/strikethrough as non-verbal feedback
  - Token economics — ~2.5-3x cost vs single model, ~$0.05-0.15 per 5-turn conversation
  - API landscape — Anthropic, OpenAI, xAI, Google compatibility research
  - Data model — Conversations, Turns, ModelResponses, CondensedContext, Annotations
  - 18 open items tracked with priority levels
- PRODUCT_BRIEF.md — non-technical product brief for stakeholder discussions
- Blog article: "The Text Box Is the Only Way to Talk to AI. That's a Problem."
- CLAUDE.md — development rules and workflow for Claude Code sessions
- CURRENT_STATE.md, NOW.md — project tracking documents

### Key Design Decisions
- **Two products, phased delivery** — Chrome extension ships first (validates annotation UX), Roundtable platform ships second
- **Side panel over DOM injection** — platform-agnostic, robust, lower maintenance
- **Stateless LLM calls** — no per-model conversation history, CC is sole persistent state
- **Fast path + power path** — annotation is optional, not required. Zero friction when you don't need it.
- **Brand: Recurate** — curate + re-curate. Tagline: "Don't just chat, recurate."

### Decided
- Domain registered: recurate.ai
- MIT License
- Phase 0 (Chrome extension) before Phase 1 (Roundtable platform)
- Extension targets: claude.ai, chat.com, grok.com, gemini.google.com
