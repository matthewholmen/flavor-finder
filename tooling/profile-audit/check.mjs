#!/usr/bin/env node
// Validates proposals/*.json against the canonical profile list and the
// controlled vocabularies before anything touches src/. Fails loudly.
//
//   node extract.mjs   # first
//   node check.mjs     # then this; merge.mjs refuses to run without a clean check
//
// P6 proposal entries: { name, intensity, cookingMethods, description?,
// textures?, functions?, tasteFlags? }. textures/functions are optional — when
// omitted, merge.mjs carries the current values forward unchanged.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TEXTURES, FUNCTIONS, COOKING_METHODS, TASTE_DIMS,
  MAX_TEXTURES, MAX_FUNCTIONS, MAX_METHODS, INTENSITY_MIN, INTENSITY_MAX,
} from './vocab.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

const profiles = JSON.parse(readFileSync(join(HERE, 'work', 'profiles.json'), 'utf8'));
const byName = new Map(profiles.map((p) => [p.name, p]));

// Vocab-sync check: every term must appear verbatim in src/types.ts.
const typesSource = readFileSync(join(ROOT, 'src', 'types.ts'), 'utf8');
for (const term of [...TEXTURES, ...FUNCTIONS, ...COOKING_METHODS]) {
  if (!typesSource.includes(`'${term}'`)) {
    throw new Error(`vocab.mjs term '${term}' not found in src/types.ts — vocabularies out of sync`);
  }
}

const batchFiles = readdirSync(join(HERE, 'proposals'))
  .filter((f) => f.endsWith('.json'))
  .sort();
if (batchFiles.length === 0) throw new Error('No proposal batches in proposals/');

const errors = [];
const seen = new Map(); // name → batch file
const textureCounts = Object.fromEntries(TEXTURES.map((t) => [t, 0]));
const functionCounts = Object.fromEntries(FUNCTIONS.map((f) => [f, 0]));
const methodCounts = Object.fromEntries(COOKING_METHODS.map((m) => [m, 0]));
const intensityHist = {};
let noMethod = 0;
let rewrites = 0;
const flags = [];

