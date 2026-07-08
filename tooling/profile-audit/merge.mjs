#!/usr/bin/env node
// Applies reviewed proposals to src/data/ingredientProfiles.ts IN PLACE:
// replaces the `description:` line when a rewrite is proposed, then inserts
// `textures:` / `functions:` / `cookingMethods:` / `intensity:` lines after it,
// preserving all surrounding code. Idempotent — existing generated lines are
// stripped and re-inserted, so re-running with updated proposals is safe.
// When a proposal omits textures/functions, the current values from
// work/profiles.json are carried forward unchanged (P4 layer can't drift).
//
// Taste flags are NEVER applied here. They are written to output/taste-audit.md
// for review, then applied via apply-flags.mjs — taste values feed filters and
// slot roles, so changing them is a behavior change and gets reviewed as such.
//
//   node extract.mjs && node check.mjs && node merge.mjs

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTURES, FUNCTIONS, COOKING_METHODS } from './vocab.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TARGET = join(ROOT, 'src', 'data', 'ingredientProfiles.ts');

const profiles = JSON.parse(readFileSync(join(HERE, 'work', 'profiles.json'), 'utf8'));
const byName = new Map(profiles.map((p) => [p.name, p]));

const proposals = new Map();
const flags = [];
for (const file of readdirSync(join(HERE, 'proposals')).filter((f) => f.endsWith('.json')).sort()) {
  for (const e of JSON.parse(readFileSync(join(HERE, 'proposals', file), 'utf8'))) {
    if (!byName.has(e.name)) throw new Error(`Unknown ingredient '${e.name}' — run check.mjs first`);
    for (const t of e.textures ?? []) if (!TEXTURES.includes(t)) throw new Error(`Unknown texture '${t}' on ${e.name}`);
    for (const f of e.functions ?? []) if (!FUNCTIONS.includes(f)) throw new Error(`Unknown function '${f}' on ${e.name}`);
    for (const m of e.cookingMethods ?? []) if (!COOKING_METHODS.includes(m)) throw new Error(`Unknown method '${m}' on ${e.name}`);
    proposals.set(e.name, e);
    for (const flag of e.tasteFlags ?? []) flags.push({ name: e.name, ...flag });
  }
}

const source = readFileSync(TARGET, 'utf8');
const lines = source.split('\n');

// Strip previously generated lines so the merge is idempotent.
const kept = lines.filter(
  (l) => !/^\s*(textures|functions|cookingMethods): \[[^\]]*\],?\s*$/.test(l)
    && !/^\s*intensity: \d+,?\s*$/.test(l)
);

const quote = (arr) => arr.map((x) => `"${x}"`).join(', ');

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
    const existing = byName.get(currentName);
    const descLine = p.description !== undefined
      ? `${indent}description: "${p.description}",`
      : (line.trimEnd().endsWith(',') ? line : `${line.trimEnd()},`);
    out.push(descLine);
    out.push(`${indent}textures: [${quote(p.textures ?? existing.textures ?? [])}],`);
    out.push(`${indent}functions: [${quote(p.functions ?? existing.functions ?? [])}],`);
    out.push(`${indent}cookingMethods: [${quote(p.cookingMethods ?? [])}],`);
    if (p.intensity !== undefined) out.push(`${indent}intensity: ${p.intensity},`);
    applied++;
    currentName = null;
    continue;
  }
  out.push(line);
}

if (applied !== proposals.size) {
  throw new Error(`Applied ${applied}/${proposals.size} — some profiles have no matchable single-line description`);
}

writeFileSync(TARGET, out.join('\n'));
console.log(`Applied proposals to ${applied} profiles in src/data/ingredientProfiles.ts`);

// Taste-audit report (review artifact — apply via apply-flags.mjs after review).
mkdirSync(join(HERE, 'output'), { recursive: true });
flags.sort((a, b) => Math.abs(b.suggested - b.current) - Math.abs(a.suggested - a.current));
const report = [
  '# Taste-profile audit — flagged outliers',
  '',
  'Flags are proposals, not applied by merge.mjs. Review each row, then run',
  'apply-flags.mjs to apply approved flags (it skips anything hand-edited since) —',
  'taste values feed filters and slot roles, so every change is a behavior change.',
  '',
  `${flags.length} flags across ${new Set(flags.map((f) => f.name)).size} ingredients.`,
  '',
  '| Ingredient | Dimension | Current | Suggested | Why |',
  '|---|---|---|---|---|',
  ...flags.map((f) => `| ${f.name} | ${f.dim} | ${f.current} | ${f.suggested} | ${f.reason} |`),
  '',
].join('\n');
writeFileSync(join(HERE, 'output', 'taste-audit.md'), report);
console.log(`Wrote ${flags.length} taste flags → output/taste-audit.md (apply with apply-flags.mjs after review)`);
