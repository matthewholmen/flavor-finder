#!/usr/bin/env node
// tooling/pairing-pipeline/mine.mjs
//
// Recipe-mining pass (Phase 4). Reads an open recipe dataset, normalizes each recipe's
// ingredients to the app's canonical vocabulary, and computes PMI-weighted co-occurrence
// to propose pairing edges tagged `recipenlg`.
//
// Why PMI, not raw counts: raw co-occurrence is dominated by ubiquitous ingredients
// (salt, onion, butter). Pointwise mutual information surfaces *distinctive* pairings
// instead — gochujang↔sesame stands out; gochujang↔salt does not.
//
// Output (in ./output/):
//   - proposed-pairings.json : [{ a, b, count, pmi, strength, sources:['recipenlg'] }]
//   - report.md              : human-readable review (new-ingredient coverage, stats)
// Nothing is written into src/ — review, then run merge (see README) to update pairingMeta.
//
// Usage:
//   node mine.mjs --input <path-to-recipes.csv> [options]
// Options:
//   --input <path>        Required. CSV with a NER column (RecipeNLG) or --col override.
//   --col <name>          Column holding the ingredient list (default: NER).
//   --min-count <n>       Min recipe co-occurrences to keep an edge (default: 20).
//   --min-pmi <x>         Min PMI to keep an edge (default: 0).
//   --limit <n>           Process at most n recipes (for quick test runs).
//
// Dataset: RecipeNLG (https://recipenlg.cs.put.poznan.pl/) full_dataset.csv works out of
// the box — its NER column is a JSON array of cleaned ingredient names.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, makeGetArg, parseCsv, parseIngredientCell, buildMatcher } from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- args ----
const args = process.argv.slice(2);
const getArg = makeGetArg(args);
const INPUT = getArg('input');
const COL = getArg('col', 'NER');
const MIN_COUNT = Number(getArg('min-count', '20'));
const MIN_PMI = Number(getArg('min-pmi', '0'));
const LIMIT = getArg('limit') ? Number(getArg('limit')) : Infinity;

if (!INPUT) {
  console.error('Error: --input <recipes.csv> is required. See header for usage.');
  process.exit(1);
}

// ---- canonical vocabulary + phrase matcher (shared with context.mjs) ----
const { canonical, synonyms, matchPhrase } = buildMatcher();

// ---- mine ----
const single = new Map();          // canonical -> # recipes containing it
const pair = new Map();            // "a|b" (a<b) -> # recipes containing both
let totalRecipes = 0;

const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);

console.error(`Reading canonical vocab: ${canonical.length} ingredients, ${Object.keys(synonyms).length} synonyms.`);
console.error(`Mining ${INPUT} (col=${COL}, min-count=${MIN_COUNT}, min-pmi=${MIN_PMI})...`);

let header = null;
let colIdx = -1;
let processed = 0;
for await (const row of parseCsv(INPUT)) {
  if (!header) {
    header = row.map((h) => h.trim());
    colIdx = header.indexOf(COL);
    if (colIdx < 0) {
      console.error(`Error: column "${COL}" not found. Columns: ${header.join(', ')}`);
      process.exit(1);
    }
    continue;
  }
  if (processed >= LIMIT) break;
  const phrases = parseIngredientCell(row[colIdx]);
  const present = new Set();
  for (const p of phrases) {
    const c = matchPhrase(p);
    if (c) present.add(c);
  }
  if (present.size === 0) { processed++; continue; }
  totalRecipes++;
  const list = [...present];
  for (const a of list) bump(single, a);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const [a, b] = list[i] < list[j] ? [list[i], list[j]] : [list[j], list[i]];
      bump(pair, `${a}|${b}`);
    }
  }
  processed++;
  if (processed % 100000 === 0) console.error(`  ...${processed} recipes`);
}

console.error(`Matched ${totalRecipes} recipes with >=1 known ingredient (of ${processed} read).`);

// ---- score: PMI, normalized to 0-10 ----
const N = Math.max(totalRecipes, 1);
const edges = [];
let maxPmi = 0;
for (const [key, count] of pair) {
  if (count < MIN_COUNT) continue;
  const [a, b] = key.split('|');
  const pa = single.get(a) / N;
  const pb = single.get(b) / N;
  const pab = count / N;
  const pmi = Math.log(pab / (pa * pb));
  if (pmi < MIN_PMI) continue;
  if (pmi > maxPmi) maxPmi = pmi;
  edges.push({ a, b, count, pmi });
}
// Normalize positive PMI -> 0-10 strength.
for (const e of edges) {
  e.strength = maxPmi > 0 ? Math.round((Math.max(e.pmi, 0) / maxPmi) * 10) : 0;
  e.sources = ['recipenlg'];
}
edges.sort((x, y) => y.pmi - x.pmi);

// ---- write outputs ----
const outDir = path.join(__dirname, 'output');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'proposed-pairings.json'), JSON.stringify(edges, null, 2));

// Report: focus on the ingredients we most wanted to fix.
const NEW_AND_STARVED = [
  'gochujang', 'doenjang', 'harissa', 'za\'atar', 'gochugaru', 'kimchi', 'miso',
  'fish sauce', 'dashi', 'sambal oelek', 'chili crisp', 'tahini', 'sumac', 'yuzu',
  'nori', 'galangal', 'fermented black beans', 'labneh', 'halloumi', 'jackfruit',
];
const edgesFor = (name) => edges.filter((e) => e.a === name || e.b === name);
let report = `# Recipe-mining report\n\n`;
report += `- Recipes read: ${processed}\n- Recipes matched: ${totalRecipes}\n`;
report += `- Edges proposed (count>=${MIN_COUNT}, pmi>=${MIN_PMI}): ${edges.length}\n`;
report += `- Max PMI (=strength 10): ${maxPmi.toFixed(3)}\n\n`;
report += `## Coverage for target ingredients\n\n`;
for (const name of NEW_AND_STARVED) {
  const es = edgesFor(name);
  report += `### ${name} — ${es.length} proposed edges\n`;
  report += es.slice(0, 12)
    .map((e) => `- ${e.a === name ? e.b : e.a} (count ${e.count}, pmi ${e.pmi.toFixed(2)}, strength ${e.strength})`)
    .join('\n');
  report += es.length ? '\n\n' : '_none — not enough recipe coverage in this dataset_\n\n';
}
report += `## Top 40 distinctive pairings overall\n\n`;
report += edges.slice(0, 40)
  .map((e) => `- ${e.a} + ${e.b} (count ${e.count}, pmi ${e.pmi.toFixed(2)}, strength ${e.strength})`)
  .join('\n');
fs.writeFileSync(path.join(outDir, 'report.md'), report + '\n');

console.error(`\nDone. Wrote:\n  ${path.relative(REPO_ROOT, path.join(outDir, 'proposed-pairings.json'))}\n  ${path.relative(REPO_ROOT, path.join(outDir, 'report.md'))}`);
