#!/usr/bin/env node
// tooling/pairing-pipeline/merge-context.mjs
//
// Folds mined dish context (output/edge-context.json) into src/data/pairingContext.ts —
// the compact, shipped form of "what recipes is this pairing seen in?".
//
// Display policy lives HERE (context.mjs emits raw counts): a tag is kept only when it
// clears both an absolute count and a share-of-edge threshold, so one-off noise (an
// apple+cinnamon recipe that happened to be titled "Mexican Wassail") never ships.
//
// Shipped encoding, tuned for bundle size:
//   - three tag vocabularies (dish / method / cuisine) — display-ready strings
//   - a deduped title table (popular titles are shared by many edges)
//   - per edge: [recipeCount, dishIdxs, methodIdxs, cuisineIdxs, titleIdxs,
//               dishDisplayCount, cuisineDisplayCount, primaryTitleCount]
//
// Steer-receipt alignment: after the display selection, every steering-tier dish/cuisine
// claim must ship >=1 title that classifies to it (CONTEXT_TAG_KEYWORDS regexes). Primaries
// cover some; uncovered claims get an "extra" receipt drawn from context.mjs's per-tag
// candidates, or are pruned if none is findable. So a tag can never be a clickable steer
// without a receipt that honestly carries it.
//
// Usage:
//   node merge-context.mjs [--min-edge 5] [--min-tag-count 3] [--min-tag-share 0.15]
//                          [--min-cuisine-share 0.1] [--max-titles 3]
//                          [--max-extra-titles 0] [--dry-run]
//   --max-extra-titles 0 = uncapped steer-backing extras (default); >0 caps per edge,
//                          prioritizing display-tier claims then loose claims by count.
//
// Re-runnable: regenerates pairingContext.ts from scratch each time.

import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, makeGetArg, loadTitleClassifier } from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const getArg = makeGetArg(args);
const MIN_EDGE = Number(getArg('min-edge', '5'));
const MIN_TAG_COUNT = Number(getArg('min-tag-count', '3'));
const MIN_TAG_SHARE = Number(getArg('min-tag-share', '0.15'));
const MIN_CUISINE_SHARE = Number(getArg('min-cuisine-share', '0.1'));
const MAX_TITLES = Number(getArg('max-titles', '2'));
// Uncapped extras by default (0) — the user prefers full steer-receipt coverage; the
// bundle gate below only trips a cap if the gzip delta blows past budget.
const MAX_EXTRA_TITLES = Number(getArg('max-extra-titles', '0'));
const DRY = args.includes('--dry-run');

// Shared classifier: used to verify a selected receipt title actually carries the
// steering tag it's meant to back (identical regexes to context.mjs's tag counting and
// the client's runtime filter — see lib.mjs).
const { DISH, CUISINE, tagsFor, vocab } = loadTitleClassifier();
const classifyTitle = (t) => {
  const lower = t.toLowerCase();
  return { dish: new Set(tagsFor(DISH, lower)), cuisine: new Set(tagsFor(CUISINE, lower)) };
};

const { edges, recipesRead } = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'output', 'edge-context.json'), 'utf8'),
);

// ---- interners: stable index per distinct string ----
const makeInterner = () => {
  const list = [];
  const idx = new Map();
  return {
    list,
    has: (s) => idx.has(s),
    intern: (s) => {
      if (!idx.has(s)) { idx.set(s, list.length); list.push(s); }
      return idx.get(s);
    },
  };
};
const dishI = makeInterner();
const methodI = makeInterner();
const cuisineI = makeInterner();
const titleI = makeInterner();

// Keep top tags that clear both floors. `counts` is [[tag, count], ...] sorted desc.
const keepTags = (counts, n, interner, maxKeep, minShare) =>
  counts
    .filter(([, c]) => c >= MIN_TAG_COUNT && c / n >= minShare)
    .slice(0, maxKeep)
    .map(([t]) => interner.intern(t));

