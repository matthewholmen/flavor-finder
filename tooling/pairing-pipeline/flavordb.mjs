#!/usr/bin/env node
// tooling/pairing-pipeline/flavordb.mjs
//
// Phase 5 of the pairing pipeline: the molecular "food science lens" (FlavorDB2, IIIT-Delhi;
// Garg et al.). Maps FlavorDB food entities onto the app's canonical vocabulary, then uses
// the shared flavor-molecule sets between two foods as the "shared aroma compounds" signal
// behind Ahn et al.'s (2011) food-pairing hypothesis.
//
// IMPORTANT framing (mirrored in the UI): the shared-compound hypothesis is culture-
// dependent — Western cuisines favor shared compounds, many East Asian cuisines avoid them.
// This is a lens, not a law. Nothing here relaxes the pairing algorithm: molecular edges are
// a separate, off-by-default `flavordb` source; the compatibility check is untouched.
//
// Emits three artifacts into output/ (gitignored; merge.mjs folds them into src/):
//   - flavordb-edges.json    corroborations (existing edges with molecular support) +
//                            surprising pairs (cross-category molecular overlap, no culinary edge)
//   - flavordb-aroma.json    per-ingredient aroma descriptors (the richness behind `aromatic`)
//   - flavordb-report.md     coverage + audit summary for human review
//
// Usage:
//   node flavordb.mjs [--data-dir flavordb-data]
//                     [--corr-min 0.12] [--surprise-min 0.20] [--surprise-per 6]
//                     [--near-dup 0.85] [--aroma-top 7]

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, PIPELINE_DIR, loadEdgeSet, pairKey } from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'output');

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const DATA_DIR = path.join(__dirname, getArg('data-dir', 'flavordb-data'));
const CORR_MIN = Number(getArg('corr-min', '0.12'));      // molecular support to corroborate an existing edge
const SURPRISE_MIN = Number(getArg('surprise-min', '0.20')); // overlap to propose a cross-category discovery
const SURPRISE_PER = Number(getArg('surprise-per', '6'));  // cap surprising pairs kept per ingredient
const NEAR_DUP = Number(getArg('near-dup', '0.85'));       // Jaccard above which a pair is a near-duplicate profile
const AROMA_TOP = Number(getArg('aroma-top', '7'));

// FlavorDB categories that are composites (dishes, blends, distillates, additives) rather
// than whole single foods. Per the pipeline README, Phase 5 is "single whole-foods only":
// molecular overlap between an ingredient and a distillate/dish of itself is meaningless.
const SKIP_CATEGORIES = new Set([
  'Essential Oil', 'Dish', 'Additive', 'Plant Derivative',
  'Beverage', 'Beverage Caffeinated', 'Fruit Essence',
]);

// Descriptors from FlavorDB's `flavor_profile` that carry no culinary meaning.
const AROMA_STOPWORDS = new Set([
  'odorless', 'tasteless', 'bland', 'flat', 'faint', 'mild', 'weak', 'none',
  'characteristic', 'sweet-like', 'no odor', 'not available', 'na',
]);

// ---- name normalization + canonical matcher (tight, exact-only) ----------------------
//
// The recipe-mining matcher (lib.buildMatcher) is deliberately fuzzy for NER phrases; that
// looseness would corrupt the molecular signal (mapping "Lemon sole" the fish onto "lemon").
// Molecular mapping demands precision, so we match only on an exact normalized name equal to
// a canonical ingredient or one of its vocab.json synonyms.

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const singular = (s) => s.replace(/ies$/, 'y').replace(/([^s])s$/, '$1').replace(/es$/, 'e');
const nameVariants = (s) => new Set([norm(s), singular(norm(s))]);

const loadCanonical = () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'src', 'data', 'ingredientProfiles.ts'), 'utf8');
  const catOf = new Map();
  // Split into per-profile blocks so name↔category stay paired.
  for (const block of src.split(/},\s*{/)) {
    const nm = block.match(/name:\s*"([^"]+)"/);
    const ct = block.match(/category:\s*"([^"]+)"/);
    if (nm && ct) catOf.set(nm[1], ct[1]);
  }
  return catOf;
};

