// tooling/recipe-match-test/run.ts
//
// Offline accuracy harness for the recipe-ingredient matcher (Phase X1 exit gate).
// Run: npm run match-test   (tsx — no build step, imports the real src modules)
//
// Gates:
//   - alias hygiene: every alias target is canonical; no alias/staple key shadows
//     a canonical name (a shadow would silently rewrite a perfectly good match)
//   - >= 90% of corpus lines resolve to the expected outcome
//   - ZERO false-confident matches (a non-fuzzy match that differs from expectation)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ingredientProfiles } from '../../src/data/ingredientProfiles.ts';
import {
  INGREDIENT_ALIASES,
  STAPLE_TERMS,
} from '../../src/data/ingredientAliases.ts';
import {
  matchRecipeText,
  matchedCanonicals,
} from '../../src/utils/recipeIngredientMatcher.ts';
import {
  analyzeRecipe,
  computeWeave,
  substitutesInRecipe,
} from '../../src/utils/recipeAnalysis.ts';

const DIR = path.dirname(fileURLToPath(import.meta.url));

interface CorpusEntry {
  line: string;
  expect?: string;
  staple?: string;
  header?: boolean;
}
const { lines } = JSON.parse(
  fs.readFileSync(path.join(DIR, 'corpus.json'), 'utf8'),
) as { lines: CorpusEntry[] };

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.error(`  ✗ ${msg}`);
};

// ---- 1. alias hygiene -------------------------------------------------------
console.log('Alias hygiene:');
const canonicalSet = new Set(ingredientProfiles.map(p => p.name));
for (const [alias, target] of Object.entries(INGREDIENT_ALIASES)) {
  if (!canonicalSet.has(target)) {
    fail(`alias "${alias}" -> "${target}" but target is not canonical`);
  }
  if (canonicalSet.has(alias)) {
    fail(`alias key "${alias}" shadows a canonical name`);
  }
}
for (const staple of Object.keys(STAPLE_TERMS)) {
  if (canonicalSet.has(staple)) {
    fail(`staple term "${staple}" shadows a canonical name`);
  }
}
if (failures === 0) console.log('  ✓ all alias targets canonical, no shadowing');

// ---- 2. corpus accuracy -----------------------------------------------------
console.log(`\nCorpus (${lines.length} lines):`);
const results = matchRecipeText(lines.map(l => l.line).join('\n'));
if (results.length !== lines.length) {
  fail(`parse-ingredient returned ${results.length} entries for ${lines.length} lines`);
}

let correct = 0;
let fuzzyHits = 0;
let falseConfident = 0;
for (let i = 0; i < lines.length; i++) {
  const want = lines[i];
  const got = results[i];
  if (!got) continue;

  const describe = got.isGroupHeader
    ? 'header'
    : got.match
      ? `${got.match.canonical} (${got.match.via})`
      : got.staple
        ? `staple:${got.staple}`
        : 'no match';

  let ok: boolean;
  if (want.header) {
    ok = got.isGroupHeader;
  } else if (want.staple) {
    ok = !got.match && got.staple === want.staple;
  } else if (want.expect) {
    ok = got.match?.canonical === want.expect;
    if (ok && got.match?.via === 'fuzzy') fuzzyHits++;
    if (!ok && got.match && got.match.via !== 'fuzzy') {
      falseConfident++;
      fail(`FALSE CONFIDENT "${want.line}" -> ${describe}, expected ${want.expect}`);
      continue;
    }
  } else {
    // expected unmatched
    ok = !got.match && !got.staple && !got.isGroupHeader;
    if (!ok && got.match && got.match.via !== 'fuzzy') {
      falseConfident++;
      fail(`FALSE CONFIDENT "${want.line}" -> ${describe}, expected no match`);
      continue;
    }
  }

  if (ok) {
    correct++;
  } else {
    fail(`"${want.line}" -> ${describe}, expected ${
      want.header ? 'header' : want.staple ? `staple:${want.staple}` : want.expect ?? 'no match'
    }`);
  }
}

