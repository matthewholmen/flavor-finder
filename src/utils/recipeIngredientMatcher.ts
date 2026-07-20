// utils/recipeIngredientMatcher.ts
//
// Free-text recipe line → canonical ingredient matching, for paste-a-recipe and the
// browser extension. Browser-safe port of tooling/pairing-pipeline/lib.mjs buildMatcher()
// (longest-term-wins, word-boundary), extended for recipe *lines* rather than cleaned
// NER phrases: quantity/unit parsing (parse-ingredient), accent + parenthetical
// normalization, plural retry, staple recognition, and a tight fuzzy fallback.
//
// This module only RESOLVES names. It never touches pairing — compatibility stays
// the flavor map's job (see recipeAnalysis.ts).
//
// Match precedence, most → least trusted (each phase runs only if the prior missed):
//   1. exact      — whole phrase is a known term ("olive oil")
//   2. phrase     — longest known term inside the line ("…extra-virgin olive oil…")
//   3. singular   — same, after de-pluralizing tokens ("onions" → "onion")
//   4. staple     — supporting pantry staple with no flavor-map node ("kosher salt")
//   5. fuzzy      — Fuse.js over the vocabulary, tight threshold; needs user confirm

import Fuse from 'fuse.js';
import { parseIngredient } from 'parse-ingredient';
import { ingredientProfiles } from '../data/ingredientProfiles.ts';
import { INGREDIENT_ALIASES, STAPLE_TERMS } from '../data/ingredientAliases.ts';
import { normalizeText } from './searchUtils.ts';

export type MatchVia = 'exact' | 'phrase' | 'singular' | 'fuzzy';

export interface PhraseMatch {
  canonical: string;
  via: MatchVia;
  /** true for 'fuzzy' — the UI should ask the user to confirm the chip. */
  needsConfirm: boolean;
}

export interface LineMatch {
  raw: string;
  isGroupHeader: boolean;
  /** Display quantity, e.g. "2 cups", "1–2", "" when none. */
  quantity: string;
  /** The free-text remainder parse-ingredient calls the description. */
  description: string;
  match: PhraseMatch | null;
  /** Display label when the line is a supporting staple ("salt", "flour"). */
  staple: string | null;
}

// Words that describe prep/size/state, not identity. Stripped only for the fuzzy
// phase — word-boundary matching is immune to them, and stripping earlier could
// eat identity words ("ground" in "ground beef" never matters: "beef" still matches).
const STOP_WORDS = new Set([
  'chopped', 'diced', 'minced', 'sliced', 'grated', 'shredded', 'crushed', 'ground',
  'fresh', 'freshly', 'dried', 'frozen', 'canned', 'cooked', 'raw', 'ripe',
  'large', 'medium', 'small', 'baby', 'jumbo', 'thick', 'thin', 'thinly', 'thickly',
  'finely', 'coarsely', 'roughly', 'lightly', 'well',
  'peeled', 'seeded', 'cored', 'stemmed', 'trimmed', 'pitted', 'halved', 'quartered',
  'cubed', 'julienned', 'torn', 'beaten', 'whisked', 'melted', 'softened', 'chilled',
  'drained', 'rinsed', 'packed', 'heaping', 'level', 'scant', 'divided', 'optional',
  'boneless', 'skinless', 'bone', 'skin', 'lean', 'extra', 'virgin', 'pure',
  'unsalted', 'salted', 'unsweetened', 'sweetened', 'reduced', 'sodium', 'low',
  'cut', 'into', 'pieces', 'piece', 'inch', 'wedges', 'wedge', 'strips', 'chunks',
  'can', 'jar', 'package', 'bag', 'box', 'bunch', 'sprig', 'sprigs', 'stalk', 'stalks',
  'clove', 'cloves', 'head', 'heads', 'slices', 'slice', 'fillet', 'fillets',
  'to', 'taste', 'for', 'serving', 'garnish', 'plus', 'more', 'about', 'approximately',
  'of', 'a', 'an', 'the', 'and', 'or', 'at', 'room', 'temperature', 'needed', 'if',
  'zest', 'juice', 'juiced', 'zested', // "juice of 2 lemons" — identity is the lemon
]);

