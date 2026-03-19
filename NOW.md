# NOW - What's Next

---
**Last Updated**: March 19, 2026 (Ops-HQ)
**Purpose**: What to work on next
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

## Next Up

### Recurate Composer — Published
- [x] Extension built and tested on 8 platforms
- [x] Published on Chrome Web Store (Mar 15)

### Recurate Copier
- [x] Extension built, tested on Claude + Google AI Mode
- [ ] **#4** — Google AI Mode HTML export carries DOM cruft (jscontroller, data-sfc-*, HTML comments, empty wrappers). Needs sanitization pass. Found by Ops-HQ analyzing a real export.
- [ ] Test remaining platforms (ChatGPT, Grok, Gemini, Copilot)
- [ ] Store listing, screenshots
- [ ] Publish to Chrome Web Store

### Annotator — New Platforms
- [ ] Add grok.com platform support (DOM inspection needed)
- [ ] Add gemini.google.com platform support (DOM inspection needed)
- [ ] Update Chrome Web Store screenshots (after grok + gemini)

### GitHub Issues
- [ ] **#2** — Feature request: requirement planning/prompt refinement in IDE. Responded, awaiting Amit's reply.
- [ ] **#4** — Copier: Google AI Mode HTML export carries excessive DOM cruft. Filed by Ops-HQ after analyzing real export. See issue for full details.

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
