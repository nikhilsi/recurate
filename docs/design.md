# Recurate: Complete Design & Architecture Document
### recurate.ai — "Don't just chat, recurate."

**Status:** Phase 0 Complete (Chrome + VS Code extensions built and working) — Roundtable in design
**Date:** February 21, 2026 (last updated: February 21, 2026)
**Domain:** recurate.ai (registered)
**Author:** Nikhil Singhal (concept & direction) + Claude (analysis & documentation)
**Audience:** This document is comprehensive enough for a developer to pick up and begin implementation without additional context.

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [Two Products, One Vision](#2-two-products-one-vision)
3. [Product A: LLM Annotator (Chrome Extension)](#3-product-a-llm-annotator-chrome-extension)
4. [Product B: Multi-LLM Roundtable (Web Platform)](#4-product-b-multi-llm-roundtable-web-platform)
5. [The User Annotation Mechanism — Shared Core](#5-the-user-annotation-mechanism--shared-core)
6. [The Condensed Context (CC) — Heart of the Roundtable](#6-the-condensed-context-cc--heart-of-the-roundtable)
7. [Architecture — Multi-LLM Roundtable](#7-architecture--multi-llm-roundtable)
8. [Token Economics & Cost Estimates](#8-token-economics--cost-estimates)
9. [API Landscape & Compatibility](#9-api-landscape--compatibility)
10. [What Exists Today vs. What's Novel](#10-what-exists-today-vs-whats-novel)
11. [Technical Stack](#11-technical-stack)
12. [Open Items & TBDs](#12-open-items--tbds)
13. [Phased Roadmap](#13-phased-roadmap)
14. [Key Design Decisions Log](#14-key-design-decisions-log)
15. [Appendix: Conversation Origin & Context](#15-appendix-conversation-origin--context)

---

## 1. The Problem

Two related but distinct problems exist in how people interact with LLMs today:

### 1.1 The Text-Box-Only Input Problem

Across every major LLM chat interface — Claude (claude.ai), ChatGPT (chat.com), Grok (grok.com), Gemini — the **only mechanism for user input is a text box**. When a model produces a detailed, multi-paragraph response, the user inevitably has nuanced reactions to different parts: strong agreement with one paragraph, disagreement with another, a desire to explore a third point deeper, indifference to a fourth.

The user's options for communicating this are:

1. **Type a lengthy explanation** ("I agree with your first point, but the part about X is wrong because... and the part about Y is exactly right, let's go deeper...") — exhausting, slow, and imprecise
2. **Ignore the nuance and move on**, hoping the model infers what mattered — the conversation drifts because the model gets zero signal about what resonated
3. **Give up and start over** — all prior context is lost

Most users default to option 2. The result is that LLM conversations lose fidelity with every turn because the model has no way to know what the user valued, disagreed with, or wanted to explore further.

**No major LLM interface has addressed this fundamental limitation.**

### 1.2 The Siloed Multi-LLM Problem

Users increasingly bounce between multiple LLMs, asking the same or follow-up questions across Claude, ChatGPT, Grok, and Gemini. Each conversation happens in its own isolated silo. When users do this, **they become the manual synthesis layer**: reading one model's response, mentally carrying insights to another, rephrasing questions, and losing fidelity at every step.

There is no mechanism for these models to build on each other's reasoning across a shared conversation.

### 1.3 How the Two Problems Connect

Problem 1.1 (text-box-only input) exists within every single-model conversation. Problem 1.2 (siloed multi-LLM) exists across models. The annotation mechanism (Section 5) solves Problem 1.1 and is independently valuable. The Multi-LLM Roundtable (Section 4/7) solves Problem 1.2 and incorporates the annotation mechanism as its most powerful feature. This is why they are designed as two products that share a common core.

---

## 2. Two Products, One Vision

The vision is delivered through two products, built in sequence, sharing a common design language and core feature (the annotation mechanism):

### Phase 0: Recurate Annotator — Extensions (Standalone Products)

Extensions that add annotation tools to existing AI workflows. Both share the same core UI (Preact + Preact Signals) and annotation components, but differ in how they capture AI output and deliver feedback.

**Chrome Extension** — Adds a side panel to web-based LLM chat interfaces. Mirrors the AI's latest response and lets users annotate (highlight, strikethrough, dig deeper, verify). Structured KEEP/DROP/EXPLORE DEEPER/VERIFY feedback auto-injects into the platform's text box. Works on claude.ai and chat.com. **Built and working.**

**VS Code Extension** — A sidebar for the Claude Code terminal workflow. Watches Claude Code's JSONL conversation files, renders assistant text responses with full markdown formatting, and auto-copies annotation feedback to clipboard. User pastes into Claude Code when ready. **Built and working.**

- **Solves:** Problem 1.1 (text-box-only input)
- **Chrome works on:** claude.ai, chat.com (web-based LLM chat)
- **VS Code works on:** Claude Code in VS Code terminal
- **Requires:** No backend, no API keys, no new interface to learn
- **Target user:** Anyone who uses LLMs for substantive conversations on desktop

### Phase 1: Recurate Roundtable — Web Platform

A web application that sends the user's question to multiple LLMs simultaneously, collects responses, synthesizes a Condensed Context, and feeds it back on subsequent turns. Incorporates the annotation mechanism from Phase 0 natively.

- **Solves:** Problem 1.1 AND Problem 1.2
- **Requires:** Backend, API keys for each provider, database
- **Time to build:** Months
- **Target user:** Power users who want cross-model intelligence for complex questions

### Phase 2: Convergence

The Chrome extension connects to the Roundtable platform. Users can annotate responses on individual LLM platforms *and* have those annotations feed into the centralized Condensed Context across all models. The worlds merge.

### Why This Sequencing

1. **The annotation mechanism is the most defensible feature.** Shipping it first as standalone products validates the core UX innovation independently.
2. **Adoption barrier is minimal for extensions.** Users don't switch tools — they enhance the tools they already use.
3. **The extensions are a trojan horse.** Once users build the habit of annotating LLM responses, the natural next step is "what if I could do this across models?" The extensions create demand for the platform.
4. **Portfolio value.** Shipped, installable extensions across two surfaces (browser + editor) demonstrate product thinking and the ability to ship — tangible and demonstrable.
5. **Risk management.** If a major LLM provider builds annotation natively (which validates the idea), the multi-model platform remains defensible because it's cross-platform.
6. **Two workflows, one UX.** The Chrome extension covers the web chat workflow. The VS Code extension covers the terminal/editor workflow. Together, they reach developers where they actually work.

---

## 3. Product A: Recurate Annotator (Extensions)

The Recurate Annotator ships as two extensions sharing the same annotation UX: a Chrome extension for web-based LLM chat and a VS Code extension for the Claude Code terminal workflow. This section covers the Chrome extension in detail. See the [VS Code Extension Architecture](vscode-extension-architecture.md) for the VS Code variant.

### 3.1 Core Concept (Chrome Extension)

A Chrome extension that opens a **side panel** when the user is on a supported LLM chat site. The side panel displays the most recent AI response and provides annotation tools (highlight, strikethrough, dig deeper, and verify). The extension generates structured feedback text and proactively injects it into the platform's text input box.

### 3.2 Why Side Panel (Not DOM Injection)

Two approaches were considered:

1. **DOM injection:** Inject highlight/strikethrough UI directly onto the LLM platform's response elements. More seamless, but fragile — each platform structures its chat DOM differently and updates frequently. Requires per-platform selectors that break on updates. High maintenance burden.

2. **Side panel:** Chrome's built-in side panel API. Mirrors the response content in a controlled environment. Platform-agnostic — works identically on any site. More robust, less fragile. Slightly less seamless but significantly more maintainable.

**Decision: Side panel approach.** Platform-agnostic, robust, lower maintenance. Accepted trade-off: slightly less integrated feel. Note: side panels do not work on mobile browsers, but all serious/substantive LLM conversations happen on desktop — mobile is not the target use case.

### 3.3 Supported Platforms

**Currently built:**

- claude.ai (Anthropic Claude)
- chat.com (OpenAI ChatGPT)

**Planned:**

- grok.com (xAI Grok)
- gemini.google.com (Google Gemini)

Additional platforms can be added by creating a new platform module (`lib/platforms/<name>.ts`) and content script (`entrypoints/<name>.content.ts`). The side panel and annotation components are platform-agnostic.

### 3.4 User Flow

1. User is on claude.ai (or any supported site) having a conversation
2. User clicks the extension icon or the side panel auto-opens
3. Side panel displays the most recent AI response
4. User annotates:
   - **Highlight** (green) — carry forward, this matters
   - **Strikethrough** (red) — discard, this is wrong or irrelevant
   - **Dig deeper** (blue) — elaborate on this point
   - **Verify** (amber) — fact-check this claim
   - Unannotated text is treated as neutral / acknowledged but not prioritized
5. User composes their next question in the platform's native text box
6. The extension generates structured annotation text and proactively injects it into the platform's text box, formatted as:

```
[Feedback on your previous response]
KEEP — I found these points valuable:
- "The stateless API approach eliminates complexity of managing separate threads..."
- "Token cost is approximately 2.5-3x, not the naive 4x..."

DROP — Please disregard or reconsider:
- "For straightforward questions this adds no value..."

EXPLORE DEEPER — Need more detail on:
- "The synthesis prompt design..."

VERIFY — Please double-check:
- "Cost per turn is approximately $0.02..."

[My question]
Given the architecture we've discussed, what about latency optimization strategies?
```

7. The platform's native LLM receives this as a normal message and naturally weights its response based on the structured feedback.

### 3.5 Why This Works Without Any Backend

The extension doesn't call any APIs or maintain any server. It simply:
- Reads the DOM of the LLM chat page to extract the latest response
- Presents it in a controlled side panel for annotation
- Converts annotations into structured text
- Injects that text into the page's input field

The LLM itself does the heavy lifting of interpreting the structured feedback. Every major LLM already understands instructions like "the user found this valuable" and "the user wants to discard this." No special prompting required beyond clear formatting.

### 3.6 Technical Architecture (Chrome Extension)

Built with WXT (extension framework), Preact + Preact Signals (UI), TypeScript, and Vite. See [Extension Architecture](extension-architecture.md) for the full implementation-ready specification.

```
extensions/chrome/
├── wxt.config.ts              (WXT + Vite + Preact configuration)
├── entrypoints/
│   ├── background.ts          (service worker — message relay, side panel)
│   ├── sidepanel/             (Preact side panel UI)
│   │   ├── App.tsx            (root component)
│   │   ├── components/        (ResponseView, AnnotationToolbar, AnnotationList, StatusBar)
│   │   └── state/annotations.ts (Preact Signals state)
│   ├── claude.content.ts      (content script for claude.ai)
│   └── chatgpt.content.ts     (content script for chat.com)
├── lib/
│   ├── types.ts               (shared TypeScript types)
│   ├── formatter.ts           (annotations → KEEP/DROP/EXPLORE DEEPER/VERIFY feedback text)
│   └── platforms/             (per-platform DOM selectors and extraction)
│       ├── claude.ts
│       └── chatgpt.ts
└── public/icons/              (extension icons)
```

### 3.6b Technical Architecture (VS Code Extension)

Built with esbuild (extension host), Vite + Preact (webview), TypeScript, and marked (markdown rendering). See [VS Code Extension Architecture](vscode-extension-architecture.md) for the full specification.

```
extensions/vscode/
├── src/                       (extension host — Node.js)
│   ├── extension.ts           (activation, registers sidebar, wires messaging)
│   ├── jsonlWatcher.ts        (watches Claude Code JSONL files)
│   ├── webviewProvider.ts     (WebviewViewProvider for sidebar)
│   └── clipboard.ts           (copies feedback to system clipboard)
├── webview/                   (sidebar UI — Preact, runs in browser sandbox)
│   ├── App.tsx                (root component — same UX as Chrome)
│   ├── messaging.ts           (postMessage adapter replacing browser.runtime)
│   ├── components/            (ResponseView, AnnotationToolbar, AnnotationList, StatusBar)
│   └── state/annotations.ts  (Preact Signals state + response history)
├── shared/                    (shared between host and webview)
│   ├── types.ts               (TypeScript types)
│   └── formatter.ts           (KEEP/DROP/EXPLORE DEEPER/VERIFY feedback formatter)
└── dist/                      (build output)
```

**Key technical considerations:**
- `content-scripts/extractor.js` needs per-platform selectors to find the latest AI response in the DOM. These may break on platform updates and need maintenance.
- `content-scripts/injector.js` needs to find and programmatically set the value of the platform's text input field and trigger appropriate input events so the platform recognizes the injected text.
- The side panel communicates with content scripts via Chrome's messaging API (`chrome.runtime.sendMessage`).
- Response text extraction should be best-effort — if the DOM structure changes and extraction fails, the extension should fail gracefully (show an error message, allow manual paste).

### 3.7 Data Storage (Extension-Local)

- **No server-side storage.** Everything is local to the browser.
- Chrome's `storage.local` API can persist user preferences (e.g., default annotation behavior, display settings).
- Optionally: store annotation history locally so the user can review past annotations. This is a V2 feature for the extension.
- No conversation content is sent anywhere except back into the platform's own text box.

### 3.8 Privacy & Permissions

- The extension needs access to the DOM of supported LLM sites (to read responses and inject text).
- It does NOT need network access, background permissions, or access to any other sites.
- No user data leaves the browser. The extension operates entirely client-side.
- This minimal permission model should ease Chrome Web Store review.

---

## 4. Product B: Recurate Roundtable (Web Platform)

### 4.1 Core Concept

A web application where the user asks a question once, it fans out to multiple LLMs simultaneously via their APIs, all responses are displayed, and a **Condensed Context (CC)** is automatically synthesized. On subsequent turns, only the CC + the user's new question are sent to all models. The annotation mechanism is built natively into the platform.

### 4.2 Key Insight: Stateless Architecture

**Each LLM call is completely stateless.** There are no per-model conversation sessions, no provider-specific state management, no threads. Each model receives exactly two things on every call:

1. The Condensed Context (rolling summary of the entire conversation across all models)
2. The user's new question

The CC is the **sole persistent state** for the entire conversation. It lives in the application's own database, not in any LLM provider's system.

This was a deliberate design decision that emerged during the design conversation. The initial instinct was to maintain per-model conversation threads alongside the cross-model CC. The realization was that this added significant complexity with minimal benefit. Making every call stateless:

- Eliminates managing 3+ separate stateful threads
- Makes it trivial to add or swap models mid-conversation (a new model joining at turn 4 just receives the current CC and is immediately caught up)
- Simplifies the backend to a thin orchestration layer
- Makes the CC the curated, structured memory of the conversation — arguably superior to raw conversation history, which passively carries everything forward

### 4.3 Value Proposition

**Better answers through cross-pollination:** Each LLM has different strengths, training data, and reasoning patterns. By feeding the synthesized context of all models back into each one, every model benefits from insights it wouldn't have generated on its own. By turn 3-4, the conversation reaches a depth no single LLM session could achieve independently.

**The user stops being the bottleneck:** Currently, users bouncing between LLMs are the router, synthesizer, and context manager. This tool offloads that cognitive burden.

**Convergence and divergence signals:** When all models agree, that's a high-confidence signal. When they diverge, that's where the interesting exploration lives. The system surfaces these patterns naturally.

**Emergent depth:** By turn 3-4, each model is reacting to ideas it wouldn't have generated itself. The conversation produces answers that no single LLM session could produce on its own.

**Model flexibility:** New models can be added or swapped mid-conversation because every call is stateless. A model joining at turn 4 gets the full CC and is immediately caught up.

### 4.4 What This Is NOT Good For

The sweet spot is messy, strategic, multi-dimensional questions where perspective diversity matters: strategy decisions, company analysis, product ideation, "should I do X or Y" dilemmas.

For straightforward, task-oriented questions ("write me a Python script to parse this CSV"), cross-model synthesis adds cost and latency with minimal benefit. A single model is sufficient for those.

### 4.5 What the User Sees

The user sees **both** individual model responses **and** the unified synthesis. This is not an either/or — both are displayed:

- Individual responses (likely in tabs or expandable panels) for users who want to see what each model specifically said
- The unified synthesis (prominently displayed) as the primary view
- Annotation tools for the power path (Section 5)

---

## 5. The User Annotation Mechanism — Shared Core

This section describes the annotation mechanism in its full generality. It is the shared core between Product A (Chrome Extension) and Product B (Multi-LLM Roundtable). The UX is substantially the same in both products; what differs is what happens *after* annotation (in the extension, it generates text for the text box; in the platform, it triggers a re-synthesis of the CC).

### 5.1 The Fundamental Problem This Solves

Today, across every LLM chat interface, the only input mechanism is a text box. When a model produces a detailed response and the user has nuanced reactions to different parts, they cannot efficiently communicate those reactions. The options are: type lengthy explanations (slow, exhausting), ignore the nuance (conversation drifts), or start over (context lost).

**This is a fundamental limitation of the text-box-only input model that no major LLM interface has addressed.**

### 5.2 The Core Concept: Non-Verbal, Gestural Feedback

The annotation mechanism provides fast, intuitive, non-verbal feedback:

- **Highlight** (green) = "This matters. Carry this forward."
- **Strikethrough** (red) = "This is wrong, irrelevant, or unhelpful. Drop it."
- **Dig deeper** (blue) = "Elaborate on this. I want more detail."
- **Verify** (amber) = "Fact-check this. I'm not sure it's right."
- **No annotation** = "This is fine but not noteworthy."

These gestures communicate in seconds what would take paragraphs to type. A highlight on a single sentence says "this is the insight" without requiring the user to articulate why. A strikethrough says "ignore this" without a written rebuttal. A dig deeper marker says "explore this further" without a paragraph of follow-up questions. A verify marker says "I'm skeptical" without explaining why.

**This creates a fundamentally different and faster communication channel between human and AI.**

### 5.3 Why This Is the Most Defensible Feature of the Entire Vision

1. **It's valuable even without multi-model.** A single-model chat with annotation would already be a meaningful improvement over every chat interface today. In the multi-model version, it becomes even more powerful because the user is curating across multiple perspectives.

2. **It solves the "long response" problem.** The longer an LLM response is, the more the user has nuanced reactions to different parts. But the effort to communicate those reactions via typing scales linearly with response length. Annotations take constant time — select, gesture, done.

3. **It compounds over turns.** Each annotation refines the conversation's context/memory. By turn 5, the context reflects not just what the models said, but what the user *valued* from what the models said. The conversation becomes increasingly aligned with the user's thinking in a way that text-box-only interfaces cannot achieve.

4. **It makes the user an active participant in context engineering.** Today, context is something that happens *to* the user — the LLM decides what to remember and prioritize from prior turns. Annotations give the user direct, explicit control over what gets carried forward. The user becomes a curator of the conversation's memory.

5. **It captures signal that text cannot.** When a user highlights something, they may not even be able to articulate *why* it matters — it just resonated. That intuitive signal is lost in a text-only interface but preserved through annotation.

### 5.4 The Two-Speed Flow: Fast Path and Power Path

The annotation mechanism is designed to add zero friction when not needed and significant value when used:

**Fast path (zero friction):**
The user reads the response(s), is satisfied, and simply asks their next question. No annotation required. In the extension, the message goes as-is. In the platform, the auto-synthesis becomes the CC.

**Power path (user-curated):**
The user reads the response(s), annotates (highlights and/or strikethroughs), and then proceeds. In the extension, structured feedback is injected into the text box. In the platform, a re-synthesis is triggered that incorporates the annotations, producing a refined CC.

**The user controls the pace.** Most turns will use the fast path. The power path is reserved for turns that feel pivotal — where a model said something surprisingly good or bad, where the conversation is at a fork, or where the user wants to steer direction strongly.

### 5.5 How Annotations Differ Across Products

| Aspect | Chrome Extension | VS Code Extension | Multi-LLM Roundtable |
|--------|-----------------|-------------------|---------------------|
| What gets annotated | Single model's web response | Claude Code's text response | Multiple models' responses |
| How AI output is captured | DOM extraction via content script | JSONL file watching | Direct API responses |
| What happens after annotation | Structured text auto-injected into text box | Feedback auto-copied to clipboard | Re-synthesis API call produces refined CC |
| Backend required | No | No | Yes |
| User trigger | Automatic (proactive injection into editor) | Automatic (auto-copy on every annotation change) | Explicit ("Re-synthesize" button) |
| Response history | Latest response only | Last 5 responses with navigation | Full conversation history |

### 5.6 The Three-Step Flow in the Multi-LLM Platform

In the Roundtable platform specifically, the turn flow incorporates annotation as follows:

1. **Responses arrive → Auto-synthesis runs immediately.** The user is not waiting — they get a synthesized view right away as a starting point. This is the auto-synthesis.

2. **User reviews and (optionally) annotates.** They can annotate (highlight, strikethrough, dig deeper, verify) across any of the individual model responses or the synthesis itself.

3. **Fork:**
   - (a) User asks their next question without annotating → auto-synthesis becomes the CC for the next turn
   - (b) User annotates and clicks "Re-synthesize" → a new synthesis incorporates user signals → this refined CC becomes the context for the next turn → then the user asks their next question

### 5.7 Two Synthesis Types with Different Complexity

**Auto-synthesis (runs immediately, no user input):**
Must be genuinely intelligent. It has no user guidance, so it must infer from the responses themselves what constitutes consensus, disagreement, and unique insight. This is the harder prompt engineering challenge. (See Section 6 for CC design.)

**User-refined synthesis (runs after annotation):**
A much simpler problem. The user has explicitly signaled what matters (highlights) and what doesn't (strikethroughs). The prompt can be straightforward: "Given these highlighted sections (high priority) and these struck-through sections (exclude), produce an updated summary of the conversation so far." The synthesis just needs to be obedient to user signals.

### 5.8 Annotation Gestures — Current

Four gestures are shipped in both extensions:

- **Highlight** (green, ✓): User selects text, floating toolbar appears, clicks highlight. Text gets a green background and left border. Mapped to KEEP in feedback.
- **Strikethrough** (red, ✗): Same selection mechanism. Text is visually struck through with reduced opacity. Mapped to DROP in feedback.
- **Dig deeper** (blue, ⤵): Same selection mechanism. Text gets a blue background and left border. Mapped to EXPLORE DEEPER in feedback.
- **Verify** (amber, ?): Same selection mechanism. Text gets an amber background and left border. Mapped to VERIFY in feedback.
- **Undo:** Click on any annotated text to remove it, or use the clear button in the toolbar/annotation list.

**Key UX requirement: Annotation must be faster than typing.** If it takes more effort to annotate than to write a text message explaining the same reaction, users won't use it. The entire value proposition depends on this being a fast, low-friction interaction.

### 5.9 Potential Future Annotation Gestures

The four-gesture model covers the core use cases. Richer possibilities remain:

- **"Star" or "Pin":** Mark something as a key insight that should persist across many turns (not just the next one)
- **Cross-model linking (Roundtable only):** "Claude's point here connects to GPT's point there" — explicitly linking insights across models
- **Priority ranking:** If multiple highlights exist, allowing the user to rank which matters most
- **Inline comments:** A lightweight "why" note attached to an annotation — more than a gesture, less than a paragraph

These illustrate the design space that opens up once you move beyond text-box-only input.

---

## 6. The Condensed Context (CC) — Heart of the Roundtable

This section applies to Product B (Multi-LLM Roundtable) only. The Chrome Extension (Product A) does not use a CC — it generates structured text that gets injected directly into the platform's text box.

### 6.1 What the CC Is

The Condensed Context is a structured, rolling summary of the entire multi-model conversation. It is:

- The **sole persistent state** for the conversation
- The **only input** each model receives (along with the user's new question) — models do not have their own conversation history
- **Re-generated every turn** — it's not incrementally appended to, but re-synthesized from scratch each turn (incorporating the previous CC + new responses + any user annotations)

### 6.2 What It Must Capture

The CC does double duty — it's both the cross-pollination mechanism AND the conversation memory:

- **Consensus:** What all models agreed on (high-confidence signals)
- **Tensions:** Where models disagreed, and how (often the most valuable information)
- **Unique insights:** Something only one model surfaced — a company name, a counterargument, a framing
- **User intent and direction:** What the user asked about, what direction they steered, what they cared about
- **User annotations (if any):** What the user explicitly highlighted or struck through — these signals must be reflected in the CC
- **Conversation arc:** The progression of the conversation — what was explored, what conclusions were reached, what's still open

### 6.3 CC Schema — TBD (Critical Open Item)

The exact structure of the CC is the single most important design decision for the Roundtable and has not yet been defined. This requires prototyping and testing.

Key design questions:
- **JSON-structured vs. natural language summary?** JSON is more machine-parseable but may lose nuance. Natural language is richer but harder to process programmatically.
- **Fixed sections (consensus/tensions/insights) vs. free-form?** Fixed sections ensure nothing is missed but may feel rigid. Free-form is more flexible but may drift.
- **How much of the user's own words/direction to preserve?** The CC needs to capture user intent, not just model outputs.
- **Optimal token budget?** Target: 500-1500 tokens. Too short loses fidelity; too long defeats the purpose of compression.
- **How to handle user annotations?** Should highlighted content be quoted verbatim in the CC, or summarized? Should struck-through content be explicitly listed as "discarded" or simply omitted?

### 6.4 CC Generation: Which Model Runs the Synthesis — TBD (Critical Open Item)

Options:
- **Dedicated cheaper/faster model** (e.g., Claude Haiku, GPT-4o-mini): Lower cost and latency, but may need more explicit/structured prompt engineering. Good fit because summarization is an easier task than the original reasoning.
- **One of the frontier models doing double duty:** Higher quality synthesis, but potential bias toward that model's "worldview" in how it summarizes the others.
- **Rotating synthesizer:** Different model each turn to avoid systematic bias, but inconsistency in synthesis quality and style.
- **Anthropic's Compaction API:** The closest built-in feature to what's needed — it summarizes conversations with custom instructions. Could potentially be repurposed as the synthesis engine. Worth prototyping.

The model choice may influence the prompt design — cheaper models need more structured/explicit instructions, frontier models can handle more nuanced/natural prompts.

### 6.5 Auto-Synthesis vs. User-Refined Synthesis Prompts

**Auto-synthesis prompt (harder, no user input):**
Must infer from the raw model responses what constitutes consensus, disagreement, unique insight, and user intent. Needs to be intelligent about what matters. This is the primary prompt engineering challenge.

**User-refined synthesis prompt (easier, user signals available):**
The user has explicitly told the system what matters. The prompt can reference specific highlighted and struck-through content and simply follow those signals. More about obedience than intelligence.

Both prompts are TBD and should be designed and tested together.

---

## 7. Architecture — Multi-LLM Roundtable

### 7.1 High-Level System Diagram

```
┌──────────────────────────────────────────────────┐
│                  User's Browser                   │
│                                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │           React Web Application              │  │
│  │                                               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐     │  │
│  │  │ Claude   │ │ ChatGPT  │ │  Grok    │     │  │
│  │  │ Response │ │ Response │ │ Response │ ... │  │
│  │  │  Panel   │ │  Panel   │ │  Panel   │     │  │
│  │  └──────────┘ └──────────┘ └──────────┘     │  │
│  │                                               │  │
│  │  ┌─────────────────────────────────────────┐ │  │
│  │  │         Synthesis / CC Display           │ │  │
│  │  └─────────────────────────────────────────┘ │  │
│  │                                               │  │
│  │  ┌─────────────────────────────────────────┐ │  │
│  │  │    Annotation Tools + Input Box          │ │  │
│  │  │    [Highlight] [Strikethrough]           │ │  │
│  │  │    [Re-synthesize] [Send]                │ │  │
│  │  └─────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────┘
                        │ REST API calls
                        ▼
┌──────────────────────────────────────────────────┐
│              Backend (Python / FastAPI)            │
│                                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │            Orchestrator Service               │  │
│  │                                               │  │
│  │  1. Receives user question + annotations      │  │
│  │  2. Retrieves current CC from database        │  │
│  │  3. Fans out (CC + question) to all LLMs      │  │
│  │     in parallel                               │  │
│  │  4. Collects all responses                    │  │
│  │  5. Runs synthesis (auto or user-refined)     │  │
│  │  6. Stores new CC in database                 │  │
│  │  7. Returns responses + CC to frontend        │  │
│  └──────────────┬──────────────┬─────────────────┘  │
│                 │              │                      │
│     ┌───────────▼───┐  ┌──────▼──────┐              │
│     │   Database    │  │  LLM API    │              │
│     │   (SQLite/    │  │  Clients    │              │
│     │   PostgreSQL) │  │             │              │
│     │               │  │ - Anthropic │              │
│     │ - Conversations│ │ - OpenAI   │              │
│     │ - CC versions │  │ - xAI      │              │
│     │ - Annotations │  │ - Google   │              │
│     │ - User prefs  │  │ - Synth.   │              │
│     └───────────────┘  └────────────┘              │
└──────────────────────────────────────────────────┘
```

### 7.2 The Turn Sequence (Detailed)

**Turn 1 (Cold Start — no CC exists yet):**

1. User types a question in the web UI
2. Frontend sends the question to the backend
3. Backend sends the question (no CC prefix) to all configured LLMs in parallel via their APIs
4. All responses return to the backend
5. Backend runs the **auto-synthesis** — a separate LLM API call that takes all responses and produces CC v1
6. Backend stores CC v1 in the database, associated with this conversation
7. Backend returns all individual responses + CC v1 to the frontend
8. Frontend displays individual responses (in panels/tabs) and the synthesis
9. User either:
   - (a) **Fast path:** Types next question → go to Turn 2 with CC v1
   - (b) **Power path:** Annotates responses → clicks "Re-synthesize" → backend runs **user-refined synthesis** → CC v1-refined replaces CC v1 → then user types next question → go to Turn 2 with CC v1-refined

**Turn N (Steady State):**

1. User types next question (possibly after annotating previous turn's responses)
2. Frontend sends the question + any annotation data to the backend
3. Backend retrieves current CC (from previous turn)
4. Backend sends (CC + new question) to all configured LLMs in parallel
5. All responses return
6. Backend runs auto-synthesis: takes all new responses + the previous CC → produces CC vN
7. Stores CC vN, returns everything to frontend
8. Display and annotation cycle repeats

### 7.3 Stateless Design — No Per-Model Conversation History

Each LLM API call is completely independent. The backend does not maintain OpenAI conversation threads, Grok stored responses, Claude session IDs, or any provider-specific state. Every call to every model receives exactly:

```
[System/context]: {Condensed Context from previous turn}
[User]: {New question}
```

This means:
- Adding a new model mid-conversation = send it the current CC + the question. Instantly caught up.
- Removing a model = stop calling it. No cleanup needed.
- A model's API going down for one turn = skip it, other models continue. Re-add next turn.
- All state management is in one place (the backend's database), not distributed across 3-4 provider systems.

### 7.4 Backend API Endpoints (Preliminary)

```
POST /api/conversations
  → Creates a new conversation, returns conversation_id

POST /api/conversations/{id}/turns
  Body: { question: string, annotations?: AnnotationData[] }
  → Orchestrates the full turn (fan-out, collect, synthesize)
  → Returns: { responses: ModelResponse[], synthesis: CC }

POST /api/conversations/{id}/resynthesize
  Body: { annotations: AnnotationData[] }
  → Runs user-refined synthesis on the current turn's responses
  → Returns: { synthesis: CC }

GET /api/conversations/{id}
  → Returns conversation history (all turns, CCs, responses)

GET /api/conversations
  → Lists all conversations

DELETE /api/conversations/{id}
  → Deletes a conversation and all associated data
```

### 7.5 Data Model (Preliminary)

```
Conversation
  - id (UUID)
  - title (string, auto-generated or user-set)
  - created_at (timestamp)
  - updated_at (timestamp)
  - settings (JSON — which models are active, synthesis model preference)

Turn
  - id (UUID)
  - conversation_id (FK)
  - turn_number (int)
  - user_question (text)
  - created_at (timestamp)

ModelResponse
  - id (UUID)
  - turn_id (FK)
  - model_provider (enum: anthropic, openai, xai, google)
  - model_name (string, e.g., "claude-sonnet-4-5")
  - response_text (text)
  - token_usage (JSON — input_tokens, output_tokens)
  - latency_ms (int)
  - created_at (timestamp)

CondensedContext
  - id (UUID)
  - turn_id (FK)
  - version (int — 1 for auto-synthesis, 2+ for user-refined)
  - content (text)
  - synthesis_model (string)
  - token_usage (JSON)
  - is_active (boolean — which version is current)
  - created_at (timestamp)

Annotation
  - id (UUID)
  - turn_id (FK)
  - model_response_id (FK, nullable — null if annotating the synthesis)
  - annotation_type (enum: highlight, strikethrough, deeper, verify)
  - start_offset (int — character offset in the response text)
  - end_offset (int)
  - annotated_text (text — the selected text, for display and synthesis input)
  - created_at (timestamp)
```

---

## 8. Token Economics & Cost Estimates

### 8.1 Per-Turn Token Model (3 LLMs + 1 synthesis call)

| Component | Turn 1 | Turn 3 | Turn 5 |
|-----------|--------|--------|--------|
| User question | ~200 | ~200 | ~200 |
| CC input to each model | 0 | ~600 | ~1,200 |
| Each model input total | ~200 | ~800 | ~1,400 |
| × 3 models input | 600 | 2,400 | 4,200 |
| Each model output | ~800 | ~800 | ~800 |
| × 3 models output | 2,400 | 2,400 | 2,400 |
| Synthesis input | ~2,600 | ~3,000 | ~3,600 |
| Synthesis output | ~400 | ~500 | ~600 |
| **Turn total** | **~6,000** | **~8,300** | **~10,800** |

### 8.2 Full Conversation Estimate

A 5-turn conversation: approximately **60,000-70,000 tokens** across all API calls.

Comparison: A 5-turn single-model conversation uses ~25,000-30,000 tokens. The multi-model approach is **~2.5-3x** the cost — not the naive 4x, because the CC keeps per-model input compact.

### 8.3 Dollar Cost (February 2026 Pricing)

| Provider | Input (per 1M tokens) | Output (per 1M tokens) |
|----------|----------------------|----------------------|
| Claude Sonnet 4.5 | ~$3 | ~$15 |
| GPT-4o | ~$2.50 | ~$10 |
| Grok | ~$2 | ~$10 |

**Per 5-turn conversation: approximately $0.05 to $0.15**

At 20 conversations/day: **$1-3/day.** Negligible cost.

### 8.4 Cost Optimization

Using a cheaper/faster model (Claude Haiku, GPT-4o-mini) for the synthesis step significantly reduces the synthesis portion of cost with minimal quality impact, since summarization is an easier task than the original reasoning.

### 8.5 Latency

- Per turn: Waiting for the slowest parallel model (~3-5 sec) + synthesis (~1-2 sec) = **5-7 seconds total**
- Compared to single model: 2-4 seconds
- **~2x latency per turn.** Acceptable for substantive questions where the user spends 30+ seconds reading the responses.
- If user-refined synthesis is triggered, add another ~1-2 seconds for the re-synthesis call.

---

## 9. API Landscape & Compatibility

Research conducted February 21, 2026 on what each major LLM provider offers for context management:

### 9.1 Anthropic (Claude)

- **Compaction API (beta):** Server-side context summarization. When token usage exceeds a threshold, automatically summarizes conversation history and continues with the summary. Supports custom instructions for the summarization (e.g., "focus on preserving disagreements"). This is the closest built-in feature to what the CC synthesis needs.
- **Context editing:** Beta feature for clearing tool results and thinking blocks from conversation history.
- **Standard Messages API:** Stateless by default — you send the full message history each time. Compatible with the Roundtable's stateless design.

### 9.2 OpenAI (GPT)

- **Realtime API:** Has auto-summarization that compresses everything except the last 2 turns when context approaches limits.
- **Responses API:** Newer API with server-side conversation state management.
- **Standard Chat Completions API:** Stateless — you send the full message history. Compatible with stateless design.

### 9.3 xAI (Grok)

- **Responses API:** Stateful — stores previous messages on xAI servers, allows continuing via response ID (stored for 30 days).
- **No built-in compaction:** Developers are responsible for managing conversation state and summarization.
- **Standard Chat Completions API:** Compatible with stateless design (send messages directly).
- **Context window:** Up to 2M tokens on Grok 4.1 Fast.

### 9.4 Google (Gemini)

- **Context caching:** Explicit and implicit caching to reduce cost for repeated content. Focuses on cost optimization, not summarization.
- **No built-in compaction/summarization.**
- **Standard API:** Compatible with stateless design.

### 9.5 Implications for the Roundtable

All four providers support the stateless call pattern (send messages, get response, no session). The Roundtable does not need to use any provider's stateful features — it manages all state via the CC in its own database. Anthropic's Compaction API is worth evaluating as a potential synthesis engine.

---

## 10. What Exists Today vs. What's Novel

### 10.1 Existing Multi-LLM Tools (Fan-Out / Comparison)

Tools like **ChatHub, TypingMind**, and various API wrappers already send one prompt to multiple LLMs and display responses side by side. These solve the comparison problem but **do not create shared context across models on subsequent turns.**

### 10.2 Existing Orchestration Frameworks

**LangChain, Haystack, LlamaIndex, Semantic Kernel**, and others handle multi-model routing and orchestration — selecting the best model for a given query, managing RAG pipelines, etc. These are infrastructure frameworks, not end-user products, and **none implement cross-model context synthesis.**

### 10.3 What's Novel

Two things are novel in this design:

1. **Cross-model Condensed Context:** A rolling, synthesized summary that captures what all models said and feeds it back into all models on subsequent turns. No existing tool does this. The CC is not just a summary — it's a structured memory artifact that improves with each turn.

2. **User annotation of LLM responses:** Non-verbal, gestural feedback (highlight, strikethrough, dig deeper, verify) that shapes what gets carried forward in the conversation. No major LLM interface or multi-LLM tool offers this. This concept is valuable even in single-model conversations (hence the Chrome Extension as a standalone product).

---

## 11. Technical Stack

### 11.1 Chrome Extension

| Component | Technology |
|-----------|------------|
| Extension framework | WXT (Manifest V3, file-based entrypoints, auto-manifest, HMR) |
| Side panel UI | Preact + Preact Signals (4KB runtime, fine-grained reactivity) |
| Content scripts | TypeScript (DOM observation, response extraction, feedback injection) |
| Build | Vite (via WXT) with @preact/preset-vite |
| Language | TypeScript (all code) |

### 11.1b VS Code Extension

| Component | Technology |
|-----------|------------|
| Extension host | Node.js (VS Code Extension API) |
| Extension host bundler | esbuild (CJS output) |
| Sidebar UI | Preact + Preact Signals (same components as Chrome extension) |
| Sidebar bundler | Vite with @preact/preset-vite |
| Markdown rendering | marked (~30KB, converts JSONL text to HTML) |
| Language | TypeScript (all code) |

### 11.2 Multi-LLM Roundtable (Product B)

| Component | Technology |
|-----------|------------|
| Frontend | React (with TypeScript) |
| Backend | Python / FastAPI |
| Database | SQLite (personal use) → PostgreSQL (if scaled) |
| LLM API clients | `anthropic` Python SDK, `openai` Python SDK, `httpx` for xAI/Grok, `google-generativeai` for Gemini |
| Async orchestration | Python `asyncio` + `httpx` for parallel API calls |
| Synthesis model | TBD (see Section 6.4) |

### 11.3 Shared Design Language

All products use the same annotation UX patterns (highlight = green, strikethrough = red, dig deeper = blue, verify = amber) and the same KEEP/DROP/EXPLORE DEEPER/VERIFY feedback format. The Chrome and VS Code extensions share ~70% of their UI code — the same Preact components (ResponseView, AnnotationToolbar, AnnotationList), the same Signals-based state management, and the same CSS. If a user moves between the browser and VS Code, the annotation experience is identical.

---

## 12. Open Items & TBDs

### 12.1 Critical (Must resolve before implementation)

| # | Item | Notes |
|---|------|-------|
| 1 | **CC schema/structure** | JSON vs. natural language? Fixed sections vs. free-form? Token budget? See Section 6.3 |
| 2 | **Synthesis model selection** | Cheap model, frontier model, rotating, or Anthropic Compaction API? See Section 6.4 |
| 3 | **Auto-synthesis prompt** | The harder prompt — must infer consensus, tensions, insights without user guidance |
| 4 | **User-refined synthesis prompt** | Easier — follows user annotation signals. But format of annotation input needs definition |
| 5 | ~~**Annotation UX design**~~ | **Resolved.** Built and working in both extensions. Text selection → floating toolbar (✓/✗/⤵/?/↺) → DOM overlay with `<mark>`/`<del>` wrappers. Four gesture types: highlight, strikethrough, dig deeper, verify. |
| 6 | **Annotation → synthesis translation** | How do annotations get represented in the synthesis prompt? Quoted text with labels? Structured JSON? |

### 12.2 Important (Resolve during implementation)

| # | Item | Notes |
|---|------|-------|
| 7 | ~~**Platform DOM selectors**~~ (Extension) | **Resolved for claude.ai and ChatGPT.** See [Extension Architecture](extension-architecture.md) Sections 7 and 8 for selector details. Grok and Gemini selectors still TBD. |
| 8 | **Error handling for API failures** | What happens if one model's API is down? Skip it? Show error? Retry? |
| 9 | **Streaming responses** | Do we stream individual model responses as they arrive, or wait for all? Streaming is better UX but adds complexity |
| 10 | **Model configuration UI** | How does the user select which models to include? API key management? |

### 12.3 Deferred (V2 / Future)

| # | Item | Notes |
|---|------|-------|
| 11 | **Recovering context from prior conversations** | Importing context from other platforms |
| 12 | **Richer annotation gestures** | Star/pin, cross-model linking, priority ranking, inline comments |
| 13 | **Mobile interface** | Not a V1 concern — serious conversations happen on desktop |
| 14 | **Sharing conversations** | Collaboration features |
| 15 | **Analytics** | Model agreement/disagreement patterns over time |
| 16 | **Extension ↔ Platform integration** (Phase 2) | Extension annotations feeding into platform CC |

### 12.4 Resolved / Completed

| # | Item | Notes |
|---|------|-------|
| 17 | ~~**Naming and positioning**~~ | **Resolved.** Brand is Recurate (recurate.ai). Tagline: "Don't just chat, recurate." |
| 18 | **Manual validation test** | Take a real multi-LLM question, manually create the ideal CC, test if feeding it back improves responses. Validates the core hypothesis. (Applicable to Roundtable only — annotation UX validated through daily use of Chrome + VS Code extensions.) |

---

## 13. Phased Roadmap

### Phase 0: Recurate Annotator Extensions

**Goal:** Ship the annotation mechanism as standalone products under the Recurate brand.

**Chrome Extension — Built and working.**

- Side panel annotation on claude.ai and chat.com
- Four annotation gestures: highlight, strikethrough, dig deeper, verify
- Proactive feedback auto-injection into platform text box
- No backend, no API keys, fully client-side
- Tech: WXT, Preact, Preact Signals, TypeScript, Vite

**VS Code Extension — Built and working.**

- Sidebar annotation for Claude Code terminal workflow
- Watches JSONL conversation files, renders markdown
- Last 5 responses with back/forward navigation
- Auto-copy feedback to clipboard on every annotation change
- WEBVIEW_READY handshake for sidebar persistence
- Tech: esbuild, Preact, Preact Signals, TypeScript, Vite, marked

**Remaining Phase 0 work:**

- Chrome Web Store packaging and submission
- VS Code Marketplace packaging and submission
- Add grok.com and gemini.google.com platform support to Chrome extension

**Success criteria:** The extensions noticeably improve the quality of multi-turn LLM conversations by giving users an efficient way to signal what they valued and what they didn't.

### Phase 1: Recurate Roundtable Platform

**Goal:** Ship the full multi-model platform with cross-model CC and native annotation under recurate.ai.

**Scope:**
- Web application (React + FastAPI)
- 3-4 LLMs (Claude, GPT, Grok, optionally Gemini)
- Stateless API architecture with CC as sole persistent state
- Auto-synthesis + user annotation + re-synthesis flow
- Documents/links as optional initial input
- Conversation history and management

**Depends on:** Resolving all Critical open items (Section 12.1). Phase 0 is not a technical dependency but validates the annotation UX.

### Phase 2: Convergence

**Goal:** Connect the Chrome extension to the Roundtable platform.

**Scope:**
- Extension annotations on individual LLM platforms feed into the centralized CC
- Users can start on a single platform and "upgrade" to multi-model mid-conversation
- Unified annotation history across extension and platform

**Depends on:** Phase 0 and Phase 1 both shipped and stable.

---

## 14. Key Design Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Two products, phased delivery** | The annotation mechanism is independently valuable and ships faster as a Chrome extension. The multi-LLM platform is a larger effort. Sequencing reduces risk and validates the core UX innovation early. |
| 2 | **Side panel (not DOM injection) for Chrome extension** | Platform-agnostic, robust, lower maintenance. Accepted trade-off: slightly less integrated feel. Side panels don't work on mobile, but desktop is the target. |
| 3 | **Stateless LLM calls** (no per-model conversation history) | Eliminates complexity of managing 3+ separate stateful systems. Enables model swapping mid-conversation. All state is in one place (the CC in the backend database). |
| 4 | **CC as sole conversation memory** | Simpler architecture. The CC is a curated, structured memory — arguably superior to raw conversation history, which passively carries everything forward without curation. |
| 5 | **Auto-synthesis + optional user-refined synthesis** | Fast path (zero friction) for most turns. Power path (annotation + re-synthesis) for pivotal turns. User controls the pace. Neither path is required — the system works with either or both. |
| 6 | **User annotation is the most defensible feature** | Solves a fundamental limitation of text-box-only LLM interfaces. Valuable even in single-model conversations. No major LLM interface has addressed this. Changes the interaction model between humans and AI. |
| 7 | **API-based architecture (not UI-layer)** | The Roundtable inherently requires backend orchestration. LLMs are stateless workers called fresh each time. The backend is thin but essential. |
| 8 | **External input (docs/links) is V1; prior conversation recovery is V2** | Mirrors how claude.ai and ChatGPT evolved — none launched with external input on V1. Reduces initial scope. |
| 9 | **Naming discussion after design, before implementation** | Focus on substance first. Naming shapes user perception and should be deliberate — not rushed. |
| 10 | **Brand name: Recurate (recurate.ai)** | "Curate" is the base word — exactly what the user does (curating AI responses through annotation). "Re-curate" is the action — every turn, the conversation gets re-curated. Unique, ownable, pronounceable, elevated. Works for both the Chrome extension (Recurate Annotator) and the platform (Recurate Roundtable). Tagline: "Don't just chat, recurate." |
| 11 | **VS Code extension for Claude Code** | Claude Code users work in the terminal, not the web UI. The JSONL file watcher approach captures assistant text responses without any unstable APIs. Clipboard-based feedback delivery (vs. terminal injection) is the safe V1 — no risk of disrupting an active session. |
| 12 | **JSONL file watching (not terminal API)** | Claude Code saves conversations to `~/.claude/projects/<encoded-path>/<session-id>.jsonl`. Watching these files is reliable and stable. The VS Code terminal API (`onDidWriteTerminalData`) is proposed/unstable and wouldn't give structured message data. Hooks capture tool events, not text responses. |
| 13 | **Shared UI components across extensions** | Both extensions use the same Preact components (ResponseView, AnnotationToolbar, AnnotationList), same Signals state, same CSS, same KEEP/DROP/EXPLORE DEEPER/VERIFY formatter. Only the messaging layer and data source differ. This ensures consistent UX and reduces maintenance. |
| 14 | **Auto-copy to clipboard** | VS Code extension copies formatted feedback to clipboard on every annotation change. No explicit "copy" action needed — the clipboard always has the latest feedback. User pastes into Claude Code when ready. Reduces friction to near-zero. |
| 15 | **Response history (last 5)** | VS Code extension keeps the last 5 assistant responses with back/forward navigation. Unlike the Chrome extension (which gets a new response on every AI turn), the VS Code sidebar may be opened after several responses have passed. History lets users annotate any recent response. |
| 16 | **WEBVIEW_READY handshake** | VS Code destroys webviews when the sidebar is hidden. The WEBVIEW_READY pattern (webview signals when mounted, extension re-sends state) ensures the sidebar always restores correctly, even after tab switching. |
| 17 | **WXT + Preact for Chrome extension** | WXT chosen over Plasmo for smaller bundle and active maintenance. Preact chosen over React (4KB vs 40KB runtime), Svelte (familiarity), Lit (weak state management), and vanilla JS (too much interactive complexity for manual DOM management). |

---

## 15. Appendix: Design Process & Context

This design emerged from an iterative conceptual discussion in February 2026. The conversation evolved through several key realizations:

1. **Initial idea:** "What if we send the same question to multiple LLMs and cross-feed the responses?" → Established the core concept of a multi-model roundtable.

2. **"The LLMs already do this internally":** Recognition that context management within a single LLM conversation is the same fundamental problem as cross-model context — just extended across models. This made the problem feel more tractable — it's not a novel AI challenge, it's an engineering and prompt design challenge.

3. **The stateless simplification:** Initially, the design maintained per-model conversation threads alongside cross-model context. The critical realization was that each call could be fully stateless — just CC + new question — dramatically simplifying the architecture. This was a key design breakthrough. The CC becomes both the cross-pollination mechanism and the entire conversation memory.

4. **The annotation insight:** Started as "the user should influence what gets carried forward" and evolved into the recognition that this solves a fundamental problem (text-box-only input) that exists even in single-model conversations. This led to the Chrome Extension as a standalone Phase 0 product.

5. **The three-step synthesis flow:** Initially, synthesis was either automatic or user-triggered. The final design uses both: auto-synthesis runs immediately (user has a starting point with no delay), then the user optionally annotates and triggers re-synthesis. This gives both speed (fast path) and control (power path).

6. **The Chrome Extension as Phase 0:** Extracting the annotation mechanism into a standalone Chrome extension that works on existing LLM platforms. No backend required. This ships faster, validates the core UX innovation, builds user habits, and creates a natural on-ramp to the full multi-LLM platform.

**Key design philosophy throughout:** Start with what solves the user's actual problem, not with what's architecturally interesting. The annotation mechanism is less technically complex than the CC synthesis, but it's more valuable to the user and more defensible as a product.

---

*This document captures the complete state of the design as of February 21, 2026. Phase 0 (Chrome + VS Code extensions) is built and working. The Roundtable platform remains in design. All open items are explicitly marked in Section 12.*
