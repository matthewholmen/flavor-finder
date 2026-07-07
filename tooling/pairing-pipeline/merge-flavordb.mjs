#!/usr/bin/env node
// tooling/pairing-pipeline/merge-flavordb.mjs
//
// Folds the FlavorDB (Phase 5) science-lens artifacts into src/. This is a SEPARATE,
// ADDITIVE step (like merge-context.mjs is separate from merge.mjs), not a regeneration:
// it parses the current pairingMeta.ts and layers flavordb on top, so it never disturbs the
// existing chef-canon / recipenlg / analog graph. (merge.mjs regenerates the recipenlg+analog
// base from the mining corpus; that corpus isn't needed — or present — to add flavordb.)
//
// Inputs (from flavordb.mjs): output/flavordb-edges.json, output/flavordb-aroma.json.
// Outputs:
//   - src/data/pairingMeta.ts  — flavordb corroborations tag existing edges; surprising pairs
//                                become new flavordb-only edges (off by default in generation).
//   - src/data/aromaProfiles.ts — per-ingredient aroma descriptors for the Atlas.
//
// Usage:  node merge-flavordb.mjs [--dry-run]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(__dirname, 'output');
const DRY = process.argv.includes('--dry-run');

const pairKey = (a, b) => (a <= b ? `${a},${b}` : `${b},${a}`);
const SRC_ORDER = ['flavorbible', 'recipenlg', 'flavordb', 'analog'];

// ---- load flavordb artifacts ----
const edgesPath = path.join(OUT_DIR, 'flavordb-edges.json');
const aromaPath = path.join(OUT_DIR, 'flavordb-aroma.json');
if (!fs.existsSync(edgesPath) || !fs.existsSync(aromaPath)) {
  console.error('Missing output/flavordb-{edges,aroma}.json. Run flavordb.mjs first.');
  process.exit(1);
}
const { corroborations = [], surprising = [] } = JSON.parse(fs.readFileSync(edgesPath, 'utf8'));
const aroma = JSON.parse(fs.readFileSync(aromaPath, 'utf8'));

// ---- parse the current pairingMeta into an editable edge map ----
const metaPath = path.join(REPO_ROOT, 'src', 'data', 'pairingMeta.ts');
const metaSrc = fs.readFileSync(metaPath, 'utf8');
const splitAt = metaSrc.indexOf('export const pairingMeta');
if (splitAt < 0) { console.error('Could not find `export const pairingMeta` in pairingMeta.ts'); process.exit(1); }
const header = metaSrc.slice(0, splitAt);

// key -> { sources: Set, strength?: number }
const edges = new Map();
const entryRe = /"([^"]+,[^"]+)":\s*\{\s*sources:\s*(\[[^\]]*\])(?:,\s*strength:\s*(\d+))?\s*\}/g;
for (const m of metaSrc.matchAll(entryRe)) {
  const key = m[1];
  const sources = new Set(JSON.parse(m[2]));
  const strength = m[3] !== undefined ? Number(m[3]) : undefined;
  edges.set(key, { sources, strength });
}
const parsedBase = edges.size;

// Strip any flavordb artifacts from a previous run so re-runs are idempotent.
let strippedSurprising = 0;
for (const [key, e] of [...edges]) {
  if (e.sources.has('flavordb')) {
    e.sources.delete('flavordb');
    if (e.sources.size === 0) { edges.delete(key); strippedSurprising++; } // was a surprising-only edge
  }
}

// ---- layer flavordb on top ----
// Corroborations: the edge already exists (chef-canon or mined). Tag it 'flavordb'; a canon
// edge with no prior meta entry gets a source-only record (no invented strength).
let corrCount = 0;
for (const c of corroborations) {
  const k = pairKey(c.a, c.b);
  let e = edges.get(k);
  if (!e) { e = { sources: new Set(), strength: undefined }; edges.set(k, e); }
  e.sources.add('flavordb');
  corrCount++;
}
// Surprising: molecular overlap with NO culinary edge → a brand-new flavordb-only edge with a
// strength. Off by default in generation; the Atlas shows these in a distinct shelf.
let surpriseCount = 0;
for (const s of surprising) {
  const k = pairKey(s.a, s.b);
  let e = edges.get(k);
  if (!e) { e = { sources: new Set(), strength: undefined }; edges.set(k, e); }
  e.sources.add('flavordb');
  if (s.strength != null && (e.strength === undefined || s.strength > e.strength)) e.strength = s.strength;
  surpriseCount++;
}

// ---- emit pairingMeta.ts (preserve every existing edge; strength optional) ----
const keys = [...edges.keys()].sort();
const entries = keys.map((k) => {
  const e = edges.get(k);
  const srcs = SRC_ORDER.filter((s) => e.sources.has(s));
  const strengthPart = e.strength === undefined ? '' : `, strength: ${e.strength}`;
  return `  ${JSON.stringify(k)}: { sources: ${JSON.stringify(srcs)}${strengthPart} },`;
}).join('\n');
const nextMeta =
  header +
  `export const pairingMeta: Record<string, PairingInfo> = {\n` +
  `  // GENERATED: recipenlg+analog base via merge.mjs, flavordb layer via merge-flavordb.mjs.\n` +
  `  // Do not hand-edit. ${keys.length} edges (flavordb: ${corrCount} corrob., ${surpriseCount} surprising).\n` +
  `${entries}\n};\n`;

// ---- emit aromaProfiles.ts ----
const aromaKeys = Object.keys(aroma).sort();
const aromaBody = aromaKeys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(aroma[k])},`).join('\n');
const aromaTs =
  `// data/aromaProfiles.ts\n` +
  `//\n` +
  `// Per-ingredient aroma/flavor descriptors mined from FlavorDB2 flavor molecules\n` +
  `// (tooling/pairing-pipeline/flavordb.mjs). Kept when well-attested across the food's\n` +
  `// molecules AND distinctive vs the baseline every food shares, so these read as an\n` +
  `// ingredient's signature notes, not the generic "sweet / green / fruity" all foods share.\n` +
  `//\n` +
  `// A food-science LENS, not a pairing rule: the shared-compound hypothesis is culture-\n` +
  `// dependent. These descriptors describe smell/taste; they never gate compatibility.\n` +
  `//\n` +
  `// GENERATED by tooling/pairing-pipeline/merge-flavordb.mjs — do not hand-edit. ${aromaKeys.length} ingredients.\n` +
  `export const aromaProfiles: Record<string, string[]> = {\n${aromaBody}\n};\n`;

console.log(`Parsed ${parsedBase} existing edges (stripped ${strippedSurprising} prior surprising, cleared prior flavordb tags).`);
console.log(`flavordb: ${corrCount} corroborations + ${surpriseCount} surprising → ${keys.length} total edges.`);
console.log(`aroma: ${aromaKeys.length} ingredients.`);
if (DRY) {
  console.log('--dry-run: not writing.');
} else {
  fs.writeFileSync(metaPath, nextMeta);
  fs.writeFileSync(path.join(REPO_ROOT, 'src', 'data', 'aromaProfiles.ts'), aromaTs);
  console.log('Wrote src/data/pairingMeta.ts and src/data/aromaProfiles.ts.');
}
