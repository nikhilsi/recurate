# Claude Code Development Guide

---
**Last Updated**: March 6, 2026
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
- **docs/design.md** — Design & architecture document
- **docs/extension-architecture.md** — Chrome extension architecture
- **docs/vscode-extension-architecture.md** — VS Code extension architecture
- **docs/product_brief.md** — Non-technical product brief


- Before beginning implementation, check with your project lead for any cross-session context or coordination notes that may affect this work.

---

## Critical Rules

### Non-Negotiables
1. **Unauthorized commits** — NEVER commit without explicit approval
2. **Over-engineering** — KISS principle always. Keep it simple.
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
- **TypeScript** (all extension code): Strong typing, clear naming, minimal dependencies
- **No notebooks in git** — Convert to scripts before committing

### Git Workflow
- **Atomic commits** — One logical change per commit
- **Clear messages** — Descriptive, explain the why
- **NO attribution** — Never include "Generated with Claude" or Co-Authored-By lines
- **Working state** — Every commit leaves code functional

### Documentation Discipline
- **After each change**: Update CURRENT_STATE.md, NOW.md, CHANGELOG.md as needed
- **Do not defer docs** — Each commit is a complete, coherent snapshot

---

## Project Summary

**Recurate** is a set of tools that let you curate AI conversations instead of just chatting through them.

The core insight: every AI chat interface gives you a text box as the only way to respond. When the AI gives a long response and you agree with half and disagree with half, your only option is to type a paragraph explaining that. Most people don't bother. The conversation drifts.

**Highlight + strikethrough** on the AI's response communicates in seconds what would take paragraphs to type. The AI gets clear signal about what you valued and what you didn't.

### Extensions

*Chrome Extension* — Side panel annotation for web-based AI chat. Highlight/strikethrough/dig deeper/verify → structured feedback auto-injects into text box. Works on claude.ai, ChatGPT (chat.com), and Microsoft Copilot (consumer + enterprise). Built and working. Published on Chrome Web Store.

*VS Code Extension* — Sidebar annotation for Claude Code terminal workflow. Watches JSONL files, renders markdown, auto-copies feedback to clipboard. Built and working. Published on VS Code Marketplace and Open VSX.

*Markdown Toolbar (Recurate Composer)* — Floating markdown formatting toolbar for AI chat input boxes. The input-side complement to the output-side Annotator. Bold, italic, strikethrough, headings, code, lists, blockquotes, links. Works on claude.ai, ChatGPT, Grok, Gemini, Microsoft Copilot (consumer + enterprise), and Google Search. Vanilla JS, no build step.

*Conversation Copier (Recurate Copier)* — Copy or download full AI conversations (both user messages and AI responses). Copies as clean markdown to clipboard, or downloads as styled HTML with full sanitization (strips platform DOM cruft). Injects into native action bars on Claude and Grok; floating buttons on other platforms. Works on claude.ai, ChatGPT, Grok, Gemini, Microsoft Copilot (consumer + enterprise), and Google AI Mode. Vanilla JS, no build step.

- No backend, no API keys, fully client-side
- Annotator extensions share Preact + Signals UI
- Composer and Copier are standalone vanilla JS (no framework, no build)

### Tech Stack

