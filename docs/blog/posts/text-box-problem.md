---
date: 2026-02-21
authors:
  - nikhil
slug: text-box-problem
title: "The Text Box Is the Only Way to Talk to AI. That's a Problem."
description: "Why the text box is AI's biggest UX blind spot, and what we're building to fix it."
---

# The Text Box Is the Only Way to Talk to AI. That's a Problem.

I had a moment last week that probably sounds familiar.

I was deep in a conversation with an AI assistant — five turns in, discussing something strategic and nuanced. The AI gave me a long, detailed response. Three paragraphs were exactly what I needed. One paragraph was completely off base. And one sentence buried in the middle was genuinely brilliant — the kind of insight I wanted to build the entire next turn around.

So what did I do?

I typed a message. A long one. "I agree with your first point about X, but the part about Y is wrong because... and that sentence about Z — that's exactly right, let's go deeper on that, but ignore the stuff about W..."

By the time I finished typing, I'd spent more time writing my feedback than reading the original response. And I knew that half my nuance would get lost anyway — the AI would latch onto some parts of my feedback and miss others, because I was trying to communicate a complex, multi-layered reaction through a single text box.

**This happens every day, to millions of people, across every AI chat interface in the world. And nobody seems to be working on it.**

<!-- more -->

## The Text Box Bottleneck

Think about how you communicate with another human in a meeting. You nod. You frown. You lean forward when something interests you. You shake your head slightly when you disagree. You scribble notes in the margin. You underline the key sentence in a document. You draw an arrow connecting two ideas.

None of these require you to compose a paragraph explaining your reaction. They're fast, gestural, and incredibly information-dense.

Now think about how you communicate with AI: you type words into a box. That's it. That's the entire interface. Every reaction, every nuance, every "yes but not that part" — it all has to be flattened into typed text.

Claude, ChatGPT, Grok, Gemini — they've made extraordinary advances in how AI *talks to us*. The responses are longer, more nuanced, more detailed than ever. But the way *we talk back* hasn't changed since the first chatbot. It's still a text box.

The result? Most people don't bother giving detailed feedback. They just ask their next question and hope the AI infers what mattered. The AI can't, because it received no signal. The conversation drifts. Quality degrades. The user starts a new chat.

## What If You Could Just Highlight?

Imagine this instead: the AI gives you a response, and before you type your next message, you can **highlight** the parts that matter and **strikethrough** the parts that don't.

That's it. No typing required. Just select and gesture.

- A highlight says: *"This is the insight. Carry this forward. Go deeper here."*
- A strikethrough says: *"This is wrong, irrelevant, or unhelpful. Drop it."*
- Everything else is implicitly acknowledged but not prioritized.

The AI receives these signals and adjusts. The next response is better — not because you wrote a paragraph explaining what you wanted, but because you *curated* the previous response in seconds.

## Why This Is More Powerful Than It Sounds

The magic isn't in any single annotation. It's in what happens over multiple turns.

On turn 2, you highlight and strikethrough. The AI adjusts. On turn 3, its response is already more aligned with what you care about, so your annotations are more precise. By turn 5, the conversation is laser-focused on what matters to you — in a way that text-box-only conversations never achieve.

Each annotation doesn't just improve the next turn. It refines the conversation's *memory* — what the AI carries forward as context. You're not just reacting to the AI. You're curating the conversation itself.

This is a fundamentally different interaction model. Today, the AI decides what to remember and prioritize from previous turns. With annotation, *you* decide. You become the curator of the conversation's memory, not a passenger.

## The Multi-Model Angle

Here's where it gets even more interesting.

Many of us don't just use one AI — we bounce between Claude, ChatGPT, and Grok, asking the same questions across platforms. Each conversation happens in isolation. When we do this, *we* become the synthesis layer: reading one model's response, mentally carrying the good parts to another, rephrasing questions.

What if you could ask one question to multiple AI models simultaneously, see all their responses, and then *curate across all of them*? Highlight the brilliant insight from Claude, strikethrough the weak argument from GPT, carry both signals forward into the next turn — where every model benefits from the curated, cross-pollinated context.

Each model would build on the others' ideas, filtered through your judgment about what matters. By turn 3-4, the conversation would reach a depth that no single model session could achieve on its own. Not because any individual model got smarter, but because you — the curator — connected the dots between them.

## Why Hasn't This Been Built?

I genuinely don't know.

The AI labs are focused on making models smarter, faster, and cheaper. They're competing on benchmarks and capabilities. The *input interface* — how humans communicate with these models — has barely evolved since ChatGPT launched. It's still a text box and a send button.

Maybe it's because annotation feels like a "small" UX improvement compared to a model that reasons better or has a larger context window. But I'd argue the opposite: the smartest model in the world is limited by the quality of the signal it receives from the user. And right now, that signal is bottlenecked through a text box.

## What We're Building

We're building **Recurate** — tools that let you curate AI conversations instead of just chatting through them.

First up is a **Chrome extension** that works on any AI chat site. It adds a side panel where you can annotate the AI's response before sending your next message. No backend, no API keys — just install and your conversations get better.

Next is a **multi-model platform** where you can ask questions across multiple AIs simultaneously and curate across all of them, building a shared conversation that's richer than any single model could produce.

The name comes from the core action: you **curate** the AI's response, and every turn, the conversation gets **re-curated** — refined, improved, more aligned with what you actually care about.

**Don't just chat, recurate.**

---

*Follow the project at [github.com/nikhilsi/recurate](https://github.com/nikhilsi/recurate) or visit [recurate.ai](https://recurate.ai).*

*Built by [Nikhil Singhal](https://www.linkedin.com/in/nikhilsinghal/) — a senior technology executive who's been thinking about human-AI interaction since building search feedback tools at Microsoft in 2006.*
