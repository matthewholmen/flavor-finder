#!/usr/bin/env node
// tooling/pairing-pipeline/context.mjs
//
// Dish-context mining pass. Where mine.mjs asks "which ingredients co-occur?", this pass
// asks "what are those recipes actually LIKE?" — for every edge already in the app's
// flavor graph, it accumulates from each recipe containing both ingredients:
//
//   - dish-type tags   (title keywords:      soups, salads, tacos & burritos, rubs …)
//   - method tags      (directions keywords: roasted, simmered, marinated …)
//   - cuisine tags     (title keywords incl. dish names: birria → Mexican …)
//   - top recipe titles (the concrete "seen in: …" receipts)
//
// This never proposes or scores edges — the compatibility graph is untouched. It only
// annotates edges the app already has, so the tags/titles can answer "what am I looking
// at?" inline. Keyword vocabulary lives in context-vocab.json (tag names are shown
// verbatim in the UI).
//
// Output (in ./output/):
//   - edge-context.json   : per-edge tag counts + top titles (raw; merge applies policy)
//   - context-report.md   : human-readable review
//
// Usage:
//   node context.mjs --input <path-to-recipes.csv> [options]
// Options:
//   --input <path>      Required. RecipeNLG-style CSV (title, directions, NER columns).
//   --min-count <n>     Min recipes containing both ingredients to emit an edge (default 3).
//   --limit <n>         Process at most n recipes (for quick test runs).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  makeGetArg, pairKey, parseCsv, parseIngredientCell, buildMatcher, loadEdgeSet,
} from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const getArg = makeGetArg(args);
const INPUT = getArg('input');
const MIN_COUNT = Number(getArg('min-count', '3'));
const LIMIT = getArg('limit') ? Number(getArg('limit')) : Infinity;

if (!INPUT) {
  console.error('Error: --input <recipes.csv> is required. See header for usage.');
  process.exit(1);
}

// ---- tag vocabulary → one alternation regex per tag ----
const vocab = JSON.parse(fs.readFileSync(path.join(__dirname, 'context-vocab.json'), 'utf8'));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Word-boundary match with optional plural; [^a-z] boundaries like the ingredient matcher
// so "salad" doesn't fire inside "saladillo" but does before punctuation.
const compileGroup = (group) =>
  Object.entries(group).map(([tag, keywords]) => [
    tag,
    new RegExp(`(?:^|[^a-z])(?:${keywords.map(esc).join('|')})(?:e?s)?(?=[^a-z]|$)`),
  ]);
const DISH = compileGroup(vocab.dishTypes);
const METHOD = compileGroup(vocab.methods);
const CUISINE = compileGroup(vocab.cuisines);

const tagsFor = (compiled, text) => {
  const out = [];
  for (const [tag, re] of compiled) if (re.test(text)) out.push(tag);
  return out;
};

