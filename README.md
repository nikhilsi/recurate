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

Copy or download your full AI conversation — both your messages and the AI's responses. One click for clean markdown, or download as a styled HTML file you can open anywhere.

- Full conversation export (not just the last response)
- Smart filenames with platform name and conversation title
- HTML sanitization strips platform DOM cruft for clean, portable exports
- Native action bar injection on **Claude** and **Grok**; floating buttons on other platforms
- Works on **claude.ai**, **ChatGPT**, **Grok**, **Gemini**, **Microsoft Copilot** (consumer + enterprise), and **Google AI Mode**

**Status:** Built and tested on 6 of 7 platforms — Chrome Web Store publication pending

## How It Works

```
Turn 1: You ask a question
        → AI responds with a detailed answer
        → You highlight the brilliant parts, strikethrough the wrong parts,
          flag what needs elaboration or fact-checking
        → The AI carries forward what you valued

Turn 2: You ask a follow-up
        → The AI's response is already better — informed by your curation
        → You annotate again
        → The conversation compounds in quality

Turn N: Every turn is sharper than the last
        → Because the AI knows what matters to you
        → Not because you typed paragraphs explaining it
        → But because you curated
```

## Why "Recurate"

**Curate** is what you do — you curate the AI's response, selecting what's valuable and discarding what isn't.

**Re-curate** is what happens every turn — the conversation gets re-curated, refined, improved.

**Recurate** is the product — the tool that makes this possible.

## Documentation

- **[Design & Architecture](https://recurate.ai/design/)** — Design document and extension architecture
- **[Chrome Extension Architecture](https://recurate.ai/extension-architecture/)** — Implementation details for the Chrome extension
- **[VS Code Extension Architecture](https://recurate.ai/vscode-extension-architecture/)** — Implementation details for the VS Code extension
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

## Project Structure

```
recurate/
├── extensions/
│   ├── chrome/              # Recurate Annotator (claude.ai + ChatGPT + Copilot)
│   ├── vscode/              # Recurate Annotator (Claude Code)
│   ├── markdown-toolbar/    # Recurate Composer (8 platforms)
│   └── conversation-copier/ # Recurate Copier (7 platforms)
├── docs/                # MkDocs site (recurate.ai)
└── scripts/             # Icon and social card generation
```

## Contributing

This project is in early development. If the problem resonates with you, star the repo and watch for updates. Contributions welcome once the initial architecture is in place.

## License

MIT

---

*Built by [Nikhil Singhal](https://github.com/nikhilsi) — because every conversation with AI should get better, not just longer.*
