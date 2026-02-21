# Changelog

All notable changes to this project will be documented in this file.

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
