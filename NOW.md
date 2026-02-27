# NOW - What's Next

---
**Last Updated**: February 27, 2026
**Purpose**: What to work on next
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

**Phase**: Package & Ship

---

## Next Up: Publish Both Extensions

### VS Code Extension
- [ ] Publisher account on VS Code Marketplace (publisher name: `"recurate"`)
- [ ] Screenshots showing annotation flow
- [ ] Publish to VS Code Marketplace

### Chrome Extension
- [ ] Screenshots showing before/after annotation quality
- [ ] Chrome Web Store developer account
- [ ] Review and submit to Chrome Web Store

### Post-Publish
- [ ] Update recurate.ai with install links and screenshots
- [ ] Test on multiple claude.ai and ChatGPT conversations

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