for (const file of batchFiles) {
  const entries = JSON.parse(readFileSync(join(HERE, 'proposals', file), 'utf8'));
  if (!Array.isArray(entries)) {
    errors.push(`${file}: not an array`);
    continue;
  }
  for (const e of entries) {
    const where = `${file} → ${e.name ?? '???'}`;
    if (!byName.has(e.name)) {
      errors.push(`${where}: unknown ingredient name`);
      continue;
    }
    if (seen.has(e.name)) errors.push(`${where}: duplicate (also in ${seen.get(e.name)})`);
    seen.set(e.name, file);
    const current = byName.get(e.name);

    // textures / functions: optional in P6; validate when present.
    if (e.textures !== undefined) {
      if (!Array.isArray(e.textures)) errors.push(`${where}: textures must be an array`);
      else {
        if (e.textures.length > MAX_TEXTURES) errors.push(`${where}: ${e.textures.length} textures (max ${MAX_TEXTURES})`);
        for (const t of e.textures) {
          if (!TEXTURES.includes(t)) errors.push(`${where}: unknown texture '${t}'`);
          else textureCounts[t]++;
        }
        if (new Set(e.textures).size !== e.textures.length) errors.push(`${where}: duplicate textures`);
      }
    }
    if (e.functions !== undefined) {
      if (!Array.isArray(e.functions)) errors.push(`${where}: functions must be an array`);
      else {
        if (e.functions.length > MAX_FUNCTIONS) errors.push(`${where}: ${e.functions.length} functions (max ${MAX_FUNCTIONS})`);
        for (const f of e.functions) {
          if (!FUNCTIONS.includes(f)) errors.push(`${where}: unknown function '${f}'`);
          else functionCounts[f]++;
        }
        if (new Set(e.functions).size !== e.functions.length) errors.push(`${where}: duplicate functions`);
      }
    }

    // intensity: required, integer 1–10.
    if (!Number.isInteger(e.intensity) || e.intensity < INTENSITY_MIN || e.intensity > INTENSITY_MAX) {
      errors.push(`${where}: intensity ${e.intensity} not an integer in ${INTENSITY_MIN}–${INTENSITY_MAX}`);
    } else {
      intensityHist[e.intensity] = (intensityHist[e.intensity] ?? 0) + 1;
    }

    // cookingMethods: required array (empty = audited, not applicable).
    if (!Array.isArray(e.cookingMethods)) errors.push(`${where}: cookingMethods must be an array`);
    else {
      if (e.cookingMethods.length > MAX_METHODS) errors.push(`${where}: ${e.cookingMethods.length} methods (max ${MAX_METHODS})`);
      for (const m of e.cookingMethods) {
        if (!COOKING_METHODS.includes(m)) errors.push(`${where}: unknown cooking method '${m}'`);
        else methodCounts[m]++;
      }
      if (new Set(e.cookingMethods).size !== e.cookingMethods.length) errors.push(`${where}: duplicate methods`);
      if (e.cookingMethods.length === 0) noMethod++;
    }

    // description: optional rewrite; merge.mjs writes it into a double-quoted
    // TS string, so forbid raw double quotes rather than escape them.
    if (e.description !== undefined) {
      if (typeof e.description !== 'string' || !e.description.trim()) errors.push(`${where}: description must be a non-empty string`);
      else {
        if (e.description.includes('"')) errors.push(`${where}: description contains a double quote — rephrase or use curly quotes`);
        if (e.description.length > 260) errors.push(`${where}: description ${e.description.length} chars (max 260)`);
        if (e.description === current.description) errors.push(`${where}: description identical to current — omit it`);
        rewrites++;
      }
    }

    for (const flag of e.tasteFlags ?? []) {
      if (!TASTE_DIMS.includes(flag.dim)) {
        errors.push(`${where}: unknown taste dim '${flag.dim}'`);
        continue;
      }
      const cur = current.flavorProfile[flag.dim] ?? 0;
      if (!Number.isInteger(flag.suggested) || flag.suggested < 0 || flag.suggested > 10) {
        errors.push(`${where}: suggested ${flag.dim}=${flag.suggested} out of 0–10 range`);
      }
      if (!flag.reason) errors.push(`${where}: taste flag missing reason`);
      const alreadyApplied = cur === flag.suggested; // apply-flags.mjs ran after review
      if (!alreadyApplied) {
        if (flag.current !== cur) errors.push(`${where}: flag says current ${flag.dim}=${flag.current}, file has ${cur}`);
        if (flag.suggested === cur) errors.push(`${where}: flag for ${flag.dim} suggests no change`);
      }
      flags.push({ name: e.name, ...flag, applied: alreadyApplied });
    }
  }
}

const missing = profiles.filter((p) => !seen.has(p.name)).map((p) => p.name);
if (missing.length) errors.push(`Missing ${missing.length} ingredients: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ', …' : ''}`);

mkdirSync(join(HERE, 'output'), { recursive: true });
const report = [
  `# Profile-audit check — ${new Date().toISOString().slice(0, 10)}`,
  '',
  `- Batches: ${batchFiles.length} (${batchFiles.join(', ')})`,
  `- Covered: ${seen.size}/${profiles.length} ingredients`,
  `- Description rewrites: ${rewrites}`,
  `- No cooking methods (not applicable): ${noMethod}`,
  `- Taste flags: ${flags.length}`,
  '',
  '## Intensity distribution',
  ...Object.keys(intensityHist).sort((a, b) => a - b).map((k) => `- ${k}: ${intensityHist[k]}`),
  '',
  '## Cooking-method distribution',
  ...COOKING_METHODS.map((m) => `- ${m}: ${methodCounts[m]}`),
  '',
  '## Texture distribution (proposed overrides only)',
  ...TEXTURES.map((t) => `- ${t}: ${textureCounts[t]}`),
  '',
  '## Function distribution (proposed overrides only)',
  ...FUNCTIONS.map((f) => `- ${f}: ${functionCounts[f]}`),
  '',
  `## Errors (${errors.length})`,
  ...(errors.length ? errors.map((e) => `- ${e}`) : ['- none']),
  '',
].join('\n');
writeFileSync(join(HERE, 'output', 'check-report.md'), report);

console.log(report);
if (errors.length) {
  console.error(`FAILED with ${errors.length} error(s) — see output/check-report.md`);
  process.exit(1);
}
console.log('Check passed.');
