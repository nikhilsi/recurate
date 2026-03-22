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

Recurate Copier exports your entire AI conversation with one click. Two options:

Copy — copies the full conversation (all messages, both sides) as clean markdown to your clipboard. Paste it into notes, docs, or another chat.

Download — saves the conversation as a styled, self-contained HTML file. Opens in any browser, looks good on screen and in print. Indigo-branded layout with your messages in bordered boxes and the AI's responses with full formatting (headings, lists, code blocks, blockquotes).

HOW IT WORKS

1. Have a conversation on any supported AI chat platform
2. Click the copy button for markdown, or the download button for HTML
3. That's it — the full conversation is on your clipboard or in your downloads folder

On Claude and Grok, the buttons appear inline in the platform's own action bar. On other platforms, they appear as floating buttons. Keyboard shortcuts: Ctrl/Cmd+Shift+C (copy), Ctrl/Cmd+Shift+D (download).

Downloaded files include a smart filename with the platform name, conversation title, and date — so they're easy to find later.

WHAT GETS EXPORTED

Every message in the conversation — your prompts and the AI's responses — in the order they appeared. The markdown export is clean and portable. The HTML export preserves the AI's formatting (headings, bold, code blocks, lists) in a styled layout that's ready to read, share, or print.

Works with all major AI chat platforms — the buttons appear automatically when you visit a supported site.

PRIVACY

- No backend. No API keys. No data collection.
- Conversations never leave your browser — copy goes to your clipboard, download goes to your local filesystem.
- No permissions beyond host access to supported sites.
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

Copies or downloads full AI conversations (both user messages and AI responses) as markdown to clipboard or as a styled HTML file.

### Permission Justifications

**Host permissions**: Content script runs on claude.ai, chatgpt.com, grok.com, gemini.google.com, copilot.microsoft.com, m365.cloud.microsoft, and google.com to read conversation content from the page DOM and export it as markdown or HTML. No data is sent externally — copy goes to the user's clipboard and download saves to the user's local filesystem.

**Remote code**: This extension does not use remote code. All JavaScript is bundled locally in the extension package.

### Data Use Certification

Check the compliance checkbox. The extension collects no user data, transmits nothing externally, and runs entirely client-side.

---

## Build & Submit

```bash
# The extension is plain JS — no build step needed.
# ZIP the extension directory (icons must be pre-generated):
cd extensions/conversation-copier
zip -r recurate-copier-0.2.0.zip manifest.json content.js jszip.min.js icon-16.png icon-32.png icon-48.png icon-128.png

# Upload recurate-copier-0.2.0.zip to Chrome Web Store Developer Dashboard
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
