import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X, ChevronLeft, ChevronRight, ChevronDown, Pencil,
  Wine, Beer, Martini, CupSoda, BookOpen, Scale, AlertTriangle,
} from 'lucide-react';
import { suggestDrinks, DRINK_CATEGORY_LABELS } from '../../utils/drinkPairing.ts';
import { computeDishProfile, dishDescriptors } from '../../utils/dishProfile.ts';
import { DISH_TYPES, resolveDishType } from '../../data/dishTypes.ts';
import { DrinkCategory } from '../../data/drinkPairings.ts';

// The first menu-level surface: "what to drink with this dish". Same portal
// contract as SlotRolePopover/SwapPopover (desktop card, mobile bottom sheet).
//
// Anatomy is deliberately a contract: dish identity header (name + served-as
// pills + descriptor chips), then a hero suggestion with prev/next chevrons —
// browsing a small RANKED list, not the Generate randomizer — with its receipts
// (book evidence / balance rules / warnings) always visible, and the rest of
// the list tappable below. The future dish-to-dish "On the side" section reuses
// this anatomy one section down, so the menu builder stays one harmonious UX.

export interface DrinkPairingPanelProps {
  ingredients: string[];
  dishName: string;
  /** "Served as" dish-type id (data/dishTypes.ts); undefined = no dish type. */
  servedAs?: string;
  onServedAsChange: (id?: string) => void;
  /** Present only for saved dishes — enables the lazy rename pencil. */
  onRename?: (name: string) => void;
  /** Alcohol-free dietary filter: zero-proof suggestions only. */
  nonAlcoholicOnly?: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

const CATEGORY_ICONS: Record<DrinkCategory, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  wine: Wine,
  beer: Beer,
  spirit: Martini,
  nonAlcoholic: CupSoda,
};

const SUGGESTION_LIMIT = 8;

