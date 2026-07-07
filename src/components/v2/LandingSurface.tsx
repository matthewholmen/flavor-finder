import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, ChevronDown, Info } from 'lucide-react';
import { Pill } from './ui/Pill.tsx';
import { getLoadedContext, loadContext } from '../../utils/contextLoader.ts';
import { ingredientProfiles } from '../../data/ingredientProfiles.ts';
import { CATEGORY_COLORS } from '../../utils/colors.ts';
import {
  parseLandingQuery,
  parsedEntityCount,
  ParsedComposite,
  LandingLexicon,
} from '../../utils/parseLandingQuery.ts';
import { tagDisplayLabel } from '../../utils/tagLabels.ts';

// The app's front door and its empty state: a single centered search with
// cycling suggestions and one Generate button beneath it. Shown whenever the
// combo is empty (fresh open, or after deleting every ingredient). All the
// app chrome — top nav, ±, the bottom ingredient search — is hidden by the
// parent while this is up, so the search is the only thing to focus on.
//
// Search covers cuisines, dish types, and ingredients (every hit is
// fulfillable from live data). The full tag lists are tucked behind a quiet
// "Browse all" toggle rather than shown by default.
//
// Tag data comes from the lazy context chunk (via contextLoader — never a
// static import); until it lands, search still works over ingredients.

export type LandingTagGroup = 'cuisine' | 'dish';

interface LandingSurfaceProps {
  isMobile: boolean;
  /** Full searchable ingredient list (already sorted). */
  allIngredients: string[];
  onPickTag: (group: LandingTagGroup, tag: string) => void;
  onPickIngredient: (name: string) => void;
  /** Multi-entity query ("spinach and apple salad") — anchors + a steer. */
  onCompose: (parsed: ParsedComposite) => void;
  /** Whether a steer can actually host the typed ingredients (else it's a
   *  combo that doesn't exist — don't offer it with that tag). */
  canSteer: (ingredients: string[], group: LandingTagGroup, tag: string) => boolean;
  /** Seed a random combo — the "just cook something" path. */
  onGenerate: () => void;
  /** Open an ingredient's Atlas reference page (ⓘ on ingredient search hits). */
  onOpenAtlas?: (name: string) => void;
}

interface SearchHit {
  kind: LandingTagGroup | 'ingredient' | 'compose';
  label: string;
  /** Present on a 'compose' hit — the parsed entities to hand to onCompose. */
  parsed?: ParsedComposite;
}

const ROTATE_MS = 3000;
const MAX_INGREDIENT_HITS = 6;

const shufflePick = <T,>(arr: T[], n: number): T[] =>
  [...arr].sort(() => Math.random() - 0.5).slice(0, n);

