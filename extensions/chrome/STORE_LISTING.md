# Chrome Web Store Listing

Copy-paste these into the Chrome Web Store developer dashboard.

---

## Store Listing Tab

### Short Description (132 chars max)

Annotate AI responses on Claude and ChatGPT — highlight, strikethrough, dig deeper, verify. Feedback auto-injects. No typing needed.

### Manifest Description (132 chars max)

Annotate AI responses on Claude and ChatGPT. Highlight, strikethrough, dig deeper, verify — feedback auto-injects.

### Detailed Description

THE PROBLEM

Every AI chat gives you a text box as the only way to respond. When the AI gives a long response and you agree with half and disagree with half, your only option is to type a paragraph explaining that. Most people don't bother. The conversation drifts.

THE SOLUTION

Recurate adds annotation tools to AI conversations. A side panel mirrors the AI's latest response, and you can annotate what matters and what doesn't.

- Highlight (green) = "This is valuable. Keep going here."
- Strikethrough (red) = "This is wrong. Drop it."
- Dig deeper (blue) = "Elaborate on this. I want more detail."
- Verify (amber) = "Fact-check this. I'm not sure it's right."

Annotations are automatically injected into the chat's text box as structured feedback (KEEP/DROP/EXPLORE DEEPER/VERIFY). When you send your next message, the AI knows exactly what you valued, what you didn't, and what you want explored or verified.

HOW IT WORKS

1. Click the Recurate icon to open the side panel
2. Chat with the AI as usual
3. When the AI responds, the side panel shows the response
4. Select text and use the floating toolbar to highlight, strikethrough, dig deeper, or verify
5. Your annotations appear in the text box automatically
6. Type your next question below the feedback and send

WHY THIS MATTERS

Annotations compound. Turn 2 annotations make turn 3 better. By turn 5, the conversation is precisely tuned to what you care about — in a way that text-only conversations never achieve.

You become the curator of the conversation's memory, not a passenger.

SUPPORTED PLATFORMS

- claude.ai (Anthropic's Claude)
- chat.com / chatgpt.com (OpenAI's ChatGPT)

PRIVACY

- No backend. No API keys. No data collection.
- Runs entirely in your browser.
- Only needs "sidePanel" and "activeTab" permissions.
- Open source: github.com/nikhilsi/recurate

Free forever. Install and your conversations immediately get better.

### Additional Fields

- **Category**: Tools (under Productivity)
- **Language**: English
- **Homepage URL**: https://recurate.ai
- **Support URL**: https://github.com/nikhilsi/recurate/issues
- **Mature content**: No

### Assets

- **Store icon**: `public/icons/icon-128.png` (128x128)
- **Screenshots**: `screenshot-1.png` and `screenshot-2.png` (1280x800)

---

## Privacy Practices Tab

### Single Purpose Description

Annotate AI chat responses with highlight, strikethrough, dig deeper, and verify gestures to give the AI structured feedback.

### Permission Justifications

**activeTab**: Reads the AI's latest response text from the active tab (claude.ai or chat.com) and injects structured annotation feedback into the page's text input field. No data is sent externally.

**sidePanel**: Displays the annotation UI in Chrome's side panel where users can highlight, strikethrough, dig deeper, or verify portions of the AI's response.

**Host permissions**: Content scripts run on claude.ai and chat.com to extract AI response text and inject annotation feedback into the chat input. No other sites are accessed.

**Remote code**: This extension does not use remote code. All JavaScript is bundled locally in the extension package.

### Data Use Certification

Check the compliance checkbox. The extension collects no user data, transmits nothing externally, and runs entirely client-side.

---

## Build & Submit

```bash
# Build production ZIP
cd extensions/chrome
npm run build
cd .output/chrome-mv3 && zip -r ../../recurate-chrome-v0.1.0.zip .

# Upload recurate-chrome-v0.1.0.zip to Chrome Web Store Developer Dashboard
```
