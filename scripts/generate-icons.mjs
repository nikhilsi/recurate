/**
 * Generate PNG icons from the master SVG at all required sizes.
 *
 * Usage: node scripts/generate-icons.mjs
 * Requires: npm install sharp (run from repo root)
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const svgPath = join(root, 'docs/assets/images/recurate-icon.svg');
const svg = readFileSync(svgPath);

const outputs = [
  // Chrome extension icons
  { path: join(root, 'extensions/chrome/public/icons/icon-16.png'), size: 16 },
  { path: join(root, 'extensions/chrome/public/icons/icon-32.png'), size: 32 },
  { path: join(root, 'extensions/chrome/public/icons/icon-48.png'), size: 48 },
  { path: join(root, 'extensions/chrome/public/icons/icon-128.png'), size: 128 },

  // VS Code extension icon
  { path: join(root, 'extensions/vscode/icon.png'), size: 128 },

  // Site favicon
  { path: join(root, 'docs/assets/images/recurate-icon.png'), size: 32 },
];

console.log('Generating icons from:', svgPath);
console.log('');

for (const { path: outPath, size } of outputs) {
  mkdirSync(dirname(outPath), { recursive: true });
  await sharp(svg).resize(size, size).png().toFile(outPath);
  console.log(`  ${size}x${size} → ${outPath.replace(root + '/', '')}`);
}

console.log('\nDone. All icons generated.');