export const DrinkPairingPanel = ({
  ingredients,
  dishName,
  servedAs,
  onServedAsChange,
  onRename,
  nonAlcoholicOnly = false,
  onClose,
  isMobile = false,
}: DrinkPairingPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [pick, setPick] = useState(0);
  const [showMoreTypes, setShowMoreTypes] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(dishName);

  const suggestions = useMemo(
    () => suggestDrinks(ingredients, { servedAs, nonAlcoholicOnly, limit: SUGGESTION_LIMIT }),
    [ingredients, servedAs, nonAlcoholicOnly]
  );
  const descriptors = useMemo(
    () => dishDescriptors(computeDishProfile(ingredients, servedAs)),
    [ingredients, servedAs]
  );

  // A new dish (or a re-served one) restarts at the top pick.
  useEffect(() => { setPick(0); }, [ingredients, servedAs, nonAlcoholicOnly]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const activeType = resolveDishType(servedAs);
  // Keep the expander open when the active type lives behind it.
  const moreTierActive = activeType?.tier === 'more';
  const visibleTypes = DISH_TYPES.filter(
    d => d.tier === 'primary' || showMoreTypes || moreTierActive
  );

  const hero = suggestions[Math.min(pick, Math.max(0, suggestions.length - 1))];
  const HeroIcon = hero ? CATEGORY_ICONS[hero.drink.category] : Wine;

  const commitRename = () => {
    setEditingName(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== dishName) onRename?.(trimmed);
  };

  const receiptChip = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold';

  const panel = (
    <motion.div
      ref={panelRef}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: isMobile ? 24 : 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: isMobile ? 16 : 6 }}
      transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
      className={`flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${
        isMobile ? 'w-full rounded-t-2xl' : 'rounded-2xl'
      }`}
      // Centering is handled by the flex wrapper below — never via a static
      // transform here, since framer-motion owns this element's transform for
      // the scale/y animation and would overwrite it (the panel would slide to
      // the corner). Only sizing lives on the animated element.
      style={
        isMobile
          ? { pointerEvents: 'auto', maxHeight: '82vh', paddingBottom: 'env(safe-area-inset-bottom)' }
          : { pointerEvents: 'auto', width: 440, maxWidth: 'calc(100vw - 32px)', maxHeight: '80vh' }
      }
      role="dialog"
      aria-label={`What to drink with ${dishName}`}
    >
      {/* Header: dish identity */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            <Wine size={12} strokeWidth={2.5} />
            what to drink
          </span>
          <button
            onClick={onClose}
            aria-label="Close drink pairings"
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); }}
              aria-label="Dish name"
              className="flex-1 min-w-0 text-base font-semibold bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none text-gray-900 dark:text-white"
            />
          ) : (
            <>
              <span className="text-base font-semibold text-gray-900 dark:text-white capitalize truncate">
                {dishName}
              </span>
              {onRename && (
                <button
                  onClick={() => { setDraftName(dishName); setEditingName(true); }}
                  aria-label="Rename dish"
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
                >
                  <Pencil size={13} strokeWidth={2.5} />
                </button>
              )}
            </>
          )}
          {descriptors.length > 0 && (
            <span className="flex gap-1 shrink-0 ml-auto">
              {descriptors.slice(0, 2).map(d => (
                <span key={d} className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {d}
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate">
          {ingredients.join(' · ')}
        </div>
      </div>

      <div className="overflow-y-auto px-4 pb-4">
        {/* Served as: dish-type pills sharpen the profile (pizza ≠ caprese) */}
        <div className="mb-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
            served as
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleTypes.map(d => {
              const active = activeType?.id === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => onServedAsChange(active ? undefined : d.id)}
                  aria-pressed={active}
                  className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border transition-colors ${
                    active
                      ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
            {!showMoreTypes && !moreTierActive && (
              <button
                onClick={() => setShowMoreTypes(true)}
                className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[12px] font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                more
                <ChevronDown size={13} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {hero ? (
          <>
            {/* Hero suggestion: ranked-list browsing, receipts always visible */}
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 mb-1.5">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shrink-0">
                  <HeroIcon size={17} strokeWidth={2.25} className="text-gray-600 dark:text-gray-300" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {hero.drink.name}
                  </div>
                  <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                    {hero.drink.style} · {DRINK_CATEGORY_LABELS[hero.drink.category]}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => setPick(p => (p - 1 + suggestions.length) % suggestions.length)}
                    aria-label="Previous suggestion"
                    className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                  </button>
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 tabular-nums whitespace-nowrap">
                    {Math.min(pick, suggestions.length - 1) + 1} of {suggestions.length}
                  </span>
                  <button
                    onClick={() => setPick(p => (p + 1) % suggestions.length)}
                    aria-label="Next suggestion"
                    className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              {(hero.evidence.length > 0 || hero.rules.length > 0 || hero.warnings.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {hero.evidence.length > 0 && (
                    <span className={`${receiptChip} bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300`}>
                      <BookOpen size={11} strokeWidth={2.5} />
                      in the book: {hero.evidence.join(', ')}
                    </span>
                  )}
                  {hero.rules.map(r => (
                    <span key={r} className={`${receiptChip} bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300`}>
                      <Scale size={11} strokeWidth={2.5} />
                      {r}
                    </span>
                  ))}
                  {hero.warnings.map(w => (
                    <span key={w} className={`${receiptChip} bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300`}>
                      <AlertTriangle size={11} strokeWidth={2.5} />
                      {w}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* The rest of the ranked list */}
            <div role="listbox" aria-label="Drink suggestions">
              {suggestions.map((s, i) => {
                if (i === Math.min(pick, suggestions.length - 1)) return null;
                const Icon = CATEGORY_ICONS[s.drink.category];
                const summary = s.evidence.length > 0
                  ? `in the book: ${s.evidence.slice(0, 2).join(', ')}`
                  : s.rules[0] ?? '';
                return (
                  <button
                    key={s.drink.name}
                    role="option"
                    aria-selected={false}
                    onClick={() => setPick(i)}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-xl w-full text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Icon size={15} strokeWidth={2.25} className="shrink-0 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 shrink-0">
                      {s.drink.name}
                    </span>
                    <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate">
                      {s.drink.style}
                    </span>
                    <span className="ml-auto text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate max-w-[45%] text-right">
                      {summary}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="px-1 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            No drink suggestions for this dish yet.
          </div>
        )}

        {nonAlcoholicOnly && (
          <div className="mt-2 text-[11px] font-medium text-gray-400 dark:text-gray-500">
            Alcohol-free filter is on — showing zero-proof options only.
          </div>
        )}
      </div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>
      <React.Fragment key="drink-pairing-panel">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[79] bg-black/25"
          onClick={onClose}
        />
        {/* Positioning wrapper: centers on desktop, docks to the bottom on
            mobile. pointer-events-none lets empty-area taps fall through to the
            backdrop (close); the panel re-enables its own pointer events. */}
        <div
          className={`fixed inset-0 z-[80] flex justify-center ${
            isMobile ? 'items-end' : 'items-center p-4'
          }`}
          style={{ pointerEvents: 'none' }}
        >
          {panel}
        </div>
      </React.Fragment>
    </AnimatePresence>,
    document.body
  );
};

export default DrinkPairingPanel;
