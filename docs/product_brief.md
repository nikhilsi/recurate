# Recurate — A Product Brief
### "Don't just chat, recurate." | recurate.ai

**Author:** Nikhil Singhal (with Claude's help on research and writing)
**Date:** February 21, 2026
**Purpose:** A non-technical product brief — the "why" and "what", not the "how"

---

## The Problem You Already Know

You've experienced this. I've experienced this. Everyone who uses Claude, ChatGPT, or Grok regularly has experienced this:

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

## Two Products, One Vision

This plays out in two phases:

### Phase 0: Recurate Annotator — Browser + Editor Extensions (ship first, ship fast)

**Chrome Extension:** Works on claude.ai and chat.com. Opens a side panel, mirrors the AI's latest response, and lets you highlight, strikethrough, dig deeper, and verify. Annotations auto-inject as structured KEEP/DROP/EXPLORE DEEPER/VERIFY feedback into the platform's text box. No backend, no API keys — install and your conversations immediately get better. Built and working.

**VS Code Extension:** The same annotation UX, built for the Claude Code terminal workflow. A sidebar that watches Claude Code's JSONL conversation files, renders assistant text responses with full markdown formatting, and auto-copies annotation feedback to clipboard. You paste into Claude Code when ready. Built and working.

Both extensions share the same core: Preact + Preact Signals UI, the same annotation components (ResponseView, AnnotationToolbar, AnnotationList), and the same feedback format (KEEP/DROP/EXPLORE DEEPER/VERIFY). What differs is how they capture the AI's response (DOM extraction vs. JSONL file watching) and how they deliver feedback (text box injection vs. clipboard).

**This is a standalone product with a real audience.** Anyone who uses LLMs for more than casual questions would benefit.

### Phase 1: Recurate Roundtable (the bigger vision)

This is what sparked the original idea: what if you could ask one question and get answers from Claude, ChatGPT, and Grok simultaneously — and then the system synthesizes their perspectives into a shared context that all models build on in subsequent turns?

Today, when people bounce between LLMs, they're the manual synthesis layer — reading one model's answer, mentally carrying the good bits to another. The Roundtable automates that. Each model benefits from the others' insights. By turn 3-4, the conversation reaches a depth no single model could achieve alone.

The annotation mechanism from Phase 0 becomes even more powerful here: you're not just curating one model's response, you're curating across multiple models' perspectives, shaping a shared memory.

### Why this sequence?

The extensions ship in weeks, not months. They validate the core UX idea (annotation) with real users across two workflows — web chat and terminal. They build the habit. And they create natural demand for the platform: "I love annotating on Claude... but what if I could do this across all my AI tools at once?"

---

## What Exists Today

**Multi-LLM comparison tools exist** (ChatHub, TypingMind) — they show responses side by side. But none of them create shared context across models on subsequent turns. They're comparison tools, not conversation tools.

**No annotation mechanism exists anywhere.** Not as a feature in any LLM platform. Not as a third-party tool. This is genuinely unbuilt.

---

## Where I'd Love Your Thinking

A few questions I'm noodling on that are very much in your wheelhouse:

1. **Is annotation a feature or a product?** The Chrome and VS Code extensions package it as a product. But would users install an extension for this, or does it need to be native to a platform to get adoption? (My instinct: the problem is painful enough that power users would install an extension. But I'm biased.)

2. **Fast path vs. power path balance.** The design lets users either just keep chatting (fast path, no annotation) or pause to annotate before continuing (power path). Is that the right UX, or does the option to annotate create decision fatigue? Should annotation be more ambient/passive?

3. **The annotation vocabulary.** We started with highlight and strikethrough as the foundation and have since added dig deeper and verify. But there's a richer palette we're considering:

   - **Highlight** — "This matters, carry it forward" (shipped)
   - **Strikethrough** — "This is wrong or irrelevant, drop it" (shipped)
   - **"Dig deeper" marker** — "I want the next turn to explore this specific point further" (shipped)
   - **"Verify" marker** — "I'm not sure this is right, flag it for verification" (shipped)
   - **"Star" or "Pin"** — "This is a key insight that should persist across many turns, not just the next one"
   - **Cross-model linking** (Roundtable only) — "Claude's point here connects to GPT's point there"
   - **Priority ranking** — If I highlight multiple things, let me rank which matters most
   - **Inline comment** — A lightweight "why" note attached to an annotation — more than a gesture, less than a paragraph

   Four gestures feels like the right balance — expressive enough to capture nuance, simple enough to not create decision fatigue. Every gesture we add beyond this is a UX decision the user has to make, which adds friction.

4. **Who is the actual user?** I'm designing for myself — someone who has long, strategic, multi-turn conversations with LLMs. Is that a big enough audience, or does this need to work for more casual use cases too?

5. **The name.** We landed on **Recurate** (recurate.ai). "Curate" is what you do — curate the AI's response. "Re-curate" is what happens every turn. Does it land for you? Does it feel like a product you'd tell someone about?

---

## The Bottom Line

The text box is the only way to talk to AI right now. That's a limitation hiding in plain sight. Annotation — highlight what's good, strikethrough what's not — is a faster, richer, more human way to steer a conversation.

Nobody's built it yet. I want to. It's called **Recurate**.

---

*The full technical design document (architecture, API research, token economics, data models) exists separately and is ready for implementation. This brief is just the product story.*
