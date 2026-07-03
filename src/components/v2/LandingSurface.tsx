import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles } from 'lucide-react';
import { Pill } from './ui/Pill.tsx';
import { getLoadedContext, loadContext } from '../../utils/contextLoader.ts';
import { ingredientProfiles } from '../../data/ingredientProfiles.ts';
import { CATEGORY_COLORS } from '../../utils/colors.ts';

// The app's front door: a search-first entry surface shown on a fresh open in
// place of an auto-seeded combo. Two ways in — a search bar with rotating
// suggested searches (cuisines, dish types, ingredients, all pulled from live
// data so every suggestion is fulfillable), and browsable cuisine/dish tag
// lists that steer generation directly. "Surprise me" gives the old random
// first combo. Complementary to the onboarding wizard, which stays unchanged.
//
// Tag lists come from the lazy context chunk (via contextLoader — never a
// static import); until it lands, search still works over ingredients.

export type LandingTagGroup = 'cuisine' | 'dish';

interface LandingSurfaceProps {
  isMobile: boolean;
  /** Full searchable ingredient list (already sorted). */
  allIngredients: string[];
  onPickTag: (group: LandingTagGroup, tag: string) => void;
  onPickIngredient: (name: string) => void;
  onSurprise: () => void;
}

interface SearchHit {
  kind: LandingTagGroup | 'ingredient';
  label: string;
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
  onSurprise,
}) => {
  const [mod, setMod] = useState(() => getLoadedContext());
  useEffect(() => {
    if (!mod) loadContext().then(setMod);
  }, [mod]);

  const [term, setTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Steerable tags, richest subgraph first — dense tags (Mexican, salads) lead,
  // sparse ones (Korean, marinades) trail but stay reachable.
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
    const cuisines = shufflePick(tagCounts.cuisine.slice(0, 12).map(t => t.tag), 3);
    const dishes = shufflePick(tagCounts.dish.slice(0, 15).map(t => t.tag), 3);
    const ings = shufflePick(allIngredients, 3);
    const out: string[] = [];
    for (let i = 0; i < 3; i++) out.push(cuisines[i], dishes[i], ings[i]);
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

  // Search across all three pools. "french cuisine" should still find French.
  const hits = useMemo((): SearchHit[] => {
    const q = term.trim().toLowerCase().replace(/\s+cuisine\s*$/, '');
    if (!q) return [];
    const out: SearchHit[] = [];
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
  }, [term, tagCounts, allIngredients]);

  const pickHit = (hit: SearchHit) => {
    if (hit.kind === 'ingredient') onPickIngredient(hit.label);
    else onPickTag(hit.kind, hit.label);
  };

  const kindLabel: Record<SearchHit['kind'], string> = {
    cuisine: 'cuisine',
    dish: 'dish type',
    ingredient: 'ingredient',
  };

  const tagSection = (
    label: string,
    group: LandingTagGroup,
    tags: Array<{ tag: string; edges: number }>
  ) => (
    <section aria-label={label}>
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
    <div
      className={`
        flex-1 flex flex-col items-center w-full
        ${isMobile ? 'pt-6 pb-8' : 'justify-center'}
        px-4
      `}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-2xl flex flex-col items-center"
      >
        <h2 className={`font-display font-black tracking-tight text-gray-900 dark:text-white text-center ${isMobile ? 'text-3xl' : 'text-4xl'}`}>
          What do you want to cook?
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
          Search an ingredient, cuisine, or dish type — or browse below.
        </p>

        {/* Search with rotating suggested searches as a live placeholder */}
        <div className="relative mt-6 w-full max-w-xl">
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
              w-full pl-12 pr-5 py-3.5 rounded-full text-base
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
                max-h-72 overflow-y-auto
              "
            >
              {hits.map(hit => (
                <button
                  key={`${hit.kind}:${hit.label}`}
                  onClick={() => pickHit(hit)}
                  className="
                    w-full flex items-center gap-2.5 px-5 py-2.5 text-left
                    text-gray-900 dark:text-white
                    hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors
                  "
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
                  <span className="truncate">{hit.label}</span>
                  <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    {kindLabel[hit.kind]}
                  </span>
                </button>
              ))}
            </div>
          )}
          {term.trim() !== '' && hits.length === 0 && (
            <div
              className="
                absolute left-0 right-0 top-full mt-2 z-30
                rounded-2xl border border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-800 shadow-lg
                px-5 py-3 text-sm text-gray-500 dark:text-gray-400
              "
            >
              No matches — try an ingredient, cuisine, or dish type
            </div>
          )}
        </div>

        {/* Browsable tag lists (scroll-capped on desktop, page scrolls on mobile) */}
        <div
          className={`
            mt-8 w-full flex flex-col gap-5
            ${isMobile ? '' : 'max-h-[38vh] overflow-y-auto pr-1'}
          `}
        >
          {tagCounts ? (
            <>
              {tagSection('Cuisines', 'cuisine', tagCounts.cuisine)}
              {tagSection('Dishes', 'dish', tagCounts.dish)}
            </>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
              Loading ideas…
            </p>
          )}
        </div>

        <button
          onClick={onSurprise}
          className="
            mt-8 inline-flex items-center gap-2
            text-sm font-semibold text-gray-500 dark:text-gray-400
            hover:text-gray-900 dark:hover:text-white transition-colors
          "
        >
          <Sparkles size={16} aria-hidden="true" />
          Surprise me
        </button>
      </motion.div>
    </div>
  );
};

export default LandingSurface;
