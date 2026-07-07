#!/usr/bin/env node
// Applies reviewed proposals to src/data/ingredientProfiles.ts IN PLACE:
// inserts `textures:` / `functions:` lines after each profile's description,
// preserving all surrounding code. Idempotent — existing generated lines are
// stripped and re-inserted, so re-running with updated proposals is safe.
//
// Taste flags are NEVER applied here. They are written to output/taste-audit.md
// for hand review — taste values feed filters and slot roles, so changing them
// is a behavior change and gets reviewed as such.
//
//   node extract.mjs && node check.mjs && node merge.mjs

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTURES, FUNCTIONS } from './vocab.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TARGET = join(ROOT, 'src', 'data', 'ingredientProfiles.ts');

const profiles = JSON.parse(readFileSync(join(HERE, 'work', 'profiles.json'), 'utf8'));
const known = new Set(profiles.map((p) => p.name));

const proposals = new Map();
const flags = [];
for (const file of readdirSync(join(HERE, 'proposals')).filter((f) => f.endsWith('.json')).sort()) {
  for (const e of JSON.parse(readFileSync(join(HERE, 'proposals', file), 'utf8'))) {
    if (!known.has(e.name)) throw new Error(`Unknown ingredient '${e.name}' — run check.mjs first`);
    for (const t of e.textures) if (!TEXTURES.includes(t)) throw new Error(`Unknown texture '${t}' on ${e.name}`);
    for (const f of e.functions) if (!FUNCTIONS.includes(f)) throw new Error(`Unknown function '${f}' on ${e.name}`);
    proposals.set(e.name, e);
    for (const flag of e.tasteFlags ?? []) flags.push({ name: e.name, ...flag });
  }
}

const source = readFileSync(TARGET, 'utf8');
const lines = source.split('\n');

// Strip previously generated lines so the merge is idempotent.
const kept = lines.filter((l) => !/^\s*(textures|functions): \[[^\]]*\],?\s*$/.test(l));

const out = [];
let currentName = null;
let applied = 0;
for (const line of kept) {
  const nameMatch = line.match(/^\s*name: "((?:[^"\\]|\\.)*)"/);
  if (nameMatch) currentName = nameMatch[1];

  const descMatch = line.match(/^(\s*)description: ".*",?\s*$/);
  if (descMatch && currentName && proposals.has(currentName)) {
    const indent = descMatch[1];
    const p = proposals.get(currentName);
    out.push(line.trimEnd().endsWith(',') ? line : `${line.trimEnd()},`);
    out.push(`${indent}textures: [${p.textures.map((t) => `"${t}"`).join(', ')}],`);
    out.push(`${indent}functions: [${p.functions.map((f) => `"${f}"`).join(', ')}],`);
    applied++;
    currentName = null;
    continue;
  }
  out.push(line);
}

const unapplied = [...proposals.keys()].filter((n) => {
  // crude but sufficient: every applied entry now has a textures line right after its description
  return !out.some((l, i) => l.includes(`name: "${n}"`));
});
if (unapplied.length) throw new Error(`Profiles not found in target file: ${unapplied.join(', ')}`);
if (applied !== proposals.size) {
  throw new Error(`Applied ${applied}/${proposals.size} — some profiles have no matchable single-line description`);
}

writeFileSync(TARGET, out.join('\n'));
console.log(`Applied textures/functions to ${applied} profiles in src/data/ingredientProfiles.ts`);

// Taste-audit report (hand review only — nothing below changes app data).
mkdirSync(join(HERE, 'output'), { recursive: true });
flags.sort((a, b) => Math.abs(b.suggested - b.current) - Math.abs(a.suggested - a.current));
const report = [
  '# Taste-profile audit — flagged outliers',
  '',
  'All 638 original taste profiles were early-Sonnet output (v0 estimates). This pass',
  'flags values that look wrong; it does NOT apply them. Review each row and hand-edit',
  'src/data/ingredientProfiles.ts (or reject the flag) — taste values feed filters and',
  'slot roles, so every change here is a behavior change.',
  '',
  `${flags.length} flags across ${new Set(flags.map((f) => f.name)).size} ingredients.`,
  '',
  '| Ingredient | Dimension | Current | Suggested | Why |',
  '|---|---|---|---|---|',
  ...flags.map((f) => `| ${f.name} | ${f.dim} | ${f.current} | ${f.suggested} | ${f.reason} |`),
  '',
].join('\n');
writeFileSync(join(HERE, 'output', 'taste-audit.md'), report);
console.log(`Wrote ${flags.length} taste flags → output/taste-audit.md (hand review; not applied)`);
