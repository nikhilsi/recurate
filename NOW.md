# NOW - What's Next

---
**Last Updated**: March 6, 2026
**Purpose**: What to work on next
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

**Phase**: Published & Live

---

## Both Extensions Live — 4 Platforms

- **Chrome**: [Chrome Web Store](https://chromewebstore.google.com/detail/recurate-annotator/nfkfbokpmmcdnhdpnhcbkppapnkcdphm)
- **VS Code**: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=recurate.recurate-annotator-vscode)
- **Open VSX**: [Open VSX Registry](https://open-vsx.org/extension/recurate/recurate-annotator-vscode)
- **Supported platforms**: claude.ai, ChatGPT (chat.com), Copilot consumer, Copilot enterprise

## Next Up

### Blog Post 2 — "20+ Tools, Zero Curation"
- [x] Draft written (docs/blog/posts/twenty-tools-zero-curation.md)
- [ ] Finalize and publish to recurate.ai
- [ ] LinkedIn post

### Chrome Extension Updates
- [ ] Update Chrome Web Store screenshots to show Copilot
- [ ] Add grok.com platform support
- [ ] Add gemini.google.com platform support

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
code --install-extension recurate-annotator-vscode-0.2.0.vsix  # Install
```

---

**For details**: See CURRENT_STATE.md | CHANGELOG.md | docs/extension-architecture.md
