import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, ChevronDown } from 'lucide-react';
import { Pill } from './ui/Pill.tsx';
import { getLoadedContext, loadContext } from '../../utils/contextLoader.ts';
import { ingredientProfiles } from '../../data/ingredientProfiles.ts';
import { CATEGORY_COLORS } from '../../utils/colors.ts';

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
  /** Seed a random combo — the "just cook something" path. */
  onGenerate: () => void;
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
  onGenerate,
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
