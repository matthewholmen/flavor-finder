import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Lock, LockOpen, X } from 'lucide-react';
import { categoryLabel } from '../../../utils/categoryLabels.ts';
import {
  TASTE_COLORS,
  CATEGORY_COLORS,
  getIngredientColorWithContrast,
} from '../../../utils/colors.ts';
import {
  TASTE_KEYS,
  CATEGORY_KEYS,
  SUBCATEGORIES,
  TasteKey,
  CategoryKey,
  SlotMode,
  SlotTaste,
} from '../../../hooks/useSlots.ts';

// A slot's role editor, extracted from the old Taste Lab split view's picker.
// Constrains one slot to a dominant taste, a category (optionally narrowed to
// subcategories), or wild (no constraint), plus per-slot category excludes and
// the role lock. Every control here only shrinks the slot's candidate pool —
// the flavor-map pairing requirement is never relaxed.
//
// Rendered through a portal: the ingredient display positions itself with CSS
// transforms, which would re-root position:fixed descendants. Desktop anchors
// to the trigger's rect (flipping up when cramped); mobile is a bottom sheet.

export interface SlotRolePopoverProps {
  slot: SlotTaste;
  // The ingredient currently in the slot, for the header.
  ingredient?: string;
  // How many partner-compatible matches each taste/category would yield.
  optionCounts?: { taste: Record<string, number>; category: Record<string, number> };
  // Whether the role is pinned across Generate.
  isConstraintLocked: boolean;
  onChange: (patch: Partial<SlotTaste>) => void;
  onConstraintLockToggle: () => void;
  onClose: () => void;
  // Trigger's bounding rect (desktop anchor). Ignored on mobile.
  anchorRect: { top: number; bottom: number; left: number; right: number } | null;
  isMobile?: boolean;
  isDarkMode?: boolean;
  isHighContrast?: boolean;
}

const POPOVER_WIDTH = 280;
const MENU_CAP = 420; // tallest the desktop popover gets (px)

