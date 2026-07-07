#!/usr/bin/env node
// Applies REVIEWED taste flags from proposals/*.json to src/data/ingredientProfiles.ts.
// Separate from merge.mjs on purpose: taste values are behavior changes (filters, slot
// roles), so they only get applied after explicit human approval of the audit report.
//
// Safety: each flag's `current` value must still match the file, so a re-run is a no-op
// (nothing matches) and a stale flag can never clobber a newer hand edit.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TASTE_DIMS } from './vocab.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TARGET = join(HERE, '..', '..', 'src', 'data', 'ingredientProfiles.ts');

const flags = [];
for (const file of readdirSync(join(HERE, 'proposals')).filter((f) => f.endsWith('.json')).sort()) {
  for (const e of JSON.parse(readFileSync(join(HERE, 'proposals', file), 'utf8'))) {
    for (const flag of e.tasteFlags ?? []) flags.push({ name: e.name, ...flag });
  }
}

const lines = readFileSync(TARGET, 'utf8').split('\n');
let currentName = null;
let applied = 0;
let skipped = 0;

for (let i = 0; i < lines.length; i++) {
  const nameMatch = lines[i].match(/^\s*name: "((?:[^"\\]|\\.)*)"/);
  if (nameMatch) currentName = nameMatch[1];
  if (!currentName) continue;

  for (const flag of flags) {
    if (flag.name !== currentName || !TASTE_DIMS.includes(flag.dim)) continue;
    const dimMatch = lines[i].match(new RegExp(`^(\\s*)${flag.dim}: (\\d+)(,?)\\s*$`));
    if (!dimMatch) continue;
    if (Number(dimMatch[2]) === flag.suggested) continue; // already applied
    if (Number(dimMatch[2]) !== flag.current) {
      console.warn(`SKIP ${flag.name}.${flag.dim}: file has ${dimMatch[2]}, flag expected ${flag.current} (hand-edited since?)`);
      skipped++;
      continue;
    }
    lines[i] = `${dimMatch[1]}${flag.dim}: ${flag.suggested}${dimMatch[3]}`;
    console.log(`${flag.name}.${flag.dim}: ${flag.current} → ${flag.suggested}`);
    applied++;
  }
}

writeFileSync(TARGET, lines.join('\n'));
console.log(`\nApplied ${applied}/${flags.length} taste flags (${skipped} skipped).`);