export const LandingSurface: React.FC<LandingSurfaceProps> = ({
  isMobile,
  allIngredients,
  onPickTag,
  onPickIngredient,
  onCompose,
  canSteer,
  onGenerate,
  onOpenAtlas,
}) => {
  const [mod, setMod] = useState(() => getLoadedContext());
  useEffect(() => {
    if (!mod) loadContext().then(setMod);
  }, [mod]);

  const [term, setTerm] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Steerable tags, richest subgraph first.
  const tagCounts = useMemo(() => (mod ? mod.getSteerTagCounts() : null), [mod]);

  const categoryByIngredient = useMemo(() => {
    const map = new Map<string, string>();
    ingredientProfiles.forEach(p => map.set(p.name.toLowerCase(), p.category));
    return map;
  }, []);

  // Rotating suggestions: interleave cuisines / dishes / ingredients so the
  // cycle showcases every entry type. Sampled once per mount.
  const suggestions = useMemo(() => {
    if (!tagCounts) return [];
    const c = shufflePick(tagCounts.cuisine.slice(0, 12).map(t => t.tag), 3);
    const d = shufflePick(tagCounts.dish.slice(0, 15).map(t => t.tag), 3);
    const ings = shufflePick(allIngredients, 3);
    const out: string[] = [];
    for (let i = 0; i < 3; i++) out.push(c[i], d[i], ings[i]);
    return out.filter(Boolean);
  }, [tagCounts, allIngredients]);

  const [suggestionIndex, setSuggestionIndex] = useState(0);
  useEffect(() => {
    if (suggestions.length === 0 || term !== '') return;
    const id = setInterval(
      () => setSuggestionIndex(i => (i + 1) % suggestions.length),
      ROTATE_MS
    );
    return () => clearInterval(id);
  }, [suggestions, term]);

  // Lexicon for the multi-entity parser: the app's own vocabularies, so every
  // parsed entity is fulfillable. Rebuilt only when the tag data lands.
  const lexicon = useMemo((): LandingLexicon => ({
    ingredients: allIngredients,
    dishTags: tagCounts ? tagCounts.dish.map(t => t.tag) : [],
    cuisineTags: tagCounts ? tagCounts.cuisine.map(t => t.tag) : [],
  }), [allIngredients, tagCounts]);

  // Search across all three pools. "french cuisine" should still find French.
  const hits = useMemo((): SearchHit[] => {
    const q = term.trim().toLowerCase().replace(/\s+cuisine\s*$/, '');
    if (!q) return [];
    const out: SearchHit[] = [];

    // A query naming more than one thing ("spinach and apple salad") gets a
    // synthesized composite result on top — the single-entry substring search
    // below would find nothing for it. Only when ≥2 entities parse and at least
    // one is an ingredient (a bare "salad soup" is better served by tag hits).
    const raw = parseLandingQuery(term, lexicon);
    // Drop a steer the graph can't actually fulfil for these ingredients, so we
    // never offer a combo that then loads without its tag. Dish takes precedence
    // (mirrors the handler); if it can't hold, fall back to a viable cuisine.
    let dishTag = raw.dishTag && canSteer(raw.ingredients, 'dish', raw.dishTag) ? raw.dishTag : null;
    let cuisineTag = raw.cuisineTag && canSteer(raw.ingredients, 'cuisine', raw.cuisineTag) ? raw.cuisineTag : null;
    if (dishTag) cuisineTag = null; // one steer at a time; dish wins
    const parsed: ParsedComposite = { ...raw, dishTag, cuisineTag };
    if (parsedEntityCount(parsed) >= 2 && parsed.ingredients.length >= 1) {
      const parts = [
        ...parsed.ingredients,
        ...(dishTag ? [tagDisplayLabel(dishTag)] : []),
        ...(cuisineTag ? [tagDisplayLabel(cuisineTag)] : []),
      ];
      out.push({ kind: 'compose', label: parts.join(' + '), parsed });
    }

    if (tagCounts) {
      tagCounts.cuisine.forEach(({ tag }) => {
        if (tag.toLowerCase().includes(q)) out.push({ kind: 'cuisine', label: tag });
      });
      tagCounts.dish.forEach(({ tag }) => {
        if (tag.toLowerCase().includes(q)) out.push({ kind: 'dish', label: tag });
      });
    }
    // Prefix matches first so "sa" leads with sage/salt, not balsamic.
    const starts: string[] = [];
    const contains: string[] = [];
    for (const ing of allIngredients) {
      const lower = ing.toLowerCase();
      if (lower.startsWith(q)) starts.push(ing);
      else if (lower.includes(q)) contains.push(ing);
      if (starts.length >= MAX_INGREDIENT_HITS) break;
    }
    [...starts, ...contains].slice(0, MAX_INGREDIENT_HITS).forEach(ing =>
      out.push({ kind: 'ingredient', label: ing })
    );
    return out;
  }, [term, tagCounts, allIngredients, lexicon, canSteer]);

  const pickHit = (hit: SearchHit) => {
    if (hit.kind === 'compose' && hit.parsed) onCompose(hit.parsed);
    else if (hit.kind === 'ingredient') onPickIngredient(hit.label);
    else if (hit.kind !== 'compose') onPickTag(hit.kind, hit.label);
  };

  const kindLabel: Record<SearchHit['kind'], string> = {
    cuisine: 'cuisine',
    dish: 'dish type',
    ingredient: 'ingredient',
    compose: 'combo',
  };

  const tagSection = (
    label: string,
    group: LandingTagGroup,
    tags: Array<{ tag: string; edges: number }>
  ) => (
    <section aria-label={label} className="w-full">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
        {label}
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map(({ tag }) => (
          <Pill
            key={tag}
            size="sm"
            onClick={() => onPickTag(group, tag)}
            className="!px-3 !py-1 !text-[13px]"
          >
            {tag}
          </Pill>
        ))}
      </div>
    </section>
  );

  return (
    // Scroll container (fills the bounded <main>). `align-content: safe center`
    // vertically centers the content when it fits, but falls back to top-
    // alignment when "Browse all" makes it taller than the viewport — so the
    // overflow stays fully scrollable instead of being clipped (the trap with
    // plain centering / margin:auto). overscroll-none stops the scroll chaining
    // to the window (no white rubber-band past the page bounds).
    <div
      className="flex-1 min-h-0 w-full overflow-y-auto overscroll-none grid px-4"
      style={{ alignContent: 'safe center' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mx-auto w-full max-w-xl flex flex-col items-center py-6"
      >
        <h2 className={`font-display font-black tracking-tight text-gray-900 dark:text-white text-center ${isMobile ? 'text-3xl' : 'text-4xl'}`}>
          What do you want to make?
        </h2>

        {/* The search — the one thing to focus on */}
        <div className="relative mt-7 w-full">
          <Search
            size={20}
            className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={term}
            onChange={e => setTerm(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && hits.length > 0) pickHit(hits[0]);
            }}
            aria-label="Search ingredients, cuisines, and dish types"
            className="
              w-full pl-12 pr-5 py-4 rounded-full text-base
              border-2 border-gray-300 dark:border-gray-600
              focus:border-gray-900 dark:focus:border-white focus:outline-none
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              transition-colors
            "
          />
          {term === '' && (
            <div
              className="absolute left-12 right-5 top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden text-gray-400 dark:text-gray-500"
              aria-hidden="true"
            >
              {suggestions.length > 0 ? (
                <AnimatePresence mode="wait">
                  <motion.span
                    key={suggestions[suggestionIndex]}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="block truncate"
                  >
                    Try “{suggestions[suggestionIndex]}”
                  </motion.span>
                </AnimatePresence>
              ) : (
                <span className="block truncate">Search ingredients…</span>
              )}
            </div>
          )}

          {/* Grouped results */}
          {hits.length > 0 && (
            <div
              className="
                absolute left-0 right-0 top-full mt-2 z-30
                rounded-2xl border border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-800 shadow-lg overflow-hidden
                max-h-72 overflow-y-auto text-left
              "
            >
              {hits.map(hit => (
                // Row = pick button + (ingredient rows) a trailing ⓘ to the Atlas page.
                // Two sibling buttons, not nested — the ⓘ replaces the kind label there.
                <div
                  key={`${hit.kind}:${hit.label}`}
                  className="w-full flex items-center hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                >
                  <button
                    onClick={() => pickHit(hit)}
                    className="flex-1 min-w-0 flex items-center gap-2.5 pl-5 pr-2 py-2.5 text-left text-gray-900 dark:text-white"
                  >
                    {hit.kind === 'ingredient' && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            CATEGORY_COLORS[categoryByIngredient.get(hit.label.toLowerCase()) ?? ''] ??
                            '#9CA3AF',
                        }}
                        aria-hidden="true"
                      />
                    )}
                    {hit.kind === 'compose' && (
                      <Sparkles size={15} className="shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                    )}
                    <span className={`truncate ${hit.kind === 'compose' ? 'font-semibold' : ''}`}>{hit.label}</span>
                  </button>
                  {hit.kind === 'ingredient' && onOpenAtlas ? (
                    <button
                      onClick={() => onOpenAtlas(hit.label)}
                      aria-label={`About ${hit.label}`}
                      title={`About ${hit.label}`}
                      className="shrink-0 px-4 py-2.5 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                      <Info size={16} strokeWidth={2} />
                    </button>
                  ) : (
                    <span className="shrink-0 pr-5 pl-2 text-xs text-gray-400 dark:text-gray-500">
                      {kindLabel[hit.kind]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {term.trim() !== '' && hits.length === 0 && (
            <div
              className="
                absolute left-0 right-0 top-full mt-2 z-30
                rounded-2xl border border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-800 shadow-lg text-left
                px-5 py-3 text-sm text-gray-500 dark:text-gray-400
              "
            >
              No matches — try an ingredient, cuisine, or dish type
            </div>
          )}
        </div>

        {/* One primary action beneath the input */}
        <button
          onClick={onGenerate}
          className="
            mt-5 inline-flex items-center gap-2
            px-7 py-3 rounded-full font-semibold
            bg-gray-900 dark:bg-white text-white dark:text-gray-900
            hover:opacity-90 transition-opacity
          "
        >
          <Sparkles size={18} aria-hidden="true" />
          Surprise me
        </button>

        {/* Quiet escape hatch to the full tag lists */}
        {tagCounts && (
          <button
            onClick={() => setBrowsing(v => !v)}
            aria-expanded={browsing}
            className="
              mt-5 inline-flex items-center gap-1.5
              text-sm font-medium text-gray-400 dark:text-gray-500
              hover:text-gray-700 dark:hover:text-gray-300 transition-colors
            "
          >
            {browsing ? 'Hide' : 'Browse all'}
            <ChevronDown
              size={15}
              className={`transition-transform ${browsing ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        )}

        <AnimatePresence initial={false}>
          {browsing && tagCounts && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full overflow-hidden"
            >
              <div className="mt-6 flex flex-col gap-5">
                {tagSection('Cuisines', 'cuisine', tagCounts.cuisine)}
                {tagSection('Dishes', 'dish', tagCounts.dish)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default LandingSurface;
