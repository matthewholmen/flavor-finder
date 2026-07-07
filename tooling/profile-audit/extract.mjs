#!/usr/bin/env node
// Extracts the ingredient profiles from src/data/ingredientProfiles.ts into
// plain JSON for the audit pass. Writes:
//   work/profiles.json — full structured dump (check.mjs / merge.mjs read this)
//   work/profiles.txt  — compact one-line-per-ingredient view for batch review

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'src', 'data', 'ingredientProfiles.ts');
const WORK = join(dirname(fileURLToPath(import.meta.url)), 'work');

const source = readFileSync(SRC, 'utf8');
const start = source.indexOf('[', source.indexOf('ingredientProfiles'));
const end = source.lastIndexOf(']');
if (start === -1 || end === -1) throw new Error('Could not locate the profiles array literal');

// The array is a plain data literal (no TS syntax inside), so evaluate it directly.
const profiles = new Function(`return ${source.slice(start, end + 1)}`)();
if (!Array.isArray(profiles) || profiles.length === 0) throw new Error('Parsed no profiles');

const names = new Set();
for (const p of profiles) {
  if (!p.name || !p.category || !p.flavorProfile) throw new Error(`Malformed profile: ${JSON.stringify(p).slice(0, 80)}`);
  if (names.has(p.name)) throw new Error(`Duplicate profile name: ${p.name}`);
  names.add(p.name);
}

mkdirSync(WORK, { recursive: true });
writeFileSync(join(WORK, 'profiles.json'), JSON.stringify(profiles, null, 1));

const DIMS = ['sweet', 'salty', 'sour', 'umami', 'fat', 'spicy', 'aromatic'];
const lines = profiles.map((p) => {
  const t = DIMS.map((d) => `${d.slice(0, 2)}${p.flavorProfile[d] ?? 0}`).join(' ');
  return `${p.name} | ${p.category}/${p.subcategory} | ${t} | ${p.description}`;
});
writeFileSync(join(WORK, 'profiles.txt'), lines.join('\n') + '\n');

console.log(`Extracted ${profiles.length} profiles → work/profiles.json, work/profiles.txt`);
