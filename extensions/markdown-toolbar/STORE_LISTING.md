# Chrome Web Store Listing — Recurate Composer

Copy-paste these into the Chrome Web Store developer dashboard.

---

## Store Listing Tab

### Short Description (132 chars max)

AI responds in rich text. You're stuck with plain text. Recurate Composer adds markdown formatting to every AI chat input box.

### Manifest Description (132 chars max)

AI responds in rich text. You're stuck with plain text. Add markdown formatting to Claude, ChatGPT, Grok, Gemini, and Copilot.

### Detailed Description

THE PROBLEM

Every AI chat interface renders beautiful responses — bold, italic, headings, code blocks, lists. But when it's your turn to type? A plain text box. No formatting. No structure. No way to match the expressiveness of what you're reading.

The conversation is lopsided. The AI speaks in rich text. You reply in plain text.

THE SOLUTION

Recurate Composer adds a floating markdown toolbar to AI chat interfaces. Select text and click Bold, Italic, or Strikethrough. Click H1 to make a heading. Add code blocks, bullet lists, numbered lists, blockquotes, and links — all with one click.

Your input gets the same formatting power as the AI's output. The playing field is level.

HOW IT WORKS

1. A floating toolbar appears above the chat input on supported sites
2. Type your message, select text, click a formatting button
3. Markdown syntax is inserted automatically
4. The AI receives and renders your formatting

The toolbar stays docked above the text box as you type. Drag it to reposition if you prefer. Collapse it when you don't need it.

Keyboard shortcuts: Ctrl/Cmd+B (bold), Ctrl/Cmd+I (italic), Ctrl/Cmd+E (code), Ctrl/Cmd+K (link).

Works with all major AI chat platforms — the toolbar appears automatically when you visit a supported site.

FORMATTING OPTIONS

Bold, italic, strikethrough, headings (H1-H3), inline code, code blocks, bullet lists, numbered lists (auto-incrementing), blockquotes, links, and horizontal rules.

PRIVACY

- No backend. No API keys. No data collection.
- Runs entirely in your browser.
- No permissions beyond host access to supported sites.
- Open source: github.com/nikhilsi/recurate

Free forever. Install and your AI conversations become a two-way street.

### Additional Fields

- **Category**: Tools (under Productivity)
- **Language**: English
- **Homepage URL**: https://recurate.ai
- **Support URL**: https://github.com/nikhilsi/recurate/issues
- **Mature content**: No

### Assets

- **Store icon**: TBD (128x128 PNG)
- **Screenshots**: TBD (1280x800)

---

## Privacy Practices Tab

### Single Purpose Description

Adds a floating markdown formatting toolbar to AI chat input boxes, enabling users to compose rich text messages with bold, italic, headings, code, lists, and links.

### Permission Justifications

**Host permissions**: Content script runs on claude.ai, chatgpt.com, grok.com, gemini.google.com, copilot.microsoft.com, m365.cloud.microsoft, and google.com to insert a formatting toolbar and apply markdown syntax to the page's text input field. No data is read from the page or sent externally.

**Remote code**: This extension does not use remote code. All JavaScript is bundled locally in the extension package.

### Data Use Certification

Check the compliance checkbox. The extension collects no user data, transmits nothing externally, and runs entirely client-side.

---

## Build & Submit

```bash
# The extension is plain JS — no build step needed.
# ZIP the extension directory:
cd extensions/markdown-toolbar
zip -r recurate-composer-0.1.0.zip manifest.json content.js

# Upload recurate-composer-0.1.0.zip to Chrome Web Store Developer Dashboard
```
