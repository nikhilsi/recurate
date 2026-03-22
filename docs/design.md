# Recurate: Design & Architecture Document
### recurate.ai — "Don't just chat, recurate."

**Status:** 5 extensions built (3 published, 1 submitted, 1 testing)
**Date:** February 21, 2026 (last updated: March 21, 2026)
**Domain:** recurate.ai (registered)
**Author:** Nikhil Singhal

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [Two Products, One Vision](#2-two-products-one-vision)
3. [The Recurate Annotator (Extensions)](#3-the-recurate-annotator-extensions)
4. [The User Annotation Mechanism](#4-the-user-annotation-mechanism)
5. [What Exists Today vs. What's Novel](#5-what-exists-today-vs-whats-novel)
6. [Technical Stack](#6-technical-stack)
7. [Phased Roadmap](#7-phased-roadmap)
8. [Key Design Decisions Log](#8-key-design-decisions-log)

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

Problem 1.1 (text-box-only input) exists within every single-model conversation. Problem 1.2 (siloed multi-LLM) exists across models. The annotation mechanism (Section 4) solves Problem 1.1 and is independently valuable. The Recurate Roundtable (a future multi-LLM platform) would solve Problem 1.2 and incorporate the annotation mechanism as its most powerful feature. This is why they are designed as two products that share a common core.

---

## 2. Two Products, One Vision

The vision is delivered through two products, built in sequence, sharing a common design language and core feature (the annotation mechanism):

### The Recurate Extension Family

What started as a single annotation extension has grown into a suite of five extensions covering the full AI conversation lifecycle. Each was born from a real friction point in daily AI workflow.

| Extension | What it does | Platforms | Status |
|-----------|-------------|-----------|--------|
| **Annotator** (Chrome) | Curate the output — highlight, strikethrough, dig deeper, verify | Claude, ChatGPT, Copilot (consumer + enterprise) | Published |
| **Annotator** (VS Code) | Same annotation UX for Claude Code terminal workflow | VS Code, Antigravity, VSCodium, Theia | Published |
| **Composer** | Compose the input — floating markdown toolbar for AI chat inputs | Claude, ChatGPT, Grok, Gemini, Copilot (consumer + enterprise), Google Search | Published |
| **Copier** | Capture the conversation — copy as markdown, or download as ZIP with artifacts | Claude, ChatGPT, Grok, Gemini, Copilot (consumer + enterprise), Google AI Mode | v0.2.0 Submitted |
| **Connect** | Connect the conversations — share context between two AI chat tabs | Claude, Copilot (2-tab, cross-platform, Chrome + Edge) | v0.2.0 Built |

- **No backend, no API keys, fully client-side.** All extensions run entirely in the browser.
- **Annotator and Connect** share WXT + Preact + Signals + TypeScript stack.
- **Composer and Copier** are vanilla JS with no build step (Chrome Manifest V3).

For detailed architecture of each extension:

- [Chrome Extension Architecture](extension-architecture.md) — Annotator implementation
- [VS Code Extension Architecture](vscode-extension-architecture.md) — VS Code Annotator
- [Connect Architecture](connect-architecture.md) — Cross-chat context sharing

### Recurate Platform — Multi-LLM Coordination

A web application at [app.recurate.ai](https://app.recurate.ai) that sends the user's question to Claude, ChatGPT, Grok, and Gemini simultaneously and synthesizes their responses into a Condensed Context (CC). The user curates the CC before continuing, and each model builds on the shared context in subsequent turns. Stateless LLM calls — the CC is the sole persistent state.

**Status:** Live (private repository).

---

## 3. The Recurate Annotator (Extensions)

The Recurate Annotator ships as two extensions sharing the same annotation UX: a Chrome extension for web-based LLM chat and a VS Code extension for the Claude Code terminal workflow. This section covers the Chrome extension in detail. See the [VS Code Extension Architecture](vscode-extension-architecture.md) for the VS Code variant.

### 3.1 Core Concept (Chrome Extension)

A Chrome extension that opens a **side panel** when the user is on a supported LLM chat site. The side panel displays the most recent AI response and provides annotation tools (highlight, strikethrough, dig deeper, and verify). The extension generates structured feedback text and proactively injects it into the platform's text input box.

For full implementation details, see:
- [Chrome Extension Architecture](extension-architecture.md)
- [VS Code Extension Architecture](vscode-extension-architecture.md)

### 3.2 Supported Platforms (Annotator)

| Platform | Site | Status |
|----------|------|--------|
| Claude | claude.ai | Working |
| ChatGPT | chat.com, chatgpt.com | Working |
| Copilot (Consumer) | copilot.microsoft.com | Working |
| Copilot (Enterprise) | m365.cloud.microsoft/chat | Working |

Note: Grok and Gemini are supported by Composer (8 platforms) and Copier (7 platforms) but not yet by the Annotator. Annotator platform expansion is on the roadmap.

### 3.3 Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                    Chrome                         │
│                                                   │
│  ┌──────────────┐     ┌──────────────────────┐  │
│  │ Content Script│     │    Side Panel         │  │
│  │ (per platform)│     │ (Preact + Signals)    │  │
│  │               │     │                        │  │
│  │ - Detect AI   │────▶│ - Display response    │  │
│  │   response    │     │ - Annotation toolbar  │  │
│  │ - Extract text│     │ - Highlight/Strike/   │  │
│  │ - Inject      │◀────│   Deeper/Verify       │  │
│  │   feedback    │     │ - Structured feedback  │  │
│  └──────────────┘     └──────────────────────┘  │
│         ▲                        ▲                │
│         │    ┌──────────────┐    │                │
│         └────│  Background  │────┘                │
│              │  (relay)     │                      │
│              └──────────────┘                      │
└─────────────────────────────────────────────────┘
```

**Content Script** — Platform-specific. Detects when the AI finishes responding, extracts the response text, and injects structured feedback into the platform's text input. One content script per supported platform.

**Side Panel** — Platform-agnostic. Displays the AI response, provides annotation tools, generates structured KEEP/DROP/EXPLORE DEEPER/VERIFY feedback. Shared across all platforms.

**Background Service Worker** — Relays messages between content script and side panel (Chrome's content scripts and side panels can't communicate directly).

### 3.4 Privacy Model

- No backend. No API keys. No data collection.
- Runs entirely in the browser.
- Only needs `sidePanel` and `activeTab` permissions.
- No user data leaves the browser.

---

## 4. The User Annotation Mechanism

This section describes the annotation mechanism — the shared core between the Chrome extension, VS Code extension, and the future Roundtable platform.

### 4.1 The Fundamental Problem This Solves

After reading an AI response, a user has complex, multi-part reactions. Current interfaces offer only one way to express these reactions: typing. Annotation provides a faster, more expressive alternative.

### 4.2 The Gestures

Four annotation types, each with a distinct color and semantic meaning:

| Gesture | Color | Icon | Meaning | Feedback Section |
|---------|-------|------|---------|-----------------|
| **Highlight** | Green | ✓ | "This matters. Carry this forward." | KEEP |
| **Strikethrough** | Red | ✗ | "This is wrong or irrelevant. Drop it." | DROP |
| **Dig Deeper** | Blue | ⤵ | "Elaborate on this. I want more detail." | EXPLORE DEEPER |
| **Verify** | Amber | ? | "Fact-check this. I'm not sure it's right." | VERIFY |

### 4.3 The Flow

```
User reads AI response in side panel
  → Selects text
  → Floating toolbar appears with ✓ ✗ ⤵ ? ↺
  → User clicks a gesture
  → Text is annotated (DOM overlay: <mark> or <del> wrapper)
  → Structured feedback is generated (KEEP/DROP/EXPLORE DEEPER/VERIFY)
  → Feedback auto-injects into the platform's text box
  → User types their next question below the feedback
  → AI receives clear signal about what the user valued
```

### 4.4 Technical Implementation

**DOM Overlays:** Annotations are applied using TreeWalker-based text offset calculation and `Range.surroundContents()`. This preserves all HTML formatting (headings, lists, code blocks, bold/italic) — the annotated text wraps in `<mark>` or `<del>` elements without destroying the DOM structure.

**Word-Level Selection Snapping:** Partial word selections automatically expand to full word boundaries. The system detects element boundary changes between adjacent text nodes to prevent grabbing extra words across `<strong>`/`<em>` boundaries.

**No Overlap:** New annotations replace overlapping existing ones. The system detects overlap and removes the previous annotation before applying the new one.

### 4.5 Structured Feedback Format

Annotations generate structured text in a consistent format:

```
KEEP (carry forward — I found this valuable):
• "The key insight about distributed systems is that..."
• "Your point about eventual consistency..."

DROP (remove — this wasn't relevant or was wrong):
• "The section about blockchain applications..."

EXPLORE DEEPER (I want more detail on these):
• "The trade-offs between CP and AP systems..."

VERIFY (fact-check these claims):
• "Redis Cluster uses gossip protocol for failure detection"
```

### 4.6 Why Four Gestures

Four feels like the right balance — expressive enough to capture nuance, simple enough to not create decision fatigue. Every gesture added beyond this is a UX decision the user has to make, which adds friction.

The design space includes richer possibilities (star/pin, cross-model linking, priority ranking, inline comments), but these are deferred to a future version.

---

## 5. What Exists Today vs. What's Novel

### 5.1 Existing Multi-LLM Tools

Tools like **ChatHub, TypingMind**, and various API wrappers already send one prompt to multiple LLMs and display responses side by side. These solve the comparison problem but **do not create shared context across models on subsequent turns.**

### 5.2 Existing Orchestration Frameworks

**LangChain, Haystack, LlamaIndex, Semantic Kernel**, and others handle multi-model routing and orchestration. These are infrastructure frameworks, not end-user products.

### 5.3 What's Novel

Two things are novel in the Recurate design:

1. **User annotation of LLM responses:** Non-verbal, gestural feedback (highlight, strikethrough, dig deeper, verify) that shapes what gets carried forward in the conversation. No major LLM interface or multi-LLM tool offers this. This is valuable even in single-model conversations (hence the extensions as standalone products).

2. **Cross-model shared context** (Roundtable): A rolling, synthesized summary that captures what all models said and feeds it back into all models on subsequent turns. No existing tool does this.

---

## 6. Technical Stack

### 6.1 Chrome Extension

| Component | Technology |
|-----------|------------|
| Extension framework | WXT (Manifest V3, file-based entrypoints, auto-manifest, HMR) |
| Side panel UI | Preact + Preact Signals (4KB runtime, fine-grained reactivity) |
| Content scripts | TypeScript (DOM observation, response extraction, feedback injection) |
| Build | Vite (via WXT) with @preact/preset-vite |
| Language | TypeScript (all code) |

### 6.2 VS Code Extension

| Component | Technology |
|-----------|------------|
| Extension host | Node.js (VS Code Extension API) |
| Extension host bundler | esbuild (CJS output) |
| Sidebar UI | Preact + Preact Signals (same components as Chrome extension) |
| Sidebar bundler | Vite with @preact/preset-vite |
| Markdown rendering | marked (~30KB, converts JSONL text to HTML) |
| Language | TypeScript (all code) |

### 6.3 Composer & Copier

| Component | Technology |
|-----------|------------|
| Architecture | Vanilla JS, no build step, Chrome Manifest V3 |
| Platforms | Composer: 8, Copier: 7 (see extension family table above) |

### 6.4 Connect

| Component | Technology |
|-----------|------------|
| Extension framework | WXT (same as Annotator) |
| UI | Preact + Preact Signals |
| Language | TypeScript |
| Persistence | chrome.storage.local (shared space) |
| Communication | chrome.runtime.sendMessage (tab-to-tab via background) |

### 6.5 Shared Design Language

All extensions share a common brand identity (indigo gradient icons, same color palette) and design principles (no backend, no API keys, fully client-side). The Annotator Chrome and VS Code extensions share ~70% of their UI code — the same Preact components, Signals state management, and CSS. Annotator and Connect share the same WXT + Preact + TypeScript stack.

---

## 7. Current Status & Roadmap

### Shipped

- **Annotator (Chrome)** v0.2.0 — published on Chrome Web Store. 4 platforms.
- **Annotator (VS Code)** v0.2.1 — published on VS Code Marketplace + Open VSX.
- **Composer** v0.1.0 — published on Chrome Web Store. 8 platforms.

### Built and Tested

- **Copier** v0.2.0 — submitted to Chrome Web Store (pending review). 7 platforms. Full Claude chat export with artifacts + uploads as ZIP.
- **Connect** v0.2.0 — built and tested. Claude + Copilot cross-platform, 2-tab connection. Chrome + Edge. Not yet submitted.
- **Recurate Platform** — live at app.recurate.ai. 4 LLMs with Condensed Context synthesis.

### Planned

- Add Grok and Gemini platform support to the Annotator Chrome extension
- Publish Connect to Chrome Web Store
- Copier: periodic auto-export for non-technical users

---

## 8. Key Design Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Two products, phased delivery** | The annotation mechanism is independently valuable and ships faster as extensions. The multi-LLM platform is a larger effort. Sequencing reduces risk and validates the core UX innovation early. |
| 2 | **Side panel (not DOM injection) for Chrome extension** | Platform-agnostic, robust, lower maintenance. Accepted trade-off: slightly less integrated feel. |
| 3 | **User annotation is the most defensible feature** | Solves a fundamental limitation of text-box-only LLM interfaces. Valuable even in single-model conversations. No major LLM interface has addressed this. |
| 4 | **VS Code extension for Claude Code** | Claude Code users work in the terminal, not the web UI. The JSONL file watcher approach captures assistant text responses without any unstable APIs. |
| 5 | **JSONL file watching (not terminal API)** | Claude Code saves conversations to `~/.claude/projects/`. Watching these files is reliable and stable. The VS Code terminal API is unstable and doesn't give structured message data. |
| 6 | **Shared UI components across extensions** | Both extensions use the same Preact components, same Signals state, same CSS, same feedback formatter. Only the messaging layer and data source differ. Consistent UX and reduced maintenance. |
| 7 | **Auto-copy to clipboard (VS Code)** | Copies formatted feedback to clipboard on every annotation change. No explicit "copy" action needed. Reduces friction to near-zero. |
| 8 | **WXT + Preact for Chrome extension** | WXT chosen over Plasmo for smaller bundle and active maintenance. Preact chosen over React (4KB vs 40KB runtime). |
| 9 | **Brand name: Recurate (recurate.ai)** | "Curate" is the base word — what the user does. "Re-curate" is the action — every turn. Unique, ownable, pronounceable. Tagline: "Don't just chat, recurate." |

---

*This document captures the design of the Recurate extension family. For detailed implementation, see the architecture docs for each extension: [Chrome Annotator](extension-architecture.md), [VS Code Annotator](vscode-extension-architecture.md), [Connect](connect-architecture.md).*
