# Doc Update Checklist

When publishing a new version, adding a platform, or making a significant change, review these files:

---

## Every Release

- [ ] **CHANGELOG.md** — New version entry with Added/Fixed/Changed sections
- [ ] **CURRENT_STATE.md** — Version numbers, feature list, "What Exists" section
- [ ] **NOW.md** — Mark completed items, add new items, update date

## New Platform Added (Chrome Extension)

- [ ] **CURRENT_STATE.md** — Platform count, supported platforms list
- [ ] **README.md** — Platform mentions in Chrome Extension section (line ~38)
- [ ] **docs/index.md** — Chrome Extension description (line ~30)
- [ ] **docs/design.md** — Section 3.2 supported platforms table
- [ ] **docs/extension-architecture.md** — Platform list in overview, add new platform integration section
- [ ] **docs/product_brief.md** — Platform list in Phase 0 section
- [ ] **extensions/chrome/STORE_LISTING.md** — Short/detailed descriptions, manifest description
- [ ] **extensions/chrome/wxt.config.ts** — Manifest description if platform count changes
- [ ] **Blog post** — Consider announcing

## New Blog Post Published

- [ ] **README.md** — Add link in Documentation section
- [ ] **docs/index.md** — Add button link at bottom
- [ ] **CURRENT_STATE.md** — Blog article count, article reference in Documentation section
- [ ] **NOW.md** — Mark as done

## VS Code Extension Version Bump

- [ ] **extensions/vscode/package.json** — Version number
- [ ] **CURRENT_STATE.md** — Version reference
- [ ] **NOW.md** — Quick Reference install command filename
- [ ] Publish to VS Code Marketplace (`npx @vscode/vsce publish`)
- [ ] Publish to Open VSX (`npx ovsx publish <vsix> -p <token>`)

## Chrome Extension (Annotator) Version Bump

- [ ] **extensions/chrome/wxt.config.ts** — Version in manifest
- [ ] **extensions/chrome/package.json** — Version number
- [ ] **CURRENT_STATE.md** — Version reference, build size if changed
- [ ] **extensions/chrome/STORE_LISTING.md** — Zip filename
- [ ] Upload new zip to Chrome Web Store Developer Dashboard

## Composer Version Bump

- [ ] **extensions/markdown-toolbar/manifest.json** — Version number
- [ ] **CURRENT_STATE.md** — Version reference
- [ ] **extensions/markdown-toolbar/STORE_LISTING.md** — Zip filename
- [ ] Rebuild zip: `cd extensions/markdown-toolbar && zip -r recurate-composer-<version>.zip manifest.json content.js icon-*.png`
- [ ] Upload zip to Chrome Web Store Developer Dashboard

## Site Changes (recurate.ai)

- [ ] **mkdocs.yml** — Nav entries if new pages added
- [ ] **docs/overrides/main.html** — OG meta tags if description changes
- [ ] Verify GitHub Pages build succeeds after push
