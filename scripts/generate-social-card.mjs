/**
 * Generate social card PNG from SVG.
 * Usage: node scripts/generate-social-card.mjs
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const svgPath = join(root, 'docs/assets/images/recurate-social-card.svg');
const outPath = join(root, 'docs/assets/images/recurate-social-card.png');

const svg = readFileSync(svgPath);

await sharp(svg, { density: 150 })
  .resize(1200, 630)
  .png()
  .toFile(outPath);

console.log(`Social card generated: ${outPath.replace(root + '/', '')}`);
