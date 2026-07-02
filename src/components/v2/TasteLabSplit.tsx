import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight, Lock, LockOpen, Search, SlidersHorizontal, X, Zap } from 'lucide-react';
import { categoryLabel } from '../../utils/categoryLabels.ts';
import { Pill, IngredientTile } from './ui/index.ts';
import {
  TASTE_COLORS,
  CATEGORY_COLORS,
  WILD_COLOR,
  getIngredientColorWithContrast,
  iconSize,
  mixHex,
  tasteInk,
  panelTone,
} from '../../utils/colors.ts';
import {
  TASTE_KEYS,
  CATEGORY_KEYS,
  SUBCATEGORIES,
  TasteKey,
  CategoryKey,
  SlotMode,
  SlotTaste,
} from '../../hooks/useTasteLab.ts';

// One row in the search pool: an ingredient with its border color, category,
// and the tastes it clears the threshold on (for tag re-filtering).
export interface SearchPoolItem {
  name: string;
  color: string;
  category: string;
  tastes: string[];
}

interface TasteLabSplitProps {
  slotTastes: SlotTaste[];
  onSlotTasteChange: (slotIndex: number, patch: Partial<SlotTaste>) => void;
  // Per slot: the ingredients that fit the slot AND pair with the other slot's
  // current pick. Length is the meaningful match count; the list is searchable.
  slotCandidates?: string[][];
  // Per slot: ingredients that pair with the OTHER selections, NOT filtered by
  // this slot's taste/category — the pool the search shows when its tag is off.
  slotPartnerCandidates?: string[][];
  // Per slot: how many partner-compatible matches each taste/category would
  // yield, previewed next to each option in the picker.
  slotOptionCounts?: { taste: Record<string, number>; category: Record<string, number> }[];
  onSlotIngredientPick: (slotIndex: number, ingredient: string, fromSearch?: boolean) => void;
  // Every selectable ingredient with a dominant-taste border color, its category,
  // and the tastes it clears the threshold on — lets the search re-filter by tag.
  searchPool: SearchPoolItem[];
  ingredients: string[];
  lockedIndices: Set<number>;
  onLockToggle: (index: number) => void;
  // Per slot: whether the taste/category constraint is pinned for Generate.
  constraintLockedIndices: Set<number>;
  onConstraintLockToggle: (index: number) => void;
  isMobile?: boolean;
  isDarkMode?: boolean;
  isHighContrast?: boolean;
}

const MENU_CAP = 300; // tallest a dropdown gets on a roomy screen (px)

// Hero-name transition. Two kinds of change, two shapes of motion:
//  • Generate / reroll (dir = 0): the old name lifts away and the new one rises
//    into place — a vertical "deal" that reads as replacement. Slots stagger by
//    index so a full Generate cascades across the board; locked slots don't
//    change ingredients, so they visibly hold still.
//  • Cycling (dir = ±1): a horizontal reel step toward the direction of travel.
// The live name only ever animates IN (it renders keyed on the ingredient, so
// it can never lag behind the data — see the "ghost" note in SplitHalf). The
// outgoing name is a separate self-managed ghost overlay using `ghostExit`.
// The two are SEQUENCED, not simultaneous: the enter delay below equals the
// ghost's delay + duration, recreating mode="wait"'s two-beat rhythm (old
// name lifts away, a breath of empty panel, new name rises) without its
// wedge-under-spam failure mode.
const ghostExit = (dir: number, index: number) =>
  dir !== 0
    ? { x: -dir * 48, opacity: 0, transition: { duration: 0.13, ease: 'easeIn' } }
    : {
        y: -30,
        opacity: 0,
        transition: { duration: 0.15, ease: 'easeIn', delay: index * 0.055 },
      };

const heroVariants = {
  enter: (c: { dir: number; index: number }) =>
    c.dir !== 0
      ? { x: c.dir * 48, y: 0, opacity: 0, scale: 1 }
      : { x: 0, y: 34, opacity: 0, scale: 0.98 },
  center: (c: { dir: number; index: number }) => ({
    x: 0,
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 520,
      damping: 38,
      // Start once the ghost is gone (its delay + duration, minus a hair of
      // overlap so the handoff has momentum rather than a dead stop).
      delay: c.dir !== 0 ? 0.11 : c.index * 0.055 + 0.13,
    },
  }),
};