const buildNameIndex = (catOf) => {
  const { synonyms } = JSON.parse(fs.readFileSync(path.join(PIPELINE_DIR, 'vocab.json'), 'utf8'));
  const index = new Map(); // normalized variant -> canonical name
  for (const c of catOf.keys()) for (const v of nameVariants(c)) if (!index.has(v)) index.set(v, c);
  for (const [alias, target] of Object.entries(synonyms)) {
    if (!catOf.has(target)) continue;
    for (const v of nameVariants(alias)) if (!index.has(v)) index.set(v, target);
  }
  return index;
};

// ---- molecule identity + template detection ------------------------------------------

const moleculeIds = (entity) =>
  [...new Set(entity.molecules.map((m) => m.pubchem_id || `cn:${m.common_name}`))];

const molHash = (entity) =>
  crypto.createHash('md5').update(moleculeIds(entity).sort().join(',')).digest('hex');

// ---- load + map entities -------------------------------------------------------------

const loadEntities = () =>
  fs.readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')));

/** Map canonical ingredient -> its best FlavorDB entity. A canonical wins the raw-exact
 *  entity (alias === canonical) over a synonym match, then the richer molecule set. */
const mapEntities = (entities, nameIndex, templateHashes) => {
  const chosen = new Map(); // canonical -> { entity, score }
  const stats = { skippedCat: 0, templated: 0, unmatched: 0 };
  for (const e of entities) {
    if (SKIP_CATEGORIES.has(e.category_readable)) { stats.skippedCat++; continue; }
    if (templateHashes.has(molHash(e))) { stats.templated++; continue; }
    const names = [e.entity_alias_readable, e.entity_alias, ...(e.entity_alias_synonyms || '').split(',')]
      .map((s) => (s || '').trim())
      .filter(Boolean);
    let hit = null;
    let rawExact = false;
    for (const nm of names) {
      for (const v of nameVariants(nm)) {
        if (nameIndex.has(v)) { hit = nameIndex.get(v); rawExact = norm(nm) === norm(hit); break; }
      }
      if (hit) break;
    }
    if (!hit) { stats.unmatched++; continue; }
    const score = (rawExact ? 1e6 : 0) + e.molecules.length;
    if (!chosen.has(hit) || score > chosen.get(hit).score) chosen.set(hit, { entity: e, score });
  }
  return { chosen, stats };
};

// ---- scoring -------------------------------------------------------------------------

/** IDF-weighted cosine over shared molecules: distinctive (rare) compounds count, ubiquitous
 *  ones (present in nearly every food) contribute ~0. This is the robust form of the
 *  shared-compound signal — it resists both the "everything shares esters" baseline and
 *  set-size skew that raw shared-count / plain Jaccard suffer from. */
const makeScorer = (molSets) => {
  const names = [...molSets.keys()];
  const N = names.length;
  const df = new Map();
  for (const c of names) for (const m of molSets.get(c)) df.set(m, (df.get(m) || 0) + 1);
  const idf = (m) => Math.log(N / df.get(m));
  const weightNorm = new Map();
  for (const c of names) {
    let s = 0;
    for (const m of molSets.get(c)) { const w = idf(m); s += w * w; }
    weightNorm.set(c, Math.sqrt(s));
  }
  const cosine = (a, b) => {
    const A = molSets.get(a); const B = molSets.get(b);
    const [small, large] = A.size <= B.size ? [A, B] : [B, A];
    let dot = 0;
    for (const m of small) if (large.has(m)) { const w = idf(m); dot += w * w; }
    const denom = weightNorm.get(a) * weightNorm.get(b);
    return denom ? dot / denom : 0;
  };
  const jaccard = (a, b) => {
    const A = molSets.get(a); const B = molSets.get(b);
    const [small, large] = A.size <= B.size ? [A, B] : [B, A];
    let shared = 0;
    for (const m of small) if (large.has(m)) shared++;
    return shared / (A.size + B.size - shared);
  };
  return { names, cosine, jaccard };
};

/** Map cosine to a 0-10 strength for surprising edges. Floor of 3 keeps them above the
 *  generator's weak-edge prune (maxStrength 2) so a curated discovery survives, while the
 *  ceiling keeps molecular-only edges from dominating chef/corpus edges in generation. */