// Two-tier tags for steerable groups (dish, cuisine). Display stays precision-tuned
// (the strict floors above), but *steering membership* uses a looser bar — count >= 2
// and >= 5% share — because "salads ranked 4th for this edge" is still a salad edge.
// Encoding: one array, display-qualifying tags first (count order), loose-only tags
// after (count order), plus the display count so the decoder can slice. This roughly
// doubles steerable subgraphs and halves false "doesn't fit this tag" on kept combos.
const LOOSE_COUNT = 2;
const LOOSE_SHARE = 0.05;
// Returns tag NAMES in display-first-then-loose order plus the display count. Interning
// happens after receipt-backed pruning, so pruned tags never reach a string table.
const tieredTags = (counts, n, maxDisplay, minShareDisplay) => {
  const loose = counts.filter(([, c]) => c >= LOOSE_COUNT && c / n >= LOOSE_SHARE);
  const display = loose
    .filter(([, c]) => c >= MIN_TAG_COUNT && c / n >= minShareDisplay)
    .slice(0, maxDisplay);
  const rest = loose.filter(x => !display.includes(x));
  return {
    tags: [...display, ...rest].map(([t]) => t),
    displayCount: display.length,
  };
};

// Titles are ranked for *prototypicality* — the receipt should read like a known dish
// ("Tom Kha Gai", "Beef Stew"), not an 8-word blog flourish. Every candidate is already
// cross-site (>=2 distinct domains — see context.mjs), so it's a findable, recognized
// name. Score = repeat sightings with this pair, a curated-domain bonus, a length penalty.
const lengthFactor = (t) => {
  const words = t.split(' ').length;
  return words <= 4 ? 1 : words <= 6 ? 0.6 : 0.3;
};
// Last-line title hygiene: some corpus titles are truncated mid-list ("Beef Chili With
// Ancho,") — strip dangling punctuation/conjunctions before shipping. This can strip a
// trailing tag keyword, so every classify-for-coverage step re-verifies the TIDIED string.
const tidyTitle = (t) => {
  const tidied = t
    .replace(/[\s,;:&+-]+$/, '')
    .replace(/\s+(with|and|or|in|for)$/i, '')
    .replace(/(['’])S\b/g, '$1s'); // title-caser artifact ("José'S", "J.P.'S"), straight or curly quote
  return tidied.length >= 3 ? tidied : null;
};

// ---- dry-run instrumentation (steer-receipt alignment: what pruning/backing changed) ----
const stats = {
  claimsBefore: 0, claimsAfter: 0,
  pruned: new Map(),       // "group:tag" -> claims dropped for want of a receipt
  steerBefore: new Map(),  // "group:tag" -> edges carrying the tag before pruning
  steerAfter: new Map(),   // "group:tag" -> edges carrying the tag after pruning
  extrasHist: new Map(),   // extras appended -> edge count
  newTitles: new Set(),    // distinct strings that ship only because they back a claim
};
const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);

const out = {};
let kept = 0;
for (const key of Object.keys(edges).sort()) {
  const e = edges[key];
  if (e.n < MIN_EDGE) continue;

  const dishT = tieredTags(e.dish, e.n, 3, MIN_TAG_SHARE);
  const method = keepTags(e.method, e.n, methodI, 3, MIN_TAG_SHARE); // display-only, strict
  const cuisineT = tieredTags(e.cuisine, e.n, 2, MIN_CUISINE_SHARE);

  // Primary titles: unchanged prototypicality selection (kept byte-identical for the
  // unsteered "seen in" display via primaryTitleCount). One-off single-site titles never ship.
  let titles = (e.titles || [])
    .filter(([, c, cur]) => c >= 2 || cur >= 1)
    .map(([t, c, cur]) => [tidyTitle(t), (c + 2 * cur) * lengthFactor(t)])
    .filter(([t]) => t)
    .sort((x, y) => y[1] - x[1])
    .slice(0, MAX_TITLES);
  if (titles.length === 0 && e.titles?.[0]) {
    const tidied = tidyTitle(e.titles[0][0]);
    if (tidied) titles = [[tidied, 0]];
  }
  const primaryTitles = titles.map(([t]) => t);

  // Receipt-backing: every steering-tier dish/cuisine claim must ship >=1 title that
  // classifies to it. Primaries cover some; for the rest, pull the best per-tag candidate
  // (tidy → re-verify tag survives → score). One extra can cover several claims, so we
  // re-check coverage after each append. Uncovered claims are pruned below.
  const clsCache = new Map();
  const cls = (t) => { let c = clsCache.get(t); if (!c) { c = classifyTitle(t); clsCache.set(t, c); } return c; };
  const allTitles = [...primaryTitles];
  const covered = (group, tag) => allTitles.some(t => cls(t)[group].has(tag));

  const dishCount = new Map(e.dish);
  const cuisineCount = new Map(e.cuisine);
  const claims = [
    ...dishT.tags.map((tag, i) => ({ group: 'dish', tag, display: i < dishT.displayCount, count: dishCount.get(tag) || 0, cands: e.dishTitles && e.dishTitles[tag] })),
    ...cuisineT.tags.map((tag, i) => ({ group: 'cuisine', tag, display: i < cuisineT.displayCount, count: cuisineCount.get(tag) || 0, cands: e.cuisineTitles && e.cuisineTitles[tag] })),
  ];
  // Cap priority (only used when --max-extra-titles > 0): display-tier claims first, then
  // loose by count desc. Uncapped default leaves final order irrelevant.
  claims.sort((a, b) => (Number(b.display) - Number(a.display)) || (b.count - a.count));

  let extrasAdded = 0;
  for (const claim of claims) {
    if (MAX_EXTRA_TITLES > 0 && extrasAdded >= MAX_EXTRA_TITLES) break;
    if (covered(claim.group, claim.tag)) continue;
    let best = null; let bestScore = -Infinity;
    for (const [rawT, c, cur] of claim.cands || []) {
      const tt = tidyTitle(rawT);
      if (!tt) continue;
      if (!cls(tt)[claim.group].has(claim.tag)) continue; // tag must survive tidying
      let score = (c + 2 * cur) * lengthFactor(tt);
      if (titleI.has(tt)) score += 0.001; // prefer already-interned strings on ties
      if (score > bestScore) { bestScore = score; best = tt; }
    }
    if (best && !allTitles.includes(best)) {
      allTitles.push(best);
      extrasAdded++;
      stats.newTitles.add(best);
    }
  }

  // Prune unbacked claims, preserving display-first-then-loose order.
  const prune = (group, claim) => {
    const displayTags = claim.tags.slice(0, claim.displayCount);
    const tags = claim.tags.filter(tag => covered(group, tag));
    return { tags, displayCount: tags.filter(t => displayTags.includes(t)).length };
  };
  const dishP = prune('dish', dishT);
  const cuisineP = prune('cuisine', cuisineT);

  if (DRY) {
    stats.claimsBefore += dishT.tags.length + cuisineT.tags.length;
    stats.claimsAfter += dishP.tags.length + cuisineP.tags.length;
    stats.extrasHist.set(extrasAdded, (stats.extrasHist.get(extrasAdded) || 0) + 1);
    for (const [group, before, after] of [['dish', dishT, dishP], ['cuisine', cuisineT, cuisineP]]) {
      const keptSet = new Set(after.tags);
      for (const tag of before.tags) {
        bump(stats.steerBefore, `${group}:${tag}`);
        if (keptSet.has(tag)) bump(stats.steerAfter, `${group}:${tag}`);
        else bump(stats.pruned, `${group}:${tag}`);
      }
    }
  }

  const dishIdxs = dishP.tags.map(t => dishI.intern(t));
  const cuisineIdxs = cuisineP.tags.map(t => cuisineI.intern(t));
  const titleIdxs = allTitles.map(t => titleI.intern(t));
  const primaryTitleCount = primaryTitles.length;

  if (dishIdxs.length + method.length + cuisineIdxs.length + titleIdxs.length === 0) continue;
  out[key] = [e.n, dishIdxs, method, cuisineIdxs, titleIdxs, dishP.displayCount, cuisineP.displayCount, primaryTitleCount];
  kept++;
}

// ---- emit TypeScript ----
const entries = Object.keys(out)
  .map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(out[k])},`)
  .join('\n');

const file = `// data/pairingContext.ts
//
// Dish context for pairing edges, mined from the RecipeNLG corpus (${recipesRead} recipes).
// GENERATED by tooling/pairing-pipeline/merge-context.mjs — do not hand-edit.
//
// This annotates edges the flavor graph already has (it never adds or scores edges):
// which kinds of dishes a pairing shows up in, how those dishes are cooked, which
// cuisines claim it, and a few concrete recipe titles as receipts.
//
// Encoding: per edge (key = pairKey(a, b)) a tuple
//   [recipeCount, dishTypeIdxs, methodIdxs, cuisineIdxs, titleIdxs,
//    dishDisplayCount, cuisineDisplayCount, primaryTitleCount]
// with indices into the string tables below. Dish/cuisine arrays are TWO-TIER:
// the first dishDisplayCount/cuisineDisplayCount entries passed the strict display
// floors (what the strip shows); the remainder passed only the looser steering bar
// (>=2 recipes, >=5% share) and exist so tag steering doesn't overstate mismatch.
//
// STEER-RECEIPT INVARIANT: every dish/cuisine idx (display AND loose) is backed by >=1
// title in titleIdxs that classifies to it (via CONTEXT_TAG_KEYWORDS). titleIdxs holds
// primaries first (the leading primaryTitleCount — the unchanged unsteered "seen in"
// display) then "extra" receipts appended solely to back an otherwise-uncovered steer
// claim. So steering by a tag can always surface an honest receipt that carries it.
// Decode via src/utils/pairingContext.ts.

export type PairingContextEntry = [
  /** recipes containing both ingredients */ number,
  /** indices into CONTEXT_DISH_TYPES (display tier first, then loose tier) */ number[],
  /** indices into CONTEXT_METHODS (display tier only) */ number[],
  /** indices into CONTEXT_CUISINES (display tier first, then loose tier) */ number[],
  /** indices into CONTEXT_TITLES (primaries first, then steer-backing extras) */ number[],
  /** how many leading dish idxs are display-tier */ number,
  /** how many leading cuisine idxs are display-tier */ number,
  /** how many leading titleIdxs are primaries (the unsteered display slice) */ number,
];

export const CONTEXT_DISH_TYPES: string[] = ${JSON.stringify(dishI.list)};

export const CONTEXT_METHODS: string[] = ${JSON.stringify(methodI.list)};

export const CONTEXT_CUISINES: string[] = ${JSON.stringify(cuisineI.list)};

export const CONTEXT_TITLES: string[] = ${JSON.stringify(titleI.list)};

// Dish/cuisine tag keyword lists (verbatim from context-vocab.json). The client rebuilds
// the exact classifier regex from these to filter receipts by steer tag at runtime, so
// merge-time pruning and client-time filtering can never disagree.
export const CONTEXT_TAG_KEYWORDS: { dish: Record<string, string[]>; cuisine: Record<string, string[]> } = ${JSON.stringify({ dish: vocab.dishTypes, cuisine: vocab.cuisines })};

export const pairingContext: Record<string, PairingContextEntry> = {
${entries}
};
`;

const outPath = path.join(REPO_ROOT, 'src', 'data', 'pairingContext.ts');
const rawKb = (Buffer.byteLength(file) / 1024).toFixed(0);
const gz = zlib.gzipSync(Buffer.from(file));
const gzKb = (gz.length / 1024).toFixed(0);
const BASELINE_GZ = 468; // shipped pairingContext chunk, July 8 (post classifier-precision re-mine)

// ---- in-process steer-receipt invariant: every shipped tag has a backing receipt ----
// (check-context-invariant.mjs re-derives this from the emitted TS as an independent gate.)
let failures = 0;
for (const [key, entry] of Object.entries(out)) {
  const [, dishIdxs, , cuisineIdxs, titleIdxs, dishDisplay, cuisineDisplay, primaryCount] = entry;
  const backed = { dish: new Set(), cuisine: new Set() };
  for (const ti of titleIdxs) {
    const c = classifyTitle(titleI.list[ti]);
    for (const t of c.dish) backed.dish.add(t);
    for (const t of c.cuisine) backed.cuisine.add(t);
  }
  for (const di of dishIdxs) if (!backed.dish.has(dishI.list[di])) { console.error(`INVARIANT ${key}: dish "${dishI.list[di]}" has no backing receipt`); failures++; }
  for (const ci of cuisineIdxs) if (!backed.cuisine.has(cuisineI.list[ci])) { console.error(`INVARIANT ${key}: cuisine "${cuisineI.list[ci]}" has no backing receipt`); failures++; }
  if (primaryCount > titleIdxs.length) { console.error(`INVARIANT ${key}: primaryTitleCount > titleIdxs`); failures++; }
  if (dishDisplay > dishIdxs.length || cuisineDisplay > cuisineIdxs.length) { console.error(`INVARIANT ${key}: displayCount > idxs`); failures++; }
}
if (failures) { console.error(`\n${failures} invariant violation(s) — aborting, not writing.`); process.exit(1); }

console.log(
  `edges kept: ${kept} | titles: ${titleI.list.length} | dish tags: ${dishI.list.length} | ` +
  `methods: ${methodI.list.length} | cuisines: ${cuisineI.list.length} | ` +
  `raw: ${rawKb} KB | gz: ${gzKb} KB (baseline ${BASELINE_GZ} KB, +${gzKb - BASELINE_GZ})`,
);

if (DRY) {
  const topN = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  // '*' marks a loose-tier tag, '+' marks a steer-backing extra receipt.
  const decode = (key) => {
    const en = out[key];
    if (!en) return `  ${key}: (dropped — no context survived)`;
    const [n, di, mi, ci, ti, dd, cd, pc] = en;
    const dish = di.map((x, i) => (i < dd ? dishI.list[x] : `${dishI.list[x]}*`));
    const cui = ci.map((x, i) => (i < cd ? cuisineI.list[x] : `${cuisineI.list[x]}*`));
    const titles = ti.map((x, i) => (i < pc ? `"${titleI.list[x]}"` : `+"${titleI.list[x]}"`));
    return `  ${key} (n=${n})\n    dish:    ${dish.join(', ') || '—'}\n    cuisine: ${cui.join(', ') || '—'}\n` +
      `    method:  ${mi.map(x => methodI.list[x]).join(', ') || '—'}\n    titles:  ${titles.join(', ') || '—'}`;
  };
  const SAMPLE_EDGES = [
    'banana,raisin', 'achiote,pork shoulder', 'gochujang,sesame oil', 'basil,tomato',
    'apple,cinnamon', 'chicken,lemon', 'harissa,carrot', 'miso,butter', 'fish sauce,lime',
    'sage,butternut squash',
  ];
  console.log(`\n=== dry-run report (steer-receipt alignment) ===`);
  console.log(`\nSteering claims: ${stats.claimsBefore} before → ${stats.claimsAfter} after ` +
    `(${stats.claimsBefore - stats.claimsAfter} pruned for want of a receipt)`);

  console.log(`\nExtras appended per edge (histogram):`);
  for (const [k, v] of [...stats.extrasHist.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${k} extra${k === 1 ? '' : 's'}: ${v} edges`);
  }
  console.log(`Distinct new titles shipped solely to back a claim: ${stats.newTitles.size}`);

  console.log(`\nMost-pruned claims (top 15, "group:tag" → claims dropped):`);
  for (const [k, v] of topN(stats.pruned, 15)) console.log(`  ${k}: ${v}`);

  console.log(`\nPer-tag steered-edge counts (before → after; top 25 by before):`);
  for (const [k, before] of topN(stats.steerBefore, 25)) {
    const after = stats.steerAfter.get(k) || 0;
    const delta = after - before;
    console.log(`  ${k}: ${before} → ${after} (${delta >= 0 ? '+' : ''}${delta})`);
  }

  console.log(`\nSample edges (decoded; * = loose tier, + = extra receipt):`);
  for (const k of SAMPLE_EDGES) console.log(decode(k));

  console.log('\n--dry-run: not writing.');
} else {
  fs.writeFileSync(outPath, file);
  console.log(`Wrote ${path.relative(REPO_ROOT, outPath)}.`);
}
