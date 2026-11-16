# NOW - What's Next

---
**Last Updated**: November 15, 2026
**Purpose**: What to work on next
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

## Next Up

### Recurate Composer — Published
- [x] Extension built and tested on 8 platforms
- [x] Published on Chrome Web Store (Mar 15)

### Recurate Copier 1.0 (active, task #530)

Copier 0.4.0 (live in the store since Jul 11) is broken or partial on every platform. A live check on Nov 15 found:

- ChatGPT exports 0 messages.
- Grok drops your messages.
- Gemini mislabels roles and stops at the latest 10 turns.
- Copilot gets only the part of the chat on screen. Consumer Copilot moved to copilot.com.
- Claude exports carry tool placeholders and drop tools, sources, images and files.

The fix reads each site's own conversation data instead of the page. Copilot is collected by scrolling and checked against the total the page reports.

- [x] Live check on all sites (Nov 15)
- [x] Spec draft: `extensions/conversation-copier/docs/spec.md`
- [ ] Independent review, findings answered in `extensions/conversation-copier/docs/reviews/`
- [ ] Nikhil's rulings on the short spec
- [ ] Build steps (become tasks after the rulings)

Google AI Mode stays shelved (see CHANGELOG 1.7.0). The spec proposes dropping it.

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