// ---- title normalization (these strings ship to the UI) ----
const normalizeTitle = (raw) => {
  let t = raw.replace(/\s+/g, ' ').trim();
  t = t.replace(/\s*\([^)]*\)\s*$/, '');           // trailing parenthetical (serving notes etc.)
  t = t.replace(/\s+[Rr]ecipe\s+[a-z0-9]+$/, '');  // scraper site-slug suffix ("Recipe kanosis")
  t = t.replace(/\s*\(?recipe\)?\s*$/i, '').replace(/^["'\s]+|["'\s]+$/g, '');
  if (t.length < 3 || t.length > 60) return null;
  if (!/[a-z]/i.test(t)) return null;
  return t;
};

// ---- ingredient matcher + tracked edge set ----
const { matchPhrase } = buildMatcher();
const edgeSet = loadEdgeSet();
console.error(`Tracking ${edgeSet.size} graph edges.`);

// ---- pass 1: global title frequency ----
//
// Exact per-edge title counting is memory-prohibitive (a hub edge like basil+tomato sees
// ~10k distinct titles), and a small capped sketch degrades into eviction noise at that
// scale. So: count titles globally first, then in pass 2 exact-count only the *globally
// popular* titles per edge (a bounded set), keeping a small sketch as fallback for rare
// edges whose receipts are one-off titles.
const POPULAR_MIN = 10;
const globalTitles = new Map();
console.error(`Pass 1/2: global title counts from ${INPUT}...`);
{
  let hdr = null;
  let tIdx = -1;
  let read = 0;
  for await (const row of parseCsv(INPUT)) {
    if (!hdr) {
      hdr = row.map((h) => h.trim());
      tIdx = hdr.indexOf('title');
      continue;
    }
    if (read >= LIMIT) break;
    read++;
    const t = normalizeTitle(row[tIdx] || '');
    if (t) globalTitles.set(t, (globalTitles.get(t) || 0) + 1);
  }
}
const popularTitles = new Set();
for (const [t, c] of globalTitles) if (c >= POPULAR_MIN) popularTitles.add(t);
globalTitles.clear();
console.error(`  ${popularTitles.size} titles appear >=${POPULAR_MIN} times.`);

// Per-edge accumulator. `pop` = exact counts of globally-popular titles; `titles` = a
// capped sketch (space-saving eviction) as fallback for edges with no popular receipts.
const TITLE_CAP = 24;
const POP_CAP = 1500;
const makeAcc = () => ({ n: 0, dish: new Map(), method: new Map(), cuisine: new Map(), titles: new Map(), pop: new Map() });
const acc = new Map(); // pairKey -> accumulator

const bumpAll = (map, tags) => { for (const t of tags) map.set(t, (map.get(t) || 0) + 1); };
const bumpTitle = (map, title) => {
  if (map.has(title)) { map.set(title, map.get(title) + 1); return; }
  if (map.size < TITLE_CAP) { map.set(title, 1); return; }
  // Evict the current minimum, inheriting its count (space-saving sketch).
  let minK = null; let minV = Infinity;
  for (const [k, v] of map) if (v < minV) { minK = k; minV = v; }
  map.delete(minK);
  map.set(title, minV + 1);
};

// ---- pass 2: per-edge context ----
console.error(`Pass 2/2: mining context from ${INPUT} (min-count=${MIN_COUNT})...`);
let header = null;
let titleIdx = -1; let dirIdx = -1; let nerIdx = -1;
let processed = 0;
let matched = 0;

for await (const row of parseCsv(INPUT)) {
  if (!header) {
    header = row.map((h) => h.trim());
    titleIdx = header.indexOf('title');
    dirIdx = header.indexOf('directions');
    nerIdx = header.indexOf('NER');
    if (titleIdx < 0 || nerIdx < 0) {
      console.error(`Error: need "title" and "NER" columns. Columns: ${header.join(', ')}`);
      process.exit(1);
    }
    continue;
  }
  if (processed >= LIMIT) break;
  processed++;
  if (processed % 100000 === 0) console.error(`  ...${processed} recipes`);

  const phrases = parseIngredientCell(row[nerIdx]);
  const present = new Set();
  for (const p of phrases) {
    const c = matchPhrase(p);
    if (c) present.add(c);
  }
  if (present.size < 2) continue;

  // Tracked edges in this recipe — skip tag extraction when there are none.
  const list = [...present];
  const hitKeys = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const k = pairKey(list[i], list[j]);
      if (edgeSet.has(k)) hitKeys.push(k);
    }
  }
  if (hitKeys.length === 0) continue;
  matched++;

  const titleRaw = row[titleIdx] || '';
  const titleLower = titleRaw.toLowerCase();
  const dishTags = tagsFor(DISH, titleLower);
  const cuisineTags = tagsFor(CUISINE, titleLower);
  let methodTags = [];
  if (dirIdx >= 0 && row[dirIdx]) {
    const dirText = parseIngredientCell(row[dirIdx]).join(' ').toLowerCase();
    methodTags = tagsFor(METHOD, dirText);
  }
  const title = normalizeTitle(titleRaw);

  const isPopular = title && popularTitles.has(title);
  for (const k of hitKeys) {
    let a = acc.get(k);
    if (!a) { a = makeAcc(); acc.set(k, a); }
    a.n++;
    bumpAll(a.dish, dishTags);
    bumpAll(a.method, methodTags);
    bumpAll(a.cuisine, cuisineTags);
    // POP_CAP bounds hub-edge memory; once full, only already-seen titles keep counting.
    // High-frequency titles enter early, so the top ranks are unaffected in practice.
    if (isPopular && (a.pop.has(title) || a.pop.size < POP_CAP)) {
      a.pop.set(title, (a.pop.get(title) || 0) + 1);
    } else if (title && !isPopular) bumpTitle(a.titles, title);
  }
}

