# Don't just chat, recurate.

**Recurate** gives you annotation tools for AI conversations — highlight what matters, strikethrough what doesn't, dig deeper into what's interesting, verify what's uncertain, and watch the conversation get sharper every turn.

---

## The Problem

Every AI chat interface — Claude, ChatGPT, Grok, Gemini — gives you exactly one way to respond: **a text box**.

When the AI produces a detailed response and you agree with half, think one paragraph is brilliant, and another is completely wrong — your only option is to type a lengthy message explaining all of that. Most people don't bother. The conversation drifts.

**The text box is the only way to talk to AI. That's a problem.**

## The Solution

**Highlight** and **strikethrough** parts of an AI response instead.

- **Highlight** (green) = "This matters. Carry this forward."
- **Strikethrough** (red) = "This is wrong or irrelevant. Drop it."
- **Dig deeper** (blue) = "Elaborate on this. I want more detail."
- **Verify** (amber) = "Fact-check this. I'm not sure it's right."

These gestures communicate in seconds what would take paragraphs to type. The AI gets clear signal about what you valued and what you didn't, and the next response is better for it.

## The Products

### Recurate Annotator — Chrome Extension

A Chrome extension that adds annotation tools to AI chat interfaces. Opens a side panel, mirrors the AI's latest response, and lets you highlight, strikethrough, dig deeper, and verify. Annotations auto-inject as structured feedback into the platform's text box. Works on claude.ai and chat.com.

**Status:** Built and working

### Recurate Annotator — VS Code Extension

The same annotation UX, built for the Claude Code terminal workflow. A VS Code sidebar that watches Claude Code's conversation files, renders assistant text responses with full markdown formatting, and auto-copies annotation feedback to your clipboard. You paste it into Claude Code when you're ready.

**Status:** Built and working

### Recurate Roundtable — Multi-LLM Platform

Send your question to multiple AI models simultaneously. A synthesized shared context captures the best of each response. Annotate across all models — curate a conversation richer than any single model could produce alone.

**Status:** Design phase

---

[Read the Blog Post](blog/text-box-problem){ .md-button }
[View on GitHub](https://github.com/nikhilsi/recurate){ .md-button .md-button--primary }
