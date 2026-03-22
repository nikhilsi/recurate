# Full Claude Chat Export — Feature Plan

**Status:** Built and tested (v0.2.0)
**Date:** March 22, 2026
**Author:** Nikhil Singhal + Claude Code

---

## The Problem

When exporting a Claude.ai conversation, the current Copier extension captures only the chat messages (user prompts + AI responses). But Claude conversations often include **artifacts** — documents, code files, presentations, and other generated content. These artifacts are a critical part of the conversation output. Exporting without them gives you an incomplete record.

Additionally, users upload files to Claude (PDFs, images, text files) that provide context for the conversation. Without these, the exported conversation references attachments that don't exist in the export.

Currently, Claude has a "Download all" button for artifacts, but it:
- Downloads artifacts disconnected from the conversation
- Gives you a ZIP of files with no context about which message produced which artifact
- Requires manual effort to associate artifacts with the conversation

**Goal:** One click, complete archive. The conversation AND all its artifacts in a single download.

---

## What We Learned (API Investigation)

Investigation conducted on March 22, 2026 by intercepting Claude.ai network requests.

### API Endpoints (all authenticated via session cookies, no API keys needed)

**1. Get organization ID:**
```
GET /api/organizations
Returns: [{uuid: "5bea4f9d-...", name: "Nikhil Singhal", ...}]
```
The extension runs on claude.ai, so it has the session cookies. First element's `uuid` is the org ID.

**2. List all files in a conversation:**
```
GET /api/organizations/{orgId}/conversations/{chatId}/wiggle/list-files?prefix=
Returns: {success: true, files: ["/mnt/user-data/uploads/...", "/mnt/user-data/outputs/..."]}
```
Files are separated by path prefix:
- `/mnt/user-data/uploads/` — files the user uploaded to Claude (PDFs, images, text, etc.)
- `/mnt/user-data/outputs/` — artifacts Claude generated (MD, code, DOCX, PPTX, etc.)

**3. Download a single file:**
```
GET /api/organizations/{orgId}/conversations/{chatId}/wiggle/download-file?path={urlEncodedPath}
Returns: The raw file content (binary or text)
```
The `path` parameter is URL-encoded, e.g., `%2Fmnt%2Fuser-data%2Foutputs%2Fch02-a-ball-on-a-screen.md`

### Key Observations

- The `chatId` is available from the URL: `claude.ai/chat/{chatId}`
- The `orgId` requires one API call to `/api/organizations`
- All endpoints use the same session authentication (cookies)
- The `list-files` endpoint returns ALL files (uploads + outputs) in one call
- File downloads are individual (one request per file)
- In a test conversation with 52 artifacts and 18 uploads (70 total files), all APIs responded successfully
- No rate limiting observed on these endpoints

### DOM Structure for Artifacts

Artifacts in the conversation DOM are rendered as `.artifact-block-cell` elements with:
- Artifact name (e.g., "Ch01 paper reams v5")
- Type badge (e.g., "Document")
- Format indicator (e.g., "MD")
- Individual Download button
- The parent element has `role="button"` (clickable to open in artifact panel)

The "Download all" button exists in the artifacts sidebar panel.

---

## Design

### User Flow

**Current behavior (no artifacts):** User clicks Download button. Gets a single HTML file with the conversation.

**New behavior (with artifacts):** User clicks Download button.
1. Extension detects this is claude.ai (artifacts are Claude-only)
2. Calls `list-files` API to check for artifacts
3. If no artifacts: same as current behavior (single HTML file)
4. If artifacts exist:
   - Shows a brief "Exporting conversation + {N} files..." toast
   - Downloads all artifact files via the API
   - Builds a ZIP containing:
     ```
     recurate-export-{slug}-{date}/
     ├── conversation.html        (styled conversation with artifact manifest)
     ├── artifacts/               (Claude-generated files)
     │   ├── ch01-paper-reams.md
     │   ├── presentation.pptx
     │   └── ...
     └── uploads/                 (user-uploaded files)
         ├── research-paper.pdf
         ├── screenshot.png
         └── ...
     ```
   - The HTML file includes an "Artifacts" section at the end listing all files with relative links to `artifacts/filename` and `uploads/filename`
   - Triggers browser download of the ZIP

### HTML Artifact Manifest

The conversation HTML includes a new section at the bottom:

```html
<div class="artifacts-section">
  <h2>Artifacts</h2>
  <p>Claude generated 51 artifacts during this conversation:</p>
  <ul>
    <li><a href="artifacts/ch01-paper-reams.md">ch01-paper-reams.md</a> (Document, MD)</li>
    <li><a href="artifacts/presentation.pptx">presentation.pptx</a> (Presentation, PPTX)</li>
    ...
  </ul>

  <h2>Uploaded Files</h2>
  <p>18 files were uploaded during this conversation:</p>
  <ul>
    <li><a href="uploads/research-paper.pdf">research-paper.pdf</a></li>
    <li><a href="uploads/screenshot.png">screenshot.png</a></li>
    ...
  </ul>
</div>
```

When opened from the ZIP, the links work because the files are in the same folder structure.

### Dependencies

**JSZip** — lightweight ZIP library (~100KB minified). Needed to create ZIP files in the browser. No server-side processing.

