# NOW - What's Next

---
**Last Updated**: February 27, 2026
**Purpose**: What to work on next
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

**Phase**: Package & Ship

---

## Next Up: Publish VS Code Extension

### VS Code Extension
- [ ] Publisher account on VS Code Marketplace (publisher name: `"recurate"`)
- [ ] Screenshots showing annotation flow
- [ ] Publish to VS Code Marketplace

### Chrome Extension — Submitted, Awaiting Review
- [x] Screenshots showing all 4 annotation gestures
- [x] Chrome Web Store developer account ($5 fee)
- [x] Privacy practices (permissions justifications, single purpose, data certification)
- [x] Submitted for review (typically 1-3 business days)
- [ ] Receive approval and go live

### Post-Publish
- [ ] Update recurate.ai with install links and screenshots
- [ ] Blog posts: schedule and share on LinkedIn

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
