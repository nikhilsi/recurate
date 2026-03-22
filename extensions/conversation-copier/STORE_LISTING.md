# Chrome Web Store Listing — Recurate Copier

Copy-paste these into the Chrome Web Store developer dashboard.

---

## Store Listing Tab

### Short Description (132 chars max)

Export your full AI conversation with one click. On Claude, includes all artifacts and uploads as a ZIP. Clean markdown or HTML.

### Manifest Description (132 chars max)

Export your full AI conversation — messages, artifacts, and uploads. One click for markdown, or download as a complete ZIP archive.

### Detailed Description

THE PROBLEM

AI conversations are valuable, but they're trapped in the chat window. You can copy individual messages one at a time, but there's no way to export the full conversation — both your messages and the AI's responses — in one step.

When you want to save a conversation for reference, share it with a colleague, or archive it, you're stuck with manual copy-paste, one message at a time.

THE SOLUTION

Recurate Copier gives you three buttons on Claude.ai and two on other platforms:

Copy — copies the full conversation as clean markdown to your clipboard. Paste into notes, docs, or another chat.

Download — saves a quick HTML snapshot of the conversation. Instant, no API calls. Timestamped filename.

Export (Claude.ai only) — downloads a complete ZIP archive: your conversation HTML plus all artifacts Claude generated (documents, code, presentations) and all files you uploaded. Inline links in the HTML connect each artifact to the point in the conversation where it was created.

AUTO-BACKUP

The extension automatically saves a snapshot of your Claude.ai conversation every 2 hours. No clicks needed. If your chat ever hits Claude's capacity limit, you have a recent backup ready.

At 400+ messages, a warning banner reminds you to consider exporting.

HOW IT WORKS

1. Have a conversation on any supported AI chat platform
2. Three buttons appear in the action bar (Claude.ai) or as floating buttons:
   - Copy: markdown to clipboard
   - Download: quick HTML file
   - Export: full ZIP with artifacts (Claude.ai only)
3. The Export button shows a progress modal while downloading artifacts. You can cancel anytime.

Filenames include the platform name, conversation title, date, and time in your timezone.

Works with all major AI chat platforms — the buttons appear automatically when you visit a supported site.

PRIVACY

- No backend. No API keys. No data collection.
- Conversations never leave your browser. Copy goes to clipboard, downloads go to your filesystem.
- Auto-backups save to your Downloads folder.
- Open source: github.com/nikhilsi/recurate

Free forever. Install and your AI conversations are yours to keep.

### Additional Fields

- **Category**: Tools (under Productivity)
- **Language**: English
- **Homepage URL**: https://recurate.ai
- **Support URL**: https://github.com/nikhilsi/recurate/issues
- **Mature content**: No

### Assets

- **Store icon**: `icon-128.png` (128x128)
- **Screenshots**: See screenshot recommendations below

---

## Privacy Practices Tab

### Single Purpose Description

Exports full AI conversations as markdown, HTML, or ZIP archive (with artifacts and uploads on Claude.ai). Auto-backs up conversations periodically.

### Permission Justifications

**Host permissions**: Content script runs on claude.ai, chatgpt.com, grok.com, gemini.google.com, copilot.microsoft.com, m365.cloud.microsoft, and google.com to read conversation content from the page DOM and export it as markdown, HTML, or ZIP. On Claude.ai, also calls Claude's internal API to list and download artifact files. No data is sent externally.

**Alarms**: Used to schedule automatic conversation backups every 2 hours. The background service worker triggers a backup of any open Claude.ai tab.

**Downloads**: Used to silently save auto-backup HTML files to the user's Downloads folder without requiring a file picker dialog.

**Remote code**: This extension does not use remote code. All JavaScript (including JSZip) is bundled locally in the extension package.

### Data Use Certification

Check the compliance checkbox. The extension collects no user data, transmits nothing externally, and runs entirely client-side.

---

## Build & Submit

```bash
# The extension is plain JS — no build step needed.
# ZIP the extension directory (icons must be pre-generated):
cd extensions/conversation-copier
zip -r recurate-copier-0.3.0.zip manifest.json content.js background.js jszip.min.js icon-16.png icon-32.png icon-48.png icon-128.png

# Upload recurate-copier-0.3.0.zip to Chrome Web Store Developer Dashboard
```

---

## Screenshot Recommendations

Chrome Web Store requires 1-5 screenshots at 1280x800 or 640x400.

**Screenshot 1: Claude — buttons in action bar**
Show a Claude conversation with the Copier buttons visible in Claude's native action bar (next to the existing copy/thumbs buttons). Demonstrates the seamless, non-intrusive integration. This is the strongest visual — buttons look native.

**Screenshot 2: Downloaded HTML file**
Show a downloaded HTML export opened in a browser tab. The styled output with the indigo header, user messages in bordered boxes, and formatted AI responses. Demonstrates the quality of the export.

**Screenshot 3: Multi-platform collage**
2-3 platforms side by side (e.g., ChatGPT with floating buttons, Grok with action bar buttons) showing the extension works across platforms. Keep it clean — no need to show all 7.

**Screenshot 4 (optional): Markdown in a notes app**
Show the clipboard markdown pasted into a notes app or doc, demonstrating the clean portable output.

Sizing: capture at 2560x1600 (Retina) and resize to 1280x800 for upload.
