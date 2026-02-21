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

What if you could **highlight** and **strikethrough** parts of an AI response instead?

- **Highlight** = "This matters. Carry this forward."
- **Strikethrough** = "This is wrong or irrelevant. Drop it."

These gestures communicate in seconds what would take paragraphs to type. The AI gets clear signal about what you valued and what you didn't, and the next response is better for it.

This isn't just a feature. It's a fundamentally different way to communicate with AI — fast, gestural, non-verbal feedback that shapes the conversation's memory.

**Nobody has built this yet.**

## Two Products

### Recurate Annotator — Chrome Extension

A lightweight Chrome extension that adds annotation tools to any AI chat interface. Works on claude.ai, chat.com, grok.com, and gemini.google.com. No backend, no API keys — just install and your conversations immediately get better.

**Status:** In development

### Recurate Roundtable — Multi-LLM Platform

A web application that sends your question to multiple AI models simultaneously, synthesizes their perspectives into a shared context, and lets you curate across all of them. Each model benefits from the others' insights. By turn 3-4, the conversation reaches a depth no single model could achieve alone.

The annotation mechanism becomes even more powerful here — you're curating across multiple AI perspectives, shaping a shared memory that all models build on.

**Status:** Design phase — see [Design & Architecture](https://recurate.ai/design/)

## How It Works

```
Turn 1: You ask a question
        → AI responds with a detailed answer
        → You highlight the brilliant parts, strikethrough the wrong parts
        → The AI carries forward what you valued

Turn 2: You ask a follow-up
        → The AI's response is already better — informed by your curation
        → You highlight and strikethrough again
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

- **[Design & Architecture](https://recurate.ai/design/)** — Complete design and architecture document
- **[Product Brief](https://recurate.ai/product_brief/)** — Non-technical product brief — the "why" and "what"
- **[Blog: The Text Box Problem](https://recurate.ai/blog/text-box-problem)** — Why the text box is AI's biggest UX blind spot

## Tech Stack

| Component | Technology |
|-----------|------------|
| Chrome Extension | Manifest V3, Side Panel API |
| Roundtable Frontend | React, TypeScript |
| Roundtable Backend | Python, FastAPI |
| LLM APIs | Anthropic, OpenAI, xAI, Google |

## Contributing

This project is in early development. If the problem resonates with you, star the repo and watch for updates. Contributions welcome once the initial architecture is in place.

## License

MIT

---

*Built by [Nikhil Singhal](https://github.com/nikhilsi) — because every conversation with AI should get better, not just longer.*
