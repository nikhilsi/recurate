# NOW - What's Next

---
**Last Updated**: November 16, 2026
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
- [x] Spec v2.1 approved: `extensions/conversation-copier/docs/spec.md`
- [x] Independent review: 27 findings, all answered in `extensions/conversation-copier/docs/reviews/`
- [x] Rulings (Nov 15): Markdown only; branch tests on existing chats; consumer Copilot is the merged M365 app and is in 1.0

Build steps (one task each, #531 to #541):

1. [x] Core model, Markdown writer, safeName (#531)
2. [x] Probe script and fixture skeletons (#532)
3. [x] Claude adapter (#533)
4. [x] ChatGPT adapter (#534)
5. [x] Grok adapter (#535)
6. [x] Gemini adapter (#536)
7. [x] Copilot adapter, work and personal (#537)
8. [x] UI, popup, ZIP, screen check (#538)
9. [x] Live test matrix and proof (#539)
10. [x] Breaker pass (#540): 17 findings, then two independent reviews of the fixes (all findings fixed or answered), live rerun on all five sites; records in `extensions/conversation-copier/docs/reviews/`
11. [x] Release prep and store submission (#541)

Step 11 (Nov 16):
- [x] Reruns after Nikhil's reload: Claude uploads 13 of 13 (was 13 of 15), Gemini "1 image" (was 3)
- [x] Claude uploads exported twice under the sandbox's renamed spelling (about 30 uploads in 10 of 80 chats): fixed with tests, reviewed twice, rerun live (78435e51: 65 of 65 files, no duplicates, 98 MB instead of 135 MB)
- [x] STORE_LISTING.md rewritten, with the 1.0 release notes and the untested list
- [x] CHANGELOG, README, CLAUDE.md, CURRENT_STATE updated; release workflow ships the 1.0 files
- [x] Three 1280x800 screenshots from the espresso chat and a ChatGPT trip chat (sidebars collapsed, one name covered), approved by Nikhil: `screenshot-1.0-1.jpg` to `-3.jpg`. The three older screenshots are removed (Nikhil, Nov 16)
- [x] Release ZIP `recurate-copier-1.0.0.zip` (git-ignored)
- [x] Extension Update Testing Tool skipped by Nikhil's ruling (spec ruling 4): on a Mac it needs a system Chrome policy profile. Chrome's permission list shows no warning for activeTab or scripting, and the six https hosts are a subset of 0.4.0's eight
- [x] Store upload, description, screenshots and Privacy tab (Nikhil in the dashboard, Nov 16; Chrome blocks extensions from scripting the store). Submitted for review
- [x] recurate.ai Copier pages and hero image updated; tag v1.8.0 and GitHub release
- [ ] Store review: if the dashboard shows "Ready to publish" after approval instead of "Published", Nikhil clicks Publish
- [x] The 29 test exports from Nov 15 and 16 in ~/Downloads moved to the Trash (Nikhil, Nov 16)

Google AI Mode is removed in 1.0 (shelved since July, see CHANGELOG 1.7.0).

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
