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
  loadTitleClassifier,
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

// ---- tag vocabulary → one alternation regex per tag (shared with merge-context.mjs) ----
const { DISH, METHOD, CUISINE, tagsFor } = loadTitleClassifier();

// ---- title normalization (these strings ship to the UI) ----
//
// Joke/gimmick names and diet-mill titles are real recipes but terrible receipts — the
// strip exists to say "this combo is a known thing," and "Montezuma's Revenge" says the
// opposite. Filtered at normalize time so they never enter any count.
const TITLE_STOPLIST =
  /\b(revenge|roadkill|garbage|kitchen sink|crack|to die for|better than sex|died and went|sludge|surprise|diabetic|weight watchers|low[- ]fat|fat[- ]free|guilt[- ]free|skinny)\b/i;
const normalizeTitle = (raw) => {
  let t = raw.replace(/\s+/g, ' ').trim();
  t = t.replace(/\s*\([^)]*\)\s*$/, '');           // trailing parenthetical (serving notes etc.)
  t = t.replace(/\s+[Rr]ecipe\s+[a-z0-9]+$/, '');  // scraper site-slug suffix ("Recipe kanosis")
  t = t.replace(/\s*\(?recipe\)?\s*$/i, '').replace(/^["'\s]+|["'\s]+$/g, '');
  t = t.replace(/(\w)'S\b/g, "$1's");              // title-caser artifact ("Montezuma'S")
  if (t.length < 3 || t.length > 60) return null;
  if (!/[a-z]/i.test(t)) return null;
  if (TITLE_STOPLIST.test(t)) return null;
  return t;
};

// Editorial/curated recipe sites in the corpus (~250k of the 2.2M recipes). A title from
// one of these passed a test kitchen or an editor — it outranks recipe-mill receipts.
const CURATED_DOMAINS = new Set([
  'epicurious.com', 'cooking.nytimes.com', 'seriouseats.com', 'food52.com',
  'foodnetwork.com', 'foodandwine.com', 'myrecipes.com', 'tasteofhome.com',
  'cookstr.com', 'chowhound.com', 'vegetariantimes.com', 'delish.com', 'foodrepublic.com',
]);
const domainOf = (link) =>
  (link || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

// ---- ingredient matcher + tracked edge set ----
const { matchPhrase } = buildMatcher();
const edgeSet = loadEdgeSet();
console.error(`Tracking ${edgeSet.size} graph edges.`);

// ---- pass 1: global title frequency + cross-site check ----
//
// Exact per-edge title counting is memory-prohibitive (a hub edge like basil+tomato sees
// ~10k distinct titles), and a small capped sketch degrades into eviction noise at that
// scale. So: survey titles globally first, then in pass 2 exact-count only the
// *qualifying* titles per edge (a bounded set).
//
// Qualifying = the title appears on >=2 DISTINCT domains. That's the canonicality test:
// a cross-site name ("Cochinita Pibil", "Wassail") is a recognized dish a web search
// will find; a single-site name ("Wisconsin Whammer" — one editorial page in the 2019
// crawl, unfindable today) is not a receipt we can stand behind, however charming.
// Raw repetition doesn't qualify on its own — cookbooks.com duplicates the same
// user-submitted card dozens of times on one domain.
const globalTitles = new Map(); // title -> [count, firstDomain, seenOnSecondDomain]
console.error(`Pass 1/2: global title survey from ${INPUT}...`);
{
  let hdr = null;
  let tIdx = -1;
  let lIdx = -1;
  let read = 0;
  for await (const row of parseCsv(INPUT)) {
    if (!hdr) {
      hdr = row.map((h) => h.trim());
      tIdx = hdr.indexOf('title');
      lIdx = hdr.indexOf('link');
      continue;
    }
    if (read >= LIMIT) break;
    read++;
    const t = normalizeTitle(row[tIdx] || '');
    if (!t) continue;
    const d = lIdx >= 0 ? domainOf(row[lIdx]) : '';
    const g = globalTitles.get(t);
    if (!g) globalTitles.set(t, [1, d, false]);
    else {
      g[0]++;
      if (!g[2] && d !== g[1]) g[2] = true;
    }
  }
}
const crossSiteTitles = new Set();
for (const [t, g] of globalTitles) if (g[2]) crossSiteTitles.add(t);
globalTitles.clear();
console.error(`  ${crossSiteTitles.size} titles appear on >=2 distinct domains.`);

// Per-edge accumulator. `pop` = exact counts of qualifying (cross-site) titles, stored
// as [count, curatedCount]; `titles` = a capped sketch (space-saving eviction) of
// non-qualifying titles, emitted for report/debugging only — merge never ships them.
const TITLE_CAP = 24;
const POP_CAP = 1500;
// Per-tag receipt candidates: for each dish/cuisine tag an edge claims, keep a few
// qualifying titles that themselves carry the tag. merge-context.mjs draws on these to
// back a steering claim that the prototypicality-ranked primaries don't cover, so every
// steerable tag ships with a title the user can actually verify (steer-receipt alignment).
const TAG_TITLE_CAP = 4;
const makeAcc = () => ({
  n: 0, dish: new Map(), method: new Map(), cuisine: new Map(), titles: new Map(), pop: new Map(),
  dishTitles: new Map(), cuisineTitles: new Map(), // tag -> Map(title -> [count, curatedCount])
});
const acc = new Map(); // pairKey -> accumulator

const bumpAll = (map, tags) => { for (const t of tags) map.set(t, (map.get(t) || 0) + 1); };
// Bump a title into each of its tags' capped per-tag maps (space-saving eviction by
// score = count + 2*curated, mirroring the ranking merge will apply).
const bumpTagTitles = (tagMap, tags, title, isCurated) => {
  for (const tag of tags) {
    let inner = tagMap.get(tag);
    if (!inner) { inner = new Map(); tagMap.set(tag, inner); }
    const e = inner.get(title);
    if (e) { e[0] += 1; if (isCurated) e[1] += 1; continue; }
    if (inner.size < TAG_TITLE_CAP) { inner.set(title, [1, isCurated ? 1 : 0]); continue; }
    let minK = null; let minV = Infinity;
    for (const [k, v] of inner) { const s = v[0] + 2 * v[1]; if (s < minV) { minV = s; minK = k; } }
    inner.delete(minK);
    inner.set(title, [minV + 1, isCurated ? 1 : 0]);
  }
};
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
let titleIdx = -1; let dirIdx = -1; let nerIdx = -1; let linkIdx = -1;
let processed = 0;
let matched = 0;

for await (const row of parseCsv(INPUT)) {
  if (!header) {
    header = row.map((h) => h.trim());
    titleIdx = header.indexOf('title');
    dirIdx = header.indexOf('directions');
    nerIdx = header.indexOf('NER');
    linkIdx = header.indexOf('link');
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

  // Cross-site presence is the eligibility bar; a curated-domain sighting only boosts
  // ranking. (A single curated page can still be a one-off with an unfindable name.)
  const isCurated = linkIdx >= 0 && CURATED_DOMAINS.has(domainOf(row[linkIdx]));
  const qualifies = title && crossSiteTitles.has(title);
  for (const k of hitKeys) {
    let a = acc.get(k);
    if (!a) { a = makeAcc(); acc.set(k, a); }
    a.n++;
    bumpAll(a.dish, dishTags);
    bumpAll(a.method, methodTags);
    bumpAll(a.cuisine, cuisineTags);
    // POP_CAP bounds hub-edge memory; once full, only already-seen titles keep counting.
    // High-frequency titles enter early, so the top ranks are unaffected in practice.
    if (qualifies && (a.pop.has(title) || a.pop.size < POP_CAP)) {
      const e = a.pop.get(title) || [0, 0];
      e[0] += 1;
      if (isCurated) e[1] += 1;
      a.pop.set(title, e);
    } else if (title && !qualifies) bumpTitle(a.titles, title);
    // Track qualifying titles per steerable tag they carry, so merge can back each
    // steering claim with a findable receipt. Only cross-site titles qualify — an
    // unfindable one-off is no better as a per-tag receipt than as a primary.
    if (qualifies) {
      bumpTagTitles(a.dishTitles, dishTags, title, isCurated);
      bumpTagTitles(a.cuisineTitles, cuisineTags, title, isCurated);
    }
  }
}

console.error(`Read ${processed} recipes; ${matched} contained >=1 tracked edge.`);

// ---- emit raw per-edge context (merge-context.mjs applies display policy) ----
const topEntries = (map, k) =>
  [...map.entries()].sort((x, y) => y[1] - x[1]).slice(0, k);

// Per-tag receipt candidates → { tag: top-2 [title, count, curatedCount] }, ranked by the
// same score merge uses so its first pick is the strongest findable receipt for that tag.
const tagTitlesOut = (tagMap) => {
  const out = {};
  for (const [tag, inner] of tagMap) {
    out[tag] = [...inner.entries()]
      .sort((x, y) => (y[1][0] + 2 * y[1][1]) - (x[1][0] + 2 * x[1][1]))
      .slice(0, 2)
      .map(([t, [c, cur]]) => [t, c, cur]);
  }
  return out;
};

const edgesOut = {};
let emitted = 0;
for (const [k, a] of acc) {
  if (a.n < MIN_COUNT) continue;
  edgesOut[k] = {
    n: a.n,
    dish: topEntries(a.dish, 6),
    method: topEntries(a.method, 6),
    cuisine: topEntries(a.cuisine, 4),
    // Qualifying titles as [title, count, curatedCount], pre-ranked with a curated bonus;
    // final scoring/selection is merge policy. `rare` is the sketch fallback (approximate
    // counts) for edges whose receipts are one-off titles.
    titles: [...a.pop.entries()]
      .sort((x, y) => (y[1][0] + 2 * y[1][1]) - (x[1][0] + 2 * x[1][1]))
      .slice(0, 8)
      .map(([t, [c, cur]]) => [t, c, cur]),
    rare: topEntries(a.titles, 3),
    // Per-tag receipt candidates (merge uses these to back otherwise-uncovered claims).
    dishTitles: tagTitlesOut(a.dishTitles),
    cuisineTitles: tagTitlesOut(a.cuisineTitles),
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
  report += `- titles: ${e.titles.map(([t, c, cur]) => `"${t}" (${c}${cur ? `, ${cur} curated` : ''})`).join(', ') || '—'}\n`;
  report += `- rare titles: ${e.rare.map(([t, c]) => `"${t}" (~${c})`).join(', ') || '—'}\n\n`;
}
fs.writeFileSync(path.join(outDir, 'context-report.md'), report);

console.error(`\nDone. Wrote:\n  output/edge-context.json (${emitted} edges)\n  output/context-report.md`);
