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
- [x] Test Copilot enterprise
- [x] Store listing, screenshots
- [x] Submitted to Chrome Web Store (Mar 20)
- [ ] **Full Claude Chat Export** — one-click download of conversation + all artifacts + uploads as ZIP. See docs/full-claude-chat-export-feature-plan.md
  - [ ] Bundle JSZip into extension
  - [ ] Add Claude API helpers (getOrgId, listFiles, downloadFile)
  - [ ] Modify downloadHTML to detect artifacts and build ZIP
  - [ ] Inline artifact links in conversation HTML
  - [ ] Artifact + upload manifest at end of HTML
  - [ ] Progress toast during download
  - [ ] Test with large conversations (50+ artifacts)

### Recurate Connect
- [x] Architecture design (docs/connect-architecture.md)
- [x] Extension built: tab registry (2-tab limit), share button, command palette (\rc, \rcp, \rcc), shared space sidebar (read-only), pop-out window with state sync
- [x] Testing: tab discovery, share button, auto-send, sidebar, pop-out, commands, text selection, SPA navigation, persistence
- [x] Simplified: removed pattern detection, tab picker dropdown, multi-message range, tab badge, edit/pin/delete/search/drag (moved to V0.3). Added command palette.
- [x] Bug fixes: service worker hibernation (chrome.storage.session), pop-out state sync, share echo prevention
- [x] Store listing (STORE_LISTING.md)
- [x] Tagged v1.3.0 (clean Claude-to-Claude state)
- [x] Cross-platform sharing: Claude to Copilot (`m365.cloud.microsoft/chat`) using Lexical injection (Urmila's request)
- [x] Test cross-platform sharing (Claude-to-Copilot, Copilot-to-Claude)
- [x] Version bump to 0.2.0
- [ ] Screenshots
- [ ] Publish to Chrome Web Store

**V0.3 (Planned):**
- Edit/pin/delete entries in sidebar
- Search/filter shared messages
- Drag entries from sidebar to editor
- Send from sidebar (re-share older entries)

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
