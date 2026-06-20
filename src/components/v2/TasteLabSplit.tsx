import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { TASTE_COLORS, getIngredientColorWithContrast } from '../../utils/colors.ts';
import { TASTE_KEYS, TasteKey, SlotTaste } from '../../hooks/useTasteLab.ts';

interface TasteLabSplitProps {
  slotTastes: SlotTaste[];
  onSlotTasteChange: (slotIndex: number, patch: Partial<SlotTaste>) => void;
  slotCounts?: number[];
  pairingCount?: number;
  ingredients: string[];
  lockedIndices: Set<number>;
  onLockToggle: (index: number) => void;
  isMobile?: boolean;
  isDarkMode?: boolean;
  isHighContrast?: boolean;
}

// Three intensity levels in place of the 0-10 dial. Each maps to a minimum
// threshold; the active level is read back from the threshold's 0-3 / 4-6 / 7-10
// band so existing/default thresholds still light up the right segment.
const STRENGTH_LEVELS = [
  { label: 'Mild', threshold: 2 },
  { label: 'Medium', threshold: 5 },
  { label: 'Bold', threshold: 8 },
];
const levelForThreshold = (t: number) => (t < 4 ? 0 : t < 7 ? 1 : 2);

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

// One taste-colored half of the split: the ingredient (click to lock) centered,
// with the taste picker + threshold dial spread underneath.
const SplitHalf = ({
  slotIndex,
  slot,
  ingredient,
  matchCount,
  isLocked,
  onTasteChange,
  onLockToggle,
  isMobile,
  isDarkMode,
  isHighContrast,
}: {
  slotIndex: number;
  slot: SlotTaste;
  ingredient?: string;
  matchCount?: number;
  isLocked: boolean;
  onTasteChange: (patch: Partial<SlotTaste>) => void;
  onLockToggle: () => void;
  isMobile?: boolean;
  isDarkMode?: boolean;
  isHighContrast?: boolean;
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hoveredTaste, setHoveredTaste] = useState<string | null>(null);
  const halfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (halfRef.current && !halfRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pickerOpen]);

  const bg = getIngredientColorWithContrast(TASTE_COLORS[slot.taste], isHighContrast, isDarkMode);
  const fg = contrastText(bg);
  // Opaque "toned" surfaces: the taste color nudged toward the text color, so
  // controls read as a tint of the panel (like the pill) without bleed-through.
  const pillBg = mixHex(bg, fg, fg === '#ffffff' ? 0.2 : 0.1);
  const strongBg = mixHex(bg, fg, fg === '#ffffff' ? 0.32 : 0.2);

  return (
    <div
      ref={halfRef}
      className="relative flex-1 flex flex-col items-center justify-center gap-7 px-6 transition-colors duration-300"
      style={{ backgroundColor: bg }}
    >
      {/* Ingredient — click toggles lock */}
      <button
        onClick={onLockToggle}
        className="group flex items-center gap-2 max-w-full"
        style={{ color: fg }}
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

      {/* Controls underneath */}
      <div className="flex flex-col items-center gap-3 w-full max-w-[280px]">
        {/* Taste picker */}
        <div className="relative w-full">
          <button
            onClick={() => setPickerOpen(o => !o)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold capitalize w-full transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: pillBg, color: fg }}
            aria-haspopup="listbox"
            aria-expanded={pickerOpen}
          >
            {slot.taste}
            <ChevronDown size={16} strokeWidth={2.5} />
          </button>

          {pickerOpen && (
            <div
              role="listbox"
              className="absolute left-0 right-0 top-full mt-2 z-[70] flex flex-col gap-0.5 p-1.5 rounded-2xl shadow-xl"
              style={{ backgroundColor: pillBg }}
            >
              {TASTE_KEYS.map((taste) => {
                const dotColor = getIngredientColorWithContrast(
                  TASTE_COLORS[taste as TasteKey],
                  isHighContrast,
                  isDarkMode
                );
                const selected = taste === slot.taste;
                const highlighted = selected || hoveredTaste === taste;
                return (
                  <button
                    key={taste}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setHoveredTaste(taste)}
                    onMouseLeave={() => setHoveredTaste(null)}
                    onClick={() => {
                      onTasteChange({ taste });
                      setPickerOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium capitalize w-full text-left transition-colors"
                    style={{ color: fg, backgroundColor: highlighted ? strongBg : 'transparent' }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                    {taste}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Strength: three light intensity levels */}
        <div
          className="flex items-center justify-center gap-1"
          role="radiogroup"
          aria-label={`${slot.taste} intensity`}
        >
          {STRENGTH_LEVELS.map((lvl, i) => {
            const active = levelForThreshold(slot.threshold) === i;
            return (
              <button
                key={lvl.label}
                role="radio"
                aria-checked={active}
                onClick={() => onTasteChange({ threshold: lvl.threshold })}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  color: fg,
                  opacity: active ? 1 : 0.5,
                  backgroundColor: active ? pillBg : 'transparent',
                }}
              >
                {lvl.label}
              </button>
            );
          })}
        </div>

        {/* How many ingredients clear this threshold */}
        {matchCount !== undefined && (
          <div
            className="text-xs font-medium tabular-nums"
            style={{ color: fg, opacity: 0.7 }}
          >
            {matchCount} {matchCount === 1 ? 'ingredient' : 'ingredients'} match
          </div>
        )}
      </div>
    </div>
  );
};

export const TasteLabSplit = ({
  slotTastes,
  onSlotTasteChange,
  slotCounts = [],
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
        slotIndex={0}
        slot={slotTastes[0]}
        ingredient={ingredients[0]}
        matchCount={slotCounts[0]}
        isLocked={lockedIndices.has(0)}
        onTasteChange={(patch) => onSlotTasteChange(0, patch)}
        onLockToggle={() => onLockToggle(0)}
        isMobile={isMobile}
        isDarkMode={isDarkMode}
        isHighContrast={isHighContrast}
      />

      <SplitHalf
        slotIndex={1}
        slot={slotTastes[1]}
        ingredient={ingredients[1]}
        matchCount={slotCounts[1]}
        isLocked={lockedIndices.has(1)}
        onTasteChange={(patch) => onSlotTasteChange(1, patch)}
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