const surpriseStrength = (cos) => Math.max(3, Math.min(8, Math.round(cos * 12)));

// ---- aroma descriptors ---------------------------------------------------------------

/** Per-ingredient aroma descriptors: FlavorDB `flavor_profile` terms across the ingredient's
 *  molecules, kept when well-attested (support floor) and distinctive (descriptor-IDF), so we
 *  surface "garlic / sulfurous / nutty" rather than the "sweet / green / fruity" baseline that
 *  every food shares. This is the first real texture behind the app's `aromatic` dimension. */
const extractAroma = (chosen) => {
  const perIng = new Map(); // canonical -> Map(descriptor -> molecule count), plus molecule total
  for (const [c, { entity }] of chosen) {
    const freq = new Map();
    for (const m of entity.molecules) {
      const seen = new Set();
      for (const raw of (m.flavor_profile || '').split('@')) {
        const t = raw.trim().toLowerCase();
        if (!t || t.length > 16 || seen.has(t)) continue;
        if (AROMA_STOPWORDS.has(t) || !/^[a-z][a-z '-]*$/.test(t)) continue;
        seen.add(t);
        freq.set(t, (freq.get(t) || 0) + 1);
      }
    }
    perIng.set(c, { freq, total: entity.molecules.length });
  }
  const ddf = new Map(); // descriptor -> # ingredients carrying it
  for (const [, { freq }] of perIng) for (const d of freq.keys()) ddf.set(d, (ddf.get(d) || 0) + 1);
  const Ni = perIng.size;
  const descIdf = (d) => Math.log(Ni / ddf.get(d));

  const aroma = {};
  for (const [c, { freq, total }] of perIng) {
    const floor = Math.max(4, Math.ceil(total * 0.06));
    const ranked = [...freq]
      .filter(([d, n]) => n >= floor && ddf.get(d) < Ni * 0.97) // attested + not near-ubiquitous
      .map(([d, n]) => [d, (n / total) * descIdf(d)])
      .sort((a, b) => b[1] - a[1])
      .slice(0, AROMA_TOP)
      .map(([d]) => d);
    if (ranked.length) aroma[c] = ranked;
  }
  return aroma;
};

// ---- main ----------------------------------------------------------------------------

const main = () => {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`No FlavorDB snapshot at ${path.relative(process.cwd(), DATA_DIR)}/. Run flavordb-fetch.mjs first.`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const entities = loadEntities();
  // Template detection over the WHOLE snapshot: FlavorDB assigns some under-characterized
  // foods an identical placeholder molecule set. Two genuinely different foods never share a
  // byte-identical molecule list, so any set appearing more than once is a template artifact.
  const hashCount = new Map();
  for (const e of entities) { const h = molHash(e); hashCount.set(h, (hashCount.get(h) || 0) + 1); }
  const templateHashes = new Set([...hashCount].filter(([, n]) => n > 1).map(([h]) => h));

  const catOf = loadCanonical();
  const nameIndex = buildNameIndex(catOf);
  const { chosen, stats } = mapEntities(entities, nameIndex, templateHashes);

  const molSets = new Map();
  for (const [c, { entity }] of chosen) molSets.set(c, new Set(moleculeIds(entity)));
  const { names, cosine, jaccard } = makeScorer(molSets);

  const edgeSet = loadEdgeSet();

  // Pairwise scan → corroborations (existing edges) + surprising candidates (cross-category).
  const corroborations = [];
  const surpriseByIng = new Map(); // canonical -> [{a,b,cos}]
  const pushSurprise = (ing, rec) => {
    if (!surpriseByIng.has(ing)) surpriseByIng.set(ing, []);
    surpriseByIng.get(ing).push(rec);
  };
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i]; const b = names[j];
      const cos = cosine(a, b);
      if (cos <= 0) continue;
      if (edgeSet.has(pairKey(a, b))) {
        if (cos >= CORR_MIN) corroborations.push({ a, b, cos: +cos.toFixed(3) });
        continue;
      }
      // Surprising: no culinary edge. Cross-category only (same-category molecular overlap is
      // expected — two wines, two cheeses — and uninsightful). Guard near-duplicate profiles.
      if (catOf.get(a) === catOf.get(b)) continue;
      if (cos < SURPRISE_MIN) continue;
      if (jaccard(a, b) > NEAR_DUP) continue;
      const rec = { a, b, cos: +cos.toFixed(3) };
      pushSurprise(a, rec);
      pushSurprise(b, rec);
    }
  }

  // Keep each ingredient's strongest surprising pairs (both endpoints must have kept it), so
  // the Atlas shelf stays a tight highlight reel rather than a dump.
  const keptKeys = new Set();
  for (const [, recs] of surpriseByIng) {
    recs.sort((x, y) => y.cos - x.cos);
    for (const r of recs.slice(0, SURPRISE_PER)) keptKeys.add(pairKey(r.a, r.b));
  }
  const surprising = [];
  const seen = new Set();
  for (const [, recs] of surpriseByIng) {
    for (const r of recs) {
      const k = pairKey(r.a, r.b);
      if (!keptKeys.has(k) || seen.has(k)) continue;
      seen.add(k);
      surprising.push({ a: r.a, b: r.b, cos: r.cos, strength: surpriseStrength(r.cos) });
    }
  }
  surprising.sort((x, y) => y.cos - x.cos);

  const aroma = extractAroma(chosen);

  // ---- write artifacts ----
  fs.writeFileSync(
    path.join(OUT_DIR, 'flavordb-edges.json'),
    JSON.stringify({
      meta: { mapped: names.length, corrMin: CORR_MIN, surpriseMin: SURPRISE_MIN, surprisePer: SURPRISE_PER, nearDup: NEAR_DUP },
      corroborations,
      surprising,
    }, null, 0),
  );
  fs.writeFileSync(path.join(OUT_DIR, 'flavordb-aroma.json'), JSON.stringify(aroma, null, 0));

  // ---- report ----
  const byCat = new Map();
  for (const c of names) { const cat = catOf.get(c) || '—'; byCat.set(cat, (byCat.get(cat) || 0) + 1); }
  const report = [
    '# FlavorDB (Phase 5) — molecular science lens',
    '',
    `Snapshot: ${entities.length} entities. Template (placeholder) sets excluded: ${[...hashCount].filter(([, n]) => n > 1).reduce((s, [, n]) => s + n, 0)} entities across ${templateHashes.size} sets.`,
    `Skipped composite categories: ${stats.skippedCat}. Unmatched to vocab: ${stats.unmatched}. Templated among candidates: ${stats.templated}.`,
    '',
    `**Mapped ingredients: ${names.length}** (unique molecule profiles).`,
    ...[...byCat].sort((a, b) => b[1] - a[1]).map(([cat, n]) => `- ${cat}: ${n}`),
    '',
    `## Corroborations (existing edges with molecular support, cos ≥ ${CORR_MIN}): ${corroborations.length}`,
    '',
    `## Surprising pairs (cross-category, no culinary edge, cos ≥ ${SURPRISE_MIN}, ≤${SURPRISE_PER}/ingredient): ${surprising.length}`,
    '',
    ...surprising.slice(0, 60).map((r) => `- ${r.a} (${catOf.get(r.a)}) + ${r.b} (${catOf.get(r.b)}) — cos ${r.cos}, strength ${r.strength}`),
    '',
    `## Aroma descriptors: ${Object.keys(aroma).length} ingredients`,
    '',
    ...Object.entries(aroma).slice(0, 40).map(([c, ds]) => `- ${c}: ${ds.join(', ')}`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'flavordb-report.md'), report);

  console.log(`Mapped ${names.length} ingredients.`);
  console.log(`  ${corroborations.length} corroborations, ${surprising.length} surprising pairs, ${Object.keys(aroma).length} aroma profiles.`);
  console.log(`Artifacts in ${path.relative(process.cwd(), OUT_DIR)}/ (flavordb-edges.json, flavordb-aroma.json, flavordb-report.md).`);
  console.log('Review the report, then run: node merge.mjs --min-strength 2');
};

main();