console.error(`Read ${processed} recipes; ${matched} contained >=1 tracked edge.`);

// ---- emit raw per-edge context (merge-context.mjs applies display policy) ----
const topEntries = (map, k) =>
  [...map.entries()].sort((x, y) => y[1] - x[1]).slice(0, k);

const edgesOut = {};
let emitted = 0;
for (const [k, a] of acc) {
  if (a.n < MIN_COUNT) continue;
  edgesOut[k] = {
    n: a.n,
    dish: topEntries(a.dish, 6),
    method: topEntries(a.method, 6),
    cuisine: topEntries(a.cuisine, 4),
    // Exact counts of globally-popular titles; `rare` is the sketch fallback for edges
    // whose receipts are one-off titles (counts there are approximate).
    titles: topEntries(a.pop, 5),
    rare: topEntries(a.titles, 3),
  };
  emitted++;
}

const outDir = path.join(__dirname, 'output');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'edge-context.json'),
  JSON.stringify({ recipesRead: processed, recipesMatched: matched, minCount: MIN_COUNT, edges: edgesOut }),
);

// ---- report ----
const overall = { dish: new Map(), method: new Map(), cuisine: new Map() };
for (const k of Object.keys(edgesOut)) {
  const e = edgesOut[k];
  for (const [t, c] of e.dish) overall.dish.set(t, (overall.dish.get(t) || 0) + c);
  for (const [t, c] of e.method) overall.method.set(t, (overall.method.get(t) || 0) + c);
  for (const [t, c] of e.cuisine) overall.cuisine.set(t, (overall.cuisine.get(t) || 0) + c);
}
const fmtTop = (m, k) => topEntries(m, k).map(([t, c]) => `- ${t}: ${c}`).join('\n');

const SAMPLE_EDGES = [
  'achiote,pork shoulder', 'gochujang,sesame oil', 'basil,tomato', 'apple,cinnamon',
  'chicken,lemon', 'harissa,carrot', 'miso,butter', 'fish sauce,lime', 'sage,butternut squash',
];
let report = `# Context-mining report\n\n`;
report += `- Recipes read: ${processed}\n- Recipes with >=1 tracked edge: ${matched}\n`;
report += `- Edges with context (n>=${MIN_COUNT}): ${emitted} of ${edgeSet.size} tracked\n\n`;
report += `## Overall tag frequency\n\n### Dish types\n${fmtTop(overall.dish, 15)}\n\n`;
report += `### Methods\n${fmtTop(overall.method, 15)}\n\n### Cuisines\n${fmtTop(overall.cuisine, 15)}\n\n`;
report += `## Sample edges\n\n`;
for (const k of SAMPLE_EDGES) {
  const e = edgesOut[k];
  if (!e) { report += `### ${k}\n_no context (n<${MIN_COUNT})_\n\n`; continue; }
  report += `### ${k} — ${e.n} recipes\n`;
  report += `- dish: ${e.dish.map(([t, c]) => `${t} (${c})`).join(', ') || '—'}\n`;
  report += `- method: ${e.method.map(([t, c]) => `${t} (${c})`).join(', ') || '—'}\n`;
  report += `- cuisine: ${e.cuisine.map(([t, c]) => `${t} (${c})`).join(', ') || '—'}\n`;
  report += `- titles: ${e.titles.map(([t, c]) => `"${t}" (${c})`).join(', ') || '—'}\n`;
  report += `- rare titles: ${e.rare.map(([t, c]) => `"${t}" (~${c})`).join(', ') || '—'}\n\n`;
}
fs.writeFileSync(path.join(outDir, 'context-report.md'), report);

console.error(`\nDone. Wrote:\n  output/edge-context.json (${emitted} edges)\n  output/context-report.md`);