Options for including JSZip:
- **Bundle it** — include the minified JS in the extension. Adds ~100KB to the extension size.
- **Load from CDN** — not an option for extensions (CSP restrictions).

Recommendation: Bundle it. The Copier is currently ~32KB. Adding JSZip brings it to ~132KB. Still small.

### Platform Scope

- **Claude.ai only** — this feature uses Claude's internal API. Other platforms (ChatGPT, Grok, etc.) don't have the same artifact system.
- **Other platforms** — continue to work as they do today (HTML file only, no artifact export).
- The existing platform detection in the Copier already handles this. The artifact export code only runs when `getPlatform() === 'claude'`.

---

## Implementation Plan

### Phase 1: Core ZIP Export

1. **Add JSZip dependency** — bundle the minified JS or install via npm. But Copier is vanilla JS with no build step. Options:
   - Copy JSZip minified source into the extension directory
   - OR convert Copier to a build step (WXT like Connect). This is a bigger change.
   - Recommendation: Copy JSZip minified source. Keep Copier as vanilla JS.

2. **Add API helper functions:**
   - `getOrgId()` — calls `/api/organizations`, returns first org UUID
   - `listFiles(orgId, chatId)` — calls `wiggle/list-files`, returns file list
   - `downloadFile(orgId, chatId, path)` — calls `wiggle/download-file`, returns blob

3. **Modify `downloadHTML()` function:**
   - After extracting conversation, check platform
   - If Claude: call `listFiles()` to check for artifacts
   - If artifacts exist: download all files, build ZIP, trigger ZIP download
   - If no artifacts: current behavior (single HTML)

4. **Update `toHTML()` function:**
   - Accept optional artifact/upload file lists
   - If present, append the artifact manifest section to the HTML

5. **Progress modal (not toast):**
   - Semi-transparent overlay blocks the page during export
   - Centered modal with spinner, title ("Exporting conversation"), status text, progress bar, file count
   - Progress bar fills as files download
   - Cannot be dismissed until complete (prevents user from interfering)
   - On completion: checkmark icon, "Export complete", auto-dismisses after 2.5 seconds
   - On failure: X icon, error message, auto-dismisses, falls back to simple HTML download

### Phase 2: Polish

- Handle download failures gracefully (skip failed files, note in manifest)
- Handle large binary files (images, PPTX) — stream to ZIP without loading full content in memory
- Test with large conversations (1.4GB+ like Urmila's)
- Test with various artifact types (MD, DOCX, PPTX, images, code)

---

## Decisions (March 22, 2026)

1. **User uploads:** Include everything (images, PDFs, text files). The goal is a complete archive.
2. **Naming conflicts:** If multiple files have the same name, append a counter (`filename-2.md`). API paths already include version info (`ch01-paper-reams-V5.md`) so most are naturally unique.
3. **Download button:** Same button, smarter behavior. One button, detects artifacts automatically.
4. **Progress feedback:** Toast message updates as files download ("Downloading 23 of 51..."). No progress bar needed.
5. **Build approach:** Full feature in one pass. No intermediate versions.

## Inline Artifact Links (Point 2)

When Claude presents an artifact inline in a response (e.g., "Ch02.5 a note from claude / Document / MD / Download"), the exported HTML should show a clickable link to the actual file in the `artifacts/` folder at that exact position in the conversation.

### DOM-to-File Matching

The artifact block in the DOM has `aria-label="Open artifact: Ch01 paper reams"`. The API file path is `/mnt/user-data/outputs/ch01-paper-reams-V5.md`. Matching approach:

1. Extract artifact name from DOM (`aria-label` on parent of `.artifact-block-cell`)
2. Slugify the name: "Ch01 paper reams" becomes `ch01-paper-reams`
3. Find matching files in the API file list by prefix match
4. If multiple versions exist, link to the latest (highest version number)
5. Replace the artifact block in the cloned DOM with a styled link to `artifacts/filename`

### HTML Output (inline)

Where Claude presented an artifact, the exported HTML shows:
```html
<div class="artifact-link">
  <a href="artifacts/ch01-paper-reams-V5.md">Ch01 paper reams</a>
  <span class="artifact-type">Document, MD</span>
</div>
```

The full manifest at the bottom still lists ALL artifacts and uploads with links.

---

## Files to Modify

| File | Change |
|------|--------|
| `extensions/conversation-copier/content.js` | Add API helpers, modify downloadHTML, update toHTML |
| `extensions/conversation-copier/manifest.json` | No change needed (already has claude.ai host permission) |
| `extensions/conversation-copier/jszip.min.js` | New file — bundled JSZip library |

---

## Testing Plan

1. **Conversation with MD artifacts** — verify MD files download correctly and are readable
2. **Conversation with binary artifacts** (DOCX, PPTX) — verify binary files are intact in ZIP
3. **Conversation with uploaded images** — verify images download and display correctly
4. **Conversation with no artifacts** — verify current behavior unchanged (single HTML)
5. **Large conversation** (600+ messages, 50+ artifacts) — verify performance and memory
6. **Non-Claude platforms** — verify ChatGPT, Grok, etc. still work as before (HTML only)
7. **ZIP structure** — verify relative links in HTML work when opened from extracted ZIP
