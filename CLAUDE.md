# Claude Code Development Guide

---
**Last Updated**: February 21, 2026
**Purpose**: Rules and workflow for working with this codebase
---

## Starting a New Session

**Read these docs in order:**

1. **CLAUDE.md** (this file) — Rules & workflow
2. **README.md** — Project overview and product summary
3. **CURRENT_STATE.md** — What's built & current status
4. **CHANGELOG.md** — Version history & recent changes
5. **NOW.md** — What to work on next
6. **`git log --oneline -10`** — Recent commits

**Detailed reference** (read when relevant to your task):
- **docs/design.md** — Complete design & architecture document (Chrome extension + Roundtable platform)
- **docs/product_brief.md** — Non-technical product brief — the "why" and "what"

---

## Critical Rules

### Non-Negotiables
1. **Unauthorized commits** — NEVER commit without explicit approval
2. **Over-engineering** — KISS principle always. Ship the extension first, keep it simple.
3. **Not reading requirements** — Full attention to specs, read the docs thoroughly
4. **Guessing** — Say "I don't know" if unsure
5. **Not thinking critically** — Question things that don't make sense
6. **Skipping analysis** — Don't generate code without understanding the problem first
7. **Premature abstraction** — Don't build frameworks. Build things that work.

### How to Be a True Partner
- **Thoughtful design first** — Discuss before coding
- **One piece at a time** — Complete, review, then proceed
- **KISS principle** — Simple > clever
- **Explicit permission** — Get approval before every commit
- **Challenge bad ideas** — Don't just agree
- **Ask clarifying questions** — Don't assume
- **Think consequences** — Maintenance, performance, edge cases

---

## Development Standards

### Code Quality
- **TypeScript/JavaScript** (Chrome extension): Strong typing, clear naming, minimal dependencies
- **Python** (Roundtable backend): Type hints, proper error handling, clear variable names
- **React** (Roundtable frontend): Functional components, hooks, TypeScript
- **No notebooks in git** — Convert to scripts before committing

### Git Workflow
- **Atomic commits** — One logical change per commit
- **Clear messages** — Descriptive, explain the why
- **NO attribution** — Never include "Generated with Claude"
- **Working state** — Every commit leaves code functional

---

## Project Summary

**Recurate** is a set of tools that let you curate AI conversations instead of just chatting through them.

The core insight: every AI chat interface gives you a text box as the only way to respond. When the AI gives a long response and you agree with half and disagree with half, your only option is to type a paragraph explaining that. Most people don't bother. The conversation drifts.

**Highlight + strikethrough** on the AI's response communicates in seconds what would take paragraphs to type. The AI gets clear signal about what you valued and what you didn't.

### Two Products

**Phase 0: Recurate Annotator (Chrome Extension)**
- Side panel that mirrors the AI's latest response
- Highlight (carry forward) and strikethrough (drop it) annotation
- Auto-generates structured feedback, injects into the platform's text box
- Works on claude.ai, chat.com, grok.com, gemini.google.com
- No backend, no API keys, fully client-side
- **This ships first.**

**Phase 1: Recurate Roundtable (Web Platform)**
- Send one question to multiple LLMs simultaneously
- Condensed Context (CC) synthesizes all responses into shared memory
- Annotation mechanism built natively (curate across models)
- Stateless architecture — each LLM call gets CC + new question, no per-model state
- React frontend + Python/FastAPI backend
- **Ships after the extension validates the annotation UX.**

### Tech Stack

| Component | Technology |
|-----------|------------|
| Chrome Extension | Manifest V3, Side Panel API, vanilla JS |
| Roundtable Frontend | React, TypeScript |
| Roundtable Backend | Python, FastAPI |
| LLM APIs | Anthropic, OpenAI, xAI, Google |
| Database | SQLite (personal) → PostgreSQL (scaled) |

---

## Project Structure

```
recurate/
├── CLAUDE.md                    (Development rules — this file)
├── README.md                    (Project overview — GitHub landing page)
├── CURRENT_STATE.md             (What's built & status)
├── NOW.md                       (Current priorities)
├── CHANGELOG.md                 (Version history)
├── LICENSE                      (MIT)
│
├── docs/                        (MkDocs source — serves recurate.ai)
│   ├── index.md                 (Site landing page)
│   ├── CNAME                    (Custom domain: recurate.ai)
│   ├── product_brief.md         (Non-technical product brief)
│   ├── design.md                (Complete design & architecture)
│   ├── overrides/
│   │   └── main.html            (OG meta tags)
│   ├── assets/images/           (Logo, favicon, social card)
│   └── blog/
│       ├── index.md             (Blog landing)
│       ├── .authors.yml         (Author profiles)
│       └── posts/
│           └── text-box-problem.md  (Blog article)
│
├── extensions/
│   └── chrome/                  (Phase 0 — Chrome extension, WXT + Preact)
│       ├── wxt.config.ts        (WXT + Vite + Preact configuration)
│       ├── entrypoints/
│       │   ├── background.ts    (Service worker)
│       │   ├── claude.content.ts (Content script for claude.ai)
│       │   └── sidepanel/       (Side panel UI — Preact components)
│       └── lib/                 (Shared types, formatter, platform selectors)
│
└── platform/                    (Phase 1 — Roundtable web app)
    ├── frontend/                (React + TypeScript)
    └── backend/                 (Python + FastAPI)
```

**Note:** The `platform/` directory doesn't exist yet. See `docs/extension-architecture.md` for the full extension structure.

---

## Key Concepts

- **Annotation** — Highlight (carry forward) and strikethrough (drop it) gestures on AI responses. The core UX innovation.
- **Condensed Context (CC)** — Rolling synthesized summary of a multi-model conversation. Sole persistent state for the Roundtable. Re-generated every turn.
- **Fast path** — User just asks their next question without annotating. Zero friction.
- **Power path** — User annotates before proceeding. The AI's next response is better because it got explicit signal.
- **Auto-synthesis** — CC generated automatically from model responses (no user input).
- **User-refined synthesis** — CC re-generated after user annotates (easier prompt, user has given explicit signals).
- **Side Panel** — Chrome's built-in Side Panel API. Chosen over DOM injection for platform-agnostic robustness.

---

## Current Limitations

- No code written yet — design phase only
- No website — MkDocs setup pending (see SITE_SETUP_GUIDE.md)
- No logo or visual identity
- CC schema not yet defined (critical open item — see docs/design.md Section 6.3)
- Synthesis model not yet selected (critical open item — see docs/design.md Section 6.4)
- DOM selectors for each LLM platform not yet researched
