# Chrome Web Store Listing — Recurate Connect

Copy-paste these into the Chrome Web Store developer dashboard.

---

## Store Listing Tab

### Short Description (132 chars max)

Connect two Claude.ai chats with one-click context sharing. Share messages between specialist chats without copy-paste.

### Manifest Description (132 chars max)

Connect your Claude.ai chats. Share context between tabs with one click. Command palette: \rc to share, \rcp to pop out.

### Detailed Description

THE PROBLEM

Power users run multiple Claude.ai chats in parallel, each with its own role. One chat handles strategy, another handles writing, a third handles research. When one chat produces an insight the other needs, you copy the text, switch tabs, paste it, add context, and send. For every single message. All day.

THE SOLUTION

Recurate Connect links two Claude.ai chat tabs with one-click context sharing. Click the share button on any message, or type \rc in the input box, and the last exchange (your prompt + Claude's response) lands in the other chat and sends automatically. No copy-paste, no tab switching, no friction.

A shared space sidebar shows everything that's been shared between your chats. Pop it out into its own window and drag it to a second monitor for a full command center view.

HOW IT WORKS

1. Open two Claude.ai chats in separate tabs
2. The extension auto-discovers both chats by name
3. Share messages using either method:
   - Click the share icon in the message action bar
   - Type \rc in the input box and hit Enter
4. The message appears in the other chat and sends automatically
5. Open the shared space sidebar to see your cross-chat history

COMMAND PALETTE

Type these commands in the input box and press Enter. The extension intercepts them before Claude sees them.

\rc — Share the last exchange to the other chat
\rcp — Pop out the shared space into a separate window
\rcc — Clear all shared messages

WHY TWO TABS

Each Claude.ai chat carries its own memory, project context, custom instructions, and conversation history. A strategy chat knows your roadmap. A writing chat knows your manuscript. Connect coordinates between these specialists without losing what makes each one valuable.

PRIVACY

- No backend. No API keys. No data collection.
- Messages stay in your browser (chrome.storage.local).
- No permissions beyond host access to claude.ai and storage.
- Open source: github.com/nikhilsi/recurate

Free forever. Part of the Recurate family: Compose, Annotate, Copy, Connect.

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

Connects two Claude.ai chat tabs for one-click context sharing. Shares messages between tabs via a shared space managed by the extension.

### Permission Justifications

**Host permissions**: Content script runs on claude.ai to read chat names, extract messages for sharing, and inject shared context into the chat input. No data is sent externally.

**Storage**: Stores shared messages locally (chrome.storage.local) so they persist across page reloads. Also uses chrome.storage.session for tab registration that survives service worker hibernation.

**Remote code**: This extension does not use remote code. All JavaScript is bundled locally in the extension package.

### Data Use Certification

Check the compliance checkbox. The extension collects no user data, transmits nothing externally, and runs entirely client-side.

---

## Build & Submit

```bash
cd extensions/connect
npm run build
cd .output/chrome-mv3 && zip -r ../../recurate-connect-0.1.0.zip .

# Upload recurate-connect-0.1.0.zip to Chrome Web Store Developer Dashboard
```

---

## Screenshot Recommendations

Chrome Web Store requires 1-5 screenshots at 1280x800 or 640x400.

**Screenshot 1: Two chats side by side with shared message**
Show Boss HQ and Book HQ side by side. A shared message visible in Book HQ's input with the "[From Boss HQ]:" attribution. Both sidebar toggles visible showing "1 connected".

**Screenshot 2: Shared space sidebar**
Show the sidebar expanded with 2-3 shared entries, the "Recurate Connect" header, and the connected tab name.

**Screenshot 3: Pop-out window**
Show the pop-out shared space window on a second monitor or overlapping the chat, with full-width entries visible.

Sizing: capture at 2560x1600 (Retina) and resize to 1280x800 for upload.
