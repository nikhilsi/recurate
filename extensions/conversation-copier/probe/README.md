# Copier probe

A read-only check of what each chat site loads behind the page. Rerun it when an export looks wrong or a site ships a change, and compare with the last saved result.

It reads, never writes. It reports counts, field names and types only: no message text, titles, ids or tokens.

---

## How to run

1. Open a conversation on the site (a long one with tools, files or branches shows the most).
2. Run `probe.js` in the page context:
   - **Claude in Chrome:** pass the file's contents to the JavaScript tool, then run `await recurateProbe()`.
   - **By hand:** paste the file into the DevTools console, then run `await recurateProbe()`.
3. For test fixtures, run `await recurateProbe({ skeleton: true })`. The skeleton lists key paths and types, never values.

Supported pages: claude.ai, chatgpt.com, grok.com, gemini.google.com, and Microsoft Copilot (m365.cloud.microsoft, copilot.cloud.microsoft, copilot.com).

---

## What it checks

- **Claude:** active branch length, root reached, branch points, block types, tool-result part types, citations (and any after an emoji), thinking with text or summary only, file kinds, pasted-text attachments, compaction summaries, unpaired tool calls.
- **ChatGPT:** active branch, root reached, branch points, role, recipient and content-type combinations, hidden nodes, reference types, whether reference offsets match by code point or by UTF-16 unit, leftover private-use markers.
- **Grok:** nodes, roots, leaves, whether the URL's `rid` names a leaf, which response fields carry values.
- **Gemini:** request parameters found, pages and turns with a page size of 10, unique turns, the id-prefix guard, candidates per turn, answer text parts, which candidate slots carry values, turns on the page.
- **Copilot:** messages on the page, labeled and unlabeled positions, set sizes, tables (and header cells), code blocks, links and images in answers.

Every report also lists the vocabulary seen (`type`, `content_type`, `role`, `sender` and similar values), which is site schema, not chat content.

---

## Saved results

`../test/skeletons/` holds the skeleton from each platform's last run. The test fixtures are written to match them.