| Component | Technology |
|-----------|------------|
| Chrome Extension (Annotator) | WXT, Preact, Preact Signals, TypeScript |
| VS Code Extension (Annotator) | VS Code Webview API, Preact, esbuild, Vite |
| Chrome Extension (Composer) | Vanilla JS, Chrome Manifest V3 |
| Chrome Extension (Copier) | Vanilla JS, Chrome Manifest V3 |

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
│   ├── design.md                (Design & architecture)
│   ├── extension-architecture.md (Chrome extension architecture)
│   ├── vscode-extension-architecture.md (VS Code extension architecture)
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
│   ├── chrome/                  (Chrome extension — 4 platforms)
│   │   ├── wxt.config.ts        (WXT + Vite + Preact configuration)
│   │   ├── entrypoints/
│   │   │   ├── background.ts    (Service worker)
│   │   │   ├── claude.content.ts (Content script for claude.ai)
│   │   │   ├── chatgpt.content.ts (Content script for chat.com)
│   │   │   ├── copilot.content.ts (Content script for copilot.microsoft.com)
│   │   │   ├── copilot-enterprise.content.ts (Content script for m365.cloud.microsoft)
│   │   │   └── sidepanel/       (Side panel UI — Preact components)
│   │   └── lib/                 (Shared types, formatter, platform selectors)
│   │
│   ├── vscode/                  (VS Code extension — Claude Code)
│   │   ├── src/                 (Extension host: watcher, provider, clipboard)
│   │   ├── webview/             (Sidebar UI — Preact, same components as Chrome)
│   │   └── shared/              (Types, formatter shared between host + webview)
│   │
│   ├── markdown-toolbar/        (Recurate Composer — 8 platforms)
│   │   ├── manifest.json        (Chrome Manifest V3)
│   │   ├── content.js           (All logic — platform detection, formatting, toolbar UI)
│   │   ├── icon.svg             (Master icon SVG)
│   │   └── STORE_LISTING.md     (Chrome Web Store listing text)
│   │
│   └── conversation-copier/     (Recurate Copier — 7 platforms)
│       ├── manifest.json        (Chrome Manifest V3)
│       ├── content.js           (All logic — conversation extraction, export)
│       └── icon.svg             (Master icon SVG)
│
└── scripts/                     (Icon generation, social card generation)
```

---

## Key Concepts

- **Annotation** — Highlight (carry forward), strikethrough (drop it), dig deeper (elaborate), and verify (fact-check) gestures on AI responses. The core UX innovation.
- **Fast path** — User just asks their next question without annotating. Zero friction.
- **Power path** — User annotates before proceeding. The AI's next response is better because it got explicit signal.
- **Side Panel** — Chrome's built-in Side Panel API. Chosen over DOM injection for platform-agnostic robustness.

---

## Key Files

| Purpose | File |
|---------|------|
| **Design & architecture** | `docs/design.md` |
| **Extension architecture** | `docs/extension-architecture.md` |
| **VS Code architecture** | `docs/vscode-extension-architecture.md` |
| **Product brief** | `docs/product_brief.md` |
| **Blog post 1** | `docs/blog/posts/text-box-problem.md` |
| **Blog post 2** | `docs/blog/posts/twenty-tools-zero-curation.md` |
| **Dev rules** | `CLAUDE.md` |
| **Update checklist** | `UPDATE_CHECKLIST.md` |
| **Site config** | `mkdocs.yml` |
| **Annotator config** | `extensions/chrome/wxt.config.ts` |
| **Content script (claude.ai)** | `extensions/chrome/entrypoints/claude.content.ts` |
| **Content script (ChatGPT)** | `extensions/chrome/entrypoints/chatgpt.content.ts` |
| **Content script (Copilot)** | `extensions/chrome/entrypoints/copilot.content.ts` |
| **Content script (Copilot Enterprise)** | `extensions/chrome/entrypoints/copilot-enterprise.content.ts` |
| **Platform selectors (claude.ai)** | `extensions/chrome/lib/platforms/claude.ts` |
| **Platform selectors (ChatGPT)** | `extensions/chrome/lib/platforms/chatgpt.ts` |
| **Platform selectors (Copilot)** | `extensions/chrome/lib/platforms/copilot.ts` |
| **Platform selectors (Copilot Enterprise)** | `extensions/chrome/lib/platforms/copilot-enterprise.ts` |
| **Annotation state** | `extensions/chrome/entrypoints/sidepanel/state/annotations.ts` |
| **VS Code extension entry** | `extensions/vscode/src/extension.ts` |
| **JSONL watcher** | `extensions/vscode/src/jsonlWatcher.ts` |
| **VS Code webview provider** | `extensions/vscode/src/webviewProvider.ts` |
| **VS Code webview app** | `extensions/vscode/webview/App.tsx` |
| **Master icon SVG** | `docs/assets/images/recurate-icon.svg` |
| **Icon generation** | `scripts/generate-icons.mjs` |
| **Social card generation** | `scripts/generate-social-card.mjs` |
| **Composer content script** | `extensions/markdown-toolbar/content.js` |
| **Composer manifest** | `extensions/markdown-toolbar/manifest.json` |
| **Composer store listing** | `extensions/markdown-toolbar/STORE_LISTING.md` |
| **Composer icon** | `extensions/markdown-toolbar/icon.svg` |
| **Copier content script** | `extensions/conversation-copier/content.js` |
| **Copier manifest** | `extensions/conversation-copier/manifest.json` |
| **Copier icon** | `extensions/conversation-copier/icon.svg` |
