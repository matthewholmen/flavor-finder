#!/usr/bin/env node
// tooling/pairing-pipeline/check-context-invariant.mjs
//
// Independent gate on the shipped src/data/pairingContext.ts: re-derives the steer-receipt
// invariant straight from the generated TypeScript, so a hand-edit or a merge bug can't
// slip an unbacked steering claim past. merge-context.mjs runs the same assert in-process
// before writing; this checks the file that actually shipped.
//
// Invariant, per edge:
//   - every dish/cuisine idx (display AND loose tier) has >=1 title in titleIdxs that
//     classifies to it, using the SAME regex the client builds from CONTEXT_TAG_KEYWORDS.
//   - primaryTitleCount <= titleIdxs.length
//   - dishDisplayCount <= dishIdxs.length; cuisineDisplayCount <= cuisineIdxs.length
//
// Usage: node check-context-invariant.mjs   (exit 0 = pass, 1 = violations)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(REPO_ROOT, 'src', 'data', 'pairingContext.ts');
const src = fs.readFileSync(srcPath, 'utf8');

// Extract a JSON literal following `<marker> ... = <value>` (value = matched [..]/{..} block).
const extractJson = (marker) => {
  const at = src.indexOf(marker);
  if (at < 0) throw new Error(`marker not found: ${marker}`);
  let i = src.indexOf('=', at) + 1;
  while (/\s/.test(src[i])) i++;
  const open = src[i];
  const close = open === '[' ? ']' : '}';
  let depth = 0; let inStr = false; let esc = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) {
        // The generated object emits a trailing comma per entry (`],\n};`); JSON.parse
        // rejects those. Strip commas that directly precede a closing bracket — safe here
        // since a comma inside a title string is always followed by `"`, never `}`/`]`.
        return JSON.parse(src.slice(i, j + 1).replace(/,(\s*[}\]])/g, '$1'));
      }
    }
  }
  throw new Error(`unterminated literal for: ${marker}`);
};

// Anchor on `export const NAME` so a mention of the same name in a header comment
// (e.g. "via CONTEXT_TAG_KEYWORDS") can't be matched ahead of the real declaration.
const DISH_TYPES = extractJson('export const CONTEXT_DISH_TYPES');
const CUISINES = extractJson('export const CONTEXT_CUISINES');
const TITLES = extractJson('export const CONTEXT_TITLES');
const KEYWORDS = extractJson('export const CONTEXT_TAG_KEYWORDS');
const CTX = extractJson('export const pairingContext');

// Rebuild the classifier — byte-for-byte the same construction as lib.mjs / the client.
// "!"-prefixed keyword entries are exclusions: tag fires only when a positive keyword
// matches AND no exclusion phrase does.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const alternation = (kws) =>
  new RegExp(`(?:^|[^a-z])(?:${kws.map(esc).join('|')})(?:e?s)?(?=[^a-z]|$)`);
const compile = (group) => {
  const m = new Map();
  for (const [tag, entries] of Object.entries(group)) {
    const pos = entries.filter((k) => !k.startsWith('!'));
    const neg = entries.filter((k) => k.startsWith('!')).map((k) => k.slice(1));
    m.set(tag, { pos: alternation(pos), neg: neg.length ? alternation(neg) : null });
  }
  return m;
};
const dishRe = compile(KEYWORDS.dish);
const cuisineRe = compile(KEYWORDS.cuisine);
const carries = (reMap, tag, titleLower) => {
  const res = reMap.get(tag);
  return res ? res.pos.test(titleLower) && !(res.neg && res.neg.test(titleLower)) : false;
};

let failures = 0;
let edgesChecked = 0;
for (const [key, entry] of Object.entries(CTX)) {
  edgesChecked++;
  const [, dishIdxs, , cuisineIdxs, titleIdxs, dishDisplay, cuisineDisplay, primaryCount] = entry;
  const titleLowers = titleIdxs.map((ti) => TITLES[ti].toLowerCase());

  for (const di of dishIdxs) {
    const tag = DISH_TYPES[di];
    if (!titleLowers.some((t) => carries(dishRe, tag, t))) {
      console.error(`FAIL ${key}: dish "${tag}" has no backing receipt in titleIdxs`);
      failures++;
    }
  }
  for (const ci of cuisineIdxs) {
    const tag = CUISINES[ci];
    if (!titleLowers.some((t) => carries(cuisineRe, tag, t))) {
      console.error(`FAIL ${key}: cuisine "${tag}" has no backing receipt in titleIdxs`);
      failures++;
    }
  }
  if (primaryCount > titleIdxs.length) {
    console.error(`FAIL ${key}: primaryTitleCount ${primaryCount} > titleIdxs ${titleIdxs.length}`);
    failures++;
  }
  if (dishDisplay > dishIdxs.length) {
    console.error(`FAIL ${key}: dishDisplayCount ${dishDisplay} > dishIdxs ${dishIdxs.length}`);
    failures++;
  }
  if (cuisineDisplay > cuisineIdxs.length) {
    console.error(`FAIL ${key}: cuisineDisplayCount ${cuisineDisplay} > cuisineIdxs ${cuisineIdxs.length}`);
    failures++;
  }
}

if (failures) {
  console.error(`\n✗ ${failures} invariant violation(s) across ${edgesChecked} edges.`);
  process.exit(1);
}
console.log(`✓ steer-receipt invariant holds for all ${edgesChecked} edges.`);
