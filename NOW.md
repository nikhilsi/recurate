# NOW - What's Next

---
**Last Updated**: March 11, 2026
**Purpose**: What to work on next
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

## Next Up

### Chrome Extension — New Platforms

- [ ] Add grok.com platform support (DOM inspection needed)
- [ ] Add gemini.google.com platform support (DOM inspection needed)
- [ ] Update Chrome Web Store screenshots (after grok + gemini)

### GitHub Issues

- [ ] **#2** — Feature request: requirement planning/prompt refinement in IDE. Responded, awaiting Amit's reply.

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
