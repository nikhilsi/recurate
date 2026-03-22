# Recurate

### Don't just chat, recurate.

**[recurate.ai](https://recurate.ai)**

---

## The Problem

Every major AI chat interface — Claude, ChatGPT, Grok, Gemini — gives you exactly one way to respond: a text box.

When the AI produces a detailed, multi-paragraph response and you agree with half of it, think one paragraph is brilliant, and another is completely wrong — your only option is to type a lengthy message explaining all of that. Most people don't bother. They just ask the next question and hope the AI figures out what mattered.

It doesn't. The conversation drifts. Context is lost. You start over.

**The text box is the only way to talk to AI. That's a problem.**

## The Idea

What if you could **annotate** parts of an AI response instead?

- **Highlight** (green) = "This matters. Carry this forward."
- **Strikethrough** (red) = "This is wrong or irrelevant. Drop it."
- **Dig deeper** (blue) = "Elaborate on this. I want more detail."
- **Verify** (amber) = "Fact-check this. I'm not sure it's right."

These gestures communicate in seconds what would take paragraphs to type. The AI gets clear signal about what you valued and what you didn't, and the next response is better for it.

This isn't just a feature. It's a fundamentally different way to communicate with AI — fast, gestural, non-verbal feedback that shapes the conversation's memory.

**Nobody has built this yet.**

## Products

### Recurate Annotator — Chrome Extension

A lightweight Chrome extension that adds annotation tools to AI chat interfaces. Works on **claude.ai**, **ChatGPT (chat.com)**, and **Microsoft Copilot** (consumer + enterprise). No backend, no API keys — just install and your conversations immediately get better.

- Side panel mirrors the AI's latest response
- Select text → floating toolbar → highlight, strikethrough, dig deeper, or verify
- Annotations auto-inject into the text box — zero-click feedback
- Works with light and dark themes

**Status:** Published — [Install from Chrome Web Store](https://chromewebstore.google.com/detail/recurate-annotator/nfkfbokpmmcdnhdpnhcbkppapnkcdphm)

### Recurate Annotator — VS Code Extension

Annotate **Claude Code** responses directly in VS Code. Same annotation UX, built for the terminal workflow.

- Sidebar watches Claude Code's conversation files (JSONL)
- Renders assistant text responses with full markdown formatting
- Annotate → feedback auto-copied to clipboard → paste into Claude Code
- Last 5 responses available with back/forward navigation

**Status:** Published — [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=recurate.recurate-annotator-vscode) | [Open VSX](https://open-vsx.org/extension/recurate/recurate-annotator-vscode) (Antigravity, VSCodium, Theia)

### Recurate Composer — Markdown Toolbar

AI responds in rich text. You're stuck with plain text. Recurate Composer levels the playing field — a floating markdown toolbar for every AI chat input box.

- Bold, italic, strikethrough, headings, code, lists, blockquotes, links
- Docks above the text box, follows as it expands
- Works on **claude.ai**, **ChatGPT**, **Grok**, **Gemini**, **Microsoft Copilot** (consumer + enterprise), and **Google Search**

**Status:** Published — [Install from Chrome Web Store](https://chromewebstore.google.com/detail/recurate-composer/kjohokkfembjbgcoclgomcjfnnpbehjg)

### Recurate Copier — Conversation Export

Three buttons on Claude.ai: Copy (markdown to clipboard), Download (quick HTML), Export (full ZIP with conversation + artifacts + uploads). Two buttons on other platforms.

- **Export on Claude.ai:** ZIP with conversation HTML, artifacts folder, uploads folder, inline links, and manifest. Progress modal with cancel button.
- **Auto-backup:** silently saves conversation HTML every 2 hours for open Claude.ai tabs. No clicks needed.
- **Message warning:** amber banner at 400+ messages warning about capacity limits
- Works on **claude.ai**, **ChatGPT**, **Grok**, **Gemini**, **Microsoft Copilot** (consumer + enterprise), and **Google AI Mode**

**Status:** v0.3.0 — [Download from GitHub Releases](https://github.com/nikhilsi/recurate/releases/latest) | Submitted to Chrome Web Store (pending review)

### Recurate Connect — Cross-Chat Context Sharing

Connect two AI chat tabs with one-click context sharing. Works across **Claude.ai** and **Microsoft Copilot**. Share messages between specialist chats via a shared space sidebar, or type `\rc` in the input box. Built for multi-chat workflows where each AI instance has its own role, memory, and context.

- One-click share or `\rc` command — last exchange injected and auto-sent to the other tab
- Cross-platform: Claude-to-Claude, Claude-to-Copilot, Copilot-to-Copilot
- Shared space sidebar and pop-out window for multi-monitor workflows
- Works in Chrome and Microsoft Edge
- 2-tab connection

**Status:** Built and tested — [Download and install from GitHub Releases](https://github.com/nikhilsi/recurate/releases/latest)

## The Suite

Four Chrome extensions that cover the full AI conversation lifecycle:

| Extension | What it does | Platforms |
|-----------|-------------|-----------|
| **Composer** | Shape the input | Claude, ChatGPT, Grok, Gemini, Copilot, Google Search |
| **Annotator** | Curate the output | Claude, ChatGPT, Copilot |
| **Copier** | Capture the conversation | Claude, ChatGPT, Grok, Gemini, Copilot, Google AI Mode |
| **Connect** | Connect the conversations | Claude, Copilot (Chrome + Edge) |

Plus a **VS Code extension** for annotating Claude Code responses in the terminal workflow.

No backend. No API keys. No data collection. Everything runs in the browser.

## Why "Recurate"

**Curate** is what you do — you curate the AI's response, selecting what's valuable and discarding what isn't.

**Re-curate** is what happens every turn — the conversation gets re-curated, refined, improved.

**Recurate** is the product — the tool that makes this possible.

## Documentation

- **[Design & Architecture](https://recurate.ai/design/)** — Design document and extension architecture
- **[Chrome Extension Architecture](https://recurate.ai/extension-architecture/)** — Implementation details for the Chrome extension
- **[VS Code Extension Architecture](https://recurate.ai/vscode-extension-architecture/)** — Implementation details for the VS Code extension
- **[Connect Architecture](https://recurate.ai/connect-architecture/)** — Cross-chat context sharing design
- **[Product Brief](https://recurate.ai/product_brief/)** — Non-technical product brief — the "why" and "what"
- **[Blog: The Text Box Problem](https://recurate.ai/blog/text-box-problem)** — Why the text box is AI's biggest UX blind spot
- **[Blog: 20+ Multi-Model AI Tools](https://recurate.ai/blog/multi-model-ai-tools-no-curation)** — The competitive landscape and the curation gap

## Tech Stack

| Component | Technology |
|-----------|------------|
| Chrome Extension (Annotator) | WXT, Preact, Preact Signals, TypeScript |
| VS Code Extension (Annotator) | VS Code Webview API, Preact, esbuild, Vite |
| Chrome Extension (Composer) | Vanilla JS, Chrome Manifest V3 |
| Chrome Extension (Copier) | Vanilla JS, Chrome Manifest V3 |
| Chrome Extension (Connect) | WXT, Preact, Preact Signals, TypeScript |

## Project Structure

```
recurate/
├── extensions/
│   ├── chrome/              # Recurate Annotator (Claude, ChatGPT, Copilot)
│   ├── vscode/              # Recurate Annotator (Claude Code)
│   ├── markdown-toolbar/    # Recurate Composer (8 platforms)
│   ├── conversation-copier/ # Recurate Copier (7 platforms)
│   └── connect/             # Recurate Connect (Claude + Copilot, 2-tab)
├── docs/                # MkDocs site (recurate.ai)
└── scripts/             # Icon and social card generation
```

## Contributing

If the problem resonates with you, star the repo and watch for updates. Issues and contributions welcome.

## License

MIT

---

*Built by [Nikhil Singhal](https://github.com/nikhilsi) — because every conversation with AI should get better, not just longer.*
