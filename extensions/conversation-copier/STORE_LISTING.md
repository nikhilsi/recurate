# Chrome Web Store Listing: Recurate Copier 1.0.0

Text to paste into the Chrome Web Store developer dashboard, plus the 1.0 release notes and the build command.

---

## Store Listing Tab

### Summary

The store shows the manifest description as the summary (132 characters at most). It is already in `manifest.json`:

Export complete AI conversations as Markdown with tool steps, sources and files. Claude, ChatGPT, Grok, Gemini, Copilot.

### Detailed Description

WHAT IT DOES

Recurate Copier saves a whole AI conversation as Markdown: your messages, the replies, thinking summaries, tool steps, sources and files. It works on Claude, ChatGPT, Grok, Gemini and Microsoft Copilot.

Three buttons:

Copy puts the conversation on your clipboard.
Download saves it as a Markdown file.
Export saves a ZIP with the Markdown and the chat's files. Your uploads go in one folder and the files the AI made go in another.

On Claude the buttons sit in the message toolbar. On the other sites they float at the bottom right. The toolbar icon opens the same three actions (Alt+Shift+C). It also works on tabs that were open before you installed or updated Copier.

COMPLETE, OR IT SAYS WHY NOT

Copier reads the conversation from the site's own data instead of copying what is on screen. Long chats come out whole.

Every export starts with a short header. It gives the message count and says whether the export is complete. It lists which files downloaded and which failed, with the reason. Anything the site does not provide is named there too.

Copilot keeps no conversation data the page can read. There Copier scrolls through the chat and collects each message. It then checks the count against the total Copilot shows.

WHAT AN EXPORT HOLDS

Numbered messages with the date and time.
Thinking summaries as quotes, and the full thinking where the site provides it.
Tool steps such as web searches and code runs, each in a collapsible block.
Sources as numbered links after each reply.
Images and files as links into the ZIP.
The version on screen when a chat has edited or regenerated replies.

PRIVACY

No backend, no account, no analytics. Copier runs in your browser.
Requests go only to the site you are on, with your own signed-in session.
Nothing is sent anywhere else. Copies go to your clipboard and downloads go to your computer.
Open source: github.com/nikhilsi/recurate

NOT YET TESTED

Copier 1.0 was tested on personal accounts. Team and workspace accounts and very long Copilot and Grok chats have not been tested yet. Report problems at github.com/nikhilsi/recurate/issues.

### Additional Fields

- **Category**: Tools (under Productivity)
- **Language**: English
- **Homepage URL**: https://recurate.ai
- **Support URL**: https://github.com/nikhilsi/recurate/issues
- **Mature content**: No

### Assets

- **Store icon**: `icon-128.png` (128x128)
- **Screenshots** (1280x800 JPEG, upload in this order; they replace all earlier screenshots):
  1. `screenshot-1.0-1.jpg`: Copier's three buttons in Claude's message toolbar, with a label.
  2. `screenshot-1.0-2.jpg`: an Export in progress on ChatGPT ("Downloading files: 6 of 58", Cancel), with the floating buttons at the bottom right.
  3. `screenshot-1.0-3.jpg`: the start of a downloaded Markdown file: the header with the completeness lines, then the first messages. One personal name is covered.

---

## Privacy Practices Tab

### Single Purpose Description

Exports the AI conversation open in the current tab as Markdown: copied to the clipboard, saved as a file, or saved as a ZIP with the chat's files.

### Permission Justifications

**activeTab**: When the user clicks the toolbar icon, Copier works on the current tab only. This lets the popup export from a tab that was open before Copier was installed or updated, and from Microsoft Copilot's copilot.cloud.microsoft address, without access to any other site.

**scripting**: Used with activeTab to load Copier's own bundled scripts into the current tab after the user clicks the toolbar icon, and only when that tab is a supported conversation page. No remote code is loaded.

**Host permissions** (content script): Copier runs on claude.ai, chatgpt.com, chat.openai.com, grok.com, gemini.google.com and m365.cloud.microsoft. On each it adds the export buttons and reads the open conversation through the site's own data, using the user's own signed-in session. It downloads the chat's files from the same site. Requests go only to that site. Nothing leaves the browser: copies go to the clipboard and downloads go to the user's computer. Version 1.0 removes two hosts that 0.4.0 had (www.google.com and copilot.microsoft.com) and adds none.

**Remote code**: No. All JavaScript, including the JSZip and Turndown libraries, is bundled in the package.

### Data Use Certification

Copier collects no user data. Conversations are read and written inside the browser and never sent to the developer or any third party. Check the compliance boxes.

---

## Release Notes: 1.0.0

Copier 1.0 is a rebuild. Version 0.4.0 copied what was on screen, and a check on November 15, 2026 found every site broken or partial: ChatGPT exported nothing, Grok dropped the user's messages, Gemini mislabeled roles and stopped at the latest 10 turns, Copilot got only the visible part, and Claude exports dropped tools, sources, images and files.

**New**
- Reads each site's own conversation data on Claude, ChatGPT, Grok and Gemini. Copilot is collected by scrolling and checked against the total the page shows.
- Every export starts with a completeness header: messages, files downloaded and failed (each with its reason), notes, and what is not included.
- Copy, Download and Export on all five sites. Export is a ZIP with `conversation.md`, `uploads/` and `artifacts/`.
- Thinking, tool steps, sources, images and files, as far as each site provides them.
- The branch on screen is exported when a chat has edited or regenerated replies (Claude and ChatGPT compare the screen with the data).
- A toolbar popup with the same three actions (Alt+Shift+C). It works on tabs opened before an update and on copilot.cloud.microsoft.
- A progress window with Cancel for long exports. One export runs at a time per page.
- Copilot work and personal accounts on m365.cloud.microsoft.

**Removed**
- The HTML download. Markdown is the one format.
- Google AI Mode (unreachable since July: Chrome moved it to a page extensions cannot run on).
- copilot.microsoft.com (it redirects to copilot.com, where the content script never ran). The popup covers the new Copilot addresses.
- The in-page keyboard shortcuts. Control+Shift+D was ChatGPT's dictation key. The popup shortcut replaces them and can be changed at chrome://extensions/shortcuts.

**Permissions**: adds activeTab and scripting (no install warning for either) and removes two hosts. Existing users are not asked to approve anything new.

**Not tested** (no such account or chat was available):
- ChatGPT workspace, project and custom GPT chats; switching ChatGPT versions with its arrows.
- A second Google account, a Workspace account, a Gem, Gemini generated images, Gemini chats over 100 turns, Gemini drafts.
- Long Grok chats, Grok web search and X posts, Grok branches.
- Copilot chats of 100 or more messages, Copilot tables, Cancel while Copilot is scrolling, a personal Copilot account that stays on copilot.com.
- A Claude account with two chat organizations; Claude citations next to emoji.
- A reply still being written at export time.
- The popup's Cancel while it is still connecting.

---

## Build & Submit

```bash
# Plain JS, no build step. From the Copier folder:
cd extensions/conversation-copier
rm -f recurate-copier-1.0.0.zip
zip -r -X recurate-copier-1.0.0.zip manifest.json content.js core lib platforms popup \
  icon-16.png icon-32.png icon-48.png icon-128.png -x '*.DS_Store'

# Upload recurate-copier-1.0.0.zip in the Chrome Web Store developer dashboard
# (Package tab, upload new package), then update the Privacy tab for the two
# new permissions and replace the screenshots.
```

The same file list is in `.github/workflows/build-extensions.yml`. `test/manifest.test.mjs` fails if either list misses a file the manifest or the popup loads.
