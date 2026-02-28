# NOW - What's Next

---
**Last Updated**: February 27, 2026
**Purpose**: What to work on next
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

**Phase**: Package & Ship

---

## Next Up: Go Live + Blog Posts

### Chrome Extension — Submitted, Awaiting Review
- [x] Submitted for review (Feb 27, 2026) — typically 1-3 business days
- [ ] Receive approval and go live

### VS Code Extension — Submitted, Verifying
- [x] Publisher account created (publisher: `recurate`)
- [x] .vsix packaged and uploaded (41 KB)
- [ ] Verification completes and goes live

### Post-Publish
- [ ] Update recurate.ai with install links
- [ ] Schedule and share blog posts on LinkedIn
- [ ] Second blog post: finalize and publish "20+ Tools, Zero Curation"

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