// Decide whether a menu anchored to `triggerRef` opens up or down, and how tall
// it may be, so it always fits the viewport — important on short windows, where
// a fixed-height menu would spill off-screen. Re-measures on open and on resize;
// the menu then scrolls internally within the height returned here.
const useMenuPlacement = (
  open: boolean,
  triggerRef: React.RefObject<HTMLElement>,
  isMobile?: boolean
) => {
  const [placement, setPlacement] = useState({ up: false, maxHeight: MENU_CAP });

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const margin = 12;
      const reserveTop = 72; // fixed header
      const reserveBottom = isMobile ? 88 : 24; // mobile bottom nav
      const below = window.innerHeight - rect.bottom - margin - reserveBottom;
      const above = rect.top - margin - reserveTop;
      // Drop up only when below is cramped and above genuinely has more room.
      const up = below < MENU_CAP && above > below;
      const space = up ? above : below;
      setPlacement({ up, maxHeight: Math.max(120, Math.min(MENU_CAP, space)) });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, isMobile, triggerRef]);

  return placement;
};

// One taste-colored half of the split: the ingredient (click to lock) centered,
// with a Taste/Category mode toggle and a matching picker underneath.
const SplitHalf = ({
  slot,
  index,
  ingredient,
  candidates,
  partnerCandidates,
  searchPool,
  optionCounts,
  isLocked,
  isConstraintLocked,
  onChange,
  onPickIngredient,
  onLockToggle,
  onConstraintLockToggle,
  slotCount,
  isMobile,
  isDarkMode,
  isHighContrast,
}: {
  slot: SlotTaste;
  // This slot's position — staggers the Generate cascade across the board.
  index: number;
  ingredient?: string;
  candidates: string[];
  partnerCandidates: string[];
  searchPool: SearchPoolItem[];
  optionCounts?: { taste: Record<string, number>; category: Record<string, number> };
  isLocked: boolean;
  isConstraintLocked: boolean;
  onChange: (patch: Partial<SlotTaste>) => void;
  onPickIngredient: (ingredient: string, fromSearch?: boolean) => void;
  onLockToggle: () => void;
  onConstraintLockToggle: () => void;
  // How many slots are showing (2–4) — drives the ingredient font size so it
  // still reads as the hero when the cells get smaller.
  slotCount: number;
  isMobile?: boolean;
  isDarkMode?: boolean;
  isHighContrast?: boolean;
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hovered, setHovered] = useState<string | null>(null);
  const halfRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pickerBtnRef = useRef<HTMLButtonElement>(null);
  const pickerWrapRef = useRef<HTMLDivElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);

  // The picker dropdown opens up or down and is height-capped to fit the viewport.
  const pickerPlacement = useMenuPlacement(pickerOpen, pickerBtnRef, isMobile);

  // Click-outside closes whichever menu is open. The picker is a small popover,
  // so any click outside it (even elsewhere in this same half) dismisses it; the
  // search panel fills the half, so it only closes when the click leaves the half.
  useEffect(() => {
    if (!pickerOpen && !searchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (pickerOpen && pickerWrapRef.current && !pickerWrapRef.current.contains(target)) {
        setPickerOpen(false);
      }
      if (searchOpen && halfRef.current && !halfRef.current.contains(target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pickerOpen, searchOpen]);

  // The search's active tag filter — a taste or category, or null for "All".
  // The taste/category pill row is collapsed by default (it's rarely needed and
  // eats vertical space); `tagsOpen` reveals it. `showNonPairing` is the
  // Classic-style "show everything" toggle: it surfaces ingredients that DON'T
  // pair with the other selections (marked with a dashed border) so you can
  // still build a fresh pairing off one.
  const [searchFilter, setSearchFilter] = useState<{ mode: SlotMode; value: string } | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [showNonPairing, setShowNonPairing] = useState(false);
  useEffect(() => {
    if (searchOpen) {
      // Open with no tag filter so the full set of pairings is visible; the pill
      // row and non-pairing toggle stay collapsed/off until the user asks.
      setSearchFilter(null);
      setTagsOpen(false);
      setShowNonPairing(false);
    } else {
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen]);

  const matchCount = candidates.length;
  // The search browses everything that pairs with the other ingredients (the
  // "pairing" list); an active tag narrows by taste/category and the query
  // narrows by name. Non-pairing ingredients are normally hidden, but appear
  // (dashed) whenever there's a name query — so searching "chicken" always
  // reveals chicken — or when `showNonPairing` is on.
  const partnerSet = useMemo(() => new Set(partnerCandidates), [partnerCandidates]);
  const { pairing, nonPairing } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchesTag = (item: SearchPoolItem) => {
      if (!searchFilter) return true;
      if (searchFilter.mode === 'category') return item.category === searchFilter.value;
      return item.tastes.includes(searchFilter.value);
    };
    const pairing: SearchPoolItem[] = [];
    const nonPairing: SearchPoolItem[] = [];
    for (const item of searchPool) {
      if (q && !item.name.toLowerCase().includes(q)) continue;
      if (!matchesTag(item)) continue;
      if (partnerSet.has(item.name)) pairing.push(item);
      else nonPairing.push(item);
    }
    // Non-pairing results only surface on an explicit name search or when the
    // "show all" toggle is on; otherwise the search stays to true pairings.
    const revealNonPairing = q.length > 0 || showNonPairing;
    return { pairing, nonPairing: revealNonPairing ? nonPairing : [] };
  }, [searchPool, partnerSet, query, searchFilter, showNonPairing]);
  const totalResults = pairing.length + nonPairing.length;

  // Tag options shown in the search: the 7 tastes then the 8 categories.
  const tagOptions = useMemo(
    () => [
      ...TASTE_KEYS.map(t => ({ mode: 'taste' as SlotMode, value: t as string, color: TASTE_COLORS[t as TasteKey] })),
      ...CATEGORY_KEYS.map(c => ({ mode: 'category' as SlotMode, value: c as string, color: CATEGORY_COLORS[c as CategoryKey] })),
    ],
    []
  );
  const toggleTag = (opt: { mode: SlotMode; value: string }) => {
    setSearchFilter(prev =>
      prev && prev.mode === opt.mode && prev.value === opt.value ? null : { mode: opt.mode, value: opt.value }
    );
  };

  // Cycle through this slot's candidates — the same list the search browses, so
  // each step lands on a known-good pick that fits the slot AND pairs with the
  // partner, updating the pairing live. Driven by swipe (mobile), the edge
  // chevrons, and the scroll wheel (desktop).
  const [dragX, setDragX] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swipeAxis = useRef<null | 'h' | 'v'>(null);
  // Mirror the live offset in a ref so the release decision doesn't depend on a
  // re-render landing between the last touchmove and touchend.
  const dragXRef = useRef(0);
  // Direction of the change now in flight: ±1 for a cycle step (horizontal
  // reel), 0 for everything else (Generate / search pick — vertical deal).
  // Read by the hero's enter variants and the exit ghost, reset once the
  // change lands.
  const changeDir = useRef<0 | 1 | -1>(0);
  const prefersReducedMotion = useReducedMotion();

  // Exit "ghost": the outgoing name, animated out as a decorative overlay. We
  // manage it ourselves instead of AnimatePresence because mode="wait" gates
  // the incoming name on the outgoing one finishing — hold Space (generates
  // arriving faster than the staggered exits complete) and the tracker wedges,
  // leaving a slot's name frozen while its panel keeps changing. Here the live
  // name renders keyed on the ingredient (it can't lag the data), and a new
  // change simply replaces the ghost mid-flight.
  const [ghost, setGhost] = useState<{ name: string; dir: 0 | 1 | -1; key: number } | null>(null);
  const prevNameRef = useRef(ingredient);
  const ghostKeyRef = useRef(0);
  useEffect(() => {
    const prev = prevNameRef.current;
    // Snapshot the direction before resetting it. The live name's enter
    // variant already consumed it during this render (effects run after).
    const dir = changeDir.current;
    prevNameRef.current = ingredient;
    changeDir.current = 0;
    if (!prev || prev === ingredient || prefersReducedMotion) return;
    const key = ++ghostKeyRef.current;
    setGhost({ name: prev, dir, key });
    // Failsafe removal past the longest exit (max stagger 165ms + 180ms run).
    // Normal removal is the ghost's own onAnimationComplete; a fresh change
    // replaces the ghost outright, so a held-down Space can never wedge it.
    const t = setTimeout(() => setGhost(g => (g && g.key === key ? null : g)), 600);
    return () => clearTimeout(t);
  }, [ingredient, prefersReducedMotion]);
  const wheelAccum = useRef(0);
  const wheelAt = useRef(0);
  const canSwipe = !!isMobile && candidates.length > 1;
  const canCycle = candidates.length > 1; // chevrons + wheel (any platform)
  const SWIPE_COMMIT = 56; // px past which a release advances a candidate

  const cycleCandidate = (dir: 1 | -1, animate = true) => {
    if (candidates.length === 0) return;
    const cur = ingredient ? candidates.indexOf(ingredient) : -1;
    const nextIndex =
      cur === -1
        ? dir === 1
          ? 0
          : candidates.length - 1
        : (cur + dir + candidates.length) % candidates.length;
    const next = candidates[nextIndex];
    if (!next || next === ingredient) return;
    // Swipes carry their own motion (the drag), so they skip the reel step.
    changeDir.current = animate ? dir : 0;
    onPickIngredient(next);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't hijack touches meant for an open menu's scroll/taps.
    if (!canSwipe || pickerOpen || searchOpen) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    swipeAxis.current = null;
    setSnapping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (swipeAxis.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      swipeAxis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (swipeAxis.current === 'h') {
      // Soft rubber-band so the drag has resistance rather than tracking 1:1.
      const offset = Math.sign(dx) * Math.min(Math.abs(dx), 120) * 0.8;
      dragXRef.current = offset;
      setDragX(offset);
    }
  };

  const handleTouchEnd = () => {
    const offset = dragXRef.current;
    if (swipeAxis.current === 'h' && Math.abs(offset) > SWIPE_COMMIT) {
      // The drag itself carries the motion, so skip the slide-in animation.
      cycleCandidate(offset < 0 ? 1 : -1, false);
    }
    touchStart.current = null;
    swipeAxis.current = null;
    dragXRef.current = 0;
    setSnapping(true);
    setDragX(0);
  };

  // Scroll wheel (desktop): spin through candidates. Accumulate small deltas to
  // a step threshold and rate-limit so a flick advances one at a time, tactilely.
  const handleWheel = (e: React.WheelEvent) => {
    if (isMobile || !canCycle || pickerOpen || searchOpen) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    wheelAccum.current += delta;
    const now = Date.now();
    if (Math.abs(wheelAccum.current) >= 40 && now - wheelAt.current > 90) {
      const dir: 1 | -1 = wheelAccum.current > 0 ? 1 : -1;
      wheelAccum.current = 0;
      wheelAt.current = now;
      cycleCandidate(dir);
    }
  };

  const isCategory = slot.mode === 'category';
  const isWild = slot.mode === 'wild';
  const baseColor = isWild
    ? WILD_COLOR
    : isCategory
    ? CATEGORY_COLORS[slot.category]
    : TASTE_COLORS[slot.taste];
  const bg = panelTone(getIngredientColorWithContrast(baseColor, isHighContrast, isDarkMode), isDarkMode);
  // Ink, not black/white: a deep (or pale) mix of the panel's own hue, so the
  // type reads as pigment on pigment rather than a sticker on a color chip.
  const fg = tasteInk(bg);
  // Opaque "toned" surfaces: the slot color nudged toward the ink, so controls
  // read as a tint of the panel without bleed-through.
  const pillBg = mixHex(bg, fg, 0.12);
  const strongBg = mixHex(bg, fg, 0.24);

  // Hero type scale, shared by the live name and its exit ghost so the two
  // render (and wrap) identically.
  const heroFontSize = isMobile
    ? (slotCount >= 4 ? '1.6rem' : slotCount === 3 ? '2.1rem' : '3rem')
    : (slotCount >= 3 ? 'clamp(1.5rem, 3vw, 3.25rem)' : 'clamp(2.25rem, 6vw, 6rem)');

  // Active subcategory narrow (category mode). Empty = the whole category.
  const subs = slot.subcategories ?? [];
  // The picker's current label and the options it offers depend on the mode. A
  // single narrowed subcategory shows by name; several show as "Category · N".
  const currentLabel = isWild
    ? 'wild'
    : isCategory
    ? (subs.length === 1 ? subs[0] : subs.length > 1 ? `${slot.category} · ${subs.length}` : slot.category)
    : slot.taste;
  const options: { value: string; color: string; count: number }[] = isCategory
    ? CATEGORY_KEYS.map(c => ({ value: c, color: CATEGORY_COLORS[c], count: optionCounts?.category[c] ?? 0 }))
    : TASTE_KEYS.map(t => ({ value: t, color: TASTE_COLORS[t as TasteKey], count: optionCounts?.taste[t] ?? 0 }));
  // The live category/taste, for highlighting the active option row. (currentLabel
  // can read "Meat" or "Proteins · 2" when narrowed, so don't compare against it.)
  const selectedValue = isCategory ? slot.category : slot.taste;

  const selectOption = (value: string) => {
    if (isCategory) {
      // Changing the category drops any subcategory narrow (subcats are per-category)
      // and reshuffles the slot. Keep the picker OPEN so this category's "Narrow to"
      // chips reveal inline beneath it — narrowing is one tap away, not a hidden
      // scroll. Tapping away accepts the whole category.
      onChange({ category: value as CategoryKey, subcategories: undefined });
      return;
    }
    onChange({ taste: value as TasteKey });
    setPickerOpen(false);
  };

  // Switching mode inside the open picker swaps the option list in place
  // (Taste ⇄ Category) rather than closing it, so the menu stays put.
  const switchMode = (mode: SlotMode) => {
    if (mode === slot.mode) return;
    onChange({ mode });
  };

  // Secondary per-slot filters, editable in the picker: exclude categories
  // (taste/wild slots) and narrow to a subcategory (category slots). Both only
  // shrink the pool — the flavor-map pairing is never relaxed.
  const excluded = slot.exclude ?? [];
  const subcategories = SUBCATEGORIES[slot.category] ?? [];
  const toggleExclude = (c: CategoryKey) =>
    onChange({ exclude: excluded.includes(c) ? excluded.filter(x => x !== c) : [...excluded, c] });
  // Multi-select subcategory narrowing. Empty (the default) means the whole
  // category, shown with every chip "on". The first tap narrows to just that
  // subcategory (de-selecting the rest); further taps add or remove chips, and
  // removing the last reverts to the whole category. Only shrinks the pool.
  const toggleSubcategory = (sub: string) => {
    if (subs.length === 0) {
      onChange({ subcategories: [sub] });
    } else if (subs.includes(sub)) {
      const next = subs.filter(s => s !== sub);
      onChange({ subcategories: next.length ? next : undefined });
    } else {
      onChange({ subcategories: [...subs, sub] });
    }
  };
  const selectAllSubcategories = () => onChange({ subcategories: undefined });
  // A reminder is shown when a secondary filter is active.
  const reminder = isCategory
    ? (subs.length === 1 ? `${subs[0]} only` : subs.length > 1 ? `${subs.length} subcategories` : null)
    : (excluded.length ? `no ${excluded.join(', ')}` : null);

  const pickIngredient = (value: string) => {
    // A search pick is a deliberate choice, so relabel the slot to the new
    // ingredient's actual taste/category (fromSearch=true) — e.g. picking
    // tabasco from a Sour slot retags it Spicy. (Cycling keeps the slot's note.)
    onPickIngredient(value, true);
    setSearchOpen(false);
  };

  return (
    <div
      ref={halfRef}
      className="relative w-full h-full min-h-0 min-w-0 flex flex-col items-center justify-center px-6 transition-colors duration-300"
      style={{ backgroundColor: bg, touchAction: canSwipe ? 'pan-y' : undefined }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Edge chevrons: step to the prev/next match. On mobile they hint the
          swipe; on desktop they're the primary handle (alongside the wheel). */}
      {canCycle && (
        <>
          <button
            onClick={() => cycleCandidate(-1)}
            aria-label="Previous match"
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full transition-all hover:scale-110 active:scale-95"
            style={{ color: fg, opacity: 0.5 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
          >
            <ChevronLeft size={iconSize('md', isMobile)} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => cycleCandidate(1)}
            aria-label="Next match"
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full transition-all hover:scale-110 active:scale-95"
            style={{ color: fg, opacity: 0.5 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
          >
            <ChevronRight size={iconSize('md', isMobile)} strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* Outgoing name — a decorative ghost lifted out over the panel. Sized
          by the same rules as the live name, and padded to the same effective
          width (panel px-6 + button px-8), so it wraps identically in place. */}
      {ghost && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 flex items-center justify-center px-14 pointer-events-none"
        >
          <motion.span
            key={ghost.key}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={ghostExit(ghost.dir, index)}
            onAnimationComplete={() =>
              setGhost(g => (g && g.key === ghost.key ? null : g))
            }
            className="font-display font-black tracking-tight text-center leading-[1.04]"
            style={{ color: fg, fontSize: heroFontSize, wordBreak: 'break-word' }}
          >
            {ghost.name}
          </motion.span>
        </div>
      )}

      {/* Ingredient — click toggles lock; swipe/scroll/chevron cycles. Sized to
          match Classic mode so the name reads as the hero of the half. Keyed on
          the ingredient and animated enter-only: the displayed name is always
          the live data, no matter how fast Generate fires. */}
      <button
        onClick={onLockToggle}
        className="group flex items-center gap-2 max-w-full px-8"
        style={{
          color: fg,
          transform: `translateX(${dragX}px)`,
          transition: snapping ? 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
          opacity: 1 - Math.min(Math.abs(dragX) / 320, 0.35),
        }}
        title={isLocked ? 'Click to unlock' : 'Click to lock'}
      >
        <motion.span
          key={ingredient || '—'}
          custom={{ dir: changeDir.current, index }}
          variants={prefersReducedMotion ? undefined : heroVariants}
          initial="enter"
          animate="center"
          className="font-display font-black tracking-tight text-center leading-[1.04]"
          style={{ fontSize: heroFontSize, wordBreak: 'break-word' }}
        >
          {ingredient || '—'}
        </motion.span>
        {isLocked && (
          <Lock
            size={isMobile ? 22 : 30}
            strokeWidth={2.5}
            className="shrink-0"
            style={{ color: fg }}
          />
        )}
      </button>

      {/* Controls — pinned to the bottom of the cell, one quiet line, so the
          ingredient owns the center. */}
      <div className="absolute left-0 right-0 bottom-4 flex flex-col items-center gap-1.5 px-6">

        {/* Secondary-filter reminder — visible when this slot excludes a category
            or is narrowed to a subcategory. Tap to edit it in the picker. */}
        {reminder && (
          <button
            onClick={() => { setPickerOpen(true); setSearchOpen(false); }}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize max-w-full"
            style={{ color: fg, backgroundColor: pillBg }}
            title="Edit this slot's filters"
          >
            <SlidersHorizontal size={11} strokeWidth={2.5} style={{ opacity: 0.8 }} className="shrink-0" />
            <span className="truncate">{reminder}</span>
          </button>
        )}

        {/* One dock for the slot's controls, so lock + constraint + pairings
            read as a single instrument instead of three stray icons. */}
        <div
          className="flex items-center justify-center gap-0.5 rounded-full p-1"
          style={{ backgroundColor: pillBg }}
        >

        {/* Constraint lock — when on, Generate keeps this taste/category and only
            rerolls the ingredient within it; when off, Generate randomizes it. */}
        <button
          onClick={onConstraintLockToggle}
          aria-label={
            isConstraintLocked
              ? 'Unlock this taste/category so Generate can change it'
              : 'Lock this taste/category so Generate stays within it'
          }
          title={isConstraintLocked ? 'Constraint locked' : 'Lock constraint'}
          className="p-2 rounded-full transition-all active:scale-90"
          style={{
            color: fg,
            opacity: isConstraintLocked ? 1 : 0.45,
            backgroundColor: isConstraintLocked ? strongBg : 'transparent',
          }}
        >
          {isConstraintLocked
            ? <Lock size={14} strokeWidth={2.5} />
            : <LockOpen size={14} strokeWidth={2.5} />}
        </button>

        {/* Value picker — the Taste ⇄ Category toggle lives inside its dropdown */}
        <div className="relative" ref={pickerWrapRef}>
          <button
            ref={pickerBtnRef}
            onClick={() => {
              setPickerOpen(o => !o);
              setSearchOpen(false);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors"
            style={{ color: fg, backgroundColor: pickerOpen ? strongBg : 'transparent' }}
            aria-haspopup="listbox"
            aria-expanded={pickerOpen}
          >
            {currentLabel}
            <ChevronDown
              size={14}
              strokeWidth={2.5}
              style={{ opacity: 0.7, transform: pickerOpen && pickerPlacement.up ? 'rotate(180deg)' : undefined }}
            />
          </button>

          <AnimatePresence>
          {pickerOpen && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 z-[70] w-[264px] ${
                pickerPlacement.up ? 'bottom-full mb-2' : 'top-full mt-2'
              }`}
            >
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: pickerPlacement.up ? 8 : -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: pickerPlacement.up ? 6 : -6 }}
              transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex flex-col p-1.5 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              style={{
                maxHeight: pickerPlacement.maxHeight,
                transformOrigin: pickerPlacement.up ? 'bottom center' : 'top center',
              }}
            >
              {/* Mode toggle: Taste | Category | Wild */}
              <div
                className="flex p-0.5 mb-1 rounded-full shrink-0 bg-gray-100 dark:bg-gray-800"
                role="tablist"
                aria-label="Constrain by"
              >
                {(['taste', 'category', 'wild'] as SlotMode[]).map(mode => {
                  const active = slot.mode === mode;
                  return (
                    <button
                      key={mode}
                      role="tab"
                      aria-selected={active}
                      onClick={() => switchMode(mode)}
                      className={`flex-1 px-2 py-1 rounded-full text-xs font-bold capitalize transition-all ${
                        active
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>

              {/* Scrollable body: the options for the active mode. In category
                  mode the selected category expands inline to its "Narrow to"
                  chips, so subcategory filtering is right under the row you picked
                  rather than buried at the bottom. Taste/wild mode shows the
                  exclude editor below. All of this only shrinks the pool; the
                  flavor-map pairing is never relaxed. */}
              <div className="overflow-y-auto">
                {isWild ? (
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    No constraint — any ingredient that pairs.
                  </div>
                ) : (
                <div role="listbox" className="flex flex-col gap-0.5">
                  {options.map(({ value, color, count }) => {
                    const dotColor = getIngredientColorWithContrast(color, isHighContrast, isDarkMode);
                    const selected = value === selectedValue;
                    const highlighted = selected || hovered === value;
                    const showSubs = isCategory && selected && subcategories.length > 0;
                    return (
                      <React.Fragment key={value}>
                        <button
                          role="option"
                          aria-selected={selected}
                          onMouseEnter={() => setHovered(value)}
                          onMouseLeave={() => setHovered(null)}
                          onClick={() => selectOption(value)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium w-full text-left transition-colors text-gray-800 dark:text-gray-100"
                          style={{
                            // Selected/hovered rows tint with the option's own
                            // color, so the menu previews the panel it would paint.
                            backgroundColor: highlighted ? `${dotColor}${isDarkMode ? '3d' : '2e'}` : 'transparent',
                            opacity: count === 0 ? 0.45 : 1,
                          }}
                        >
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                          <span className="flex-1 capitalize">{value}</span>
                          <span className="text-xs tabular-nums shrink-0 text-gray-400 dark:text-gray-500">{count}</span>
                        </button>

                        {/* Inline "Narrow to" — the selected category's subcategory
                            chips, indented to read as children of the row above.
                            "All" (default) = the whole category; tap a chip to
                            narrow, tap more to add, tap again to remove. */}
                        {showSubs && (
                          <div className="flex flex-wrap gap-1 pl-7 pr-1.5 pt-0.5 pb-1.5">
                            <button
                              onClick={selectAllSubcategories}
                              className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-colors ${
                                subs.length === 0
                                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                            >
                              All
                            </button>
                            {subcategories.map(sub => {
                              // Empty selection = the whole category, so every chip reads as on.
                              const on = subs.length === 0 || subs.includes(sub);
                              return (
                                <button
                                  key={sub}
                                  onClick={() => toggleSubcategory(sub)}
                                  className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-colors ${
                                    on
                                      ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white'
                                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                  }`}
                                >
                                  {sub}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
                )}

                {/* Exclude (taste / wild mode) — carve categories out of the pool */}
                {!isCategory && (
                  <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                    <div className="px-2 pt-0.5 pb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Exclude
                    </div>
                    <div className="flex flex-wrap gap-1 px-1.5 pb-1">
                      {CATEGORY_KEYS.map(c => {
                        const on = excluded.includes(c as CategoryKey);
                        return (
                          <button
                            key={c}
                            onClick={() => toggleExclude(c as CategoryKey)}
                            className={`px-2 py-0.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                              on
                                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 line-through'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                          >
                            {categoryLabel(c)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
            </div>
          )}
          </AnimatePresence>
        </div>

        {/* Match count → opens a search panel filling this half. The count is
            "ingredients that fit this slot AND pair with the partner", so it's
            also the size of the searchable list. */}
        <button
          ref={searchBtnRef}
          onClick={() => {
            setSearchOpen(true);
            setPickerOpen(false);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium tabular-nums transition-colors"
          style={{ color: fg, opacity: searchOpen ? 1 : 0.8, backgroundColor: searchOpen ? strongBg : 'transparent' }}
          aria-haspopup="dialog"
          aria-expanded={searchOpen}
          aria-label={`${matchCount} matching ingredient${matchCount === 1 ? '' : 's'} — search this slot`}
        >
          <Search size={13} strokeWidth={2.5} style={{ opacity: 0.7 }} />
          {matchCount}
          {/* Name the number on roomy layouts — "46" alone reads as noise. */}
          {!isMobile && slotCount <= 2 && (
            <span style={{ opacity: 0.75 }}>{matchCount === 1 ? 'pairing' : 'pairings'}</span>
          )}
        </button>
        </div>
      </div>

      {/* Search panel — fills this half like the default ingredient tray: a
          field on top, then every selectable ingredient as a taste-colored pill.
          You can add anything; an incompatible pick rerolls the partner. */}
      <AnimatePresence>
      {searchOpen && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute inset-0 z-40 flex flex-col bg-white dark:bg-gray-900"
          role="dialog"
          aria-label="Search ingredients"
        >
          <div className="flex items-center gap-2 p-4 shrink-0 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 flex-1 px-3.5 py-2.5 rounded-full bg-gray-100 dark:bg-gray-800">
              <Search size={18} strokeWidth={2.5} className="shrink-0 text-gray-400 dark:text-gray-500" />
              <input
                ref={searchInputRef}
                autoFocus={!isMobile}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search ingredients…"
                className="w-full bg-transparent text-base font-medium outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <button
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 transition-transform active:scale-90 shrink-0"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Compact controls — the taste/category pill row is collapsed by
              default behind "Filter" (it's rarely needed); "Show all" reveals
              ingredients that don't pair with the other selections. */}
          <div className="flex items-center gap-2 px-4 py-2 shrink-0 border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setTagsOpen(o => !o)}
              aria-pressed={tagsOpen}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                tagsOpen || searchFilter
                  ? 'text-gray-800 dark:text-gray-100 border-gray-800 dark:border-gray-100 bg-gray-100 dark:bg-gray-800'
                  : 'text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <SlidersHorizontal size={15} strokeWidth={2.5} />
              <span>Filter{searchFilter ? `: ${searchFilter.value}` : ''}</span>
            </button>
            <button
              onClick={() => setShowNonPairing(v => !v)}
              aria-pressed={showNonPairing}
              title={showNonPairing ? 'Showing non-pairing ingredients' : 'Show ingredients that don’t pair'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 border-dashed transition-all ${
                showNonPairing
                  ? 'text-gray-800 dark:text-amber-200 border-[#FFC233] bg-amber-50 dark:bg-amber-900/30'
                  : 'text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-[#FFC233] hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Zap size={15} strokeWidth={2.5} />
              <span>Show all</span>
            </button>
          </div>

          {/* Collapsible taste/category pills — only when Filter is open. Tap
              "All" (or the active one) to drop the filter; tap another to narrow.
              Doesn't change the slot itself. */}
          {tagsOpen && (
            <div className="flex items-center gap-1.5 px-4 py-2.5 shrink-0 overflow-x-auto scrollbar-hide border-b border-gray-200 dark:border-gray-800">
              <Pill
                active={!searchFilter}
                onClick={() => setSearchFilter(null)}
                className="shrink-0 capitalize"
              >
                All
              </Pill>
              {tagOptions.map(opt => {
                const active = !!searchFilter && searchFilter.mode === opt.mode && searchFilter.value === opt.value;
                const c = getIngredientColorWithContrast(opt.color, isHighContrast, isDarkMode);
                return (
                  <Pill
                    key={`${opt.mode}-${opt.value}`}
                    active={active}
                    accent={c}
                    onClick={() => toggleTag(opt)}
                    className="shrink-0 capitalize"
                  >
                    {opt.value}
                  </Pill>
                );
              })}
            </div>
          )}

          <div role="listbox" className="flex-1 overflow-y-auto p-4">
            {totalResults === 0 ? (
              <div className="px-1 py-3 text-base font-medium text-gray-500 dark:text-gray-400">
                No matches
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {/* Pairings first, then non-pairing ingredients (dashed) so the
                    recommended picks stay up top. */}
                {[...pairing, ...nonPairing].map(({ name, color }) => {
                  const border = getIngredientColorWithContrast(color, isHighContrast, isDarkMode);
                  const selected = name === ingredient;
                  const isPairing = partnerSet.has(name);
                  return (
                    <IngredientTile
                      key={name}
                      role="option"
                      aria-selected={selected}
                      name={name}
                      accent={border}
                      filled={selected}
                      dashed={!isPairing && !selected}
                      hoverFill
                      isDarkMode={isDarkMode}
                      onClick={() => pickIngredient(name)}
                      title={!isPairing && !selected ? 'Not a suggested pairing — picking it rerolls the rest' : undefined}
                      className="capitalize"
                    />
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export const TasteLabSplit = ({
  slotTastes,
  onSlotTasteChange,
  slotCandidates = [],
  slotPartnerCandidates = [],
  slotOptionCounts = [],
  onSlotIngredientPick,
  searchPool,
  ingredients,
  lockedIndices,
  onLockToggle,
  constraintLockedIndices,
  onConstraintLockToggle,
  isMobile = false,
  isDarkMode = false,
  isHighContrast = false,
}: TasteLabSplitProps) => {
  // 1–4 ingredients. Mobile is always a single stacked column. Desktop: 1 → one
  // full cell, 2 → side-by-side, 3 → two on top and a full-width third below,
  // 4 → an even 2×2.
  const count = Math.min(Math.max(ingredients.length, 1), 4);

  // A hairline gutter between cells so two same-taste slots (identical fill)
  // don't bleed into one another — white in light mode, black in dark. The grid
  // gap reveals the container's background as the line.
  const dividerColor = isDarkMode ? '#000000' : '#ffffff';

  const gridStyle: React.CSSProperties = isMobile
    ? { display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: `repeat(${count}, 1fr)`, gap: '2px' }
    : count <= 2
    ? { display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gridTemplateRows: '1fr', gap: '2px' }
    : { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '2px' };

  return (
    <div
      className="relative w-full flex-1 min-h-0"
      style={{ ...gridStyle, backgroundColor: dividerColor }}
    >
      {Array.from({ length: count }).map((_, i) => {
        // 3 ingredients on desktop: the third spans the full bottom row.
        const spanFull = !isMobile && count === 3 && i === 2;
        return (
          <motion.div
            key={i}
            // Cells glide to their new position/size when a slot is added or
            // removed, instead of the grid snapping.
            layout
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // No overflow-hidden: the taste/category dropdown must be able to
            // extend past this cell (over the neighbouring one) instead of being
            // clipped. The search overlay is inset-0, so it stays within anyway.
            className="relative min-w-0 min-h-0"
            style={spanFull ? { gridColumn: '1 / -1' } : undefined}
          >
            <SplitHalf
              slot={slotTastes[i]}
              index={i}
              ingredient={ingredients[i]}
              candidates={slotCandidates[i] ?? []}
              partnerCandidates={slotPartnerCandidates[i] ?? []}
              searchPool={searchPool}
              optionCounts={slotOptionCounts[i]}
              isLocked={lockedIndices.has(i)}
              isConstraintLocked={constraintLockedIndices.has(i)}
              onChange={(patch) => onSlotTasteChange(i, patch)}
              onPickIngredient={(ing, fromSearch) => onSlotIngredientPick(i, ing, fromSearch)}
              onLockToggle={() => onLockToggle(i)}
              onConstraintLockToggle={() => onConstraintLockToggle(i)}
              slotCount={count}
              isMobile={isMobile}
              isDarkMode={isDarkMode}
              isHighContrast={isHighContrast}
            />
          </motion.div>
        );
      })}
    </div>
  );
};

export default TasteLabSplit;
