// Lexicon-driven parser for multi-entity landing queries ("spinach and apple
// salad", "french chicken stew"). It is NOT natural-language ML: every token is
// matched against vocabularies the app already owns — ingredient names plus the
// mined dish/cuisine steer tags — so a hit is always something generation can
// fulfil. The landing search matched the WHOLE string against one entry, so a
// query naming two ingredients and a dish found nothing; this splits the string
// into the entities it actually contains.
//
// The parser never touches the flavor-map pairing check. It only produces a set
// of anchors + a steer tag; the generator (computeCombo) still enforces mutual
// compatibility over those inputs (see CLAUDE.md).

export interface LandingLexicon {
  /** Canonical ingredient names, exactly as they key the flavor map. */
  ingredients: string[];
  /** Canonical dish steer tags (e.g. "salads", "stir-fries"). */
  dishTags: string[];
  /** Canonical cuisine steer tags (e.g. "French"). */
  cuisineTags: string[];
}

export interface ParsedComposite {
  /** Matched ingredients, in query order, de-duplicated. */
  ingredients: string[];
  /** First matched dish tag, or null. */
  dishTag: string | null;
  /** First matched cuisine tag, or null. */
  cuisineTag: string | null;
  /** Meaningful tokens (non-stopword) that matched nothing. */
  unmatched: string[];
}

type EntityKind = 'ingredient' | 'dish' | 'cuisine';

// Connective / filler words that carry no entity meaning. Kept small: only
// words that are noise in a "what do you want to make" query. Anything not here
// and unmatched is surfaced as `unmatched` rather than silently dropped.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'with', 'of', 'in', 'on', 'for',
  'some', 'my', 'our', 'made', 'using', 'plus', 'to', 'n',
]);

// Spellings that don't survive the light stemmer, mapped to the STEMMED key of
// their canonical tag. ("stir-fries" and "stir fry" both stem to "stir fry"
// already, so only the closed-up "stirfry" needs help; "bbq" is covered by the
// compound-tag part split of "grilling & bbq".) Keyed by stemmed-normalized
// input phrase.
const PHRASE_ALIASES: Record<string, string> = {
  'stirfry': 'stir fry',
};

// A compound steer tag ("sandwiches & burgers", "Cajun & Creole") is one entry
// in the mined vocabulary, but a cook types one side of it. Split on these so
// each part becomes a synonym reaching the whole tag — "chicken sandwich" then
// finds "sandwiches & burgers" without renaming the canonical tag.
const TAG_PART_SPLIT = /\s*(?:&|,|\band\b)\s*/;

const MAX_PHRASE_WORDS = 5;

/** Lowercase, strip punctuation (hyphens included), collapse whitespace. */
const normalize = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

// Light singular stemmer — enough to fold the plurals a cook actually types
// ("apples", "salads", "tomatoes", "berries") onto their canonical singular.
// Deliberately conservative: only touches words longer than 3 chars and leaves
// -ss words ("grass") alone.
const stemToken = (t: string): string => {
  if (t.length <= 3) return t;
  if (t.endsWith('ies')) return t.slice(0, -3) + 'y'; // berries -> berry
  if (t.endsWith('oes')) return t.slice(0, -2);       // tomatoes -> tomato
  if (/(s|x|z|ch|sh)es$/.test(t)) return t.slice(0, -2); // dishes -> dish, boxes -> box
  if (t.endsWith('ss')) return t;                     // grass, glass
  if (t.endsWith('s')) return t.slice(0, -1);         // apples -> apple, salads -> salad
  return t;
};

const stemPhrase = (normalized: string): string =>
  normalized.split(' ').map(stemToken).join(' ');

interface IndexEntry {
  kind: EntityKind;
  canonical: string;
}

/**
 * Build a stem-keyed phrase index once per lexicon. Ingredients are inserted
 * first so that on the rare key collision an ingredient wins over a tag.
 */
