# Recurate Annotator

**Annotate Claude Code's responses. Highlight what matters. Strikethrough what doesn't.**

## The Problem

Claude Code gives long, detailed responses. You agree with half and disagree with half. Your only option? Type a paragraph explaining that. Most people don't bother. The conversation drifts.

## The Solution

Recurate adds a sidebar to VS Code where you can **highlight** and **strikethrough** parts of Claude Code's responses:

- **Highlight** (green) — "This is valuable. Keep it."
- **Strikethrough** (red) — "This is wrong. Drop it."

Annotations auto-copy as structured feedback to your clipboard. Paste into Claude Code. Its next response is better because it got explicit signal.

## How It Works

1. Use Claude Code in your terminal as usual
2. Click the Recurate icon in the activity bar
3. The sidebar shows Claude Code's latest text response with full markdown formatting
4. Select text and annotate with the floating toolbar
5. Feedback auto-copies to clipboard — paste it into Claude Code

## Features

- **Zero-click feedback** — annotations copy to clipboard automatically
- **Response history** — browse the last 5 responses with back/forward navigation
- **Full markdown rendering** — headings, lists, code blocks, bold all render correctly
- **Light and dark themes** — matches your VS Code theme
- **Efficient** — reads only the tail of conversation files, handles 25MB+ sessions
- **No API keys, no backend** — fully local, reads Claude Code's own files

## Why Annotations Beat Typing

Turn 2 annotations make turn 3 better. By turn 5, the conversation is precisely tuned to what you care about — in a way that text-only feedback never achieves.

Each annotation doesn't just improve the next turn. It refines what the AI carries forward as context.

## Requirements

- VS Code 1.85+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (reads conversation files at `~/.claude/projects/`)

## Privacy

Recurate reads Claude Code's local JSONL conversation files. No data leaves your machine. No network requests. No telemetry.

---

[recurate.ai](https://recurate.ai) | [GitHub](https://github.com/nikhilsi/recurate)
