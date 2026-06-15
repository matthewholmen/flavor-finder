#!/usr/bin/env node
// tooling/pairing-pipeline/normalize.mjs
//
// One-off data hygiene: removes duplicate ingredient profiles and merges variant spellings
// into a single canonical name across both data files. Preserves all surrounding code
// (imports, types, the legacy createFlavorMap in flavorPairings.ts).
//
// After running, re-mine + re-merge so pairingMeta is keyed consistently.
//
// Usage: node normalize.mjs [--dry-run]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..', '..');
const DRY = process.argv.includes('--dry-run');

// non-canonical variant -> canonical (keep the higher-edge / better-categorized name)
const VARIANT = {
  'pea': 'peas',
  'kidney bean': 'kidney beans',
  'guajillo chili': 'guajillo',
  'bonito flake': 'bonito flakes',
  'fresh fig': 'fig',
  'chili': 'chili pepper',
};

// ---------- 1. flavorPairings.ts: remap names in pair strings, drop self-pairs, dedupe ----------
const fpPath = path.join(REPO, 'src', 'data', 'flavorPairings.ts');
let fp = fs.readFileSync(fpPath, 'utf8');
const arrStart = fp.indexOf('[', fp.indexOf('flavorPairings='));
let depth = 0, arrEnd = -1;
for (let i = arrStart; i < fp.length; i++) {
  if (fp[i] === '[') depth++;
  else if (fp[i] === ']') { depth--; if (depth === 0) { arrEnd = i; break; } }
}
const fpBefore = fp.slice(0, arrStart + 1);
const fpBody = fp.slice(arrStart + 1, arrEnd);
const fpAfter = fp.slice(arrEnd); // ']' + legacy createFlavorMap

const seenPairs = new Set();
let remapped = 0, selfDropped = 0, dupDropped = 0;
for (const m of fpBody.matchAll(/"([^"]+),([^"]+)"/g)) {
  let a = VARIANT[m[1]] || m[1];
  let b = VARIANT[m[2]] || m[2];
  if (VARIANT[m[1]] || VARIANT[m[2]]) remapped++;
  if (a === b) { selfDropped++; continue; }
  const key = a <= b ? `${a},${b}` : `${b},${a}`;
  if (seenPairs.has(key)) { dupDropped++; continue; }
  seenPairs.add(key);
}
const fpEntries = [...seenPairs].map((p) => `  "${p}",`).join('\n');
const fpNext = `${fpBefore}\n${fpEntries}\n${fpAfter}`;

// ---------- 2. ingredientProfiles.ts: drop exact-dup names + non-canonical variant profiles ----------
const ipPath = path.join(REPO, 'src', 'data', 'ingredientProfiles.ts');
let ip = fs.readFileSync(ipPath, 'utf8');
const ipStart = ip.indexOf('= [', ip.indexOf('ingredientProfiles')) + 2; // skip the IngredientProfile[] type
depth = 0; let ipEnd = -1;
for (let i = ipStart; i < ip.length; i++) {
  if (ip[i] === '[') depth++;
  else if (ip[i] === ']') { depth--; if (depth === 0) { ipEnd = i; break; } }
}
const ipBefore = ip.slice(0, ipStart + 1);
const ipBody = ip.slice(ipStart + 1, ipEnd);
const ipAfter = ip.slice(ipEnd); // ']' + ';'

// Split the array body into top-level { ... } object blocks by brace counting.
const blocks = [];
let bd = 0, blockStart = -1;
for (let i = 0; i < ipBody.length; i++) {
  const c = ipBody[i];
  if (c === '{') { if (bd === 0) blockStart = i; bd++; }
  else if (c === '}') { bd--; if (bd === 0) blocks.push(ipBody.slice(blockStart, i + 1)); }
}

const seenNames = new Set();
let exactDropped = 0, variantDropped = 0;
const keptBlocks = [];
for (const block of blocks) {
  const nm = block.match(/name:\s*"([^"]+)"/);
  const name = nm ? nm[1] : null;
  if (name && VARIANT[name]) { variantDropped++; continue; }   // merged away
  if (name && seenNames.has(name)) { exactDropped++; continue; } // exact dup, keep first
  if (name) seenNames.add(name);
  keptBlocks.push(block);
}
const ipNext = `${ipBefore}\n  ${keptBlocks.join(',\n  ')}\n${ipAfter}`;

// ---------- report / write ----------
console.log('flavorPairings.ts:');
console.log(`  pairs remapped: ${remapped} | self-pairs dropped: ${selfDropped} | dupes dropped: ${dupDropped} | final: ${seenPairs.size}`);
console.log('ingredientProfiles.ts:');
console.log(`  blocks: ${blocks.length} | exact-dup removed: ${exactDropped} | variant removed: ${variantDropped} | final: ${keptBlocks.length}`);

if (DRY) {
  console.log('--dry-run: nothing written.');
} else {
  fs.writeFileSync(fpPath, fpNext);
  fs.writeFileSync(ipPath, ipNext);
  console.log('Wrote both files.');
}
