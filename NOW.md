# NOW - What's Next

---
**Last Updated**: March 20, 2026
**Purpose**: What to work on next
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

## Next Up

### Recurate Composer — Published
- [x] Extension built and tested on 8 platforms
- [x] Published on Chrome Web Store (Mar 15)

### Recurate Copier
- [x] Extension built, tested on Claude + Google AI Mode
- [x] **#4** — HTML sanitization: strips class/style/dir, Google js*/data-* attributes, empty wrappers, buttons, icons, HTML comments
- [x] Fix ChatGPT selectors (article→section, use data-message-author-role)
- [x] Add Grok action bar injection and conversation title extraction
- [x] Tested on 6 platforms: Claude, ChatGPT, Grok, Gemini, Google AI Mode, Copilot consumer
- [ ] Test Copilot enterprise
- [ ] Store listing, screenshots
- [ ] Publish to Chrome Web Store

### Recurate Connect
- [x] Architecture design (docs/connect-architecture.md)
- [x] Extension built: tab registry, share buttons, shared space sidebar, chat-requested share, edit/pin/delete, search, drag-to-inject, resize, pop-out window
- [ ] Test on Claude.ai with 2+ tabs
- [ ] Fix issues found during testing
- [ ] Store listing, screenshots
- [ ] Publish to Chrome Web Store

### Annotator — New Platforms
- [ ] Add grok.com platform support (DOM inspection needed)
- [ ] Add gemini.google.com platform support (DOM inspection needed)
- [ ] Update Chrome Web Store screenshots (after grok + gemini)

### GitHub Issues
- [ ] **#2** — Feature request: requirement planning/prompt refinement in IDE. Responded, awaiting Amit's reply.
- [x] **#4** — Copier: HTML sanitization implemented (Google DOM cruft, class/style/dir stripping, empty wrapper removal)

---

## Backlog

1. **Settings page** — auto-inject vs manual confirmation toggle

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
code --install-extension recurate-annotator-vscode-0.2.1.vsix  # Install
```

---

**For details**: See CURRENT_STATE.md | CHANGELOG.md | docs/extension-architecture.md
