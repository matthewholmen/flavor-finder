import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, ArrowLeftRight } from 'lucide-react';
import { CATEGORY_ICONS } from '../../../utils/categoryIcons.ts';
import { CategoryKey } from '../../../hooks/useSlots.ts';
import { SubstituteSuggestion } from '../../../utils/suggestSubstitutes.ts';
import { IngredientProfile } from '../../../types.ts';

// Structural swap (P5): "swap this one" over a combo. The parent computes
// candidates with suggestSubstitutes — everything listed here already pairs
// with every OTHER ingredient in the combo (the engine as judge); the ordering
// and the little chips (shared textures / structural roles) are the ranking
// receipts, never the admission.
//
// Same portal contract as SlotRolePopover: desktop anchors to the trigger's
// rect (flipping up when cramped), mobile is a bottom sheet.

export interface SwapPopoverProps {
  // The ingredient being swapped out.
  ingredient: string;
  suggestions: SubstituteSuggestion[];
  // Look up a candidate's profile for its category icon.
  getProfile: (name: string) => IngredientProfile | null | undefined;
  onPick: (name: string) => void;
  onClose: () => void;
  anchorRect: { top: number; bottom: number; left: number; right: number } | null;
  isMobile?: boolean;
  isDarkMode?: boolean;
}

const POPOVER_WIDTH = 300;
const MENU_CAP = 400;

export const SwapPopover = ({
  ingredient,
  suggestions,
  getProfile,
  onPick,
  onClose,
  anchorRect,
  isMobile = false,
  isDarkMode = false,
}: SwapPopoverProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const [placement, setPlacement] = useState<{ top?: number; bottom?: number; left: number; maxHeight: number; up: boolean }>(
    { top: 0, left: 0, maxHeight: MENU_CAP, up: false }
  );
  useLayoutEffect(() => {
    if (isMobile || !anchorRect) return;
    const measure = () => {
      const margin = 12;
      const reserveTop = 72;
      const below = window.innerHeight - anchorRect.bottom - margin * 2;
      const above = anchorRect.top - margin * 2 - reserveTop;
      // Prefer opening downward (away from the hero text the trigger sits
      // under) — the body scrolls within maxHeight, so flip up only when the
      // space below is too cramped to be usable, not merely under MENU_CAP.
      const MIN_DROP = 240;
      const up = below < MIN_DROP && above > below;
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
      aria-label={`Swap ${ingredient}`}
    >
      <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-1 shrink-0">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 truncate">
          <ArrowLeftRight size={12} strokeWidth={2.5} />
          {`swap ${ingredient}`}
        </span>
        <button
          onClick={onClose}
          aria-label="Close swap suggestions"
          className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>
      <div className="px-2 pb-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500 shrink-0">
        Every option pairs with the rest of the combo. Tags show what it keeps.
      </div>

      <div className="overflow-y-auto" role="listbox" aria-label="Swap suggestions">
        {suggestions.length === 0 ? (
          <div className="px-3 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            Nothing else in the library pairs with the rest of this combo.
          </div>
        ) : (
          suggestions.map(s => {
            const profile = getProfile(s.name);
            const CategoryIcon = profile?.category ? CATEGORY_ICONS[profile.category as CategoryKey] : null;
            const chips = [...s.sharedFunctions, ...s.sharedTextures];
            return (
              <button
                key={s.name}
                role="option"
                aria-selected={false}
                onClick={() => onPick(s.name)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl w-full text-left transition-colors text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {CategoryIcon && (
                  <CategoryIcon size={15} strokeWidth={2.25} className="shrink-0 text-gray-400 dark:text-gray-500" />
                )}
                <span className="flex-1 min-w-0 text-sm font-medium capitalize truncate">{s.name}</span>
                {chips.length > 0 && (
                  <span className="flex gap-1 shrink-0">
                    {chips.slice(0, 2).map(chip => (
                      <span
                        key={chip}
                        className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      >
                        {chip}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>
      <React.Fragment key="swap-popover">
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

export default SwapPopover;
