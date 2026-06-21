import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Lock, Search } from 'lucide-react';
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

interface TasteLabSplitProps {
  slotTastes: SlotTaste[];
  onSlotTasteChange: (slotIndex: number, patch: Partial<SlotTaste>) => void;
  // Per slot: the ingredients that fit the slot AND pair with the other slot's
  // current pick. Length is the meaningful match count; the list is searchable.
  slotCandidates?: string[][];
  // Per slot: how many partner-compatible matches each taste/category would
  // yield, previewed next to each option in the picker.
  slotOptionCounts?: { taste: Record<string, number>; category: Record<string, number> }[];
  onSlotIngredientPick: (slotIndex: number, ingredient: string) => void;
  pairingCount?: number;
  ingredients: string[];
  lockedIndices: Set<number>;
  onLockToggle: (index: number) => void;
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
  optionCounts,
  isLocked,
  onChange,
  onPickIngredient,
  onLockToggle,
  isMobile,
  isDarkMode,
  isHighContrast,
}: {
  slot: SlotTaste;
  ingredient?: string;
  candidates: string[];
  optionCounts?: { taste: Record<string, number>; category: Record<string, number> };
  isLocked: boolean;
  onChange: (patch: Partial<SlotTaste>) => void;
  onPickIngredient: (ingredient: string) => void;
  onLockToggle: () => void;
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

  // Each menu opens up or down and is height-capped to fit the viewport.
  const pickerPlacement = useMenuPlacement(pickerOpen, pickerBtnRef, isMobile);
  const searchPlacement = useMenuPlacement(searchOpen, searchBtnRef, isMobile);

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

  // Focus the search field as soon as the browser opens.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
    else setQuery('');
  }, [searchOpen]);

  const matchCount = candidates.length;
  const filteredCandidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? candidates.filter(ing => ing.toLowerCase().includes(q)) : candidates;
  }, [candidates, query]);

  // Swipe-to-cycle (mobile): dragging a half horizontally walks to the next /
  // previous candidate that fits this slot and still pairs with the partner —
  // the same list the search browses, so each swipe lands on a known-good pick
  // and the partner's pairings update live.
  const [dragX, setDragX] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swipeAxis = useRef<null | 'h' | 'v'>(null);
  // Mirror the live offset in a ref so the release decision doesn't depend on a
  // re-render landing between the last touchmove and touchend.
  const dragXRef = useRef(0);
  const canSwipe = !!isMobile && candidates.length > 1;
  const SWIPE_COMMIT = 56; // px past which a release advances a candidate

  const cycleCandidate = (dir: 1 | -1) => {
    if (candidates.length === 0) return;
    const cur = ingredient ? candidates.indexOf(ingredient) : -1;
    const nextIndex =
      cur === -1
        ? dir === 1
          ? 0
          : candidates.length - 1
        : (cur + dir + candidates.length) % candidates.length;
    const next = candidates[nextIndex];
    if (next && next !== ingredient) onPickIngredient(next);
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
      cycleCandidate(offset < 0 ? 1 : -1);
    }
    touchStart.current = null;
    swipeAxis.current = null;
    dragXRef.current = 0;
    setSnapping(true);
    setDragX(0);
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
    onPickIngredient(value);
    setSearchOpen(false);
  };

  return (
    <div
      ref={halfRef}
      className="relative flex-1 flex flex-col items-center justify-center gap-7 px-6 transition-colors duration-300"
      style={{ backgroundColor: bg, touchAction: canSwipe ? 'pan-y' : undefined }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe affordance (mobile): edge chevrons hint the ingredient can be
          flicked left/right — and tapping one steps to the prev/next match too. */}
      {canSwipe && (
        <>
          <button
            onClick={() => cycleCandidate(-1)}
            aria-label="Previous match"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 active:opacity-70"
            style={{ color: fg, opacity: 0.35 }}
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => cycleCandidate(1)}
            aria-label="Next match"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 active:opacity-70"
            style={{ color: fg, opacity: 0.35 }}
          >
            <ChevronRight size={24} strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* Ingredient — click toggles lock; drags to cycle on mobile */}
      <button
        onClick={onLockToggle}
        className="group flex items-center gap-2 max-w-full"
        style={{
          color: fg,
          transform: `translateX(${dragX}px)`,
          transition: snapping ? 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
          opacity: 1 - Math.min(Math.abs(dragX) / 320, 0.35),
        }}
        title={isLocked ? 'Click to unlock' : 'Click to lock'}
      >
        <span
          className="font-black tracking-tight text-center leading-[1.05]"
          style={{
            fontSize: isMobile ? '2rem' : 'clamp(2.25rem, 4.5vw, 4.5rem)',
            wordBreak: 'break-word',
          }}
        >
          {ingredient || '—'}
        </span>
        {isLocked && (
          <Lock
            size={isMobile ? 18 : 26}
            strokeWidth={2.5}
            className="shrink-0"
            style={{ color: fg }}
          />
        )}
      </button>

      {/* Controls underneath — one quiet line so the ingredient stays the hero */}
      <div className="flex items-center justify-center gap-3">
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

        {/* Match count → opens a search to browse/replace within this slot.
            The count is "ingredients that fit this slot AND pair with the
            partner", so it's also the size of the searchable list. */}
        <div className="relative">
          <button
            ref={searchBtnRef}
            onClick={() => {
              setSearchOpen(o => !o);
              setPickerOpen(false);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium tabular-nums transition-colors"
            style={{ color: fg, opacity: searchOpen ? 1 : 0.7, backgroundColor: searchOpen ? pillBg : 'transparent' }}
            aria-haspopup="listbox"
            aria-expanded={searchOpen}
            aria-label={`${matchCount} matching ingredient${matchCount === 1 ? '' : 's'} — search this slot`}
          >
            <Search size={13} strokeWidth={2.5} style={{ opacity: 0.7 }} />
            {matchCount}
          </button>

          {searchOpen && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 z-[70] w-[240px] flex flex-col p-1.5 rounded-2xl shadow-xl ${
                searchPlacement.up ? 'bottom-full mb-2' : 'top-full mt-2'
              }`}
              style={{ backgroundColor: pillBg }}
            >
              <input
                ref={searchInputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search this slot…"
                className="w-full px-3 py-2 mb-1 rounded-xl text-sm font-medium outline-none placeholder:opacity-50 shrink-0"
                style={{ backgroundColor: strongBg, color: fg }}
              />
              {/* List scrolls within the space the placement hook allotted, less
                  the fixed search field above it. */}
              <div
                role="listbox"
                className="flex flex-col gap-0.5 overflow-y-auto"
                style={{ maxHeight: Math.max(96, searchPlacement.maxHeight - 52) }}
              >
                {filteredCandidates.length === 0 ? (
                  <div className="px-3 py-2 text-sm font-medium" style={{ color: fg, opacity: 0.6 }}>
                    No matches
                  </div>
                ) : (
                  filteredCandidates.map(value => {
                    const selected = value === ingredient;
                    const highlighted = selected || hovered === value;
                    return (
                      <button
                        key={value}
                        role="option"
                        aria-selected={selected}
                        onMouseEnter={() => setHovered(value)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => pickIngredient(value)}
                        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-sm font-medium capitalize w-full text-left transition-colors"
                        style={{ color: fg, backgroundColor: highlighted ? strongBg : 'transparent' }}
                      >
                        <span className="truncate">{value}</span>
                        {selected && (
                          <span className="text-[10px] font-bold uppercase tracking-wide shrink-0 opacity-70">
                            current
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const TasteLabSplit = ({
  slotTastes,
  onSlotTasteChange,
  slotCandidates = [],
  slotOptionCounts = [],
  onSlotIngredientPick,
  pairingCount,
  ingredients,
  lockedIndices,
  onLockToggle,
  isMobile = false,
  isDarkMode = false,
  isHighContrast = false,
}: TasteLabSplitProps) => {
  return (
    <div className={`relative w-full flex-1 min-h-0 flex ${isMobile ? 'flex-col' : 'flex-row'}`}>
      <SplitHalf
        slot={slotTastes[0]}
        ingredient={ingredients[0]}
        candidates={slotCandidates[0] ?? []}
        optionCounts={slotOptionCounts[0]}
        isLocked={lockedIndices.has(0)}
        onChange={(patch) => onSlotTasteChange(0, patch)}
        onPickIngredient={(ing) => onSlotIngredientPick(0, ing)}
        onLockToggle={() => onLockToggle(0)}
        isMobile={isMobile}
        isDarkMode={isDarkMode}
        isHighContrast={isHighContrast}
      />

      <SplitHalf
        slot={slotTastes[1]}
        ingredient={ingredients[1]}
        candidates={slotCandidates[1] ?? []}
        optionCounts={slotOptionCounts[1]}
        isLocked={lockedIndices.has(1)}
        onChange={(patch) => onSlotTasteChange(1, patch)}
        onPickIngredient={(ing) => onSlotIngredientPick(1, ing)}
        onLockToggle={() => onLockToggle(1)}
        isMobile={isMobile}
        isDarkMode={isDarkMode}
        isHighContrast={isHighContrast}
      />

      {/* Ampersand + live pairing count, floating dead-center on the seam */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2">
        <div
          className="flex items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow-lg"
          style={{ width: isMobile ? 48 : 64, height: isMobile ? 48 : 64 }}
        >
          <span
            className="font-serif italic text-gray-900 dark:text-white"
            style={{ fontSize: isMobile ? '1.5rem' : '2rem', lineHeight: 1 }}
          >
            &amp;
          </span>
        </div>
        {pairingCount !== undefined && (
          <div
            className="px-3 py-1 rounded-full bg-white dark:bg-gray-900 shadow-md text-xs font-bold tabular-nums whitespace-nowrap text-gray-900 dark:text-white"
            style={pairingCount === 0 ? { color: '#ef4444' } : undefined}
          >
            {pairingCount === 0
              ? 'no pairings'
              : `${pairingCount.toLocaleString()} pairing${pairingCount === 1 ? '' : 's'}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default TasteLabSplit;