// Tokens ending in these stay as-is when de-pluralizing ("hummus", "watercress").
const singularizeToken = (w: string): string => {
  if (w.length <= 3) return w;
  const IRREGULAR: Record<string, string> = {
    leaves: 'leaf', halves: 'half', tomatoes: 'tomato', potatoes: 'potato',
  };
  if (IRREGULAR[w]) return IRREGULAR[w];
  if (/[^aeiou]ies$/.test(w)) return w.slice(0, -3) + 'y';   // berries → berry
  if (/oes$/.test(w)) return w.slice(0, -2);                  // mangoes → mango
  if (/(sses|shes|ches|xes|zes)$/.test(w)) return w.slice(0, -2); // radishes → radish
  if (/(ss|us|is)$/.test(w)) return w;                        // couscous, hummus
  if (/s$/.test(w)) return w.slice(0, -1);                    // onions → onion
  return w;
};

interface MatcherIndex {
  termToCanonical: Map<string, string>;
  termRegex: Map<string, RegExp>;
  wordIndex: Map<string, string[]>;
  stapleRegex: Map<string, RegExp>;
  stapleTerms: string[]; // longest-first
  fuse: Fuse<string>;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const boundaryRe = (term: string) =>
  new RegExp(`(?:^|[^a-z])${escapeRe(term)}(?:[^a-z]|$)`);
const byTermLength = (a: string, b: string) =>
  b.split(' ').length - a.split(' ').length || b.length - a.length;

let cachedIndex: MatcherIndex | null = null;

const getIndex = (): MatcherIndex => {
  if (cachedIndex) return cachedIndex;

  const termToCanonical = new Map<string, string>();
  for (const p of ingredientProfiles) {
    termToCanonical.set(normalizeText(p.name), p.name);
  }
  for (const [alias, target] of Object.entries(INGREDIENT_ALIASES)) {
    termToCanonical.set(normalizeText(alias), target);
  }

  const terms = [...termToCanonical.keys()].sort(byTermLength);
  const termRegex = new Map(terms.map(t => [t, boundaryRe(t)]));

  // Word index: only test terms sharing a word with the phrase (see pipeline lib.mjs —
  // a matching term must share every one of its words with the phrase, so recall holds).
  const wordIndex = new Map<string, string[]>();
  for (const t of terms) {
    for (const w of t.split(' ')) {
      if (!wordIndex.has(w)) wordIndex.set(w, []);
      wordIndex.get(w)!.push(t);
    }
  }

  const stapleTerms = Object.keys(STAPLE_TERMS).map(normalizeText).sort(byTermLength);
  const stapleRegex = new Map(stapleTerms.map(t => [t, boundaryRe(t)]));

  const fuse = new Fuse(terms, {
    includeScore: true,
    threshold: 0.3, // default 0.6 is far too loose for short food names (lime/thyme)
    ignoreLocation: true,
    minMatchCharLength: 3,
  });

  cachedIndex = { termToCanonical, termRegex, wordIndex, stapleRegex, stapleTerms, fuse };
  return cachedIndex;
};

/** Longest-term-wins word-boundary lookup of a normalized phrase. */
const findTerm = (idx: MatcherIndex, normalized: string): string | null => {
  const words = normalized.split(/[^a-z]+/).filter(Boolean);
  const candidates = new Set<string>();
  for (const w of words) {
    const ts = idx.wordIndex.get(w);
    if (ts) for (const t of ts) candidates.add(t);
  }
  if (candidates.size === 0) return null;
  const sorted = [...candidates].sort(byTermLength);
  const padded = ` ${normalized} `;
  for (const t of sorted) {
    if (idx.termRegex.get(t)!.test(padded)) return t;
  }
  return null;
};

const normalizePhrase = (phrase: string): string =>
  normalizeText(phrase)
    .replace(/\([^)]*\)/g, ' ')   // parentheticals: "(14.5 ounce) can"
    .replace(/[^a-z0-9]+/g, ' ')  // punctuation → space ("extra-virgin", "parmigiano-reggiano")
    .trim();