const buildIndex = (lex: LandingLexicon): Map<string, IndexEntry> => {
  const index = new Map<string, IndexEntry>();
  const put = (key: string, kind: EntityKind, canonical: string) => {
    if (!key || index.has(key)) return; // first insert (ingredient) wins ties
    index.set(key, { kind, canonical });
  };
  // A tag registers under its full phrase AND, if compound, under each part —
  // every alias pointing back at the same canonical tag.
  const addTag = (phrase: string, kind: EntityKind) => {
    put(stemPhrase(normalize(phrase)), kind, phrase);
    const parts = phrase.split(TAG_PART_SPLIT);
    if (parts.length > 1) {
      parts.forEach(part => put(stemPhrase(normalize(part)), kind, phrase));
    }
  };
  // Ingredients first so an ingredient wins any key an alias would collide with.
  lex.ingredients.forEach(p => put(stemPhrase(normalize(p)), 'ingredient', p));
  lex.dishTags.forEach(p => addTag(p, 'dish'));
  lex.cuisineTags.forEach(p => addTag(p, 'cuisine'));
  return index;
};

/**
 * Parse a free-typed landing query into the entities it names. Greedy
 * longest-match: at each position we try the longest window of words (up to
 * MAX_PHRASE_WORDS) that resolves to a lexicon phrase, so "sour cream" binds as
 * one ingredient rather than "cream" alone.
 *
 * The lexicon is small and rebuilt cheaply; callers should memoize the index by
 * wrapping in useMemo if the lexicon is stable.
 */
// Minimum partial length before we type-ahead complete it — below this a prefix
// matches too much ("co" → coconut/cod/coffee…) to be a confident single hit.
const MIN_PREFIX_LEN = 3;

export const parseLandingQuery = (
  raw: string,
  lex: LandingLexicon
): ParsedComposite => {
  const index = buildIndex(lex);
  const keys = Array.from(index.keys());
  const normalized = normalize(raw);
  const tokens = normalized ? normalized.split(' ') : [];
  const stems = tokens.map(stemToken);

  // Type-ahead: complete a partial trailing word ("desser" → "desserts") to the
  // shortest lexicon key it prefixes. Only ever called on the word being typed
  // (the window that runs to the end of the query), so interior words still need
  // a full match — this autocompletes the cursor, it doesn't fuzz the whole line.
  const prefixLookup = (partial: string): IndexEntry | null => {
    if (partial.length < MIN_PREFIX_LEN) return null;
    let best: string | null = null;
    for (const k of keys) {
      if (k === partial || !k.startsWith(partial)) continue;
      if (best === null || k.length < best.length || (k.length === best.length && k < best)) {
        best = k;
      }
    }
    return best ? index.get(best)! : null;
  };

  const ingredients: string[] = [];
  let dishTag: string | null = null;
  let cuisineTag: string | null = null;
  const unmatched: string[] = [];

  const record = (entry: IndexEntry) => {
    if (entry.kind === 'ingredient') {
      if (!ingredients.includes(entry.canonical)) ingredients.push(entry.canonical);
    } else if (entry.kind === 'dish') {
      if (!dishTag) dishTag = entry.canonical;
    } else if (!cuisineTag) {
      cuisineTag = entry.canonical;
    }
  };

  let i = 0;
  while (i < tokens.length) {
    const maxWin = Math.min(MAX_PHRASE_WORDS, tokens.length - i);

    // Exact longest-match first.
    let matched = false;
    for (let w = maxWin; w >= 1; w--) {
      const stemKey = stems.slice(i, i + w).join(' ');
      const key = PHRASE_ALIASES[stemKey] ?? stemKey;
      const entry = index.get(key);
      if (!entry) continue;
      record(entry);
      i += w;
      matched = true;
      break;
    }
    if (matched) continue;

    // No exact hit — if the unmatched chunk runs to the end of the query, it's
    // the word still being typed: try to complete it by prefix.
    const tail = stems.slice(i).join(' ');
    const tailAlias = PHRASE_ALIASES[tail] ?? tail;
    const completed = prefixLookup(tailAlias);
    if (completed) {
      record(completed);
      break; // consumed the rest of the query
    }

    if (!STOPWORDS.has(tokens[i])) unmatched.push(tokens[i]);
    i += 1;
  }

  return { ingredients, dishTag, cuisineTag, unmatched };
};

/** How many distinct entities a parse found — the composite path needs ≥ 2. */
export const parsedEntityCount = (p: ParsedComposite): number =>
  p.ingredients.length + (p.dishTag ? 1 : 0) + (p.cuisineTag ? 1 : 0);
