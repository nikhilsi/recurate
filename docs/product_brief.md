# Recurate — A Product Brief
### "Don't just chat, recurate." | recurate.ai

**Author:** Nikhil Singhal
**Date:** February 21, 2026 (last updated: March 21, 2026)
**Purpose:** A non-technical product brief — the "why" and "what", not the "how"

---

## The Problem You Already Know

You've experienced this. Everyone who uses Claude, ChatGPT, or Grok regularly has experienced this:

The AI gives you a long, thoughtful response. You agree with half of it. You think one paragraph is brilliant. Another paragraph is completely wrong. A third one is interesting but not what you asked about.

**And your only option is to type a message explaining all of that.**

"I liked your point about X but I disagree with Y because... and can you go deeper on Z but ignore the part about W..."

Most of the time, you don't bother. You just ask your next question and hope the AI figures out what mattered. It doesn't. The conversation drifts. You get frustrated. You start a new chat.

**The entire interaction model between humans and AI is limited to a text box.** That's like communicating with a colleague only through post-it notes — no facial expressions, no gestures, no nods, no head shakes.

---

## The Idea

**What if you could annotate parts of an AI's response?**

Not type about it. Just select text and gesture: *this matters* (highlight), *drop this* (strikethrough), *go deeper here* (dig deeper), or *check this* (verify). The AI gets that signal on the next turn and adjusts accordingly.

That's it. That's the core insight.

It sounds simple, but no one has built it. Not Anthropic, not OpenAI, not Google, not xAI. Every chat interface in the market is still text-box-only.

---

## Why This Matters More Than It Seems

**It compounds.** If I highlight the good parts and strikethrough the bad parts on turn 2, the AI's turn 3 response is better. I annotate that, turn 4 is even better. By turn 5, the conversation is precisely tuned to what I actually care about — in a way that text-box-only conversations never achieve.

**It captures signal that words can't.** Sometimes I highlight something and I couldn't even explain *why* it resonated. I just know it's the right thread to pull. That intuitive signal is impossible to convey by typing but trivial to convey by highlighting.

**It changes who controls the conversation.** Right now, the AI decides what to remember and prioritize from previous turns. Annotation gives the user explicit control over what gets carried forward. The user becomes a curator of the conversation's memory, not a passenger.

---

## The Recurate Extension Family

Recurate started as one extension (the Annotator) and grew into a suite that covers the full AI conversation lifecycle. Each extension was born from a real friction point in daily AI workflow.

### Recurate Annotator — Curate the Output

**Chrome Extension:** A side panel that mirrors the AI's latest response and lets you annotate it. Highlight what matters, strikethrough what doesn't, dig deeper into what's interesting, verify what's uncertain. Annotations auto-inject as structured KEEP/DROP/EXPLORE DEEPER/VERIFY feedback into the text box. No backend, no API keys.

- Works on **claude.ai, ChatGPT, Microsoft Copilot** (consumer + enterprise) — 4 platforms
- Published on [Chrome Web Store](https://chromewebstore.google.com/detail/recurate-annotator/nfkfbokpmmcdnhdpnhcbkppapnkcdphm)

**VS Code Extension:** The same annotation UX for the Claude Code terminal workflow. A sidebar that watches Claude Code's JSONL conversation files, renders markdown, and auto-copies annotation feedback to clipboard. You paste it into Claude Code when ready.

- Published on [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=recurate.recurate-annotator-vscode) and [Open VSX](https://open-vsx.org/extension/recurate/recurate-annotator-vscode) (for Antigravity, VSCodium, Theia)

### Recurate Composer — Compose the Input

AI responds in rich text. You're stuck with plain text. Recurate Composer adds a floating markdown toolbar to AI chat input boxes — bold, italic, strikethrough, headings, code, lists, blockquotes, links.

- Works on **claude.ai, ChatGPT, Grok, Gemini, Microsoft Copilot** (consumer + enterprise), **Google Search** — 8 platforms
- Published on [Chrome Web Store](https://chromewebstore.google.com/detail/recurate-composer/kjohokkfembjbgcoclgomcjfnnpbehjg)

### Recurate Copier — Capture the Conversation

Copy or download your full AI conversation — both your messages and the AI's responses. One click for clean markdown to clipboard, or download as a styled HTML file with formatted responses, smart filenames, and a print-ready layout.

- Works on **claude.ai, ChatGPT, Grok, Gemini, Microsoft Copilot** (consumer + enterprise), **Google AI Mode** — 7 platforms
- Three buttons on Claude.ai: Copy (markdown), Download (quick HTML with timestamp), Export (full ZIP with artifacts + uploads + progress modal)
- Published on [Chrome Web Store](https://chromewebstore.google.com/detail/recurate-copier/hjghmpleblbcgmmedlejbiemgggcmggg) (v0.1.0). v0.2.0 with ZIP export on [GitHub Releases](https://github.com/nikhilsi/recurate/releases/latest).

### Recurate Connect — Connect the Conversations

Connect two Claude.ai chat tabs with one-click context sharing. When you run specialist chats (e.g., Ops-HQ for strategy, Book HQ for writing), Connect lets you share messages between them without copy-paste. Type `\rc` to share the last exchange, or click the share button. A shared space sidebar shows everything that's been shared, and a pop-out window lets you view it on a second monitor.

- Works on **claude.ai** and **Microsoft Copilot** (m365.cloud.microsoft/chat) — cross-platform, 2-tab connection. Works in Chrome and Edge.
- v0.2.0 — [Download from GitHub Releases](https://github.com/nikhilsi/recurate/releases/latest). Built and tested.

### The Circle

Together, the four Chrome extensions cover the full AI conversation lifecycle:

- **Composer** — shape the input
- **Annotator** — curate the output
- **Copier** — capture the conversation
- **Connect** — connect the conversations

---

## What Exists Today

**No annotation mechanism exists anywhere.** Not as a feature in any LLM platform. Not as a third-party tool. Recurate is the first to build gestural, non-verbal feedback for AI conversations.

**Multi-LLM comparison tools exist** (ChatHub, TypingMind) — they show responses side by side. But none of them create shared context across models on subsequent turns. They're comparison tools, not conversation tools.

**No cross-chat coordination tool exists.** Recurate Connect is the first extension that lets multiple Claude.ai chat instances share context through a human-curated shared space.

---

## Technical Identity

All extensions run entirely in the browser. No backend, no API keys, no data collection. Conversations never leave the user's machine. Open source (MIT license).

| Extension | Tech Stack |
|-----------|------------|
| Annotator (Chrome) | WXT, Preact, Preact Signals, TypeScript |
| Annotator (VS Code) | VS Code Webview API, Preact, esbuild, Vite |
| Composer | Vanilla JS, Chrome Manifest V3 |
| Copier | Vanilla JS, Chrome Manifest V3 |
| Connect | WXT, Preact, Preact Signals, TypeScript |

---

## The Bigger Picture

Recurate is part of a broader exploration of how humans and AI can work together more effectively. The extensions solve the interaction problem within individual AI conversations. A separate platform ([app.recurate.ai](https://app.recurate.ai)) explores the multi-LLM coordination problem — sending one question to Claude, ChatGPT, Grok, and Gemini simultaneously and synthesizing their responses into a shared Condensed Context.

The annotation mechanism is the thread that connects everything: whether you're curating one model's response (Annotator), formatting your input to match the AI's expressiveness (Composer), capturing the conversation for reference (Copier), routing context between specialist chats (Connect), or shaping shared context across multiple models (Platform) — the user is always the curator.

---

*The full technical design document and extension architectures are available at [recurate.ai](https://recurate.ai).*