const accuracy = correct / lines.length;
console.log(`\n  ${correct}/${lines.length} correct (${(accuracy * 100).toFixed(1)}%), ` +
  `${fuzzyHits} via fuzzy, ${falseConfident} false-confident`);

// ---- 3. end-to-end analysis smoke test -------------------------------------
console.log('\nAnalysis smoke test (pasta-night paste):');
const sample = [
  '1 pound spaghetti or other long pasta',
  '3 cloves garlic, minced',
  '1/4 cup extra-virgin olive oil',
  '1/2 teaspoon red pepper flakes',
  '1/4 cup grated Parmigiano-Reggiano',
  '1 bunch fresh basil leaves',
  '1 teaspoon kosher salt',
].join('\n');
const matched = matchRecipeText(sample);
const canonicals = matchedCanonicals(matched);
const analysis = analyzeRecipe(canonicals);
console.log(`  matched: ${canonicals.join(', ')}`);
console.log(`  core: ${analysis.core.join(', ')}`);
console.log(`  supporting: ${analysis.supporting.join(', ') || '(none)'}`);
console.log(`  coverage: ${analysis.confirmedCount}/${analysis.pairs.length} pairs confirmed ` +
  `(${(analysis.coverage * 100).toFixed(0)}%)`);
const unexplored = analysis.pairs.filter(p => !p.confirmed);
if (unexplored.length > 0) {
  console.log(`  unexplored: ${unexplored.map(p => `${p.a}+${p.b}`).join(', ')}`);
}
const firstCore = analysis.core[0];
if (firstCore) {
  const subs = analysis.substitutes[firstCore].map(s => s.name).slice(0, 4);
  console.log(`  substitutes for ${firstCore}: ${subs.join(', ') || '(none)'}`);
}
if (analysis.core.length < 3) fail('smoke test: expected >= 3 core ingredients');
if (analysis.pairs.length === 0) fail('smoke test: expected a pair matrix');

// ---- 4. recipe-scale helpers (the Flavor Report) ----------------------------
console.log('\nRecipe-scale smoke test (15-ingredient curry):');
const bigCore = [
  'chicken', 'onion', 'garlic', 'ginger', 'cumin', 'coriander', 'turmeric',
  'tomato', 'yogurt', 'cilantro', 'lime', 'basmati rice', 'cinnamon',
  'cardamom', 'clove',
];
const weave = computeWeave(bigCore);
console.log(`  most woven:  ${weave[0].name} (${weave[0].confirmed.length} of ${bigCore.length - 1})`);
const last = weave[weave.length - 1];
console.log(`  least woven: ${last.name} (${last.confirmed.length} of ${bigCore.length - 1})`);
if (weave.length !== bigCore.length) fail('weave: expected one row per core ingredient');
if (weave[0].confirmed.length < last.confirmed.length) fail('weave: not sorted most-woven first');
for (const row of weave) {
  if (row.confirmed.length + row.unexplored.length !== bigCore.length - 1) {
    fail(`weave: ${row.name} partners don't sum to core-1`);
  }
}
const bigSubs = substitutesInRecipe('cilantro', bigCore, 5);
console.log(`  subs for cilantro (confirmed-context): ${bigSubs.map(s => s.name).join(', ') || '(none)'}`);
if (bigSubs.length === 0) fail('substitutesInRecipe: expected candidates at recipe scale');

// ---- verdict ---------------------------------------------------------------
if (falseConfident > 0) {
  console.error('\nFAIL: false-confident matches present.');
  process.exit(1);
}
if (accuracy < 0.9) {
  console.error(`\nFAIL: accuracy ${(accuracy * 100).toFixed(1)}% below the 90% gate.`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`\nFAIL: ${failures} issue(s).`);
  process.exit(1);
}
console.log('\nPASS');