export const SlotRolePopover = ({
  slot,
  ingredient,
  optionCounts,
  isConstraintLocked,
  onChange,
  onConstraintLockToggle,
  onClose,
  anchorRect,
  isMobile = false,
  isDarkMode = false,
  isHighContrast = false,
}: SlotRolePopoverProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Desktop placement: below the anchor, flipped above when cramped, clamped
  // to the viewport. Recomputed on resize; the body scrolls within maxHeight.
  const [placement, setPlacement] = useState<{ top?: number; bottom?: number; left: number; maxHeight: number; up: boolean }>(
    { top: 0, left: 0, maxHeight: MENU_CAP, up: false }
  );
  useLayoutEffect(() => {
    if (isMobile || !anchorRect) return;
    const measure = () => {
      const margin = 12;
      const reserveTop = 72; // fixed header
      const below = window.innerHeight - anchorRect.bottom - margin * 2;
      const above = anchorRect.top - margin * 2 - reserveTop;
      const up = below < MENU_CAP && above > below;
      const space = up ? above : below;
      const centerX = (anchorRect.left + anchorRect.right) / 2;
      const left = Math.min(
        Math.max(margin, centerX - POPOVER_WIDTH / 2),
        window.innerWidth - POPOVER_WIDTH - margin
      );
      setPlacement({
        left,
        maxHeight: Math.max(160, Math.min(MENU_CAP, space)),
        up,
        ...(up
          ? { bottom: window.innerHeight - anchorRect.top + 8, top: undefined }
          : { top: anchorRect.bottom + 8, bottom: undefined }),
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isMobile, anchorRect]);

  // Click-outside + Escape close.
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const isCategory = slot.mode === 'category';
  const isWild = slot.mode === 'wild';
  const subs = slot.subcategories ?? [];
  const excluded = slot.exclude ?? [];
  const subcategories = SUBCATEGORIES[slot.category] ?? [];

  const options: { value: string; color: string; count: number }[] = isCategory
    ? CATEGORY_KEYS.map(c => ({ value: c, color: CATEGORY_COLORS[c], count: optionCounts?.category[c] ?? 0 }))
    : TASTE_KEYS.map(t => ({ value: t, color: TASTE_COLORS[t as TasteKey], count: optionCounts?.taste[t] ?? 0 }));
  const selectedValue = isCategory ? slot.category : slot.taste;

  const selectOption = (value: string) => {
    if (isCategory) {
      // Changing the category drops any subcategory narrow (subcats are
      // per-category). Keep the popover OPEN so this category's "Narrow to"
      // chips reveal inline beneath it — narrowing is one tap away.
      onChange({ category: value as CategoryKey, subcategories: undefined });
      return;
    }
    onChange({ taste: value as TasteKey });
    onClose();
  };

  const switchMode = (mode: SlotMode) => {
    if (mode === slot.mode) return;
    onChange({ mode });
  };

  const toggleExclude = (c: CategoryKey) =>
    onChange({ exclude: excluded.includes(c) ? excluded.filter(x => x !== c) : [...excluded, c] });

  // Multi-select subcategory narrowing. Empty (the default) means the whole
  // category, shown with every chip "on". The first tap narrows to just that
  // subcategory; further taps add or remove chips, and removing the last
  // reverts to the whole category.
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

  const panel = (
    <motion.div
      ref={panelRef}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: isMobile ? 24 : placement.up ? 8 : -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: isMobile ? 16 : placement.up ? 6 : -6 }}
      transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
      className={`flex flex-col p-1.5 shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${
        isMobile ? 'rounded-t-2xl' : 'rounded-2xl'
      }`}
      style={
        isMobile
          ? { position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 80, maxHeight: '70vh', paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom))' }
          : {
              position: 'fixed',
              left: placement.left,
              top: placement.top,
              bottom: placement.bottom,
              zIndex: 80,
              width: POPOVER_WIDTH,
              maxHeight: placement.maxHeight,
              transformOrigin: placement.up ? 'bottom center' : 'top center',
            }
      }
      role="dialog"
      aria-label={ingredient ? `Role for ${ingredient}` : 'Slot role'}
    >
      {/* Header: which slot this edits, plus close (mobile especially) */}
      <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-1.5 shrink-0">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 truncate">
          {ingredient ? `${ingredient} · role` : 'Slot role'}
        </span>
        <button
          onClick={onClose}
          aria-label="Close role editor"
          className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>

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

      {/* Scrollable body: the options for the active mode. In category mode
          the selected category expands inline to its "Narrow to" chips.
          Taste/wild mode shows the exclude editor below. */}
      <div className="overflow-y-auto">
        {isWild ? (
          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            No constraint — Generate fills this slot with any ingredient that pairs.
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
                      // Selected/hovered rows tint with the option's own color,
                      // previewing the indicator it would paint.
                      backgroundColor: highlighted ? `${dotColor}${isDarkMode ? '3d' : '2e'}` : 'transparent',
                      opacity: count === 0 ? 0.45 : 1,
                    }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                    <span className="flex-1 capitalize">{isCategory ? categoryLabel(value) : value}</span>
                    <span className="text-xs tabular-nums shrink-0 text-gray-400 dark:text-gray-500">{count}</span>
                  </button>

                  {/* Inline "Narrow to" — the selected category's subcategory
                      chips, indented to read as children of the row above. */}
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

      {/* Role lock — pins the taste/category across Generate. Wild has no
          constraint to pin, so the row only renders for a live role. */}
      {!isWild && (
        <button
          onClick={onConstraintLockToggle}
          aria-pressed={isConstraintLocked}
          className="flex items-center gap-2 mt-1 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 border-t border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title={
            isConstraintLocked
              ? 'Generate keeps this role and rerolls the ingredient within it'
              : 'Generate may swap this role for another'
          }
        >
          {isConstraintLocked ? <Lock size={13} strokeWidth={2.5} /> : <LockOpen size={13} strokeWidth={2.5} />}
          <span className="flex-1 text-left">Keep this role on Generate</span>
          <span className={`text-[10px] font-bold uppercase tracking-wide ${isConstraintLocked ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
            {isConstraintLocked ? 'On' : 'Off'}
          </span>
        </button>
      )}
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>
      <React.Fragment key="slot-role-popover">
        {/* Mobile scrim behind the bottom sheet */}
        {isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[79] bg-black/25"
            onClick={onClose}
          />
        )}
        {panel}
      </React.Fragment>
    </AnimatePresence>,
    document.body
  );
};

export default SlotRolePopover;
