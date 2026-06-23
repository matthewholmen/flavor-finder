import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Lock, LockOpen, Search, X } from 'lucide-react';
import {
  TASTE_COLORS,
  CATEGORY_COLORS,
  getIngredientColorWithContrast,
} from '../../utils/colors.ts';
import {
  TASTE_KEYS,
  CATEGORY_KEYS,
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

// Relative luminance of a #rrggbb color, for choosing black vs white text.
const hexLuminance = (hex: string): number => {
  const c = hex.replace('#', '');
  if (c.length < 6) return 1;
  const channel = (h: string) => {
    const x = parseInt(h, 16) / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const r = channel(c.slice(0, 2));
  const g = channel(c.slice(2, 4));
  const b = channel(c.slice(4, 6));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Black on the taste color unless the color is genuinely dark (e.g. spicy red),
// where white reads better.
const contrastText = (hex: string): string => (hexLuminance(hex) > 0.32 ? '#131823' : '#ffffff');

// Blend `hex` toward `target` by `amount` (0-1) — used to make opaque "toned"
// surfaces that read as a tint of the panel rather than a separate card.
const mixHex = (hex: string, target: string, amount: number): string => {
  const c = hex.replace('#', '');
  const t = target.replace('#', '');
  if (c.length < 6 || t.length < 6) return hex;
  const mix = (i: number) =>
    Math.round(parseInt(c.slice(i, i + 2), 16) * (1 - amount) + parseInt(t.slice(i, i + 2), 16) * amount);
  return `rgb(${mix(0)}, ${mix(2)}, ${mix(4)})`;
};

const MENU_CAP = 260; // tallest a dropdown gets on a roomy screen (px)

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
  const searchBtnRef = useRef<HTMLButtonElement>(null);

  // The picker dropdown opens up or down and is height-capped to fit the viewport.
  const pickerPlacement = useMenuPlacement(pickerOpen, pickerBtnRef, isMobile);

  // A click anywhere outside this half closes whichever menu is open.
  useEffect(() => {
    if (!pickerOpen && !searchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (halfRef.current && !halfRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pickerOpen, searchOpen]);

  // The search's active tag filter — a taste or category, or null for "All"
  // (every ingredient that pairs with the others). Defaults to the slot's own
  // taste/category each time the panel opens; doesn't touch the slot itself.
  const [searchFilter, setSearchFilter] = useState<{ mode: SlotMode; value: string } | null>(null);
  useEffect(() => {
    if (searchOpen) {
      setSearchFilter({ mode: slot.mode, value: slot.mode === 'category' ? slot.category : slot.taste });
    } else {
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen]);

  const matchCount = candidates.length;
  // The search browses everything that pairs with the other ingredients; the
  // active tag (if any) narrows it to a taste/category, and the query narrows by
  // name. Turn the tag off to see all compatible pairings.
  const partnerSet = useMemo(() => new Set(partnerCandidates), [partnerCandidates]);
  const filteredPool = useMemo(() => {
    const q = query.trim().toLowerCase();
    return searchPool.filter(item => {
      if (!partnerSet.has(item.name)) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      if (searchFilter) {
        if (searchFilter.mode === 'category') return item.category === searchFilter.value;
        return item.tastes.includes(searchFilter.value);
      }
      return true;
    });
  }, [searchPool, partnerSet, query, searchFilter]);

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
  // A nonce + direction that replays the slide-in animation each cycle (the span
  // remounts on nonce change). Skipped for swipes, where the drag is the motion.
  const [cycle, setCycle] = useState<{ nonce: number; dir: 1 | -1 } | null>(null);
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
    if (animate) setCycle(c => ({ nonce: (c?.nonce ?? 0) + 1, dir }));
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
  const baseColor = isCategory ? CATEGORY_COLORS[slot.category] : TASTE_COLORS[slot.taste];
  const bg = getIngredientColorWithContrast(baseColor, isHighContrast, isDarkMode);
  const fg = contrastText(bg);
  // Opaque "toned" surfaces: the slot color nudged toward the text color, so
  // controls read as a tint of the panel without bleed-through.
  const pillBg = mixHex(bg, fg, fg === '#ffffff' ? 0.2 : 0.1);
  const strongBg = mixHex(bg, fg, fg === '#ffffff' ? 0.32 : 0.2);

  // The picker's current label and the options it offers depend on the mode.
  const currentLabel = isCategory ? slot.category : slot.taste;
  const options: { value: string; color: string; count: number }[] = isCategory
    ? CATEGORY_KEYS.map(c => ({ value: c, color: CATEGORY_COLORS[c], count: optionCounts?.category[c] ?? 0 }))
    : TASTE_KEYS.map(t => ({ value: t, color: TASTE_COLORS[t as TasteKey], count: optionCounts?.taste[t] ?? 0 }));

  const selectOption = (value: string) => {
    onChange(isCategory ? { category: value as CategoryKey } : { taste: value as TasteKey });
    setPickerOpen(false);
  };

  // Switching mode inside the open picker swaps the option list in place
  // (Taste ⇄ Category) rather than closing it, so the menu stays put.
  const switchMode = (mode: SlotMode) => {
    if (mode === slot.mode) return;
    onChange({ mode });
  };

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
            style={{ color: fg, opacity: 0.3 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}
          >
            <ChevronLeft size={isMobile ? 24 : 30} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => cycleCandidate(1)}
            aria-label="Next match"
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full transition-all hover:scale-110 active:scale-95"
            style={{ color: fg, opacity: 0.3 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}
          >
            <ChevronRight size={isMobile ? 24 : 30} strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* Ingredient — click toggles lock; swipe/scroll/chevron cycles. Sized to
          match Classic mode so the name reads as the hero of the half. */}
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
        <span
          key={cycle?.nonce ?? 'static'}
          className="font-black tracking-tight text-center leading-[1.02]"
          style={{
            fontSize: isMobile
              ? (slotCount >= 4 ? '1.6rem' : slotCount === 3 ? '2.1rem' : '3rem')
              : (slotCount >= 3 ? 'clamp(1.5rem, 3vw, 3.25rem)' : 'clamp(2.25rem, 6vw, 6rem)'),
            wordBreak: 'break-word',
            animation: cycle
              ? `${cycle.dir === 1 ? 'cycleInFromRight' : 'cycleInFromLeft'} 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)`
              : undefined,
          }}
        >
          {ingredient || '—'}
        </span>
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
      <div className="absolute left-0 right-0 bottom-4 flex items-center justify-center gap-2 px-6">

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
          className="p-1.5 rounded-full transition-all active:scale-90"
          style={{
            color: fg,
            opacity: isConstraintLocked ? 1 : 0.4,
            backgroundColor: isConstraintLocked ? pillBg : 'transparent',
          }}
        >
          {isConstraintLocked
            ? <Lock size={14} strokeWidth={2.5} />
            : <LockOpen size={14} strokeWidth={2.5} />}
        </button>

        {/* Value picker — the Taste ⇄ Category toggle lives inside its dropdown */}
        <div className="relative">
          <button
            ref={pickerBtnRef}
            onClick={() => {
              setPickerOpen(o => !o);
              setSearchOpen(false);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold capitalize transition-colors"
            style={{ color: fg, opacity: pickerOpen ? 1 : 0.85, backgroundColor: pickerOpen ? pillBg : 'transparent' }}
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

          {pickerOpen && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 z-[70] w-[220px] flex flex-col p-1.5 rounded-2xl shadow-xl ${
                pickerPlacement.up ? 'bottom-full mb-2' : 'top-full mt-2'
              }`}
              style={{ backgroundColor: pillBg, maxHeight: pickerPlacement.maxHeight }}
            >
              {/* Mode toggle: Taste | Category */}
              <div
                className="flex p-0.5 mb-1 rounded-full shrink-0"
                style={{ backgroundColor: strongBg }}
                role="tablist"
                aria-label="Constrain by"
              >
                {(['taste', 'category'] as SlotMode[]).map(mode => {
                  const active = slot.mode === mode;
                  return (
                    <button
                      key={mode}
                      role="tab"
                      aria-selected={active}
                      onClick={() => switchMode(mode)}
                      className="flex-1 px-3 py-1 rounded-full text-xs font-bold capitalize transition-all"
                      style={{ color: fg, opacity: active ? 1 : 0.55, backgroundColor: active ? pillBg : 'transparent' }}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>

              {/* Options — content tracks the active mode */}
              <div role="listbox" className="flex flex-col gap-0.5 overflow-y-auto">
                {options.map(({ value, color, count }) => {
                  const dotColor = getIngredientColorWithContrast(color, isHighContrast, isDarkMode);
                  const selected = value === currentLabel;
                  const highlighted = selected || hovered === value;
                  return (
                    <button
                      key={value}
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setHovered(value)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => selectOption(value)}
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-sm font-medium w-full text-left transition-colors"
                      style={{ color: fg, backgroundColor: highlighted ? strongBg : 'transparent', opacity: count === 0 ? 0.45 : 1 }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                      <span className="flex-1 capitalize">{value}</span>
                      <span className="text-xs tabular-nums shrink-0" style={{ opacity: 0.6 }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium tabular-nums transition-colors"
          style={{ color: fg, opacity: searchOpen ? 1 : 0.7, backgroundColor: searchOpen ? pillBg : 'transparent' }}
          aria-haspopup="dialog"
          aria-expanded={searchOpen}
          aria-label={`${matchCount} matching ingredient${matchCount === 1 ? '' : 's'} — search this slot`}
        >
          <Search size={13} strokeWidth={2.5} style={{ opacity: 0.7 }} />
          {matchCount}
        </button>
      </div>

      {/* Search panel — fills this half like the default ingredient tray: a
          field on top, then every selectable ingredient as a taste-colored pill.
          You can add anything; an incompatible pick rerolls the partner. */}
      {searchOpen && (
        <div
          className="absolute inset-0 z-40 flex flex-col bg-white dark:bg-gray-900"
          role="dialog"
          aria-label="Search ingredients"
        >
          <div className="flex items-center gap-2 p-4 shrink-0 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 flex-1 px-3.5 py-2.5 rounded-full bg-gray-100 dark:bg-gray-800">
              <Search size={18} strokeWidth={2.5} className="shrink-0 text-gray-400 dark:text-gray-500" />
              <input
                ref={searchInputRef}
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

          {/* Filter tags — defaults to the slot's taste/category. Tap the active
              one (or "All") to drop the filter and see every compatible pairing;
              tap another to filter by it. Doesn't change the slot itself. */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 shrink-0 overflow-x-auto scrollbar-hide border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setSearchFilter(null)}
              className="shrink-0 px-3 py-1.5 rounded-full text-sm font-bold capitalize transition-colors border-2"
              style={
                !searchFilter
                  ? { backgroundColor: '#6b7280', borderColor: '#6b7280', color: '#ffffff' }
                  : { borderColor: 'transparent', color: 'inherit' }
              }
            >
              All
            </button>
            {tagOptions.map(opt => {
              const active = !!searchFilter && searchFilter.mode === opt.mode && searchFilter.value === opt.value;
              const c = getIngredientColorWithContrast(opt.color, isHighContrast, isDarkMode);
              return (
                <button
                  key={`${opt.mode}-${opt.value}`}
                  onClick={() => toggleTag(opt)}
                  className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors border-2 text-gray-700 dark:text-gray-200"
                  style={{
                    borderColor: c,
                    backgroundColor: active ? c : 'transparent',
                    color: active ? '#ffffff' : undefined,
                  }}
                >
                  {opt.value}
                </button>
              );
            })}
          </div>

          <div role="listbox" className="flex-1 overflow-y-auto p-4">
            {filteredPool.length === 0 ? (
              <div className="px-1 py-3 text-base font-medium text-gray-500 dark:text-gray-400">
                No matches
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {filteredPool.map(({ name, color }) => {
                  const border = getIngredientColorWithContrast(color, isHighContrast, isDarkMode);
                  const selected = name === ingredient;
                  return (
                    <button
                      key={name}
                      role="option"
                      aria-selected={selected}
                      onClick={() => pickIngredient(name)}
                      className={`inline-flex items-center px-4 py-2 rounded-full text-base transition-all capitalize ${
                        selected ? 'text-white' : 'text-gray-900 dark:text-white'
                      }`}
                      style={{
                        border: `3px solid ${border}`,
                        backgroundColor: selected ? border : 'transparent',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = border;
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={e => {
                        if (selected) return;
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '';
                      }}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
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
  // 2–4 ingredients. Mobile is always a single stacked column. Desktop is a
  // 2×2 grid: 2 → side-by-side, 3 → two on top and a full-width third below,
  // 4 → an even 2×2.
  const count = Math.min(Math.max(ingredients.length, 2), 4);

  const gridStyle: React.CSSProperties = isMobile
    ? { display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: `repeat(${count}, 1fr)` }
    : count <= 2
    ? { display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gridTemplateRows: '1fr' }
    : { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };

  return (
    <div className="relative w-full flex-1 min-h-0" style={gridStyle}>
      {Array.from({ length: count }).map((_, i) => {
        // 3 ingredients on desktop: the third spans the full bottom row.
        const spanFull = !isMobile && count === 3 && i === 2;
        return (
          <div
            key={i}
            // No overflow-hidden: the taste/category dropdown must be able to
            // extend past this cell (over the neighbouring one) instead of being
            // clipped. The search overlay is inset-0, so it stays within anyway.
            className="relative min-w-0 min-h-0"
            style={spanFull ? { gridColumn: '1 / -1' } : undefined}
          >
            <SplitHalf
              slot={slotTastes[i]}
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
          </div>
        );
      })}
    </div>
  );
};

export default TasteLabSplit;