/**
 * Resolve one free-text ingredient phrase to a canonical name, a staple, or nothing.
 * Exported for reuse anywhere a bare phrase (not a full line) needs resolving.
 */
export const matchPhrase = (
  phrase: string,
): { match: PhraseMatch | null; staple: string | null } => {
  const idx = getIndex();
  const normalized = normalizePhrase(phrase);
  if (!normalized) return { match: null, staple: null };

  // 1. exact
  const exact = idx.termToCanonical.get(normalized);
  if (exact) {
    return { match: { canonical: exact, via: 'exact', needsConfirm: false }, staple: null };
  }

  // 2. phrase (longest term inside the line)
  const phraseTerm = findTerm(idx, normalized);
  if (phraseTerm) {
    return {
      match: { canonical: idx.termToCanonical.get(phraseTerm)!, via: 'phrase', needsConfirm: false },
      staple: null,
    };
  }

  // 3. singular retry
  const singular = normalized.split(' ').map(singularizeToken).join(' ');
  if (singular !== normalized) {
    const term = idx.termToCanonical.get(singular) ?? findTerm(idx, singular);
    if (term) {
      const key = idx.termToCanonical.has(singular) ? singular : term;
      return {
        match: { canonical: idx.termToCanonical.get(key)!, via: 'singular', needsConfirm: false },
        staple: null,
      };
    }
  }

  // 4. staple
  const paddedSingular = ` ${singular} `;
  for (const t of idx.stapleTerms) {
    if (idx.stapleRegex.get(t)!.test(paddedSingular)) {
      // STAPLE_TERMS keys were normalized for the regexes; map back through normalize.
      const label = Object.entries(STAPLE_TERMS).find(
        ([k]) => normalizeText(k) === t,
      )?.[1] ?? t;
      return { match: null, staple: label };
    }
  }

  // 5. fuzzy fallback — only over identity words, and only with a strong score
  const query = singular
    .split(' ')
    .filter(w => !STOP_WORDS.has(w) && !/^\d/.test(w) && w.length > 2)
    .join(' ');
  if (query.length >= 4) {
    const [best] = idx.fuse.search(query, { limit: 1 });
    if (best && best.score !== undefined && best.score <= 0.3) {
      return {
        match: {
          canonical: idx.termToCanonical.get(best.item)!,
          via: 'fuzzy',
          needsConfirm: true,
        },
        staple: null,
      };
    }
  }

  return { match: null, staple: null };
};

/** Parse a pasted recipe (or extracted ingredient lines) into per-line matches. */
export const matchRecipeText = (text: string): LineMatch[] => {
  const parsed = parseIngredient(text, { allowLeadingOf: true });
  return parsed.map(entry => {
    if (entry.isGroupHeader) {
      return {
        raw: entry.description,
        isGroupHeader: true,
        quantity: '',
        description: entry.description,
        match: null,
        staple: null,
      };
    }
    const quantity = [
      entry.quantity !== null ? String(entry.quantity) : '',
      entry.quantity2 !== null ? `–${entry.quantity2}` : '',
      entry.unitOfMeasure ? ` ${entry.unitOfMeasure}` : '',
    ].join('').trim();
    const { match, staple } = matchPhrase(entry.description);
    return {
      raw: entry.description,
      isGroupHeader: false,
      quantity,
      description: entry.description,
      match,
      staple,
    };
  });
};

/** Dedup helper: the distinct canonical names from a set of line matches. */
export const matchedCanonicals = (lines: LineMatch[]): string[] => {
  const seen = new Set<string>();
  for (const l of lines) {
    if (l.match) seen.add(l.match.canonical);
  }
  return [...seen];
};
