# NOW - What's Next

---
**Last Updated**: March 4, 2026
**Purpose**: What to work on next
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

**Phase**: Published & Promoting

---

## Both Extensions Live — 4 Platforms

- **Chrome**: [Chrome Web Store](https://chromewebstore.google.com/detail/recurate-annotator/nfkfbokpmmcdnhdpnhcbkppapnkcdphm)
- **VS Code**: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=recurate.recurate-annotator-vscode)
- **recurate.ai**: install links added for both extensions
- **Supported platforms**: claude.ai, ChatGPT (chat.com), Copilot consumer (copilot.microsoft.com), Copilot enterprise (m365.cloud.microsoft/chat)

## Recently Completed: Copilot Support (v0.2.0)

- [x] Consumer Copilot — textarea injection, stop button streaming detection
- [x] Enterprise Copilot — Lexical editor injection via synthetic ClipboardEvent paste
- [x] Word-level selection snapping fix (element boundary detection)
- [x] All 4 platforms regression tested and working

## Next Up

### Republish Chrome Extension (v0.2.0)
- [ ] Update Chrome Web Store with Copilot support
- [ ] Update screenshots to show Copilot

### Blog Post — Copilot Support Announcement
- [ ] Write short post announcing Copilot support (consumer + enterprise) — what was tricky (Lexical editor), 4 platforms now supported
- [ ] Publish to recurate.ai
- [ ] LinkedIn post

### Blog Post 2 — "20+ Tools, Zero Curation"
- [x] Draft written (docs/blog/posts/twenty-tools-zero-curation.md)
- [ ] Finalize: update date to Mar 6, add install links, verify emoji rendering
- [ ] Publish to recurate.ai — Mar 6
- [ ] LinkedIn post — Mar 7

---

## Backlog

1. **Settings page** — auto-inject vs manual confirmation toggle
2. **Additional browser platforms** — grok.com, gemini.google.com
3. **CC schema design** — critical for Roundtable, not needed for extensions
4. **Synthesis prompt engineering** — auto-synthesis and user-refined prompts
5. **Roundtable backend** — FastAPI + LLM orchestration
6. **Roundtable frontend** — React + TypeScript
7. **Extension-Platform convergence** (Phase 2)

---

## Quick Reference

```bash
# Chrome extension
cd extensions/chrome && npm run dev     # Dev mode with HMR
cd extensions/chrome && npm run build   # Production build
# Load .output/chrome-mv3-dev/ in chrome://extensions

# VS Code extension
cd extensions/vscode && npm run compile   # Build
npx @vscode/vsce package                 # Package .vsix
code --install-extension recurate-annotator-vscode-0.1.0.vsix  # Install
```

---

**For details**: See CURRENT_STATE.md | CHANGELOG.md | docs/extension-architecture.md
