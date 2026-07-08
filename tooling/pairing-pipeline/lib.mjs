// tooling/pairing-pipeline/lib.mjs
//
// Shared plumbing for the mining passes (mine.mjs, context.mjs): CLI args, streaming
// CSV parsing, and the canonical-ingredient matcher built from the app's profiles +
// vocab.json synonyms.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const PIPELINE_DIR = __dirname;

// ---- CLI args ----
export const makeGetArg = (args) => (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};

// ---- canonical, order-independent pair key (matches src/data/pairingMeta.ts) ----
export const pairKey = (a, b) => (a <= b ? `${a},${b}` : `${b},${a}`);

// ---- shared title classifier (context-vocab.json → compiled tag regexes) ----
//
// The single source of tag classification for the whole pipeline. context.mjs uses it to
// count tags per edge; merge-context.mjs uses it to verify that a shipped receipt title
// actually carries the tag it's meant to back. Both must classify identically or
// merge-time pruning and client-time filtering would disagree — so the compile lives here.
//
// Word-boundary match with optional plural; [^a-z] boundaries like the ingredient matcher
// so "salad" doesn't fire inside "saladillo" but does before punctuation. The client
// (src/utils/pairingContext.ts) reconstructs this exact regex from CONTEXT_TAG_KEYWORDS.
export const loadTitleClassifier = () => {
  const vocab = JSON.parse(
    fs.readFileSync(path.join(PIPELINE_DIR, 'context-vocab.json'), 'utf8'),
  );
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const alternation = (kws) =>
    new RegExp(`(?:^|[^a-z])(?:${kws.map(esc).join('|')})(?:e?s)?(?=[^a-z]|$)`);
  // Keyword entries prefixed with "!" are EXCLUSIONS: the tag fires only when a positive
  // keyword matches AND no exclusion phrase appears anywhere in the text. This is how
  // "pie" tags desserts without "Chicken Pot Pie" riding along. The client
  // (src/utils/pairingContext.ts getTagClassifier) and check-context-invariant.mjs
  // rebuild this exact construction from CONTEXT_TAG_KEYWORDS — keep all three in sync.
  const compileGroup = (group) =>
    Object.entries(group).map(([tag, entries]) => {
      const pos = entries.filter((k) => !k.startsWith('!'));
      const neg = entries.filter((k) => k.startsWith('!')).map((k) => k.slice(1));
      return [tag, alternation(pos), neg.length ? alternation(neg) : null];
    });
  const DISH = compileGroup(vocab.dishTypes);
  const METHOD = compileGroup(vocab.methods);
  const CUISINE = compileGroup(vocab.cuisines);
  const tagsFor = (compiled, text) => {
    const out = [];
    for (const [tag, re, negRe] of compiled) {
      if (re.test(text) && !(negRe && negRe.test(text))) out.push(tag);
    }
    return out;
  };
  return { DISH, METHOD, CUISINE, tagsFor, vocab };
};

// ---- minimal streaming RFC4180-ish CSV parser (handles quotes + embedded newlines) ----
export async function* parseCsv(filePath) {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 1 << 20 });
  let field = '';
  let row = [];
  let inQuotes = false;
  let prevChar = '';
  for await (const chunk of stream) {
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk[i];
      if (inQuotes) {
        if (c === '"') {
          if (chunk[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field); field = '';
      } else if (c === '\n') {
        if (prevChar === '\r') field = field.slice(0, -1);
        row.push(field); field = '';
        yield row; row = [];
      } else {
        field += c;
      }
      prevChar = c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); yield row; }
}

// Parse a NER/ingredients cell into a list of phrases. Supports JSON arrays and plain text.
export const parseIngredientCell = (cell) => {
  if (!cell) return [];
  const trimmed = cell.trim();
  if (trimmed.startsWith('[')) {
    try { return JSON.parse(trimmed).map(String); } catch { /* fall through */ }
  }
  return trimmed.split(/[;,\n]/).map((s) => s.trim()).filter(Boolean);
};

// ---- canonical-ingredient matcher ----
//
// Builds a phrase → canonical-name matcher from the app's ingredient profiles plus the
// vocab.json synonym map. Longest term wins so multi-word matches beat their substrings.
export const buildMatcher = () => {
  const profilesSrc = fs.readFileSync(
    path.join(REPO_ROOT, 'src', 'data', 'ingredientProfiles.ts'),
    'utf8',
  );
  const canonical = [...profilesSrc.matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]);
  const canonicalSet = new Set(canonical);

  const { synonyms } = JSON.parse(
    fs.readFileSync(path.join(PIPELINE_DIR, 'vocab.json'), 'utf8'),
  );
  for (const [alias, target] of Object.entries(synonyms)) {
    if (!canonicalSet.has(target)) {
      console.warn(`Warning: synonym "${alias}" -> "${target}" but "${target}" is not a canonical profile name.`);
    }
  }

  const termToCanonical = new Map();
  for (const name of canonical) termToCanonical.set(name.toLowerCase(), name);
  for (const [alias, target] of Object.entries(synonyms)) termToCanonical.set(alias.toLowerCase(), target);

  const terms = [...termToCanonical.keys()].sort(
    (a, b) => b.split(' ').length - a.split(' ').length || b.length - a.length,
  );
  // Precompile word-boundary regexes once.
  const termRegex = new Map(
    terms.map((t) => [t, new RegExp(`(?:^|[^a-z])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^a-z]|$)`)]),
  );

  // Word index: word -> terms containing it. Lets each phrase test only the terms that
  // share a word with it, instead of all ~700 (a matching term must share every one of its
  // words with the phrase, so it's always in the candidate set — recall is preserved).
  const wordIndex = new Map();
  for (const t of terms) {
    for (const w of t.split(' ')) {
      if (!wordIndex.has(w)) wordIndex.set(w, []);
      wordIndex.get(w).push(t);
    }
  }

  // Map one recipe-ingredient phrase to a single canonical name (longest match wins), or null.
  const matchPhrase = (phraseRaw) => {
    const lower = phraseRaw.toLowerCase();
    // Fast path: exact phrase (RecipeNLG's NER column is already cleaned to short names).
    const exact = termToCanonical.get(lower);
    if (exact) return exact;
    // Candidate terms = those sharing any word with the phrase.
    const words = lower.split(/[^a-z]+/).filter(Boolean);
    const candidates = new Set();
    for (const w of words) {
      const ts = wordIndex.get(w);
      if (ts) for (const t of ts) candidates.add(t);
    }
    if (candidates.size === 0) return null;
    const sorted = [...candidates].sort(
      (a, b) => b.split(' ').length - a.split(' ').length || b.length - a.length,
    );
    const padded = ` ${lower} `;
    for (const t of sorted) {
      if (termRegex.get(t).test(padded)) return termToCanonical.get(t);
    }
    return null;
  };

  return { canonical, synonyms, matchPhrase };
};

// ---- the app's current edge set (chef canon + mined meta) ----
//
// Parses src/data/flavorPairings.ts + src/data/pairingMeta.ts into a Set of pairKeys —
// the universe of edges the app can ever show. Context mining only tracks these.
export const loadEdgeSet = () => {
  const edgeSet = new Set();
  const fpSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'data', 'flavorPairings.ts'), 'utf8');
  for (const m of fpSrc.matchAll(/"([^",]+),([^",]+)"/g)) edgeSet.add(pairKey(m[1], m[2]));
  const pmSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'data', 'pairingMeta.ts'), 'utf8');
  for (const m of pmSrc.matchAll(/"([^",]+),([^",]+)":\s*\{/g)) edgeSet.add(pairKey(m[1], m[2]));
  return edgeSet;
};
